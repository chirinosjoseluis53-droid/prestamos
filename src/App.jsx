import React, { useState, useEffect } from 'react';
import './App.css';
import './AdminNeo.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Screens
import Login from './screens/Login';
import Register from './screens/Register';
import KycFlow from './screens/KycFlow';
import ClientDashboard from './screens/ClientDashboard';
import LoanRequest from './screens/LoanRequest';
import ClientPay from './screens/ClientPay';
import SignedContracts from './screens/SignedContracts';
import ClientCalendar from './screens/ClientCalendar';
import ClientSupportChat from './screens/ClientSupportChat';
import ClientReports from './screens/ClientReports';
import ClientScore from './screens/ClientScore';
import ClientSettings from './screens/ClientSettings';
import ClientLoanContract from './screens/ClientLoanContract';
import ClientNotifications from './screens/ClientNotifications';
import AdminDashboard from './screens/AdminDashboard';
import AdminNotifications from './screens/AdminNotifications';
import AdminClients from './screens/AdminClients';
import AdminPaymentSettings from './screens/AdminPaymentSettings';
import SuperAdminDashboard from './screens/SuperAdminDashboard';

// Ported Admin Screens
import AdminActiveLoans from './screens/AdminActiveLoans';
import AdminLoanCalculator from './screens/AdminLoanCalculator';
import AdminPaymentCalendar from './screens/AdminPaymentCalendar';
import AdminRequests from './screens/AdminRequests';
import AdminPaymentsVerification from './screens/AdminPaymentsVerification';
import AdminSettings from './screens/AdminSettings';
import AppChatBot from './components/AppChatBot';

// ── New Feature Screens ──────────────────────────────────────────────────────
// Client Features
import ClientQRPayment from './screens/ClientQRPayment';
import CreditSimulator from './screens/CreditSimulator';
import ClientRefinance from './screens/ClientRefinance';
import ClientCollateral from './screens/ClientCollateral';
import ClientCreditHistory from './screens/ClientCreditHistory';
import ClientReferrals from './screens/ClientReferrals';
import ClientExportData from './screens/ClientExportData';
import ClientReceipt from './screens/ClientReceipt';

// Admin Features
import AdminRoles from './screens/AdminRoles';
import AdminAuditLog from './screens/AdminAuditLog';
import AdminReportsExport from './screens/AdminReportsExport';
import AdminReminders from './screens/AdminReminders';
import AdminCollectionScore from './screens/AdminCollectionScore';
import AdminMetrics from './screens/AdminMetrics';
import AdminCollectors from './screens/AdminCollectors';
import AdminContractTemplates from './screens/AdminContractTemplates';
import AdminComparisons from './screens/AdminComparisons';
import AdminBulkNotifications from './screens/AdminBulkNotifications';
import AdminGuarantees from './screens/AdminGuarantees';
import AdminCommLog from './screens/AdminCommLog';

// Shared Features
import MultiCurrencySettings from './screens/MultiCurrencySettings';
import LoanCategories from './screens/LoanCategories';
import VariableRates from './screens/VariableRates';
import GracePeriod from './screens/GracePeriod';
import CommunicationHistory from './screens/CommunicationHistory';

import {
  LayoutDashboard, CreditCard, DollarSign, FileText,
  Users, Settings, Shield, LogOut, Sun, Moon, Briefcase,
  Percent, Calendar, Calculator, Wallet, CheckSquare, Settings2,
  MessageSquare, Download, QrCode, TrendingUp, RefreshCw, Gem,
  History, UserPlus, Receipt, ShieldCheck, ClipboardList, BarChart3,
  BellRing, Target, Activity, Users2, FileEdit, GitCompareArrows,
  Send, Landmark, Layers, PercentCircle, Clock, MessageCircle,
  Globe, Tag, PercentIcon, Hourglass, PhoneForwarded
} from 'lucide-react';

