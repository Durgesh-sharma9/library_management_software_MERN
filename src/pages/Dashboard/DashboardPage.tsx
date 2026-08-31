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
      <div className="flex items-center justify-center py-24 text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading Library Analytics...</span>
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
    <div className="space-y-6 pb-8">
      {/* Top Banner & Category Master Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Overview & Performance</h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              Live updates
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Real-time stock balance, assignments, dues, and circulation analytics
          </p>
        </div>

        {/* Dynamic Category Selector */}
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Category:</span>
          </div>
          <select
            id="dashboard-category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
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

      {/* 8 High-Density Metric Cards */}
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
          color="indigo"
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
          color="gray"
          onClick={() => onNavigateTab('assignments', { status: 'returned' })}
          badgeText="Cleared"
        />

        <StatCard
          id="stat-total-members"
          title="Total Students"
          value={summary.totalMembers}
          subtitle={`${summary.activeMembers} active`}
          icon={Users}
          color="violet"
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
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 text-base tracking-tight">Books by Category</h2>
                <p className="text-sm text-gray-500 mt-1">Available vs Assigned stock per classification</p>
              </div>
              <span className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1 rounded-full font-medium">
                Live Inventory
              </span>
            </div>

            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#6b7280"
                      fontSize={12}
                      fontWeight={500}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} fontWeight={500} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: '#1f2937',
                        fontSize: '12px',
                        fontWeight: '500',
                        padding: '8px 12px',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontWeight: '500', color: '#4b5563' }} />
                    <Bar dataKey="Available" stackId="categoryStock" fill="#10b981" radius={[0, 0, 0, 0]} barSize={28} />
                    <Bar dataKey="Assigned" stackId="categoryStock" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400 font-medium">
                  No category data available
                </div>
              )}
            </div>
          </div>

          {/* Metric Footers */}
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
            <div className="flex flex-col bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Categories</span>
              <span className="text-sm font-bold text-gray-900">{categories.length} Master Types</span>
            </div>
            <div className="flex flex-col bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Most Active</span>
              <span className="text-sm font-bold text-blue-900">{mostActiveCategory}</span>
            </div>
            <div className="flex flex-col bg-amber-50/50 p-3 rounded-lg border border-amber-100">
              <span className="text-xs text-amber-600 font-medium uppercase tracking-wider mb-1">Low Stock Alert</span>
              <span className="text-sm font-bold text-amber-900">{lowStockCategory}</span>
            </div>
          </div>
        </div>

        {/* Recent Circulation Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-6">
          <div className="pb-4 border-b border-gray-100 flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onNavigateTab('activity')}
              className="text-blue-600 hover:text-blue-700 text-xs font-semibold hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
            >
              See All History →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[340px] pr-2">
            {activities.length > 0 ? (
              activities.slice(0, 5).map((act) => {
                const isReturn = act.type === 'return';
                return (
                  <div key={act.id} className="flex gap-3 items-start p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isReturn
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-blue-100 text-blue-600'
                        }`}
                    >
                      {isReturn ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <BookOpen className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm text-gray-800 leading-snug">
                        <span className="font-semibold">{act.memberName}</span>{' '}
                        <span className={isReturn ? 'text-emerald-600' : 'text-blue-600'}>
                          {isReturn ? 'returned' : 'assigned'}
                        </span>{' '}
                        <span className="font-medium text-gray-900">'{act.bookTitle}'</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(act.timestamp).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {isReturn && act.fineAmount && act.fineAmount > 0 ? (
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-medium border border-rose-100">
                            Fine: {formatCurrency(act.fineAmount)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-gray-400 font-medium">No circulation activity recorded yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue & Due Today Warnings Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Overdue & Due Today Warnings</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              <span className="text-xs text-rose-700 font-semibold">Overdue ({summary.overdueBooks})</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-xs text-amber-700 font-semibold">Due Today ({summary.dueToday})</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Student Name</th>
                <th className="px-6 py-4 font-semibold">Book Title</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Fine Calc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {warningAssignments.length > 0 ? (
                warningAssignments.map((a) => {
                  const isOverdue = a.isOverdue || a.calculatedStatus === 'overdue';
                  const isDueToday = a.isDueToday || a.calculatedStatus === 'due_today';
                  return (
                    <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{a.member?.name || 'Student'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{a.member?.memberId || 'LIB'}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        {a.book?.title || 'Book Title'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(a.dueDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                            Overdue ({a.lateDays || 1}d)
                          </span>
                        ) : isDueToday ? (
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                            Due Today
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                            Due Soon
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {isOverdue ? (
                          <span className="text-rose-600">{formatCurrency(a.currentFine || 0)}</span>
                        ) : (
                          <span className="text-gray-400">₹0.00</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                    No overdue or urgent due warnings at present.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most Borrowed Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Most Borrowed Titles</h2>
          <div className="p-2 rounded-full bg-blue-50 text-blue-600">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        {data?.topBooks && data.topBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.topBooks.slice(0, 6).map((book, idx) => (
              <div
                key={book.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center shrink-0 ${idx === 0
                        ? 'bg-amber-100 text-amber-700'
                        : idx === 1
                          ? 'bg-slate-200 text-slate-700'
                          : idx === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-white text-gray-500 border border-gray-200'
                      }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="truncate pr-2">
                    <p className="font-semibold text-gray-900 truncate text-sm">{book.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{book.author}</p>
                  </div>
                </div>
                <span className="bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0">
                  {book.assignedTimes} loans
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No assignment records yet.</p>
        )}
      </div>
    </div>
  );
};