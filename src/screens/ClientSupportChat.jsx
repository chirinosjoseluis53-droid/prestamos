import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import localdb from '../lib/localdb';
import { Send, MessageSquare, User, Shield } from 'lucide-react';

export default function ClientSupportChat() {
  const { currentUser } = useAuth();
  const { getKycProfile } = useData();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const threadId = `chat_${currentUser?.id}_${currentUser?.adminId || 'admin'}`;
  const profile = getKycProfile(currentUser?.email);
  const clientName = profile?.fullName || currentUser?.email?.split('@')[0] || 'Cliente';

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await localdb.getMessages(threadId);
        setMessages(msgs || []);
      } catch (e) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    if (threadId) loadMessages();
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage('');
    try {
      await localdb.sendMessage(threadId, currentUser.id, text, {
        senderName: clientName,
        isAdmin: false,
      });
      setMessages(prev => [...prev, {
        id: `${Date.now()}_chat`,
        senderId: currentUser.id,
        text,
        senderName: clientName,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch (e) {
      // Silent fail
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  let lastDate = '';

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <div className="premium-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(15,164,108,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Soporte</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Comunícate con tu administrador</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-secondary)' }}>
              <MessageSquare size={48} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '14px' }}>No hay mensajes aún</p>
              <p style={{ fontSize: '12px' }}>Envía un mensaje para iniciar la conversación</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              const msgDate = formatDate(msg.createdAt);
              let showDate = false;
              if (msgDate !== lastDate) {
                lastDate = msgDate;
                showDate = true;
              }
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', padding: '8px 0' }}>
                      {msgDate}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
                    <div style={{ maxWidth: '70%' }}>
                      {!isMe && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', marginLeft: '4px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '6px', backgroundColor: 'rgba(108,63,232,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={10} style={{ color: '#6C3FE8' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>{msg.senderName || 'Admin'}</span>
                        </div>
                      )}
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        backgroundColor: isMe ? 'var(--primary)' : 'var(--surface-light)',
                        color: isMe ? 'white' : 'var(--text)',
                        fontSize: '14px',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                      }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', paddingLeft: isMe ? '0' : '4px', paddingRight: isMe ? '4px' : '0', textAlign: isMe ? 'right' : 'left' }}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            rows={1}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-light)',
              color: 'var(--text)',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              minHeight: '40px',
              maxHeight: '100px',
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            style={{ padding: '10px 14px', borderRadius: '12px', opacity: newMessage.trim() ? 1 : 0.5 }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
