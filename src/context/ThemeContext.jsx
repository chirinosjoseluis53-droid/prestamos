import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const getThemeColors = (isDark) => ({
  background: isDark ? '#121619' : '#F8FAFC',
  surface: isDark ? '#1E2528' : '#FFFFFF',
  surfaceLight: isDark ? '#2C3539' : '#F1F5F9',
  primary: '#0FA46C',
  primaryLight: '#20C887',
  text: isDark ? '#FFFFFF' : '#0F172A',
  textSecondary: isDark ? '#A0AAB2' : '#64748B',
  adminAccent: '#D4AF37',
  adminAccentLight: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.1)',
  danger: '#E74C3C',
  warning: '#F39C12',
  success: '#2ECC71',
  border: isDark ? '#2C3539' : '#E2E8F0',
});

// Paleta Neomórfica – se inyecta en :root para que sea heredada por TODOS los layouts
const applyNeoTheme = (isDark) => {
  const root = document.documentElement;

  if (isDark) {
    // Modo oscuro Neo
    root.style.setProperty('--background',    '#0e1a22');
    root.style.setProperty('--surface',       '#1B2E3A');
    root.style.setProperty('--surface-light', '#243544');
    root.style.setProperty('--text',          '#FFFFFF');
    root.style.setProperty('--text-secondary','#94A3B8');
    root.style.setProperty('--primary',       '#2EE5C2');
    root.style.setProperty('--primary-light', '#5EEDD1');
    root.style.setProperty('--border',        'rgba(46,229,194,0.12)');
    root.style.setProperty('--shadow',        '0 4px 24px rgba(0,0,0,0.3)');
    root.style.setProperty('--shadow-lg',     '0 10px 40px rgba(0,0,0,0.4)');
    root.style.setProperty('--shadow-primary','0 10px 24px rgba(46,229,194,0.25)');
    root.style.setProperty('--success',       '#2ECC71');
    root.style.setProperty('--warning',       '#F39C12');
    root.style.setProperty('--danger',        '#E74C3C');
    root.style.setProperty('--admin-accent',  '#D4AF37');
  } else {
    // Modo claro Neo
    root.style.setProperty('--background',    '#EBF5F5');
    root.style.setProperty('--surface',       '#FFFFFF');
    root.style.setProperty('--surface-light', '#E0F2F1');
    root.style.setProperty('--text',          '#0F2B2B');
    root.style.setProperty('--text-secondary','#64888A');
    root.style.setProperty('--primary',       '#0BA8A0');
    root.style.setProperty('--primary-light', '#1CC9C0');
    root.style.setProperty('--border',        'rgba(11,168,160,0.18)');
    root.style.setProperty('--shadow',        '0 4px 16px rgba(11,168,160,0.08)');
    root.style.setProperty('--shadow-lg',     '0 10px 32px rgba(11,168,160,0.12)');
    root.style.setProperty('--shadow-primary','0 8px 20px rgba(11,168,160,0.25)');
    root.style.setProperty('--success',       '#059669');
    root.style.setProperty('--warning',       '#F39C12');
    root.style.setProperty('--danger',        '#E74C3C');
    root.style.setProperty('--admin-accent',  '#D4AF37');
  }
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('@theme_mode');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }
    // Aplicar paleta Neo directamente en :root para máxima compatibilidad
    applyNeoTheme(isDark);
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('@theme_mode', next ? 'dark' : 'light');
      return next;
    });
  };

  const colors = getThemeColors(isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
