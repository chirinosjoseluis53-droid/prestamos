import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, AlertTriangle, Bell, CheckCircle,
  XCircle, Clock, ChevronRight, Eye, Activity, Award, Percent,
  Wallet, CalendarClock, TrendingDown, Globe, RefreshCw
} from 'lucide-react';
import localdb from '../lib/localdb';
import { calculateCreditScore } from './creditScoringHelper';

const COLORS = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  blue: '#2563EB',
  purple: '#8B5CF6',
  adminGold: '#D4AF37',
  surfaceLight: 'var(--surface-light)',
};

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: '800', color: COLORS.primary }}>
        ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: payload[0].payload?.color || 'var(--text)' }}>
        {payload[0].name}: {payload[0].value}
      </div>
    </div>
  );
}

function NeoKpiCard({ icon, label, value, subtext, color, badgeText, sparklineData }) {
  return (
    <div className="neo-kpi-card">
      <div className="neo-kpi-icon-wrapper" style={{ backgroundColor: `${color}20`, color: color }}>
        {icon}
      </div>
      {badgeText && (
        <div className="neo-kpi-badge">
          {badgeText}
        </div>
      )}
      <div className="neo-kpi-content">
        <div className="neo-kpi-label">{label}</div>
        <div className="neo-kpi-value">{value}</div>
        <div className="neo-kpi-subtext">{subtext}</div>
      </div>
      {sparklineData && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', zIndex: 1, opacity: 0.8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`sparkGradient-${label.replace(/\s+/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#sparkGradient-${label.replace(/\s+/g,'')})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ setTab }) {
  const { currentUser } = useAuth();
  const { loans, clients, getKycProfile, verifyInstallmentPayment, approveLoan, rejectLoan, refreshLoans, getNotifications } = useData();

  const [unreadCount, setUnreadCount] = useState(0);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedInst, setSelectedInst] = useState(null);
  const [selectedInstLoan, setSelectedInstLoan] = useState(null);

  const [interestRate, setInterestRate] = useState('5');
  const [paymentType, setPaymentType] = useState('installments');
  const [installmentCount, setInstallmentCount] = useState('6');
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState('Zelle');

  const [verifyApproved, setVerifyApproved] = useState(true);
  const [verifyAmount, setVerifyAmount] = useState('');
  const [adminRate, setAdminRate] = useState(null);
  const [rates, setRates] = useState({});
  const [loadingRates, setLoadingRates] = useState(true);

  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      const [erRes, bcvRes] = await Promise.all([
        fetch('https://open.er-api.com/v6/latest/USD'),
        fetch('https://bcv.today/api/v1/rate.json'),
      ]);
      const erData = await erRes.json();
      const bcvData = await bcvRes.json();
      const merged = { ...(erData?.rates || {}) };
      if (bcvData?.USD) merged.VES = bcvData.USD;
      setRates(merged);
    } catch (e) { /* silent */ } finally { setLoadingRates(false); }
  };

  useEffect(() => {
    const loadNotis = async () => {
      if (!currentUser?.id) return;
      const notis = await getNotifications(currentUser.id);
      setUnreadCount((notis || []).filter(n => !n.read).length);
    };
    loadNotis();

    const loadRate = async () => {
      if (!currentUser?.id) return;
      const rate = await localdb.getAdminInterestRate(currentUser.id);
      if (rate !== null) {
        setAdminRate(rate);
        setInterestRate(String(rate));
      }
    };
    loadRate();

    fetchRates();
  }, [currentUser, getNotifications]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const approvedLoans = loans.filter(l => l.status === 'approved');
  const allInstallments = approvedLoans.flatMap(l => (l.installments || []).map(i => ({ ...i, loan: l })));
  const paidInstallments = allInstallments.filter(i => i.status === 'paid');
  const pendingInstallments = allInstallments.filter(i => i.status === 'pending');
  const overdueInstallments = pendingInstallments.filter(i => {
    const due = new Date(i.due_date + 'T00:00:00');
    return due < new Date();
  });

  const totalLent = approvedLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalCollected = paidInstallments.reduce((sum, i) => sum + (i.paid_amount || i.amount), 0);
  const totalExpected = allInstallments.reduce((sum, i) => sum + i.amount, 0);
  const collectionRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : 0;
  const pendingLoans = loans.filter(l => l.status === 'pending');
  const submittedPayments = allInstallments.filter(i => i.status === 'submitted');

  // Projected next month (pending installments due in current or next month)
  const now = new Date();
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const projectedNextMonth = pendingInstallments
    .filter(i => {
      const d = new Date(i.due_date + 'T00:00:00');
      return d <= nextMonthEnd;
    })
    .reduce((sum, i) => sum + i.amount, 0);

  // Average interest rate
  const avgInterest = approvedLoans.length > 0
    ? (approvedLoans.reduce((s, l) => s + (l.interest_rate || 0), 0) / approvedLoans.length).toFixed(1)
    : 0;

  // ── Chart: Cobros por Mes ──────────────────────────────────────────────────
  const monthlyData = (() => {
    const months = {};
    // Last 6 months ordered
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    paidInstallments.forEach(inst => {
      const dateStr = inst.paid_date;
      if (!dateStr) return;
      const d = new Date(dateStr + 'T00:00:00');
      const key = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      if (key in months) {
        months[key] += inst.paid_amount || inst.amount;
      }
    });
    return Object.entries(months).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: parseFloat(value.toFixed(2)),
    }));
  })();

  // ── Chart: Distribution ────────────────────────────────────────────────────
  const statusData = [
    { name: 'Aprobados', value: loans.filter(l => l.status === 'approved').length, color: COLORS.primary },
    { name: 'Pendientes', value: loans.filter(l => l.status === 'pending').length, color: COLORS.warning },
    { name: 'Rechazados', value: loans.filter(l => l.status === 'rejected').length, color: COLORS.danger },
  ].filter(d => d.value > 0);

  // ── Fake Sparkline Data for Aesthetics ──────────────────────────────────────
  const fakeSparkline1 = Array.from({ length: 15 }, () => ({ value: 20 + Math.random() * 80 }));
  const fakeSparkline2 = Array.from({ length: 15 }, () => ({ value: 10 + Math.random() * 90 }));
  const fakeSparkline3 = Array.from({ length: 15 }, () => ({ value: 50 + Math.random() * 50 }));
  const topPillSparkline = Array.from({ length: 25 }, () => ({ value: 30 + Math.random() * 70 }));

  // ── Chart: Collection trend area ───────────────────────────────────────────
  const trendData = monthlyData.map((d, i) => ({
    ...d,
    projected: i === monthlyData.length - 1 ? projectedNextMonth : null,
  }));

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!firstPaymentDate) { alert('Ingresa la fecha del primer pago.'); return; }
    await approveLoan(selectedLoan.id, {
      interestRate,
      paymentType,
      installmentCount,
      firstPaymentDate,
      disbursementMethod,
    });
    await refreshLoans();
    setShowApproveModal(false);
    setSelectedLoan(null);
    await localdb.createNotification({
      target: 'client',
      user_id: selectedLoan.client_id,
      title: '✅ Préstamo Aprobado',
      body: `Tu solicitud por $${selectedLoan.amount.toFixed(2)} fue aprobada. Revisa tu dashboard.`,
      data: { loanId: selectedLoan.id },
    });
  };

  const handleReject = async (loan) => {
    if (!window.confirm('¿Seguro que deseas rechazar esta solicitud?')) return;
    await rejectLoan(loan.id, 'Rechazado por el administrador');
    await refreshLoans();
    await localdb.createNotification({
      target: 'client',
      user_id: loan.client_id,
      title: '❌ Solicitud Rechazada',
      body: `Tu solicitud por $${loan.amount.toFixed(2)} fue rechazada. Contacta a tu administrador.`,
      data: { loanId: loan.id },
    });
  };

  const handleVerifyPayment = async () => {
    await verifyInstallmentPayment(
      selectedInstLoan.id,
      selectedInst.id,
      verifyApproved,
      verifyAmount ? parseFloat(verifyAmount) : null,
      currentUser.name || 'Admin'
    );
    await refreshLoans();
    setShowVerifyModal(false);
    setSelectedInst(null);
    setSelectedInstLoan(null);
  };

  return (
    <div className="animate-fade">
      {/* ── Top Pill: Tasa de Interés ───────────────────────────────────────── */}
      <div className="neo-top-pill">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--neo-text-primary)' }}>Tasa de interés vigente:</span>
          <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--neo-accent)' }}>{adminRate != null ? `${adminRate}%` : '10%'}</span>
        </div>
        
        <div style={{ flex: 1, margin: '0 32px', height: '30px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={topPillSparkline}>
              <defs>
                <linearGradient id="pillSparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neo-accent)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--neo-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="var(--neo-accent)" strokeWidth={1.5} fill="url(#pillSparkGradient)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="neo-search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neo-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" placeholder="Buscar..." />
        </div>
      </div>

      {/* ── KPI Stats Grid ──────────────────────────────────────────────── */}
      <div className="neo-kpi-grid">
        <NeoKpiCard
          icon={<DollarSign size={24} />}
          label="Total Prestado"
          value={`$${totalLent.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtext={`${approvedLoans.length} prestamos activos`}
          color={COLORS.blue}
          sparklineData={fakeSparkline1}
        />
        <NeoKpiCard
          icon={<TrendingUp size={24} />}
          label="Total Cobrado"
          value={`$${totalCollected.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtext={`${collectionRate}% de cobro`}
          color={COLORS.success}
          badgeText="-5%"
          sparklineData={fakeSparkline2}
        />
        <NeoKpiCard
          icon={<Wallet size={24} />}
          label="Proyectado Próx. Mes"
          value={`$${projectedNextMonth.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtext={`${pendingInstallments.filter(i => new Date(i.due_date + 'T00:00:00') <= nextMonthEnd).length} cuotas por cobrar`}
          color={COLORS.purple}
          sparklineData={fakeSparkline3}
        />
      </div>

      {/* ── Secondary Stats Row ─────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: '28px', gap: '12px' }}>
        <div className="premium-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <Users size={20} style={{ color: COLORS.blue, marginBottom: '6px' }} />
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{clients.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Clientes</div>
        </div>
        <div className="premium-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <Percent size={20} style={{ color: COLORS.purple, marginBottom: '6px' }} />
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)' }}>{avgInterest}%</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Tasa Promedio</div>
        </div>
      </div>
      {/* ── Main Area Chart ──────────────────────────────────────────────────── */}
      <div className="neo-chart-container" style={{ marginBottom: '28px' }}>
        <h3 className="neo-chart-title">Carretera de Créditos por Mes</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="mainChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neo-accent)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--neo-accent)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: 'var(--neo-text-secondary)' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'var(--neo-text-secondary)' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(v) => v}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--neo-card-bg)', borderColor: 'var(--neo-card-border)', borderRadius: '12px', color: 'var(--neo-text-primary)' }}
                itemStyle={{ color: 'var(--neo-accent)' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="var(--neo-accent)" 
                strokeWidth={3} 
                fill="url(#mainChartGradient)" 
                activeDot={{ r: 6, fill: 'var(--neo-accent)', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area 
                type="monotone" 
                dataKey="projected" 
                stroke="rgba(46, 229, 194, 0.4)" 
                strokeWidth={3} 
                strokeDasharray="5 5" 
                fill="none" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tasas de Cambio ──────────────────────────────────────────────── */}
      <div className="neo-card" style={{ padding: '16px 20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--neo-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} style={{ color: COLORS.blue }} /> Tasas de Cambio (USD)
          </span>
          <button
            onClick={fetchRates}
            disabled={loadingRates}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              backgroundColor: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(37,99,235,0.2)',
              color: COLORS.blue, fontSize: '12px', fontWeight: '600',
              cursor: loadingRates ? 'not-allowed' : 'pointer',
              opacity: loadingRates ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={13} style={{ animation: loadingRates ? 'spin 1s linear infinite' : 'none' }} />
            {loadingRates ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
        {loadingRates ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
            <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid var(--border)', borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {[
              { code: 'USD', flag: 'us', name: 'Dólar' },
              { code: 'EUR', flag: 'eu', name: 'Euro' },
              { code: 'COP', flag: 'co', name: 'Peso Colombiano' },
              { code: 'CLP', flag: 'cl', name: 'Peso Chileno' },
              { code: 'VES', flag: 've', name: 'Bolívar' },
            ].map(c => (
              <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                <img src={`https://flagcdn.com/w40/${c.flag}.png`} alt={c.code} style={{ width: '28px', height: '20px', borderRadius: '3px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1 }}>{c.name}</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                    {rates[c.code] ? rates[c.code].toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'} {c.code}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pending Approvals Table ──────────────────────────────────────── */}
      {pendingLoans.length > 0 && (
        <div className="neo-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.warning }}>
              <Clock size={18} /> Solicitudes Pendientes
            </h3>
            <span style={{
              fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '99px',
              backgroundColor: 'rgba(243,156,18,0.1)', color: COLORS.warning,
            }}>{pendingLoans.length}</span>
          </div>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Finalidad</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingLoans.map(loan => (
                  <tr key={loan.id}>
                    <td style={{ fontWeight: '600' }}>{loan.clientEmail}</td>
                    <td style={{ fontWeight: '800', color: COLORS.primary, fontSize: '15px' }}>${loan.amount.toFixed(2)}</td>
                    <td>{loan.purpose || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(loan.created_at).toLocaleDateString()}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => { setSelectedLoan(loan); setShowApproveModal(true); }}>
                        <CheckCircle size={12} /> Aprobar
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px', color: COLORS.danger }}
                        onClick={() => handleReject(loan)}>
                        <XCircle size={12} /> Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Submitted Payments ───────────────────────────────────────────── */}
      {submittedPayments.length > 0 && (
        <div className="neo-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.blue }}>
              <Eye size={18} /> Comprobantes por Verificar
            </h3>
            <span style={{
              fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '99px',
              backgroundColor: 'rgba(59,130,246,0.1)', color: COLORS.blue,
            }}>{submittedPayments.length}</span>
          </div>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Cuota #</th>
                  <th>Monto Cuota</th>
                  <th>Monto Declarado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {submittedPayments.map(inst => {
                  const loanObj = loans.find(l => l.id === inst.loan_id);
                  return (
                    <tr key={inst.id}>
                      <td style={{ fontWeight: '600' }}>{inst.clientEmail || loanObj?.clientEmail}</td>
                      <td>#{inst.number}</td>
                      <td style={{ fontWeight: '700' }}>${inst.amount.toFixed(2)}</td>
                      <td style={{ color: COLORS.warning, fontWeight: '700' }}>
                        {inst.claimed_amount ? `$${parseFloat(inst.claimed_amount).toFixed(2)}` : '—'}
                      </td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}
                          onClick={() => {
                            setSelectedInst(inst);
                            setSelectedInstLoan(loanObj);
                            setVerifyApproved(true);
                            setVerifyAmount(inst.claimed_amount ? String(inst.claimed_amount) : String(inst.amount));
                            setShowVerifyModal(true);
                          }}>
                          Verificar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Approve Loan Modal ──────────────────────────────────────────── */}
      {showApproveModal && selectedLoan && (
        <div className="modal-backdrop" onClick={() => setShowApproveModal(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Aprobar Préstamo — ${selectedLoan.amount.toFixed(2)}</h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="grid-2col" style={{ gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tasa de Interés (%)</label>
                  <input type="number" className="form-control" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Método de Desembolso</label>
                  <select className="form-control" value={disbursementMethod} onChange={e => setDisbursementMethod(e.target.value)}>
                    <option>Zelle</option>
                    <option>Pago Móvil</option>
                    <option>Transferencia</option>
                    <option>Efectivo</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de Pago</label>
                  <select className="form-control" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                    <option value="installments">Cuotas mensuales</option>
                    <option value="single">Pago único</option>
                  </select>
                </div>
                {paymentType === 'installments' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Número de Cuotas</label>
                    <input type="number" className="form-control" value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} min="1" max="60" />
                  </div>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha del Primer Pago</label>
                <input type="date" className="form-control" value={firstPaymentDate} onChange={e => setFirstPaymentDate(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleApprove}>Confirmar Aprobación</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Verify Payment Modal ────────────────────────────────────────── */}
      {showVerifyModal && selectedInst && (
        <div className="modal-backdrop" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verificar Pago — Cuota #{selectedInst.number}</h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedInst.payment_proof_url && (
                <div style={{ textAlign: 'center' }}>
                  <img src={selectedInst.payment_proof_url} alt="Comprobante"
                    style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '12px', border: '1px solid var(--border)' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className={`btn ${verifyApproved ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}
                  onClick={() => setVerifyApproved(true)}>
                  <CheckCircle size={14} /> Aprobar
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, color: COLORS.danger, borderColor: COLORS.danger }}
                  onClick={() => setVerifyApproved(false)}>
                  <XCircle size={14} /> Rechazar
                </button>
              </div>
              {verifyApproved && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Monto Aprobado ($)</label>
                  <input type="number" className="form-control" step="0.01" value={verifyAmount}
                    onChange={e => setVerifyAmount(e.target.value)} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVerifyModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleVerifyPayment}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
