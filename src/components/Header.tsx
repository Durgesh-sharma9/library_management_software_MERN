import React from 'react';
import { Menu, LogOut, School, Sparkles, Bell, Calendar, UserCheck, PanelLeftClose, PanelLeftOpen, Download, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { usePWA } from '../context/PWAContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenMobileMenu,
  onToggleCollapse,
  isCollapsed = false,
  title = 'Overview',
  subtitle,
}) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { promptInstall, openInstallModal, isInstalled } = usePWA();

  const handleMenuClick = () => {
    if (onOpenMobileMenu) onOpenMobileMenu();
    else if (onToggleSidebar) onToggleSidebar();
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-15 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-5 lg:px-6 shadow-2xs">
      {/* Left side: Hamburger + Page Title + School Name Tag */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-btn"
          type="button"
          onClick={handleMenuClick}
          className="lg:hidden p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer border border-slate-200/80"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900">
                {title}
              </span>
            </h1>
            {subtitle && <p className="text-[10px] text-slate-400 font-semibold hidden sm:block">{subtitle}</p>}
          </div>

          {/* School Name Tag */}
          <div className="hidden md:inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50/90 to-blue-50/90 text-indigo-950 border border-indigo-200/80 text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs">
            <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate max-w-[200px]">{settings.schoolName || 'Central Public School'}</span>
          </div>
        </div>
      </div>

      {/* Right side: Today Date + PWA Download + User Profile + Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Today's Date Widget */}
        <div className="hidden xl:flex items-center gap-1.5 text-slate-500 bg-slate-50 border border-slate-200/80 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>{currentDateStr}</span>
        </div>

        {/* PWA Download / Install App Button */}
        {isInstalled ? (
          <button
            type="button"
            onClick={openInstallModal}
            title="LibraFlow is installed as PWA"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px]">App Installed</span>
          </button>
        ) : (
          <button
            id="header-install-pwa-btn"
            type="button"
            onClick={() => {
              promptInstall();
            }}
            title="Download & Install LibraFlow PWA"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all duration-200 shadow-xs hover:shadow-indigo-500/20 cursor-pointer group active:scale-95"
          >
            <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="hidden sm:inline">Download App</span>
            <span className="sm:hidden text-[10px]">App</span>
            <span className="hidden md:inline-block bg-white/20 text-[9px] px-1 rounded-sm uppercase tracking-wider font-extrabold">
              PWA
            </span>
          </button>
        )}

        {/* User profile Chip */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-slate-50 to-indigo-50/30 pl-1 pr-3 py-1 rounded-full border border-slate-200/90 shadow-2xs">
          <div className="relative">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-700 text-white border border-indigo-200 font-extrabold text-xs flex items-center justify-center shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[120px]">
              {user?.name || 'Admin'}
            </span>
            <span className="text-[9px] text-indigo-600 block font-bold uppercase tracking-wider">
              {user?.role === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN'}
            </span>
          </div>
        </div>

        {/* Logout button */}
        <button
          id="logout-btn"
          type="button"
          onClick={logout}
          title="Sign out"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-white bg-white hover:bg-rose-600 border border-slate-200 hover:border-rose-600 rounded-xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer group"
        >
          <LogOut className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

