import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, Lock, Fingerprint, Shield, Briefcase, User, Globe, Smartphone, Monitor } from 'lucide-react';
import loginImage from '../assets/login-image.jpg';
import './Login.css';

export default function Login({ setScreen }) {
  const { isDark, toggleTheme } = useTheme();
  const { loginUser, loginWithBiometric, getSavedAccounts, resetAdminPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showBiometricScan, setShowBiometricScan] = useState(false);
  const [scanningAccount, setScanningAccount] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const loadSaved = async () => {
      const accounts = await getSavedAccounts();
      setSavedAccounts(accounts);
    };
    loadSaved();
  }, [getSavedAccounts]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Por favor llena todos los campos');
      return;
    }
    await loginUser(email, password);
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      alert('Ingresa tu correo en el campo correspondiente para enviarte el enlace de recuperación.');
      return;
    }
    resetAdminPassword(email.trim());
  };

  const handleBiometricPress = () => {
    if (savedAccounts.length === 0) {
      alert('Sin cuentas guardadas. Inicia sesión manualmente primero para habilitar el acceso rápido.');
      return;
    }
    if (savedAccounts.length === 1) {
      startBiometricScan(savedAccounts[0]);
    } else {
      setShowPicker(true);
    }
  };

  const startBiometricScan = (account) => {
    setShowPicker(false);
    setScanningAccount(account);
    setShowBiometricScan(true);
    
    // Simulate biometric scan for 1.8 seconds
    setTimeout(async () => {
      const user = await loginWithBiometric(account.email);
      setShowBiometricScan(false);
      setScanningAccount(null);
      if (!user) {
        alert('Autenticación fallida o usuario no válido.');
      }
    }, 1800);
  };

  const roleIcons = {
    superadmin: <Shield size={18} style={{ color: '#6C3FE8' }} />,
    admin: <Briefcase size={18} style={{ color: '#D4AF37' }} />,
    client: <User size={18} style={{ color: '#0FA46C' }} />,
  };

  const roleLabels = {
    superadmin: 'Super Admin',
    admin: 'Administrador',
    client: 'Cliente',
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-logo">
            <div className="logo-icon">S</div>
            SYNC
          </div>
          
          <h1 className="login-title">Préstamos Rápidos y Transparentes</h1>
          <p className="login-subtitle">
            Obtén el capital que necesitas para tus proyectos. Proceso 100% digital y seguro.
          </p>
          
          <div className="login-image-container">
             <img src={loginImage} alt="Ilustración Préstamos" className="login-image" />
          </div>
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-mobile-hero">
          <div className="login-logo">
            <div className="logo-icon">S</div>
            SYNC
          </div>
          <h1 className="login-title">Préstamos Rápidos y Transparentes</h1>
          <p className="login-subtitle">
            Obtén el capital que necesitas para tus proyectos. Proceso 100% digital y seguro.
          </p>
          <div className="login-image-container">
            <img src={loginImage} alt="Ilustración Préstamos" className="login-image" />
          </div>
        </div>
        <div className="login-card animate-fade">
          <h2>Iniciar sesión</h2>
          
          <form onSubmit={handleLogin}>
            <div className="login-form-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>1</span>
              <div style={{ flex: 1 }}>
                <label>Correo electrónico</label>
                <div className="login-input-wrapper">
                  <User size={18} />
                  <input
                    type="email"
                    className="login-input"
                    placeholder="usuario@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="login-form-group" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>2</span>
              <div style={{ flex: 1 }}>
                <label>Contraseña</label>
                <div className="login-input-wrapper">
                  <Lock size={18} />
                  <input
                    type="password"
                    className="login-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <button type="button" className="forgot-password" onClick={handleForgotPassword}>
              Olvidó su contraseña?
            </button>

            <button type="submit" className="login-btn" style={{ background: '#1e3a5f' }}>
              Iniciar sesión
            </button>
          </form>

          {savedAccounts.length > 0 && (
             <button 
               type="button" 
               onClick={handleBiometricPress}
               style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
             >
               <Fingerprint size={18} />
               Acceso Rápido
             </button>
          )}

          <div className="social-login-divider">O inicia sesión con</div>

          <div className="social-icons">
             {/* Note: In a real app we would use Google/Apple SVGs, using Lucide placeholders for now */}
             <div className="social-icon"><Globe size={20} /></div>
             <div className="social-icon"><Smartphone size={20} /></div>
             <div className="social-icon"><Mail size={20} /></div>
          </div>

          <div className="register-link">
            Aún no tienes cuenta? 
            <button type="button" onClick={() => setScreen('register')}>
              Regístrate ahora
            </button>
          </div>
        </div>
      </div>

      {/* Modals from previous code */}
      {showPicker && (
        <div className="modal-backdrop" onClick={() => setShowPicker(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Fingerprint size={20} style={{ color: 'var(--primary)' }} />
                Selecciona tu Cuenta
              </h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Escoge la cuenta con la que deseas iniciar sesión rápidamente en este navegador.
              </p>
              {savedAccounts.map((acc) => (
                <div 
                  key={acc.email} 
                  onClick={() => startBiometricScan(acc)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)', 
                    cursor: 'pointer',
                    backgroundColor: 'var(--surface-light)'
                  }}
                  className="menu-item"
                >
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--surface)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid var(--border)'
                  }}>
                    {roleIcons[acc.role] || <User size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{acc.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{acc.email}</div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: acc.role === 'admin' ? 'var(--admin-accent)' : 'var(--primary)' }}>
                    {roleLabels[acc.role]}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPicker(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showBiometricScan && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '340px', textAlign: 'center', padding: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div className="webcam-preview" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--primary)', backgroundColor: 'var(--surface-light)' }}>
                <Fingerprint size={64} style={{ color: 'var(--primary)', zIndex: 10 }} className="pulsing" />
                <div className="webcam-overlay-scan"></div>
              </div>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Escaneando huella...</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Iniciando sesión como <br /><strong>{scanningAccount?.name}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

