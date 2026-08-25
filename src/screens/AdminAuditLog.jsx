import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Activity, Filter, Clock, User, CheckCircle2, XCircle, DollarSign, FileText, Settings, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

const AUDIT_KEY = '@prestamos_audit_log';

const ACTION_TYPES = [
  { id: 'loan_approved', label: 'Préstamo Aprobado', icon: <CheckCircle2 size={14} />, color: '#10B981' },
  { id: 'loan_rejected', label: 'Préstamo Rechazado', icon: <XCircle size={14} />, color: '#EF4444' },
  { id: 'payment_verified', label: 'Pago Verificado', icon: <DollarSign size={14} />, color: '#3B82F6' },
  { id: 'payment_submitted', label: 'Pago Enviado', icon: <DollarSign size={14} />, color: '#F59E0B' },
  { id: 'client_action', label: 'Acción de Cliente', icon: <User size={14} />, color: '#8B5CF6' },
  { id: 'settings_change', label: 'Cambio de Configuración', icon: <Settings size={14} />, color: '#6B7280' },
  { id: 'refinance', label: 'Refinanciación', icon: <RefreshCw size={14} />, color: '#EC4899' },
];

export default function AdminAuditLog() {
  const { currentUser } = useAuth();
  const { loans, clients } = useData();

  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    generateLogsFromData();
  }, [loans, clients]);

  const generateLogsFromData = () => {
    const logs = [];

    loans.forEach(loan => {
      const client = clients.find(c => c.id === loan.client_id);
      const clientName = client?.nombre || client?.email || 'Desconocido';

      if (loan.status === 'approved' && loan.start_date) {
        logs.push({
          id: `approved_${loan.id}`,
          timestamp: loan.start_date,
          user: currentUser?.name || 'Admin',
          actionType: 'loan_approved',
          details: `Préstamo de $${loan.amount.toFixed(2)} aprobado para ${clientName}`,
          clientEmail: loan.clientEmail,
        });
      }

      if (loan.status === 'rejected') {
        logs.push({
          id: `rejected_${loan.id}`,
          timestamp: loan.created_at || loan.createdAt,
          user: currentUser?.name || 'Admin',
          actionType: 'loan_rejected',
          details: `Préstamo de $${loan.amount.toFixed(2)} rechazado de ${clientName}`,
          clientEmail: loan.clientEmail,
        });
      }

      (loan.installments || []).forEach(inst => {
        if (inst.status === 'submitted') {
          logs.push({
            id: `submitted_${inst.id}`,
            timestamp: inst.payment_history?.[0]?.submitted_at || inst.created_at,
            user: clientName,
            actionType: 'payment_submitted',
            details: `Cuota #${inst.number} — $${inst.amount.toFixed(2)} enviada para revisión`,
            clientEmail: loan.clientEmail,
          });
        }
        if (inst.status === 'paid' && inst.paid_date) {
          logs.push({
            id: `verified_${inst.id}`,
            timestamp: inst.paid_date,
            user: currentUser?.name || 'Admin',
            actionType: 'payment_verified',
            details: `Pago de cuota #${inst.number} — $${(inst.paid_amount || inst.amount).toFixed(2)} verificado`,
            clientEmail: loan.clientEmail,
          });
        }
      });
    });

    const savedPerms = JSON.parse(localStorage.getItem('@prestamos_audit_manual') || '[]');
    logs.push(...savedPerms);

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setAuditLogs(logs);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (filterType !== 'all' && log.actionType !== filterType) return false;
      if (filterUser && !(log.user || '').toLowerCase().includes(filterUser.toLowerCase()) && !(log.details || '').toLowerCase().includes(filterUser.toLowerCase())) return false;
      if (filterDateFrom && new Date(log.timestamp) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(log.timestamp) > new Date(filterDateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [auditLogs, filterType, filterUser, filterDateFrom, filterDateTo]);

  const getActionInfo = (type) => ACTION_TYPES.find(a => a.id === type) || { label: type, icon: <Activity size={14} />, color: '#6B7280' };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    const date = new Date(ts);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
           date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearLogs = () => {
    if (window.confirm('¿Limpiar el registro de auditoría?')) {
      localStorage.removeItem(AUDIT_KEY);
      localStorage.removeItem('@prestamos_audit_manual');
      setAuditLogs([]);
    }
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Registro de Auditoría</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Historial cronológico de acciones del sistema</p>
        </div>
        <button className="btn btn-secondary" onClick={handleClearLogs} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', color: 'var(--danger)' }}>
          <Trash2 size={14} /> Limpiar
        </button>
      </div>

      {/* Filters */}
      <div className="premium-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Filter size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '14px', fontWeight: 700 }}>Filtros</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo de Acción</label>
            <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">Todas</option>
              {ACTION_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Buscar Usuario</label>
            <input type="text" className="form-control" placeholder="Nombre o email..." value={filterUser} onChange={e => setFilterUser(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Desde</label>
            <input type="date" className="form-control" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-control" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Log Stats */}
      <div className="grid-4col" style={{ marginBottom: '24px' }}>
        {ACTION_TYPES.slice(0, 4).map((type, i) => {
          const count = auditLogs.filter(l => l.actionType === type.id).length;
          return (
            <div key={i} className="premium-card" style={{ padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: `${type.color}15`, color: type.color }}>{type.icon}</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: type.color }}>{count}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>{type.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Log List */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: 'var(--primary)' }} /> Actividad Reciente
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
            {filteredLogs.length} registros
          </span>
        </h3>

        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No hay registros que coincidan con los filtros.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
            {filteredLogs.map((log, idx) => {
              const actionInfo = getActionInfo(log.actionType);
              return (
                <div key={log.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '12px', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${actionInfo.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: actionInfo.color, flexShrink: 0 }}>
                    {actionInfo.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{log.details}</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', backgroundColor: `${actionInfo.color}15`, color: actionInfo.color, fontWeight: 600, flexShrink: 0, marginLeft: '8px' }}>
                        {actionInfo.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={11} /> {log.user}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} /> {formatTimestamp(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
