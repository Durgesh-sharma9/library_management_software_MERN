import React from 'react';
import { Menu, LogOut, School, Sparkles, Bell, Calendar, UserCheck, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

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

      {/* Right side: Today Date + User Profile + Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Today's Date Widget */}
        <div className="hidden xl:flex items-center gap-1.5 text-slate-500 bg-slate-50 border border-slate-200/80 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>{currentDateStr}</span>
        </div>

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

