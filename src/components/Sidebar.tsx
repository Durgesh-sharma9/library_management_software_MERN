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
  PanelLeftClose,
  PanelLeftOpen,
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  isOpen,
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
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
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white/95 backdrop-blur-xl border-r border-slate-200/90 shadow-sm flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-56'
        } ${mobileVisible ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Compact Brand Header with Collapse Toggle Button */}
        <div className={`p-2.5 flex items-center border-b border-slate-100 bg-slate-50/70 ${isCollapsed ? 'justify-center px-1 py-3' : 'justify-between px-2.5'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold shrink-0 shadow-sm shadow-indigo-500/20">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-xs tracking-tight text-slate-900 block truncate leading-tight">
                    LibraFlow SaaS
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold block truncate">
                      Smart Library Cloud
                    </span>
                  </div>
                </div>
              </div>

              {/* Collapse Button */}
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse Sidebar"
                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-all cursor-pointer shrink-0 border border-indigo-200/80 shadow-2xs group"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* Expand Button in Collapsed Mode */
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand Sidebar"
              className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-all cursor-pointer border border-indigo-200/80 shadow-2xs group"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 py-2 space-y-0.5 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-1.5' : 'px-2'}`}>
          {/* Dashboard */}
          <button
            id="nav-dashboard"
            type="button"
            title="Dashboard"
            onClick={() => handleNavClick('dashboard')}
            className={`group relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-sky-50 text-sky-900 font-bold border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'dashboard' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-sky-500"></span>
            )}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
              <div
                className={`p-1 rounded-md transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span className="truncate">Dashboard</span>}
            </div>
            {!isCollapsed && (
              activeTab === 'dashboard' ? (
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></div>
              ) : (
                <span className="text-[8px] px-1 py-0.2 rounded bg-sky-50 text-sky-700 font-extrabold shrink-0 border border-sky-200">
                  Live
                </span>
              )
            )}
          </button>

          {/* Books Catalog */}
          <button
            id="nav-books"
            type="button"
            title="Books Catalog"
            onClick={() => handleNavClick('books')}
            className={`group relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
              activeTab === 'books'
                ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'books' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-indigo-600"></span>
            )}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
              <div
                className={`p-1 rounded-md transition-all ${
                  activeTab === 'books'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span className="truncate">Books Catalog</span>}
            </div>
            {!isCollapsed && activeTab === 'books' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0"></div>}
          </button>

          {/* Members (Parent item with Sub-menu: Students & Teachers) */}
          <div className="space-y-0.5 pt-0.5">
            <button
              id="nav-members-toggle"
              type="button"
              title="Members"
              onClick={() => setIsMembersSubmenuOpen(!isMembersSubmenuOpen)}
              className={`group w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
                isMemberActive
                  ? 'bg-slate-100 text-slate-900 font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
                <div
                  className={`p-1 rounded-md transition-all ${
                    isMemberActive
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate">Members</span>}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isMembersSubmenuOpen ? 'rotate-180 text-slate-700' : ''
                  }`}
                />
              )}
            </button>

            {/* Sub-menu: Students & Teachers */}
            {(isMembersSubmenuOpen || isCollapsed) && (
              <div className={isCollapsed ? "space-y-0.5 my-0.5" : "pl-2.5 pr-1 py-0.5 space-y-0.5 border-l-2 border-indigo-200 ml-4 my-0.5"}>
                {/* Students */}
                <button
                  id="nav-students"
                  type="button"
                  title="Students"
                  onClick={() => handleNavClick('students')}
                  className={`relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2 py-1 justify-between'} rounded-md flex items-center text-xs transition-all duration-150 cursor-pointer ${
                    activeTab === 'students'
                      ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-1.5'} truncate`}>
                    <GraduationCap
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activeTab === 'students' ? 'text-blue-600' : 'text-blue-500'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">Students</span>}
                  </div>
                  {!isCollapsed && activeTab === 'students' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></div>}
                </button>

                {/* Teachers */}
                <button
                  id="nav-teachers"
                  type="button"
                  title="Teachers"
                  onClick={() => handleNavClick('teachers')}
                  className={`relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2 py-1 justify-between'} rounded-md flex items-center text-xs transition-all duration-150 cursor-pointer ${
                    activeTab === 'teachers'
                      ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-1.5'} truncate`}>
                    <Briefcase
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activeTab === 'teachers' ? 'text-emerald-600' : 'text-emerald-500'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">Teachers</span>}
                  </div>
                  {!isCollapsed && activeTab === 'teachers' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></div>}
                </button>
              </div>
            )}
          </div>

          {/* Master Management */}
          <button
            id="nav-masters"
            type="button"
            title="Masters"
            onClick={() => handleNavClick('masters')}
            className={`group relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
              activeTab === 'masters'
                ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'masters' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-amber-500"></span>
            )}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
              <div
                className={`p-1 rounded-md transition-all ${
                  activeTab === 'masters'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span className="truncate">Masters</span>}
            </div>
            {!isCollapsed && activeTab === 'masters' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>}
          </button>

          {/* Assignments / Circulation */}
          <button
            id="nav-assignments"
            type="button"
            title="Issue / Return"
            onClick={() => handleNavClick('assignments')}
            className={`group relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-purple-50 text-purple-950 font-bold border border-purple-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'assignments' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-purple-600"></span>
            )}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
              <div
                className={`p-1 rounded-md transition-all ${
                  activeTab === 'assignments'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span className="truncate">Issue / Return</span>}
            </div>
            {!isCollapsed && activeTab === 'assignments' && <div className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></div>}
          </button>

          {/* Lost & Damaged Books */}
          <button
            id="nav-lost-damaged"
            type="button"
            title="Lost / Damaged"
            onClick={() => handleNavClick('lost-damaged')}
            className={`group relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
              activeTab === 'lost-damaged'
                ? 'bg-rose-50 text-rose-950 font-bold border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'lost-damaged' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-rose-600"></span>
            )}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
              <div
                className={`p-1 rounded-md transition-all ${
                  activeTab === 'lost-damaged'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span className="truncate">Lost / Damaged</span>}
            </div>
            {!isCollapsed && activeTab === 'lost-damaged' && <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></div>}
          </button>

          {/* Activity & History */}
          <button
            id="nav-activity"
            type="button"
            title="Activity Logs"
            onClick={() => handleNavClick('activity')}
            className={`group relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-teal-50 text-teal-950 font-bold border border-teal-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'activity' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-teal-600"></span>
            )}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
              <div
                className={`p-1 rounded-md transition-all ${
                  activeTab === 'activity'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span className="truncate">Activity Logs</span>}
            </div>
            {!isCollapsed && activeTab === 'activity' && <div className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></div>}
          </button>

          {/* Subscription & Plans */}
          <button
            id="nav-subscription"
            type="button"
            title="Plans & Quota"
            onClick={() => handleNavClick('subscription')}
            className={`group relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'subscription' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-amber-500"></span>
            )}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
              <div
                className={`p-1 rounded-md transition-all ${
                  activeTab === 'subscription'
                    ? 'bg-gradient-to-tr from-amber-400 via-orange-500 to-indigo-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span className="truncate">Plans & Quota</span>}
            </div>
            {!isCollapsed && (
              activeTab === 'subscription' ? (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
              ) : (
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0 animate-bounce" />
              )
            )}
          </button>

          {/* Settings */}
          <button
            id="nav-settings"
            type="button"
            title="Settings"
            onClick={() => handleNavClick('settings')}
            className={`group relative w-full ${isCollapsed ? 'p-2 justify-center' : 'px-2.5 py-1.5 justify-between'} rounded-lg flex items-center text-xs transition-all duration-150 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'settings' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-slate-800"></span>
            )}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} min-w-0`}>
              <div
                className={`p-1 rounded-md transition-all ${
                  activeTab === 'settings'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && <span className="truncate">Settings</span>}
            </div>
            {!isCollapsed && activeTab === 'settings' && <div className="w-1.5 h-1.5 rounded-full bg-slate-800 shrink-0"></div>}
          </button>
        </nav>

        {/* School Info Box (Active Campus) */}
        <div className={`p-2 m-2 rounded-xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-blue-50/30 border border-slate-200/80 shadow-2xs text-xs mt-auto ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className="flex items-center gap-2" title={settings.schoolName || 'Central Public School'}>
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white shadow-xs flex items-center justify-center font-bold text-xs shrink-0">
              <School className="w-3.5 h-3.5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <span className="text-[8px] uppercase font-extrabold tracking-wider text-indigo-700 block truncate">
                  Active Campus
                </span>
                <div className="font-bold text-slate-900 text-[10px] truncate leading-tight mt-0.2">
                  {settings.schoolName || 'Central Public School'}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

