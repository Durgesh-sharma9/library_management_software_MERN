import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  History,
  Search,
  Download,
  Printer,
  Calendar,
  IndianRupee,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Eye,
  FileText,
  GraduationCap,
  Briefcase,
  Phone,
  Check,
  ChevronDown,
  ArrowUpDown,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react';
import { assignmentService, bookService, memberService, categoryService } from '../../services/api';
import { Assignment, Book, Member, BookCategory } from '../../types';
import { Modal } from '../../components/Modal';
import { SearchableSelect, Option } from '../../components/SearchableSelect';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';

interface ActivityHistoryPageProps {
  initialFilter?: {
    status?: string;
    memberId?: string;
    bookId?: string;
  };
}

export const ActivityHistoryPage: React.FC<ActivityHistoryPageProps> = ({ initialFilter }) => {
  const { settings, formatCurrency } = useSettings();

  // Helper formatting routines to prevent duplications like 'Class Class 10' or '+91 +91'
  const formatPhoneDisplay = (phone?: string) => {
    if (!phone) return '';
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
    }
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return `+91 ${digitsOnly.slice(2, 7)} ${digitsOnly.slice(7)}`;
    }
    return phone;
  };

  const getCleanWhatsAppLink = (phone?: string) => {
    if (!phone) return '#';
    const digitsOnly = phone.replace(/\D/g, '');
    const fullNumber = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
    return `https://wa.me/${fullNumber}`;
  };

  const formatClassDisplay = (className?: string, section?: string) => {
    if (!className) return section ? `Section ${section}` : 'General';
    const cleaned = className.replace(/^class\s+/i, '').trim();
    const sec = section ? ` - ${section}` : '';
    return `Class ${cleaned}${sec}`;
  };

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter?.status || 'all');
  const [selectedFineStatus, setSelectedFineStatus] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>(initialFilter?.memberId || 'all');
  const [selectedBook, setSelectedBook] = useState<string>(initialFilter?.bookId || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'assignedDesc' | 'assignedAsc' | 'fineDesc' | 'dueDate'>('assignedDesc');
  
  const [dateType, setDateType] = useState<'assigned' | 'returned'>('assigned');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // View Mode: 'all-logs' | 'student-wise' | 'book-wise'
  const [viewMode, setViewMode] = useState<'all-logs' | 'student-wise' | 'book-wise'>('all-logs');

  // Detail / Receipt Modal
  const [selectedRecord, setSelectedRecord] = useState<Assignment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [settlingFineId, setSettlingFineId] = useState<string | null>(null);

  // Student Dossier Modal
  const [selectedStudentDossierId, setSelectedStudentDossierId] = useState<string | null>(null);
  const [isStudentDossierOpen, setIsStudentDossierOpen] = useState<boolean>(false);

  // Book Dossier Modal
  const [selectedBookDossierId, setSelectedBookDossierId] = useState<string | null>(null);
  const [isBookDossierOpen, setIsBookDossierOpen] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Fetch all master data
  const fetchData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setLoading(true);

      const [allAssignments, allBooks, allMembers, allCategories] = await Promise.all([
        assignmentService.getAll(),
        bookService.getAll(),
        memberService.getAll(),
        categoryService.getAll(true),
      ]);
      setAssignments(allAssignments || []);
      setBooks(allBooks || []);
      setMembers(allMembers || []);
      setCategories(allCategories || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Date Preset handler
  const handleDatePreset = (preset: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - 7);
      setFromDate(startOfWeek.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(today.getDate() - 30);
      setFromDate(startOfMonth.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedStatus('all');
    setSelectedFineStatus('all');
    setSelectedMember('all');
    setSelectedBook('all');
    setSelectedCategory('all');
    setDatePreset('all');
    setFromDate('');
    setToDate('');
  };

  const hasActiveFilters =
    search ||
    selectedStatus !== 'all' ||
    selectedFineStatus !== 'all' ||
    selectedMember !== 'all' ||
    selectedBook !== 'all' ||
    selectedCategory !== 'all' ||
    datePreset !== 'all' ||
    fromDate ||
    toDate;

  // Filtered & Sorted Assignments
  const filteredAssignments = useMemo(() => {
    const list = assignments.filter((item) => {
      // 1. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const studentName = item.member?.name?.toLowerCase() || '';
        const memberId = item.member?.memberId?.toLowerCase() || '';
        const studentClass = (item.member?.className || '').toLowerCase();
        const bookTitle = item.book?.title?.toLowerCase() || '';
        const bookAuthor = item.book?.author?.toLowerCase() || '';
        const bookIsbn = (item.book?.isbn || '').toLowerCase();
        const remarks = (item.remarks || '').toLowerCase();

        const matches =
          studentName.includes(q) ||
          memberId.includes(q) ||
          studentClass.includes(q) ||
          bookTitle.includes(q) ||
          bookAuthor.includes(q) ||
          bookIsbn.includes(q) ||
          remarks.includes(q);
        if (!matches) return false;
      }

      // 2. Member filter
      if (selectedMember !== 'all') {
        const mId = item.member?._id?.toString() || item.member?.toString();
        if (mId !== selectedMember) return false;
      }

      // 3. Book filter
      if (selectedBook !== 'all') {
        const bId = item.book?._id?.toString() || item.book?.toString();
        if (bId !== selectedBook) return false;
      }

      // 4. Category filter
      if (selectedCategory !== 'all') {
        const cat = item.book?.category;
        const catId = typeof cat === 'object' && cat ? cat._id : cat;
        if (catId !== selectedCategory) return false;
      }

      // 5. Circulation Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'assigned' && item.status === 'returned') return false;
        if (selectedStatus === 'returned' && item.status !== 'returned') return false;
        if (selectedStatus === 'overdue' && (!item.isOverdue || item.status === 'returned')) return false;
        if (selectedStatus === 'due_today' && !item.isDueToday) return false;
      }

      // 6. Fine Status filter
      if (selectedFineStatus !== 'all') {
        if (selectedFineStatus === 'paid' && item.fineStatus !== 'paid') return false;
        if (selectedFineStatus === 'pending') {
          const isPending =
            item.fineStatus === 'pending' || (item.isOverdue && (item.currentFine || 0) > 0);
          if (!isPending) return false;
        }
        if (selectedFineStatus === 'none' && (item.fineAmount > 0 || (item.currentFine || 0) > 0)) {
          return false;
        }
      }

      // 7. Date Filter
      const targetDateStr = dateType === 'assigned' ? item.assignedDate : item.returnedDate;
      if (fromDate) {
        if (!targetDateStr) return false;
        const targetDate = new Date(targetDateStr).getTime();
        const from = new Date(fromDate).setHours(0, 0, 0, 0);
        if (targetDate < from) return false;
      }
      if (toDate) {
        if (!targetDateStr) return false;
        const targetDate = new Date(targetDateStr).getTime();
        const to = new Date(toDate).setHours(23, 59, 59, 999);
        if (targetDate > to) return false;
      }

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'assignedDesc') {
        return new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime();
      }
      if (sortBy === 'assignedAsc') {
        return new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime();
      }
      if (sortBy === 'fineDesc') {
        const fineA = a.fineAmount || a.currentFine || 0;
        const fineB = b.fineAmount || b.currentFine || 0;
        return fineB - fineA;
      }
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  }, [
    assignments,
    search,
    selectedMember,
    selectedBook,
    selectedCategory,
    selectedStatus,
    selectedFineStatus,
    dateType,
    fromDate,
    toDate,
    sortBy,
  ]);

  // High level metrics
  const metrics = useMemo(() => {
    let totalLogs = assignments.length;
    let activeIssued = 0;
    let studentActiveIssued = 0;
    let teacherActiveIssued = 0;
    let returnedCount = 0;
    let overdueCount = 0;
    let totalFineCollected = 0;
    let totalFinePending = 0;

    assignments.forEach((a) => {
      const isReturned = a.status === 'returned';
      const isTeacher = (a.member as any)?.memberType === 'teacher';

      if (isReturned) {
        returnedCount++;
        if (a.fineStatus === 'paid' && a.fineAmount > 0) {
          totalFineCollected += a.fineAmount;
        } else if (a.fineStatus === 'pending' && a.fineAmount > 0) {
          totalFinePending += a.fineAmount;
        }
      } else {
        activeIssued++;
        if (isTeacher) {
          teacherActiveIssued++;
        } else {
          studentActiveIssued++;
        }

        if (a.isOverdue) {
          overdueCount++;
          totalFinePending += a.currentFine || 0;
        }
      }
    });

    return {
      totalLogs,
      activeIssued,
      studentActiveIssued,
      teacherActiveIssued,
      returnedCount,
      overdueCount,
      totalFineCollected,
      totalFinePending,
      totalFineAmount: totalFineCollected + totalFinePending,
    };
  }, [assignments]);

  // Fine settlement
  const handleSettleFine = async (assignmentId: string) => {
    try {
      setSettlingFineId(assignmentId);
      await assignmentService.updateFineStatus(assignmentId, {
        fineStatus: 'paid',
        remarks: 'Fine collected and settled via Activity History',
      });
      await fetchData(true);
      if (selectedRecord && selectedRecord._id === assignmentId) {
        setSelectedRecord((prev) => (prev ? { ...prev, fineStatus: 'paid' } : null));
      }
    } catch (err) {
      console.error('Failed to settle fine:', err);
    } finally {
      setSettlingFineId(null);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredAssignments.length === 0) return;

    const headers = [
      'Record ID',
      'Student Name',
      'Member ID',
      'Class & Section',
      'Student Contact',
      'Book Title',
      'Book Author',
      'Language',
      'Category',
      'Issued Date',
      'Due Date',
      'Returned Date',
      'Circulation Status',
      'Late Days',
      'Fine Amount (INR)',
      'Fine Status',
      'Remarks',
    ];

    const rows = filteredAssignments.map((a) => {
      const cat = typeof a.book?.category === 'object' ? a.book?.category?.name : 'General';
      const isRet = a.status === 'returned' || !!a.returnedDate;
      const statusLabel = isRet ? 'Returned' : a.isOverdue ? 'Overdue' : 'Currently Issued';
      const fineVal = a.fineAmount || a.currentFine || 0;

      return [
        `"${a._id}"`,
        `"${a.member?.name || 'N/A'}"`,
        `"${a.member?.memberId || 'N/A'}"`,
        `"${a.member?.className || '-'} ${a.member?.section || ''}"`,
        `"${a.member?.whatsapp || a.member?.phone || '-'}"`,
        `"${(a.book?.title || 'Unknown').replace(/"/g, '""')}"`,
        `"${(a.book?.author || 'Unknown').replace(/"/g, '""')}"`,
        `"${a.book?.language || 'English'}"`,
        `"${cat}"`,
        `"${new Date(a.assignedDate).toLocaleDateString('en-IN')}"`,
        `"${new Date(a.dueDate).toLocaleDateString('en-IN')}"`,
        `"${a.returnedDate ? new Date(a.returnedDate).toLocaleDateString('en-IN') : 'Not Returned'}"`,
        `"${statusLabel}"`,
        `"${a.lateDays || 0}"`,
        `"${fineVal}"`,
        `"${(a.fineStatus || 'none').toUpperCase()}"`,
        `"${(a.remarks || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Library_Circulation_History_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Slip
  const handlePrintSlip = () => {
    window.print();
  };

  // Grouped by Student Data
  const studentGroups = useMemo(() => {
    const map = new Map<
      string,
      { member: Member; items: Assignment[]; totalFine: number; paidFine: number }
    >();

    assignments.forEach((a) => {
      if (!a.member) return;
      const mId = a.member._id?.toString() || a.member.memberId;
      if (!map.has(mId)) {
        map.set(mId, {
          member: a.member,
          items: [],
          totalFine: 0,
          paidFine: 0,
        });
      }
      const entry = map.get(mId)!;
      entry.items.push(a);
      const fineVal = a.fineAmount || a.currentFine || 0;
      entry.totalFine += fineVal;
      if (a.fineStatus === 'paid') {
        entry.paidFine += fineVal;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [assignments]);

  // Grouped by Book Data
  const bookGroups = useMemo(() => {
    const map = new Map<
      string,
      { book: Book; items: Assignment[]; uniqueBorrowers: Set<string> }
    >();

    assignments.forEach((a) => {
      if (!a.book) return;
      const bId = a.book._id?.toString() || a.book.title;
      if (!map.has(bId)) {
        map.set(bId, {
          book: a.book,
          items: [],
          uniqueBorrowers: new Set(),
        });
      }
      const entry = map.get(bId)!;
      entry.items.push(a);
      if (a.member?.memberId) {
        entry.uniqueBorrowers.add(a.member.memberId);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [assignments]);

  // Active Selected Dossiers for Popups
  const activeStudentDossier = useMemo(() => {
    if (!selectedStudentDossierId) return null;
    return (
      studentGroups.find(
        (g) =>
          g.member._id === selectedStudentDossierId ||
          g.member.memberId === selectedStudentDossierId
      ) || null
    );
  }, [selectedStudentDossierId, studentGroups]);

  const activeBookDossier = useMemo(() => {
    if (!selectedBookDossierId) return null;
    return (
      bookGroups.find(
        (g) =>
          g.book._id === selectedBookDossierId ||
          g.book.title === selectedBookDossierId
      ) || null
    );
  }, [selectedBookDossierId, bookGroups]);

  // Select Options
  const memberOptions: Option[] = [
    { value: 'all', label: 'All Students & Members' },
    ...members.map((m) => ({
      value: m._id,
      label: `${m.name} (${m.memberId}) - Class ${m.className || 'General'}`,
    })),
  ];

  const bookOptions: Option[] = [
    { value: 'all', label: 'All Books & Titles' },
    ...books.map((b) => ({
      value: b._id,
      label: `${b.title} - by ${b.author}`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <History className="w-6 h-6 text-blue-600" />
            <span>Circulation & Activity History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete audit records of all student & faculty book circulation, late days, and fine payments.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredAssignments.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({filteredAssignments.length})</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-[#EFF6FF] p-4 rounded-2xl border border-[#BFDBFE] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Active Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/20">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-950 mt-2">{metrics.studentActiveIssued}</p>
          <span className="text-[10px] text-blue-700 font-semibold mt-1">Active Students Borrowing</span>
        </div>

        <div className="bg-[#EEF2FF] p-4 rounded-2xl border border-[#C7D2FE] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Active Teachers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-950 mt-2">{metrics.teacherActiveIssued}</p>
          <span className="text-[10px] text-indigo-700 font-semibold mt-1">Faculty Members Borrowing</span>
        </div>

        <div className="bg-[#FFF1F2] p-4 rounded-2xl border border-[#FECDD3] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shadow-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-950 mt-2">{metrics.overdueCount}</p>
          <span className="text-[10px] text-rose-700 font-semibold mt-1">Past designated due date</span>
        </div>

        <div className="bg-[#ECFDF5] p-4 rounded-2xl border border-[#A7F3D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Fines Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-950 mt-2">{formatCurrency(metrics.totalFineCollected)}</p>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1">Collected in full</span>
        </div>

        <div className="bg-[#FFFBEB] p-4 rounded-2xl border border-[#FDE68A] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Fines</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-950 mt-2">{formatCurrency(metrics.totalFinePending)}</p>
          <span className="text-[10px] text-amber-700 font-semibold mt-1">Due from late returns</span>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 gap-2 overflow-x-auto">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('all-logs')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              viewMode === 'all-logs'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Master Circulation Feed ({filteredAssignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('student-wise')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              viewMode === 'student-wise'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student-Wise Dossier ({studentGroups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('book-wise')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              viewMode === 'book-wise'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Book-Wise Circulation Log ({bookGroups.length})</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS CARD */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
        {/* Row 1: Search & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, book, author, ID..."
              className="w-full pl-9 pr-7 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Student Filter */}
          <div className="text-xs">
            <SearchableSelect
              options={memberOptions}
              value={selectedMember}
              onChange={setSelectedMember}
              placeholder="Filter by Student..."
            />
          </div>

          {/* Book Filter */}
          <div className="text-xs">
            <SearchableSelect
              options={bookOptions}
              value={selectedBook}
              onChange={setSelectedBook}
              placeholder="Filter by Book..."
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden transition-colors"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Status, Fine Status & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <span className="text-[11px] font-semibold text-slate-500">Status:</span>
            {[
              { id: 'all', label: 'All Status' },
              { id: 'assigned', label: 'Currently Issued' },
              { id: 'returned', label: 'Returned' },
              { id: 'overdue', label: 'Overdue' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedStatus === st.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

            {/* Fine Status Pills */}
            <span className="text-[11px] font-semibold text-slate-500">Fine:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Fine Pending' },
              { id: 'paid', label: 'Fine Paid' },
              { id: 'none', label: 'No Fine' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFineStatus(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedFineStatus === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors ml-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Date Presets & Sorting */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Sort By Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-2 py-1 bg-slate-100 border-none rounded-md text-xs font-medium text-slate-700 outline-hidden"
              >
                <option value="assignedDesc">Latest Issued First</option>
                <option value="assignedAsc">Oldest Issued First</option>
                <option value="fineDesc">Highest Fine</option>
                <option value="dueDate">Due Date Soonest</option>
              </select>
            </div>

            {/* Date Preset Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
              {(['all', 'today', 'week', 'month', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleDatePreset(p)}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer capitalize ${
                    datePreset === p
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p === 'week' ? '7 Days' : p === 'month' ? '30 Days' : p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Date Range Selectors */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 rounded-lg">
            <span className="text-xs font-medium text-slate-700">Filter By Date:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDateType('assigned')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                  dateType === 'assigned' ? 'bg-blue-100 text-blue-800 font-semibold' : 'bg-white text-slate-600'
                }`}
              >
                Issue Date
              </button>
              <button
                type="button"
                onClick={() => setDateType('returned')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer ${
                  dateType === 'returned' ? 'bg-blue-100 text-blue-800 font-semibold' : 'bg-white text-slate-600'
                }`}
              >
                Return Date
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs"
              />
            </div>

            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-xs text-rose-600 hover:underline font-medium ml-auto cursor-pointer"
              >
                Clear Custom Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: MASTER CIRCULATION FEED */}
      {viewMode === 'all-logs' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-medium text-slate-500">Loading activity records...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={History}
                title="No Circulation Records Found"
                description="Try adjusting your search criteria, student filter, or date range."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Student / Member</th>
                    <th className="py-3 px-4">Book Details</th>
                    <th className="py-3 px-4">Issue & Due Date</th>
                    <th className="py-3 px-4">Circulation Status</th>
                    <th className="py-3 px-4">Fine Breakdown</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAssignments.map((record) => {
                    const isReturned = record.status === 'returned' || !!record.returnedDate;
                    const fineAmount = record.fineAmount || record.currentFine || 0;
                    const catName =
                      typeof record.book?.category === 'object' ? record.book?.category?.name : 'General';

                    return (
                      <tr key={record._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Student / Member Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{record.member?.name || 'Unknown Student'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                              {record.member?.memberId || 'N/A'}
                            </span>
                            {record.member?.className && (
                              <span>
                                Class {record.member.className} {record.member.section || ''}
                              </span>
                            )}
                          </div>
                          {record.member?.whatsapp && (
                            <a
                              href={`https://wa.me/${record.member.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>{record.member.whatsapp}</span>
                            </a>
                          )}
                        </td>

                        {/* Book Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 max-w-xs truncate">
                            {record.book?.title || 'Unknown Title'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            by {record.book?.author || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {catName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {record.book?.language || 'English'}
                            </span>
                          </div>
                        </td>

                        {/* Issue & Due Date */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <span className="text-slate-400 text-[10px]">Issued:</span>
                              <span className="font-medium">
                                {new Date(record.assignedDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <span className="text-slate-400 text-[10px]">Due:</span>
                              <span
                                className={`font-medium ${
                                  record.isOverdue && !isReturned ? 'text-rose-600 font-semibold' : ''
                                }`}
                              >
                                {new Date(record.dueDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Return Status */}
                        <td className="py-3.5 px-4">
                          {isReturned ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" />
                                <span>Returned</span>
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                on{' '}
                                {record.returnedDate
                                  ? new Date(record.returnedDate).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : '-'}
                              </div>
                              {record.lateDays && record.lateDays > 0 ? (
                                <span className="text-[10px] text-rose-600 font-medium block">
                                  ({record.lateDays} days late)
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-medium block">
                                  (On-time return)
                                </span>
                              )}
                            </div>
                          ) : record.isOverdue ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Overdue ({record.lateDays}d)</span>
                              </span>
                              <span className="text-[10px] text-rose-500 block mt-1">Pending return</span>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3" />
                                <span>Currently Issued</span>
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-1">In active reading</span>
                            </div>
                          )}
                        </td>

                        {/* Fine Breakdown */}
                        <td className="py-3.5 px-4">
                          {fineAmount > 0 ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900 flex items-center gap-1">
                                <span>{formatCurrency(fineAmount)}</span>
                                {record.lateDays ? (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({record.lateDays}d × ₹{settings.finePerDay || 2})
                                  </span>
                                ) : null}
                              </div>

                              {record.fineStatus === 'paid' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  ✓ Paid in Full
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    Pending Payment
                                  </span>
                                  {isReturned && (
                                    <button
                                      type="button"
                                      onClick={() => handleSettleFine(record._id)}
                                      disabled={settlingFineId === record._id}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                                    >
                                      {settlingFineId === record._id ? 'Saving...' : 'Collect'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">₹0 (No Fine)</span>
                          )}
                        </td>

                        {/* Action: Slip Details */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(record);
                              setIsReceiptModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Slip</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: STUDENT-WISE DOSSIER */}
      {viewMode === 'student-wise' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentGroups.map((group) => {
              const activeCount = group.items.filter((i) => i.status !== 'returned').length;
              const returnedCount = group.items.filter((i) => i.status === 'returned').length;
              const pendingFine = group.totalFine - group.paidFine;

              return (
                <div
                  key={group.member._id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {group.member.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{group.member.name}</h3>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {group.member.memberId} • Class {group.member.className || 'General'}
                          </span>
                        </div>
                      </div>

                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                        {group.items.length} {group.items.length === 1 ? 'Book' : 'Books'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Active</span>
                        <span className="font-bold text-xs text-blue-700">{activeCount}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Returned</span>
                        <span className="font-bold text-xs text-emerald-700">{returnedCount}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Pending Fine</span>
                        <span
                          className={`font-bold text-xs ${pendingFine > 0 ? 'text-amber-700' : 'text-slate-700'}`}
                        >
                          {formatCurrency(pendingFine)}
                        </span>
                      </div>
                    </div>

                    {/* Recent Book History preview */}
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Recent Borrowing Activity
                      </span>
                      {group.items.slice(0, 2).map((item) => (
                        <div
                          key={item._id}
                          className="text-xs bg-slate-50/80 p-2 rounded-md flex items-center justify-between gap-2"
                        >
                          <span className="font-medium text-slate-800 truncate">{item.book?.title}</span>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                              item.status === 'returned'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.status === 'returned' ? 'Returned' : item.isOverdue ? 'Overdue' : 'Issued'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentDossierId(group.member._id || group.member.memberId);
                      setIsStudentDossierOpen(true);
                    }}
                    className="mt-4 w-full py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View All {group.items.length} History Logs</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: BOOK-WISE CIRCULATION LOG */}
      {viewMode === 'book-wise' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookGroups.map((group) => {
              const activeCopies = group.items.filter((i) => i.status !== 'returned').length;
              const returnedCopies = group.items.filter((i) => i.status === 'returned').length;
              const catName =
                typeof group.book.category === 'object' ? group.book.category?.name : 'General';

              return (
                <div
                  key={group.book._id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{group.book.title}</h3>
                          <span className="text-[11px] text-slate-500">
                            by {group.book.author} • {catName}
                          </span>
                        </div>
                      </div>

                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px] shrink-0">
                        {group.items.length} {group.items.length === 1 ? 'Borrow' : 'Borrows'}
                      </span>
                    </div>

                    {/* Circulation Metrics */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Total Read</span>
                        <span className="font-bold text-xs text-slate-900">{group.items.length}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Currently Out</span>
                        <span className="font-bold text-xs text-blue-700">{activeCopies}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Readers</span>
                        <span className="font-bold text-xs text-emerald-700">
                          {group.uniqueBorrowers.size} Students
                        </span>
                      </div>
                    </div>

                    {/* Borrowers list preview */}
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Recent Readers
                      </span>
                      {group.items.slice(0, 2).map((item) => (
                        <div
                          key={item._id}
                          className="text-xs bg-slate-50/80 p-2 rounded-md flex items-center justify-between gap-2"
                        >
                          <span className="font-medium text-slate-800 truncate">{item.member?.name}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(item.assignedDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBookDossierId(group.book._id || group.book.title);
                      setIsBookDossierOpen(true);
                    }}
                    className="mt-4 w-full py-2 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View All Circulation Logs for this Book</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CIRCULATION SLIP & DETAIL MODAL */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Official Book Circulation & Fine Receipt"
        size="3xl"
      >
        {selectedRecord && (
          <div className="space-y-6">
            {/* Printable Slip Container */}
            <div
              ref={printRef}
              id="circulation-slip-print"
              className="border-2 border-slate-300 rounded-2xl p-6 sm:p-8 bg-white text-slate-800 space-y-6 print:border-none print:p-0 print:m-0"
            >
              {/* Slip Official Letterhead */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                      {settings.libraryName || 'School Central Library'}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      Official Library Circulation & Fine Audit Receipt
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Academic Year 2026–2027 • Automated Library Information System
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Receipt Ref No.
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black text-blue-900 block">
                    SLIP-{selectedRecord._id.substring(selectedRecord._id.length - 8).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Two-Column Information Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Borrower / Student Info */}
                <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Borrower Details
                    </span>
                    <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px]">
                      {selectedRecord.member?.memberId || 'N/A'}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-slate-900">{selectedRecord.member?.name}</div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Class & Sec</span>
                      <span className="font-semibold text-slate-800">
                        {formatClassDisplay(selectedRecord.member?.className, selectedRecord.member?.section)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Membership</span>
                      <span className="font-semibold text-emerald-700 capitalize">
                        {selectedRecord.member?.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  {selectedRecord.member?.whatsapp && (
                    <div className="pt-1 text-slate-600">
                      <span className="text-slate-400 block text-[10px]">Registered Contact</span>
                      <span className="font-mono font-medium text-slate-800">
                        {formatPhoneDisplay(selectedRecord.member.whatsapp)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Book Details */}
                <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Book & Catalog Record
                    </span>
                    <span className="font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px]">
                      {typeof selectedRecord.book?.category === 'object'
                        ? selectedRecord.book.category?.name
                        : 'General'}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-slate-900 line-clamp-1">{selectedRecord.book?.title}</div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Author</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {selectedRecord.book?.author || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Language</span>
                      <span className="font-semibold text-slate-800">
                        {selectedRecord.book?.language || 'English'}
                      </span>
                    </div>
                  </div>

                  {selectedRecord.book?.publisherNumber && (
                    <div className="pt-1 text-slate-600">
                      <span className="text-slate-400 block text-[10px]">ISBN / Accession Number</span>
                      <span className="font-mono text-slate-800">{selectedRecord.book.publisherNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Circulation Timeline */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                  Circulation Timeline Schedule
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-200 text-center p-3.5 bg-white">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Issue Date</span>
                    <span className="font-bold text-xs sm:text-sm text-slate-900 mt-1 block">
                      {new Date(selectedRecord.assignedDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Due Return Date</span>
                    <span className="font-bold text-xs sm:text-sm text-slate-900 mt-1 block">
                      {new Date(selectedRecord.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Actual Return Date</span>
                    <span
                      className={`font-bold text-xs sm:text-sm mt-1 block ${
                        selectedRecord.returnedDate ? 'text-emerald-700' : 'text-blue-700 italic'
                      }`}
                    >
                      {selectedRecord.returnedDate
                        ? new Date(selectedRecord.returnedDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Currently With Student'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial & Fine Breakdown */}
              <div className="bg-slate-900 text-white rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Library Policy Overdue Rate:</span>
                  <span className="font-mono">₹{settings.finePerDay || 2} / calendar day</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Overdue Duration:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {selectedRecord.lateDays || 0} Day(s) Overdue
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm sm:text-base font-bold pt-1">
                  <span>Total Fine Charged:</span>
                  <span className="text-emerald-400 text-lg font-mono">
                    {formatCurrency(selectedRecord.fineAmount || selectedRecord.currentFine || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-300">Payment Authorization Status:</span>
                  <span
                    className={`font-bold uppercase tracking-wider px-3 py-1 rounded-md text-xs ${
                      selectedRecord.fineStatus === 'paid'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : selectedRecord.fineStatus === 'pending'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {selectedRecord.fineStatus === 'paid'
                      ? '✓ PAID & SETTLED'
                      : selectedRecord.fineStatus === 'pending'
                      ? '⚠ PAYMENT PENDING'
                      : 'NO FINE ACCRUED'}
                  </span>
                </div>
              </div>

              {/* Remarks if any */}
              {selectedRecord.remarks && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">Librarian Circulation Remarks: </span>
                  {selectedRecord.remarks}
                </div>
              )}

              {/* Official Stamp & Signatures */}
              <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-6 items-end text-xs text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800">Student / Borrower Acknowledgement</p>
                  <div className="h-10 border-b border-dashed border-slate-400 w-48 mt-2"></div>
                  <span className="text-[10px] text-slate-400 block mt-1">Signature</span>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-slate-800">Authorized Librarian / Seal</p>
                  <div className="h-10 border-b border-dashed border-slate-400 w-48 ml-auto mt-2"></div>
                  <span className="text-[10px] text-slate-400 block mt-1">Greenwood Library Central Desk</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 no-print">
              {selectedRecord.status === 'returned' && selectedRecord.fineStatus === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleSettleFine(selectedRecord._id)}
                  disabled={settlingFineId === selectedRecord._id}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {settlingFineId === selectedRecord._id ? 'Updating...' : 'Mark Fine as Paid & Settled'}
                  </span>
                </button>
              )}

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* STUDENT CIRCULATION DOSSIER MODAL POPUP (LARGER & WIDER 5XL) */}
      <Modal
        isOpen={isStudentDossierOpen}
        onClose={() => {
          setIsStudentDossierOpen(false);
          setSelectedStudentDossierId(null);
        }}
        title="Student Circulation Dossier & Borrowing Transcript"
        size="5xl"
      >
        {activeStudentDossier && (
          <div className="space-y-6">
            {/* Student Profile Header Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/80 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
                  {activeStudentDossier.member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-black text-lg text-slate-900">
                      {activeStudentDossier.member.name}
                    </h3>
                    <span className="bg-blue-600 text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded-md shadow-2xs">
                      {activeStudentDossier.member.memberId}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        activeStudentDossier.member.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {activeStudentDossier.member.status === 'active' ? 'Active Member' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600 mt-1.5 flex-wrap">
                    <span className="font-semibold text-slate-800">
                      {formatClassDisplay(activeStudentDossier.member.className, activeStudentDossier.member.section)}
                    </span>
                    {activeStudentDossier.member.whatsapp && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <a
                          href={getCleanWhatsAppLink(activeStudentDossier.member.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline font-mono font-medium"
                          title="Open WhatsApp Chat"
                        >
                          {formatPhoneDisplay(activeStudentDossier.member.whatsapp)}
                        </a>
                      </span>
                    )}
                    {activeStudentDossier.member.email && (
                      <span className="text-slate-500">
                        Email: <strong className="text-slate-700">{activeStudentDossier.member.email}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Right Actions & Total Loans */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right sm:border-l sm:border-blue-200 sm:pl-4 pr-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    All-Time Issues
                  </span>
                  <span className="text-2xl font-black text-blue-900">
                    {activeStudentDossier.items.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                  title="Print Full Student Borrowing Dossier"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Dossier</span>
                </button>
              </div>
            </div>

            {/* KPI Stat Badges */}
            {(() => {
              const activeCount = activeStudentDossier.items.filter(
                (i) => i.status !== 'returned'
              ).length;
              const returnedCount = activeStudentDossier.items.filter(
                (i) => i.status === 'returned'
              ).length;
              const overdueCount = activeStudentDossier.items.filter(
                (i) => i.isOverdue && i.status !== 'returned'
              ).length;
              const pendingFine =
                activeStudentDossier.totalFine - activeStudentDossier.paidFine;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50/80 border border-blue-200/80 p-4 rounded-xl text-center shadow-2xs">
                    <span className="text-xs uppercase font-bold text-blue-700 block">
                      Currently Issued
                    </span>
                    <span className="text-2xl font-black text-blue-950 mt-1 block">
                      {activeCount}
                    </span>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-xl text-center shadow-2xs">
                    <span className="text-xs uppercase font-bold text-emerald-700 block">
                      Returned to Shelf
                    </span>
                    <span className="text-2xl font-black text-emerald-950 mt-1 block">
                      {returnedCount}
                    </span>
                  </div>

                  <div className="bg-rose-50/80 border border-rose-200/80 p-4 rounded-xl text-center shadow-2xs">
                    <span className="text-xs uppercase font-bold text-rose-700 block">
                      Overdue Books
                    </span>
                    <span className="text-2xl font-black text-rose-950 mt-1 block">
                      {overdueCount}
                    </span>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-xl text-center shadow-2xs">
                    <span className="text-xs uppercase font-bold text-amber-700 block">
                      Pending Fine
                    </span>
                    <span className="text-2xl font-black text-amber-950 mt-1 block">
                      {formatCurrency(pendingFine)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Complete History Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Complete Borrowing & Return History Records
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {activeStudentDossier.items.length} Entries Total
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Book Details</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Return Date</th>
                      <th className="py-3 px-4">Circulation Status</th>
                      <th className="py-3 px-4">Fine Breakdown</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {activeStudentDossier.items.map((item, idx) => {
                      const isReturned = item.status === 'returned';
                      const fineVal = item.fineAmount || item.currentFine || 0;
                      const catName =
                        typeof item.book?.category === 'object'
                          ? item.book.category?.name
                          : 'General';

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 max-w-[240px]">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {item.book?.title || 'Unknown Book'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              by {item.book?.author || 'N/A'} • <span className="text-slate-600 font-medium">{catName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-800">
                            {new Date(item.assignedDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-800">
                            {new Date(item.dueDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {item.returnedDate ? (
                              <span className="text-emerald-700 font-bold">
                                {new Date(item.returnedDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            ) : (
                              <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                With Student
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isReturned ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Returned
                              </span>
                            ) : item.isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" />
                                Issued
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {fineVal > 0 ? (
                              <div>
                                <span className="font-bold text-slate-900 text-xs">
                                  {formatCurrency(fineVal)}
                                </span>
                                <span
                                  className={`text-[10px] font-bold block uppercase mt-0.5 ${
                                    item.fineStatus === 'paid'
                                      ? 'text-emerald-600'
                                      : 'text-amber-600'
                                  }`}
                                >
                                  {item.fineStatus === 'paid' ? '✓ Paid' : '⚠ Pending'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isReturned && item.fineStatus === 'pending' && fineVal > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSettleFine(item._id)}
                                  disabled={settlingFineId === item._id}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                                  title="Mark Fine as Settled"
                                >
                                  Settle Fine
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecord(item);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                                title="View & Print Official Slip"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Slip</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 no-print">
              <span className="text-xs text-slate-600 font-medium">
                Showing complete record history for <strong className="text-slate-900">{activeStudentDossier.member.name}</strong> ({activeStudentDossier.member.memberId})
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsStudentDossierOpen(false);
                    setSelectedStudentDossierId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* BOOK CIRCULATION AUDIT MODAL POPUP (LARGER & WIDER 5XL) */}
      <Modal
        isOpen={isBookDossierOpen}
        onClose={() => {
          setIsBookDossierOpen(false);
          setSelectedBookDossierId(null);
        }}
        title="Book Circulation & Reader Turnover Audit"
        size="5xl"
      >
        {activeBookDossier && (
          <div className="space-y-6">
            {/* Book Profile Header Bar */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {activeBookDossier.book.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 mt-1">
                    <span>
                      <strong className="text-slate-800">Author:</strong> {activeBookDossier.book.author}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-800">Category:</strong>{' '}
                      {typeof activeBookDossier.book.category === 'object'
                        ? activeBookDossier.book.category?.name
                        : 'General'}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-800">Language:</strong>{' '}
                      {activeBookDossier.book.language || 'English'}
                    </span>
                    {activeBookDossier.book.publicationYear && (
                      <>
                        <span>•</span>
                        <span>
                          <strong className="text-slate-800">Year:</strong> {activeBookDossier.book.publicationYear}
                        </span>
                      </>
                    )}
                    {activeBookDossier.book.pages !== undefined && activeBookDossier.book.pages !== null && activeBookDossier.book.pages > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          <strong className="text-slate-800">Pages:</strong> {activeBookDossier.book.pages}
                        </span>
                      </>
                    )}
                  </div>

                  {activeBookDossier.book.publisherNumber && (
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      ISBN / Book Code: <span className="font-bold text-slate-800">{activeBookDossier.book.publisherNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Header Right Total Borrows & Print */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right sm:border-l sm:border-emerald-200 sm:pl-4 pr-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Borrows
                  </span>
                  <span className="text-2xl font-black text-emerald-900">
                    {activeBookDossier.items.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                  title="Print Full Book Audit Log"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Audit</span>
                </button>
              </div>
            </div>

            {/* Inventory & Reader KPIs */}
            {(() => {
              const activeCount = activeBookDossier.items.filter(
                (i) => i.status !== 'returned'
              ).length;
              const returnedCount = activeBookDossier.items.filter(
                (i) => i.status === 'returned'
              ).length;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-100/90 border border-slate-200 p-4 rounded-xl text-center shadow-2xs">
                    <span className="text-xs uppercase font-bold text-slate-600 block">
                      Total Copies
                    </span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">
                      {activeBookDossier.book.totalCopies || 0}
                    </span>
                  </div>

                  <div className="bg-blue-50/80 border border-blue-200/80 p-4 rounded-xl text-center shadow-2xs">
                    <span className="text-xs uppercase font-bold text-blue-700 block">
                      Currently Issued
                    </span>
                    <span className="text-2xl font-black text-blue-950 mt-1 block">
                      {activeCount}
                    </span>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-xl text-center shadow-2xs">
                    <span className="text-xs uppercase font-bold text-emerald-700 block">
                      Returned to Racks
                    </span>
                    <span className="text-2xl font-black text-emerald-950 mt-1 block">
                      {returnedCount}
                    </span>
                  </div>

                  <div className="bg-purple-50/80 border border-purple-200/80 p-4 rounded-xl text-center shadow-2xs">
                    <span className="text-xs uppercase font-bold text-purple-700 block">
                      Unique Readers
                    </span>
                    <span className="text-2xl font-black text-purple-950 mt-1 block">
                      {activeBookDossier.uniqueBorrowers.size}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Complete Borrowers History Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Student Circulation & Borrowing Timeline
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {activeBookDossier.items.length} Transactions
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Student Name & ID</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Issued Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Return Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {activeBookDossier.items.map((item, idx) => {
                      const isReturned = item.status === 'returned';

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs">
                              {item.member?.name || 'Unknown Student'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {item.member?.memberId}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                              {formatClassDisplay(item.member?.className, item.member?.section)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-800">
                            {new Date(item.assignedDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-800">
                            {new Date(item.dueDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {item.returnedDate ? (
                              <span className="text-emerald-700 font-bold">
                                {new Date(item.returnedDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            ) : (
                              <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                Currently Issued
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isReturned ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Returned
                              </span>
                            ) : item.isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" />
                                Issued
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecord(item);
                                setIsReceiptModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-[11px] font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Slip</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 no-print">
              <span className="text-xs text-slate-600 font-medium">
                Showing all {activeBookDossier.items.length} circulation transactions for this title
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Audit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBookDossierOpen(false);
                    setSelectedBookDossierId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Close Audit Log
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
