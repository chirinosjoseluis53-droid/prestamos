import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { MessageSquare, Phone, Mail, Bell, Plus, Search, Filter, Clock, User, Trash2, X } from 'lucide-react';

const COMM_TYPES = [
  { value: 'call', label: 'Llamada', icon: <Phone size={16} />, color: '#2563EB' },
  { value: 'email', label: 'Correo', icon: <Mail size={16} />, color: '#8B5CF6' },
  { value: 'message', label: 'Mensaje', icon: <MessageSquare size={16} />, color: '#2ECC71' },
  { value: 'notification', label: 'Notificación', icon: <Bell size={16} />, color: '#F39C12' },
  { value: 'other', label: 'Otro', icon: <MessageSquare size={16} />, color: '#6B7280' },
];

export default function AdminCommLog({ setTab }) {
  const { currentUser } = useAuth();
  const { clients, getKycProfile } = useData();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterClient, setFilterClient] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [commType, setCommType] = useState('call');
  const [direction, setDirection] = useState('outbound');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    loadLogs();
  }, [currentUser]);

  const loadLogs = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await localdb.getCommunicationsByAgent(currentUser.email);
      setLogs(data);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!selectedClient || !notes.trim()) {
      alert('Selecciona un cliente y escribe unas notas.');
      return;
    }
    const client = clients.find(c => c.email === selectedClient);
    const profile = getKycProfile(selectedClient);
    try {
      await localdb.addCommunication({
        clientEmail: selectedClient,
        type: commType,
        direction,
        subject: `${commType === 'call' ? 'Llamada' : commType === 'email' ? 'Correo' : commType === 'message' ? 'Mensaje' : 'Notificación'} - ${notes.substring(0, 50)}`,
        notes,
        duration: duration || null,
        agentName: currentUser.name || currentUser.email,
        agentEmail: currentUser.email,
      });
      await loadLogs();
      setSelectedClient('');
      setNotes('');
      setDuration('');
      setShowForm(false);
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await localdb.deleteCommunication(id);
      await loadLogs();
    } catch (e) {
      alert('Error al eliminar: ' + e.message);
    }
  };

  const filtered = logs.filter(l => {
    if (filterType !== 'all' && l.type !== filterType) return false;
    if (filterClient && l.clientEmail !== filterClient) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(l.agentName || '').toLowerCase().includes(q) &&
        !(l.notes || '').toLowerCase().includes(q) &&
        !(l.clientEmail || '').toLowerCase().includes(q) &&
        !(l.subject || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const getTypeInfo = (type) => {
    const t = COMM_TYPES.find(ct => ct.value === type);
    return t || COMM_TYPES[4];
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={22} style={{ color: 'var(--primary)' }} />
            Registro de Comunicaciones
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Historial de todas las interacciones con clientes — sincronizado con Firestore
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nueva Entrada</>}
        </button>
      </div>

      {/* Summary */}
      <div className="grid-4col" style={{ gap: '12px', marginBottom: '24px' }}>
        {COMM_TYPES.slice(0, 4).map(t => (
          <div key={t.value} className="premium-card" style={{ padding: '14px', borderLeft: `4px solid ${t.color}`, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: t.color }}>{t.icon}</div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>{logs.filter(l => l.type === t.value).length}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>{t.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="premium-card" style={{ padding: '20px', marginBottom: '24px', border: '2px solid var(--primary)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Registrar Interacción</h3>
          <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid-2col" style={{ gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cliente</label>
                <select className="form-control" value={selectedClient} onChange={e => setSelectedClient(e.target.value)} required>
                  <option value="">-- Seleccionar cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.email}>{c.nombre || c.email}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo de Comunicación</label>
                <select className="form-control" value={commType} onChange={e => setCommType(e.target.value)}>
                  {COMM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Dirección</label>
                <select className="form-control" value={direction} onChange={e => setDirection(e.target.value)}>
                  <option value="outbound">Saliente</option>
                  <option value="inbound">Entrante</option>
                </select>
              </div>
              {(commType === 'call') && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Duración (minutos)</label>
                  <input type="number" className="form-control" placeholder="Ej: 5" value={duration} onChange={e => setDuration(e.target.value)} />
                </div>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notas</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Describe la interacción..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                required
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              <Plus size={14} /> Guardar Registro
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="premium-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input type="text" className="form-control" placeholder="Buscar por cliente o notas..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '38px' }} />
        </div>
        <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '160px' }}>
          <option value="all">Todos los tipos</option>
          {COMM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="form-control" value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ width: '180px' }}>
          <option value="">Todos los clientes</option>
          {clients.map(c => (
            <option key={c.id} value={c.email}>{c.nombre || c.email}</option>
          ))}
        </select>
      </div>

      {/* Log Table */}
      <div className="premium-card">
        <div className="table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
              Cargando comunicaciones...
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Dirección</th>
                  <th>Asunto</th>
                  <th>Notas</th>
                  <th>Duración</th>
                  <th>Registrado por</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                      {logs.length === 0
                        ? 'No hay registros de comunicación. Crea el primero haciendo clic en "Nueva Entrada".'
                        : 'No se encontraron registros con los filtros aplicados.'}
                    </td>
                  </tr>
                ) : filtered.map(l => {
                  const typeInfo = getTypeInfo(l.type);
                  return (
                    <tr key={l.id}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(l.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <br />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {new Date(l.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: '600' }}>{l.clientEmail}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '99px', backgroundColor: `${typeInfo.color}12`, color: typeInfo.color, fontSize: '12px', fontWeight: '600' }}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: l.direction === 'outbound' ? 'var(--primary)' : '#8B5CF6' }}>
                          {l.direction === 'outbound' ? '↗ Saliente' : '↙ Entrante'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.subject}</td>
                      <td style={{ fontSize: '12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.notes}</td>
                      <td style={{ fontSize: '12px', textAlign: 'center' }}>{l.duration ? `${l.duration} min` : '—'}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.agentName}</td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDelete(l.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
