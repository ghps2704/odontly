
import React, { useState } from 'react';
import { useNexus } from '../store/NexusContext';
import { ViewState } from '../types';
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  CircleDollarSign,
  Settings,
  Menu,
  X,
  Sparkles,
  Lock,
  Users,
  FileText,
  LogOut
} from 'lucide-react';
import Dashboard from './Dashboard';
import Catalog from './Catalog';
import Calendar from './Calendar';
import Finance from './Finance';
import SettingsView from './Settings';
import AICopilot from './AICopilot';
import Contacts from './Contacts';
import Fiscal from './Fiscal';
import Logo from './ui/logo';

const Layout: React.FC = () => {
  const { settings, verifyPin, logout, user } = useNexus();
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pendingView, setPendingView] = useState<ViewState | null>(null);

  const handleViewChange = (view: ViewState) => {
    if (view === 'FINANCE' || view === 'SETTINGS') {
      setPendingView(view);
      setPinInput('');
      setPinError(false);
      setIsPinModalOpen(true);
    } else {
      setCurrentView(view);
      setIsSidebarOpen(false);
    }
  };

  const handlePinSubmit = () => {
    if (verifyPin(pinInput)) {
      if (pendingView) setCurrentView(pendingView);
      setIsPinModalOpen(false);
      setIsSidebarOpen(false);
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair?')) logout();
  };

  const pageLabels: Record<ViewState, string> = {
    DASHBOARD: 'Painel de Controle',
    CONTACTS: 'Contatos',
    CATALOG: 'Catálogo',
    CALENDAR: 'Agenda',
    FISCAL: 'Gestão Fiscal',
    FINANCE: 'Financeiro',
    SETTINGS: 'Configurações',
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => {
    const active = currentView === view;
    return (
      <button
        onClick={() => handleViewChange(view)}
        className="flex items-center w-full transition-all"
        style={{
          gap: 10,
          padding: '7px 12px',
          borderRadius: 7,
          fontSize: 13,
          fontWeight: active ? 500 : 400,
          color: active ? '#ffffff' : '#64748b',
          background: active ? '#0284c7' : 'transparent',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#f0f9ff'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
      >
        <Icon size={16} style={{ color: active ? '#ffffff' : '#334155', flexShrink: 0 }} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f9ff', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* Sidebar — Desktop */}
      <aside
        className="hidden md:flex flex-col"
        style={{ width: 240, background: '#0a0f1e', flexShrink: 0, height: '100%', zIndex: 10 }}
      >
        {/* Logo area */}
        <div style={{ padding: '20px 20px 12px' }}>
          <Logo size="md" variant="dark" />
        </div>

        {/* Company info */}
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 4 }}>Clínica</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f9ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{settings.companyName}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem view="CONTACTS" icon={Users} label="Contatos" />
          <NavItem view="CATALOG" icon={Package} label="Catálogo" />
          <NavItem view="CALENDAR" icon={CalendarDays} label="Agenda" />
          <NavItem view="FISCAL" icon={FileText} label="Gestão Fiscal" />
          <NavItem view="FINANCE" icon={CircleDollarSign} label="Financeiro" />
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e293b' }}>
            <NavItem view="SETTINGS" icon={Settings} label="Configurações" />
          </div>
        </nav>

        {/* Bottom: AI + Logout */}
        <div style={{ padding: '12px 12px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => setIsAIChatOpen(!isAIChatOpen)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#0284c7', color: '#ffffff', padding: '9px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0369a1')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0284c7')}
          >
            <Sparkles size={15} />
            <span>Odontly AI</span>
          </button>

          {/* User section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 0' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f9ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{user?.name || settings.companyName}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Administrador</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f0f9ff'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, width: '100%', height: 56,
          background: '#ffffff', borderBottom: '0.5px solid #e0f2fe',
          zIndex: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
        }}
      >
        <Logo size="sm" variant="light" />
        <button onClick={() => setIsSidebarOpen(true)} style={{ color: '#0a0f1e', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: 50, background: 'rgba(10,15,30,0.5)' }}
          onClick={() => setIsSidebarOpen(false)}
        >
          <div
            style={{ width: 240, height: '100%', background: '#0a0f1e', display: 'flex', flexDirection: 'column', padding: 16 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Logo size="sm" variant="dark" />
              <button onClick={() => setIsSidebarOpen(false)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Visão Geral" />
              <NavItem view="CONTACTS" icon={Users} label="Contatos" />
              <NavItem view="CATALOG" icon={Package} label="Catálogo" />
              <NavItem view="CALENDAR" icon={CalendarDays} label="Agenda" />
              <NavItem view="FISCAL" icon={FileText} label="Gestão Fiscal" />
              <NavItem view="FINANCE" icon={CircleDollarSign} label="Financeiro" />
              <NavItem view="SETTINGS" icon={Settings} label="Configurações" />
            </nav>
            <div style={{ paddingTop: 12, borderTop: '1px solid #1e293b' }}>
              <button
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '8px 4px' }}
              >
                <LogOut size={16} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {isPinModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: 16, backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 360,
            padding: 28, textAlign: 'center',
            border: '0.5px solid #e0f2fe', boxShadow: '0 20px 60px rgba(10,15,30,0.15)',
          }}>
            <div style={{
              width: 44, height: 44, background: '#e0f2fe', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: '#0284c7',
            }}>
              <Lock size={20} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0a0f1e', marginBottom: 6 }}>Área Restrita</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
              Digite o PIN do administrador para continuar.
            </p>

            <input
              type="password"
              style={{
                width: '100%', textAlign: 'center', fontSize: 22, letterSpacing: '0.3em',
                border: pinError ? '1.5px solid #dc2626' : '1.5px solid #e0f2fe',
                borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                fontFamily: 'monospace', outline: 'none', color: '#0a0f1e',
                background: '#f0f9ff', boxSizing: 'border-box',
                boxShadow: pinError ? '0 0 0 3px rgba(220,38,38,0.15)' : undefined,
              }}
              maxLength={4}
              value={pinInput}
              autoFocus
              placeholder="0000"
              onChange={e => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
            />

            {pinError && (
              <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 500, marginBottom: 12 }}>PIN incorreto.</p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setIsPinModalOpen(false)}
                style={{
                  flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500,
                  color: '#64748b', background: 'transparent',
                  border: '1.5px solid #e0f2fe', borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Cancelar
              </button>
              <button
                onClick={handlePinSubmit}
                style={{
                  flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500,
                  color: '#ffffff', background: '#0284c7',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0369a1')}
                onMouseLeave={e => (e.currentTarget.style.background = '#0284c7')}
              >
                Acessar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Bar */}
        <header
          className="hidden md:flex"
          style={{
            height: 56, background: '#ffffff', borderBottom: '0.5px solid #e0f2fe',
            alignItems: 'center', padding: '0 28px', flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500, color: '#0a0f1e' }}>{pageLabels[currentView]}</span>
        </header>

        <main
          style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', paddingTop: 72 }}
          className="md:pt-6"
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {currentView === 'DASHBOARD' && <Dashboard onNavigate={setCurrentView} />}
            {currentView === 'CONTACTS' && <Contacts />}
            {currentView === 'CATALOG' && <Catalog />}
            {currentView === 'CALENDAR' && <Calendar />}
            {currentView === 'FISCAL' && <Fiscal />}
            {currentView === 'FINANCE' && <Finance onNavigate={setCurrentView} />}
            {currentView === 'SETTINGS' && <SettingsView />}
          </div>
        </main>
      </div>

      {isAIChatOpen && <AICopilot onClose={() => setIsAIChatOpen(false)} />}
    </div>
  );
};

export default Layout;
