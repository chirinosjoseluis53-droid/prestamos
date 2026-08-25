import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RefreshCw, AlertTriangle, CheckCircle2, DollarSign, Calendar, Percent } from 'lucide-react';

export default function ClientRefinance() {
  const { currentUser } = useAuth();
  const { loans, refinanceLoan } = useData();

  const activeLoan = loans.find(l => {
    if (l.status !== 'approved') return false;
    const isCompleted = l.installments && l.installments.length > 0 && l.installments.every(i => i.status === 'paid');
    return !isCompleted;
  });

  const [newRate, setNewRate] = useState('');
  const [newInstallments, setNewInstallments] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const unpaidInstallments = activeLoan ? activeLoan.installments.filter(i => i.status !== 'paid') : [];
  const paidInstallments = activeLoan ? activeLoan.installments.filter(i => i.status === 'paid') : [];

  const remainingBalance = unpaidInstallments.reduce((acc, i) => acc + (i.amount - (i.paid_amount || 0)), 0);

  const oldTotal = unpaidInstallments.reduce((acc, i) => acc + i.amount, 0);

  const comparison = useMemo(() => {
    const rate = parseFloat(newRate) || 0;
    const instCount = parseInt(newInstallments) || 1;
    const interest = rate / 100;
    const newTotal = remainingBalance * (1 + interest);
    const newMonthly = instCount > 0 ? newTotal / instCount : 0;
    return { newTotal, newMonthly, difference: newTotal - oldTotal, interest };
  }, [newRate, newInstallments, remainingBalance, oldTotal]);

  const handleRefinance = async () => {
    if (!newRate || !newInstallments || !activeLoan) {
      alert('Ingresa la nueva tasa y el número de cuotas.');
      return;
    }
    if (parseFloat(newRate) < 0 || parseInt(newInstallments) < 1) {
      alert('Verifica los datos ingresados.');
      return;
    }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await refinanceLoan(activeLoan.id, parseFloat(newRate), parseInt(newInstallments), today);
      setDone(true);
    } catch (error) {
      alert('Error al refinanciar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Refinanciar Préstamo</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Reestructura las condiciones de tu préstamo activo</p>
      </div>

      {!activeLoan ? (
        <div className="premium-card" style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--primary)', margin: '0 auto 16px auto' }} />
          <h3>Sin préstamo activo</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
            No tienes un préstamo activo que puedas refinanciar.
          </p>
        </div>
      ) : done ? (
        <div className="premium-card" style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircle2 size={48} style={{ color: '#10B981', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>¡Refinanciación Exitosa!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            Tu préstamo ha sido refinanciado con éxito. Revisa tu nuevo cronograma de cuotas.
          </p>
        </div>
      ) : (
        <div className="grid-2col" style={{ gap: '24px' }}>
          {/* Current Info */}
          <div className="premium-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} style={{ color: 'var(--warning)' }} /> Préstamo Actual
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Monto Original', value: `$${activeLoan.amount.toFixed(2)}` },
                { label: 'Saldo Pendiente', value: `$${remainingBalance.toFixed(2)}`, highlight: true },
                { label: 'Tasa Actual', value: `${activeLoan.interest_rate}%` },
                { label: 'Cuotas Pagadas', value: `${paidInstallments.length} / ${activeLoan.installments?.length || 0}` },
                { label: 'Cuotas Pendientes', value: unpaidInstallments.length.toString() },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: item.highlight ? 'rgba(243,156,18,0.06)' : 'var(--surface-light)', border: item.highlight ? '1px solid rgba(243,156,18,0.2)' : '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: item.highlight ? '#F59E0B' : 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Refinance Form */}
          <div className="premium-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} style={{ color: 'var(--primary)' }} /> Nuevas Condiciones
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nueva Tasa de Interés (%)</label>
                <div style={{ position: 'relative' }}>
                  <Percent size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input type="number" step="0.5" className="form-control" placeholder="Ej: 10" value={newRate} onChange={e => setNewRate(e.target.value)} style={{ paddingLeft: '36px' }} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nuevas Cuotas</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input type="number" className="form-control" placeholder="Ej: 6" value={newInstallments} onChange={e => setNewInstallments(e.target.value)} style={{ paddingLeft: '36px' }} />
                </div>
              </div>

              {newRate && newInstallments && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '12px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Comparación</div>
                  {[
                    { label: 'Nuevo Total', value: `$${comparison.newTotal.toFixed(2)}` },
                    { label: 'Nueva Cuota', value: `$${comparison.newMonthly.toFixed(2)}` },
                    { label: 'Diferencia', value: `${comparison.difference >= 0 ? '+' : ''}$${comparison.difference.toFixed(2)}`, color: comparison.difference > 0 ? '#EF4444' : '#10B981' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: item.color || 'var(--text)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warning */}
              <div style={{ display: 'flex', gap: '10px', padding: '12px', color: '#F59E0B', fontSize: '12px', backgroundColor: 'rgba(243,156,18,0.08)', borderRadius: '10px', border: '1px solid rgba(243,156,18,0.2)' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>Advertencia:</strong> La refinanciación eliminará tus cuotas pendientes actuales y generará un nuevo cronograma. Esto puede afectar tu historial crediticio.
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleRefinance} disabled={loading || !newRate || !newInstallments}
                style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {loading ? 'REFINANCIANDO...' : 'REFINANCIAR PRÉSTAMO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
