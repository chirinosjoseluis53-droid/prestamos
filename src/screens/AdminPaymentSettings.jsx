import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Zap, Smartphone, Landmark, MessageSquare, Save, CheckCheck } from 'lucide-react';

function Field({ section, field, label, placeholder, type = 'text', form, update }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}</label>
      <input
        type={type}
        className="form-control"
        placeholder={placeholder}
        value={form[section]?.[field] || ''}
        onChange={e => update(section, field, e.target.value)}
      />
    </div>
  );
}

function SectionCard({ title, icon, enabled, onToggle, children }) {
  return (
    <div className="premium-card" style={{ marginBottom: '20px', borderColor: enabled ? 'var(--primary)' : 'var(--border)', transition: 'border-color 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {icon} {title}
        </h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{enabled ? 'Activo' : 'Inactivo'}</span>
          <div
            onClick={onToggle}
            style={{
              width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
              backgroundColor: enabled ? 'var(--primary)' : 'var(--border)',
            }}
          >
            <div style={{
              position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.3s',
              left: enabled ? '23px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
        </label>
      </div>
      {enabled && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '14px' }}>{children}</div>}
    </div>
  );
}

export default function AdminPaymentSettings() {
  const { paymentSettings, savePaymentSettings } = useData();

  const [form, setForm] = useState({
    zelle: { enabled: false, email: '', phone: '', holderName: '' },
    pagoMovil: { enabled: false, bank: '', phone: '', rif: '' },
    transfer: { enabled: false, bank: '', account: '', owner: '' },
    whatsapp: { enabled: false, accessToken: '', phoneNumberId: '' },
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (paymentSettings) {
      setForm(prev => ({
        zelle: { ...prev.zelle, ...paymentSettings.zelle },
        pagoMovil: { ...prev.pagoMovil, ...paymentSettings.pagoMovil },
        transfer: { ...prev.transfer, ...paymentSettings.transfer },
        whatsapp: { ...prev.whatsapp, ...paymentSettings.whatsapp },
      }));
    }
  }, [paymentSettings]);

  const update = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const toggleSection = (section) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], enabled: !prev[section].enabled }
    }));
  };

  const handleSave = async () => {
    await savePaymentSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Configuración de Métodos de Cobro</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Configura las cuentas donde tus clientes realizarán los pagos. Solo se mostrarán las opciones que actives.
        </p>
      </div>

      <SectionCard
        title="Zelle"
        icon={<Zap size={18} style={{ color: '#6C3FE8' }} />}
        enabled={form.zelle.enabled}
        onToggle={() => toggleSection('zelle')}
      >
        <Field section="zelle" field="email" label="Correo Zelle" placeholder="pagos@correo.com" form={form} update={update} />
        <Field section="zelle" field="holderName" label="Nombre del Titular" placeholder="Juan Pérez" form={form} update={update} />
        <Field section="zelle" field="phone" label="Teléfono (opcional)" placeholder="+1 305 555-0000" form={form} update={update} />
      </SectionCard>

      <SectionCard
        title="Pago Móvil"
        icon={<Smartphone size={18} style={{ color: 'var(--primary)' }} />}
        enabled={form.pagoMovil.enabled}
        onToggle={() => toggleSection('pagoMovil')}
      >
        <Field section="pagoMovil" field="bank" label="Banco" placeholder="Banesco" form={form} update={update} />
        <Field section="pagoMovil" field="phone" label="Teléfono" placeholder="0414-1234567" form={form} update={update} />
        <Field section="pagoMovil" field="rif" label="RIF / Cédula" placeholder="V-12345678" form={form} update={update} />
      </SectionCard>

      <SectionCard
        title="Transferencia Bancaria"
        icon={<Landmark size={18} style={{ color: 'var(--admin-accent)' }} />}
        enabled={form.transfer.enabled}
        onToggle={() => toggleSection('transfer')}
      >
        <Field section="transfer" field="bank" label="Banco" placeholder="Venezuela" form={form} update={update} />
        <Field section="transfer" field="account" label="Número de Cuenta" placeholder="0102-0000-00-0000000000" form={form} update={update} />
        <Field section="transfer" field="owner" label="Titular de la Cuenta" placeholder="Juan Pérez" form={form} update={update} />
      </SectionCard>

      <SectionCard
        title="WhatsApp Business API (Recordatorios)"
        icon={<MessageSquare size={18} style={{ color: '#25D366' }} />}
        enabled={form.whatsapp.enabled}
        onToggle={() => toggleSection('whatsapp')}
      >
        <Field section="whatsapp" field="phoneNumberId" label="Phone Number ID" placeholder="1234567890" form={form} update={update} />
        <Field section="whatsapp" field="accessToken" label="Access Token" placeholder="EAAxxxxxxx..." type="password" form={form} update={update} />
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '200px' }}>
          {saved ? <><CheckCheck size={16} /> Guardado!</> : <><Save size={16} /> Guardar Configuración</>}
        </button>
      </div>
    </div>
  );
}
