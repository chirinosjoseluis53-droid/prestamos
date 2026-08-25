import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import localdb from '../lib/localdb';
import { Shield, Users, ShieldOff, ShieldCheck, Building2, Key, RefreshCw } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { currentUser, logoutUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [search, setSearch] = useState('');

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const all = await localdb.getAllAdmins();
      setAdmins(all || []);
    } catch (e) {
      alert('Error cargando administradores: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleToggle = async (admin) => {
    const newStatus = admin.status === 'blocked' ? 'active' : 'blocked';
    if (!window.confirm(`¿${newStatus === 'blocked' ? 'Bloquear' : 'Desbloquear'} el acceso de ${admin.email}?`)) return;
    setProcessing(admin.id);
    try {
      await localdb.updateUserStatus('admins', admin.id, newStatus);
      await loadAdmins();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = admins.filter(a =>
    (a.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeAdmins = admins.filter(a => a.status !== 'blocked').length;
  const blockedAdmins = admins.filter(a => a.status === 'blocked').length;

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={26} style={{ color: '#6C3FE8' }} />
            Consola Super Admin
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Control total del sistema — Dueño de App</p>
        </div>
        <button className="btn btn-secondary" onClick={loadAdmins}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        <div className="premium-card stat-card" style={{ borderColor: 'rgba(108,63,232,0.3)' }}>
          <div className="stat-info">
            <span className="stat-label">Total Administradores</span>
            <span className="stat-value">{admins.length}</span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(108,63,232,0.12)', color: '#6C3FE8' }}>
            <Users size={24} />
          </div>
        </div>
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Activos</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>{activeAdmins}</span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(46,204,113,0.12)', color: 'var(--success)' }}>
            <ShieldCheck size={24} />
          </div>
        </div>
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Bloqueados</span>
            <span className="stat-value" style={{ color: 'var(--danger)' }}>{blockedAdmins}</span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(231,76,60,0.12)', color: 'var(--danger)' }}>
            <ShieldOff size={24} />
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="premium-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px' }}>Lista de Administradores</h3>
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar admin..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '14px', fontSize: '13px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 12px auto' }}></div>
            Cargando administradores...
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Administrador</th>
                  <th>Empresa / Negocio</th>
                  <th>Código de Invitación</th>
                  <th>Fecha de Registro</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                      No hay administradores registrados
                    </td>
                  </tr>
                ) : filtered.map(admin => {
                  const isBlocked = admin.status === 'blocked';
                  return (
                    <tr key={admin.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: isBlocked ? 'rgba(231,76,60,0.1)' : 'rgba(108,63,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${isBlocked ? 'var(--danger)' : '#6C3FE8'}` }}>
                            <Shield size={16} style={{ color: isBlocked ? 'var(--danger)' : '#6C3FE8' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{admin.email}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>ID: {admin.id?.substring(0, 12)}...</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Building2 size={14} style={{ color: 'var(--text-secondary)' }} />
                          {admin.company_name || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Key size={14} style={{ color: 'var(--admin-accent)' }} />
                          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--admin-accent)', fontSize: '13px' }}>
                            {admin.invite_code || '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {admin.created_at ? new Date(admin.created_at).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td>
                        <span className={`badge ${isBlocked ? 'badge-rejected' : 'badge-approved'}`}>
                          {isBlocked ? 'Bloqueado' : 'Activo'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 14px', fontSize: '12px', color: isBlocked ? 'var(--success)' : 'var(--danger)' }}
                          onClick={() => handleToggle(admin)}
                          disabled={processing === admin.id}
                        >
                          {processing === admin.id
                            ? '...'
                            : isBlocked
                            ? <><ShieldCheck size={12} /> Desbloquear</>
                            : <><ShieldOff size={12} /> Bloquear</>
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="premium-card" style={{ marginTop: '24px', borderColor: 'var(--danger)' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '15px' }}>Zona de Peligro</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Estas acciones son permanentes y afectan a toda la plataforma.
        </p>
        <button className="btn btn-secondary" style={{ color: 'var(--danger)' }} onClick={logoutUser}>
          <ShieldOff size={16} /> Cerrar Sesión Superadmin
        </button>
      </div>
    </div>
  );
}
