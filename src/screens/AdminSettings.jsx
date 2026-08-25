import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { calculateCreditScore } from './creditScoringHelper';
import { getDueDate, formatLoanDate, getTotalPaid } from '../lib/loanHelpers';
import { generateReportHTML, openReportPrint, getStatusBadge } from '../lib/pdfTemplate';
import { 
  User, Copy, Check, FileText, Download, Shield, Sun, Moon, 
  Plus, Trash2, Smartphone, DollarSign, Settings, Percent, BellRing 
} from 'lucide-react';

const DEFAULT_RATES = [
  { id: '1', name: 'Estándar', rate: '5', period: 'mensual', description: 'Tasa base para clientes nuevos' },
  { id: '2', name: 'Preferencial', rate: '3', period: 'mensual', description: 'Para clientes con historial positivo' },
  { id: '3', name: 'Especial', rate: '8', period: 'mensual', description: 'Préstamos de corto plazo' },
];

export default function AdminSettings({ setTab }) {
  const { currentUser, logoutUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { clients, loans, getKycProfile } = useData();

  const [copied, setCopied] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [autoWhatsApp, setAutoWhatsApp] = useState(true);

  // Interest rate settings state
  const [rates, setRates] = useState(() => {
    const saved = localStorage.getItem(`@admin_rates_${currentUser?.id}`);
    return saved ? JSON.parse(saved) : DEFAULT_RATES;
  });
  const [showAddRateForm, setShowAddRateForm] = useState(false);
  const [newRateName, setNewRateName] = useState('');
  const [newRateValue, setNewRateValue] = useState('');
  const [newRateDesc, setNewRateDesc] = useState('');

  useEffect(() => {
    if (currentUser?.id) {
      const savedPhoto = localStorage.getItem(`@admin_photo_${currentUser.id}`);
      if (savedPhoto) setProfilePhoto(savedPhoto);
      
      const savedReminders = localStorage.getItem(`@admin_auto_whatsapp_${currentUser.id}`);
      if (savedReminders !== null) setAutoWhatsApp(savedReminders === 'true');
    }
  }, [currentUser]);

  const handleCopyInviteCode = () => {
    if (currentUser?.inviteCode) {
      navigator.clipboard.writeText(currentUser.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfilePhoto(ev.target.result);
      if (currentUser?.id) {
        localStorage.setItem(`@admin_photo_${currentUser.id}`, ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleWhatsAppToggle = () => {
    const newVal = !autoWhatsApp;
    setAutoWhatsApp(newVal);
    if (currentUser?.id) {
      localStorage.setItem(`@admin_auto_whatsapp_${currentUser.id}`, String(newVal));
    }
  };

  // Rates Handlers
  const handleAddRate = (e) => {
    e.preventDefault();
    if (!newRateName || !newRateValue) return;
    const newEntry = {
      id: Date.now().toString(),
      name: newRateName,
      rate: newRateValue,
      period: 'mensual',
      description: newRateDesc
    };
    const updated = [...rates, newEntry];
    setRates(updated);
    localStorage.setItem(`@admin_rates_${currentUser?.id}`, JSON.stringify(updated));
    setNewRateName('');
    setNewRateValue('');
    setNewRateDesc('');
    setShowAddRateForm(false);
  };

  const handleDeleteRate = (id) => {
    if (window.confirm('¿Eliminar esta tasa de interés de referencia?')) {
      const updated = rates.filter(r => r.id !== id);
      setRates(updated);
      localStorage.setItem(`@admin_rates_${currentUser?.id}`, JSON.stringify(updated));
    }
  };

  // CSV Helpers
  const triggerCSVDownload = (filename, content) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // General CSV Report
  const downloadGeneralCSV = () => {
    let csv = `REPORTE GENERAL DE PRÉSTAMOS\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    csv += `ID,Cliente,Monto,Estado,Metodo,Cuotas,Total Pagado,Fecha Creacion\n`;
    loans.forEach(loan => {
      const profile = getKycProfile(loan.clientEmail);
      const name = profile?.fullName || loan.clientEmail;
      const paid = loan.installments?.filter(i => i.status === 'paid') || [];
      const totalPaid = paid.reduce((a, i) => a + i.amount, 0);
      csv += `${loan.id.slice(-8)},${name},${loan.amount},${loan.status},${loan.disbursementMethod || 'N/A'},${loan.installments?.length || 0},${totalPaid},${new Date(loan.created_at || loan.createdAt).toLocaleDateString('es-ES')}\n`;
    });
    triggerCSVDownload(`reporte_general_${Date.now()}.csv`, csv);
  };

  // Active Loans CSV Report
  const downloadActiveCSV = () => {
    const active = loans.filter(l => l.status === 'approved');
    let csv = `REPORTE DE PRÉSTAMOS ACTIVOS\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    csv += `ID,Cliente,Monto Total,Cuotas Total,Cuotas Pagadas,Monto Pagado,Monto Restante,Metodo\n`;
    active.forEach(loan => {
      const profile = getKycProfile(loan.clientEmail);
      const name = profile?.fullName || loan.clientEmail;
      const totalAmount = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
      const paid = loan.installments?.filter(i => i.status === 'paid') || [];
      const totalPaid = paid.reduce((a, i) => a + i.amount, 0);
      csv += `${loan.id.slice(-8)},${name},${totalAmount},${loan.installments?.length || 0},${paid.length},${totalPaid},${totalAmount - totalPaid},${loan.disbursementMethod || 'N/A'}\n`;
    });
    triggerCSVDownload(`reporte_activos_${Date.now()}.csv`, csv);
  };

  // Per Client CSV Report
  const downloadClientCSV = (client) => {
    const profile = getKycProfile(client.email);
    const clientLoans = loans.filter(l => l.clientEmail === client.email);
    const name = profile?.fullName || client.email;
    let csv = `REPORTE INDIVIDUAL DEL CLIENTE: ${name}\n`;
    csv += `Email: ${client.email}\n`;
    csv += `Documento: ${profile?.idNumber || 'N/A'}\n`;
    csv += `Telefono: ${profile?.phone || 'N/A'}\n\n`;
    
    clientLoans.forEach((loan, idx) => {
      const totalAmount = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
      const paid = loan.installments?.filter(i => i.status === 'paid') || [];
      const totalPaid = paid.reduce((a, i) => a + i.amount, 0);
      csv += `PRESTAMO ${idx + 1} - ID: ${loan.id}\n`;
      csv += `Monto Original,${loan.amount}\n`;
      csv += `Total con Intereses,${totalAmount}\n`;
      csv += `Total Pagado,${totalPaid}\n`;
      csv += `Saldo Pendiente,${totalAmount - totalPaid}\n`;
      csv += `Estado,${loan.status}\n\n`;
    });
    
    triggerCSVDownload(`reporte_cliente_${client.email.replace(/[@.]/g, '_')}.csv`, csv);
  };

  // General PDF Report
  const downloadGeneralPDF = () => {
    const totalPaid = loans.reduce((sum, loan) => {
      const paid = loan.installments?.filter(i => i.status === 'paid') || [];
      return sum + paid.reduce((a, i) => a + i.amount, 0);
    }, 0);
    const totalAmount = loans.reduce((sum, loan) => sum + (loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount), 0);

    const html = generateReportHTML({
      title: 'Reporte General de Cartera',
      subtitle: 'Resumen completo de todos los préstamos del sistema',
      stats: [
        { label: 'Total Préstamos', value: loans.length, color: '#0f4c8a' },
        { label: 'Aprobados', value: loans.filter(l => l.status === 'approved').length, color: '#059669' },
        { label: 'Pendientes', value: loans.filter(l => l.status === 'pending').length, color: '#d97706' },
        { label: 'Monto Total', value: `$${totalAmount.toFixed(2)}`, color: '#7c3aed' },
        { label: 'Total Cobrado', value: `$${totalPaid.toFixed(2)}`, color: '#059669' },
        { label: 'Por Cobrar', value: `$${(totalAmount - totalPaid).toFixed(2)}`, color: '#dc2626' },
      ],
      tableHeaders: ['ID', 'Cliente', 'Monto', 'Total c/Intereses', 'Pagado', 'Pendiente', 'Cuotas', 'Método', 'Estado', 'Fecha'],
      tableRows: loans.map(loan => {
        const profile = getKycProfile(loan.clientEmail);
        const name = profile?.fullName || loan.clientEmail;
        const paid = loan.installments?.filter(i => i.status === 'paid') || [];
        const totalPaid = paid.reduce((a, i) => a + i.amount, 0);
        const totalLoan = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
        const badge = getStatusBadge(loan.status);
        return [
          `#${loan.id.slice(-6)}`,
          name,
          `$${loan.amount.toFixed(2)}`,
          `$${totalLoan.toFixed(2)}`,
          `$${totalPaid.toFixed(2)}`,
          `$${(totalLoan - totalPaid).toFixed(2)}`,
          `${loan.installments?.length || 0}`,
          loan.disbursementMethod || 'N/A',
          { html: `<span class="badge ${badge.class}">${badge.label}</span>` },
          new Date(loan.created_at || loan.createdAt).toLocaleDateString('es-ES'),
        ];
      }),
    });
    openReportPrint(html);
  };

  // Active Loans PDF Report
  const downloadActivePDF = () => {
    const active = loans.filter(l => l.status === 'approved');
    const totalPending = active.reduce((sum, loan) => {
      const total = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
      const paid = loan.installments?.filter(i => i.status === 'paid') || [];
      const totalPaid = paid.reduce((a, i) => a + i.amount, 0);
      return sum + (total - totalPaid);
    }, 0);

    const html = generateReportHTML({
      title: 'Reporte de Préstamos Activos',
      subtitle: 'Préstamos actualmente en vigencia con saldos pendientes',
      stats: [
        { label: 'Préstamos Activos', value: active.length, color: '#059669' },
        { label: 'Total Pendiente', value: `$${totalPending.toFixed(2)}`, color: '#dc2626' },
      ],
      tableHeaders: ['ID', 'Cliente', 'Monto Original', 'Total c/Intereses', 'Cuotas Pagadas', 'Cuotas Totales', 'Monto Pagado', 'Saldo Pendiente', 'Método'],
      tableRows: active.map(loan => {
        const profile = getKycProfile(loan.clientEmail);
        const name = profile?.fullName || loan.clientEmail;
        const totalAmount = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
        const paid = loan.installments?.filter(i => i.status === 'paid') || [];
        const totalPaid = paid.reduce((a, i) => a + i.amount, 0);
        return [
          `#${loan.id.slice(-6)}`,
          name,
          `$${loan.amount.toFixed(2)}`,
          `$${totalAmount.toFixed(2)}`,
          `${paid.length}`,
          `${loan.installments?.length || 0}`,
          `$${totalPaid.toFixed(2)}`,
          `$${(totalAmount - totalPaid).toFixed(2)}`,
          loan.disbursementMethod || 'N/A',
        ];
      }),
    });
    openReportPrint(html);
  };

  // Per Client PDF Report
  const downloadClientPDF = (client) => {
    const profile = getKycProfile(client.email);
    const clientLoans = loans.filter(l => l.clientEmail === client.email);
    const name = profile?.fullName || client.email;

    const totalBorrowed = clientLoans.reduce((sum, l) => sum + l.amount, 0);
    const totalPaid = clientLoans.reduce((sum, l) => {
      const paid = l.installments?.filter(i => i.status === 'paid') || [];
      return sum + paid.reduce((a, i) => a + i.amount, 0);
    }, 0);

    const html = generateReportHTML({
      title: `Reporte Individual: ${name}`,
      subtitle: 'Detalle completo de préstamos del cliente',
      clientInfo: {
        name,
        email: client.email,
        id: profile?.idNumber || 'N/A',
        phone: profile?.phone || 'N/A',
      },
      stats: [
        { label: 'Total Prestado', value: `$${totalBorrowed.toFixed(2)}`, color: '#0f4c8a' },
        { label: 'Total Pagado', value: `$${totalPaid.toFixed(2)}`, color: '#059669' },
        { label: 'Saldo Pendiente', value: `$${(totalBorrowed - totalPaid).toFixed(2)}`, color: '#dc2626' },
        { label: 'Préstamos', value: clientLoans.length, color: '#7c3aed' },
      ],
      tableHeaders: ['ID', 'Monto Original', 'Total c/Intereses', 'Pagado', 'Pendiente', 'Cuotas', 'Estado', 'Fecha'],
      tableRows: clientLoans.map(loan => {
        const total = loan.installments?.reduce((a, i) => a + i.amount, 0) || loan.amount;
        const paid = loan.installments?.filter(i => i.status === 'paid') || [];
        const tp = paid.reduce((a, i) => a + i.amount, 0);
        const badge = getStatusBadge(loan.status);
        return [
          `#${loan.id.slice(-6)}`,
          `$${loan.amount.toFixed(2)}`,
          `$${total.toFixed(2)}`,
          `$${tp.toFixed(2)}`,
          `$${(total - tp).toFixed(2)}`,
          `${loan.installments?.length || 0}`,
          { html: `<span class="badge ${badge.class}">${badge.label}</span>` },
          new Date(loan.created_at || loan.createdAt).toLocaleDateString('es-ES'),
        ];
      }),
      footer: `Cliente: ${name} (${client.email}) — Documento confidencial`,
    });
    openReportPrint(html);
  };

  return (
    <div className="admin-settings animate-fade grid-2col-wide">
      {/* Left Column: Profile & Referal & Reports */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Profile Card */}
        <div className="premium-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div 
            onClick={() => document.getElementById('admin-avatar-input').click()}
            style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer', overflow: 'hidden', border: '3px solid var(--background)', boxShadow: '0 0 0 2px var(--primary)' }}
          >
            {profilePhoto ? (
              <img src={profilePhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
            ) : (
              <User size={36} color="#fff" />
            )}
            <input type="file" id="admin-avatar-input" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800' }}>{currentUser?.name || 'Administrador'}</h3>
            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Administrador</span>
          </div>

          {currentUser?.inviteCode && (
            <div style={{ marginTop: '10px', width: '100%' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>TU CÓDIGO DE INVITACIÓN (Para registro de clientes)</span>
              <div 
                onClick={handleCopyInviteCode}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: 'var(--surface-light)', border: '1px dashed var(--primary)', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '2px' }}>{currentUser.inviteCode}</span>
                {copied ? <Check size={18} style={{ color: 'var(--success)' }} /> : <Copy size={18} style={{ color: 'var(--text-secondary)' }} />}
              </div>
            </div>
          )}
        </div>

        {/* Reports Download Card */}
        <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} /> Centro de Reportes
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>Reporte General</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Métricas generales de la cartera</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={downloadGeneralPDF}>PDF</button>
                <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={downloadGeneralCSV}><Download size={14} /></button>
              </div>
            </div>

            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>Préstamos Activos</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vigilancia de saldos pendientes</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={downloadActivePDF}>PDF</button>
                <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={downloadActiveCSV}><Download size={14} /></button>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '13px', fontWeight: '700', marginTop: '12px', color: 'var(--text-secondary)' }}>Reportes Individuales por Cliente</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
            {clients.map(client => (
              <div key={client.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{client.nombre || client.email}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => downloadClientPDF(client)}>PDF</button>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => downloadClientCSV(client)}>CSV</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Interest Rates Reference & System Switchers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Interest Rates references */}
        <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={18} style={{ color: 'var(--primary)' }} /> Tasas de Interés Referenciales
            </h3>
            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => setShowAddRateForm(!showAddRateForm)}>
              {showAddRateForm ? 'Cerrar' : '+ Nueva'}
            </button>
          </div>

          {showAddRateForm && (
            <form onSubmit={handleAddRate} style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--surface-light)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <input type="text" className="form-control" placeholder="Nombre (ej. Preferencial)" value={newRateName} onChange={e => setNewRateName(e.target.value)} required />
              <input type="number" className="form-control" placeholder="Porcentaje (ej. 5)" value={newRateValue} onChange={e => setNewRateValue(e.target.value)} required />
              <input type="text" className="form-control" placeholder="Descripción" value={newRateDesc} onChange={e => setNewRateDesc(e.target.value)} />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '13px' }}>Agregar tasa</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rates.map(rate => (
              <div key={rate.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>{rate.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{rate.description || 'Sin descripción'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>{rate.rate}%</span>
                  <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeleteRate(rate.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Settings & Switchers */}
        <div className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: 'var(--primary)' }} /> Preferencias del Sistema
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Dark Mode toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>Tema de la Interfaz</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cambiar entre modo claro y oscuro</span>
              </div>
              <button className="btn btn-secondary" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isDark ? <Sun size={16} style={{ color: '#F59E0B' }} /> : <Moon size={16} />}
                <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
              </button>
            </div>

            {/* Auto Reminders toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>Recordatorios automáticos</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Generar notificaciones de vencimiento</span>
              </div>
              <div 
                onClick={handleWhatsAppToggle}
                style={{ width: '46px', height: '24px', borderRadius: '12px', backgroundColor: autoWhatsApp ? 'var(--primary)' : 'var(--border)', padding: '2px', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s' }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', left: autoWhatsApp ? '24px' : '2px', transition: 'left 0.2s' }}></div>
              </div>
            </div>

            {/* Payment settings routing */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>Métodos de Cobro</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Configurar Zelle y Pago Móvil</span>
              </div>
              <button className="btn btn-secondary" onClick={() => setTab('cobro-settings')}>
                Configurar →
              </button>
            </div>
            
            {/* Logout */}
            <button className="btn btn-secondary" style={{ marginTop: '10px', color: 'var(--danger)', borderColor: 'var(--danger)', width: '100%', justifyContent: 'center' }} onClick={logoutUser}>
              Cerrar Sesión Administrador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
