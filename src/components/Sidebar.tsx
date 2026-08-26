import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Briefcase,
  Layers,
  ArrowLeftRight,
  ShieldAlert,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  School,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export type NavTab =
  | 'dashboard'
  | 'books'
  | 'students'
  | 'teachers'
  | 'masters'
  | 'assignments'
  | 'lost-damaged'
  | 'activity'
  | 'subscription'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab?: (tab: NavTab) => void;
  onSelectTab?: (tab: NavTab) => void;
  isOpen?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  isOpen,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { settings } = useSettings();
  const mobileVisible = isMobileOpen ?? isOpen ?? false;

  // Auto-expand Members submenu if activeTab is students or teachers
  const [isMembersSubmenuOpen, setIsMembersSubmenuOpen] = useState<boolean>(
    activeTab === 'students' || activeTab === 'teachers' || true
  );

  const handleNavClick = (tab: NavTab) => {
    if (onSelectTab) onSelectTab(tab);
    else if (setActiveTab) setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const isMemberActive = activeTab === 'students' || activeTab === 'teachers';

  return (
    <>
      {/* Mobile backdrop */}
      {mobileVisible && (
        <div
          id="sidebar-mobile-backdrop"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-56 bg-white/95 backdrop-blur-md border-r border-slate-200/80 shadow-xs flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3 sm:p-3.5 flex items-center gap-2.5 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base shrink-0 shadow-2xs">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-xs tracking-tight text-slate-900 block truncate">
              {settings.libraryName || 'School Library ERP'}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                {settings.schoolName || 'Campus Portal'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {/* Dashboard */}
          <button
            id="nav-dashboard"
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  activeTab === 'dashboard'
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Dashboard</span>
            </div>
            {activeTab === 'dashboard' ? (
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></div>
            ) : (
              <span className="text-[9px] px-1 py-0.2 rounded-full bg-slate-100 text-slate-500 font-medium shrink-0">Live</span>
            )}
          </button>

          {/* Books Catalog */}
          <button
            id="nav-books"
            type="button"
            onClick={() => handleNavClick('books')}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
              activeTab === 'books'
                ? 'bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  activeTab === 'books'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Books Catalog</span>
            </div>
            {activeTab === 'books' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>}
          </button>

          {/* Members (Parent item with Sub-menu: Students & Teachers) */}
          <div className="space-y-0.5 pt-0.5">
            <button
              id="nav-members-toggle"
              type="button"
              onClick={() => setIsMembersSubmenuOpen(!isMembersSubmenuOpen)}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                isMemberActive
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-700 hover:bg-slate-50 font-medium'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-slate-100 text-slate-700">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">Members</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                  isMembersSubmenuOpen ? 'rotate-180 text-slate-700' : ''
                }`}
              />
            </button>

            {/* Sub-menu: Students & Teachers */}
            {isMembersSubmenuOpen && (
              <div className="pl-2 pr-1 py-0.5 space-y-0.5 border-l border-slate-200 ml-4 my-0.5">
                {/* Students */}
                <button
                  id="nav-students"
                  type="button"
                  onClick={() => handleNavClick('students')}
                  className={`w-full px-2 py-1 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                    activeTab === 'students'
                      ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200/80 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <GraduationCap
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activeTab === 'students' ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">Students</span>
                  </div>
                  {activeTab === 'students' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></div>}
                </button>

                {/* Teachers */}
                <button
                  id="nav-teachers"
                  type="button"
                  onClick={() => handleNavClick('teachers')}
                  className={`w-full px-2 py-1 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                    activeTab === 'teachers'
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Briefcase
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activeTab === 'teachers' ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">Teachers</span>
                  </div>
                  {activeTab === 'teachers' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></div>}
                </button>
              </div>
            )}
          </div>

          {/* Master Management */}
          <button
            id="nav-masters"
            type="button"
            onClick={() => handleNavClick('masters')}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
              activeTab === 'masters'
                ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  activeTab === 'masters'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Masters</span>
            </div>
            {activeTab === 'masters' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>}
          </button>

          {/* Assignments / Circulation */}
          <button
            id="nav-assignments"
            type="button"
            onClick={() => handleNavClick('assignments')}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-purple-50 text-purple-800 font-bold border border-purple-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  activeTab === 'assignments'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Issue / Return</span>
            </div>
            {activeTab === 'assignments' && <div className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></div>}
          </button>

          {/* Lost & Damaged Books */}
          <button
            id="nav-lost-damaged"
            type="button"
            onClick={() => handleNavClick('lost-damaged')}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
              activeTab === 'lost-damaged'
                ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  activeTab === 'lost-damaged'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Lost / Damaged</span>
            </div>
            {activeTab === 'lost-damaged' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>}
          </button>

          {/* Activity & History */}
          <button
            id="nav-activity"
            type="button"
            onClick={() => handleNavClick('activity')}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  activeTab === 'activity'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <History className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Activity Logs</span>
            </div>
            {activeTab === 'activity' && <div className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></div>}
          </button>

          {/* Subscription & Plans */}
          <button
            id="nav-subscription"
            type="button"
            onClick={() => handleNavClick('subscription')}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  activeTab === 'subscription'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="truncate">Plans & Quota</span>
            </div>
            {activeTab === 'subscription' && (
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0"></div>
            )}
          </button>

          {/* Settings */}
          <button
            id="nav-settings"
            type="button"
            onClick={() => handleNavClick('settings')}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-md ${
                  activeTab === 'settings'
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Settings</span>
            </div>
            {activeTab === 'settings' && <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></div>}
          </button>
        </nav>

        {/* School Info Box */}
        <div className="p-2.5 m-2 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs text-xs mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0">
              <School className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block truncate">
                Active Campus
              </span>
              <div className="font-bold text-slate-800 text-[11px] truncate leading-tight">
                {settings.schoolName || 'Central Public School'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

