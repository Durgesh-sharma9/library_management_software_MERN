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
      <div className="flex items-center justify-center py-24 text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Loading Library Analytics...</span>
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
    <div className="space-y-3.5 pb-6">
      {/* Top Banner & Category Master Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-3 bg-slate-50/80 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Overview & Performance</h2>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Live updates
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Real-time stock balance, assignments, dues, and circulation analytics
          </p>
        </div>

        {/* Dynamic Category Selector */}
        <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-auto">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <Filter className="w-3 h-3 text-indigo-600" />
            <span>Category:</span>
          </div>
          <select
            id="dashboard-category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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

      {/* 8 High-Density Multi-Colored Metric Cards (Dabang UI Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <StatCard
          id="stat-total-books"
          title="Total Books"
          value={summary.totalBooks}
          subtitle={`${summary.totalBookTitles} titles`}
          icon={BookOpen}
          color="rose"
          onClick={() => onNavigateTab('books', { categoryId: selectedCategory !== 'all' ? selectedCategory : undefined })}
          badgeText="Catalog stock"
        />

        <StatCard
          id="stat-available-books"
          title="Available"
          value={summary.availableBooks}
          subtitle={`${summary.totalBooks > 0 ? Math.round((summary.availableBooks / summary.totalBooks) * 100) : 0}% of total`}
          icon={CheckCircle2}
          color="amber"
          onClick={() => onNavigateTab('books', { status: 'available', categoryId: selectedCategory !== 'all' ? selectedCategory : undefined })}
          badgeText="In stock"
        />

        <StatCard
          id="stat-assigned-books"
          title="Assigned"
          value={summary.assignedBooks}
          subtitle="Currently with students"
          icon={BookmarkCheck}
          color="emerald"
          onClick={() => onNavigateTab('assignments', { status: 'assigned' })}
          badgeText="View list"
        />

        <StatCard
          id="stat-overdue-books"
          title="Overdue"
          value={summary.overdueBooks}
          subtitle="Past due date"
          icon={AlertOctagon}
          color="purple"
          onClick={() => onNavigateTab('assignments', { status: 'overdue' })}
          badgeText="Critical"
        />

        <StatCard
          id="stat-returned-books"
          title="Returned Books"
          value={summary.returnedBooks || 0}
          subtitle="Cleared circulation history"
          icon={CheckCircle2}
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
          color="rose"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-3.5">
        {/* Books by Category Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight">Books by Category</h2>
                <p className="text-[10px] text-slate-400 font-medium">Available vs Assigned stock per classification</p>
              </div>
              <span className="text-[9px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                Live Inventory
              </span>
            </div>

            <div className="h-56 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={10}
                      fontWeight={500}
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight={500} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '500',
                        padding: '6px 10px',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '6px', fontSize: '11px', fontWeight: '500' }} />
                    <Bar dataKey="Available" stackId="categoryStock" fill="#34d399" radius={[0, 0, 0, 0]} barSize={22} />
                    <Bar dataKey="Assigned" stackId="categoryStock" fill="#818cf8" radius={[3, 3, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400 font-medium">
                  No category data available
                </div>
              )}
            </div>
          </div>

          {/* Metric Footers */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2">
            <div className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[9px] text-slate-400 font-semibold uppercase">Total Categories</span>
              <span className="text-[11px] font-bold text-slate-800">{categories.length} Master Types</span>
            </div>
            <div className="flex flex-col bg-sky-50/70 p-2 rounded-lg border border-sky-100">
              <span className="text-[9px] text-sky-700 font-semibold uppercase">Most Active</span>
              <span className="text-[11px] font-bold text-sky-800">{mostActiveCategory}</span>
            </div>
            <div className="flex flex-col bg-amber-50/70 p-2 rounded-lg border border-amber-100">
              <span className="text-[9px] text-amber-700 font-semibold uppercase">Low Stock Alert</span>
              <span className="text-[11px] font-bold text-amber-800">{lowStockCategory}</span>
            </div>
          </div>
        </div>

        {/* Recent Circulation Activity */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col p-3.5 sm:p-4">
          <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-[11px] uppercase tracking-tight">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onNavigateTab('activity')}
              className="text-slate-600 hover:text-indigo-600 text-[10px] font-semibold hover:underline cursor-pointer bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md"
            >
              See All History →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-2.5 space-y-2.5 max-h-64">
            {activities.length > 0 ? (
              activities.slice(0, 5).map((act) => {
                const isReturn = act.type === 'return';
                return (
                  <div key={act.id} className="flex gap-2.5 items-start p-1 rounded-xl hover:bg-slate-50 transition-colors">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isReturn
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                      }`}
                    >
                      {isReturn ? (
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-800 leading-snug">
                        <span className="font-semibold">{act.memberName}</span>{' '}
                        <span className={isReturn ? 'text-emerald-700 font-medium' : 'text-indigo-700 font-medium'}>
                          {isReturn ? 'returned' : 'assigned'}
                        </span>{' '}
                        <span className="font-semibold italic text-slate-900">'{act.bookTitle}'</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(act.timestamp).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {isReturn && act.fineAmount && act.fineAmount > 0 ? (
                          <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200 font-semibold">
                            Fine: {formatCurrency(act.fineAmount)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">No circulation activity recorded yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue & Due Today Warnings Table (High Density) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80">
          <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-tight">Overdue & Due Today Warnings</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              <span className="text-[10px] text-rose-800 font-bold">Overdue ({summary.overdueBooks})</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-[10px] text-amber-800 font-bold">Due Today ({summary.dueToday})</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100 font-bold">
              <tr>
                <th className="px-4 sm:px-6 py-2.5 font-bold">Student Name</th>
                <th className="px-4 sm:px-6 py-2.5 font-bold">Book Title</th>
                <th className="px-4 sm:px-6 py-2.5 font-bold">Due Date</th>
                <th className="px-4 sm:px-6 py-2.5 font-bold">Status</th>
                <th className="px-4 sm:px-6 py-2.5 font-bold text-right">Fine Calc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warningAssignments.length > 0 ? (
                warningAssignments.map((a) => {
                  const isOverdue = a.isOverdue || a.calculatedStatus === 'overdue';
                  const isDueToday = a.isDueToday || a.calculatedStatus === 'due_today';
                  return (
                    <tr key={a._id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 sm:px-6 py-2.5 font-bold text-slate-900">
                        {a.member?.name || 'Student'}{' '}
                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                          ({a.member?.memberId || 'LIB'})
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-2.5 italic text-slate-700 font-medium">
                        {a.book?.title || 'Book Title'}
                      </td>
                      <td className="px-4 sm:px-6 py-2.5 text-slate-600 font-medium">
                        {new Date(a.dueDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 sm:px-6 py-2.5">
                        {isOverdue ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-2xs">
                            OVERDUE ({a.lateDays || 1}d)
                          </span>
                        ) : isDueToday ? (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-2xs">
                            Due Today
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-2xs tracking-tight">
                            Due Soon
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-2.5 text-right font-mono font-bold">
                        {isOverdue ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">{formatCurrency(a.currentFine || 0)}</span>
                        ) : (
                          <span className="text-slate-400">₹0.00</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-xs text-slate-400 font-medium">
                    No overdue or urgent due warnings at present.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most Borrowed Leaderboard */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-tight">Most Borrowed Titles</h2>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <BookMarked className="w-4 h-4" />
          </div>
        </div>
        {data?.topBooks && data.topBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.topBooks.slice(0, 6).map((book, idx) => (
              <div
                key={book.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-200/70 hover:border-blue-300 transition-all shadow-2xs text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs ${
                      idx === 0
                        ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-white'
                        : idx === 1
                        ? 'bg-gradient-to-tr from-slate-400 to-slate-600 text-white'
                        : idx === 2
                        ? 'bg-gradient-to-tr from-amber-600 to-amber-800 text-white'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-900 truncate text-[11px]">{book.title}</p>
                    <p className="text-[10px] text-slate-400 truncate font-medium">{book.author}</p>
                  </div>
                </div>
                <span className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2 shadow-2xs">
                  {book.assignedTimes} loans
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4 font-medium">No assignment records yet.</p>
        )}
      </div>
    </div>
  );
};

