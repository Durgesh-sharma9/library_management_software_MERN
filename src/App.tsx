import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/Login/LoginPage';
import { LandingPage } from './pages/Landing/LandingPage';
import { SuperAdminPortal } from './pages/SuperAdmin/SuperAdminPortal';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { BooksPage } from './pages/Books/BooksPage';
import { StudentsPage } from './pages/Members/StudentsPage';
import { TeachersPage } from './pages/Members/TeachersPage';
import { MasterManagementPage } from './pages/Masters/MasterManagementPage';
import { AssignmentsPage } from './pages/Assignments/AssignmentsPage';
import { LostDamagedPage } from './pages/LostDamaged/LostDamagedPage';
import { ActivityHistoryPage } from './pages/Activity/ActivityHistoryPage';
import { SubscriptionPage } from './pages/Subscription/SubscriptionPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { InventoryPage } from './pages/Inventory/InventoryPage';
import { Shield, ArrowLeft, Building2 } from 'lucide-react';

interface FilterNavigation {
  status?: string;
  categoryId?: string;
  memberId?: string;
  bookId?: string;
}

const tabToPathMap: Record<NavTab, string> = {
  dashboard: '/admin/dashboard',
  books: '/admin/books',
  inventory: '/admin/inventory',
  students: '/admin/students',
  teachers: '/admin/teachers',
  masters: '/admin/masters',
  assignments: '/admin/assignments',
  'lost-damaged': '/admin/lost-damaged',
  activity: '/admin/activity',
  subscription: '/admin/subscription',
  settings: '/admin/settings',
};

const pathToTabMap: Record<string, NavTab> = {
  '/': 'dashboard',
  '/admin': 'dashboard',
  '/admin/': 'dashboard',
  '/admin/dashboard': 'dashboard',
  '/admin/books': 'books',
  '/admin/inventory': 'inventory',
  '/admin/students': 'students',
  '/admin/teachers': 'teachers',
  '/admin/masters': 'masters',
  '/admin/assignments': 'assignments',
  '/admin/lost-damaged': 'lost-damaged',
  '/admin/activity': 'activity',
  '/admin/subscription': 'subscription',
  '/admin/settings': 'settings',
  '/dashboard': 'dashboard',
  '/books': 'books',
  '/inventory': 'inventory',
  '/students': 'students',
  '/teachers': 'teachers',
  '/masters': 'masters',
  '/assignments': 'assignments',
  '/lost-damaged': 'lost-damaged',
  '/activity': 'activity',
  '/subscription': 'subscription',
  '/settings': 'settings',
};

const getTabFromPath = (pathname: string): NavTab => {
  const normalized = pathname.toLowerCase().trim();
  if (pathToTabMap[normalized]) return pathToTabMap[normalized];

  for (const [route, tab] of Object.entries(pathToTabMap)) {
    if (route !== '/' && route !== '/admin' && route !== '/admin/' && normalized.startsWith(route)) {
      return tab;
    }
  }
  return 'dashboard';
};

