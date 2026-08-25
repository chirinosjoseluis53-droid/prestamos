import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Shield, Search, CheckCircle, XCircle, Eye, Filter, DollarSign, Car, Home, Gem, Laptop } from 'lucide-react';

const ASSET_TYPES = [
  { value: 'vehicle', label: 'Vehículo', icon: <Car size={16} /> },
  { value: 'property', label: 'Propiedad', icon: <Home size={16} /> },
  { value: 'jewelry', label: 'Joyas', icon: <Gem size={16} /> },
  { value: 'electronics', label: 'Electrónica', icon: <Laptop size={16} /> },
  { value: 'other', label: 'Otro', icon: <Shield size={16} /> },
];

const STORAGE_KEY = '@guarantees';

export default function AdminGuarantees({ setTab }) {
  const { currentUser } = useAuth();
  const { clients, getKycProfile } = useData();

  const [guarantees, setGuarantees] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedGuarantee, setSelectedGuarantee] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_${currentUser?.id}`);
    if (saved) setGuarantees(JSON.parse(saved));
  }, [currentUser]);

  const saveGuarantees = (data) => {
    setGuarantees(data);
    localStorage.setItem(`${STORAGE_KEY}_${currentUser?.id}`, JSON.stringify(data));
  };

  const handleApprove = (id) => {
    const updated = guarantees.map(g => g.id === id ? { ...g, status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: currentUser.id } : g);
    saveGuarantees(updated);
    setSelectedGuarantee(null);
  };

  const handleReject = (id) => {
    if (!window.confirm('¿Rechazar esta garantía?')) return;
    const updated = guarantees.map(g => g.id === id ? { ...g, status: 'rejected', reviewedAt: new Date().toISOString(), reviewedBy: currentUser.id } : g);
    saveGuarantees(updated);
    setSelectedGuarantee(null);
  };

  const filtered = guarantees.filter(g => {
    if (search) {
      const q = search.toLowerCase();
      if (!g.clientName?.toLowerCase().includes(q) && !g.clientEmail?.toLowerCase().includes(q) && !g.description?.toLowerCase().includes(q)) return false;
    }
    if (filterType !== 'all' && g.assetType !== filterType) return false;
    if (filterStatus !== 'all' && g.status !== filterStatus) return false;
    return true;
  });

  const statusCounts = {
    pending: guarantees.filter(g => g.status === 'pending').length,
    approved: guarantees.filter(g => g.status === 'approved').length,
    rejected: guarantees.filter(g => g.status === 'rejected').length,
  };

  const getAssetIcon = (type) => {
    const asset = ASSET_TYPES.find(a => a.value === type);
    return asset?.icon || <Shield size={16} />;
  };

  const getAssetLabel = (type) => {
    const asset = ASSET_TYPES.find(a => a.value === type);
    return asset?.label || type;
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={22} style={{ color: 'var(--primary)' }} />
          Garantías de Clientes
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
          Visualiza y gestiona las garantías colaterales registradas
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid-4col" style={{ gap: '12px', marginBottom: '24px' }}>
        <div className="premium-card" style={{ padding: '14px', textAlign: 'center', borderLeft: '4px solid #F39C12' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#F39C12' }}>{statusCounts.pending}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Pendientes</div>
        </div>
        <div className="premium-card" style={{ padding: '14px', textAlign: 'center', borderLeft: '4px solid #2ECC71' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#2ECC71' }}>{statusCounts.approved}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Aprobadas</div>
        </div>
        <div className="premium-card" style={{ padding: '14px', textAlign: 'center', borderLeft: '4px solid #E74C3C' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#E74C3C' }}>{statusCounts.rejected}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Rechazadas</div>
        </div>
        <div className="premium-card" style={{ padding: '14px', textAlign: 'center', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>{guarantees.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Total</div>
        </div>
      </div>

      {/* Filters */}
      <div className="premium-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input type="text" className="form-control" placeholder="Buscar por cliente o descripción..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '38px' }} />
        </div>
        <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: '160px' }}>
          <option value="all">Todos los tipos</option>
          {ASSET_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '140px' }}>
          <option value="all">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobada</option>
          <option value="rejected">Rechazada</option>
        </select>
      </div>

      {/* Table */}
      <div className="premium-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo de Garantía</th>
                <th>Descripción</th>
                <th>Valor Estimado</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                    {guarantees.length === 0
                      ? 'No hay garantías registradas. Los clientes registran garantías al solicitar préstamos.'
                      : 'No se encontraron garantías con los filtros seleccionados.'}
                  </td>
                </tr>
              ) : filtered.map(g => (
                <tr key={g.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{g.clientName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{g.clientEmail}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getAssetIcon(g.assetType)}
                      <span style={{ fontSize: '13px' }}>{getAssetLabel(g.assetType)}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description || '—'}</td>
                  <td style={{ fontWeight: '700', color: 'var(--primary)' }}>${parseFloat(g.estimatedValue || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${g.status === 'approved' ? 'badge-approved' : g.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                      {g.status === 'approved' ? 'Aprobada' : g.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(g.createdAt).toLocaleDateString('es-ES')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => setSelectedGuarantee(g)}>
                        <Eye size={12} />
                      </button>
                      {g.status === 'pending' && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', color: '#2ECC71' }} onClick={() => handleApprove(g.id)}>
                            <CheckCircle size={12} />
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', color: '#E74C3C' }} onClick={() => handleReject(g.id)}>
                            <XCircle size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedGuarantee && (
        <div className="modal-backdrop" onClick={() => setSelectedGuarantee(null)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle de Garantía</h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  {getAssetIcon(selectedGuarantee.assetType)}
                </div>
                <div>
                  <div style={{ fontWeight: '700' }}>{getAssetLabel(selectedGuarantee.assetType)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cliente: {selectedGuarantee.clientName}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Valor Estimado</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>${parseFloat(selectedGuarantee.estimatedValue || 0).toLocaleString()}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-light)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Estado</div>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge ${selectedGuarantee.status === 'approved' ? 'badge-approved' : selectedGuarantee.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                      {selectedGuarantee.status === 'approved' ? 'Aprobada' : selectedGuarantee.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Descripción</div>
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-light)', borderRadius: '8px', fontSize: '13px' }}>
                  {selectedGuarantee.description || 'Sin descripción'}
                </div>
              </div>

              {selectedGuarantee.notes && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Notas</div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--surface-light)', borderRadius: '8px', fontSize: '13px' }}>
                    {selectedGuarantee.notes}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Registrada: {new Date(selectedGuarantee.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="modal-footer">
              {selectedGuarantee.status === 'pending' && (
                <>
                  <button className="btn btn-secondary" style={{ color: '#E74C3C', borderColor: '#E74C3C' }} onClick={() => handleReject(selectedGuarantee.id)}>Rechazar</button>
                  <button className="btn btn-primary" onClick={() => handleApprove(selectedGuarantee.id)}>Aprobar</button>
                </>
              )}
              {selectedGuarantee.status !== 'pending' && (
                <button className="btn btn-secondary" onClick={() => setSelectedGuarantee(null)}>Cerrar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
