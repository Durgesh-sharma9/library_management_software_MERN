import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  BookOpen,
  DollarSign,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Power,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Layers,
  BarChart3,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
  Tag,
  Shield,
  HelpCircle,
  ExternalLink,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { superAdminService } from '../../services/api';
import { School, Plan, SuperAdminStats, SubscriptionRequest } from '../../types';
import { SchoolModal } from './SchoolModal';
import { PlanModal } from './PlanModal';
import { StatusConfirmModal } from './StatusConfirmModal';
import { RequestApprovalModal } from './RequestApprovalModal';

export const SuperAdminPortal: React.FC = () => {
  const { user, logout, switchSession } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'plans' | 'approvals'>('overview');
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters for Schools tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Filters for Approvals tab
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestSearchQuery, setRequestSearchQuery] = useState('');

  // Modals state
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [selectedSchoolForEdit, setSelectedSchoolForEdit] = useState<School | null>(null);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<Plan | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedSchoolForStatus, setSelectedSchoolForStatus] = useState<School | null>(null);

  // Approval Modal state
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<SubscriptionRequest | null>(null);
  const [approvalActionType, setApprovalActionType] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    loadAllData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [statsData, schoolsData, plansData, requestsData] = await Promise.all([
        superAdminService.getStats(),
        superAdminService.getSchools(),
        superAdminService.getPlans(),
        superAdminService.getSubscriptionRequests(),
      ]);
      setStats(statsData);
      setSchools(schoolsData || []);
      setPlans(plansData || []);
      setSubscriptionRequests(requestsData || []);
    } catch (err: any) {
      console.error('Failed to load SuperAdmin data', err);
      showToast('Error connecting to server. Please try refreshing.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenApprovalModal = (req: SubscriptionRequest, action: 'approve' | 'reject') => {
    setSelectedRequestForApproval(req);
    setApprovalActionType(action);
    setIsApprovalModalOpen(true);
  };

  // School actions
  const handleOpenCreateSchool = () => {
    setSelectedSchoolForEdit(null);
    setIsSchoolModalOpen(true);
  };

  const handleOpenEditSchool = (sch: School) => {
    setSelectedSchoolForEdit(sch);
    setIsSchoolModalOpen(true);
  };

  const handleSaveSchool = async (formData: any, isEdit: boolean, schoolId?: string) => {
    if (isEdit && schoolId) {
      await superAdminService.updateSchool(schoolId, formData);
      showToast(`School "${formData.name}" updated successfully!`);
    } else {
      const res = await superAdminService.createSchool(formData);
      showToast(`School "${formData.name}" created! Admin login: ${res.adminCredentials.email}`);
    }
    loadAllData();
  };

  const handleOpenStatusModal = (sch: School) => {
    setSelectedSchoolForStatus(sch);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async (
    schoolId: string,
    isActive: boolean,
    status: string,
    reason: string
  ) => {
    await superAdminService.updateSchoolStatus(schoolId, {
      isActive,
      status,
      deactivationReason: reason,
    });
    showToast(
      isActive
        ? 'School reactivated successfully!'
        : 'School workspace suspended/deactivated.'
    );
    loadAllData();
  };

  const handleImpersonate = async (sch: School) => {
    try {
      const schoolId = sch._id || sch.id || '';
      const res = await superAdminService.impersonateSchool(schoolId);
      if (res && res.token && res.user) {
        showToast(`Switching workspace to "${sch.name}"...`);
        switchSession(res.token, res.user, true);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to switch to school workspace.', 'error');
    }
  };

  const handleDeleteSchool = async (sch: School) => {
    if (sch.code === 'IPS') {
      showToast('The default demonstration school cannot be deleted.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete "${sch.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await superAdminService.deleteSchool(sch._id || sch.id || '');
      showToast(`School "${sch.name}" deleted successfully.`);
      loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete school.', 'error');
    }
  };

  // Plan actions
  const handleOpenCreatePlan = () => {
    setSelectedPlanForEdit(null);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (pl: Plan) => {
    setSelectedPlanForEdit(pl);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (formData: Partial<Plan>, isEdit: boolean, planId?: string) => {
    if (isEdit && planId) {
      await superAdminService.updatePlan(planId, formData);
      showToast(`Plan "${formData.name}" updated successfully!`);
    } else {
      await superAdminService.createPlan(formData);
      showToast(`Plan "${formData.name}" created successfully!`);
    }
    loadAllData();
  };

  const handleDeletePlan = async (pl: Plan) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the plan "${pl.name}"? Plans with active schools cannot be deleted.`
      )
    ) {
      return;
    }
    try {
      await superAdminService.deletePlan(pl._id || pl.id || '');
      showToast(`Plan "${pl.name}" deleted successfully.`);
      loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete plan.', 'error');
    }
  };

  // Filtered schools
  const filteredSchools = schools.filter((sch) => {
    const matchesSearch =
      !searchQuery.trim() ||
      sch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sch.city && sch.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sch.email && sch.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sch.adminName && sch.adminName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && sch.isActive) ||
      (statusFilter === 'suspended' && !sch.isActive) ||
      (statusFilter === 'trial' && sch.status === 'trial');

    const rawPlanId = sch.plan?._id || sch.plan?.id || sch.plan;
    const matchesPlan =
      planFilter === 'all' ||
      rawPlanId === planFilter ||
      sch.plan?.code === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
              : 'bg-rose-950 text-rose-200 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top SuperAdmin Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Granthshala ERP
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider border border-purple-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Multi-Tenant School Library Cloud & Plan Subscription Hub
              </p>
            </div>
          </div>

          {/* User Info & Global Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="refresh-all-data-btn"
              onClick={loadAllData}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer"
              title="Refresh Platform Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            </button>

            <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">{user?.name || 'Super Administrator'}</span>
              <span className="text-[10px] text-slate-500 font-mono">({user?.email})</span>
            </div>

            <button
              id="superadmin-logout-btn"
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-bold border border-rose-900/50 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Sub-header Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 border-t border-slate-800/60">
          <button
            id="tab-overview-btn"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Platform Overview</span>
          </button>

          <button
            id="tab-schools-btn"
            onClick={() => setActiveTab('schools')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'schools'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>All Schools ({schools.length})</span>
          </button>

          <button
            id="tab-plans-btn"
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'plans'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Subscription Plans ({plans.length})</span>
          </button>

          <button
            id="tab-approvals-btn"
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === 'approvals'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Plan Approvals</span>
            {subscriptionRequests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] animate-pulse">
                {subscriptionRequests.filter((r) => r.status === 'pending').length} Pending
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw className="w-10 h-10 text-purple-500 animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-300">Loading Platform Intelligence & Multi-School DB...</p>
          </div>
        ) : (
          <>
            {/* ================= TAB 1: OVERVIEW ================= */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Platform Summary KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Schools</span>
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{stats?.totalSchools ?? schools.length}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-emerald-400 font-bold">{stats?.activeSchools ?? 0} Active</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-rose-400 font-bold">{stats?.inactiveSchools ?? 0} Suspended</span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Books in Catalog</span>
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{stats?.totalBooks ?? 0}</div>
                    <div className="mt-2 text-xs text-slate-400 font-medium">
                      {stats?.totalPhysicalCopies ?? 0} Physical Copies
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Members</span>
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{stats?.totalMembers ?? 0}</div>
                    <div className="mt-2 text-xs text-slate-400 font-medium">
                      Students & Teachers Across Campuses
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Circulations</span>
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{stats?.activeAssignments ?? 0}</div>
                    <div className="mt-2 text-xs text-slate-400 font-medium">
                      ₹{stats?.totalFinesCollected ?? 0} Fines Collected
                    </div>
                  </div>
                </div>

                {/* Pending Plan Approvals Quick Alert */}
                {subscriptionRequests.filter((r) => r.status === 'pending').length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-amber-200">
                          {subscriptionRequests.filter((r) => r.status === 'pending').length} School Subscription Upgrade Requests Awaiting Approval
                        </h3>
                        <p className="text-xs text-amber-300/80 mt-0.5">
                          School administrators have submitted plan purchase orders with payment UTR references.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('approvals')}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                    >
                      <span>Review Requests</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Subscription Plans & Quick Provisioning Strip */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Plan Distribution */}
                  <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-slate-800/60 border border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span>Subscription Plan Adoption</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Active tier distribution across registered campuses</p>
                      </div>
                      <button
                        onClick={handleOpenCreatePlan}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Plan</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {plans.map((pl) => {
                        const subscriberCount = schools.filter(
                          (s) => (s.plan?._id || s.plan?.id || s.plan) === (pl._id || pl.id)
                        ).length;

                        return (
                          <div
                            key={pl._id || pl.id}
                            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 relative overflow-hidden"
                          >
                            {pl.isPopular && (
                              <span className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded-full border border-purple-500/40">
                                Popular
                              </span>
                            )}
                            <div className="text-sm font-bold text-white">{pl.name}</div>
                            <div className="text-xl font-black text-purple-400 mt-1">
                              ₹{pl.price.toLocaleString('en-IN')}
                              <span className="text-xs text-slate-400 font-normal">/{pl.billingCycle}</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                              <span className="text-slate-400">Enrolled Schools:</span>
                              <span className="font-bold text-emerald-400">{subscriberCount}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SuperAdmin Fast Controls */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-800/40 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-purple-600/30 text-purple-300 flex items-center justify-center mb-3">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h2 className="text-base font-bold text-white">Campus Provisioning</h2>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Add a new school instantly with isolated database namespace, automated librarian credentials, and pre-assigned subscription tier.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={handleOpenCreateSchool}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Provision New School Campus</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('schools')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-bold border border-slate-700 transition-all cursor-pointer"
                      >
                        <Building2 className="w-4 h-4" />
                        <span>View All Schools Directory</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Schools Table Preview */}
                <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/60 border border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">Recently Provisioned Campuses</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Real-time status of latest school subscriptions</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('schools')}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All ({schools.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-700/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                          <th className="pb-3">School Name & Code</th>
                          <th className="pb-3">Admin Contact</th>
                          <th className="pb-3">Plan Tier</th>
                          <th className="pb-3">Catalog Size</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {schools.slice(0, 5).map((sch) => (
                          <tr key={sch._id || sch.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 font-bold text-white">
                              <div>{sch.name}</div>
                              <div className="text-[11px] text-purple-400 font-mono font-normal">
                                Code: {sch.code}
                              </div>
                            </td>
                            <td className="py-3.5 text-slate-300">
                              <div>{sch.adminName || 'Admin'}</div>
                              <div className="text-[11px] text-slate-400">{sch.email}</div>
                            </td>
                            <td className="py-3.5">
                              <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                                {typeof sch.plan === 'object' ? sch.plan?.name : 'Starter'}
                              </span>
                            </td>
                            <td className="py-3.5 text-slate-300 font-medium">
                              {sch.booksCount ?? 0} books • {sch.membersCount ?? 0} members
                            </td>
                            <td className="py-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  sch.isActive
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {sch.isActive ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleImpersonate(sch)}
                                  className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all cursor-pointer"
                                  title="Inspect / Login as School"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditSchool(sch)}
                                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                                  title="Edit School"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenStatusModal(sch)}
                                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                    sch.isActive
                                      ? 'bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white'
                                      : 'bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 hover:text-white'
                                  }`}
                                  title={sch.isActive ? 'Deactivate School' : 'Activate School'}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: ALL SCHOOLS ================= */}
            {activeTab === 'schools' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Header Controls & Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-800/60 border border-slate-700/80">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="search-schools-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by school name, code, city, email..."
                        className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-medium"
                      />
                    </div>

                    {/* Status Filter */}
                    <div>
                      <select
                        id="filter-status-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 font-medium"
                      >
                        <option value="all">All School Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="suspended">Suspended / Deactivated</option>
                        <option value="trial">Trial Mode</option>
                      </select>
                    </div>

                    {/* Plan Filter */}
                    <div>
                      <select
                        id="filter-plan-select"
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 font-medium"
                      >
                        <option value="all">All Subscription Plans</option>
                        {plans.map((pl) => (
                          <option key={pl._id || pl.id} value={pl._id || pl.id}>
                            {pl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    id="add-school-btn"
                    onClick={handleOpenCreateSchool}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New School</span>
                  </button>
                </div>

                {/* Schools Grid / List */}
                {filteredSchools.length === 0 ? (
                  <div className="text-center py-16 p-8 rounded-3xl bg-slate-800/40 border border-slate-700/60">
                    <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white">No schools matched your search query</h3>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the status/plan filter or clear the search keyword.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                    {filteredSchools.map((sch) => {
                      const planObj = typeof sch.plan === 'object' ? sch.plan : plans.find((p) => (p._id || p.id) === sch.plan);
                      const isSuspended = !sch.isActive;

                      return (
                        <div
                          key={sch._id || sch.id}
                          className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                            isSuspended
                              ? 'bg-rose-950/20 border-rose-900/60'
                              : 'bg-slate-800/70 border-slate-700/80 hover:border-indigo-500/60'
                          }`}
                        >
                          {/* Card Top */}
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
                                    isSuspended
                                      ? 'bg-rose-900/50 text-rose-300 border border-rose-700/50'
                                      : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                                  }`}
                                >
                                  {sch.code || sch.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-white">{sch.name}</h3>
                                  </div>
                                  <div className="text-xs text-slate-400 font-medium">
                                    {sch.libraryName || `${sch.name} Library`}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                                    sch.isActive
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  }`}
                                >
                                  {sch.isActive ? '● Active' : '✕ Suspended'}
                                </span>

                                {planObj && (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                                    {planObj.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Contact Details & Metadata */}
                            <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-900/80 rounded-2xl border border-slate-700/60 text-xs">
                              <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Admin Contact</div>
                                <div className="font-semibold text-slate-200 mt-0.5 truncate">{sch.adminName || 'Admin'}</div>
                                <div className="text-[11px] text-slate-400 truncate">{sch.email}</div>
                              </div>

                              <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Campus Location</div>
                                <div className="font-semibold text-slate-200 mt-0.5 truncate">
                                  {sch.city || 'India'} {sch.state ? `, ${sch.state}` : ''}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">{sch.phone || 'Phone not set'}</div>
                              </div>
                            </div>

                            {/* Real-time Metrics */}
                            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50">
                                <div className="text-xs font-bold text-white">{sch.booksCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400">Books</div>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50">
                                <div className="text-xs font-bold text-white">{sch.membersCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400">Members</div>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50">
                                <div className="text-xs font-bold text-amber-400">{sch.activeAssignmentsCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400">Issued</div>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50">
                                <div className="text-xs font-bold text-rose-400">{sch.overdueCount ?? 0}</div>
                                <div className="text-[10px] text-slate-400">Overdue</div>
                              </div>
                            </div>

                            {sch.deactivationReason && !sch.isActive && (
                              <div className="mb-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-xs font-medium">
                                <strong>Reason for suspension:</strong> {sch.deactivationReason}
                              </div>
                            )}
                          </div>

                          {/* Card Bottom Actions */}
                          <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                            {/* Impersonate button */}
                            <button
                              onClick={() => handleImpersonate(sch)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-indigo-500/40 cursor-pointer"
                              title="Enter this school's library portal directly as Admin"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View as School</span>
                            </button>

                            {/* Edit button */}
                            <button
                              onClick={() => handleOpenEditSchool(sch)}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                              title="Edit School Details & Change Plan"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Toggle status (Active/Deactive) */}
                            <button
                              onClick={() => handleOpenStatusModal(sch)}
                              className={`p-2 rounded-xl transition-all border cursor-pointer ${
                                sch.isActive
                                  ? 'bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-800'
                                  : 'bg-emerald-950/40 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-800'
                              }`}
                              title={sch.isActive ? 'Suspend / Deactivate School' : 'Reactivate School'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            {/* Delete school button (disabled for IPS) */}
                            {sch.code !== 'IPS' && (
                              <button
                                onClick={() => handleDeleteSchool(sch)}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 border border-slate-700 transition-all cursor-pointer"
                                title="Delete School Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: SUBSCRIPTION PLANS ================= */}
            {activeTab === 'plans' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-slate-800/60 border border-slate-700/80">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <span>Subscription Plans & Pricing Tiers</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure platform pricing packages, book quotas, student membership limits, and feature flags
                    </p>
                  </div>

                  <button
                    id="create-new-plan-btn"
                    onClick={handleOpenCreatePlan}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Plan</span>
                  </button>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {plans.map((pl) => {
                    const subscriberCount = schools.filter(
                      (s) => (s.plan?._id || s.plan?.id || s.plan) === (pl._id || pl.id)
                    ).length;

                    return (
                      <div
                        key={pl._id || pl.id}
                        className={`p-6 rounded-3xl border flex flex-col justify-between relative transition-all ${
                          pl.isPopular
                            ? 'bg-gradient-to-b from-purple-950/40 via-slate-800 to-slate-800 border-purple-500/80 shadow-xl shadow-purple-500/10'
                            : 'bg-slate-800/70 border-slate-700/80'
                        }`}
                      >
                        {pl.isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-md">
                            ⭐ Most Popular Choice
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-white">{pl.name}</h3>
                            <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                              {pl.code}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 min-h-[32px]">{pl.description || 'Standard multi-tenant school library package'}</p>

                          <div className="my-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-3xl font-black text-white">
                                ₹{pl.price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">/{pl.billingCycle}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Currently subscribed by <strong className="text-emerald-400">{subscriberCount}</strong> school campuses
                            </div>
                          </div>

                          {/* Quotas */}
                          <div className="space-y-2 mb-5">
                            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-700/50">
                              <span className="text-slate-400">Max Books Catalog:</span>
                              <span className="font-bold text-slate-200">
                                {pl.maxBooks === -1 ? 'Unlimited' : pl.maxBooks.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-700/50">
                              <span className="text-slate-400">Max Student Members:</span>
                              <span className="font-bold text-slate-200">
                                {pl.maxMembers === -1 ? 'Unlimited' : pl.maxMembers.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-700/50">
                              <span className="text-slate-400">Max Issues / Member:</span>
                              <span className="font-bold text-slate-200">{pl.maxIssuedPerStudent ?? 5} Books</span>
                            </div>
                          </div>

                          {/* Features list */}
                          <div className="space-y-2 mb-6">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Included Features
                            </div>
                            {pl.features && pl.features.length > 0 ? (
                              pl.features.map((feat, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                  <span>{feat}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-slate-500 italic">No specific feature tags added</div>
                            )}
                          </div>
                        </div>

                        {/* Plan Actions */}
                        <div className="pt-4 border-t border-slate-700/60 flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditPlan(pl)}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-xs font-bold transition-all border border-purple-500/40 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Plan</span>
                          </button>

                          <button
                            onClick={() => handleDeletePlan(pl)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 border border-slate-700 transition-all cursor-pointer"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= TAB 4: PLAN APPROVALS ================= */}
            {activeTab === 'approvals' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Approvals Header & Filter Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span>School Subscription Purchase & Upgrade Approvals</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify payment transaction UTR references and activate school subscription tiers instantly.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={loadAllData}
                      disabled={refreshing}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
                      <span>Sync Requests</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Controls */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Status Pills */}
                  <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setRequestStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        requestStatusFilter === 'all'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Requests ({subscriptionRequests.length})
                    </button>

                    <button
                      onClick={() => setRequestStatusFilter('pending')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        requestStatusFilter === 'pending'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-amber-300 hover:text-amber-100'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Pending ({subscriptionRequests.filter((r) => r.status === 'pending').length})</span>
                    </button>

                    <button
                      onClick={() => setRequestStatusFilter('approved')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        requestStatusFilter === 'approved'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800 text-emerald-400 hover:text-emerald-200'
                      }`}
                    >
                      Approved ({subscriptionRequests.filter((r) => r.status === 'approved').length})
                    </button>

                    <button
                      onClick={() => setRequestStatusFilter('rejected')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        requestStatusFilter === 'rejected'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-800 text-rose-400 hover:text-rose-200'
                      }`}
                    >
                      Rejected ({subscriptionRequests.filter((r) => r.status === 'rejected').length})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={requestSearchQuery}
                      onChange={(e) => setRequestSearchQuery(e.target.value)}
                      placeholder="Search by school, plan, or UTR..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Requests Table / Cards */}
                {subscriptionRequests.filter((r) => {
                  if (requestStatusFilter !== 'all' && r.status !== requestStatusFilter) return false;
                  if (requestSearchQuery.trim()) {
                    const q = requestSearchQuery.toLowerCase();
                    const schoolName = (typeof r.school === 'object' ? r.school?.name : '') || '';
                    const schoolCode = (typeof r.school === 'object' ? r.school?.code : '') || '';
                    const planName = (typeof r.plan === 'object' ? r.plan?.name : '') || '';
                    const utr = r.transactionReference || '';
                    return (
                      schoolName.toLowerCase().includes(q) ||
                      schoolCode.toLowerCase().includes(q) ||
                      planName.toLowerCase().includes(q) ||
                      utr.toLowerCase().includes(q)
                    );
                  }
                  return true;
                }).length === 0 ? (
                  <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center">
                    <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white">No Subscription Requests Found</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {requestStatusFilter === 'pending'
                        ? 'Awesome! All pending school subscription upgrade requests have been processed.'
                        : 'No records matching your current filter criteria.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptionRequests
                      .filter((r) => {
                        if (requestStatusFilter !== 'all' && r.status !== requestStatusFilter) return false;
                        if (requestSearchQuery.trim()) {
                          const q = requestSearchQuery.toLowerCase();
                          const schoolName = (typeof r.school === 'object' ? r.school?.name : '') || '';
                          const schoolCode = (typeof r.school === 'object' ? r.school?.code : '') || '';
                          const planName = (typeof r.plan === 'object' ? r.plan?.name : '') || '';
                          const utr = r.transactionReference || '';
                          return (
                            schoolName.toLowerCase().includes(q) ||
                            schoolCode.toLowerCase().includes(q) ||
                            planName.toLowerCase().includes(q) ||
                            utr.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((req) => {
                        const sch = typeof req.school === 'object' ? req.school : null;
                        const pl = typeof req.plan === 'object' ? req.plan : null;

                        return (
                          <div
                            key={req._id}
                            className={`p-5 rounded-3xl border transition-all ${
                              req.status === 'pending'
                                ? 'bg-slate-900/95 border-amber-500/40 shadow-lg shadow-amber-500/5'
                                : 'bg-slate-900/70 border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* School & Plan Details */}
                              <div className="flex items-start gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                                  {sch?.name ? sch.name.substring(0, 2).toUpperCase() : 'SC'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm sm:text-base font-black text-white">
                                      {sch?.name || 'School Campus'}
                                    </h3>
                                    {sch?.code && (
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        {sch.code}
                                      </span>
                                    )}
                                    {sch?.email && (
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        ({sch.email})
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                                    <span className="text-purple-300 font-bold flex items-center gap-1">
                                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                                      Requested Plan: <strong>{pl?.name || 'Plan'}</strong> ({pl?.code || 'TIER'})
                                    </span>
                                    <span className="text-slate-500">•</span>
                                    <span className="text-white font-extrabold">
                                      Amount: ₹{req.amount?.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-slate-500">•</span>
                                    <span className="text-slate-300">
                                      Duration: {req.durationDays >= 3650 ? 'Lifetime' : `${req.durationDays} Days`}
                                    </span>
                                  </div>

                                  {/* Payment Mode & Reference */}
                                  <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold uppercase text-[10px] border border-slate-700">
                                      Mode: {req.paymentMode}
                                    </span>
                                    {req.transactionReference && (
                                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/70 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-800/80">
                                        UTR / Ref: {req.transactionReference}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-slate-400">
                                      Submitted: {new Date(req.createdAt).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>

                                  {req.schoolNotes && (
                                    <p className="text-xs text-slate-400 mt-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
                                      <strong className="text-slate-300">School Note: </strong> {req.schoolNotes}
                                    </p>
                                  )}

                                  {req.adminRemarks && (
                                    <p className="text-xs text-indigo-300 mt-2 bg-indigo-950/30 px-3 py-1.5 rounded-xl border border-indigo-900/40">
                                      <strong className="text-indigo-200">Admin Remarks: </strong> {req.adminRemarks}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Status & Action Buttons */}
                              <div className="flex sm:flex-col items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                                {req.status === 'pending' && (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                                      <Clock className="w-3.5 h-3.5 animate-spin" />
                                      Pending Verification
                                    </span>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleOpenApprovalModal(req, 'reject')}
                                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-rose-300 hover:text-rose-100 text-xs font-bold border border-slate-700 hover:border-rose-800 transition-all cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => handleOpenApprovalModal(req, 'approve')}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Approve & Activate</span>
                                      </button>
                                    </div>
                                  </>
                                )}

                                {req.status === 'approved' && (
                                  <div className="text-right">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Approved & Active
                                    </span>
                                    {req.approvedAt && (
                                      <span className="text-[10px] text-slate-500 block mt-1">
                                        on {new Date(req.approvedAt).toLocaleDateString('en-IN')}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {req.status === 'rejected' && (
                                  <div className="text-right">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      Rejected
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <SchoolModal
        isOpen={isSchoolModalOpen}
        school={selectedSchoolForEdit}
        plans={plans}
        onClose={() => setIsSchoolModalOpen(false)}
        onSave={handleSaveSchool}
      />

      <PlanModal
        isOpen={isPlanModalOpen}
        plan={selectedPlanForEdit}
        onClose={() => setIsPlanModalOpen(false)}
        onSave={handleSavePlan}
      />

      <StatusConfirmModal
        isOpen={isStatusModalOpen}
        school={selectedSchoolForStatus}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleConfirmStatusChange}
      />

      {isApprovalModalOpen && selectedRequestForApproval && (
        <RequestApprovalModal
          request={selectedRequestForApproval}
          actionType={approvalActionType}
          onClose={() => setIsApprovalModalOpen(false)}
          onSuccess={(msg) => {
            showToast(msg, 'success');
            loadAllData();
          }}
        />
      )}
    </div>
  );
};
