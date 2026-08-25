import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Clock, Percent, DollarSign, Activity, BarChart3 } from 'lucide-react';

const COLORS = { primary: '#2563EB', success: '#2ECC71', warning: '#F39C12', danger: '#E74C3C', purple: '#8B5CF6' };

function MetricCard({ icon, label, value, subtext, color }) {
  return (
    <div className="neo-kpi-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color }}>{value}</div>
          {subtext && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{subtext}</div>}
        </div>
      </div>
    </div>
  );
}

export default function AdminMetrics({ setTab }) {
  const { currentUser } = useAuth();
  const { loans, clients, getKycProfile } = useData();

  const [monthsBack, setMonthsBack] = useState(6);

  const metrics = useMemo(() => {
    const now = new Date();
    const approved = loans.filter(l => l.status === 'approved');
    const allInst = approved.flatMap(l => l.installments || []);
    const paidInst = allInst.filter(i => i.status === 'paid');
    const pendingInst = allInst.filter(i => i.status === 'pending');
    const overdueInst = pendingInst.filter(i => new Date(i.due_date + 'T00:00:00') < new Date());
    const submittedInst = allInst.filter(i => i.status === 'submitted');
    const rejectedInst = allInst.filter(i => i.status === 'rejected');

    const totalExpected = allInst.reduce((s, i) => s + i.amount, 0);
    const totalCollected = paidInst.reduce((s, i) => s + (i.paid_amount || i.amount), 0);
    const totalAtRisk = overdueInst.reduce((s, i) => s + i.amount, 0);

    const avgDaysLate = overdueInst.length > 0
      ? Math.round(overdueInst.reduce((s, i) => s + Math.floor((now - new Date(i.due_date + 'T00:00:00')) / 86400000), 0) / overdueInst.length)
      : 0;

    const delinquencyRate = allInst.length > 0 ? ((overdueInst.length / allInst.length) * 100).toFixed(1) : 0;
    const recoveryRate = paidInst.length > 0 ? ((paidInst.length / allInst.length) * 100).toFixed(1) : 0;

    return {
      totalAtRisk, recoveryRate, avgDaysLate, delinquencyRate,
      totalCollected, totalExpected, overdueCount: overdueInst.length,
      paidCount: paidInst.length, totalInstallments: allInst.length,
      portfolioQuality: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : 0,
    };
  }, [loans]);

  const delinquencyChart = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const monthInst = loans.filter(l => l.status === 'approved').flatMap(l =>
        (l.installments || []).filter(inst => {
          const due = new Date(inst.due_date + 'T00:00:00');
          return due >= monthStart && due <= monthEnd;
        })
      );

      const overdue = monthInst.filter(i => i.status !== 'paid' && new Date(i.due_date + 'T00:00:00') < now);
      const paid = monthInst.filter(i => i.status === 'paid');
      const rate = monthInst.length > 0 ? parseFloat(((overdue.length / monthInst.length) * 100).toFixed(1)) : 0;
      const recovery = monthInst.length > 0 ? parseFloat(((paid.length / monthInst.length) * 100).toFixed(1)) : 0;

      data.push({ name: monthKey, mora: rate, recuperacion: recovery, cuotas: monthInst.length });
    }
    return data;
  }, [loans, monthsBack]);

  const recoveryChart = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const monthPaid = loans.filter(l => l.status === 'approved').flatMap(l =>
        (l.installments || []).filter(inst => inst.status === 'paid' && inst.paid_date)
      ).filter(inst => {
        const pd = new Date(inst.paid_date + 'T00:00:00');
        return pd >= d && pd <= monthEnd;
      });

      const monthExpected = loans.filter(l => l.status === 'approved').flatMap(l =>
        (l.installments || []).filter(inst => {
          const due = new Date(inst.due_date + 'T00:00:00');
          return due >= d && due <= monthEnd;
        })
      );

      const cobrado = monthPaid.reduce((s, i) => s + (i.paid_amount || i.amount), 0);
      const esperado = monthExpected.reduce((s, i) => s + i.amount, 0);

      data.push({ name: monthKey, cobrado: parseFloat(cobrado.toFixed(2)), esperado: parseFloat(esperado.toFixed(2)) });
    }
    return data;
  }, [loans, monthsBack]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ fontSize: '13px', fontWeight: '700', color: p.color, marginTop: '2px' }}>
            {p.name}: {typeof p.value === 'number' && p.name !== 'cuotas' ? `${p.value}%` : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={22} style={{ color: 'var(--primary)' }} />
            Métricas de Mora y Recuperación
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Análisis detallado del rendimiento de tu cartera
          </p>
        </div>
        <select className="form-control" value={monthsBack} onChange={e => setMonthsBack(parseInt(e.target.value))} style={{ width: '160px' }}>
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid-4col" style={{ gap: '12px', marginBottom: '24px' }}>
        <MetricCard icon={<AlertTriangle size={22} />} label="Total en Riesgo" value={`$${metrics.totalAtRisk.toLocaleString()}`} subtext={`${metrics.overdueCount} cuotas vencidas`} color={COLORS.danger} />
        <MetricCard icon={<TrendingUp size={22} />} label="Tasa de Recuperación" value={`${metrics.recoveryRate}%`} subtext={`${metrics.paidCount}/${metrics.totalInstallments} cuotas`} color={COLORS.success} />
        <MetricCard icon={<Clock size={22} />} label="Promedio Días Mora" value={`${metrics.avgDaysLate} días`} subtext="Por cuota vencida" color={COLORS.warning} />
        <MetricCard icon={<Percent size={22} />} label="Calidad de Cartera" value={`${metrics.portfolioQuality}%`} subtext="Del total esperado cobrado" color={COLORS.purple} />
      </div>

      {/* Charts */}
      <div className="grid-2col" style={{ gap: '24px', marginBottom: '24px' }}>
        {/* Delinquency Rate Chart */}
        <div className="neo-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} style={{ color: COLORS.danger }} /> Tasa de Mora por Mes
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={delinquencyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="moraGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.danger} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.danger} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.success} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mora" stroke={COLORS.danger} strokeWidth={2.5} fill="url(#moraGrad)" name="Mora %" activeDot={{ r: 5, fill: COLORS.danger }} />
                <Area type="monotone" dataKey="recuperacion" stroke={COLORS.success} strokeWidth={2.5} fill="url(#recGrad)" name="Recuperación %" activeDot={{ r: 5, fill: COLORS.success }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recovery Chart */}
        <div className="neo-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={16} style={{ color: COLORS.primary }} /> Cobros vs Esperado
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recoveryChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '12px' }} />
                <Legend />
                <Bar dataKey="cobrado" name="Cobrado" fill={COLORS.success} radius={[6, 6, 0, 0]} />
                <Bar dataKey="esperado" name="Esperado" fill={COLORS.primary} radius={[6, 6, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="premium-card">
        <div style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: 'var(--primary)' }} /> Resumen del Portafolio
          </h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ fontWeight: '600' }}>Total de Préstamos</td><td style={{ fontWeight: '700' }}>{loans.length}</td></tr>
                <tr><td style={{ fontWeight: '600' }}>Préstamos Aprobados</td><td style={{ fontWeight: '700', color: COLORS.success }}>{loans.filter(l => l.status === 'approved').length}</td></tr>
                <tr><td style={{ fontWeight: '600' }}>Total Cuotas</td><td style={{ fontWeight: '700' }}>{metrics.totalInstallments}</td></tr>
                <tr><td style={{ fontWeight: '600' }}>Cuotas Pagadas</td><td style={{ fontWeight: '700', color: COLORS.success }}>{metrics.paidCount}</td></tr>
                <tr><td style={{ fontWeight: '600' }}>Cuotas Vencidas</td><td style={{ fontWeight: '700', color: COLORS.danger }}>{metrics.overdueCount}</td></tr>
                <tr><td style={{ fontWeight: '600' }}>Tasa de Mora</td><td style={{ fontWeight: '700', color: COLORS.danger }}>{metrics.delinquencyRate}%</td></tr>
                <tr><td style={{ fontWeight: '600' }}>Monto en Riesgo</td><td style={{ fontWeight: '700', color: COLORS.danger }}>${metrics.totalAtRisk.toLocaleString()}</td></tr>
                <tr><td style={{ fontWeight: '600' }}>Total Cobrado</td><td style={{ fontWeight: '700', color: COLORS.success }}>${metrics.totalCollected.toLocaleString()}</td></tr>
                <tr><td style={{ fontWeight: '600' }}>Calidad de Cartera</td><td style={{ fontWeight: '700', color: COLORS.purple }}>{metrics.portfolioQuality}%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
