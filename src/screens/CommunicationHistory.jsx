import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { MessageSquare, Phone, Mail, Smartphone, ArrowLeft, Search, X, Clock, ArrowUpRight, ArrowDownLeft, Reply, Send } from 'lucide-react';

const COMM_TYPES = [
  { key: 'call', label: 'Llamada', icon: <Phone size={14} />, color: '#3B82F6' },
  { key: 'email', label: 'Email', icon: <Mail size={14} />, color: '#8B5CF6' },
  { key: 'message', label: 'Mensaje', icon: <MessageSquare size={14} />, color: '#2ECC71' },
  { key: 'notification', label: 'Notificación', icon: <MessageSquare size={14} />, color: '#F39C12' },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={14} />, color: '#25D366' },
  { key: 'sms', label: 'SMS', icon: <Smartphone size={14} />, color: '#F59E0B' },
  { key: 'in_app', label: 'In-App', icon: <MessageSquare size={14} />, color: '#6366F1' },
];

function getTypeConfig(key) {
  return COMM_TYPES.find(t => t.key === key) || COMM_TYPES[0];
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function CommunicationHistory({ setTab }) {
  const { currentUser } = useAuth();
  const { clients } = useData();
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDirection, setFilterDirection] = useState('all');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyType, setReplyType] = useState('message');

  useEffect(() => {
    loadComms();
  }, [currentUser]);

  const loadComms = async () => {
    if (!currentUser?.email) return;
    setLoading(true);
    try {
      const data = await localdb.getCommunicationsByClient(currentUser.email);
      setComms(data);
    } catch (e) {
      setComms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) { alert('Escribe tu respuesta'); return; }
    if (!replyTo) return;
    try {
      await localdb.addCommunication({
        clientEmail: currentUser.email,
        type: replyType,
        direction: 'inbound',
        subject: `Respuesta a: ${replyTo.subject || 'comunicación'}`,
        notes: replyText.trim(),
        agentName: currentUser.name || currentUser.email,
        agentEmail: replyTo.agentEmail || '',
      });
      setReplyText('');
      setReplyTo(null);
      await loadComms();
    } catch (e) {
      alert('Error al enviar: ' + e.message);
    }
  };

  const filteredComms = comms.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterDirection !== 'all' && c.direction !== filterDirection) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (c.subject || '').toLowerCase().includes(s) ||
        (c.notes || '').toLowerCase().includes(s) ||
        (c.agentName || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="top-bar-btn" onClick={() => setTab('dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={22} style={{ color: 'var(--primary)' }} />
              Mis Comunicaciones
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Mensajes y registros de interacciones con tu administrador
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="premium-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por asunto, notas o agente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '140px' }}>
            <option value="all">Todos los tipos</option>
            {COMM_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select className="form-control" value={filterDirection} onChange={e => setFilterDirection(e.target.value)} style={{ width: '140px' }}>
            <option value="all">Todas</option>
            <option value="outbound">Recibidas</option>
            <option value="inbound">Mis respuestas</option>
          </select>
        </div>
      </div>

      {/* Reply Form */}
      {replyTo && (
        <div className="premium-card" style={{ padding: '20px', marginBottom: '20px', border: '2px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Reply size={16} style={{ color: 'var(--primary)' }} />
              Responder a: {replyTo.agentName || 'Administrador'}
            </h3>
            <button onClick={() => { setReplyTo(null); setReplyText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ background: 'var(--surface-light)', borderRadius: '8px', padding: '12px', marginBottom: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{replyTo.subject}</strong>
            <br />
            {replyTo.notes}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            {COMM_TYPES.filter(t => ['message', 'email', 'whatsapp', 'sms'].includes(t.key)).map(t => (
              <button
                key={t.key}
                className={`btn ${replyType === t.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setReplyType(t.key)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Escribe tu respuesta..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleReply} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} /> Enviar Respuesta
            </button>
            <button className="btn btn-secondary" onClick={() => { setReplyTo(null); setReplyText(''); }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Communication Timeline */}
      {loading ? (
        <div className="premium-card" style={{ padding: '60px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Cargando comunicaciones...</p>
        </div>
      ) : filteredComms.length === 0 ? (
        <div className="premium-card" style={{ padding: '60px', textAlign: 'center' }}>
          <MessageSquare size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Sin comunicaciones</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Cuando tu administrador registre una interacción contigo, aparecerá aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredComms.map(entry => {
            const typeConf = getTypeConfig(entry.type);
            const isOutbound = entry.direction === 'outbound';
            return (
              <div key={entry.id} className="premium-card" style={{ padding: '16px 20px', borderLeft: `4px solid ${typeConf.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `${typeConf.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeConf.color }}>
                      {typeConf.icon}
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: typeConf.color }}>{typeConf.label}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '600',
                        padding: '2px 8px', borderRadius: '99px', marginLeft: '8px',
                        backgroundColor: isOutbound ? 'rgba(37,99,235,0.1)' : 'rgba(16,185,129,0.1)',
                        color: isOutbound ? '#3B82F6' : '#10B981',
                      }}>
                        {isOutbound ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                        {isOutbound ? 'De: ' + (entry.agentName || 'Admin') : 'Mi respuesta'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Clock size={11} />
                      {formatDateTime(entry.createdAt)}
                    </div>
                    {isOutbound && !replyTo && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setReplyTo(entry)}
                      >
                        <Reply size={12} /> Responder
                      </button>
                    )}
                  </div>
                </div>
                {entry.subject && (
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', marginLeft: '42px' }}>{entry.subject}</div>
                )}
                {entry.notes && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginLeft: '42px' }}>{entry.notes}</div>
                )}
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px', marginLeft: '42px', opacity: 0.7 }}>
                  {entry.agentName ? `Por: ${entry.agentName}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
