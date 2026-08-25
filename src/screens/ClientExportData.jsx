import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateReportHTML, openReportPrint, getStatusBadge } from '../lib/pdfTemplate';
import { downloadExcel } from '../lib/exportUtils';
import { Download, FileText, Calendar, Filter, CheckCircle2, Clock, Table } from 'lucide-react';

export default function ClientExportData() {
  const { currentUser } = useAuth();
  const { loans, getKycProfile } = useData();
  const profile = getKycProfile(currentUser?.email);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const myLoans = useMemo(() =>
    loans.filter(l => l.clientEmail === currentUser?.email),
  [loans, currentUser]);

  const filteredLoans = useMemo(() => {
    return myLoans.filter(l => {
      const loanDate = new Date(l.created_at);
      if (dateFrom && loanDate < new Date(dateFrom)) return false;
      if (dateTo && loanDate > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [myLoans, dateFrom, dateTo]);

  const stats = useMemo(() => {
    let totalBorrowed = 0, totalPaid = 0, totalWithInterest = 0;
    filteredLoans.forEach(loan => {
      totalBorrowed += loan.amount;
      const insts = loan.installments || [];
      totalPaid += insts.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paid_amount || i.amount), 0);
      totalWithInterest += insts.reduce((s, i) => s + i.amount, 0);
    });
    return { totalBorrowed, totalPaid, totalWithInterest, remaining: totalWithInterest - totalPaid };
  }, [filteredLoans]);

  const exportLoansExcel = async () => {
    const headers = [
      { header: 'ID', key: 'id', width: 14 },
      { header: 'Monto Original', key: 'amount', width: 18, format: 'currency' },
      { header: 'Total con Intereses', key: 'total', width: 20, format: 'currency' },
      { header: 'Total Pagado', key: 'paid', width: 16, format: 'currency' },
      { header: 'Saldo Restante', key: 'balance', width: 18, format: 'currency' },
      { header: 'Cuotas', key: 'installments', width: 10, format: 'number' },
      { header: 'Moneda', key: 'currency', width: 10 },
      { header: 'Tasa Interés', key: 'rate', width: 14 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Fecha Solicitud', key: 'date', width: 16, format: 'date' },
    ];
    const data = filteredLoans.map(loan => {
      const total = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
      const paid = loan.installments?.filter(i => i.status === 'paid') || [];
      const tp = paid.reduce((a, i) => a + (i.paid_amount || i.amount), 0);
      return {
        id: `#${loan.id.slice(-6)}`,
        amount: loan.amount,
        total,
        paid: tp,
        balance: total - tp,
        installments: loan.installments?.length || 0,
        currency: loan.currency || 'USD',
        rate: `${loan.interest_rate || 0}%`,
        status: loan.status === 'approved' ? 'Aprobado' : loan.status === 'rejected' ? 'Rechazado' : 'Pendiente',
        date: new Date(loan.created_at).toLocaleDateString('es-ES'),
      };
    });
    await downloadExcel(`mis_prestamos_${Date.now()}.xlsx`, [
      {
        name: 'Préstamos',
        title: 'MIS PRÉSTAMOS',
        subtitle: `Generado: ${new Date().toLocaleDateString('es-ES')}`,
        headers,
        data,
        totals: {
          id: 'TOTALES',
          amount: stats.totalBorrowed,
          total: stats.totalWithInterest,
          paid: stats.totalPaid,
          balance: stats.remaining,
        },
      },
      {
        name: 'Resumen',
        title: 'RESUMEN',
        subtitle: `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
        headers: [
          { header: 'Concepto', key: 'concept', width: 30 },
          { header: 'Valor', key: 'value', width: 20, format: 'currency' },
        ],
        data: [
          { concept: 'Total Préstamos', value: filteredLoans.length },
          { concept: 'Total Prestado', value: stats.totalBorrowed },
          { concept: 'Total Pagado', value: stats.totalPaid },
          { concept: 'Con Intereses', value: stats.totalWithInterest },
          { concept: 'Saldo Restante', value: stats.remaining },
        ],
      },
    ], { theme: 'blue' });
  };

  const exportPaymentsExcel = async () => {
    const allInstallments = [];
    filteredLoans.forEach(loan => {
      (loan.installments || []).forEach(inst => {
        allInstallments.push({ ...inst, loanId: loan.id, loanCurrency: loan.currency });
      });
    });
    const headers = [
      { header: 'Préstamo', key: 'loanId', width: 14 },
      { header: 'Cuota', key: 'number', width: 10 },
      { header: 'Vencimiento', key: 'dueDate', width: 16, format: 'date' },
      { header: 'Monto Cuota', key: 'amount', width: 16, format: 'currency' },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Fecha Pago', key: 'paidDate', width: 16, format: 'date' },
      { header: 'Monto Pagado', key: 'paidAmount', width: 16, format: 'currency' },
      { header: 'Moneda', key: 'currency', width: 10 },
    ];
    const data = allInstallments.map(inst => ({
      loanId: `#${inst.loanId.slice(-6)}`,
      number: `#${inst.number}`,
      dueDate: inst.due_date,
      amount: inst.amount,
      status: inst.status === 'paid' ? 'Pagado' : inst.status === 'submitted' ? 'En revisión' : inst.status === 'rejected' ? 'Rechazado' : 'Pendiente',
      paidDate: inst.paid_date || '—',
      paidAmount: inst.paid_amount || 0,
      currency: inst.loanCurrency || 'USD',
    }));
    const totalPaid = data.filter(d => d.status === 'Pagado').reduce((s, d) => s + d.paidAmount, 0);
    await downloadExcel(`mis_pagos_${Date.now()}.xlsx`, [{
      name: 'Pagos',
      title: 'MIS PAGOS',
      subtitle: `Generado: ${new Date().toLocaleDateString('es-ES')}`,
      headers,
      data,
      totals: { loanId: 'TOTALES', amount: data.reduce((s, d) => s + d.amount, 0), paidAmount: totalPaid },
    }], { theme: 'green' });
  };

  const exportJSON = () => {
    const data = {
      client: {
        name: profile?.fullName || currentUser?.email,
        email: currentUser?.email,
        exportedAt: new Date().toISOString(),
      },
      loans: filteredLoans.map(l => ({
        id: l.id,
        amount: l.amount,
        status: l.status,
        interestRate: l.interest_rate,
        installmentsCount: l.installments_count,
        createdAt: l.created_at,
        installments: (l.installments || []).map(i => ({
          number: i.number,
          amount: i.amount,
          dueDate: i.due_date,
          status: i.status,
          paidAmount: i.paid_amount,
          paidDate: i.paid_date,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mis_datos_${Date.now()}.json`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const name = profile?.fullName || currentUser?.email;
    const html = generateReportHTML({
      title: 'Reporte Personal de Préstamos',
      subtitle: `Reporte exportado — ${new Date().toLocaleDateString('es-ES')}`,
      clientInfo: { name, email: currentUser?.email, id: profile?.idNumber || 'N/A' },
      stats: [
        { label: 'Préstamos', value: filteredLoans.length, color: '#0f4c8a' },
        { label: 'Total Prestado', value: `$${stats.totalBorrowed.toFixed(2)}`, color: '#059669' },
        { label: 'Total Pagado', value: `$${stats.totalPaid.toFixed(2)}`, color: '#d97706' },
        { label: 'Saldo Pendiente', value: `$${stats.remaining.toFixed(2)}`, color: '#dc2626' },
      ],
      tableHeaders: ['ID', 'Monto', 'Total c/Intereses', 'Pagado', 'Pendiente', 'Cuotas', 'Estado', 'Fecha'],
      tableRows: filteredLoans.map(loan => {
        const total = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
        const paid = loan.installments?.filter(i => i.status === 'paid') || [];
        const tp = paid.reduce((a, i) => a + (i.paid_amount || i.amount), 0);
        const badge = getStatusBadge(loan.status);
        return [
          `#${loan.id.slice(-6)}`,
          `$${loan.amount.toFixed(2)}`,
          `$${total.toFixed(2)}`,
          `$${tp.toFixed(2)}`,
          `$${(total - tp).toFixed(2)}`,
          `${loan.installments?.length || 0}`,
          { html: `<span class="badge ${badge.class}">${badge.label}</span>` },
          new Date(loan.created_at).toLocaleDateString('es-ES'),
        ];
      }),
      footer: `Cliente: ${name} — Exportado el ${new Date().toLocaleDateString('es-ES')}`,
    });
    openReportPrint(html);
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Exportar Mis Datos</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Descarga reportes en Excel, PDF o JSON</p>
      </div>

      {/* Date Filter */}
      <div className="premium-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Filter size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '14px', fontWeight: 700 }}>Filtrar por Fecha</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Desde</label>
            <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button className="btn btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ padding: '8px 12px', fontSize: '12px', marginTop: '18px' }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Stats Preview */}
      <div className="grid-4col" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Préstamos', value: filteredLoans.length, icon: <FileText size={20} />, color: 'var(--primary)' },
          { label: 'Total Prestado', value: `$${stats.totalBorrowed.toFixed(2)}`, icon: <Download size={20} />, color: '#10B981' },
          { label: 'Total Pagado', value: `$${stats.totalPaid.toFixed(2)}`, icon: <CheckCircle2 size={20} />, color: '#F59E0B' },
          { label: 'Pendiente', value: `$${stats.remaining.toFixed(2)}`, icon: <Clock size={20} />, color: '#EF4444' },
        ].map((s, i) => (
          <div key={i} className="premium-card" style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Export Options */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} style={{ color: 'var(--primary)' }} /> Opciones de Exportación
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Préstamos (Excel)', desc: 'Archivo .xlsx con todos tus préstamos', action: exportLoansExcel, icon: <Table size={24} />, color: '#10B981' },
            { label: 'Pagos (Excel)', desc: 'Detalle de cuotas en .xlsx', action: exportPaymentsExcel, icon: <Table size={24} />, color: '#F59E0B' },
            { label: 'Reporte PDF', desc: 'Documento imprimible', action: exportPDF, icon: <FileText size={24} />, color: '#EF4444' },
            { label: 'Datos (JSON)', desc: 'Todos tus datos completos', action: exportJSON, icon: <FileText size={24} />, color: 'var(--primary)' },
          ].map((item, i) => (
            <button key={i} className="btn btn-secondary" onClick={item.action}
              style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center', borderRadius: '14px', border: '1px dashed var(--border)', cursor: 'pointer' }}>
              <div style={{ color: item.color }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
