import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  BookmarkCheck,
  Clock,
  AlertOctagon,
  Users,
  IndianRupee,
  RotateCcw,
  TrendingUp,
  Filter,
  Calendar,
  Sparkles,
  ArrowRight,
  BookMarked,
  Layers,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardService, categoryService, assignmentService } from '../../services/api';
import { DashboardData, BookCategory, RecentActivityItem, Assignment } from '../../types';
import { StatCard } from '../../components/StatCard';
import { useSettings } from '../../context/SettingsContext';
import { NavTab } from '../../components/Sidebar';

interface DashboardPageProps {
  onNavigateTab: (tab: NavTab, filterParams?: { status?: string; categoryId?: string }) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const { formatCurrency } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [warningAssignments, setWarningAssignments] = useState<Assignment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboard = async (catId?: string) => {
    try {
      setLoading(true);
      const [dashData, recentData, cats, allAssignments] = await Promise.all([
        dashboardService.getAnalytics(catId === 'all' ? undefined : catId),
        dashboardService.getRecentActivity(),
        categoryService.getAll(true),
        assignmentService.getAll({ status: 'assigned' }),
      ]);
      setData(dashData);
      setActivities(recentData);
      setCategories(cats);

      // Filter warning assignments: overdue or due today
      const warnings = allAssignments
        .filter((a) => a.isOverdue || a.isDueToday || a.calculatedStatus === 'overdue' || a.calculatedStatus === 'due_today')
        .slice(0, 6);
      setWarningAssignments(warnings);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedCategory);
  }, [selectedCategory]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-indigo-600 tracking-wider uppercase">Loading Workspace...</span>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalBookTitles: 0,
    totalBooks: 0,
    availableBooks: 0,
    assignedBooks: 0,
    dueToday: 0,
    dueSoon: 0,
    overdueBooks: 0,
    totalMembers: 0,
    activeMembers: 0,
    pendingFine: 0,
    returnedBooks: 0,
    totalAssignments: 0,
  };

  // Prepare chart data for categories
  const chartData = (data?.categoryAnalytics || []).map((cat) => ({
    name: cat.name,
    Available: cat.available,
    Assigned: cat.assigned,
    Total: cat.total,
  }));

  const pieData = (data?.categoryAnalytics || [])
    .filter((c) => c.total > 0)
    .map((cat) => ({
      name: cat.name,
      value: cat.total,
    }));

  // Identify most active & low stock categories
  const sortedCategories = [...(data?.categoryAnalytics || [])].sort((a, b) => b.assigned - a.assigned);
  const mostActiveCategory = sortedCategories[0]?.name || 'N/A';
  const lowStockCategory = (data?.categoryAnalytics || []).find((c) => c.available <= 2 && c.total > 0)?.name || 'None';

  return (
    <div className="space-y-6 pb-8 bg-white min-h-screen">
      {/* Top Banner & Category Master Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border-2 border-indigo-50 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Workspace Overview</h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              Live updates
            </span>
          </div>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Real-time stock balance, assignments, dues, and circulation analytics
          </p>
        </div>

        {/* Dynamic Category Selector */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border-2 border-slate-100 shadow-sm self-start sm:self-auto">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Filter className="w-4 h-4 text-emerald-500" />
            <span>Category:</span>
          </div>
          <select
            id="dashboard-category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="bg-white text-slate-800 text-sm font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name} {!cat.isActive ? '(Inactive)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 8 High-Density Metric Cards (Vibrant Solid Colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          id="stat-total-books"
          title="Total Books"
          value={summary.totalBooks}
          subtitle={`${summary.totalBookTitles} titles`}
          icon={BookOpen}
          color="blue"
          onClick={() => onNavigateTab('books', { categoryId: selectedCategory !== 'all' ? selectedCategory : undefined })}
          badgeText="Catalog stock"
        />

        <StatCard
          id="stat-available-books"
          title="Available"
          value={summary.availableBooks}
          subtitle={`${summary.totalBooks > 0 ? Math.round((summary.availableBooks / summary.totalBooks) * 100) : 0}% of total`}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => onNavigateTab('books', { status: 'available', categoryId: selectedCategory !== 'all' ? selectedCategory : undefined })}
          badgeText="In stock"
        />

        <StatCard
          id="stat-assigned-books"
          title="Assigned"
          value={summary.assignedBooks}
          subtitle="Currently with students"
          icon={BookmarkCheck}
          color="purple"
          onClick={() => onNavigateTab('assignments', { status: 'assigned' })}
          badgeText="View list"
        />

        <StatCard
          id="stat-overdue-books"
          title="Overdue"
          value={summary.overdueBooks}
          subtitle="Past due date"
          icon={AlertOctagon}
          color="rose"
          onClick={() => onNavigateTab('assignments', { status: 'overdue' })}
          badgeText="Critical"
        />

        <StatCard
          id="stat-returned-books"
          title="Returned Books"
          value={summary.returnedBooks || 0}
          subtitle="Cleared circulation history"
          icon={RotateCcw}
          color="sky"
          onClick={() => onNavigateTab('assignments', { status: 'returned' })}
          badgeText="Cleared"
        />

        <StatCard
          id="stat-total-members"
          title="Total Students"
          value={summary.totalMembers}
          subtitle={`${summary.activeMembers} active`}
          icon={Users}
          color="indigo"
          onClick={() => onNavigateTab('students')}
          badgeText="Directory"
        />

        <StatCard
          id="stat-pending-fine"
          title="Pending Fines"
          value={formatCurrency(summary.pendingFine)}
          subtitle="Uncollected penalties"
          icon={IndianRupee}
          color="amber"
          onClick={() => onNavigateTab('assignments', { status: 'pending_fine' })}
          badgeText="Unpaid"
        />

        <StatCard
          id="stat-lost-damaged-books"
          title="Lost / Damaged"
          value={(summary.lostBooks || 0) + (summary.damagedBooks || 0)}
          subtitle={`${summary.lostBooks || 0} lost, ${summary.damagedBooks || 0} damaged`}
          icon={ShieldAlert}
          color="teal"
          onClick={() => onNavigateTab('lost-damaged')}
          badgeText="Audit logs"
        />
      </div>

      {/* Category Analytics & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Books by Category Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-50">
              <div>
                <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">Analytics by Category</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Available vs Assigned stock per classification</p>
              </div>
              <span className="text-xs bg-white border-2 border-slate-200 text-slate-700 px-4 py-1.5 rounded-full font-bold">
                Live Inventory
              </span>
            </div>

            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={12}
                      fontWeight={600}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis stroke="#94a3b8" fontSize={12} fontWeight={600} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: '#0f172a',
                        fontSize: '13px',
                        fontWeight: '700',
                        padding: '10px 14px',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontWeight: '700', color: '#334155' }} />
                    <Bar dataKey="Available" stackId="categoryStock" fill="#10b981" radius={[0, 0, 0, 0]} barSize={32} />
                    <Bar dataKey="Assigned" stackId="categoryStock" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-400 font-bold">
                  No category data available
                </div>
              )}
            </div>
          </div>

          {/* Metric Footers - Solid Colors, No Gradients */}
          <div className="mt-6 pt-4 border-t-2 border-slate-50 grid grid-cols-3 gap-4">
            <div className="flex flex-col bg-white p-4 rounded-xl border-2 border-slate-100">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Categories</span>
              <span className="text-base font-black text-slate-900">{categories.length} Master Types</span>
            </div>
            <div className="flex flex-col bg-white p-4 rounded-xl border-2 border-indigo-100">
              <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Most Active</span>
              <span className="text-base font-black text-indigo-900">{mostActiveCategory}</span>
            </div>
            <div className="flex flex-col bg-white p-4 rounded-xl border-2 border-rose-100">
              <span className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1">Low Stock Alert</span>
              <span className="text-base font-black text-rose-900">{lowStockCategory}</span>
            </div>
          </div>
        </div>

        {/* Recent Circulation Activity */}
        <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col p-6">
          <div className="pb-4 border-b-2 border-slate-50 flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-slate-900 text-base tracking-tight">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onNavigateTab('activity')}
              className="text-indigo-600 hover:text-white hover:bg-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border-2 border-indigo-100 hover:border-indigo-600"
            >
              See All →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[340px] pr-2">
            {activities.length > 0 ? (
              activities.slice(0, 5).map((act) => {
                const isReturn = act.type === 'return';
                return (
                  <div key={act.id} className="flex gap-4 items-start p-3 rounded-xl bg-white border-2 border-slate-50 hover:border-slate-200 transition-colors">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isReturn
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-indigo-100 text-indigo-600'
                        }`}
                    >
                      {isReturn ? (
                        <RotateCcw className="w-5 h-5 font-bold" />
                      ) : (
                        <BookOpen className="w-5 h-5 font-bold" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm text-slate-800 leading-snug">
                        <span className="font-extrabold">{act.memberName}</span>{' '}
                        <span className={isReturn ? 'text-emerald-600 font-bold' : 'text-indigo-600 font-bold'}>
                          {isReturn ? 'returned' : 'assigned'}
                        </span>{' '}
                        <span className="font-bold text-slate-900">'{act.bookTitle}'</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(act.timestamp).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {isReturn && act.fineAmount && act.fineAmount > 0 ? (
                          <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">
                            Fine: {formatCurrency(act.fineAmount)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-slate-400 font-bold">No circulation activity recorded yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue & Due Today Warnings Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b-2 border-slate-50 flex items-center justify-between px-6 bg-white">
          <h2 className="font-extrabold text-slate-900 text-base tracking-tight">Overdue & Due Today Warnings</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-rose-100 px-4 py-1.5 rounded-full">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></div>
              <span className="text-xs text-rose-800 font-black tracking-wider uppercase">Overdue ({summary.overdueBooks})</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-100 px-4 py-1.5 rounded-full">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <span className="text-xs text-amber-800 font-black tracking-wider uppercase">Due Today ({summary.dueToday})</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm bg-white">
            <thead className="bg-white text-slate-500 uppercase text-xs tracking-wider border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-4 font-black">Student Name</th>
                <th className="px-6 py-4 font-black">Book Title</th>
                <th className="px-6 py-4 font-black">Due Date</th>
                <th className="px-6 py-4 font-black">Status</th>
                <th className="px-6 py-4 font-black text-right">Fine Calc.</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {warningAssignments.length > 0 ? (
                warningAssignments.map((a) => {
                  const isOverdue = a.isOverdue || a.calculatedStatus === 'overdue';
                  const isDueToday = a.isDueToday || a.calculatedStatus === 'due_today';
                  return (
                    <tr key={a._id} className="hover:bg-slate-50 transition-colors bg-white">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900">{a.member?.name || 'Student'}</div>
                        <div className="text-xs text-slate-500 font-bold mt-1">{a.member?.memberId || 'LIB'}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-bold">
                        {a.book?.title || 'Book Title'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-bold">
                        {new Date(a.dueDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">
                            Overdue ({a.lateDays || 1}d)
                          </span>
                        ) : isDueToday ? (
                          <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">
                            Due Today
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">
                            Due Soon
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-base">
                        {isOverdue ? (
                          <span className="text-rose-600">{formatCurrency(a.currentFine || 0)}</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400 font-bold bg-white">
                    No overdue or urgent due warnings at present.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most Borrowed Leaderboard - Pure White BG, Solid Highlights */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-50">
          <h2 className="font-extrabold text-slate-900 text-base tracking-tight">Most Borrowed Titles</h2>
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
            <TrendingUp className="w-5 h-5 font-bold" />
          </div>
        </div>
        {data?.topBooks && data.topBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.topBooks.slice(0, 6).map((book, idx) => (
              <div
                key={book.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white border-2 border-slate-100 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${idx === 0
                        ? 'bg-amber-400 text-white'
                        : idx === 1
                          ? 'bg-slate-400 text-white'
                          : idx === 2
                            ? 'bg-orange-500 text-white'
                            : 'bg-blue-50 text-blue-600'
                      }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="truncate pr-2">
                    <p className="font-extrabold text-slate-900 truncate text-sm">{book.title}</p>
                    <p className="text-xs text-slate-500 font-bold truncate mt-1">{book.author}</p>
                  </div>
                </div>
                <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-black shrink-0">
                  {book.assignedTimes} loans
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 font-bold text-center py-6">No assignment records yet.</p>
        )}
      </div>
    </div>
  );
};