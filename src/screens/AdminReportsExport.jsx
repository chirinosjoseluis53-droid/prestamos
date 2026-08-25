import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateReportHTML, openReportPrint, getStatusBadge } from '../lib/pdfTemplate';
import { downloadExcel } from '../lib/exportUtils';
import { FileText, Download, Calendar, Filter, BarChart3, Users, AlertTriangle, CreditCard, Table } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'portfolio', label: 'Cartera de Préstamos', icon: <CreditCard size={18} />, color: '#2563EB' },
  { id: 'payments', label: 'Historial de Pagos', icon: <BarChart3 size={18} />, color: '#2ECC71' },
  { id: 'clients', label: 'Lista de Clientes', icon: <Users size={18} />, color: '#8B5CF6' },
  { id: 'delinquency', label: 'Mora y Morosidad', icon: <AlertTriangle size={18} />, color: '#E74C3C' },
];

export default function AdminReportsExport({ setTab }) {
  const { currentUser } = useAuth();
  const { clients, loans, getKycProfile } = useData();

  const [reportType, setReportType] = useState('portfolio');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredLoans = useMemo(() => {
    let result = [...loans];
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00');
      result = result.filter(l => new Date(l.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      result = result.filter(l => new Date(l.created_at) <= to);
    }
    if (filterStatus !== 'all') {
      result = result.filter(l => l.status === filterStatus);
    }
    return result;
  }, [loans, dateFrom, dateTo, filterStatus]);

  const previewStats = useMemo(() => {
    const approved = filteredLoans.filter(l => l.status === 'approved');
    const allInst = approved.flatMap(l => l.installments || []);
    const paidInst = allInst.filter(i => i.status === 'paid');
    const totalLent = approved.reduce((s, l) => s + l.amount, 0);
    const totalCollected = paidInst.reduce((s, i) => s + (i.paid_amount || i.amount), 0);
    const pendingInst = allInst.filter(i => i.status === 'pending' && new Date(i.due_date + 'T00:00:00') < new Date());
    const totalExpected = allInst.reduce((s, i) => s + i.amount, 0);
    return {
      totalLoans: filteredLoans.length,
      approvedLoans: approved.length,
      totalLent,
      totalCollected,
      pendingBalance: totalExpected - totalCollected,
      overdueCount: pendingInst.length,
      collectionRate: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : 0,
    };
  }, [filteredLoans]);

  const generatePortfolioPDF = () => {
    const html = generateReportHTML({
      title: 'Reporte de Cartera de Préstamos',
      subtitle: 'Resumen completo de la cartera de créditos',
      stats: [
        { label: 'Total Préstamos', value: previewStats.totalLoans, color: '#0f4c8a' },
        { label: 'Aprobados', value: previewStats.approvedLoans, color: '#059669' },
        { label: 'Total Prestado', value: `$${previewStats.totalLent.toFixed(2)}`, color: '#7c3aed' },
        { label: 'Total Cobrado', value: `$${previewStats.totalCollected.toFixed(2)}`, color: '#059669' },
        { label: 'Por Cobrar', value: `$${previewStats.pendingBalance.toFixed(2)}`, color: '#dc2626' },
        { label: 'Tasa de Cobro', value: `${previewStats.collectionRate}%`, color: '#0f4c8a' },
      ],
      tableHeaders: ['ID', 'Cliente', 'Monto', 'Tasa', 'Cuotas', 'Pagado', 'Pendiente', 'Estado', 'Fecha'],
      tableRows: filteredLoans.map(loan => {
        const profile = getKycProfile(loan.clientEmail);
        const name = profile?.fullName || loan.clientEmail;
        const paid = (loan.installments || []).filter(i => i.status === 'paid');
        const totalPaid = paid.reduce((a, i) => a + (i.paid_amount || i.amount), 0);
        const totalLoan = (loan.installments || []).reduce((a, i) => a + i.amount, 0) || loan.amount;
        const badge = getStatusBadge(loan.status);
        return [
          `#${loan.id.slice(-6)}`,
          name,
          `$${loan.amount.toFixed(2)}`,
          `${loan.interest_rate || 0}%`,
          `${paid.length}/${loan.installments?.length || 0}`,
          `$${totalPaid.toFixed(2)}`,
          `$${(totalLoan - totalPaid).toFixed(2)}`,
          { html: `<span class="badge ${badge.class}">${badge.label}</span>` },
          new Date(loan.created_at).toLocaleDateString('es-ES'),
        ];
      }),
    });
    openReportPrint(html);
  };

  const generatePaymentsPDF = () => {
    const paidInst = filteredLoans.flatMap(l =>
      (l.installments || []).filter(i => i.status === 'paid').map(i => ({ ...i, loan: l }))
    );
    const html = generateReportHTML({
      title: 'Historial de Pagos',
      subtitle: 'Detalle de todos los pagos recibidos',
      stats: [
        { label: 'Pagos Realizados', value: paidInst.length, color: '#059669' },
        { label: 'Monto Total Cobrado', value: `$${paidInst.reduce((s, i) => s + (i.paid_amount || i.amount), 0).toFixed(2)}`, color: '#0f4c8a' },
      ],
      tableHeaders: ['Cliente', 'Cuota #', 'Monto Pagado', 'Fecha de Pago', 'Estado'],
      tableRows: paidInst.map(i => {
        const profile = getKycProfile(i.loan.clientEmail);
        const badge = getStatusBadge(i.status);
        return [
          profile?.fullName || i.loan.clientEmail,
          `#${i.number}`,
          `$${(i.paid_amount || i.amount).toFixed(2)}`,
          i.paid_date || '—',
          { html: `<span class="badge ${badge.class}">${badge.label}</span>` },
        ];
      }),
    });
    openReportPrint(html);
  };

  const generateClientsPDF = () => {
    const html = generateReportHTML({
      title: 'Lista de Clientes',
      subtitle: 'Directorio completo de clientes registrados',
      stats: [
        { label: 'Total Clientes', value: clients.length, color: '#0f4c8a' },
        { label: 'Con Préstamos', value: clients.filter(c => loans.some(l => l.clientEmail === c.email)).length, color: '#059669' },
      ],
      tableHeaders: ['Nombre', 'Email', 'Teléfono', 'Préstamos', 'Estado'],
      tableRows: clients.map(client => {
        const profile = getKycProfile(client.email);
        const clientLoans = loans.filter(l => l.clientEmail === client.email);
        const isActive = client.status !== 'blocked';
        return [
          profile?.fullName || client.nombre || '—',
          client.email,
          profile?.phone || '—',
          `${clientLoans.length}`,
          { html: `<span class="badge ${isActive ? 'badge-approved' : 'badge-rejected'}">${isActive ? 'Activo' : 'Bloqueado'}</span>` },
        ];
      }),
    });
    openReportPrint(html);
  };

  const generateDelinquencyPDF = () => {
    const overdueInst = filteredLoans.filter(l => l.status === 'approved').flatMap(l =>
      (l.installments || []).filter(i => i.status !== 'paid' && new Date(i.due_date + 'T00:00:00') < new Date())
        .map(i => ({ ...i, loan: l }))
    );
    const html = generateReportHTML({
      title: 'Reporte de Morosidad',
      subtitle: 'Cuotas vencidas y clientes en mora',
      stats: [
        { label: 'Cuotas Vencidas', value: overdueInst.length, color: '#dc2626' },
        { label: 'Monto en Mora', value: `$${overdueInst.reduce((s, i) => s + i.amount, 0).toFixed(2)}`, color: '#dc2626' },
      ],
      tableHeaders: ['Cliente', 'Cuota #', 'Monto', 'Fecha Vencimiento', 'Días de Mora', 'Préstamo'],
      tableRows: overdueInst.map(i => {
        const profile = getKycProfile(i.loan.clientEmail);
        const due = new Date(i.due_date + 'T00:00:00');
        const daysLate = Math.floor((new Date() - due) / (1000 * 60 * 60 * 24));
        return [
          profile?.fullName || i.loan.clientEmail,
          `#${i.number}`,
          `$${i.amount.toFixed(2)}`,
          i.due_date,
          `${daysLate} días`,
          `#${i.loan.id.slice(-6)}`,
        ];
      }),
    });
    openReportPrint(html);
  };

  const generateExcel = async () => {
    const approved = filteredLoans.filter(l => l.status === 'approved');
    const allInst = approved.flatMap(l => (l.installments || []).map(i => ({ ...i, loan: l })));
    const now = new Date().toLocaleDateString('es-ES');

    if (reportType === 'portfolio') {
      const headers = [
        { header: 'ID', key: 'id', width: 14 },
        { header: 'Cliente', key: 'client', width: 24 },
        { header: 'Monto', key: 'amount', width: 16, format: 'currency' },
        { header: 'Tasa', key: 'rate', width: 10 },
        { header: 'Cuotas', key: 'installments', width: 12 },
        { header: 'Pagado', key: 'paid', width: 16, format: 'currency' },
        { header: 'Pendiente', key: 'pending', width: 16, format: 'currency' },
        { header: 'Estado', key: 'status', width: 14 },
        { header: 'Fecha', key: 'date', width: 14, format: 'date' },
      ];
      const data = filteredLoans.map(loan => {
        const profile = getKycProfile(loan.clientEmail);
        const name = profile?.fullName || loan.clientEmail;
        const paid = (loan.installments || []).filter(i => i.status === 'paid');
        const totalPaid = paid.reduce((a, i) => a + (i.paid_amount || i.amount), 0);
        const totalLoan = (loan.installments || []).reduce((a, i) => a + i.amount, 0) || loan.amount;
        return {
          id: `#${loan.id.slice(-6)}`,
          client: name,
          amount: loan.amount,
          rate: `${loan.interest_rate || 0}%`,
          installments: `${paid.length}/${loan.installments?.length || 0}`,
          paid: totalPaid,
          pending: totalLoan - totalPaid,
          status: loan.status === 'approved' ? 'Aprobado' : loan.status === 'rejected' ? 'Rechazado' : 'Pendiente',
          date: new Date(loan.created_at).toLocaleDateString('es-ES'),
        };
      });
      await downloadExcel(`cartera_${Date.now()}.xlsx`, [
        {
          name: 'Cartera',
          title: 'REPORTE DE CARTERA DE PRÉSTAMOS',
          subtitle: `Generado: ${now}`,
          headers,
          data,
          totals: {
            id: 'TOTALES',
            amount: previewStats.totalLent,
            paid: previewStats.totalCollected,
            pending: previewStats.pendingBalance,
          },
        },
        {
          name: 'Resumen',
          title: 'RESUMEN DE CARTERA',
          subtitle: `Generado: ${now}`,
          headers: [
            { header: 'Métrica', key: 'metric', width: 30 },
            { header: 'Valor', key: 'value', width: 20, format: 'currency' },
          ],
          data: [
            { metric: 'Total Préstamos', value: previewStats.totalLoans },
            { metric: 'Aprobados', value: previewStats.approvedLoans },
            { metric: 'Total Prestado', value: previewStats.totalLent },
            { metric: 'Total Cobrado', value: previewStats.totalCollected },
            { metric: 'Por Cobrar', value: previewStats.pendingBalance },
          ],
          totals: { metric: 'Tasa de Cobro', value: `${previewStats.collectionRate}%` },
        },
      ], { theme: 'blue' });
    } else if (reportType === 'payments') {
      const headers = [
        { header: 'Cliente', key: 'client', width: 24 },
        { header: 'Cuota #', key: 'number', width: 10 },
        { header: 'Monto Pagado', key: 'amount', width: 16, format: 'currency' },
        { header: 'Fecha de Pago', key: 'paidDate', width: 16, format: 'date' },
        { header: 'Estado', key: 'status', width: 14 },
      ];
      const data = allInst.filter(i => i.status === 'paid').map(i => {
        const profile = getKycProfile(i.loan.clientEmail);
        return {
          client: profile?.fullName || i.loan.clientEmail,
          number: `#${i.number}`,
          amount: i.paid_amount || i.amount,
          paidDate: i.paid_date || '—',
          status: 'Pagado',
        };
      });
      const totalCollected = data.reduce((s, d) => s + d.amount, 0);
      await downloadExcel(`pagos_${Date.now()}.xlsx`, [{
        name: 'Pagos',
        title: 'HISTORIAL DE PAGOS',
        subtitle: `Generado: ${now}`,
        headers,
        data,
        totals: { client: 'TOTALES', amount: totalCollected },
      }], { theme: 'green' });
    } else if (reportType === 'clients') {
      const headers = [
        { header: 'Nombre', key: 'name', width: 24 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Teléfono', key: 'phone', width: 16 },
        { header: 'Préstamos', key: 'loans', width: 12, format: 'number' },
        { header: 'Estado', key: 'status', width: 14 },
      ];
      const data = clients.map(c => {
        const profile = getKycProfile(c.email);
        const count = loans.filter(l => l.clientEmail === c.email).length;
        return {
          name: profile?.fullName || c.nombre || '—',
          email: c.email,
          phone: profile?.phone || '—',
          loans: count,
          status: c.status === 'blocked' ? 'Bloqueado' : 'Activo',
        };
      });
      await downloadExcel(`clientes_${Date.now()}.xlsx`, [{
        name: 'Clientes',
        title: 'LISTA DE CLIENTES',
        subtitle: `Generado: ${now}`,
        headers,
        data,
        totals: { name: 'TOTALES', loans: clients.length },
      }], { theme: 'purple' });
    } else if (reportType === 'delinquency') {
      const headers = [
        { header: 'Cliente', key: 'client', width: 24 },
        { header: 'Cuota #', key: 'number', width: 10 },
        { header: 'Monto', key: 'amount', width: 16, format: 'currency' },
        { header: 'Fecha Vencimiento', key: 'dueDate', width: 18, format: 'date' },
        { header: 'Días de Mora', key: 'daysLate', width: 14, format: 'number' },
        { header: 'Préstamo', key: 'loanId', width: 14 },
      ];
      const data = allInst.filter(i => i.status !== 'paid' && new Date(i.due_date + 'T00:00:00') < new Date()).map(i => {
        const profile = getKycProfile(i.loan.clientEmail);
        const days = Math.floor((new Date() - new Date(i.due_date + 'T00:00:00')) / 86400000);
        return {
          client: profile?.fullName || i.loan.clientEmail,
          number: `#${i.number}`,
          amount: i.amount,
          dueDate: i.due_date,
          daysLate: days,
          loanId: `#${i.loan.id.slice(-6)}`,
        };
      });
      const totalMora = data.reduce((s, d) => s + d.amount, 0);
      await downloadExcel(`mora_${Date.now()}.xlsx`, [{
        name: 'Mora',
        title: 'REPORTE DE MOROSIDAD',
        subtitle: `Generado: ${now}`,
        headers,
        data,
        totals: { client: 'TOTALES', amount: totalMora },
      }], { theme: 'red' });
    }
  };

  const handleExportPDF = () => {
    if (reportType === 'portfolio') generatePortfolioPDF();
    else if (reportType === 'payments') generatePaymentsPDF();
    else if (reportType === 'clients') generateClientsPDF();
    else if (reportType === 'delinquency') generateDelinquencyPDF();
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={22} style={{ color: 'var(--primary)' }} />
          Centro de Reportes
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
          Genera reportes exportables en PDF o Excel (.xlsx)
        </p>
      </div>

      {/* Report Type Selection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {REPORT_TYPES.map(rt => (
          <div
            key={rt.id}
            onClick={() => setReportType(rt.id)}
            className="premium-card"
            style={{
              padding: '18px',
              cursor: 'pointer',
              border: reportType === rt.id ? `2px solid ${rt.color}` : '2px solid transparent',
              backgroundColor: reportType === rt.id ? `${rt.color}10` : undefined,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ color: rt.color, marginBottom: '8px' }}>{rt.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>{rt.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="premium-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--primary)' }} /> Filtros
        </h3>
        <div className="grid-2col" style={{ gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha Desde</label>
            <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha Hasta</label>
            <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {reportType !== 'clients' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Estado del Préstamo</label>
              <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Todos</option>
                <option value="approved">Aprobados</option>
                <option value="pending">Pendientes</option>
                <option value="rejected">Rechazados</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Preview Stats */}
      <div className="premium-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={16} style={{ color: 'var(--primary)' }} /> Vista Previa
        </h3>
        <div className="grid-4col" style={{ gap: '12px' }}>
          <div style={{ padding: '14px', backgroundColor: 'var(--surface-light)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>{previewStats.totalLoans}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Préstamos</div>
          </div>
          <div style={{ padding: '14px', backgroundColor: 'var(--surface-light)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#2ECC71' }}>${previewStats.totalLent.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Total Prestado</div>
          </div>
          <div style={{ padding: '14px', backgroundColor: 'var(--surface-light)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563EB' }}>${previewStats.totalCollected.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Cobrado</div>
          </div>
          <div style={{ padding: '14px', backgroundColor: 'var(--surface-light)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#E74C3C' }}>{previewStats.overdueCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Vencidos</div>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="premium-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} style={{ color: 'var(--primary)' }} /> Exportar
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleExportPDF} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Download size={16} /> Descargar PDF
          </button>
          <button className="btn btn-secondary" onClick={generateExcel} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Table size={16} /> Descargar Excel
          </button>
        </div>
      </div>
    </div>
  );
}
