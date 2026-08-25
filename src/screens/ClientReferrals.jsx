import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Share2, Copy, Check, Gift, Users, Award, Mail, MessageCircle, ExternalLink } from 'lucide-react';

const REFERRAL_KEY = '@prestamos_referrals';

function generateReferralCode(email) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  }
  return (base.slice(0, 4) + Math.abs(hash).toString(36).toUpperCase().slice(0, 4)).slice(0, 8);
}

export default function ClientReferrals() {
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = useMemo(() => generateReferralCode(currentUser?.email || ''), [currentUser]);
  const referralLink = useMemo(() => `${window.location.origin}/register?ref=${referralCode}`, [referralCode]);

  const [referralData, setReferralData] = useState(() => {
    const key = `${REFERRAL_KEY}_${currentUser?.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch { return { referrals: [], rewards: 0 }; }
    }
    return { referrals: [], rewards: 0 };
  });

  const saveReferralData = (data) => {
    const key = `${REFERRAL_KEY}_${currentUser?.id}`;
    localStorage.setItem(key, JSON.stringify(data));
    setReferralData(data);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`¡Únete a PrestamosApp con mi código de referido! 🎉\n\nCódigo: ${referralCode}\n\nUsa este enlace para registrarte:\n${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent('Te invito a PrestamosApp');
    const body = encodeURIComponent(`Hola,\n\nTe invito a unirte a PrestamosApp usando mi código de referido: ${referralCode}\n\nRegístrate aquí: ${referralLink}\n\n¡Espero que te sea útil!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Programa de Referidos</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Invita amigos y gana recompensas</p>
      </div>

      {/* Referral Code Card */}
      <div className="premium-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(16,185,129,0.06) 100%)', borderColor: 'rgba(37, 99, 235, 0.2)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary)' }}>
          <Gift size={28} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Tu Código de Referido</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Comparte este código con tus amigos</p>

        <div onClick={handleCopyCode} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--surface)', border: '2px dashed var(--primary)', padding: '14px 28px', borderRadius: '14px', cursor: 'pointer', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '3px' }}>{referralCode}</span>
          {copied ? <Check size={20} style={{ color: '#10B981' }} /> : <Copy size={20} style={{ color: 'var(--text-secondary)' }} />}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleShareWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}>
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button className="btn btn-secondary" onClick={handleShareEmail} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}>
            <Mail size={16} /> Email
          </button>
          <button className="btn btn-secondary" onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}>
            <ExternalLink size={16} /> Copiar Enlace
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3col-stats" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Referidos Hechos', value: referralData.referrals.length, icon: <Users size={20} />, color: 'var(--primary)' },
          { label: 'Recompensas Ganadas', value: `$${referralData.rewards.toFixed(2)}`, icon: <Award size={20} />, color: '#10B981' },
          { label: 'Nivel Actual', value: referralData.referrals.length >= 10 ? 'Oro' : referralData.referrals.length >= 5 ? 'Plata' : 'Bronce', icon: <Gift size={20} />, color: '#F59E0B' },
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

      {/* Referred Users List */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--primary)' }} /> Usuarios Referidos
        </h3>

        {referralData.referrals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Aún no has referido a nadie. ¡Comparte tu código!
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {referralData.referrals.map((ref, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold' }}>{idx + 1}</td>
                    <td>{ref.name || 'N/A'}</td>
                    <td style={{ fontSize: '12px' }}>{ref.email}</td>
                    <td style={{ fontSize: '12px' }}>{new Date(ref.date).toLocaleDateString('es-ES')}</td>
                    <td>
                      <span className={`badge ${ref.active ? 'badge-approved' : 'badge-pending'}`}>
                        {ref.active ? 'Activo' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
