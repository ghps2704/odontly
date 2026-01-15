
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
  Hexagon,
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

const Layout: React.FC = () => {
  const { settings, verifyPin, logout, user } = useNexus();
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pendingView, setPendingView] = useState<ViewState | null>(null);

  // Security Wrapper for Protected Views
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
    if (window.confirm("Deseja realmente sair do sistema?")) {
      logout();
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => handleViewChange(view)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-white/10 text-white font-semibold border-l-4 border-amber-400' 
          : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside 
        className="hidden md:flex flex-col w-64 h-full shadow-xl z-10 text-white"
        style={{ backgroundColor: settings.primaryColor }}
      >
        <div className="p-6 flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg">
             <Hexagon size={24} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              So<span className="text-amber-400 font-black italic">z</span>io <span className="font-light text-slate-300 text-base">ERP</span>
            </h1>
          </div>
        </div>

        <div className="px-6 pb-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Empresa</p>
            <div className="text-sm font-medium truncate">{settings.companyName}</div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">{user?.email}</div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem view="CONTACTS" icon={Users} label="Contatos" />
          <NavItem view="CATALOG" icon={Package} label="Catálogo" />
          <NavItem view="CALENDAR" icon={CalendarDays} label="Agenda" />
          <NavItem view="FISCAL" icon={FileText} label="Gestão Fiscal" />
          <NavItem view="FINANCE" icon={CircleDollarSign} label="Financeiro" />
          <div className="pt-4 mt-4 border-t border-white/10">
            <NavItem view="SETTINGS" icon={Settings} label="Configurações" />
          </div>
        </nav>

        <div className="p-4 space-y-2">
            <button 
                onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white p-3 rounded-lg shadow-lg hover:shadow-amber-500/30 transition-all border border-white/10 hover:scale-[1.02] active:scale-95"
            >
                <Sparkles size={18} />
                <span className="font-bold text-sm">Sozio AI</span>
            </button>
            <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all text-xs"
            >
                <LogOut size={16} />
                <span>Sair do Sistema</span>
            </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full h-16 bg-white shadow-md z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
             <div className="p-1.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg">
                 <Hexagon size={18} className="text-white fill-white" />
             </div>
             <div className="font-bold text-lg text-slate-800">Sozio ERP</div>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)}>
           <div 
             className="w-64 h-full shadow-2xl p-4 flex flex-col text-white"
             style={{ backgroundColor: settings.primaryColor }}
             onClick={e => e.stopPropagation()}
           >
              <div className="flex justify-between items-center mb-8">
                 <h2 className="font-bold text-xl flex items-center gap-2">
                    <Hexagon size={20} className="text-amber-400" /> Sozio ERP
                 </h2>
                 <button onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
              </div>
              <nav className="flex-1 space-y-2">
                <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Visão Geral" />
                <NavItem view="CONTACTS" icon={Users} label="Contatos" />
                <NavItem view="CATALOG" icon={Package} label="Catálogo" />
                <NavItem view="CALENDAR" icon={CalendarDays} label="Agenda" />
                <NavItem view="FISCAL" icon={FileText} label="Gestão Fiscal" />
                <NavItem view="FINANCE" icon={CircleDollarSign} label="Financeiro" />
                <NavItem view="SETTINGS" icon={Settings} label="Configurações" />
              </nav>
              <div className="pt-4 border-t border-white/10 space-y-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 text-slate-300 hover:text-white rounded-lg"
                  >
                    <LogOut size={20} />
                    <span>Sair</span>
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200">
                <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                    <Lock size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Área Restrita</h3>
                <p className="text-sm text-slate-500 mb-6">Digite o PIN de administrador para acessar o módulo financeiro do Sozio.</p>
                
                <input 
                    type="password" 
                    className={`w-full text-center text-2xl tracking-widest border rounded-lg p-3 mb-4 font-mono outline-none focus:ring-2 focus:ring-slate-500/50 transition-all text-slate-900 bg-slate-50 ${pinError ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300'}`}
                    maxLength={4}
                    value={pinInput}
                    autoFocus
                    placeholder="0000"
                    onChange={e => {
                        setPinInput(e.target.value);
                        setPinError(false);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                />
                
                {pinError && (
                    <p className="text-red-500 text-sm font-medium mb-4 animate-pulse">
                        PIN incorreto.
                    </p>
                )}

                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsPinModalOpen(false)}
                        className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePinSubmit}
                        className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors shadow-lg"
                    >
                        Acessar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 relative bg-slate-50">
        {currentView === 'DASHBOARD' && <Dashboard onNavigate={setCurrentView} />}
        {currentView === 'CONTACTS' && <Contacts />}
        {currentView === 'CATALOG' && <Catalog />}
        {currentView === 'CALENDAR' && <Calendar />}
        {currentView === 'FISCAL' && <Fiscal />}
        {currentView === 'FINANCE' && <Finance onNavigate={setCurrentView} />}
        {currentView === 'SETTINGS' && <SettingsView />}
      </main>

      {/* AI Chat Widget */}
      {isAIChatOpen && (
          <AICopilot onClose={() => setIsAIChatOpen(false)} />
      )}
    </div>
  );
};

export default Layout;
