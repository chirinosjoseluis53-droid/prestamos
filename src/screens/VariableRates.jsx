import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Percent, Save, CheckCheck, ArrowLeft, TrendingUp, Edit2, X, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = '@admin_variable_rates';

const CREDIT_TIERS = [
  { key: 'excellent', label: 'Excelente', range: '1-5%', color: '#10B981', description: 'Score 85-100' },
  { key: 'good', label: 'Bueno', range: '5-10%', color: '#3B82F6', description: 'Score 70-84' },
  { key: 'regular', label: 'Regular', range: '10-15%', color: '#F59E0B', description: 'Score 50-69' },
  { key: 'highRisk', label: 'Alto Riesgo', range: '15-25%', color: '#EF4444', description: 'Score 0-49' },
];

const AMOUNT_TIERS = [
  { key: 'micro', label: 'Micro', range: '$0 - $500' },
  { key: 'small', label: 'Pequeño', range: '$500 - $2,000' },
  { key: 'medium', label: 'Mediano', range: '$2,000 - $10,000' },
  { key: 'large', label: 'Grande', range: '$10,000+' },
];

const CATEGORIES = ['Consumo', 'Negocio', 'Salud', 'Educación', 'Vivienda', 'Vehículo', 'Emergencia'];

function getDefaultRates() {
  const rates = {};
  CREDIT_TIERS.forEach(tier => {
    rates[tier.key] = {};
    CATEGORIES.forEach(cat => {
      rates[tier.key][cat] = {};
      AMOUNT_TIERS.forEach(amt => {
        rates[tier.key][cat][amt.key] = '';
      });
    });
  });
  return rates;
}

export default function VariableRates({ setTab }) {
  const { currentUser } = useAuth();
  const storageKey = `${STORAGE_KEY}_${currentUser?.id || 'default'}`;

  const [rates, setRates] = useState(getDefaultRates);
  const [saved, setSaved] = useState(false);
  const [selectedTier, setSelectedTier] = useState('excellent');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setRates({ ...getDefaultRates(), ...parsed });
      } catch (e) { /* use defaults */ }
    }
  }, [storageKey]);

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(rates));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const startEdit = (tierKey, cat, amtKey) => {
    setEditingCell(`${tierKey}-${cat}-${amtKey}`);
    setEditValue(rates[tierKey]?.[cat]?.[amtKey] || '');
  };

  const saveEdit = (tierKey, cat, amtKey) => {
    setRates(prev => ({
      ...prev,
      [tierKey]: {
        ...prev[tierKey],
        [cat]: {
          ...(prev[tierKey]?.[cat] || {}),
          [amtKey]: editValue,
        },
      },
    }));
    setEditingCell(null);
    setEditValue('');
  };

  const currentTier = CREDIT_TIERS.find(t => t.key === selectedTier);

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="top-bar-btn" onClick={() => setTab('dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={22} style={{ color: 'var(--primary)' }} />
              Tasas de Interés Variables
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Configura tasas según perfil crediticio, categoría y monto del préstamo
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {saved ? <><CheckCheck size={16} /> Guardado!</> : <><Save size={16} /> Guardar Tasas</>}
        </button>
      </div>

      {/* Credit Score Tiers Visual Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '14px', marginBottom: '28px' }}>
        {CREDIT_TIERS.map(tier => (
          <div
            key={tier.key}
            onClick={() => setSelectedTier(tier.key)}
            className="premium-card"
            style={{
              padding: '18px', cursor: 'pointer', transition: 'all 0.2s',
              border: selectedTier === tier.key ? `2px solid ${tier.color}` : '2px solid var(--border)',
              backgroundColor: selectedTier === tier.key ? `${tier.color}10` : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: tier.color }} />
              <span style={{ fontSize: '14px', fontWeight: '700' }}>{tier.label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: tier.color }}>{tier.range}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{tier.description}</div>
          </div>
        ))}
      </div>

      {/* Rate Matrix */}
      <div className="premium-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Percent size={18} style={{ color: currentTier?.color }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
            Matriz de Tasas — Tier: <span style={{ color: currentTier?.color }}>{currentTier?.label}</span>
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: '10px', marginBottom: '16px' }}>
          <AlertTriangle size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Ingresa el porcentaje de tasa de interés para cada combinación de categoría y monto. Los campos vacíos se ignorarán.
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ minWidth: '140px' }}>Categoría / Monto</th>
                {AMOUNT_TIERS.map(amt => (
                  <th key={amt.key} style={{ textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{amt.label}</div>
                    <div style={{ fontSize: '10px', fontWeight: '400', color: 'var(--text-secondary)' }}>{amt.range}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(cat => (
                <tr key={cat}>
                  <td style={{ fontWeight: '600', fontSize: '13px' }}>{cat}</td>
                  {AMOUNT_TIERS.map(amt => {
                    const cellKey = `${selectedTier}-${cat}-${amt.key}`;
                    const isEditing = editingCell === cellKey;
                    const value = rates[selectedTier]?.[cat]?.[amt.key] || '';

                    return (
                      <td key={amt.key} style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              className="form-control"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(selectedTier, cat, amt.key); if (e.key === 'Escape') setEditingCell(null); }}
                              autoFocus
                              step="0.5"
                              style={{ width: '70px', textAlign: 'center', padding: '4px 6px', fontSize: '13px' }}
                            />
                            <button onClick={() => saveEdit(selectedTier, cat, amt.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '2px' }}>
                              <CheckCheck size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startEdit(selectedTier, cat, amt.key)}
                            style={{
                              padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s',
                              backgroundColor: value ? 'rgba(var(--primary-rgb, 37,99,235), 0.08)' : 'var(--surface-light)',
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              border: value ? `1px solid ${currentTier?.color}40` : '1px solid transparent',
                              minWidth: '60px', justifyContent: 'center',
                            }}
                          >
                            {value ? (
                              <span style={{ fontSize: '14px', fontWeight: '700', color: currentTier?.color }}>{value}%</span>
                            ) : (
                              <Edit2 size={12} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Rate Card Summary */}
      <div className="premium-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} style={{ color: currentTier?.color }} /> Resumen Visual — {currentTier?.label}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: '12px' }}>
          {CATEGORIES.map(cat => {
            const entries = AMOUNT_TIERS.map(amt => ({
              ...amt,
              rate: rates[selectedTier]?.[cat]?.[amt.key] || '',
            })).filter(e => e.rate);
            if (entries.length === 0) return null;
            return (
              <div key={cat} style={{ padding: '14px', backgroundColor: 'var(--surface-light)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>{cat}</div>
                {entries.map(e => (
                  <div key={e.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{e.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: currentTier?.color }}>{e.rate}%</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
