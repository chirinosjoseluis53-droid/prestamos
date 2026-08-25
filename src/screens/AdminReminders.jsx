import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { Bell, MessageSquare, Clock, Send, CheckCircle, AlertTriangle, PartyPopper, Settings, Phone, Mail } from 'lucide-react';

const TEMPLATES = [
  { id: 'payment_due', label: 'Pago Próximo', icon: <Clock size={16} />, color: '#2563EB',
    body: 'Hola {nombre}, te recordamos que tu cuota #{cuota} de ${monto} vence el {fecha}. Por favor realiza tu pago a tiempo. ¡Gracias!' },
  { id: 'overdue', label: 'Pago Vencido', icon: <AlertTriangle size={16} />, color: '#E74C3C',
    body: 'Hola {nombre}, tu cuota #{cuota} de ${monto} está vencida desde el {fecha}. Por favor regulariza tu situación lo antes posible.' },
  { id: 'congratulations', label: 'Felicidades', icon: <PartyPopper size={16} />, color: '#2ECC71',
    body: '¡Felicidades {nombre}! Has completado el pago de tu préstamo. Gracias por tu puntualidad. ¡Esperamos verte pronto de nuevo!' },
];

export default function AdminReminders({ setTab }) {
  const { currentUser } = useAuth();
  const { clients, loans, getKycProfile } = useData();

  const [selectedTemplate, setSelectedTemplate] = useState('payment_due');
  const [targetType, setTargetType] = useState('all');
  const [selectedClient, setSelectedClient] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDay, setScheduleDay] = useState('1');
  const [sendHistory, setSendHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(`@reminders_history_${currentUser?.id}`);
    if (saved) setSendHistory(JSON.parse(saved));
  }, [currentUser]);

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplate);

  const getTargetClients = () => {
    if (targetType === 'specific' && selectedClient) {
      return clients.filter(c => c.email === selectedClient);
    }
    if (targetType === 'overdue') {
      return clients.filter(c => {
        const cLoans = loans.filter(l => l.clientEmail === c.email && l.status === 'approved');
        return cLoans.some(l =>
          (l.installments || []).some(i => i.status !== 'paid' && new Date(i.due_date + 'T00:00:00') < new Date())
        );
      });
    }
    return clients;
  };

  const handleSendReminder = async () => {
    const targets = getTargetClients();
    if (targets.length === 0) {
      alert('No hay clientes objetivo para enviar recordatorios.');
      return;
    }

    const message = customMessage || activeTemplate?.body || '';
    let sent = 0;

    for (const client of targets) {
      const profile = getKycProfile(client.email);
      const name = profile?.fullName || profile?.full_name || client.nombre || client.email;
      const personalized = message
        .replace('{nombre}', name)
        .replace('{email}', client.email);

      await localdb.createNotification({
        target: 'client',
        user_id: client.id,
        title: `📢 ${activeTemplate?.label || 'Recordatorio'}`,
        body: personalized,
        data: { type: 'reminder', templateId: selectedTemplate },
      });
      sent++;
    }

    const historyEntry = {
      id: Date.now().toString(),
      template: activeTemplate?.label,
      targetType,
      sentCount: sent,
      message: message.slice(0, 100),
      sentAt: new Date().toISOString(),
    };
    const updated = [historyEntry, ...sendHistory];
    setSendHistory(updated);
    localStorage.setItem(`@reminders_history_${currentUser?.id}`, JSON.stringify(updated));

    alert(`✅ Recordatorios enviados a ${sent} cliente(s).`);
    setCustomMessage('');
  };

  const handleSaveSchedule = () => {
    const schedule = {
      enabled: scheduleEnabled,
      dayOfMonth: scheduleDay,
      templateId: selectedTemplate,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`@reminders_schedule_${currentUser?.id}`, JSON.stringify(schedule));
    alert('✅ Configuración de recordatorios programados guardada.');
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={22} style={{ color: 'var(--primary)' }} />
          Recordatorios Automatizados
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
          Configura y envía recordatorios de pago a tus clientes
        </p>
      </div>

      <div className="grid-2col" style={{ gap: '24px', alignItems: 'start' }}>
        {/* Left: Templates & Compose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Templates */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} style={{ color: 'var(--primary)' }} /> Plantillas de Mensaje
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px',
                    border: selectedTemplate === t.id ? `2px solid ${t.color}` : '1px solid var(--border)',
                    backgroundColor: selectedTemplate === t.id ? `${t.color}10` : 'var(--surface-light)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ color: t.color }}>{t.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{t.body.slice(0, 80)}...</div>
                  </div>
                  {selectedTemplate === t.id && <CheckCircle size={16} style={{ color: t.color }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Compose & Target */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={16} style={{ color: 'var(--primary)' }} /> Enviar Recordatorio
            </h3>

            <div className="form-group">
              <label className="form-label">Enviar a</label>
              <select className="form-control" value={targetType} onChange={e => setTargetType(e.target.value)}>
                <option value="all">Todos los clientes ({clients.length})</option>
                <option value="overdue">Clientes con pagos vencidos</option>
                <option value="specific">Cliente específico</option>
              </select>
            </div>

            {targetType === 'specific' && (
              <div className="form-group">
                <label className="form-label">Seleccionar Cliente</label>
                <select className="form-control" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                  <option value="">-- Seleccionar --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.email}>{c.nombre || c.email}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Mensaje personalizado (opcional)</label>
              <textarea
                className="form-control"
                rows={4}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder={activeTemplate?.body}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Variables: {'{nombre}'}, {'{email}'}, {'{cuota}'}, {'{monto}'}, {'{fecha}'}
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleSendReminder} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Send size={16} /> Enviar a {getTargetClients().length} cliente(s)
            </button>
          </div>
        </div>

        {/* Right: Schedule & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Schedule */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--primary)' }} /> Programar Envío Recurrente
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Activar programación</span>
              <div
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                style={{
                  width: '46px', height: '24px', borderRadius: '12px', backgroundColor: scheduleEnabled ? 'var(--primary)' : 'var(--border)',
                  padding: '2px', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute',
                  left: scheduleEnabled ? '24px' : '2px', transition: 'left 0.2s',
                }} />
              </div>
            </div>

            {scheduleEnabled && (
              <>
                <div className="form-group">
                  <label className="form-label">Día del mes para enviar</label>
                  <select className="form-control" value={scheduleDay} onChange={e => setScheduleDay(e.target.value)}>
                    {Array.from({ length: 28 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>Día {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Plantilla a usar</label>
                  <select className="form-control" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                    {TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleSaveSchedule} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Settings size={16} /> Guardar Programación
                </button>
              </>
            )}
          </div>

          {/* Send History */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={16} style={{ color: 'var(--primary)' }} /> Historial de Envíos
            </h3>
            {sendHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No hay envíos registrados aún.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {sendHistory.map(h => (
                  <div key={h.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{h.template}</span>
                      <span className="badge badge-approved">{h.sentCount} enviados</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {new Date(h.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '6px' }}>{h.message}...</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
