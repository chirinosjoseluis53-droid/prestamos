import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Bell, ArrowLeft, CheckCheck } from 'lucide-react';
import localdb from '../lib/localdb';

export default function AdminNotifications({ setTab }) {
  const { currentUser } = useAuth();
  const { getNotifications } = useData();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotis = async () => {
      if (!currentUser?.id) return;
      setLoading(true);
      const notis = await getNotifications(currentUser.id);
      setNotifications(notis || []);
      setLoading(false);
    };
    loadNotis();
  }, [currentUser, getNotifications]);

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    await Promise.all(unread.map(n => localdb.markNotificationRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="top-bar-btn" onClick={() => setTab('dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={22} style={{ color: 'var(--primary)' }} />
              Notificaciones
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Historial completo de notificaciones
            </p>
          </div>
        </div>
        {notifications.some(n => !n.read) && (
          <button className="btn btn-secondary" onClick={handleMarkAllRead} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <CheckCheck size={16} /> Marcar todo leído
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="premium-card" style={{ padding: '60px', textAlign: 'center' }}>
          <Bell size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3, margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Sin notificaciones</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Las notificaciones aparecerán aquí cuando haya actividad.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map(n => (
            <div key={n.id} className="premium-card" style={{
              padding: '16px 20px',
              borderLeft: n.read ? '3px solid var(--border)' : '3px solid var(--primary)',
              opacity: n.read ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{n.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{n.body}</div>
                </div>
                {!n.read && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', flexShrink: 0, marginTop: '6px' }} />
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>
                {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