// ─── Client Layout ─────────────────────────────────────────────────────────
function ClientLayout() {
  const { currentUser, logoutUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { getKycProfile, isKycComplete, isReady } = useData();
  const [tab, setTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loanData, setLoanData] = useState(null);

  if (!isReady) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando datos...</p>
        </div>
      </div>
    );
  }

  const kycComplete = isKycComplete(currentUser?.email);

  if (!kycComplete) {
    return <KycFlow />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: <LayoutDashboard size={20} /> },
    { id: 'loans', label: 'Solicitar', icon: <CreditCard size={20} /> },
    { id: 'simulator', label: 'Simulador', icon: <Calculator size={20} /> },
    { id: 'payments', label: 'Pagar', icon: <DollarSign size={20} /> },
    { id: 'qr-payment', label: 'Pago QR', icon: <QrCode size={20} /> },
    { id: 'receipt', label: 'Recibos', icon: <Receipt size={20} /> },
    { id: 'calendar', label: 'Calendario', icon: <Calendar size={20} /> },
    { id: 'contracts', label: 'Contratos', icon: <FileText size={20} /> },
    { id: 'refinance', label: 'Refinanciar', icon: <RefreshCw size={20} /> },
    { id: 'collateral', label: 'Garantías', icon: <Gem size={20} /> },
    { id: 'credit-history', label: 'Historial', icon: <History size={20} /> },
    { id: 'reports', label: 'Reportes', icon: <Download size={20} /> },
    { id: 'export-data', label: 'Exportar', icon: <ClipboardList size={20} /> },
    { id: 'referrals', label: 'Referidos', icon: <UserPlus size={20} /> },
    { id: 'comm-history', label: 'Comunicaciones', icon: <MessageCircle size={20} /> },
    { id: 'support', label: 'Soporte', icon: <MessageSquare size={20} /> },
    { id: 'settings', label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  const renderTab = () => {
    switch (tab) {
      case 'dashboard': return <ClientDashboard setTab={setTab} />;
      case 'loans': return <LoanRequest setTab={setTab} setLoanData={setLoanData} />;
      case 'loan-contract': return <ClientLoanContract setTab={setTab} loanData={loanData} />;
      case 'simulator': return <CreditSimulator />;
      case 'payments': return <ClientPay />;
      case 'qr-payment': return <ClientQRPayment />;
      case 'receipt': return <ClientReceipt />;
      case 'calendar': return <ClientCalendar />;
      case 'contracts': return <SignedContracts />;
      case 'refinance': return <ClientRefinance />;
      case 'collateral': return <ClientCollateral />;
      case 'credit-history': return <ClientCreditHistory />;
      case 'reports': return <ClientReports />;
      case 'export-data': return <ClientExportData />;
      case 'referrals': return <ClientReferrals />;
      case 'comm-history': return <CommunicationHistory setTab={setTab} />;
      case 'score': return <ClientScore />;
      case 'support': return <ClientSupportChat />;
      case 'settings': return <ClientSettings />;
      case 'notifications': return <ClientNotifications setTab={setTab} />;
      default: return <ClientDashboard setTab={setTab} />;
    }
  };

  return (
    <div className="app-container theme-admin-neo">
      <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
            {!sidebarCollapsed ? (
              <><div className="logo-icon">S</div> SYNC</>
            ) : (
              <div className="logo-icon" style={{ margin: 0 }}>S</div>
            )}
          </div>
        </div>
        {!sidebarCollapsed && (
          <div className="sidebar-brand" style={{ padding: '0 24px', marginBottom: '20px', fontSize: '15px', fontWeight: '700', color: 'var(--neo-text-primary)' }}>
            Prestamos <span style={{ color: 'var(--neo-accent)' }}>App</span>
          </div>
        )}

        <ul className="sidebar-menu" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
          {menuItems.map(item => (
            <li key={item.id}>
              <div
                className={`menu-item ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </div>
            </li>
          ))}
        </ul>
      </nav>

      <main className="main-content">
        <div className="top-bar">
          <div className="page-title">
            <h1>{menuItems.find(m => m.id === tab)?.label || 'Dashboard'}</h1>
          </div>
          <div className="top-bar-actions">
            <div className="user-profile-summary" style={{ gap: '10px' }}>
              <div className="user-avatar" style={{ width: '34px', height: '34px', fontSize: '13px', borderColor: 'var(--neo-accent)', color: 'var(--neo-accent)' }}>
                {(currentUser?.name || currentUser?.email || 'C')[0].toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name" style={{ fontSize: '13px', color: 'var(--neo-text-primary)' }}>{currentUser?.name || currentUser?.email}</div>
                <div className="user-role" style={{ color: 'var(--neo-accent)' }}>Cliente</div>
              </div>
            </div>
            <button className="top-bar-btn" onClick={toggleTheme}>
              {isDark ? <Sun size={18} style={{ color: '#F59E0B' }} /> : <Moon size={18} />}
            </button>
            <button className="top-bar-btn" onClick={logoutUser} style={{ color: 'var(--danger)' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="content-body animate-fade">
          {renderTab()}
        </div>
      </main>
      <AppChatBot />
    </div>
  );
}

// ─── Admin Layout ───────────────────────────────────────────────────────────
function AdminLayout() {
  const { currentUser, logoutUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [tab, setTab] = useState('dashboard');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'loans', label: 'Cartera de Préstamos', icon: <Wallet size={20} /> },
    { id: 'requests', label: 'Gestión de Solicitudes', icon: <CheckSquare size={20} /> },
    { id: 'verifications', label: 'Historial de Pagos', icon: <DollarSign size={20} /> },
    { id: 'clients', label: 'Clientes', icon: <Users size={20} /> },
    { id: 'calculator', label: 'Calculadora', icon: <Calculator size={20} /> },
    { id: 'calendar', label: 'Calendario', icon: <Calendar size={20} /> },
    { id: 'cobro-settings', label: 'Métodos de Cobro', icon: <Settings size={20} /> },
    { id: 'reports-export', label: 'Reportes PDF/CSV', icon: <Download size={20} /> },
    { id: 'roles', label: 'Roles y Permisos', icon: <ShieldCheck size={20} /> },
    { id: 'reminders', label: 'Recordatorios', icon: <BellRing size={20} /> },
    { id: 'collection-score', label: 'Score Cobranza', icon: <Target size={20} /> },
    { id: 'metrics', label: 'Métricas Mora', icon: <Activity size={20} /> },
    { id: 'collectors', label: 'Cobradores', icon: <Users2 size={20} /> },
    { id: 'contract-templates', label: 'Plantillas Contratos', icon: <FileEdit size={20} /> },
    { id: 'comparisons', label: 'Comparativas', icon: <GitCompareArrows size={20} /> },
    { id: 'bulk-notifications', label: 'Notif. Masivas', icon: <Send size={20} /> },
    { id: 'audit-log', label: 'Auditoría', icon: <ClipboardList size={20} /> },
    { id: 'admin-guarantees', label: 'Garantías', icon: <Gem size={20} /> },
    { id: 'comm-log', label: 'Comunicaciones', icon: <MessageCircle size={20} /> },
    { id: 'multi-currency', label: 'Multi-Moneda', icon: <Globe size={20} /> },
    { id: 'loan-categories', label: 'Categorías', icon: <Tag size={20} /> },
    { id: 'variable-rates', label: 'Tasas Variables', icon: <PercentCircle size={20} /> },
    { id: 'grace-period', label: 'Período Gracia', icon: <Hourglass size={20} /> },
    { id: 'settings', label: 'Ajustes', icon: <Settings2 size={20} /> },
  ];

  const renderTab = () => {
    switch (tab) {
      case 'dashboard': return <AdminDashboard setTab={setTab} />;
      case 'loans': return <AdminActiveLoans setTab={setTab} setSelectedLoan={setSelectedLoan} />;
      case 'requests': return <AdminRequests />;
      case 'verifications': return <AdminPaymentsVerification />;
      case 'clients': return <AdminClients />;
      case 'calculator': return <AdminLoanCalculator />;
      case 'calendar': return <AdminPaymentCalendar />;
      case 'cobro-settings': return <AdminPaymentSettings />;
      case 'reports-export': return <AdminReportsExport />;
      case 'roles': return <AdminRoles />;
      case 'reminders': return <AdminReminders />;
      case 'collection-score': return <AdminCollectionScore />;
      case 'metrics': return <AdminMetrics />;
      case 'collectors': return <AdminCollectors />;
      case 'contract-templates': return <AdminContractTemplates />;
      case 'comparisons': return <AdminComparisons />;
      case 'bulk-notifications': return <AdminBulkNotifications />;
      case 'audit-log': return <AdminAuditLog />;
      case 'admin-guarantees': return <AdminGuarantees />;
      case 'comm-log': return <AdminCommLog setTab={setTab} />;
      case 'multi-currency': return <MultiCurrencySettings />;
      case 'loan-categories': return <LoanCategories />;
      case 'variable-rates': return <VariableRates />;
      case 'grace-period': return <GracePeriod />;
      case 'settings': return <AdminSettings setTab={setTab} />;
      case 'notifications': return <AdminNotifications setTab={setTab} />;
      default: return <AdminDashboard setTab={setTab} />;
    }
  };

  return (
    <div className="app-container theme-admin-neo">
      {/* Sidebar */}
      <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ minWidth: sidebarCollapsed ? '80px' : '240px' }}>
        <div className="sidebar-header">
          <div className="logo" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
            {!sidebarCollapsed ? (
              <><div className="logo-icon">S</div> SYNC</>
            ) : (
              <div className="logo-icon" style={{ margin: 0 }}>S</div>
            )}
          </div>
        </div>
        
        {!sidebarCollapsed && (
          <div className="sidebar-brand" style={{ padding: '0 24px', marginBottom: '20px', fontSize: '15px', fontWeight: '700', color: 'var(--neo-text-primary)' }}>
            Prestamos <span style={{ color: 'var(--neo-accent)' }}>Admin</span>
          </div>
        )}

        <ul className="sidebar-menu" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
          {menuItems.map(item => (
            <li key={item.id}>
              <div
                className={`menu-item menu-item-admin ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </div>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <div className="page-title">
            {tab === 'dashboard' ? (
              <h1>Dashboard <span>Admin</span></h1>
            ) : (
              <h1>{menuItems.find(m => m.id === tab)?.label || 'Panel Admin'}</h1>
            )}
          </div>
          <div className="top-bar-actions">
            <div className="user-profile-summary" style={{ gap: '10px' }}>
              <div className="user-avatar" style={{ width: '34px', height: '34px', fontSize: '13px', borderColor: 'var(--admin-accent)', color: 'var(--admin-accent)' }}>
                <Briefcase size={16} />
              </div>
              <div className="user-details">
                <div className="user-name" style={{ fontSize: '13px' }}>{currentUser?.name || currentUser?.email}</div>
                <div className="user-role" style={{ color: 'var(--admin-accent)' }}>Administrador</div>
              </div>
            </div>
            <button className="top-bar-btn" onClick={toggleTheme}>
              {isDark ? <Sun size={18} style={{ color: '#F59E0B' }} /> : <Moon size={18} />}
            </button>
            <button className="top-bar-btn" onClick={logoutUser} style={{ color: 'var(--danger)' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="content-body animate-fade">
          {renderTab()}
        </div>
      </main>
      <AppChatBot />
    </div>
  );
}

// ─── Super Admin Layout ──────────────────────────────────────────────────────
function SuperAdminLayout() {
  const { currentUser, logoutUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-container theme-admin-neo">
      <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ minWidth: sidebarCollapsed ? '80px' : '240px' }}>
        <div className="sidebar-header">
          <div className="logo" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
            {!sidebarCollapsed ? (
              <><div className="logo-icon">S</div> SYNC</>
            ) : (
              <div className="logo-icon" style={{ margin: 0 }}>S</div>
            )}
          </div>
        </div>
        {!sidebarCollapsed && (
          <div className="sidebar-brand" style={{ padding: '0 24px', marginBottom: '20px', fontSize: '15px', fontWeight: '700', color: 'var(--neo-text-primary)' }}>
            Prestamos <span style={{ color: 'var(--neo-accent)' }}>SuperAdmin</span>
          </div>
        )}
        <ul className="sidebar-menu">
          <li>
            <div className="menu-item active" title={sidebarCollapsed ? 'Control Total' : undefined}>
              <Shield size={20} />
              {!sidebarCollapsed && <span>Control Total</span>}
            </div>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        <div className="top-bar">
          <div className="page-title"><h1>Consola Super Admin</h1></div>
          <div className="top-bar-actions">
            <div className="user-profile-summary" style={{ gap: '10px' }}>
              <div className="user-avatar" style={{ width: '34px', height: '34px', fontSize: '13px', borderColor: 'var(--neo-accent)', color: 'var(--neo-accent)' }}>
                <Shield size={16} />
              </div>
              <div className="user-details">
                <div className="user-name" style={{ fontSize: '13px', color: 'var(--neo-text-primary)' }}>{currentUser?.name || currentUser?.email}</div>
                <div className="user-role" style={{ color: 'var(--neo-accent)' }}>Super Admin</div>
              </div>
            </div>
            <button className="top-bar-btn" onClick={toggleTheme}>
              {isDark ? <Sun size={18} style={{ color: '#F59E0B' }} /> : <Moon size={18} />}
            </button>
            <button className="top-bar-btn" onClick={logoutUser} style={{ color: 'var(--danger)' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="content-body animate-fade">
          <SuperAdminDashboard />
        </div>
      </main>
      <AppChatBot />
    </div>
  );
}

// ─── App Router ──────────────────────────────────────────────────────────────
function AppRouter() {
  const { currentUser } = useAuth();
  const [authScreen, setAuthScreen] = useState('login');

  if (!currentUser) {
    if (authScreen === 'register') return <Register setScreen={setAuthScreen} />;
    return <Login setScreen={setAuthScreen} />;
  }

  if (currentUser.banned) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
        <div className="premium-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '48px' }}>
          <Shield size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px auto' }} />
          <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>Cuenta Suspendida</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Tu cuenta ha sido bloqueada por el administrador. Contáctalo para más información.
          </p>
        </div>
      </div>
    );
  }

  if (currentUser.isSuperAdmin) return <SuperAdminLayout />;
  if (currentUser.isAdmin) return <AdminLayout />;
  return <ClientLayout />;
}

// ─── Root Export ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <AppRouter />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
