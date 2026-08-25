import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, Phone, MapPin, Plus, Trash2, CheckCircle, AlertCircle, Award, Edit2 } from 'lucide-react';

const STORAGE_KEY = '@collectors';

export default function AdminCollectors({ setTab }) {
  const { currentUser } = useAuth();
  const { clients, loans, getKycProfile } = useData();

  const [collectors, setCollectors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [selectedCollector, setSelectedCollector] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCollector, setAssignCollector] = useState(null);
  const [overdueClients, setOverdueClients] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_${currentUser?.id}`);
    if (saved) setCollectors(JSON.parse(saved));
    const savedAssign = localStorage.getItem(`${STORAGE_KEY}_assignments_${currentUser?.id}`);
    if (savedAssign) setAssignments(JSON.parse(savedAssign));
  }, [currentUser]);

  const saveCollectors = (data) => {
    setCollectors(data);
    localStorage.setItem(`${STORAGE_KEY}_${currentUser?.id}`, JSON.stringify(data));
  };

  const saveAssignments = (data) => {
    setAssignments(data);
    localStorage.setItem(`${STORAGE_KEY}_assignments_${currentUser?.id}`, JSON.stringify(data));
  };

  const getOverdueClients = () => {
    const result = [];
    clients.forEach(c => {
      const cLoans = loans.filter(l => l.clientEmail === c.email && l.status === 'approved');
      const overdueInst = cLoans.flatMap(l =>
        (l.installments || []).filter(i => i.status !== 'paid' && new Date(i.due_date + 'T00:00:00') < new Date())
      );
      if (overdueInst.length > 0) {
        const profile = getKycProfile(c.email);
        const totalOwed = overdueInst.reduce((s, i) => s + i.amount, 0);
        result.push({
          client: c,
          name: profile?.fullName || c.nombre || c.email,
          email: c.email,
          overdueCount: overdueInst.length,
          totalOwed,
          phone: profile?.phone,
        });
      }
    });
    return result.sort((a, b) => b.totalOwed - a.totalOwed);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editId) {
      const updated = collectors.map(c => c.id === editId ? { ...c, name, phone, area } : c);
      saveCollectors(updated);
    } else {
      const newCollector = { id: Date.now().toString(), name, phone, area, createdAt: new Date().toISOString() };
      saveCollectors([...collectors, newCollector]);
    }
    setName(''); setPhone(''); setArea(''); setShowForm(false); setEditId(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm('¿Eliminar este cobrador?')) return;
    saveCollectors(collectors.filter(c => c.id !== id));
    saveAssignments(assignments.filter(a => a.collectorId !== id));
  };

  const handleEdit = (c) => {
    setName(c.name); setPhone(c.phone); setArea(c.area); setEditId(c.id); setShowForm(true);
  };

  const openAssign = (collector) => {
    setAssignCollector(collector);
    setOverdueClients(getOverdueClients());
    setShowAssignModal(true);
  };

  const handleAssign = (clientEmail) => {
    const existing = assignments.find(a => a.collectorId === assignCollector.id && a.clientEmail === clientEmail);
    if (existing) {
      alert('Este cliente ya está asignado a este cobrador.');
      return;
    }
    const newAssign = {
      id: Date.now().toString(),
      collectorId: assignCollector.id,
      collectorName: assignCollector.name,
      clientEmail,
      clientName: overdueClients.find(c => c.email === clientEmail)?.name || clientEmail,
      assignedAt: new Date().toISOString(),
      status: 'active',
      collectionsMade: 0,
      amountRecovered: 0,
    };
    saveAssignments([...assignments, newAssign]);
  };

  const getCollectorStats = (collectorId) => {
    const cAssigns = assignments.filter(a => a.collectorId === collectorId);
    return {
      totalAssignments: cAssigns.length,
      active: cAssigns.filter(a => a.status === 'active').length,
      completed: cAssigns.filter(a => a.status === 'completed').length,
    };
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={22} style={{ color: 'var(--primary)' }} />
            Gestión de Cobradores
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Administra cobradores y asigna clientes en mora
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setName(''); setPhone(''); setArea(''); }}>
          <Plus size={16} /> {showForm ? 'Cancelar' : 'Nuevo Cobrador'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="premium-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>{editId ? 'Editar Cobrador' : 'Registrar Cobrador'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="grid-2col" style={{ gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre Completo</label>
                <input type="text" className="form-control" placeholder="Ej: Juan Pérez" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Teléfono</label>
                <input type="tel" className="form-control" placeholder="Ej: 0412-1234567" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Área / Zona Asignada</label>
              <input type="text" className="form-control" placeholder="Ej: Caracas, Miranda, etc." value={area} onChange={e => setArea(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {editId ? 'Guardar Cambios' : 'Registrar Cobrador'}
            </button>
          </form>
        </div>
      )}

      {/* Collectors Grid */}
      {collectors.length === 0 ? (
        <div className="premium-card" style={{ padding: '48px', textAlign: 'center' }}>
          <User size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Sin cobradores</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Agrega cobradores para empezar a gestionar la cobranza.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '20px', marginBottom: '24px' }}>
          {collectors.map(c => {
            const stats = getCollectorStats(c.id);
            return (
              <div key={c.id} className="premium-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} color="#fff" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{c.name}</h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {c.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} />{c.phone}</span>}
                        {c.area && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} />{c.area}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleEdit(c)}><Edit2 size={14} /></button>
                    <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'var(--surface-light)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800' }}>{stats.totalAssignments}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Asignados</div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'var(--surface-light)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)' }}>{stats.active}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Activos</div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'var(--surface-light)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#2ECC71' }}>{stats.completed}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Completados</div>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={() => openAssign(c)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Plus size={14} /> Asignar Clientes
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Assignments Table */}
      {assignments.length > 0 && (
        <div className="premium-card" style={{ marginTop: '24px' }}>
          <div style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} style={{ color: 'var(--primary)' }} /> Asignaciones Activas
            </h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Cobrador</th>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Fecha de Asignación</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: '600' }}>{a.collectorName}</td>
                      <td>{a.clientName}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.clientEmail}</td>
                      <td style={{ fontSize: '12px' }}>{new Date(a.assignedAt).toLocaleDateString('es-ES')}</td>
                      <td>
                        <span className={`badge ${a.status === 'active' ? 'badge-approved' : 'badge-paid'}`}>
                          {a.status === 'active' ? 'Activa' : 'Completada'}
                        </span>
                      </td>
                      <td>
                        {a.status === 'active' && (
                          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => {
                              const updated = assignments.map(x => x.id === a.id ? { ...x, status: 'completed' } : x);
                              saveAssignments(updated);
                            }}>
                            Completar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && assignCollector && (
        <div className="modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Asignar Clientes a {assignCollector.name}</h3>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {overdueClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  No hay clientes con pagos vencidos en este momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {overdueClients.map(c => {
                    const alreadyAssigned = assignments.some(a => a.collectorId === assignCollector.id && a.clientEmail === c.email);
                    return (
                      <div key={c.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.overdueCount} cuotas vencidas · ${c.totalOwed.toFixed(2)}</div>
                        </div>
                        <button
                          className={`btn ${alreadyAssigned ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                          onClick={() => !alreadyAssigned && handleAssign(c.email)}
                          disabled={alreadyAssigned}
                        >
                          {alreadyAssigned ? 'Asignado' : 'Asignar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
