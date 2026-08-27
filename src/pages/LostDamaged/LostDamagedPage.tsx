import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  Download,
  BookOpen,
  DollarSign,
  GraduationCap,
  Briefcase,
  Layers,
  FileText,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Archive,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  X,
  User,
  AlertOctagon,
  Phone,
  Edit,
  Trash2,
  UserPlus,
  HelpCircle,
} from 'lucide-react';
import {
  lostDamagedService,
  bookService,
  memberService,
  assignmentService,
} from '../../services/api';
import { LostDamageLog, LostDamageStats, Book, Member, Assignment } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { SearchableSelect, Option } from '../../components/SearchableSelect';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';

interface LostDamagedPageProps {
  onNavigateTab?: (tab: string, filters?: any) => void;
}

type BorrowerType = 'student' | 'teacher' | 'inventory';

export const LostDamagedPage: React.FC<LostDamagedPageProps> = ({ onNavigateTab }) => {
  const { settings, formatCurrency } = useSettings();
  const [logs, setLogs] = useState<LostDamageLog[]>([]);
  const [stats, setStats] = useState<LostDamageStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeLoans, setActiveLoans] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'damaged' | 'replaced'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'students' | 'teachers' | 'inventory'>('all');

  // Direct Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [borrowerType, setBorrowerType] = useState<BorrowerType>('student');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [showAllBooksForMember, setShowAllBooksForMember] = useState<boolean>(false);
  const [showAllStudentsInModal, setShowAllStudentsInModal] = useState<boolean>(false);

  const [reportForm, setReportForm] = useState<{
    bookId: string;
    type: 'lost' | 'damaged';
    resolutionType: 'cash_recovery' | 'book_replaced';
    replacementAccessionNo: string;
    copiesCount: number;
    reason: string;
    reportedBy: string;
    fineAmount: number;
    fineStatus: 'none' | 'pending' | 'paid';
    paymentMethod: string;
    receiptNo: string;
  }>({
    bookId: '',
    type: 'lost',
    resolutionType: 'cash_recovery',
    replacementAccessionNo: '',
    copiesCount: 1,
    reason: '',
    reportedBy: 'Admin / Librarian',
    fineAmount: 0,
    fineStatus: 'none',
    paymentMethod: 'Cash',
    receiptNo: '',
  });

  // Edit / Link Student Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<LostDamageLog | null>(null);
  const [editForm, setEditForm] = useState<{
    memberId: string;
    reason: string;
    fineAmount: number;
    fineStatus: 'none' | 'pending' | 'paid';
    paymentMethod: string;
    receiptNo: string;
  }>({
    memberId: '',
    reason: '',
    fineAmount: 0,
    fineStatus: 'none',
    paymentMethod: 'Cash',
    receiptNo: '',
  });

  // Fine collection modal
  const [isFineModalOpen, setIsFineModalOpen] = useState<boolean>(false);
  const [selectedLogForFine, setSelectedLogForFine] = useState<LostDamageLog | null>(null);
  const [fineCollectForm, setFineCollectForm] = useState<{
    paidAmount: number;
    paymentMethod: string;
    receiptNo: string;
    remarks: string;
  }>({
    paidAmount: 0,
    paymentMethod: 'Cash',
    receiptNo: '',
    remarks: '',
  });

  // Delete Confirm Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [logToDelete, setLogToDelete] = useState<LostDamageLog | null>(null);

  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async (showRefreshSpin = false) => {
    try {
      if (showRefreshSpin) setIsRefreshing(true);
      else setLoading(true);

      const [logsData, statsData, booksData, membersData, loansData] = await Promise.all([
        lostDamagedService.getLogs({
          type: typeFilter !== 'all' ? typeFilter : undefined,
          search: search.trim() || undefined,
        }),
        lostDamagedService.getStats(),
        bookService.getAll({ status: 'active' }),
        memberService.getAll({ status: 'active' }),
        assignmentService.getAll({ status: 'assigned' }),
      ]);

      setLogs(logsData);
      setStats(statsData);
      setBooks(booksData);
      setMembers(membersData);
      setActiveLoans(loansData);
    } catch (err) {
      console.error('Failed to load lost/damage logs:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, search]);

  // Filter logs by source / origin
  const filteredLogs = React.useMemo(() => {
    if (sourceFilter === 'all') return logs;
    if (sourceFilter === 'students') {
      return logs.filter((l) => l.member && (l.member.memberType === 'student' || !l.member.memberType));
    }
    if (sourceFilter === 'teachers') {
      return logs.filter((l) => l.member && l.member.memberType === 'teacher');
    }
    if (sourceFilter === 'inventory') {
      return logs.filter((l) => !l.member || l.source === 'inventory');
    }
    return logs;
  }, [logs, sourceFilter]);

  const handleOpenReportModal = (defaultType: 'lost' | 'damaged' = 'lost') => {
    setFormError('');
    setBorrowerType('student');
    setSelectedMemberId('');
    setSelectedAssignmentId('');
    setShowAllBooksForMember(false);
    setShowAllStudentsInModal(false);
    setReportForm({
      bookId: '',
      type: defaultType,
      copiesCount: 1,
      reason: '',
      reportedBy: 'Admin / Librarian',
      fineAmount: 0,
      fineStatus: 'none',
      paymentMethod: 'Cash',
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
    });
    setIsReportModalOpen(true);
  };

  // When a student/teacher is selected, check if they have active loans
  const selectedMember = members.find((m) => m._id === selectedMemberId);
  const memberActiveLoans = React.useMemo(() => {
    if (!selectedMemberId) return [];
    return activeLoans.filter((loan) => {
      const memId = typeof loan.member === 'string' ? loan.member : loan.member?._id;
      return memId === selectedMemberId;
    });
  }, [selectedMemberId, activeLoans]);

  // Handle member selection (student or teacher) and auto-bind active loan book if available
  const handleMemberSelect = (val: string) => {
    setSelectedMemberId(val);
    setShowAllBooksForMember(false);
    if (!val) {
      setSelectedAssignmentId('');
      setReportForm((prev) => ({
        ...prev,
        bookId: '',
      }));
      return;
    }

    const loans = activeLoans.filter((loan) => {
      const memId = typeof loan.member === 'string' ? loan.member : loan.member?._id;
      return memId === val;
    });

    if (loans.length > 0) {
      // Auto-select the first active borrowed book
      const firstLoan = loans[0];
      const bookObj = typeof firstLoan.book === 'object' ? firstLoan.book : books.find((b) => b._id === firstLoan.book);
      const bId = bookObj?._id || (typeof firstLoan.book === 'string' ? firstLoan.book : '');
      const bTitle = bookObj?.title || 'Book';
      const penalty = computePenalty(bookObj, firstLoan, reportForm.resolutionType);
      
      setSelectedAssignmentId(firstLoan._id);
      setReportForm((prev) => ({
        ...prev,
        bookId: bId,
        copiesCount: 1,
        fineAmount: penalty.calculatedTotal,
        fineStatus: penalty.calculatedTotal > 0 ? (prev.fineStatus === 'none' ? 'pending' : prev.fineStatus) : 'none',
        reason: prev.reason || `Book "${bTitle}" was issued to ${borrowerType === 'student' ? 'student' : 'teacher'} on ${new Date(firstLoan.assignedDate).toLocaleDateString()} and reported ${prev.type.toUpperCase()}.`,
      }));
    } else {
      setSelectedAssignmentId('');
      setReportForm((prev) => ({
        ...prev,
        bookId: '',
      }));
    }
  };

  const computePenalty = (
    bookObj: Book | null | undefined,
    loanObj: Assignment | null | undefined,
    resolution: 'cash_recovery' | 'book_replaced'
  ) => {
    const bookPrice = bookObj?.price ? Math.max(0, Number(bookObj.price)) : 0;
    let lateDays = 0;
    let overdueFine = 0;

    if (loanObj?.dueDate) {
      const due = new Date(loanObj.dueDate);
      const now = new Date();
      if (now > due) {
        lateDays = Math.max(0, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        overdueFine = lateDays * (settings.finePerDay || 2);
      }
    }

    const calculatedTotal = resolution === 'book_replaced' ? 0 : (bookPrice + overdueFine);

    return {
      bookPrice,
      lateDays,
      overdueFine,
      calculatedTotal,
    };
  };

  const handleSelectMemberLoan = (loan: Assignment) => {
    setSelectedAssignmentId(loan._id);
    const bookObj = typeof loan.book === 'object' ? loan.book : books.find((b) => b._id === loan.book);
    const bookId = typeof loan.book === 'string' ? loan.book : loan.book?._id;
    const bTitle = typeof loan.book === 'object' ? loan.book?.title : 'Book';
    const penalty = computePenalty(bookObj, loan, reportForm.resolutionType);

    if (bookId) {
      setReportForm((prev) => ({
        ...prev,
        bookId,
        copiesCount: 1,
        fineAmount: penalty.calculatedTotal,
        fineStatus: penalty.calculatedTotal > 0 ? (prev.fineStatus === 'none' ? 'pending' : prev.fineStatus) : 'none',
        reason: prev.reason || `Book "${bTitle}" was issued on ${new Date(loan.assignedDate).toLocaleDateString()} and reported ${reportForm.type.toUpperCase()} by student.`,
      }));
    }
  };

  const handleBookSelect = (bookId: string) => {
    // Check if this book corresponds to one of the selected member's active loans
    const matchingLoan = memberActiveLoans.find((l) => {
      const bId = typeof l.book === 'object' ? l.book?._id : l.book;
      return bId === bookId;
    });

    const bookObj = books.find((b) => b._id === bookId);
    const penalty = computePenalty(bookObj, matchingLoan, reportForm.resolutionType);

    if (matchingLoan) {
      setSelectedAssignmentId(matchingLoan._id);
      const bTitle = typeof matchingLoan.book === 'object' ? matchingLoan.book?.title : (bookObj?.title || 'Book');
      setReportForm((prev) => ({
        ...prev,
        bookId,
        copiesCount: 1,
        fineAmount: penalty.calculatedTotal,
        fineStatus: penalty.calculatedTotal > 0 ? (prev.fineStatus === 'none' ? 'pending' : prev.fineStatus) : 'none',
        reason: prev.reason || `Book "${bTitle}" was issued on ${new Date(matchingLoan.assignedDate).toLocaleDateString()} and reported ${prev.type.toUpperCase()} by student.`,
      }));
    } else {
      setSelectedAssignmentId('');
      setReportForm((prev) => ({
        ...prev,
        bookId,
        fineAmount: penalty.calculatedTotal,
        fineStatus: penalty.calculatedTotal > 0 ? (prev.fineStatus === 'none' ? 'pending' : prev.fineStatus) : 'none',
      }));
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.bookId) {
      setFormError('Please select a book title from the catalog.');
      return;
    }
    if (borrowerType === 'student' && !selectedMemberId) {
      setFormError('Please select the Student who lost or damaged this book.');
      return;
    }
    if (borrowerType === 'teacher' && !selectedMemberId) {
      setFormError('Please select the Teacher / Faculty member.');
      return;
    }
    if (!reportForm.reason.trim()) {
      setFormError('Please provide a reason or incident note.');
      return;
    }
    if (reportForm.copiesCount < 1) {
      setFormError('Copies count must be at least 1.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      // Find matching active assignment if not explicitly selected
      const matchingLoan = activeLoans.find(
        (l) =>
          (typeof l.member === 'object' ? l.member?._id : l.member) === selectedMemberId &&
          (typeof l.book === 'object' ? l.book?._id : l.book) === reportForm.bookId
      );
      const effAssignmentId = selectedAssignmentId || matchingLoan?._id;

      const res = await lostDamagedService.reportDirect({
        bookId: reportForm.bookId,
        memberId: borrowerType !== 'inventory' ? selectedMemberId : undefined,
        assignmentId: effAssignmentId || undefined,
        source: borrowerType !== 'inventory' ? 'assignment' : 'inventory',
        type: reportForm.type,
        resolutionType: reportForm.resolutionType,
        replacementAccessionNo: reportForm.replacementAccessionNo ? reportForm.replacementAccessionNo.trim() : undefined,
        copiesCount: reportForm.copiesCount,
        reason: reportForm.reason.trim(),
        reportedBy: reportForm.reportedBy.trim(),
        fineAmount: reportForm.fineAmount,
        fineStatus: reportForm.fineAmount > 0 ? reportForm.fineStatus : 'none',
        paymentMethod: reportForm.paymentMethod,
        receiptNo: reportForm.receiptNo,
      });

      setIsReportModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: res.message || `Successfully processed report as ${reportForm.resolutionType === 'book_replaced' ? 'BOOK REPLACED' : reportForm.type.toUpperCase()}.`,
      });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to record lost/damaged book.');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit / Link Student
  const handleOpenEditModal = (log: LostDamageLog) => {
    setSelectedLogForEdit(log);
    setFormError('');
    setEditForm({
      memberId: log.member?._id || '',
      reason: log.reason || '',
      fineAmount: log.fineAmount || 0,
      fineStatus: log.fineStatus || 'none',
      paymentMethod: log.paymentMethod || 'Cash',
      receiptNo: log.receiptNo || `REC-${Date.now().toString().slice(-6)}`,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogForEdit) return;

    try {
      setSubmitting(true);
      setFormError('');
      await lostDamagedService.updateLog(selectedLogForEdit._id, {
        memberId: editForm.memberId || 'none',
        reason: editForm.reason.trim(),
        fineAmount: editForm.fineAmount,
        fineStatus: editForm.fineAmount > 0 ? editForm.fineStatus : 'none',
        paymentMethod: editForm.paymentMethod,
        receiptNo: editForm.receiptNo,
      });

      setIsEditModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: 'Record updated successfully with student/borrower details!',
      });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenFineModal = (log: LostDamageLog) => {
    setSelectedLogForFine(log);
    setFineCollectForm({
      paidAmount: log.fineAmount,
      paymentMethod: 'Cash',
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      remarks: '',
    });
    setIsFineModalOpen(true);
  };

  const handleFineCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogForFine) return;

    try {
      setSubmitting(true);
      await lostDamagedService.updateLog(selectedLogForFine._id, {
        fineStatus: 'paid',
        fineAmount: fineCollectForm.paidAmount,
        receiptNo: fineCollectForm.receiptNo,
        paymentMethod: fineCollectForm.paymentMethod,
      });

      if (selectedLogForFine.assignment) {
        const assignId =
          typeof selectedLogForFine.assignment === 'string'
            ? selectedLogForFine.assignment
            : selectedLogForFine.assignment._id;

        await assignmentService.updateFineStatus(assignId, {
          fineStatus: 'paid',
          fineAmount: fineCollectForm.paidAmount,
          receiptNo: fineCollectForm.receiptNo,
          paymentMethod: fineCollectForm.paymentMethod,
          remarks: `Fine collected for ${selectedLogForFine.type.toUpperCase()}: ${fineCollectForm.remarks}`,
        });
      }

      setIsFineModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: `Fine payment of ₹${fineCollectForm.paidAmount} recorded as PAID!`,
      });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to record fine settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (log: LostDamageLog) => {
    setLogToDelete(log);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!logToDelete) return;
    try {
      setSubmitting(true);
      await lostDamagedService.deleteLog(logToDelete._id);
      setIsDeleteModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: `Record deleted and ${logToDelete.copiesCount || 1} copy/copies restored back to library stock!`,
      });
      fetchData();
    } catch (err: any) {
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      'Incident Date',
      'Accession No',
      'Book Title',
      'Author',
      'Incident Type',
      'Copies Deducted',
      'Source / Origin',
      'Borrower / Student Name',
      'Member ID',
      'Class & Section',
      'Admission No',
      'Contact',
      'Reason / Note',
      'Fine Amount',
      'Fine Status',
      'Payment Mode',
      'Receipt No',
    ];

    const rows = filteredLogs.map((l) => [
      new Date(l.createdAt).toLocaleDateString(),
      `"${l.book?.accessionNumber || ''}"`,
      `"${l.book?.title || ''}"`,
      `"${l.book?.author || ''}"`,
      l.type.toUpperCase(),
      l.copiesCount || 1,
      l.source === 'assignment' ? 'Borrower Loan' : 'Catalog Audit',
      `"${l.member?.name || (l.reportedBy ? `Reported by: ${l.reportedBy}` : 'Direct Shelf Stock')}"`,
      `"${l.member?.memberId || ''}"`,
      `"${l.member?.className || ''} ${l.member?.section || ''}"`,
      `"${l.member?.admissionNo || ''}"`,
      `"${l.member?.whatsapp || ''}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      l.fineAmount || 0,
      l.fineStatus || 'none',
      `"${l.paymentMethod || ''}"`,
      `"${l.receiptNo || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lost_damaged_books_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format class labels cleanly without repeating "Class"
  const formatClassName = (className?: string) => {
    if (!className) return '';
    const clean = className.replace(/^class\s+/i, '').trim();
    return clean ? `Class ${clean}` : '';
  };

  // Options for Searchable Select
  const bookOptions: Option[] = React.useMemo(() => {
    // If a student or teacher is selected and we are not showing the full catalog
    if (borrowerType !== 'inventory' && selectedMemberId && !showAllBooksForMember) {
      if (memberActiveLoans.length > 0) {
        return memberActiveLoans.map((loan) => {
          const bObj = typeof loan.book === 'object' ? loan.book : books.find((b) => b._id === loan.book);
          const bId = bObj?._id || (typeof loan.book === 'string' ? loan.book : '');
          const bTitle = bObj?.title || 'Book';
          const particularAcc = loan.accessionNumber || bObj?.accessionNumber || 'No Acc#';
          const copyNoStr = loan.copyNumber ? ` • Copy #${loan.copyNumber}` : '';
          const bAuthor = bObj?.author || '';
          const issueDateStr = loan.assignedDate ? new Date(loan.assignedDate).toLocaleDateString() : '';
          const dueDateStr = loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '';

          return {
            value: bId,
            label: `📖 ${bTitle} [Particular Acc #: ${particularAcc}${copyNoStr}] - ${bAuthor}`,
            description: `✅ Issued Copy: ${particularAcc}${copyNoStr} | Issued: ${issueDateStr} | Due: ${dueDateStr}`,
          };
        });
      }
    }

    // Default: full catalog books
    return books.map((b) => ({
      value: b._id,
      label: `${b.title} (${b.accessionNumber || 'No Acc#'}) - ${b.author}`,
      description: `Stock: ${b.availableCopies} available / ${b.totalCopies} total | ${b.language || 'Book'}`,
    }));
  }, [books, borrowerType, selectedMemberId, memberActiveLoans, showAllBooksForMember]);

  const activeMemberIds = React.useMemo(() => {
    const ids = new Set<string>();
    activeLoans.forEach((loan) => {
      const mId = typeof loan.member === 'object' ? loan.member?._id : loan.member;
      if (mId) ids.add(String(mId));
    });
    return ids;
  }, [activeLoans]);

  const studentOptions: Option[] = React.useMemo(() => {
    let filtered = members.filter((m) => m.memberType === 'student' || !m.memberType);
    if (!showAllStudentsInModal) {
      filtered = filtered.filter((m) => activeMemberIds.has(String(m._id)));
    }
    return filtered.map((m) => {
      const cls = formatClassName(m.className);
      const classSectionStr = cls ? (m.section ? `${cls}-${m.section}` : cls) : 'Student';
      const loanCount = activeLoans.filter((l) => (typeof l.member === 'object' ? l.member?._id : l.member) === m._id).length;
      return {
        value: m._id,
        label: `${m.name} - ${classSectionStr} (${m.memberId})`,
        description: `${loanCount > 0 ? `📚 ${loanCount} Book(s) Issued • ` : ''}Adm No: ${m.admissionNo || 'N/A'} • Phone: ${m.whatsapp || 'N/A'}`,
      };
    });
  }, [members, activeMemberIds, activeLoans, showAllStudentsInModal]);

  const teacherOptions: Option[] = React.useMemo(() => {
    let filtered = members.filter((m) => m.memberType === 'teacher');
    if (!showAllStudentsInModal) {
      filtered = filtered.filter((m) => activeMemberIds.has(String(m._id)));
    }
    return filtered.map((m) => {
      const loanCount = activeLoans.filter((l) => (typeof l.member === 'object' ? l.member?._id : l.member) === m._id).length;
      return {
        value: m._id,
        label: `${m.name} - ${m.department || m.designation || 'Teacher'} (${m.memberId})`,
        description: `${loanCount > 0 ? `📚 ${loanCount} Book(s) Issued • ` : ''}Phone: ${m.whatsapp || 'N/A'}`,
      };
    });
  }, [members, activeMemberIds, activeLoans, showAllStudentsInModal]);

  const allMemberOptions: Option[] = [
    { value: '', label: '🏢 No Student / Direct Shelf Inventory (Catalog Audit)' },
    ...members.map((m) => {
      const cls = formatClassName(m.className);
      return {
        value: m._id,
        label: `${m.memberType === 'teacher' ? '👨‍🏫 [Teacher]' : '🎓 [Student]'} ${m.name} (${cls || m.department || ''} - ${m.memberId})`,
        description: `Adm No: ${m.admissionNo || 'N/A'} • Phone: ${m.whatsapp || 'N/A'}`,
      };
    }),
  ];

  const selectedBookObj = books.find((b) => b._id === reportForm.bookId);
  const selectedLoanObj = memberActiveLoans.find(
    (l) => l._id === selectedAssignmentId || (l.book && (l.book._id === reportForm.bookId || l.book === reportForm.bookId))
  );

  return (
    <div id="lost-damaged-page" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Book Lost & Damaged Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track lost and damaged books with student details, assess fines, and maintain audit records.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="open-record-lost-btn"
            type="button"
            onClick={() => handleOpenReportModal('lost')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Lost / Damaged Book</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Lost */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lost Copies</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-2">{stats?.totalLostCopies || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">Deducted from stock</span>
        </div>

        {/* Total Damaged */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Damaged Copies</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-2">{stats?.totalDamagedCopies || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">Recorded damages</span>
        </div>

        {/* Total Incidents */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Incidents</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{stats?.totalIncidents || logs.length}</p>
          <span className="text-[10px] text-slate-500 font-medium">Audit log entries</span>
        </div>

        {/* Fines Assessed */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fines Assessed</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-purple-700 mt-2">{formatCurrency(stats?.totalFinesAssessed || 0)}</p>
          <span className="text-[10px] text-purple-500 font-medium">Total penalty billed</span>
        </div>

        {/* Fines Collected */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fines Collected</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(stats?.totalFinesCollected || 0)}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Paid by borrowers</span>
        </div>

        {/* Pending Fines */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending Fines</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-2">{formatCurrency(stats?.pendingFines || 0)}</p>
          <span className="text-[10px] text-rose-500 font-medium">Due for recovery</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll number, admission number, class, book title, or accession number..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Condition Type Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Conditions
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('lost')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                typeFilter === 'lost'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Lost Only ({stats?.totalLostCopies || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('damaged')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                typeFilter === 'damaged'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Damaged Only ({stats?.totalDamagedCopies || 0})</span>
            </button>
          </div>
        </div>

        {/* Source filter tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs overflow-x-auto">
          <span className="text-slate-500 font-semibold text-[11px]">Filter by Origin:</span>
          <button
            type="button"
            onClick={() => setSourceFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
              sourceFilter === 'all' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Incidents ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('students')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
              sourceFilter === 'students' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Students ({logs.filter((l) => l.member && (l.member.memberType === 'student' || !l.member.memberType)).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('teachers')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
              sourceFilter === 'teachers' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Teachers ({logs.filter((l) => l.member && l.member.memberType === 'teacher').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('inventory')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
              sourceFilter === 'inventory' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Shelf Stock Audits ({logs.filter((l) => !l.member || l.source === 'inventory').length})</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
            Loading lost & damaged inventory audit records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ShieldAlert}
              title="No lost or damaged book records found"
              description={
                search || typeFilter !== 'all' || sourceFilter !== 'all'
                  ? 'No records match your active search and filter criteria.'
                  : 'Great news! There are currently no recorded lost or damaged books.'
              }
              actionLabel="Record Lost / Damaged Book"
              onAction={() => handleOpenReportModal('lost')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Book Details</th>
                  <th className="py-3 px-3">Condition</th>
                  <th className="py-3 px-3">Copies Deducted</th>
                  <th className="py-3 px-3 min-w-[220px]">Student / Borrower Details</th>
                  <th className="py-3 px-3">Reason / Remarks</th>
                  <th className="py-3 px-3">Fine Penalty</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isLost = log.type === 'lost';
                  const isTeacher = (log.member as any)?.memberType === 'teacher';
                  const hasMember = Boolean(log.member);

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Book Details */}
                      <td className="py-3.5 px-3 min-w-[190px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                            {log.book?.accessionNumber || 'ACC-N/A'}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">
                            {log.book?.title}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          By {log.book?.author}
                        </div>
                      </td>

                      {/* Condition Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {log.resolutionType === 'book_replaced' || log.type === 'replaced' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                            <RefreshCw className="w-3 h-3 text-emerald-600" />
                            <span>Book Replaced</span>
                          </span>
                        ) : isLost ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Book Lost</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            <span>Book Damaged</span>
                          </span>
                        )}
                      </td>

                      {/* Deducted copies count */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {log.resolutionType === 'book_replaced' || log.type === 'replaced' || log.stockDeducted === false ? (
                          <>
                            <span className="font-extrabold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Replaced (0 Deducted)
                            </span>
                            {log.replacementAccessionNo && (
                              <span className="text-[10px] text-slate-600 block font-mono mt-0.5 font-medium">
                                New Acc: {log.replacementAccessionNo}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-extrabold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              -{log.copiesCount || 1} copy
                            </span>
                            <span className="text-[10px] text-rose-600 block font-semibold mt-0.5">
                              Stock Reduced
                            </span>
                          </>
                        )}
                      </td>

                      {/* Student / Borrower Details */}
                      <td className="py-3.5 px-3 min-w-[220px]">
                        {hasMember && log.member ? (
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isTeacher ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {isTeacher ? <Briefcase className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                              </div>
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {log.member.name}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${isTeacher ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                {isTeacher ? 'Teacher' : 'Student'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-600 font-medium pl-6.5 space-y-0.5">
                              {!isTeacher && (
                                <div className="text-slate-800 font-semibold">
                                  {log.member.className ? `Class: ${log.member.className}${log.member.section ? ` - ${log.member.section}` : ''}` : 'Class N/A'}
                                  {log.member.admissionNo && ` • Adm: ${log.member.admissionNo}`}
                                </div>
                              )}
                              {isTeacher && (
                                <div>Dept: {log.member.department || log.member.designation || 'Staff'}</div>
                              )}
                              <div className="text-slate-400 text-[10px] font-mono flex items-center gap-2">
                                <span>ID: {log.member.memberId}</span>
                                {log.member.whatsapp && (
                                  <span className="flex items-center gap-0.5 text-slate-500">
                                    <Phone className="w-2.5 h-2.5 text-emerald-600" />
                                    {log.member.whatsapp}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                            <div className="flex items-center justify-between gap-1">
                              <span className="inline-flex items-center gap-1 text-slate-600 text-[11px] font-semibold">
                                <Archive className="w-3 h-3 text-slate-400" />
                                <span>Shelf / Catalog Audit</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(log)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>Link Student</span>
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              By {log.reportedBy || 'Admin / Librarian'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-3 max-w-[200px]">
                        <p className="text-slate-800 font-medium text-xs line-clamp-2 leading-relaxed" title={log.reason}>
                          {log.reason || 'No description provided'}
                        </p>
                      </td>

                      {/* Fine / Recovery Penalty */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {log.fineAmount > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900 text-xs">
                                ₹{log.fineAmount}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  log.fineStatus === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                  }`}
                              >
                                {log.fineStatus === 'paid' ? 'PAID' : 'PENDING'}
                              </span>
                            </div>
                            {log.fineStatus === 'paid' && log.receiptNo && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Rec: {log.receiptNo}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">₹0 (No Fine)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {log.fineAmount > 0 && log.fineStatus === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleOpenFineModal(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-colors shadow-2xs cursor-pointer"
                              title="Collect fine payment"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Collect</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(log)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit / Link Student"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD LOST / DAMAGED MODAL */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Record Book Lost or Damaged (Stock Deduction)"
        subtitle="Specify the student/borrower responsible or report internal catalog shelf audit"
        maxWidth="lg"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* Incident Type & Condition Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Incident Type / Condition <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setReportForm({ ...reportForm, type: 'lost' })}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  reportForm.type === 'lost'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Book Lost (गुम हो गई)</span>
              </button>

              <button
                type="button"
                onClick={() => setReportForm({ ...reportForm, type: 'damaged' })}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  reportForm.type === 'damaged'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Book Damaged (खराब / फटी हुई)</span>
              </button>
            </div>
          </div>

          {/* RESPONSIBLE BORROWER / STUDENT SELECTION */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-900">
                  Who Lost / Damaged this Book? (किसने घुमाई / खराब की?) <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Select whether a Student, Teacher, or Library Shelf Stock is responsible
                </p>
              </div>
            </div>

            {/* Borrower Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setBorrowerType('student');
                  setSelectedMemberId('');
                  setSelectedAssignmentId('');
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  borrowerType === 'student'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student (विद्यार्थी)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBorrowerType('teacher');
                  setSelectedMemberId('');
                  setSelectedAssignmentId('');
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  borrowerType === 'teacher'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Teacher (शिक्षक)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBorrowerType('inventory');
                  setSelectedMemberId('');
                  setSelectedAssignmentId('');
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  borrowerType === 'inventory'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Shelf Stock Audit</span>
              </button>
            </div>

            {/* Student Search Dropdown */}
            {borrowerType === 'student' && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Search & Select Student <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAllStudentsInModal(!showAllStudentsInModal)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    {showAllStudentsInModal ? 'Show Only Active Borrowers' : 'Show All Students in School'}
                  </button>
                </div>

                {!showAllStudentsInModal && (
                  <div className="p-2 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Showing only students with currently issued books ({studentOptions.length}).
                    </span>
                    {studentOptions.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAllStudentsInModal(true)}
                        className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        Show All Students
                      </button>
                    )}
                  </div>
                )}

                <SearchableSelect
                  id="select-student-lost"
                  options={studentOptions}
                  value={selectedMemberId}
                  onChange={handleMemberSelect}
                  placeholder={
                    studentOptions.length === 0
                      ? 'No active borrowing students found. Click "Show All Students" above.'
                      : 'Type student name, class, roll number, admission number, or STU ID...'
                  }
                  emptyMessage="No student found with active borrowed books."
                />

                {/* Selected Student Card */}
                {selectedMember && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-xs">{selectedMember.name}</span>
                          <span className="text-slate-500 text-[11px] ml-1.5">({selectedMember.memberId})</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                        {formatClassName(selectedMember.className) || 'Class N/A'}{selectedMember.section ? ` - ${selectedMember.section}` : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <span>Admission No: <strong>{selectedMember.admissionNo || 'N/A'}</strong></span>
                      {selectedMember.whatsapp && (
                        <span>Phone: <strong>{selectedMember.whatsapp}</strong></span>
                      )}
                    </div>

                    {/* Active Loans for this student */}
                    {memberActiveLoans.length > 0 ? (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[11px] font-semibold text-amber-800 block">
                          📚 Active Borrowed Books by {selectedMember.name}: (Click to select book)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {memberActiveLoans.map((loan) => {
                            const bTitle = typeof loan.book === 'object' ? loan.book?.title : 'Book';
                            const particularAcc = loan.accessionNumber || (typeof loan.book === 'object' ? loan.book?.accessionNumber : '');
                            const copyNoStr = loan.copyNumber ? `Copy #${loan.copyNumber}` : '';
                            const isSelected = selectedAssignmentId === loan._id;

                            return (
                              <button
                                key={loan._id}
                                type="button"
                                onClick={() => handleSelectMemberLoan(loan)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-400 shadow-2xs font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>{bTitle}</span>
                                <span className="font-mono text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                                  {particularAcc} {copyNoStr && `(${copyNoStr})`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 italic">
                        ℹ️ No active borrowed books recorded for this student in the system.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Teacher Search Dropdown */}
            {borrowerType === 'teacher' && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Search & Select Teacher / Faculty <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAllStudentsInModal(!showAllStudentsInModal)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    {showAllStudentsInModal ? 'Show Only Active Borrowers' : 'Show All Teachers'}
                  </button>
                </div>

                {!showAllStudentsInModal && (
                  <div className="p-2 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Showing only teachers with currently issued books ({teacherOptions.length}).
                    </span>
                    {teacherOptions.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAllStudentsInModal(true)}
                        className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        Show All Teachers
                      </button>
                    )}
                  </div>
                )}

                <SearchableSelect
                  id="select-teacher-lost"
                  options={teacherOptions}
                  value={selectedMemberId}
                  onChange={handleMemberSelect}
                  placeholder="Type teacher name, staff ID, or department..."
                  emptyMessage="No teacher found with active borrowed books."
                />

                {selectedMember && (
                  <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-2xs text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{selectedMember.name} ({selectedMember.memberId})</span>
                      <span className="text-purple-700 font-semibold">{selectedMember.department || selectedMember.designation || 'Teacher'}</span>
                    </div>
                    {memberActiveLoans.length > 0 ? (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[11px] font-semibold text-amber-800 block">
                          📚 Active Borrowed Books by {selectedMember.name}:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {memberActiveLoans.map((loan) => {
                            const bTitle = typeof loan.book === 'object' ? loan.book?.title : 'Book';
                            const particularAcc = loan.accessionNumber || (typeof loan.book === 'object' ? loan.book?.accessionNumber : '');
                            const copyNoStr = loan.copyNumber ? `Copy #${loan.copyNumber}` : '';
                            const isSelected = selectedAssignmentId === loan._id;

                            return (
                              <button
                                key={loan._id}
                                type="button"
                                onClick={() => handleSelectMemberLoan(loan)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-400 shadow-2xs font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>{bTitle}</span>
                                <span className="font-mono text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                                  {particularAcc} {copyNoStr && `(${copyNoStr})`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 italic">
                        ℹ️ No active borrowed books recorded for this teacher.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Inventory Shelf Audit info */}
            {borrowerType === 'inventory' && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <Archive className="w-4 h-4 text-slate-500" />
                  <span>Direct Library Catalog / Shelf Stock Audit</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Use this option for internal inventory losses (e.g. water damage, missing during annual stock verification, wear & tear) where no student or teacher is personally responsible.
                </p>
              </div>
            )}
          </div>

          {/* Book Searchable Select */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Select Book Title <span className="text-rose-500">*</span>
              </label>
              {borrowerType !== 'inventory' && selectedMember && memberActiveLoans.length > 0 && (
                <div className="flex items-center gap-2">
                  {!showAllBooksForMember ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                      🎯 Showing {memberActiveLoans.length} issued book{memberActiveLoans.length > 1 ? 's' : ''} to {selectedMember.name}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      Showing Entire Library Catalog
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAllBooksForMember(!showAllBooksForMember)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    {showAllBooksForMember ? 'Show Only Issued Books' : 'Show All Catalog Books'}
                  </button>
                </div>
              )}
            </div>

            {borrowerType !== 'inventory' && selectedMember && memberActiveLoans.length === 0 && (
              <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong>{selectedMember.name}</strong> has no active issued books. Showing all catalog books.
                </span>
              </div>
            )}

            <SearchableSelect
              id="report-book-select"
              options={bookOptions}
              value={reportForm.bookId}
              onChange={handleBookSelect}
              placeholder={
                borrowerType !== 'inventory' && selectedMember && memberActiveLoans.length > 0 && !showAllBooksForMember
                  ? `Select from books issued to ${selectedMember.name}...`
                  : 'Search catalog by title, accession number, or author...'
              }
              emptyMessage={
                borrowerType !== 'inventory' && selectedMember && memberActiveLoans.length > 0 && !showAllBooksForMember
                  ? `No issued books found matching search for ${selectedMember.name}.`
                  : 'No matching active books found.'
              }
            />
          </div>

          {/* Book details preview & copies */}
          {selectedBookObj && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-900 font-bold">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>{selectedBookObj.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedBookObj.price ? (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      MRP: ₹{selectedBookObj.price}
                    </span>
                  ) : null}
                  {selectedLoanObj && selectedLoanObj.accessionNumber ? (
                    <span className="font-mono font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300 text-[11px]">
                      Issued Copy Acc #: {selectedLoanObj.accessionNumber} {selectedLoanObj.copyNumber ? `(Copy #${selectedLoanObj.copyNumber})` : ''}
                    </span>
                  ) : (
                    <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      Acc Range: {selectedBookObj.accessionNumber || 'N/A'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                <span>Author: <strong>{selectedBookObj.author}</strong></span>
                <span>Total Copies: <strong>{selectedBookObj.totalCopies}</strong> • In Stock: <strong className="text-emerald-700">{selectedBookObj.availableCopies}</strong></span>
              </div>
              {selectedAssignmentId && selectedLoanObj && (
                <div className="pt-1.5 border-t border-blue-100 text-[11px] text-blue-900 font-semibold flex items-center justify-between bg-blue-50/70 p-2 rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                    <span>Linked Active Loan: <strong>{selectedLoanObj.accessionNumber || selectedBookObj.accessionNumber}</strong> {selectedLoanObj.copyNumber ? `(Copy #${selectedLoanObj.copyNumber})` : ''}</span>
                  </span>
                  <span className="text-slate-600 text-[10px]">
                    Issued Date: {selectedLoanObj.assignedDate ? new Date(selectedLoanObj.assignedDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* RESOLUTION METHOD SELECTION (Cash Recovery vs Book Replaced) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              Resolution Method (निस्तारण का तरीका) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="res-cash-recovery-btn"
                onClick={() => {
                  const penalty = computePenalty(selectedBookObj, selectedLoanObj, 'cash_recovery');
                  setReportForm((prev) => ({
                    ...prev,
                    resolutionType: 'cash_recovery',
                    fineAmount: penalty.calculatedTotal,
                    fineStatus: penalty.calculatedTotal > 0 ? 'pending' : 'none',
                  }));
                }}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  reportForm.resolutionType === 'cash_recovery'
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 text-amber-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>💰 Cash Recovery</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Book cost + fine collected. Deducts catalog stock.
                </p>
              </button>

              <button
                type="button"
                id="res-book-replaced-btn"
                onClick={() => {
                  setReportForm((prev) => ({
                    ...prev,
                    resolutionType: 'book_replaced',
                    fineAmount: 0,
                    fineStatus: 'none',
                  }));
                }}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  reportForm.resolutionType === 'book_replaced'
                    ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 text-emerald-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>🔄 Book Replaced</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Student gave replacement book. Fine is ₹0 & stock preserved.
                </p>
              </button>
            </div>

            {/* Helper banner for Book Replaced */}
            {reportForm.resolutionType === 'book_replaced' && (
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Replacement Book Accepted (नो फाइन & स्टॉक सुरक्षित)</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-normal">
                  The student has submitted an exact new/replacement copy of the book. Fine is automatically ₹0, the active loan will be closed, and library catalog stock count will NOT be deducted.
                </p>
                <div className="pt-1.5">
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    Replacement Copy Accession Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={reportForm.replacementAccessionNo}
                    onChange={(e) => setReportForm({ ...reportForm, replacementAccessionNo: e.target.value })}
                    placeholder="E.g., ACC-0452 (New Accession No)"
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Copies count to deduct (Only if Cash Recovery) */}
          {reportForm.resolutionType === 'cash_recovery' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Copies to Deduct <span className="text-rose-500">*</span>
              </label>
              <input
                id="report-copies-count"
                type="number"
                min="1"
                max={selectedBookObj ? selectedBookObj.availableCopies || 1 : 99}
                required
                value={reportForm.copiesCount}
                onChange={(e) => setReportForm({ ...reportForm, copiesCount: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-rose-500"
              />
              <p className="text-[11px] text-rose-600 font-medium mt-1">
                ⚠️ This will immediately reduce available stock by {reportForm.copiesCount} copy/copies.
              </p>
            </div>
          ) : (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span className="font-medium">Library Catalog Stock:</span>
              <span className="text-emerald-700 font-bold">No deduction (Preserved: {selectedBookObj?.availableCopies ?? 1} copies)</span>
            </div>
          )}

          {/* Reason / Incident Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Incident Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="report-reason-input"
              rows={2}
              required
              value={reportForm.reason}
              onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
              placeholder={
                reportForm.resolutionType === 'book_replaced'
                  ? 'E.g., Student lost original copy but submitted an exact new replacement book copy...'
                  : 'E.g., Student informed book was lost in school bus / bag torn / pages damaged...'
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-rose-500"
            />
            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(reportForm.resolutionType === 'book_replaced'
                ? [
                    'Student provided exact new replacement copy',
                    'Student replaced lost book with fresh edition',
                    'Replacement copy verified by librarian',
                  ]
                : [
                    'Lost by student in school transit / bus',
                    'Lost by student at home',
                    'Water bottle spilled inside student bag',
                    'Pages torn & cover damaged by student',
                    'Lost during annual shelf inventory',
                  ]
              ).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setReportForm((prev) => ({ ...prev, reason: tag }))}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Fine Penalty or Recovery Amount (Only for Cash Recovery) */}
          {reportForm.resolutionType === 'cash_recovery' && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              {/* Dynamic breakdown banner */}
              {selectedBookObj && (
                (() => {
                  const penalty = computePenalty(selectedBookObj, selectedLoanObj, 'cash_recovery');
                  return (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-amber-900 flex items-center justify-between">
                        <span>Fine Calculation Breakdown:</span>
                        <span className="font-bold text-amber-800">Total: ₹{penalty.calculatedTotal}</span>
                      </div>
                      <div className="text-[11px] text-amber-800 flex items-center justify-between">
                        <span>• Book Price (MRP):</span>
                        <span className="font-bold">₹{penalty.bookPrice}</span>
                      </div>
                      {penalty.lateDays > 0 && (
                        <div className="text-[11px] text-amber-800 flex items-center justify-between">
                          <span>• Overdue Fine ({penalty.lateDays} days late @ ₹{settings.finePerDay || 2}/day):</span>
                          <span className="font-bold">₹{penalty.overdueFine}</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Fine / Penalty Amount</span>
                  <span className="text-[11px] text-slate-500">Book cost + overdue fine (editable)</span>
                </div>
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₹</span>
                    <input
                      id="report-fine-amount"
                      type="number"
                      min="0"
                      value={reportForm.fineAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setReportForm((prev) => ({
                          ...prev,
                          fineAmount: val,
                          fineStatus: val > 0 ? (prev.fineStatus === 'none' ? 'pending' : prev.fineStatus) : 'none',
                        }));
                      }}
                      className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:border-rose-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {reportForm.fineAmount > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Fine Payment Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportForm({ ...reportForm, fineStatus: 'pending' })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reportForm.fineStatus === 'pending'
                          ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Pending from Student (बकाया)
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportForm({ ...reportForm, fineStatus: 'paid' })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reportForm.fineStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Paid at Counter (जमा हो गया)
                    </button>
                  </div>

                  {reportForm.fineStatus === 'paid' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Method</label>
                        <select
                          value={reportForm.paymentMethod}
                          onChange={(e) => setReportForm({ ...reportForm, paymentMethod: e.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI / Online">UPI / Online</option>
                          <option value="Card">Card</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Receipt No</label>
                        <input
                          type="text"
                          value={reportForm.receiptNo}
                          onChange={(e) => setReportForm({ ...reportForm, receiptNo: e.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                          placeholder="REC-XXXX"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reported By</label>
            <input
              type="text"
              value={reportForm.reportedBy}
              onChange={(e) => setReportForm({ ...reportForm, reportedBy: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-report-btn"
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer ${
                reportForm.resolutionType === 'book_replaced'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {submitting
                ? 'Processing...'
                : reportForm.resolutionType === 'book_replaced'
                ? 'Confirm Book Replacement'
                : 'Confirm & Deduct Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT / LINK STUDENT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Link / Update Student Borrower"
        subtitle="Attach the student responsible or update incident details"
        maxWidth="md"
      >
        {selectedLogForEdit && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedLogForEdit.book?.title}</div>
              <div className="text-slate-500 text-[11px]">
                Condition: <span className="font-bold uppercase text-rose-700">{selectedLogForEdit.type}</span> • Date: {new Date(selectedLogForEdit.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Select / Link Student */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Student / Member (किस विद्यार्थी ने घुमाई?)
              </label>
              <SearchableSelect
                id="edit-student-select"
                options={allMemberOptions}
                value={editForm.memberId}
                onChange={(val) => setEditForm({ ...editForm, memberId: val })}
                placeholder="Search student by name, admission no, class, or roll no..."
                emptyMessage="No member found."
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Select a student to clearly show who lost this book on the records and audit logs.
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Incident Reason / Description
              </label>
              <textarea
                rows={2}
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            {/* Fine Penalty */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Fine Penalty (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={editForm.fineAmount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setEditForm((prev) => ({
                      ...prev,
                      fineAmount: val,
                      fineStatus: val > 0 ? (prev.fineStatus === 'none' ? 'pending' : prev.fineStatus) : 'none',
                    }));
                  }}
                  className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>

              {editForm.fineAmount > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, fineStatus: 'pending' })}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editForm.fineStatus === 'pending'
                        ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Pending Fine
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, fineStatus: 'paid' })}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editForm.fineStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Paid Now
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Save Student Details'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* COLLECT PENDING FINE MODAL */}
      <Modal
        isOpen={isFineModalOpen}
        onClose={() => setIsFineModalOpen(false)}
        title="Collect Lost/Damaged Book Fine"
        subtitle="Record fine payment received from borrower"
        maxWidth="sm"
      >
        {selectedLogForFine && (
          <form onSubmit={handleFineCollectSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
              <div className="font-bold text-amber-950">{selectedLogForFine.book?.title}</div>
              <div className="text-amber-800 text-[11px]">
                Condition: <strong>{selectedLogForFine.type.toUpperCase()}</strong> • Member: {selectedLogForFine.member?.name || 'N/A'}
              </div>
              <div className="text-amber-900 font-extrabold text-sm pt-1 border-t border-amber-200">
                Pending Fine: ₹{selectedLogForFine.fineAmount}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount to Collect (₹)
              </label>
              <input
                type="number"
                min="1"
                required
                value={fineCollectForm.paidAmount}
                onChange={(e) => setFineCollectForm({ ...fineCollectForm, paidAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={fineCollectForm.paymentMethod}
                  onChange={(e) => setFineCollectForm({ ...fineCollectForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / Online">UPI / Online</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt No</label>
                <input
                  type="text"
                  value={fineCollectForm.receiptNo}
                  onChange={(e) => setFineCollectForm({ ...fineCollectForm, receiptNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                  placeholder="REC-XXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Remarks</label>
              <input
                type="text"
                value={fineCollectForm.remarks}
                onChange={(e) => setFineCollectForm({ ...fineCollectForm, remarks: e.target.value })}
                placeholder="Optional notes"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFineModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
              >
                {submitting ? 'Recording...' : 'Record Payment as Paid'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE / RESTORE MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Record & Restore Book Stock?"
        subtitle="This will permanently delete this audit record and add the copy back to library inventory"
        maxWidth="sm"
      >
        {logToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <div className="font-bold">{logToDelete.book?.title}</div>
              <div>Copies to restore: <strong>+{logToDelete.copiesCount || 1} copy</strong></div>
              <div>Reported borrower: <strong>{logToDelete.member?.name || 'Catalog Shelf Audit'}</strong></div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete this lost/damaged record? The book's available stock will be restored by +{logToDelete.copiesCount || 1} copy.
            </p>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
              >
                {submitting ? 'Deleting & Restoring...' : 'Yes, Delete & Restore Stock'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
