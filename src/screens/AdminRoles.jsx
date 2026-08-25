import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import localdb from '../lib/localdb';
import { Shield, Users, Plus, Trash2, Eye, DollarSign, FileText, Settings, Check, X } from 'lucide-react';

const PERMISSIONS = [
  { id: 'view_clients', label: 'Ver Clientes', icon: <Users size={14} />, description: 'Acceder a la lista de clientes' },
  { id: 'approve_loans', label: 'Aprobar Préstamos', icon: <Check size={14} />, description: 'Aprobar o rechazar solicitudes' },
  { id: 'manage_payments', label: 'Gestionar Pagos', icon: <DollarSign size={14} />, description: 'Verificar y confirmar pagos' },
  { id: 'view_reports', label: 'Ver Reportes', icon: <FileText size={14} />, description: 'Acceder a reportes y estadísticas' },
];

const ROLES_KEY = '@prestamos_subadmins';

export default function AdminRoles() {
  const { currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPerms, setNewPerms] = useState([]);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const allAdmins = await localdb.getAllAdmins();
      const filtered = allAdmins.filter(a => a.id !== currentUser?.id && a.email !== 'dueno@prestamos.com');
      const savedPerms = JSON.parse(localStorage.getItem(ROLES_KEY) || '{}');
      setAdmins(filtered.map(a => ({
        ...a,
        permissions: savedPerms[a.id] || [],
        role: savedPerms[a.id]?.length > 0 ? 'subadmin' : 'admin',
      })));
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permId) => {
    setNewPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleAddSubAdmin = (e) => {
    e.preventDefault();
    if (!newEmail || !newName) {
      alert('Completa todos los campos.');
      return;
    }
    if (newPerms.length === 0) {
      alert('Selecciona al menos un permiso.');
      return;
    }
    const savedPerms = JSON.parse(localStorage.getItem(ROLES_KEY) || '{}');
    const key = newEmail.toLowerCase();
    savedPerms[key] = newPerms;
    localStorage.setItem(ROLES_KEY, JSON.stringify(savedPerms));
    setNewEmail('');
    setNewName('');
    setNewPerms([]);
    setShowForm(false);
    alert('Sub-administrador configurado. El usuario debe registrarse con este correo para tener acceso.');
  };

  const handleToggleAdminPerms = (adminId) => {
    const savedPerms = JSON.parse(localStorage.getItem(ROLES_KEY) || '{}');
    const currentPerms = savedPerms[adminId] || [];
    if (currentPerms.length === 0) {
      savedPerms[adminId] = PERMISSIONS.map(p => p.id);
    } else {
      delete savedPerms[adminId];
    }
    localStorage.setItem(ROLES_KEY, JSON.stringify(savedPerms));
    loadAdmins();
  };

  const handleUpdateAdminPerm = (adminId, permId) => {
    const savedPerms = JSON.parse(localStorage.getItem(ROLES_KEY) || '{}');
    const currentPerms = savedPerms[adminId] || [];
    if (currentPerms.includes(permId)) {
      savedPerms[adminId] = currentPerms.filter(p => p !== permId);
    } else {
      savedPerms[adminId] = [...currentPerms, permId];
    }
    if (savedPerms[adminId].length === 0) {
      delete savedPerms[adminId];
    }
    localStorage.setItem(ROLES_KEY, JSON.stringify(savedPerms));
    loadAdmins();
  };

  const handleRemoveAdmin = (adminId) => {
    if (window.confirm('¿Remover permisos de sub-administrador?')) {
      const savedPerms = JSON.parse(localStorage.getItem(ROLES_KEY) || '{}');
      delete savedPerms[adminId];
      localStorage.setItem(ROLES_KEY, JSON.stringify(savedPerms));
      loadAdmins();
    }
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Roles y Permisos</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Gestiona sub-administradores y sus permisos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '13px' }}>
          {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nuevo Sub-Admin</>}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="premium-card animate-fade" style={{ padding: '24px', marginBottom: '24px', borderColor: 'var(--primary)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} style={{ color: 'var(--primary)' }} /> Configurar Sub-Administrador
          </h3>
          <form onSubmit={handleAddSubAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre</label>
                <input type="text" className="form-control" placeholder="Nombre del sub-admin" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Correo Electrónico</label>
                <input type="email" className="form-control" placeholder="admin@ejemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>Permisos</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {PERMISSIONS.map(perm => {
                  const selected = newPerms.includes(perm.id);
                  return (
                    <div key={perm.id} onClick={() => togglePermission(perm.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                      backgroundColor: selected ? 'rgba(37,99,235,0.05)' : 'var(--surface-light)',
                      border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                    }}>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: selected ? 'var(--primary)' : 'transparent', border: selected ? 'none' : '2px solid var(--border)',
                        transition: 'all 0.2s',
                      }}>
                        {selected && <Check size={12} style={{ color: '#fff' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {perm.icon} {perm.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{perm.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', alignSelf: 'flex-end' }}>
              <Shield size={16} /> Guardar Sub-Admin
            </button>
          </form>
        </div>
      )}

      {/* Admins Table */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--primary)' }} /> Administradores Registrados
        </h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
            <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : admins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No hay otros administradores registrados en el sistema.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Permisos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td style={{ fontWeight: 'bold' }}>{admin.company_name || admin.email}</td>
                    <td style={{ fontSize: '12px' }}>{admin.email}</td>
                    <td>
                      <span className={`badge ${admin.role === 'subadmin' ? 'badge-approved' : 'badge-pending'}`}>
                        {admin.role === 'subadmin' ? 'Sub-Admin' : 'Admin'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(admin.permissions || []).slice(0, 2).map(p => (
                          <span key={p} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary)', fontWeight: 600 }}>
                            {PERMISSIONS.find(perm => perm.id === p)?.label || p}
                          </span>
                        ))}
                        {(admin.permissions || []).length > 2 && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', backgroundColor: 'var(--surface-light)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            +{(admin.permissions || []).length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary" onClick={() => handleToggleAdminPerms(admin.id)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                          {admin.role === 'subadmin' ? 'Revocar' : 'Hacer Sub'}
                        </button>
                        {admin.role === 'subadmin' && (
                          <button className="btn btn-secondary" onClick={() => handleRemoveAdmin(admin.id)} style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)' }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
