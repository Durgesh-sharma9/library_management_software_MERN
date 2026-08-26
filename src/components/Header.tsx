import React from 'react';
import { Menu, LogOut, School, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenMobileMenu,
  title = 'Overview',
  subtitle,
}) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  const handleMenuClick = () => {
    if (onOpenMobileMenu) onOpenMobileMenu();
    else if (onToggleSidebar) onToggleSidebar();
  };

  return (
    <header className="sticky top-0 z-30 h-13 sm:h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-5 lg:px-6 shadow-xs">
      {/* Left side: Hamburger + Page Title + School Name Tag */}
      <div className="flex items-center gap-2.5">
        <button
          id="mobile-menu-btn"
          type="button"
          onClick={handleMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{title}</span>
            </h1>
            {subtitle && <p className="text-[10px] text-slate-400 font-medium hidden sm:block">{subtitle}</p>}
          </div>
          {/* School Name Tag */}
          <div className="hidden md:inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full shadow-2xs">
            <School className="w-3 h-3 text-indigo-600" />
            <span>{settings.schoolName || 'Central Public School'}</span>
          </div>
        </div>
      </div>

      {/* Right side: User profile + Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* User profile */}
        <div className="flex items-center gap-2 bg-slate-50 pl-1 pr-2.5 py-0.5 rounded-full border border-slate-200/80">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center justify-center shadow-2xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-semibold text-slate-800 block leading-tight truncate max-w-[120px]">
              {user?.name || 'Admin'}
            </span>
            <span className="text-[9px] text-slate-500 block font-medium">
              {user?.role === 'admin' ? 'Super Admin' : 'Librarian'}
            </span>
          </div>
        </div>

        {/* Logout button */}
        <button
          id="logout-btn"
          type="button"
          onClick={logout}
          title="Sign out"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200/90 hover:border-rose-200 rounded-lg transition-all shadow-2xs hover:shadow-xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-xs">Logout</span>
        </button>
      </div>
    </header>
  );
};

