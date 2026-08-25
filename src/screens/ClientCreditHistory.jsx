import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Award, Clock, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

function evaluateLoyalty(loans) {
  if (!loans || loans.length === 0) return 0;
  const paidLoans = loans.filter(l => l.status === 'approved' && l.installments?.every(i => i.status === 'paid'));
  return Math.min(100, paidLoans.length * 20);
}

export default function ClientCreditHistory() {
  const { currentUser } = useAuth();
  const { loans } = useData();

  const myLoans = useMemo(() =>
    loans.filter(l => l.clientEmail === currentUser?.email).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  [loans, currentUser]);

  const chartData = useMemo(() => {
    return myLoans.map(loan => {
      const paidCount = loan.installments?.filter(i => i.status === 'paid').length || 0;
      const total = loan.installments?.length || 1;
      const onTimeRate = total > 0 ? (paidCount / total) * 100 : 0;
      const score = evaluateLoyalty(myLoans.filter(l => new Date(l.created_at) <= new Date(loan.created_at)));
      return {
        name: new Date(loan.created_at).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        score,
        monto: loan.amount,
        cuotas: loan.installments?.length || 0,
      };
    });
  }, [myLoans]);

  const stats = useMemo(() => {
    const totalLoans = myLoans.length;
    const completed = myLoans.filter(l => l.status === 'approved' && l.installments?.every(i => i.status === 'paid')).length;
    const active = myLoans.filter(l => l.status === 'approved' && !l.installments?.every(i => i.status === 'paid')).length;
    const onTimeCount = myLoans.filter(l => l.status === 'approved').reduce((sum, l) => {
      const lateFees = l.installments?.filter(i => i.is_late).length || 0;
      return sum + (l.installments?.length - lateFees);
    }, 0);
    const totalPaid = myLoans.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.installments?.length || 0), 0);
    const onTimeRate = totalPaid > 0 ? ((onTimeCount / totalPaid) * 100).toFixed(1) : '100';
    return { totalLoans, completed, active, onTimeRate };
  }, [myLoans]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="badge badge-approved">Aprobado</span>;
      case 'pending': return <span className="badge badge-pending">Pendiente</span>;
      case 'rejected': return <span className="badge badge-rejected">Rechazado</span>;
      default: return <span className="badge badge-pending">{status}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Mi Historial Crediticio</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Evolución de tu historial de préstamos</p>
      </div>

      {/* Stats */}
      <div className="grid-4col" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Préstamos', value: stats.totalLoans, icon: <TrendingUp size={20} />, color: 'var(--primary)' },
          { label: 'Completados', value: stats.completed, icon: <CheckCircle2 size={20} />, color: '#10B981' },
          { label: 'Activos', value: stats.active, icon: <Clock size={20} />, color: '#F59E0B' },
          { label: 'Puntualidad', value: `${stats.onTimeRate}%`, icon: <Award size={20} />, color: '#8B5CF6' },
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

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="premium-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} style={{ color: 'var(--primary)' }} /> Evolución del Score
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} fill="url(#scoreGradient)" name="Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Timeline */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} /> Línea de Tiempo
        </h3>

        {myLoans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No tienes préstamos registrados aún.
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '28px' }}>
            <div style={{ position: 'absolute', left: '8px', top: '0', bottom: '0', width: '2px', backgroundColor: 'var(--border)' }} />
            {myLoans.map((loan, idx) => {
              const paidCount = loan.installments?.filter(i => i.status === 'paid').length || 0;
              const totalCount = loan.installments?.length || 0;
              const score = evaluateLoyalty(myLoans.filter(l => new Date(l.created_at) <= new Date(loan.created_at)));
              const dotColor = loan.status === 'approved' ? '#10B981' : loan.status === 'rejected' ? '#EF4444' : '#F59E0B';
              return (
                <div key={loan.id} style={{ position: 'relative', paddingBottom: idx < myLoans.length - 1 ? '24px' : '0', marginBottom: '4px' }}>
                  <div style={{ position: 'absolute', left: '-24px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: dotColor, border: '2px solid var(--background)', zIndex: 1 }} />
                  <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDate(loan.created_at)}</div>
                      {getStatusBadge(loan.status)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>${loan.amount.toFixed(2)}</div>
                        {loan.status === 'approved' && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {paidCount}/{totalCount} cuotas pagadas · Score: {score}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {loan.interest_rate}% · {loan.installments_count || totalCount} cuotas
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
