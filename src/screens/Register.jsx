import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import localdb from '../lib/localdb';
import { User, Mail, Lock, Key, ArrowLeft, Check } from 'lucide-react';
import loginImage from '../assets/login-image.jpg';
import './Login.css';

export default function Register({ setScreen }) {
  const { registerUser } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminId, setAdminId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedCode = adminId.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedCode) {
      alert('Por favor llena todos los campos, incluyendo el código requerido.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      alert('Ingresa un correo válido. Ejemplo: nombre@correo.com');
      return;
    }

    setLoading(true);
    const payload = { name: trimmedName, email: trimmedEmail, password: trimmedPassword, isAdmin, adminId: null };

    if (isAdmin) {
      if (trimmedCode !== 'PRO-2026') {
        setLoading(false);
        alert('El código de dueño para crear administradores es incorrecto.');
        return;
      }
    } else {
      try {
        const admin = await localdb.findAdminByInviteCode(trimmedCode);
        if (!admin) {
          setLoading(false);
          alert('No se encontró ningún administrador con ese código de invitación.');
          return;
        }
        payload.adminId = admin.id;
      } catch (error) {
        setLoading(false);
        alert('No se pudo validar el código. Verifica tu conexión e intenta de nuevo.');
        return;
      }
    }

    const result = await registerUser(payload);
    setLoading(false);

    if (result.success) {
      alert('Cuenta creada correctamente. Ahora puedes iniciar sesión.');
      setScreen('login');
    }
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
        <div className="login-card animate-fade" style={{ maxWidth: '420px', padding: '24px 32px' }}>
          <button 
            onClick={() => setScreen('login')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'none', 
              border: 'none', 
              color: '#64748b', 
              fontSize: '13px', 
              cursor: 'pointer',
              marginBottom: '12px',
              fontWeight: '500'
            }}
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          <h2 style={{ marginBottom: '4px' }}>Crea tu cuenta</h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
            Únete a nuestra plataforma
          </p>
          
          <form onSubmit={handleRegister}>
            <div className="login-form-group" style={{ marginBottom: '12px' }}>
              <label>Nombre Completo</label>
              <div className="login-input-wrapper">
                <User size={18} />
                <input
                  type="text"
                  className="login-input"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-form-group" style={{ marginBottom: '12px' }}>
              <label>Correo electrónico</label>
              <div className="login-input-wrapper">
                <Mail size={18} />
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

            <div className="login-form-group" style={{ marginBottom: '12px' }}>
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

            <div 
              onClick={() => setIsAdmin(!isAdmin)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px', userSelect: 'none' }}
            >
              <div style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '4px', 
                border: isAdmin ? 'none' : '1px solid #cbd5e1', 
                background: isAdmin ? '#203A4C' : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                transition: 'all 0.2s'
              }}>
                {isAdmin && <Check size={14} />}
              </div>
              <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>Registrar como administrador</span>
            </div>

            <div className="login-form-group" style={{ marginBottom: '16px' }}>
              <label>
                {isAdmin ? 'Código de Dueño (Superadmin)' : 'Código de Invitación (Administrador)'}
              </label>
              <div className="login-input-wrapper">
                <Key size={18} />
                <input
                  type="text"
                  className="login-input"
                  placeholder={isAdmin ? "Ej. PRO-2026" : "Ej. AD-X8F9"}
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'CREANDO CUENTA...' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
