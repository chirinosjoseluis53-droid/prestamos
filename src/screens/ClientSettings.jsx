import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import {
  User, Mail, Sun, Moon, Save, Shield, Bell,
  Lock, CreditCard, Award, Eye, EyeOff, LogOut,
  AlertCircle, Loader2, CheckCircle2, X, Calendar, Camera
} from 'lucide-react';

const NOTIF_KEY = '@prestamos_client_notif_prefs';

export default function ClientSettings() {
  const { currentUser, logoutUser, changePassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { getKycProfile, loans, saveKycProfile } = useData();

  const profile = getKycProfile(currentUser?.email);
  const [activeSection, setActiveSection] = useState('profile');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Profile
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Password
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  // Notifs
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [savingNotifs, setSavingNotifs] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.fullName || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
      setProfilePhoto(profile.profilePhoto || profile.profile_photo || null);
    }
  }, [profile]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTIF_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        setEmailNotifs(p.emailNotifs ?? true);
        setPushNotifs(p.pushNotifs ?? true);
        setPaymentReminders(p.paymentReminders ?? true);
      }
    } catch {}
  }, []);

  const flash = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { flash('Selecciona una imagen válida', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { flash('La imagen no puede superar 5MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setProfilePhoto(dataUrl);
      setSaving(true);
      try {
        await saveKycProfile(currentUser.email, { profilePhoto: dataUrl, profile_photo: dataUrl });
        flash('Foto de perfil actualizada');
      } catch { flash('Error al guardar la foto', 'error'); }
      finally { setSaving(false); }
    };
    reader.readAsDataURL(file);
  };

  const approvedLoans = loans.filter(l => l.status === 'approved').length;
  const completedLoans = loans.filter(l => l.status === 'approved' && l.installments?.every(i => i.status === 'paid')).length;

  const handleSaveProfile = async () => {
    if (!name.trim()) { flash('El nombre es obligatorio', 'error'); return; }
    setSaving(true);
    try {
      await saveKycProfile(currentUser.email, { fullName: name.trim(), phone: phone.trim(), address: address.trim(), profilePhoto: profilePhoto, profile_photo: profilePhoto });
      flash('Perfil actualizado');
    } catch { flash('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) { flash('Completa todos los campos', 'error'); return; }
    if (newPwd.length < 6) { flash('Mínimo 6 caracteres', 'error'); return; }
    if (newPwd !== confirmPwd) { flash('Las contraseñas no coinciden', 'error'); return; }
    setChangingPwd(true);
    try {
      const r = await changePassword(currentPwd, newPwd);
      if (r.success) { flash('Contraseña actualizada'); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }
      else flash(r.error, 'error');
    } catch { flash('Error al cambiar contraseña', 'error'); }
    finally { setChangingPwd(false); }
  };

  const handleSaveNotifs = () => {
    setSavingNotifs(true);
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ emailNotifs, pushNotifs, paymentReminders }));
    setTimeout(() => { flash('Preferencias guardadas'); setSavingNotifs(false); }, 300);
  };

  const sections = [
    { id: 'profile', label: 'Perfil', icon: <User size={18} /> },
    { id: 'security', label: 'Seguridad', icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} /> },
    { id: 'appearance', label: 'Tema', icon: isDark ? <Moon size={18} /> : <Sun size={18} /> },
  ];

  return (
    <div className="animate-fade grid-2col-wide" style={{ minHeight: '70vh' }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
        .settings-section-btn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; border-radius: 12px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; background: transparent; color: var(--text-secondary); text-align: left; }
        .settings-section-btn:hover { background: var(--surface-light); color: var(--text); }
        .settings-section-btn.active { background: var(--primary); color: white; }
        .settings-section-btn.active svg { color: white; }
        .settings-field { display: flex; flex-direction: column; gap: 6px; }
        .settings-field label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        .settings-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr)); gap: 16px; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderRadius: '12px', backgroundColor: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', animation: 'slideIn 0.3s ease', maxWidth: '360px' }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} style={{ color: '#10B981' }} /> : <AlertCircle size={16} style={{ color: '#EF4444' }} />}
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}><X size={14} /></button>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Profile Card */}
        <div className="premium-card" style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div onClick={() => document.getElementById('client-avatar-input').click()} style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '3px solid var(--surface)', boxShadow: '0 4px 16px rgba(15,164,108,0.3)', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={30} style={{ color: 'white' }} />
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22px', backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}>
              <Camera size={12} style={{ color: 'white' }} />
            </div>
            <input type="file" id="client-avatar-input" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          </div>
          {saving && <div style={{ fontSize: '11px', color: 'var(--primary)', marginBottom: '8px', fontWeight: 600 }}>Guardando foto...</div>}
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '2px' }}>{name || 'Sin nombre'}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{currentUser?.email}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', backgroundColor: profile?.status === 'verified' ? 'rgba(16,185,129,0.1)' : 'rgba(243,156,18,0.1)', color: profile?.status === 'verified' ? '#10B981' : '#F39C12' }}>
              {profile?.status === 'verified' ? 'Verificado' : 'Pendiente'}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary)' }}>
              {approvedLoans} préstamos
            </span>
          </div>
        </div>

        {/* Nav Menu */}
        <div className="premium-card" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {sections.map(s => (
            <button key={s.id} className={`settings-section-btn ${activeSection === s.id ? 'active' : ''}`} onClick={() => setActiveSection(s.id)}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="premium-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Resumen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Préstamos activos', value: approvedLoans - completedLoans, color: 'var(--primary)' },
              { label: 'Completados', value: completedLoans, color: '#10B981' },
              { label: 'Total', value: loans.length, color: 'var(--text-secondary)' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '2px' }}>
            {sections.find(s => s.id === activeSection)?.label}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {activeSection === 'profile' && 'Actualiza tu información personal'}
            {activeSection === 'security' && 'Gestiona tu contraseña y sesiones'}
            {activeSection === 'notifications' && 'Controla cómo recibes las alertas'}
            {activeSection === 'appearance' && 'Elige entre modo claro u oscuro'}
          </p>
        </div>

        {/* Profile */}
        {activeSection === 'profile' && (
          <>
            <div className="premium-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><User size={18} /></div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Información Personal</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tu nombre, teléfono y dirección</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="settings-field">
                  <label>Nombre Completo</label>
                  <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre completo" />
                </div>
                <div className="settings-row">
                  <div className="settings-field">
                    <label>Correo Electrónico</label>
                    <input type="email" className="form-control" value={currentUser?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                  </div>
                  <div className="settings-field">
                    <label>Teléfono</label>
                    <input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+58 414 000 0000" />
                  </div>
                </div>
                <div className="settings-field">
                  <label>Dirección</label>
                  <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} placeholder="Tu dirección" />
                </div>
              </div>
            </div>
            <div className="premium-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><CreditCard size={18} /></div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Datos de la Cuenta</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Información de tu cuenta</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { icon: <Mail size={14} />, label: 'Email', value: currentUser?.email },
                  { icon: <Calendar size={14} />, label: 'Miembro desde', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A' },
                  { icon: <Shield size={14} />, label: 'KYC', value: profile?.status === 'verified' ? 'Verificado' : 'Pendiente', color: profile?.status === 'verified' ? '#10B981' : 'var(--warning)' },
                  { icon: <Award size={14} />, label: 'Préstamos', value: `${approvedLoans} aprobados, ${completedLoans} completados` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--surface-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>{item.icon}<span style={{ fontSize: '13px' }}>{item.label}</span></div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: item.color || 'var(--text)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
              {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : <><Save size={16} /> Guardar Perfil</>}
            </button>
          </>
        )}

        {/* Security */}
        {activeSection === 'security' && (
          <>
            <div className="premium-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><Lock size={18} /></div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Cambiar Contraseña</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Actualiza tu contraseña de acceso</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="settings-field">
                  <label>Contraseña Actual</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showCurrent ? 'text' : 'password'} className="form-control" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" style={{ paddingRight: '40px' }} />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-field">
                    <label>Nueva Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showNew ? 'text' : 'password'} className="form-control" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>Confirmar Contraseña</label>
                    <input type={showNew ? 'text' : 'password'} className="form-control" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repite la contraseña" />
                  </div>
                </div>
                {newPwd && confirmPwd && newPwd !== confirmPwd && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 500 }}>Las contraseñas no coinciden</span>
                  </div>
                )}
                <button className="btn btn-primary" onClick={handleChangePassword} disabled={changingPwd} style={{ alignSelf: 'flex-end', padding: '10px 20px', fontSize: '13px' }}>
                  {changingPwd ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Actualizando...</> : <><Lock size={14} /> Actualizar Contraseña</>}
                </button>
              </div>
            </div>

            {/* Sessions */}
            <div className="premium-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}><Shield size={18} /></div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Sesión Activa</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Dispositivo actual</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px' }}>
                    {navigator.userAgent.includes('Mobile') ? '📱' : '💻'}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Este dispositivo</div>
                    <div style={{ fontSize: '12px', color: '#10B981' }}>Sesión activa</div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '99px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 700 }}>AHORA</span>
              </div>
            </div>

            {/* Logout */}
            <div className="premium-card" style={{ padding: '24px', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Cerrar Sesión</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sale de tu cuenta en este dispositivo</div>
                </div>
                <button className="btn" onClick={logoutUser} style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                  <LogOut size={14} /> Salir
                </button>
              </div>
            </div>
          </>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <>
            <div className="premium-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><Bell size={18} /></div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Preferencias</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Elige cómo recibir notificaciones</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Notificaciones por Email', desc: 'Actualizaciones de préstamos y pagos en tu correo', state: emailNotifs, toggle: () => setEmailNotifs(!emailNotifs), icon: <Mail size={16} /> },
                  { label: 'Notificaciones Push', desc: 'Alertas en tiempo real en el navegador', state: pushNotifs, toggle: () => setPushNotifs(!pushNotifs), icon: <Bell size={16} /> },
                  { label: 'Recordatorios de Pago', desc: 'Aviso antes del vencimiento de cuotas', state: paymentReminders, toggle: () => setPaymentReminders(!paymentReminders), icon: <Calendar size={16} /> },
                ].map((item, i) => (
                  <div key={i} onClick={item.toggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', backgroundColor: item.state ? 'rgba(37,99,235,0.04)' : 'var(--surface-light)', border: `1px solid ${item.state ? 'rgba(37,99,235,0.15)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: item.state ? 'rgba(37,99,235,0.1)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.state ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.2s', flexShrink: 0 }}>{item.icon}</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.desc}</div>
                      </div>
                    </div>
                    <div style={{ width: '44px', height: '24px', borderRadius: '12px', position: 'relative', transition: 'background 0.3s', flexShrink: 0, backgroundColor: item.state ? 'var(--primary)' : 'var(--border)' }}>
                      <div style={{ position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.3s', left: item.state ? '23px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveNotifs} disabled={savingNotifs} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
              {savingNotifs ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : <><Save size={16} /> Guardar Preferencias</>}
            </button>
          </>
        )}

        {/* Appearance */}
        {activeSection === 'appearance' && (
          <div className="premium-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Apariencia</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cambia el tema de la interfaz</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '14px' }}>
              <div onClick={() => isDark && toggleTheme()} style={{ padding: '24px 16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', border: !isDark ? '2px solid var(--primary)' : '2px solid var(--border)', backgroundColor: !isDark ? 'rgba(37,99,235,0.04)' : 'var(--surface-light)' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #F8FAFC, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <Sun size={22} style={{ color: '#F59E0B' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: !isDark ? 'var(--primary)' : 'var(--text)' }}>Claro</div>
                {!isDark && <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>● Activo</div>}
              </div>
              <div onClick={() => !isDark && toggleTheme()} style={{ padding: '24px 16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', border: isDark ? '2px solid var(--primary)' : '2px solid var(--border)', backgroundColor: isDark ? 'rgba(37,99,235,0.04)' : 'var(--surface-light)' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E293B, #0F172A)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  <Moon size={22} style={{ color: '#818CF8' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? 'var(--primary)' : 'var(--text)' }}>Oscuro</div>
                {isDark && <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>● Activo</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
