import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Clock, Save, CheckCheck, ArrowLeft, Calendar, ToggleLeft, ToggleRight, User, AlertCircle } from 'lucide-react';

const STORAGE_KEY = '@admin_grace_period';

const DEFAULT_SETTINGS = {
  enabled: false,
  defaultDays: 0,
  defaultMonths: 0,
  interestDuringGrace: 'free',
  reducedRatePercent: '0',
  maxGraceMonths: 3,
  perLoanOverride: true,
};

function Toggle({ enabled, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative',
        transition: 'background 0.3s', backgroundColor: enabled ? 'var(--primary)' : 'var(--border)', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%',
        backgroundColor: 'white', transition: 'left 0.3s', left: enabled ? '23px' : '3px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

function CalendarViz({ graceMonths, totalMonths, startDate }) {
  const start = startDate ? new Date(startDate + 'T00:00:00') : new Date();
  const months = [];
  for (let i = 0; i < Math.max(totalMonths + graceMonths, 6); i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const isGrace = i < graceMonths;
    months.push({
      label: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      isGrace,
      isFirstPayment: i === graceMonths,
    });
  }

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px' }}>
      {months.map((m, i) => (
        <div
          key={i}
          style={{
            padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', textAlign: 'center',
            minWidth: '60px',
            backgroundColor: m.isGrace
              ? 'rgba(245,158,11,0.12)'
              : m.isFirstPayment
                ? 'rgba(37,99,235,0.15)'
                : 'var(--surface-light)',
            color: m.isGrace
              ? '#F59E0B'
              : m.isFirstPayment
                ? '#3B82F6'
                : 'var(--text-secondary)',
            border: m.isFirstPayment ? '2px solid #3B82F6' : '1px solid var(--border)',
          }}
        >
          {m.isGrace && <Clock size={10} style={{ display: 'block', margin: '0 auto 2px auto' }} />}
          {m.label}
          {m.isGrace && <div style={{ fontSize: '9px', marginTop: '2px' }}>Gracia</div>}
          {m.isFirstPayment && <div style={{ fontSize: '9px', marginTop: '2px' }}>1er Pago</div>}
        </div>
      ))}
    </div>
  );
}

export default function GracePeriod({ setTab }) {
  const { currentUser } = useAuth();
  const { clients, loans } = useData();
  const storageKey = `${STORAGE_KEY}_${currentUser?.id || 'default'}`;

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [perLoanGraces, setPerLoanGraces] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch (e) { /* defaults */ }
    }
    const perLoanRaw = localStorage.getItem(`${storageKey}_per_loan`);
    if (perLoanRaw) {
      try { setPerLoanGraces(JSON.parse(perLoanRaw)); } catch (e) { /* defaults */ }
    }
  }, [storageKey]);

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    localStorage.setItem(`${storageKey}_per_loan`, JSON.stringify(perLoanGraces));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateSetting = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handlePerLoanGrace = (loanId, months) => {
    setPerLoanGraces(prev => ({ ...prev, [loanId]: parseInt(months) || 0 }));
  };

  const approvedLoans = loans.filter(l => l.status === 'approved');
  const clientLoans = selectedClient
    ? approvedLoans.filter(l => l.clientEmail === selectedClient.email)
    : [];

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="top-bar-btn" onClick={() => setTab('dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={22} style={{ color: 'var(--primary)' }} />
              Período de Gracia
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Configura períodos de gracia antes del primer pago de cuotas
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {saved ? <><CheckCheck size={16} /> Guardado!</> : <><Save size={16} /> Guardar Configuración</>}
        </button>
      </div>

      {/* Master Toggle */}
      <div className="premium-card" style={{ marginBottom: '20px', borderColor: settings.enabled ? 'var(--primary)' : 'var(--border)', transition: 'border-color 0.3s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: settings.enabled ? '20px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {settings.enabled
              ? <ToggleRight size={22} style={{ color: 'var(--primary)' }} />
              : <ToggleLeft size={22} style={{ color: 'var(--text-secondary)' }} />}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Períodos de Gracia</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Permitir tiempo de gracia antes del primer pago</p>
            </div>
          </div>
          <Toggle enabled={settings.enabled} onToggle={() => updateSetting('enabled', !settings.enabled)} />
        </div>

        {settings.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
            <div className="grid-2col" style={{ gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Meses de Gracia por Defecto</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.defaultMonths}
                  onChange={e => updateSetting('defaultMonths', parseInt(e.target.value) || 0)}
                  min="0"
                  max="12"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Máximo Meses de Gracia</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.maxGraceMonths}
                  onChange={e => updateSetting('maxGraceMonths', parseInt(e.target.value) || 0)}
                  min="0"
                  max="24"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Interés Durante Período de Gracia</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className={`btn ${settings.interestDuringGrace === 'free' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => updateSetting('interestDuringGrace', 'free')}
                >
                  Sin Interés (Gratuito)
                </button>
                <button
                  className={`btn ${settings.interestDuringGrace === 'reduced' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => updateSetting('interestDuringGrace', 'reduced')}
                >
                  Interés Reducido
                </button>
              </div>
            </div>

            {settings.interestDuringGrace === 'reduced' && (
              <div className="form-group" style={{ marginBottom: 0, maxWidth: '300px' }}>
                <label className="form-label">Tasa Reducida Durante Gracia (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings.reducedRatePercent}
                  onChange={e => updateSetting('reducedRatePercent', e.target.value)}
                  step="0.5"
                  placeholder="0"
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-light)', borderRadius: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Permitir gracia por préstamo</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Configurar gracia individual al aprobar cada préstamo</div>
              </div>
              <Toggle enabled={settings.perLoanOverride} onToggle={() => updateSetting('perLoanOverride', !settings.perLoanOverride)} />
            </div>
          </div>
        )}
      </div>

      {/* Calendar Visualization */}
      {settings.enabled && (
        <div className="premium-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} /> Visualización de Calendario
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Ejemplo con {settings.defaultMonths} meses de gracia y 6 meses de préstamo
          </p>
          <CalendarViz graceMonths={settings.defaultMonths} totalMonths={6} startDate={new Date().toISOString().split('T')[0]} />
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(245,158,11,0.2)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Período de Gracia</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.2)', border: '1px solid #3B82F6' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Primer Pago</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Cuota Regular</span>
            </div>
          </div>
        </div>
      )}

      {/* Per-Loan Grace Period */}
      {settings.enabled && settings.perLoanOverride && (
        <div className="premium-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} style={{ color: 'var(--primary)' }} /> Gracia por Préstamo Individual
          </h3>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Seleccionar Cliente</label>
            <select
              className="form-control"
              value={selectedClient?.email || ''}
              onChange={e => {
                const c = clients.find(cl => cl.email === e.target.value);
                setSelectedClient(c || null);
              }}
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.email}>{c.nombre || c.email}</option>
              ))}
            </select>
          </div>

          {clientLoans.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {clientLoans.map(loan => (
                <div key={loan.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>Préstamo #{loan.id.slice(-6)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      ${loan.amount.toFixed(2)} — {loan.installments?.length || 0} cuotas
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Gracia:</label>
                    <select
                      className="form-control"
                      value={perLoanGraces[loan.id] || settings.defaultMonths}
                      onChange={e => handlePerLoanGrace(loan.id, e.target.value)}
                      style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }}
                    >
                      {Array.from({ length: settings.maxGraceMonths + 1 }, (_, i) => (
                        <option key={i} value={i}>{i} mes(es)</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {selectedClient ? 'Este cliente no tiene préstamos aprobados.' : 'Selecciona un cliente para ver sus préstamos.'}
            </div>
          )}
        </div>
      )}

      {/* Client Info Card */}
      {settings.enabled && selectedClient && clientLoans.length > 0 && (
        <div className="premium-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} style={{ color: 'var(--primary)' }} /> Estado de Gracia del Cliente
          </h3>
          <div className="grid-2col" style={{ gap: '14px' }}>
            <div style={{ padding: '14px', backgroundColor: 'var(--surface-light)', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px' }}>Cliente</div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>{selectedClient.nombre || selectedClient.email}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedClient.email}</div>
            </div>
            <div style={{ padding: '14px', backgroundColor: 'var(--surface-light)', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px' }}>Configuración de Gracia</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>{settings.defaultMonths} meses</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Interés: {settings.interestDuringGrace === 'free' ? 'Sin interés' : `${settings.reducedRatePercent}% reducido`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