const MainApp: React.FC = () => {
  const { user, isAuthenticated, loading, isImpersonating, returnToSuperAdmin } = useAuth();
  const [authView, setAuthView] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<NavTab>(() => getTabFromPath(window.location.pathname));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [navigationFilters, setNavigationFilters] = useState<FilterNavigation | undefined>(undefined);

  // Synchronize browser back/forward popstate
  useEffect(() => {
    const handlePopState = () => {
      const currentTab = getTabFromPath(window.location.pathname);
      setActiveTab(currentTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync active route for School Admin (/admin/...) and Super Admin (/super-admin)
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'superadmin' && !isImpersonating) {
        if (!window.location.pathname.startsWith('/super-admin')) {
          window.history.replaceState(null, '', '/super-admin');
        }
      } else {
        const curPath = window.location.pathname.toLowerCase();
        if (curPath === '/' || curPath === '/admin' || curPath === '/admin/' || curPath === '/login') {
          const targetPath = tabToPathMap[activeTab] || '/admin/dashboard';
          window.history.replaceState(null, '', targetPath);
        } else if (!curPath.startsWith('/admin/')) {
          const tab = getTabFromPath(curPath);
          const targetPath = tabToPathMap[tab] || '/admin/dashboard';
          window.history.replaceState(null, '', targetPath);
        }
      }
    }
  }, [isAuthenticated, user?.role, isImpersonating, activeTab]);

  // Tab change with URL route synchronization & optional filter injection
  const handleNavigateTab = (tab: NavTab, filters?: FilterNavigation) => {
    setActiveTab(tab);
    setNavigationFilters(filters);

    const targetPath = tabToPathMap[tab] || '/admin/dashboard';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthView('auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-300">Initializing School Library System...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'landing') {
      return <LandingPage onOpenLogin={handleOpenAuth} />;
    }
    return (
      <LoginPage
        initialMode={authMode}
        onBackToLanding={() => setAuthView('landing')}
      />
    );
  }

  // If logged in as SuperAdmin and not impersonating a specific school
  if (user?.role === 'superadmin' && !isImpersonating) {
    return <SuperAdminPortal />;
  }

  const tabTitles: Record<NavTab, string> = {
    dashboard: 'Dashboard Overview',
    books: 'Books Master Catalog',
    inventory: '360° Inventory & Physical Stock Audit',
    students: 'Students Directory & Library Cards',
    teachers: 'Teachers & Faculty Directory',
    masters: 'Class & Section Master Configuration',
    assignments: 'Book Issue & Circulation',
    'lost-damaged': 'Book Lost & Damaged Management',
    activity: 'Circulation & Activity History',
    subscription: 'Library Subscription & Plan Quota',
    settings: 'System & Circulation Settings',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Impersonation alert banner when Super Admin is viewing as School */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md z-50 sticky top-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-300 animate-pulse shrink-0" />
            <span>
              Super Admin View Mode: Currently inspecting{' '}
              <strong className="text-purple-200 underline">{user?.school?.name || 'School Campus'}</strong> ({user?.school?.code || 'CAMPUS'})
            </span>
          </div>
          <button
            onClick={returnToSuperAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold border border-white/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to SuperAdmin Portal</span>
          </button>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => handleNavigateTab(tab, undefined)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => {
            setIsSidebarCollapsed((prev) => {
              const next = !prev;
              localStorage.setItem('sidebar_collapsed', String(next));
              return next;
            });
          }}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56'}`}>
          <Header
            title={tabTitles[activeTab]}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => {
              setIsSidebarCollapsed((prev) => {
                const next = !prev;
                localStorage.setItem('sidebar_collapsed', String(next));
                return next;
              });
            }}
          />

          <main className="flex-1 p-3 sm:p-4 lg:p-5 max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardPage onNavigateTab={handleNavigateTab as any} />
            )}

            {activeTab === 'books' && (
              <BooksPage initialFilter={navigationFilters} />
            )}

            {activeTab === 'inventory' && (
              <InventoryPage onNavigateTab={handleNavigateTab as any} />
            )}

            {activeTab === 'students' && (
              <StudentsPage initialFilter={navigationFilters} />
            )}

            {activeTab === 'teachers' && (
              <TeachersPage />
            )}

            {activeTab === 'masters' && (
              <MasterManagementPage onNavigateTab={handleNavigateTab as any} />
            )}

            {activeTab === 'assignments' && (
              <AssignmentsPage initialFilter={navigationFilters} />
            )}

            {activeTab === 'lost-damaged' && (
              <LostDamagedPage onNavigateTab={handleNavigateTab as any} />
            )}

            {activeTab === 'activity' && (
              <ActivityHistoryPage initialFilter={navigationFilters} />
            )}

            {activeTab === 'subscription' && (
              <SubscriptionPage onNavigateTab={handleNavigateTab as any} />
            )}

            {activeTab === 'settings' && (
              <SettingsPage onNavigateTab={handleNavigateTab as any} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <MainApp />
      </SettingsProvider>
    </AuthProvider>
  );
}
