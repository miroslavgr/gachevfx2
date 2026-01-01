
import React from 'react';
import { User, UserRole, Notification } from '../types';
import { LogOut, LayoutDashboard, LineChart, MessageSquare, ShieldCheck, User as UserIcon, Bell, Compass, Users, PlayCircle, BookOpen, Globe, Settings, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout: () => void;
  notifications?: Notification[];
}

const Layout: React.FC<LayoutProps> = ({ children, currentUser, onNavigate, currentPage, onLogout, notifications = [] }) => {
  const { t, language, setLanguage } = useLanguage();

  if (!currentUser) {
    return <div className="min-h-screen text-white">{children}</div>;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'course', label: t('nav.course'), icon: BookOpen },
    { id: 'outlook', label: t('nav.outlook'), icon: Compass },
    { id: 'trades', label: t('nav.trades'), icon: LineChart },
    { id: 'archive', label: t('nav.archive'), icon: PlayCircle },
    { id: 'traders', label: t('nav.traders'), icon: Users },
    { id: 'community', label: t('nav.community'), icon: MessageSquare },
    { id: 'notifications', label: t('nav.notifications'), icon: Bell, badge: unreadCount },
    // Profile removed from here as requested
  ];

  if (currentUser.role === UserRole.ADMIN) {
    navItems.push({ id: 'admin', label: t('nav.admin'), icon: ShieldCheck });
  }

  return (
    <div className="flex h-screen text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 glass-panel border-r border-slate-700/50 flex flex-col z-20">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-2xl font-serif font-bold gold-gradient tracking-wide cursor-pointer" onClick={() => onNavigate('dashboard')}>
                  {t('app.name')}
                </h1>
                <p className="text-xs text-slate-400 mt-1">{t('app.slogan')}</p>
             </div>
             
             {/* Language Dropdown */}
             <div className="relative group">
                 <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="appearance-none bg-slate-900 border border-slate-700 rounded text-[10px] font-bold text-slate-300 pl-2 pr-6 py-1 outline-none focus:border-gold-500 cursor-pointer uppercase"
                 >
                     <option value="bg">BG</option>
                     <option value="en">EN</option>
                 </select>
                 <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
             </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                currentPage === item.id
                  ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                  : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/30">
                      {item.badge}
                  </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('profile')}>
                <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-gold-500/50" />
                <div className="overflow-hidden">
                  <p className="font-semibold text-sm truncate text-white">{currentUser.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{currentUser.role}</p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('profile')}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Settings / Profile"
              >
                  <Settings size={18} />
              </button>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-red-900/30 hover:text-red-400 text-slate-400 transition-colors text-sm border border-slate-700/50"
          >
            <LogOut size={16} />
            {t('nav.signout')}
          </button>
        </div>
      </div>

      {/* Main Content - Clean Background */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="relative z-10 p-8 min-h-full">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
