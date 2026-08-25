import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Globe, Save, CheckCheck, ArrowLeft, RefreshCw, Eye, EyeOff, Settings } from 'lucide-react';

const STORAGE_KEY = '@admin_multi_currency';
const FLAG_MAP = { USD: 'us', EUR: 'eu', COP: 'co', VES: 've', MXN: 'mx' };
const SYMBOL_MAP = { USD: '$', EUR: '\u20AC', COP: '$', VES: 'Bs', MXN: '$' };

const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'Dólar Americano', enabled: true, symbol: '$', margin: '0' },
  { code: 'EUR', name: 'Euro', enabled: false, symbol: '\u20AC', margin: '0' },
  { code: 'COP', name: 'Peso Colombiano', enabled: false, symbol: '$', margin: '0' },
  { code: 'VES', name: 'Bolívar Venezolano', enabled: false, symbol: 'Bs', margin: '0' },
  { code: 'MXN', name: 'Peso Mexicano', enabled: false, symbol: '$', margin: '0' },
];

const DEFAULT_SETTINGS = {
  defaultCurrency: 'USD',
  showOriginalCurrency: true,
  roundDecimals: 2,
  currencies: DEFAULT_CURRENCIES,
};

function Toggle({ enabled, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative',
        transition: 'background 0.3s', backgroundColor: enabled ? 'var(--primary)' : 'var(--border)',
        flexShrink: 0,
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

export default function MultiCurrencySettings({ setTab }) {
  const { currentUser } = useAuth();
  const storageKey = `${STORAGE_KEY}_${currentUser?.id || 'default'}`;

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [rates, setRates] = useState({});
  const [loadingRates, setLoadingRates] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, currencies: parsed.currencies || DEFAULT_CURRENCIES });
      } catch (e) { /* use defaults */ }
    }
  }, [storageKey]);

  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      setRates(data?.rates || {});
    } catch (e) { /* silent */ }
    setLoadingRates(false);
  };

  useEffect(() => { fetchRates(); }, []);

  const updateCurrency = (code, field, value) => {
    setSettings(prev => ({
      ...prev,
      currencies: prev.currencies.map(c => c.code === code ? { ...c, [field]: value } : c),
    }));
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="top-bar-btn" onClick={() => setTab('dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Globe size={22} style={{ color: 'var(--primary)' }} />
              Configuración Multi-Moneda
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Administra las monedas soportadas y preferencias de visualización
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {saved ? <><CheckCheck size={16} /> Guardado!</> : <><Save size={16} /> Guardar Configuración</>}
        </button>
      </div>

      {/* General Settings */}
      <div className="premium-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} style={{ color: 'var(--primary)' }} /> Preferencias Generales
        </h3>
        <div className="grid-2col" style={{ gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Moneda Predeterminada</label>
            <select
              className="form-control"
              value={settings.defaultCurrency}
              onChange={e => setSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
            >
              {settings.currencies.filter(c => c.enabled).map(c => (
                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Decimales para Redondeo</label>
            <select
              className="form-control"
              value={settings.roundDecimals}
              onChange={e => setSettings(prev => ({ ...prev, roundDecimals: parseInt(e.target.value) }))}
            >
              <option value={0}>0 decimales</option>
              <option value={2}>2 decimales</option>
              <option value={4}>4 decimales</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-light)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {settings.showOriginalCurrency ? <Eye size={16} style={{ color: 'var(--primary)' }} /> : <EyeOff size={16} style={{ color: 'var(--text-secondary)' }} />}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Mostrar moneda original</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Exhibe el símbolo de moneda junto al monto</div>
            </div>
          </div>
          <Toggle enabled={settings.showOriginalCurrency} onToggle={() => setSettings(prev => ({ ...prev, showOriginalCurrency: !prev.showOriginalCurrency }))} />
        </div>
      </div>

      {/* Currency List */}
      <div className="premium-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} style={{ color: 'var(--primary)' }} /> Monedas Soportadas
          </h3>
          <button className="btn btn-secondary" onClick={fetchRates} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <RefreshCw size={14} style={{ animation: loadingRates ? 'spin 1s linear infinite' : 'none' }} />
            {loadingRates ? 'Actualizando...' : 'Actualizar Tasas'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {settings.currencies.map(currency => (
            <div
              key={currency.code}
              className="premium-card"
              style={{
                padding: '16px 20px',
                borderColor: currency.enabled ? 'var(--primary)' : 'var(--border)',
                transition: 'border-color 0.3s',
                opacity: currency.enabled ? 1 : 0.7,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: currency.enabled ? '16px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img
                    src={`https://flagcdn.com/w40/${FLAG_MAP[currency.code] || 'un'}.png`}
                    alt={currency.code}
                    style={{ width: '36px', height: '26px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border)' }}
                  />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>
                      {currency.code} <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>— {currency.name}</span>
                    </div>
                    {rates[currency.code] && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        1 USD = {rates[currency.code].toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {currency.code}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{currency.enabled ? 'Activo' : 'Inactivo'}</span>
                  <Toggle enabled={currency.enabled} onToggle={() => updateCurrency(currency.code, 'enabled', !currency.enabled)} />
                </div>
              </div>

              {currency.enabled && (
                <div className="grid-2col" style={{ gap: '12px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Símbolo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={currency.symbol}
                      onChange={e => updateCurrency(currency.code, 'symbol', e.target.value)}
                      style={{ width: '80px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Margen de Tasa (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={currency.margin}
                      onChange={e => updateCurrency(currency.code, 'margin', e.target.value)}
                      placeholder="0"
                      step="0.1"
                    />
                  </div>
                </div>
              )}

              {currency.code === settings.defaultCurrency && currency.enabled && (
                <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '99px', backgroundColor: 'rgba(var(--primary-rgb, 37,99,235), 0.1)', fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>
                  ★ Moneda Predeterminada
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
