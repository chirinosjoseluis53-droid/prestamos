import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateReportHTML, openReportPrint, getStatusBadge } from '../lib/pdfTemplate';
import { downloadExcel } from '../lib/exportUtils';
import { Download, FileText, TrendingUp, CheckCircle2, Clock, Table } from 'lucide-react';

export default function ClientReports() {
  const { currentUser } = useAuth();
  const { loans, getKycProfile } = useData();
  const profile = getKycProfile(currentUser?.email);

  const approvedLoans = useMemo(() =>
    loans.filter(l => l.clientEmail === currentUser?.email && l.status === 'approved'),
  [loans, currentUser]);

  const stats = useMemo(() => {
    let totalBorrowed = 0, totalPaid = 0, totalWithInterest = 0;
    approvedLoans.forEach(loan => {
      totalBorrowed += loan.amount;
      const insts = loan.installments || [];
      totalPaid += insts.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paid_amount || i.amount), 0);
      totalWithInterest += insts.reduce((s, i) => s + i.amount, 0);
    });
    return { totalBorrowed, totalPaid, totalWithInterest, remaining: totalWithInterest - totalPaid };
  }, [approvedLoans]);

  const downloadMyHistoryExcel = async () => {
    const name = profile?.fullName || currentUser?.email;
    const headers = [
      { header: 'Préstamo', key: 'id', width: 14 },
      { header: 'Monto Original', key: 'amount', width: 18, format: 'currency' },
      { header: 'Total con Intereses', key: 'total', width: 20, format: 'currency' },
      { header: 'Total Pagado', key: 'paid', width: 16, format: 'currency' },
      { header: 'Saldo Restante', key: 'balance', width: 18, format: 'currency' },
      { header: 'Cuotas', key: 'installments', width: 10, format: 'number' },
      { header: 'Moneda', key: 'currency', width: 10 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Fecha', key: 'date', width: 14, format: 'date' },
    ];
    const data = approvedLoans.map(loan => {
      const total = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
      const paid = loan.installments?.filter(i => i.status === 'paid') || [];
      const totalPaid = paid.reduce((a, i) => a + (i.paid_amount || i.amount), 0);
      return {
        id: `#${loan.id.slice(-6)}`,
        amount: loan.amount,
        total,
        paid: totalPaid,
        balance: total - totalPaid,
        installments: loan.installments?.length || 0,
        currency: loan.currency || 'USD',
        status: loan.status === 'approved' ? 'Aprobado' : loan.status,
        date: new Date(loan.created_at).toLocaleDateString('es-ES'),
      };
    });
    await downloadExcel(`historial_prestamos_${Date.now()}.xlsx`, [
      {
        name: 'Mis Préstamos',
        title: 'HISTORIAL DE PRÉSTAMOS',
        subtitle: `Cliente: ${name} — Generado: ${new Date().toLocaleDateString('es-ES')}`,
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
        title: 'RESUMEN PERSONAL',
        subtitle: `Cliente: ${name}`,
        headers: [
          { header: 'Concepto', key: 'concept', width: 30 },
          { header: 'Valor', key: 'value', width: 20, format: 'currency' },
        ],
        data: [
          { concept: 'Total Prestado', value: stats.totalBorrowed },
          { concept: 'Total Pagado', value: stats.totalPaid },
          { concept: 'Con Intereses', value: stats.totalWithInterest },
          { concept: 'Saldo Restante', value: stats.remaining },
        ],
        totals: { concept: 'Fecha del Reporte', value: new Date().toLocaleDateString('es-ES') },
      },
    ], { theme: 'blue' });
  };

  const downloadMyPaymentsExcel = async () => {
    const name = profile?.fullName || currentUser?.email;
    const headers = [
      { header: 'Préstamo', key: 'loanId', width: 14 },
      { header: 'Cuota', key: 'number', width: 10 },
      { header: 'Fecha Vencimiento', key: 'dueDate', width: 18, format: 'date' },
      { header: 'Monto', key: 'amount', width: 14, format: 'currency' },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Fecha Pago', key: 'paidDate', width: 16, format: 'date' },
      { header: 'Monto Pagado', key: 'paidAmount', width: 16, format: 'currency' },
      { header: 'Comprobante', key: 'proof', width: 14 },
    ];
    const data = [];
    approvedLoans.forEach(loan => {
      (loan.installments || []).forEach(inst => {
        data.push({
          loanId: `#${loan.id.slice(-6)}`,
          number: `#${inst.number}`,
          dueDate: inst.due_date,
          amount: inst.amount,
          status: inst.status === 'paid' ? 'Pagado' : inst.status === 'submitted' ? 'En revisión' : inst.status === 'rejected' ? 'Rechazado' : 'Pendiente',
          paidDate: inst.paid_date || '—',
          paidAmount: inst.paid_amount || 0,
          proof: inst.payment_proof_url ? 'Sí' : 'No',
        });
      });
    });
    const totalPaid = data.filter(d => d.status === 'Pagado').reduce((s, d) => s + d.paidAmount, 0);
    await downloadExcel(`pagos_${Date.now()}.xlsx`, [{
      name: 'Mis Pagos',
      title: 'HISTORIAL DE PAGOS',
      subtitle: `Cliente: ${name} — Generado: ${new Date().toLocaleDateString('es-ES')}`,
      headers,
      data,
      totals: { loanId: 'TOTALES', amount: data.reduce((s, d) => s + d.amount, 0), paidAmount: totalPaid },
    }], { theme: 'green' });
  };

  const downloadPDF = () => {
    const name = profile?.fullName || currentUser?.email;
    const html = generateReportHTML({
      title: 'Mi Historial de Préstamos',
      subtitle: 'Reporte Personal del Cliente',
      clientInfo: { name, email: currentUser?.email },
      stats: [
        { label: 'Total Prestado', value: `$${stats.totalBorrowed.toFixed(2)}`, color: '#0f4c8a' },
        { label: 'Total Pagado', value: `$${stats.totalPaid.toFixed(2)}`, color: '#059669' },
        { label: 'Con Intereses', value: `$${stats.totalWithInterest.toFixed(2)}`, color: '#d97706' },
        { label: 'Saldo Restante', value: `$${stats.remaining.toFixed(2)}`, color: '#dc2626' },
      ],
      tableHeaders: ['Préstamo', 'Monto Original', 'Total con Intereses', 'Pagado', 'Saldo Restante', 'Cuotas', 'Moneda', 'Estado', 'Fecha'],
      tableRows: approvedLoans.map(loan => {
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
          loan.currency || 'USD',
          { html: `<span class="badge ${badge.class}">${badge.label}</span>`, style: 'text-transform:uppercase' },
          new Date(loan.created_at || loan.createdAt).toLocaleDateString('es-ES'),
        ];
      }),
      footer: `Cliente: ${name} — Reporte generado para uso personal`,
    });
    openReportPrint(html);
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats */}
      <div className="grid-4col">
        {[
          { label: 'Total Prestado', value: `$${stats.totalBorrowed.toFixed(2)}`, color: 'var(--primary)', icon: <TrendingUp size={20} /> },
          { label: 'Total Pagado', value: `$${stats.totalPaid.toFixed(2)}`, color: 'var(--success)', icon: <CheckCircle2 size={20} /> },
          { label: 'Con Intereses', value: `$${stats.totalWithInterest.toFixed(2)}`, color: 'var(--warning)', icon: <Clock size={20} /> },
          { label: 'Saldo Restante', value: `$${stats.remaining.toFixed(2)}`, color: 'var(--danger)', icon: <FileText size={20} /> },
        ].map((s, i) => (
          <div key={i} className="premium-card" style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Downloads */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Download size={18} style={{ color: 'var(--primary)' }} /> Descargar Reportes
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Historial (Excel)', desc: 'Préstamos en formato .xlsx', action: downloadMyHistoryExcel, icon: <Table size={20} />, color: '#10B981' },
            { label: 'Pagos (Excel)', desc: 'Cuotas y comprobantes .xlsx', action: downloadMyPaymentsExcel, icon: <Table size={20} />, color: '#F59E0B' },
            { label: 'Reporte PDF', desc: 'Documento imprimible', action: downloadPDF, icon: <FileText size={20} />, color: '#EF4444' },
          ].map((item, i) => (
            <button key={i} className="btn btn-secondary" onClick={item.action}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center', borderRadius: '14px', border: '1px dashed var(--border)', cursor: 'pointer' }}>
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
