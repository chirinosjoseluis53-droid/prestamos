import React from 'react';
import { useData } from '../context/DataContext';
import { Award, ArrowLeft, CheckCircle2, Lock, Star } from 'lucide-react';

const LEVELS = [
  { min: 0, max: 24, label: 'Bronce', icon: '🥉', gradient: 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)', color: '#CD7F32', shadowColor: 'rgba(205,127,50,0.35)' },
  { min: 25, max: 54, label: 'Plata', icon: '🥈', gradient: 'linear-gradient(135deg, #A8A9AD 0%, #7B7D80 100%)', color: '#A8A9AD', shadowColor: 'rgba(168,169,173,0.35)' },
  { min: 55, max: 84, label: 'Oro', icon: '🥇', gradient: 'linear-gradient(135deg, #FFD700 0%, #DAA520 100%)', color: '#FFD700', shadowColor: 'rgba(255,215,0,0.35)' },
  { min: 85, max: 100, label: 'Diamante', icon: '💎', gradient: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)', color: '#00D4FF', shadowColor: 'rgba(0,212,255,0.35)' },
];

function evaluateLoyalty(loans) {
  if (!loans || loans.length === 0) return { score: 0, tier: 'Bronce', nextTier: 'Plata', progress: 0, color: '#CD7F32' };
  const paidLoans = loans.filter(l => l.status === 'approved' && l.installments?.every(i => i.status === 'paid'));
  let score = Math.min(100, paidLoans.length * 20);
  let tier = 'Bronce', nextTier = 'Plata', color = '#CD7F32';
  if (score >= 85) { tier = 'Diamante'; nextTier = 'Diamante'; color = '#00D4FF'; }
  else if (score >= 55) { tier = 'Oro'; nextTier = 'Diamante'; color = '#FFD700'; }
  else if (score >= 25) { tier = 'Plata'; nextTier = 'Oro'; color = '#A8A9AD'; }
  return { score, tier, nextTier, progress: score, color };
}

export default function ClientScore({ setTab }) {
  const { loans } = useData();
  const loyalty = evaluateLoyalty(loans);
  const currentIdx = LEVELS.findIndex(l => l.label === loyalty.tier);
  const currentLvl = LEVELS[currentIdx] || LEVELS[0];

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>

      {/* Header Card - Dynamic level color */}
      <div className="loyalty-card" style={{ marginBottom: '28px', background: currentLvl.gradient, boxShadow: `0 8px 24px ${currentLvl.shadowColor}` }}>
        <div className="loyalty-header">
          <div>
            <div style={{ fontSize: '13px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, letterSpacing: '1px' }}>
              Rendimiento Crediticio
            </div>
            <div className="loyalty-score">{loyalty.score} Puntos</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px', lineHeight: 1 }}>{currentLvl.icon}</span>
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

      {/* Title */}
      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Award size={18} style={{ color: 'var(--primary)' }} /> Niveles de Rendimiento
      </h3>

      {/* Levels - 4 compact cards side by side */}
      <div className="grid-4col" style={{ gap: '12px' }}>
        {LEVELS.map((lvl, i) => {
          const isCurrent = i === currentIdx;
          const isAchieved = i < currentIdx;
          const isLocked = i > currentIdx;

          // Progress within this level
          let lvlProgress = 0;
          if (isAchieved) lvlProgress = 100;
          else if (isCurrent) {
            const range = lvl.max - lvl.min;
            lvlProgress = range > 0 ? Math.round(((loyalty.score - lvl.min) / range) * 100) : 0;
          }

          return (
            <div
              key={lvl.label}
              style={{
                background: isLocked ? 'var(--surface-light)' : lvl.gradient,
                color: isLocked ? 'var(--text-secondary)' : 'white',
                borderRadius: '16px',
                padding: '20px 12px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                border: isCurrent ? '2px solid rgba(255,255,255,0.6)' : isLocked ? '1px solid var(--border)' : '1px solid transparent',
                opacity: isLocked ? 0.5 : 1,
                boxShadow: isCurrent ? `0 6px 20px ${lvl.shadowColor}` : isAchieved ? `0 4px 12px ${lvl.shadowColor}` : 'none',
                transform: isCurrent ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Decorative bg icon */}
              <Award
                size={50}
                style={{
                  position: 'absolute',
                  right: '-8px',
                  bottom: '-8px',
                  opacity: isLocked ? 0.04 : 0.12,
                  transform: 'rotate(-15deg)',
                  pointerEvents: 'none',
                  color: isLocked ? 'var(--text-secondary)' : 'white',
                }}
              />

              {/* Icon */}
              <div style={{ fontSize: '36px', marginBottom: '8px', lineHeight: 1 }}>{lvl.icon}</div>

              {/* Name */}
              <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '4px', fontFamily: "'Outfit', sans-serif" }}>{lvl.label}</div>

              {/* Points range */}
              <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '10px' }}>{lvl.min}–{lvl.max} pts</div>

              {/* Mini progress bar */}
              <div style={{
                height: '4px',
                background: isLocked ? 'var(--border)' : 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '8px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${lvlProgress}%`,
                  background: isLocked ? 'var(--text-secondary)' : 'white',
                  borderRadius: '2px',
                  transition: 'width 0.5s ease',
                }} />
              </div>

              {/* Status badge */}
              <div style={{
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '3px 8px',
                borderRadius: '99px',
                background: isLocked ? 'var(--border)' : 'rgba(255,255,255,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}>
                {isLocked && <Lock size={9} />}
                {isAchieved && <CheckCircle2 size={9} />}
                {isCurrent && <Star size={9} />}
                {isLocked ? 'Bloqueado' : isAchieved ? 'Completado' : 'Actual'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
