import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { Bell, Send, Users, AlertTriangle, CheckCircle, Clock, Eye, Trash2 } from 'lucide-react';

export default function AdminBulkNotifications({ setTab }) {
  const { currentUser } = useAuth();
  const { clients, loans, getKycProfile } = useData();

  const [target, setTarget] = useState('all');
  const [selectedClients, setSelectedClients] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(`@bulk_notif_history_${currentUser?.id}`);
    if (saved) setHistory(JSON.parse(saved));
  }, [currentUser]);

  const targetClients = (() => {
    if (target === 'specific') {
      return clients.filter(c => selectedClients.includes(c.email));
    }
    if (target === 'overdue') {
      return clients.filter(c => {
        const cLoans = loans.filter(l => l.clientEmail === c.email && l.status === 'approved');
        return cLoans.some(l =>
          (l.installments || []).some(i => i.status !== 'paid' && new Date(i.due_date + 'T00:00:00') < new Date())
        );
      });
    }
    return clients;
  })();

  const toggleClient = (email) => {
    setSelectedClients(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      alert('El título y el mensaje son obligatorios.');
      return;
    }
    if (targetClients.length === 0) {
      alert('No hay clientes objetivo seleccionados.');
      return;
    }

    let sent = 0;
    for (const client of targetClients) {
      await localdb.createNotification({
        target: 'client',
        user_id: client.id,
        title: `📢 ${title}`,
        body,
        data: { type: 'bulk', sentBy: currentUser.id },
      });
      sent++;
    }

    const entry = {
      id: Date.now().toString(),
      title,
      body: body.slice(0, 120),
      target,
      sentCount: sent,
      sentAt: new Date().toISOString(),
    };
    const updated = [entry, ...history];
    setHistory(updated);
    localStorage.setItem(`@bulk_notif_history_${currentUser?.id}`, JSON.stringify(updated));

    alert(`✅ Notificación enviada a ${sent} cliente(s).`);
    setTitle('');
    setBody('');
    setSelectedClients([]);
    setShowPreview(false);
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={22} style={{ color: 'var(--primary)' }} />
          Notificaciones Masivas
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
          Envía notificaciones push a múltiples clientes
        </p>
      </div>

      <div className="grid-2col" style={{ gap: '24px', alignItems: 'start' }}>
        {/* Compose */}
        <div className="premium-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={16} style={{ color: 'var(--primary)' }} /> Componer Notificación
          </h3>

          <div className="form-group">
            <label className="form-label">Destinatarios</label>
            <select className="form-control" value={target} onChange={e => { setTarget(e.target.value); setSelectedClients([]); }}>
              <option value="all">Todos los clientes ({clients.length})</option>
              <option value="overdue">Clientes con pagos vencidos</option>
              <option value="specific">Selección manual</option>
            </select>
          </div>

          {target === 'specific' && (
            <div className="form-group" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px' }}>
              {clients.map(c => {
                const profile = getKycProfile(c.email);
                const name = profile?.fullName || c.nombre || c.email;
                return (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', cursor: 'pointer', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(c.email)}
                      onChange={() => toggleClient(c.email)}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.email}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Título de la Notificación</label>
            <input type="text" className="form-control" placeholder="Ej: Aviso importante" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Mensaje</label>
            <textarea
              className="form-control"
              rows={5}
              placeholder="Escribe el contenido de la notificación..."
              value={body}
              onChange={e => setBody(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setShowPreview(!showPreview)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={14} /> Vista Previa
            </button>
            <button className="btn btn-primary" onClick={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Send size={16} /> Enviar a {targetClients.length} cliente(s)
            </button>
          </div>
        </div>

        {/* Preview & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Preview */}
          {showPreview && (
            <div className="premium-card" style={{ padding: '20px', border: '2px solid var(--primary)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} style={{ color: 'var(--primary)' }} /> Vista Previa
              </h3>
              <div style={{ padding: '16px', backgroundColor: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Bell size={18} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>{title || 'Título de notificación'}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.5', margin: 0 }}>{body || 'El cuerpo de la notificación aparecerá aquí.'}</p>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Enviado a: <strong>{target === 'all' ? 'Todos los clientes' : target === 'overdue' ? 'Clientes en mora' : `${targetClients.length} seleccionados`}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Send History */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--primary)' }} /> Historial de Envíos
            </h3>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No hay envíos registrados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                {history.map(h => (
                  <div key={h.id} style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700' }}>{h.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px' }}>{h.body}...</div>
                      </div>
                      <span className="badge badge-approved">{h.sentCount} enviados</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {h.target === 'all' ? 'Todos' : h.target === 'overdue' ? 'En mora' : 'Manual'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {new Date(h.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
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
