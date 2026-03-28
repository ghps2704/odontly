import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useNexus } from '@/contexts';
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  CircleDollarSign,
  Settings,
  Menu,
  X,
  Sparkles,
  Users,
  FileText,
  LogOut,
} from 'lucide-react';
import Logo from '@/components/ui/logo';
import { AICopilot } from '@/pages';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Visão Geral',
  '/contacts':  'Pacientes & Fornecedores',
  '/catalog':   'Catálogo de Insumos & Serviços',
  '/calendar':  'Agenda',
  '/fiscal':    'Gestão Fiscal',
  '/finance':   'Financeiro',
  '/settings':  'Configurações',
};

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { to: '/contacts',  icon: Users,           label: 'Pacientes' },
  { to: '/catalog',   icon: Package,         label: 'Insumos & Serviços' },
  { to: '/calendar',  icon: CalendarDays,    label: 'Agenda' },
  { to: '/fiscal',    icon: FileText,        label: 'Gestão Fiscal' },
  { to: '/finance',   icon: CircleDollarSign,label: 'Financeiro' },
];

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClose: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, onClose }) => (
  <NavLink
    to={to}
    onClick={onClose}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '7px 12px',
      borderRadius: 7,
      fontSize: 13,
      fontWeight: isActive ? 500 : 400,
      color: isActive ? '#ffffff' : '#64748b',
      background: isActive ? '#0284c7' : 'transparent',
      textDecoration: 'none',
      transition: 'background 0.15s, color 0.15s',
    })}
  >
    {({ isActive }) => (
      <>
        <Icon size={16} style={{ color: isActive ? '#ffffff' : '#334155', flexShrink: 0 }} />
        <span>{label}</span>
      </>
    )}
  </NavLink>
);

const Layout: React.FC = () => {
  const { settings, logout, user } = useNexus();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    sessionStorage.removeItem('odontly_pin_verified');
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f9ff', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* Sidebar — Desktop */}
      <aside
        className="hidden md:flex flex-col"
        style={{ width: 240, background: '#0a0f1e', flexShrink: 0, height: '100%', zIndex: 10 }}
      >
        <div style={{ padding: '20px 20px 12px' }}>
          <Logo size="md" variant="dark" />
        </div>

        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 4 }}>Clínica</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f9ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{settings.companyName}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ to, icon, label }) => <NavItem key={to} to={to} icon={icon} label={label} onClose={closeSidebar} />)}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e293b' }}>
            <NavItem to="/settings" icon={Settings} label="Configurações" onClose={closeSidebar} />
          </div>
        </nav>

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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 0' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f9ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{user?.name || settings.companyName}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Administrador</div>
            </div>
            <button
              onClick={() => setIsLogoutModalOpen(true)}
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
              {NAV_ITEMS.map(({ to, icon, label }) => <NavItem key={to} to={to} icon={icon} label={label} onClose={closeSidebar} />)}
              <NavItem to="/settings" icon={Settings} label="Configurações" onClose={closeSidebar} />
            </nav>
            <div style={{ paddingTop: 12, borderTop: '1px solid #1e293b' }}>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '8px 4px' }}
              >
                <LogOut size={16} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header
          className="hidden md:flex"
          style={{
            height: 56, background: '#ffffff', borderBottom: '0.5px solid #e0f2fe',
            alignItems: 'center', padding: '0 28px', flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500, color: '#0a0f1e' }}>
            {PAGE_LABELS[location.pathname] ?? ''}
          </span>
        </header>

        <main
          style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', paddingTop: 72 }}
          className="md:pt-6"
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>

      {isAIChatOpen && <AICopilot onClose={() => setIsAIChatOpen(false)} />}

      {isLogoutModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16, backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 360,
            padding: 28, textAlign: 'center',
            border: '0.5px solid #e0f2fe', boxShadow: '0 20px 60px rgba(10,15,30,0.15)',
          }}>
            <div style={{
              width: 44, height: 44, background: '#fee2e2', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: '#dc2626',
            }}>
              <LogOut size={20} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0a0f1e', marginBottom: 6 }}>
              Sair do sistema
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              Tem certeza que deseja encerrar a sessão?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setIsLogoutModalOpen(false)}
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
                onClick={handleLogout}
                style={{
                  flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500,
                  color: '#ffffff', background: '#dc2626',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
