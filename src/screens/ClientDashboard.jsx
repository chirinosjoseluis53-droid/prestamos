import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LayoutDashboard, Award, Calendar, DollarSign, ArrowRight, ChevronRight, MessageSquare, Bell, CreditCard, Sparkles, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

export default function ClientDashboard({ setTab }) {
  const { currentUser } = useAuth();
  const { loans, getKycProfile, getNotifications, refreshLoans } = useData();

  const [unreadCount, setUnreadCount] = useState(0);
  const [rates, setRates] = useState({});
  const [loadingRates, setLoadingRates] = useState(true);

  useEffect(() => { refreshLoans(); }, []);

  const email = currentUser?.email || 'cliente@prestamos.com';
  const profile = getKycProfile(email);
  const profileImage = profile?.profilePhoto || profile?.profile_photo;
  
  const activeLoan = loans.find(l => {
    if (l.status !== 'approved') return false;
    const isCompleted = l.installments && l.installments.length > 0 && l.installments.every(i => i.status === 'paid');
    return !isCompleted;
  });
  const pendingLoan = loans.find(l => l.status === 'pending');

  const paidInstallments = activeLoan
    ? activeLoan.installments.filter(i => i.status === 'paid').length
    : 0;
  const totalInstallments = activeLoan ? activeLoan.installments.length : 0;
  const progress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

  const remainingBalance = activeLoan
    ? activeLoan.installments
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + (i.amount - (i.paid_amount || 0)), 0)
    : 0;

  const nextUnpaid = activeLoan
    ? activeLoan.installments.find(i => i.status === 'pending' || i.status === 'submitted' || i.status === 'partially_paid')
    : null;

  // Inline adaptation of evaluateClientLoyalty
  const evaluateLoyalty = () => {
    if (!loans || loans.length === 0) return { score: 0, tier: 'Bronce', nextTier: 'Plata', progress: 0, color: '#CD7F32' };
    const paidLoans = loans.filter(l => l.status === 'approved' && l.installments?.every(i => i.status === 'paid'));
    const count = paidLoans.length;
    
    let score = count * 20;
    if (score > 100) score = 100;

    let tier = 'Bronce';
    let nextTier = 'Plata';
    let color = '#CD7F32';
    
    if (score >= 85) {
      tier = 'Diamante';
      nextTier = 'Diamante';
      color = '#00D4FF';
    } else if (score >= 55) {
      tier = 'Oro';
      nextTier = 'Diamante';
      color = '#FFD700';
    } else if (score >= 25) {
      tier = 'Plata';
      nextTier = 'Oro';
      color = '#A8A9AD';
    }

    return { score, tier, nextTier, progress: score, color };
  };

  const loyalty = evaluateLoyalty();

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  useEffect(() => {
    const loadNotis = async () => {
      if (!currentUser?.id) return;
      const notis = await getNotifications(currentUser.id);
      setUnreadCount((notis || []).filter(n => !n.read).length);
    };
    loadNotis();

    fetchRates();
  }, [currentUser, getNotifications]);

  return (
    <div className="animate-fade">
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {getGreeting()}, {profile?.fullName || currentUser?.email.split('@')[0]}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Aquí tienes el resumen de tu cuenta</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="top-bar-btn" onClick={() => setTab('notifications')} style={{ position: 'relative' }}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: 'var(--danger)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '99px'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Loyalty Widget - Dynamic Level Colors */}
      {(() => {
        const LEVEL_STYLES = {
          Bronce: { gradient: 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)', shadow: '0 8px 24px rgba(205,127,50,0.35)', icon: '🥉' },
          Plata: { gradient: 'linear-gradient(135deg, #A8A9AD 0%, #7B7D80 100%)', shadow: '0 8px 24px rgba(168,169,173,0.35)', icon: '🥈' },
          Oro: { gradient: 'linear-gradient(135deg, #FFD700 0%, #DAA520 100%)', shadow: '0 8px 24px rgba(255,215,0,0.35)', icon: '🥇' },
          Diamante: { gradient: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)', shadow: '0 8px 24px rgba(0,212,255,0.35)', icon: '💎' },
        };
        const style = LEVEL_STYLES[loyalty.tier] || LEVEL_STYLES.Bronce;
        return (
          <div
            className="loyalty-card"
            onClick={() => setTab('score')}
            style={{ cursor: 'pointer', background: style.gradient, boxShadow: style.shadow }}
            title="Ver niveles de rendimiento"
          >
            <div className="loyalty-header">
              <div>
                <div style={{ fontSize: '13px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, letterSpacing: '1px' }}>
                  Rendimiento Crediticio
                </div>
                <div className="loyalty-score">{loyalty.score} Puntos</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '28px', lineHeight: 1 }}>{style.icon}</span>
                <span className="loyalty-level">{loyalty.tier}</span>
              </div>
            </div>

            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${loyalty.progress}%` }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.9 }}>
              <span>Progreso: {loyalty.progress}%</span>
              <span>Siguiente Nivel: {loyalty.nextTier}</span>
            </div>
            <Award size={96} className="loyalty-card-bg-icon" />
          </div>
        );
      })()}

      {/* Loan overview cards */}
      <div className="stats-grid">
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Deuda Total Restante</span>
            <span className="stat-value">
              {activeLoan ? `$${remainingBalance.toFixed(2)}` : '$0.00'}
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(15, 164, 108, 0.15)', color: 'var(--primary)' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Próximo Vencimiento</span>
            <span className="stat-value" style={{ fontSize: '20px' }}>
              {nextUnpaid ? formatDate(nextUnpaid.due_date) : 'Sin cuotas'}
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(243, 156, 18, 0.15)', color: 'var(--warning)' }}>
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* Exchange Rates - Compact */}
      <div className="premium-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Tasas de Cambio (USD)</span>
          <button
            onClick={fetchRates}
            disabled={loadingRates}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              backgroundColor: 'rgba(15,164,108,0.1)',
              border: '1px solid rgba(15,164,108,0.2)',
              color: 'var(--primary)', fontSize: '12px', fontWeight: '600',
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
            <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div className="grid-3col-stats">
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

      {/* Active Loan Details Widget */}
      {activeLoan ? (
        <div className="premium-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={20} style={{ color: 'var(--primary)' }} />
            Préstamo Activo
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Monto Aprobado</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold' }}>${activeLoan.amount.toFixed(2)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Progreso de Cuotas</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{paidInstallments} de {totalInstallments}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Amortización</span>
                <span>{progress.toFixed(0)}% Completado</span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--surface-light)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: 'var(--primary)', width: `${progress}%`, borderRadius: '4px' }}></div>
              </div>
            </div>

            {nextUnpaid && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px', 
                backgroundColor: 'var(--surface-light)', 
                borderRadius: '12px' 
              }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Próxima Cuota (#{nextUnpaid.number})</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>${nextUnpaid.amount.toFixed(2)}</p>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setTab('payments')}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Pagar Cuota
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : pendingLoan ? (
        <div className="premium-card pulsing" style={{ padding: '30px', textAlign: 'center', borderStyle: 'dashed', marginBottom: '24px' }}>
          <Sparkles size={48} style={{ color: 'var(--warning)', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Solicitud en Evaluación</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            Tu solicitud de préstamo por <strong>${pendingLoan.amount.toFixed(2)}</strong> está siendo analizada por el administrador. Te notificaremos cuando se apruebe.
          </p>
        </div>
      ) : loans.some(l => l.status === 'rejected') ? (
        <div className="premium-card" style={{ padding: '30px', textAlign: 'center', marginBottom: '24px', border: '1px solid var(--danger)', backgroundColor: 'rgba(239,68,68,0.03)' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--danger)' }}>Solicitud Rechazada</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto', marginBottom: '20px' }}>
            Tu última solicitud de préstamo fue rechazada. Puedes solicitar un nuevo crédito cuando lo desees.
          </p>
          <button className="btn btn-primary" onClick={() => setTab('loans')}>
            Solicitar Nuevo Crédito
          </button>
        </div>
      ) : (
        <div className="premium-card" style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--primary)', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>¡Estás al día!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            No tienes préstamos activos pendientes en este momento.
          </p>
          <button className="btn btn-primary" onClick={() => setTab('loans')}>
            Solicitar Nuevo Crédito
          </button>
        </div>
      )}

      {/* AI Assitant Card Promo */}
      <div 
        className="premium-card" 
        onClick={() => setTab('chat')}
        style={{ 
          cursor: 'pointer', 
          background: 'linear-gradient(135deg, rgba(15,164,108,0.06) 0%, rgba(32,200,135,0.06) 100%)', 
          borderColor: 'rgba(15, 164, 108, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(15, 164, 108, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
          <MessageSquare size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '2px' }}>¿Necesitas ayuda con tus finanzas?</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Hazle preguntas a nuestro Asistente Financiero IA.</p>
        </div>
        <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
      </div>

    </div>
  );
}
