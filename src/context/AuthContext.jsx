import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import localdb from '../lib/localdb';
import { validatePassword, clearAllLocalStorage } from '../lib/sanitize';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const SAVED_ACCOUNTS_KEY = '@prestamos_saved_accounts';

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authErrorMessage(error) {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido. Ejemplo: nombre@correo.com';
    case 'auth/email-already-in-use':
      return 'Este correo ya está registrado';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Credenciales incorrectas';
    default:
      return error.message || 'Error de autenticación';
  }
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const email = normalizeEmail(firebaseUser.email);
        const profile = await resolveProfile(email);
        if (profile && !profile.banned) {
          setCurrentUser(profile);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsReady(true);
    });
    return unsubscribe;
  }, []);

  const saveAccountForBiometrics = async (profile) => {
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      const accounts = raw ? JSON.parse(raw) : [];
      const exists = accounts.find(a => a.email === profile.email);
      if (!exists) {
        const accountEntry = {
          email: profile.email,
          name: profile.name || profile.email,
          role: profile.isSuperAdmin ? 'superadmin' : profile.isAdmin ? 'admin' : 'client',
          adminId: profile.adminId || null,
        };
        accounts.push(accountEntry);
        localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    } catch (e) {
      // Silent fail for biometrics save
    }
  };

  const getSavedAccounts = async () => {
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const removeSavedAccount = async (email) => {
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      const accounts = raw ? JSON.parse(raw) : [];
      const updated = accounts.filter(a => a.email !== email);
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const loginWithBiometric = async (email) => {
    try {
      if (email.toLowerCase() === 'dueno@prestamos.com') {
        const profile = { id: 'superadmin', email, isSuperAdmin: true, name: 'Dueño de App' };
        setCurrentUser(profile);
        return profile;
      }
      const admin = await localdb.findAdminByEmail(email);
      if (admin) {
        if (admin.status === 'blocked') return { banned: true };
        const profile = { id: admin.id, email: admin.email, isAdmin: true, name: admin.company_name, inviteCode: admin.invite_code };
        setCurrentUser(profile);
        return profile;
      }
      const client = await localdb.findClientByEmail(email);
      if (client) {
        if (client.status === 'blocked') return { banned: true };
        const profile = { id: client.id, email: client.email, isAdmin: false, adminId: client.admin_id };
        setCurrentUser(profile);
        return profile;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const resolveProfile = async (email) => {
    if (email === 'dueno@prestamos.com') {
      return { id: 'superadmin', email, isSuperAdmin: true, name: 'Dueño de App' };
    }
    const admin = await localdb.findAdminByEmail(email);
    if (admin) {
      if (admin.status === 'blocked') return { banned: true };
      return {
        id: admin.id,
        email: admin.email,
        isAdmin: true,
        name: admin.company_name,
        inviteCode: admin.invite_code,
      };
    }

    const client = await localdb.findClientByEmail(email);
    if (client) {
      if (client.status === 'blocked') return { banned: true };
      return {
        id: client.id,
        email: client.email,
        isAdmin: false,
        adminId: client.admin_id,
        name: client.nombre,
      };
    }

    return null;
  };

  const registerUser = async (userData) => {
    const email = normalizeEmail(userData.email);
    const password = (userData.password || '').trim();

    if (!isValidEmail(email)) {
      const message = 'Ingresa un correo válido. Ejemplo: nombre@correo.com';
      alert(message);
      return { success: false, error: message };
    }

    if (password.length < 8) {
      const message = 'La contraseña debe tener al menos 8 caracteres';
      alert(message);
      return { success: false, error: message };
    }

    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      const message = `La contraseña debe tener: ${pwErrors.join(', ')}`;
      alert(message);
      return { success: false, error: message };
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const id = userData.id || credential.user.uid;

      if (userData.isAdmin) {
        await localdb.createAdmin({
          id,
          email,
          company_name: userData.name,
        });
      } else {
        await localdb.createClient({
          id,
          email,
          nombre: userData.name,
          adminId: userData.adminId,
        });
      }

      await signOut(auth);
      return { success: true };
    } catch (error) {
      const message = authErrorMessage(error);
      alert(message);
      return { success: false, error: message };
    }
  };

  const loginUser = async (email, password) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = (password || '').trim();

    if (!isValidEmail(normalizedEmail)) {
      alert('Ingresa un correo válido. Ejemplo: nombre@correo.com');
      return null;
    }

    try {
      if (normalizedEmail === 'dueno@prestamos.com') {
        await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
        const profile = { id: 'superadmin', email: normalizedEmail, isSuperAdmin: true, name: 'Dueño de App' };
        setCurrentUser(profile);
        await saveAccountForBiometrics(profile);
        return profile;
      }

      await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
      const profile = await resolveProfile(normalizedEmail);

      if (!profile) {
        await signOut(auth);
        alert('Usuario no encontrado en el sistema');
        return null;
      }

      if (profile.banned) {
        await signOut(auth);
        return profile;
      }

      setCurrentUser(profile);
      await saveAccountForBiometrics(profile);
      return profile;
    } catch (error) {
      alert(authErrorMessage(error));
      return null;
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // Silent fail
    }
    setCurrentUser(null);
    clearAllLocalStorage();
  };

  const resetAdminPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Se envió un enlace para restablecer la contraseña a ${email}`);
      return true;
    } catch (error) {
      alert(error.message || 'No se pudo enviar el correo de restablecimiento');
      return false;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No hay sesión activa');
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      return { success: true };
    } catch (error) {
      let message = 'No se pudo cambiar la contraseña';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/weak-password') {
        message = 'La nueva contraseña debe tener al menos 8 caracteres con mayúscula, minúscula, número y carácter especial';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Por seguridad, cierra sesión y vuelve a iniciar para cambiar tu contraseña';
      }
      return { success: false, error: message };
    }
  };

  if (!isReady) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <div className="spinner" style={{ width: '50px', height: '50px', border: '5px solid #1e293b', borderTopColor: '#0FA46C', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      registerUser,
      loginUser,
      loginWithBiometric,
      logoutUser,
      resetAdminPassword,
      changePassword,
      getSavedAccounts,
      removeSavedAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
