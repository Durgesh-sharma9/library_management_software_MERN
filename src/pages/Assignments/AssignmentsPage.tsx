import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  IndianRupee,
  Calendar,
  X,
  User,
  BookOpen,
  Info,
  DollarSign,
  AlertOctagon,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  Check,
  GraduationCap,
  Briefcase,
  Hash,
  RefreshCw,
  Percent,
  ShieldAlert,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { assignmentService, bookService, memberService, categoryService, lostDamagedService } from '../../services/api';
import { Assignment, Book, Member, BookCategory } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { SearchableSelect, Option } from '../../components/SearchableSelect';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';

interface AssignmentsPageProps {
  initialFilter?: { status?: string; categoryId?: string; memberId?: string; bookId?: string };
}

export const AssignmentsPage: React.FC<AssignmentsPageProps> = ({ initialFilter }) => {
  const { settings, formatCurrency } = useSettings();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allAssignmentsUnfiltered, setAllAssignmentsUnfiltered] = useState<Assignment[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter?.status || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialFilter?.categoryId || 'all');
  const [selectedMemberType, setSelectedMemberType] = useState<string>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialFilter?.memberId || 'all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);

  // Reissue Modal
  const [isReissueModalOpen, setIsReissueModalOpen] = useState<boolean>(false);
  const [selectedAssignmentForReissue, setSelectedAssignmentForReissue] = useState<Assignment | null>(null);

  // Return Modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [selectedAssignmentForReturn, setSelectedAssignmentForReturn] = useState<Assignment | null>(null);
  const [returnForm, setReturnForm] = useState<{
    returnDate: string;
    finePaid: boolean;
    remarks: string;
  }>({
    returnDate: new Date().toISOString().split('T')[0],
    finePaid: true,
    remarks: '',
  });
  const [reissueForm, setReissueForm] = useState<{
    newDueDate: string;
    remarks: string;
    settleOverdueFine: boolean;
    fineAction: 'waive' | 'pay';
    fineWaiverType: 'full' | 'partial';
    fineWaiverAmount: number;
    finePaidAmount: number;
    finePaymentMethod: string;
    fineReceiptNo: string;
  }>({
    newDueDate: '',
    remarks: '',
    settleOverdueFine: false,
    fineAction: 'waive',
    fineWaiverType: 'full',
    fineWaiverAmount: 0,
    finePaidAmount: 0,
    finePaymentMethod: 'Cash',
    fineReceiptNo: '',
  });

  // Report Lost / Damaged Modal for an active assignment
  const [isLostDamagedModalOpen, setIsLostDamagedModalOpen] = useState<boolean>(false);
  const [selectedAssignmentForLostDamaged, setSelectedAssignmentForLostDamaged] = useState<Assignment | null>(null);
  const [lostDamagedForm, setLostDamagedForm] = useState<{
    type: 'lost' | 'damaged';
    resolutionType: 'cash_recovery' | 'book_replaced';
    replacementAccessionNo: string;
    reason: string;
    fineAmount: number;
    fineStatus: 'pending' | 'paid';
    paymentMethod: string;
    receiptNo: string;
    reportedBy: string;
  }>({
    type: 'lost',
    resolutionType: 'cash_recovery',
    replacementAccessionNo: '',
    reason: '',
    fineAmount: 0,
    fineStatus: 'pending',
    paymentMethod: 'Cash',
    receiptNo: '',
    reportedBy: 'Admin / Librarian',
  });

  // Direct Inventory Lost/Damaged Modal
  const [isDirectModalOpen, setIsDirectModalOpen] = useState<boolean>(false);
  const [directForm, setDirectForm] = useState<{
    bookId: string;
    type: 'lost' | 'damaged';
    copiesCount: number;
    reason: string;
    reportedBy: string;
    fineAmount: number;
    fineStatus: 'none' | 'pending' | 'paid';
    paymentMethod: string;
    receiptNo: string;
  }>({
    bookId: '',
    type: 'damaged',
    copiesCount: 1,
    reason: '',
    reportedBy: 'Admin / Librarian',
    fineAmount: 0,
    fineStatus: 'none',
    paymentMethod: 'Cash',
    receiptNo: '',
  });

  // Collect Fine / Waiver Modal
  const [isFineModalOpen, setIsFineModalOpen] = useState<boolean>(false);
  const [selectedAssignmentForFine, setSelectedAssignmentForFine] = useState<Assignment | null>(null);
  const [fineForm, setFineForm] = useState<{
    mode: 'pay' | 'waive' | 'pending';
    waiverType: 'full' | 'partial';
    originalCalculatedFine: number;
    waiveAmount: number;
    payableAmount: number;
    handleRemainingAs: 'pay_now' | 'pending';
    paymentMethod: string;
    receiptNo: string;
    remarks: string;
  }>({
    mode: 'pay',
    waiverType: 'partial',
    originalCalculatedFine: 0,
    waiveAmount: 0,
    payableAmount: 0,
    handleRemainingAs: 'pay_now',
    paymentMethod: 'Cash',
    receiptNo: '',
    remarks: '',
  });

  // Assign Form
  const [assignRecipientType, setAssignRecipientType] = useState<'student' | 'teacher'>('student');
  const [assignForm, setAssignForm] = useState<{
    memberId: string;
    bookId: string;
    copyNumber?: number;
    accessionNumber?: string;
    assignedDate: string;
    dueDate: string;
    remarks: string;
  }>({
    memberId: '',
    bookId: '',
    copyNumber: undefined,
    accessionNumber: '',
    assignedDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    remarks: '',
  });

  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await assignmentService.getAll({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        memberId: selectedMemberId !== 'all' ? selectedMemberId : undefined,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      let filtered = data;
      if (selectedMemberType !== 'all') {
        filtered = filtered.filter((a) => {
          const mType = (a.member as any)?.memberType || 'student';
          return mType === selectedMemberType;
        });
      }

      if (selectedMemberId && selectedMemberId !== 'all') {
        filtered = filtered.filter((a) => {
          const m = a.member as any;
          if (!m) return false;
          const mId = typeof m === 'object' ? m._id : m;
          const mCode = typeof m === 'object' ? m.memberId : '';
          return mId === selectedMemberId || mCode === selectedMemberId;
        });
      }

      setAssignments(filtered);

      // Also get raw list for tab metrics
      const rawAll = await assignmentService.getAll({});
      setAllAssignmentsUnfiltered(rawAll);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [bList, mList, cList] = await Promise.all([
        bookService.getAll({ status: 'active' }),
        memberService.getAll({ status: 'active' }),
        categoryService.getAll(false),
      ]);
      setBooks(bList);
      setMembers(mList);
      setCategories(cList);
    } catch (err) {
      console.error('Failed to load dropdown records:', err);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [selectedStatus, selectedCategory, selectedMemberType, selectedMemberId, search, fromDate, toDate]);

  // Tab count metrics
  const tabCounts = React.useMemo(() => {
    let studentActive = 0;
    let teacherActive = 0;
    let totalActive = 0;
    let overdueCount = 0;
    let lostDamagedCount = 0;

    const listToScan = allAssignmentsUnfiltered.length > 0 ? allAssignmentsUnfiltered : assignments;

    listToScan.forEach((a) => {
      const isLostOrDamaged = a.status === 'lost' || a.status === 'damaged' || !!a.lostOrDamaged;
      const isReturned = a.status === 'returned' || !!a.returnedDate;
      const mObj = typeof a.member === 'object' ? a.member : members.find((m) => m._id === a.member);
      const isTeacher = (mObj as any)?.memberType === 'teacher';

      if (isLostOrDamaged) {
        lostDamagedCount++;
      } else if (!isReturned) {
        totalActive++;
        if (isTeacher) {
          teacherActive++;
        } else {
          studentActive++;
        }
        if (a.isOverdue) {
          overdueCount++;
        }
      }
    });

    return {
      all: listToScan.length,
      studentActive: studentActive || 0,
      teacherActive: teacherActive || 0,
      studentActiveCount: studentActive || 0,
      teacherActiveCount: teacherActive || 0,
      totalActive: totalActive || 0,
      overdueCount: overdueCount || 0,
      lostDamagedCount: lostDamagedCount || 0,
    };
  }, [allAssignmentsUnfiltered, assignments, members]);

  // Handlers
  const handleOpenAssignModal = () => {
    setFormError('');
    const today = new Date();
    const dueDateObj = new Date(today);
    dueDateObj.setDate(dueDateObj.getDate() + (settings.issueDuration || 14));

    setAssignForm({
      memberId: '',
      bookId: '',
      copyNumber: undefined,
      accessionNumber: '',
      assignedDate: today.toISOString().split('T')[0],
      dueDate: dueDateObj.toISOString().split('T')[0],
      remarks: '',
    });
    setAssignRecipientType('student');
    setIsAssignModalOpen(true);
  };

  const handleOpenReissueModal = (assignment: Assignment) => {
    setSelectedAssignmentForReissue(assignment);
    setFormError('');
    const today = new Date();
    const currentDueDate = new Date(assignment.dueDate);
    const baseDate = currentDueDate > today ? currentDueDate : today;
    const newDue = new Date(baseDate);
    newDue.setDate(newDue.getDate() + (settings.issueDuration || 14));

    const currentFine = assignment.fineAmount || assignment.currentFine || 0;

    setReissueForm({
      newDueDate: newDue.toISOString().split('T')[0],
      remarks: '',
      settleOverdueFine: currentFine > 0,
      fineAction: 'waive',
      fineWaiverType: 'full',
      fineWaiverAmount: currentFine,
      finePaidAmount: 0,
      finePaymentMethod: 'Cash',
      fineReceiptNo: `REC-${Date.now().toString().slice(-6)}`,
    });
    setIsReissueModalOpen(true);
  };

  const handleOpenLostDamagedModal = (assignment: Assignment) => {
    setSelectedAssignmentForLostDamaged(assignment);
    setFormError('');
    
    // Calculate book price + overdue late fee if any
    const bookPrice = assignment.book?.price ? Math.max(0, Number(assignment.book.price)) : 0;
    let lateDays = 0;
    let overdueFine = 0;
    if (assignment.dueDate) {
      const due = new Date(assignment.dueDate);
      const now = new Date();
      if (now > due) {
        lateDays = Math.max(0, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        overdueFine = lateDays * (settings.finePerDay || 2);
      }
    }
    const totalFine = bookPrice + overdueFine;

    setLostDamagedForm({
      type: 'lost',
      resolutionType: 'cash_recovery',
      replacementAccessionNo: '',
      reason: '',
      fineAmount: totalFine,
      fineStatus: totalFine > 0 ? 'pending' : 'paid',
      paymentMethod: 'Cash',
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      reportedBy: 'Admin / Librarian',
    });
    setIsLostDamagedModalOpen(true);
  };

  const handleLostDamagedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForLostDamaged) return;
    if (!lostDamagedForm.reason.trim()) {
      setFormError('Please enter a reason or description of the damage/loss.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const res = await assignmentService.reportLostOrDamaged(selectedAssignmentForLostDamaged._id, {
        type: lostDamagedForm.type,
        resolutionType: lostDamagedForm.resolutionType,
        replacementAccessionNo: lostDamagedForm.replacementAccessionNo ? lostDamagedForm.replacementAccessionNo.trim() : undefined,
        fineAmount: lostDamagedForm.fineAmount,
        reason: lostDamagedForm.reason.trim(),
        fineStatus: lostDamagedForm.fineAmount > 0 ? lostDamagedForm.fineStatus : 'paid',
        paymentMethod: lostDamagedForm.paymentMethod,
        receiptNo: lostDamagedForm.receiptNo,
        reportedBy: lostDamagedForm.reportedBy,
      });

      setIsLostDamagedModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text:
          res.message ||
          (lostDamagedForm.resolutionType === 'book_replaced'
            ? 'Book replacement accepted. Loan closed and catalog stock preserved.'
            : `Book successfully marked as ${lostDamagedForm.type.toUpperCase()}. 1 copy deducted from library inventory and fine of ₹${lostDamagedForm.fineAmount} recorded.`),
      });
      fetchAssignments();
      fetchDropdownData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to report lost/damaged book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDirectModal = () => {
    setFormError('');
    setDirectForm({
      bookId: '',
      type: 'damaged',
      copiesCount: 1,
      reason: '',
      reportedBy: 'Admin / Librarian',
      fineAmount: 0,
      fineStatus: 'none',
      paymentMethod: 'Cash',
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
    });
    setIsDirectModalOpen(true);
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directForm.bookId) {
      setFormError('Please select a book from the catalog.');
      return;
    }
    if (!directForm.reason.trim()) {
      setFormError('Please enter the damage / loss reason.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const res = await lostDamagedService.reportDirect({
        bookId: directForm.bookId,
        type: directForm.type,
        copiesCount: directForm.copiesCount,
        reason: directForm.reason.trim(),
        reportedBy: directForm.reportedBy.trim(),
        fineAmount: directForm.fineAmount,
        fineStatus: directForm.fineAmount > 0 ? directForm.fineStatus : 'none',
        paymentMethod: directForm.paymentMethod,
        receiptNo: directForm.receiptNo,
      });

      setIsDirectModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: res.message || `Successfully deducted ${directForm.copiesCount} copy/copies of book from active library stock.`,
      });
      fetchAssignments();
      fetchDropdownData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to record direct lost/damaged copy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCollectFineModal = (assignment: Assignment) => {
    setSelectedAssignmentForFine(assignment);
    const currentFine = assignment.fineAmount || assignment.currentFine || 0;
    setFineForm({
      mode: 'pay',
      waiverType: 'partial',
      originalCalculatedFine: currentFine,
      waiveAmount: 0,
      payableAmount: currentFine,
      handleRemainingAs: 'pay_now',
      paymentMethod: 'Cash',
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      remarks: '',
    });
    setIsFineModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.memberId) {
      setFormError(`Please select a ${assignRecipientType === 'student' ? 'Student' : 'Teacher'}.`);
      return;
    }
    if (!assignForm.bookId) {
      setFormError('Please select a book by Title or Serial / Accession Number.');
      return;
    }
    if (!assignForm.assignedDate || !assignForm.dueDate) {
      setFormError('Issue Date and Due Date are required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await assignmentService.create({
        memberId: assignForm.memberId,
        bookId: assignForm.bookId,
        copyNumber: assignForm.copyNumber,
        accessionNumber: assignForm.accessionNumber,
        assignedDate: assignForm.assignedDate,
        dueDate: assignForm.dueDate,
        remarks: assignForm.remarks,
      });

      setIsAssignModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: 'Book issued successfully!',
      });
      fetchAssignments();
      fetchDropdownData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReissueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForReissue) return;
    if (!reissueForm.newDueDate) {
      setFormError('Please choose a valid new due date.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      let finePayload: any = {};
      const fineAmt = selectedAssignmentForReissue.fineAmount || selectedAssignmentForReissue.currentFine || 0;

      if (selectedAssignmentForReissue.isOverdue && reissueForm.settleOverdueFine && fineAmt > 0) {
        if (reissueForm.fineAction === 'waive') {
          if (reissueForm.fineWaiverType === 'full') {
            finePayload = {
              fineAmount: 0,
              waivedAmount: fineAmt,
              finePaid: false,
              remarks: 'Overdue fine waived upon re-issue',
            };
          } else {
            const waiveAmt = Math.min(reissueForm.fineWaiverAmount, fineAmt);
            const rem = Math.max(0, fineAmt - waiveAmt);
            finePayload = {
              fineAmount: rem,
              waivedAmount: waiveAmt,
              finePaid: true,
              receiptNo: reissueForm.fineReceiptNo,
              paymentMethod: reissueForm.finePaymentMethod,
              remarks: `Partial waiver of ₹${waiveAmt} on re-issue; ₹${rem} paid`,
            };
          }
        } else if (reissueForm.fineAction === 'pay') {
          finePayload = {
            fineAmount: fineAmt,
            finePaid: true,
            receiptNo: reissueForm.fineReceiptNo,
            paymentMethod: reissueForm.finePaymentMethod,
          };
        }
      }

      const res = await assignmentService.reissue(selectedAssignmentForReissue._id, {
        newDueDate: reissueForm.newDueDate,
        remarks: reissueForm.remarks.trim(),
        ...finePayload,
      });

      setIsReissueModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: res.message || 'Book re-issued successfully with extended due date!',
      });
      fetchAssignments();
      fetchDropdownData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to re-issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReturnModal = (assignment: Assignment) => {
    setFormError('');
    setSelectedAssignmentForReturn(assignment);
    setReturnForm({
      returnDate: new Date().toISOString().split('T')[0],
      finePaid: true,
      remarks: '',
    });
    setIsReturnModalOpen(true);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForReturn) return;

    try {
      setSubmitting(true);
      setFormError('');

      const res = await assignmentService.returnBook(selectedAssignmentForReturn._id, {
        returnDate: returnForm.returnDate,
        finePaid: returnForm.finePaid,
        remarks: returnForm.remarks.trim(),
      });

      setIsReturnModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: res.message || `Book "${selectedAssignmentForReturn.book?.title}" returned to inventory successfully!`,
      });

      fetchAssignments();
      fetchDropdownData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to return book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForFine) return;

    try {
      setSubmitting(true);
      let fineStatus: 'none' | 'pending' | 'paid' | 'waived' = 'paid';
      let fineAmount = fineForm.payableAmount;
      let waivedAmount = fineForm.waiveAmount;
      let originalFine = fineForm.originalCalculatedFine;
      let remarksText = fineForm.remarks.trim();

      if (fineForm.mode === 'pay') {
        fineStatus = 'paid';
        fineAmount = fineForm.payableAmount;
        waivedAmount = 0;
        remarksText = `[${fineForm.paymentMethod}] Rec# ${fineForm.receiptNo} ${remarksText ? ` - ${remarksText}` : ''}`.trim();
      } else if (fineForm.mode === 'waive') {
        if (fineForm.waiverType === 'full') {
          fineStatus = 'waived';
          fineAmount = 0;
          waivedAmount = originalFine;
          remarksText = `Full 100% fine waived (₹${originalFine}) ${remarksText ? ` - ${remarksText}` : ''}`.trim();
        } else {
          // Partial waiver
          waivedAmount = Math.min(originalFine, Math.max(0, fineForm.waiveAmount));
          const remaining = Math.max(0, originalFine - waivedAmount);
          fineAmount = remaining;

          if (fineForm.handleRemainingAs === 'pay_now') {
            fineStatus = remaining > 0 ? 'paid' : 'waived';
            remarksText = `Partial waiver: ₹${waivedAmount} waived. ₹${remaining} collected via ${fineForm.paymentMethod} (Rec# ${fineForm.receiptNo}) ${remarksText ? ` - ${remarksText}` : ''}`.trim();
          } else {
            fineStatus = 'pending';
            remarksText = `Partial waiver: ₹${waivedAmount} waived. ₹${remaining} kept as pending balance ${remarksText ? ` - ${remarksText}` : ''}`.trim();
          }
        }
      } else if (fineForm.mode === 'pending') {
        fineStatus = 'pending';
        fineAmount = originalFine;
        waivedAmount = 0;
        remarksText = `Recorded pending fine of ₹${originalFine} ${remarksText ? ` - ${remarksText}` : ''}`.trim();
      }

      const res = await assignmentService.updateFineStatus(selectedAssignmentForFine._id, {
        fineStatus,
        fineAmount,
        originalFine,
        waivedAmount,
        receiptNo: fineForm.receiptNo,
        paymentMethod: fineForm.paymentMethod,
        remarks: remarksText,
      });

      setIsFineModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: (res as any).message || `Fine settlement updated successfully!`,
      });
      fetchAssignments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update fee record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter members according to recipient tab
  const filteredMembers = members.filter((m) => {
    const type = m.memberType || 'student';
    return type === assignRecipientType;
  });

  const memberOptions: Option[] = filteredMembers.map((m) => {
    let sub = '';
    if (m.memberType === 'teacher') {
      sub = `Staff ID: ${m.memberId} • Designation: ${m.designation || 'Teacher'} • Dept: ${m.department || 'General'} • WhatsApp: ${m.whatsapp}`;
    } else {
      const adm = m.admissionNo ? `Adm: ${m.admissionNo} • ` : '';
      const cls = `Class: ${m.className || 'N/A'}${m.section ? ` (${m.section})` : ''}`;
      sub = `ID: ${m.memberId} • ${adm}${cls} • Mobile: ${m.whatsapp}`;
    }

    return {
      id: m._id,
      value: m._id,
      label: m.name,
      subLabel: sub,
    };
  });

  // Book Options searchable by Title or Accession / Serial number
  const bookOptions: Option[] = books
    .filter((b) => {
      const availCount = b.copiesList && b.copiesList.length > 0
        ? b.copiesList.filter((c) => c.status === 'available').length
        : (b.availableCopies || 0);
      return availCount > 0 && b.isActive;
    })
    .map((b) => {
      const availCount = b.copiesList && b.copiesList.length > 0
        ? b.copiesList.filter((c) => c.status === 'available').length
        : (b.availableCopies || 0);
      return {
        id: b._id,
        value: b._id,
        label: b.title,
        subLabel: `${b.accessionNumber ? `Acc No: ${b.accessionNumber} • ` : ''}Author: ${b.author} • In Stock: ${availCount} available copy/copies`,
      };
    });

  const allBookOptions: Option[] = books.map((b) => ({
    id: b._id,
    value: b._id,
    label: b.title,
    subLabel: `${b.accessionNumber ? `Acc No: ${b.accessionNumber} • ` : ''}Avail: ${b.availableCopies}/${b.totalCopies} • Author: ${b.author}`,
  }));

  const selectedDirectBook = books.find((b) => b._id === directForm.bookId);

  const selectedAssignBook = books.find((b) => b._id === assignForm.bookId);

  const assignBookCopies = React.useMemo(() => {
    if (!selectedAssignBook) return [];
    if (selectedAssignBook.copiesList && selectedAssignBook.copiesList.length > 0) {
      return selectedAssignBook.copiesList;
    }
    // Fallback if legacy
    const list = [];
    for (let i = 1; i <= (selectedAssignBook.totalCopies || 1); i++) {
      list.push({
        copyNumber: i,
        accessionNumber: selectedAssignBook.accessionNumber ? `${selectedAssignBook.accessionNumber}` : `COPY-${i}`,
        status: i <= selectedAssignBook.availableCopies ? ('available' as const) : ('assigned' as const),
      });
    }
    return list;
  }, [selectedAssignBook]);

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback message banner */}
      {feedbackMessage && (
        <div
          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <span>Book Circulation Desk</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Issue books to Students or Teachers, re-issue for extended reading, and track active circulation
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="assign-book-btn"
            type="button"
            onClick={handleOpenAssignModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Issue / Assign Book</span>
          </button>
        </div>
      </div>

      {/* Quick Segmented Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedMemberType('all');
            setSelectedStatus('all');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedStatus === 'all' && selectedMemberType === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All Circulation ({tabCounts.all ?? assignments.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMemberType('student');
            setSelectedStatus('active');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedMemberType === 'student' && selectedStatus === 'active'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Issued Students ({tabCounts.studentActive ?? tabCounts.studentActiveCount ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMemberType('teacher');
            setSelectedStatus('active');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedMemberType === 'teacher' && selectedStatus === 'active'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Issued Teachers ({tabCounts.teacherActive ?? tabCounts.teacherActiveCount ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedMemberType('all');
            setSelectedStatus('overdue');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedStatus === 'overdue'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Overdue ({tabCounts.overdueCount ?? 0})</span>
        </button>
      </div>

      {/* Detailed Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="assignment-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, book, acc no..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Specific Student / Borrower Filter */}
          <div>
            <select
              id="assignment-specific-member-filter"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Filter by Student / Teacher...</option>
              {members.map((m) => {
                const isTch = m.memberType === 'teacher';
                const clsStr = m.className ? (m.section ? `${m.className}-${m.section}` : m.className) : (m.department || '');
                return (
                  <option key={m._id} value={m._id}>
                    {isTch ? '👨‍🏫 [Teacher]' : '🎓 [Student]'} {m.name} ({clsStr} • {m.memberId})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <select
              id="assignment-member-type-filter"
              value={selectedMemberType}
              onChange={(e) => setSelectedMemberType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Member Roles</option>
              <option value="student">Students Only</option>
              <option value="teacher">Teachers / Faculty Only</option>
            </select>
          </div>

          <div>
            <select
              id="assignment-status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Circulation Statuses</option>
              <option value="active">Issued</option>
              <option value="overdue">Overdue Books</option>
              <option value="due_today">Due Today</option>
              <option value="due_soon">Due Soon (Next 3 Days)</option>
              <option value="lost">Lost Books</option>
              <option value="damaged">Damaged Books</option>
              <option value="returned">Returned / Historical</option>
            </select>
          </div>

          <div>
            <select
              id="assignment-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Member Filter Chip Banner */}
        {selectedMemberId !== 'all' && (() => {
          const selectedM = members.find((m) => m._id === selectedMemberId || m.memberId === selectedMemberId);
          return (
            <div className="flex items-center justify-between p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 animate-fadeIn">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {selectedM?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Showing only books issued to: </span>
                  <strong className="text-blue-900 font-bold">{selectedM?.name || 'Selected Member'}</strong>
                  <span className="text-slate-500 ml-1">
                    ({selectedM?.memberId} {selectedM?.className ? `• ${selectedM.className}` : ''})
                  </span>
                  <span className="ml-2 font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded text-[11px]">
                    {assignments.length} Book(s)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMemberId('all')}
                className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Student Filter</span>
              </button>
            </div>
          );
        })()}

      {/* Circulation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2.5 text-xs font-medium">Loading circulation records...</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              id="empty-assignments"
              icon={ArrowLeftRight}
              title="No circulation records found"
              description="Issue a book to a student or teacher to start tracking borrowing activity."
              actionLabel="Issue Book"
              onAction={handleOpenAssignModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Borrower (Student / Teacher)</th>
                  <th className="py-3.5 px-3">Book & Accession No</th>
                  <th className="py-3.5 px-3">Issued Date</th>
                  <th className="py-3.5 px-3">Due Date</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Fee / Fine</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assignments.map((item) => {
                  const isLost = item.status === 'lost';
                  const isDamaged = item.status === 'damaged';
                  const isLostOrDamaged = isLost || isDamaged || !!item.lostOrDamaged;
                  const isReturned = item.status === 'returned' || !!item.returnedDate;
                  const isOverdue = item.isOverdue && !isLostOrDamaged && !isReturned;
                  const isTeacher = (item.member as any)?.memberType === 'teacher';

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Borrower Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isTeacher ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isTeacher ? (
                              <Briefcase className="w-3.5 h-3.5" />
                            ) : (
                              <GraduationCap className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => item.member?._id && setSelectedMemberId(item.member._id)}
                                className="font-bold text-slate-900 hover:text-blue-600 text-left transition-colors cursor-pointer"
                                title="Click to show only this member's borrowed books"
                              >
                                {item.member?.name || 'Unknown Member'}
                              </button>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  isTeacher
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {isTeacher ? 'Teacher' : 'Student'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                                {item.member?.memberId}
                              </span>
                              <span>•</span>
                              <span>
                                {isTeacher
                                  ? `${(item.member as any)?.designation || 'Faculty'} (${(item.member as any)?.department || 'Staff'})`
                                  : `${item.member?.className || 'Class N/A'} (${item.member?.section || 'A'})`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Book & Serial / Copy Info */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]"
                            title="Assigned Serial / Accession Number"
                          >
                            {item.accessionNumber || item.book?.accessionNumber || 'ACC-N/A'}
                          </span>
                          {item.copyNumber && (
                            <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              Copy #{item.copyNumber}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 text-xs leading-snug mt-1">
                          {item.book?.title}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          By {item.book?.author}
                        </div>
                        {/* Re-issue Badge */}
                        {(item.reissueCount || 0) > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>Reissued {item.reissueCount}x</span>
                            </span>
                          </div>
                        )}
                        {/* Lost / Damaged Note */}
                        {item.damageOrLostReason && (
                          <div className="mt-1 text-[10px] text-rose-700 italic bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                            Note: "{item.damageOrLostReason}"
                          </div>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-3 font-medium text-slate-700">
                        {new Date(item.assignedDate).toLocaleDateString()}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-rose-600 block">
                            {item.lateDays} day(s) late
                          </span>
                        )}
                      </td>

                      {/* Loan Status */}
                      <td className="py-3.5 px-3">
                        {isLost ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Book Lost</span>
                            </span>
                            <span className="text-[10px] text-rose-600 font-semibold">Stock Deducted</span>
                          </div>
                        ) : isDamaged ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              <span>Book Damaged</span>
                            </span>
                            <span className="text-[10px] text-amber-700 font-semibold">Stock Deducted</span>
                          </div>
                        ) : isReturned ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="success" size="sm">
                              Returned
                            </Badge>
                            {item.returnedDate && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.returnedDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : isOverdue ? (
                          <Badge variant="danger" size="sm">
                            Overdue
                          </Badge>
                        ) : item.isDueToday ? (
                          <Badge variant="warning" size="sm">
                            Due Today
                          </Badge>
                        ) : (
                          <Badge variant="primary" size="sm">
                            Issued
                          </Badge>
                        )}
                      </td>

                      {/* Fee / Fine */}
                      <td className="py-3.5 px-3">
                        {item.fineAmount > 0 || (isOverdue && (item.currentFine || 0) > 0) || (item.waivedAmount || 0) > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {formatCurrency(item.fineAmount || item.currentFine || 0)}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  item.fineStatus === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {item.fineStatus === 'paid' ? 'PAID' : 'PENDING'}
                              </span>
                            </div>

                            {/* Waived discount tag if any */}
                            {(item.waivedAmount || 0) > 0 && (
                              <div className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-100 inline-block">
                                Waived: ₹{item.waivedAmount}
                              </div>
                            )}

                            {/* Quick collect button */}
                            {item.fineStatus !== 'paid' && (
                              <div>
                                <button
                                  id={`quick-collect-btn-${item._id}`}
                                  type="button"
                                  onClick={() => handleOpenCollectFineModal(item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[10px] transition-colors shadow-2xs cursor-pointer"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>Collect / Waive Fine</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">₹0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isLostOrDamaged && !isReturned && (
                            <>
                              {/* Return Book Button */}
                              <button
                                id={`return-btn-${item._id}`}
                                type="button"
                                onClick={() => handleOpenReturnModal(item)}
                                title="Return book copy back to library inventory"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Return</span>
                              </button>

                              {/* Reissue Button */}
                              <button
                                id={`reissue-btn-${item._id}`}
                                type="button"
                                onClick={() => handleOpenReissueModal(item)}
                                title="Re-issue / Renew book loan with extended due date"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Re-Issue</span>
                              </button>
                            </>
                          )}

                          {isLostOrDamaged && (
                            <span className="text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {isLost ? 'Reported Lost' : 'Reported Damaged'}
                            </span>
                          )}

                          {isReturned && (
                            <span className="text-[11px] text-slate-400 font-medium">Returned</span>
                          )}
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

      {/* ASSIGN BOOK MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Issue / Assign Book"
        subtitle="Select borrower and book copy to assign"
        maxWidth="md"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* Recipient Type Toggle: Student vs Teacher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Issue Recipient Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setAssignRecipientType('student');
                  setAssignForm((prev) => ({ ...prev, memberId: '' }));
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  assignRecipientType === 'student'
                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAssignRecipientType('teacher');
                  setAssignForm((prev) => ({ ...prev, memberId: '' }));
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  assignRecipientType === 'teacher'
                    ? 'bg-white text-purple-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span>Teacher / Faculty</span>
              </button>
            </div>
          </div>

          {/* Member Searchable Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select {assignRecipientType === 'student' ? 'Student' : 'Teacher'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="assign-member-select"
              options={memberOptions}
              value={assignForm.memberId}
              onChange={(val) => setAssignForm({ ...assignForm, memberId: val })}
              placeholder={`Search ${assignRecipientType === 'student' ? 'student by name, class, or admission number' : 'teacher by name or staff ID'}...`}
              emptyMessage={`No registered ${assignRecipientType === 'student' ? 'students' : 'teachers'} found.`}
            />
          </div>

          {/* Book Searchable Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Available Book <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="assign-book-select"
              options={bookOptions}
              value={assignForm.bookId}
              onChange={(val) => {
                const b = books.find((x) => x._id === val);
                let copyNum: number | undefined = undefined;
                let accNum: string = '';
                if (b) {
                  if (b.copiesList && b.copiesList.length > 0) {
                    const firstAvail = b.copiesList.find((c) => c.status === 'available');
                    if (firstAvail) {
                      copyNum = firstAvail.copyNumber;
                      accNum = firstAvail.accessionNumber;
                    }
                  } else {
                    copyNum = 1;
                    accNum = b.accessionNumber || '';
                  }
                }
                setAssignForm((prev) => ({
                  ...prev,
                  bookId: val,
                  copyNumber: copyNum,
                  accessionNumber: accNum,
                }));
              }}
              placeholder="Search book by title or accession number..."
              emptyMessage="No available active books in stock."
            />
          </div>

          {/* Specific Copy / Serial Number Selection */}
          {selectedAssignBook && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-purple-600" />
                  <span>Choose Physical Copy / Serial Number:</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {selectedAssignBook.availableCopies} of {selectedAssignBook.totalCopies} Available
                </span>
              </div>

              {/* Interactive Copy Chips Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {assignBookCopies.map((copy) => {
                  const isSelected =
                    assignForm.copyNumber === copy.copyNumber ||
                    (assignForm.accessionNumber && assignForm.accessionNumber === copy.accessionNumber);
                  const isAvail = copy.status === 'available';

                  return (
                    <button
                      key={copy.copyNumber}
                      type="button"
                      disabled={!isAvail}
                      onClick={() => {
                        if (isAvail) {
                          setAssignForm((prev) => ({
                            ...prev,
                            copyNumber: copy.copyNumber,
                            accessionNumber: copy.accessionNumber,
                          }));
                        }
                      }}
                      className={`p-2.5 rounded-xl text-left border text-xs transition-all relative cursor-pointer ${
                        !isAvail
                          ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                          : isSelected
                          ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-300 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-purple-800 truncate">
                          {copy.accessionNumber || `Copy #${copy.copyNumber}`}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                            isAvail
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isAvail ? 'Avail' : copy.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate">
                        {isAvail
                          ? `Copy #${copy.copyNumber} (Ready)`
                          : copy.assignedToName
                          ? `With: ${copy.assignedToName}`
                          : `Copy #${copy.copyNumber} (${copy.status})`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {assignForm.accessionNumber ? (
                <div className="text-[11px] font-medium text-purple-900 bg-purple-100/70 px-3 py-2 rounded-lg border border-purple-200 flex items-center justify-between">
                  <span>
                    Issuing Serial No: <strong>{assignForm.accessionNumber}</strong> (Copy #{assignForm.copyNumber || 1})
                  </span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Selected
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  Please click an available copy from the list above to issue.
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="assign-issue-date"
                type="date"
                required
                value={assignForm.assignedDate}
                onChange={(e) => setAssignForm({ ...assignForm, assignedDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="assign-due-date"
                type="date"
                required
                value={assignForm.dueDate}
                onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Remarks</label>
            <input
              id="assign-remarks-input"
              type="text"
              value={assignForm.remarks}
              onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
              placeholder="Optional comments or condition note"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-issue-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Issuing...' : 'Issue Book'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RE-ISSUE BOOK MODAL */}
      <Modal
        isOpen={isReissueModalOpen}
        onClose={() => setIsReissueModalOpen(false)}
        title="Re-Issue / Renew Book Loan"
        subtitle="Extend the return due date for the borrower"
        maxWidth="md"
      >
        {selectedAssignmentForReissue && (() => {
          const isTeacher = (selectedAssignmentForReissue.member as any)?.memberType === 'teacher';
          const currentFine = selectedAssignmentForReissue.fineAmount || selectedAssignmentForReissue.currentFine || 0;
          const isOverdue = selectedAssignmentForReissue.isOverdue && currentFine > 0;

          const handleExtendDays = (days: number) => {
            const currentDue = new Date(selectedAssignmentForReissue.dueDate);
            const today = new Date();
            const base = currentDue > today ? currentDue : today;
            const newDate = new Date(base);
            newDate.setDate(newDate.getDate() + days);
            setReissueForm((prev) => ({
              ...prev,
              newDueDate: newDate.toISOString().split('T')[0],
            }));
          };

          return (
            <form onSubmit={handleReissueSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Book & Borrower Summary Card */}
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs space-y-1.5">
                <div className="flex justify-between items-start text-indigo-950 font-bold">
                  <div>
                    <span className="text-sm">{selectedAssignmentForReissue.book?.title}</span>
                    <div className="text-[11px] text-indigo-800 font-normal">
                      By {selectedAssignmentForReissue.book?.author} • Acc No: {selectedAssignmentForReissue.book?.accessionNumber || 'N/A'}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-200/80 text-indigo-900 font-mono text-[10px] font-bold">
                    Reissue #{((selectedAssignmentForReissue.reissueCount || 0) + 1)}
                  </span>
                </div>

                <div className="pt-2 border-t border-indigo-200/70 flex flex-wrap items-center justify-between text-[11px] text-indigo-900">
                  <div className="flex items-center gap-1.5">
                    {isTeacher ? (
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span className="font-bold">{selectedAssignmentForReissue.member?.name}</span>
                    <span>({selectedAssignmentForReissue.member?.memberId})</span>
                  </div>
                  <div className="text-slate-600">
                    Current Due Date:{' '}
                    <span className="font-bold text-slate-900">
                      {new Date(selectedAssignmentForReissue.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Overdue Fine Notice & Settle Options */}
              {isOverdue && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-amber-600" />
                      <span>Book is currently overdue ({selectedAssignmentForReissue.lateDays} days)</span>
                    </span>
                    <span className="font-extrabold text-amber-900 text-sm">
                      Fine: ₹{currentFine}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                    <input
                      id="settle-fine-on-reissue"
                      type="checkbox"
                      checked={reissueForm.settleOverdueFine}
                      onChange={(e) => setReissueForm({ ...reissueForm, settleOverdueFine: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="settle-fine-on-reissue" className="font-semibold text-amber-950 cursor-pointer">
                      Settle overdue fine during this re-issue
                    </label>
                  </div>

                  {reissueForm.settleOverdueFine && (
                    <div className="p-2.5 bg-white/90 rounded-lg border border-amber-200 space-y-2 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setReissueForm({ ...reissueForm, fineAction: 'waive', fineWaiverType: 'full' })}
                          className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            reissueForm.fineAction === 'waive'
                              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Waive Fine (Concession)
                        </button>
                        <button
                          type="button"
                          onClick={() => setReissueForm({ ...reissueForm, fineAction: 'pay' })}
                          className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            reissueForm.fineAction === 'pay'
                              ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Collect Payment
                        </button>
                      </div>

                      {reissueForm.fineAction === 'waive' && (
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                              <input
                                type="radio"
                                name="reissueWaiver"
                                checked={reissueForm.fineWaiverType === 'full'}
                                onChange={() => setReissueForm({ ...reissueForm, fineWaiverType: 'full', fineWaiverAmount: currentFine })}
                              />
                              <span>100% Full Waiver (₹0 to pay)</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                              <input
                                type="radio"
                                name="reissueWaiver"
                                checked={reissueForm.fineWaiverType === 'partial'}
                                onChange={() => setReissueForm({ ...reissueForm, fineWaiverType: 'partial', fineWaiverAmount: Math.round(currentFine / 2) })}
                              />
                              <span>Partial Waiver</span>
                            </label>
                          </div>

                          {reissueForm.fineWaiverType === 'partial' && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Amount to Waive (₹)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={currentFine}
                                  value={reissueForm.fineWaiverAmount}
                                  onChange={(e) => setReissueForm({ ...reissueForm, fineWaiverAmount: parseFloat(e.target.value) || 0 })}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Remaining Paid (₹)</label>
                                <div className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-emerald-800">
                                  ₹{Math.max(0, currentFine - reissueForm.fineWaiverAmount)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {reissueForm.fineAction === 'pay' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Payment Method</label>
                            <select
                              value={reissueForm.finePaymentMethod}
                              onChange={(e) => setReissueForm({ ...reissueForm, finePaymentMethod: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                            >
                              <option value="Cash">Cash</option>
                              <option value="UPI / Online">UPI / Online</option>
                              <option value="Card">Card</option>
                              <option value="Adjust in Fee">School Fee</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Receipt No</label>
                            <input
                              type="text"
                              value={reissueForm.fineReceiptNo}
                              onChange={(e) => setReissueForm({ ...reissueForm, fineReceiptNo: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* New Extended Due Date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    New Extended Due Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-medium">Quick Add:</span>
                    <button
                      type="button"
                      onClick={() => handleExtendDays(7)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      +7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendDays(14)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      +14 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendDays(30)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      +30 Days
                    </button>
                  </div>
                </div>

                <input
                  id="reissue-new-due-date"
                  type="date"
                  required
                  value={reissueForm.newDueDate}
                  onChange={(e) => setReissueForm({ ...reissueForm, newDueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-indigo-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Reissue Remarks / Purpose */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Re-Issue Reason / Remarks
                </label>
                <input
                  id="reissue-remarks-input"
                  type="text"
                  value={reissueForm.remarks}
                  onChange={(e) => setReissueForm({ ...reissueForm, remarks: e.target.value })}
                  placeholder="e.g. Extended for exams, project work, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Prior Reissue History if exists */}
              {selectedAssignmentForReissue.reissueHistory && selectedAssignmentForReissue.reissueHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Previous Reissue Logs ({selectedAssignmentForReissue.reissueHistory.length}):
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {selectedAssignmentForReissue.reissueHistory.map((hist, idx) => (
                      <div key={idx} className="p-1.5 bg-slate-50 rounded text-[10px] text-slate-600 flex justify-between">
                        <span>
                          Extended on {new Date(hist.reissuedAt).toLocaleDateString()} to{' '}
                          <b>{new Date(hist.newDueDate).toLocaleDateString()}</b>
                        </span>
                        {hist.remarks && <span className="italic text-slate-500">"{hist.remarks}"</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReissueModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-reissue-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Re-issuing...' : 'Confirm Re-Issue'}</span>
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* REPORT BOOK LOST / DAMAGED MODAL (For Assignment / Borrower) */}
      <Modal
        isOpen={isLostDamagedModalOpen}
        onClose={() => setIsLostDamagedModalOpen(false)}
        title="Report Book Lost / Damaged / Replaced"
        subtitle="Settle lost/damaged borrowed book via Cash Recovery or Replacement Copy"
        maxWidth="md"
      >
        {selectedAssignmentForLostDamaged && (
          <form onSubmit={handleLostDamagedSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Book & Borrower summary card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between items-start text-slate-900 font-bold">
                <div>
                  <span className="text-sm">{selectedAssignmentForLostDamaged.book?.title}</span>
                  <div className="text-[11px] text-slate-600 font-normal">
                    By {selectedAssignmentForLostDamaged.book?.author} • Acc No: {selectedAssignmentForLostDamaged.book?.accessionNumber || 'N/A'}
                  </div>
                </div>
                {selectedAssignmentForLostDamaged.book?.price ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-bold">
                    MRP: ₹{selectedAssignmentForLostDamaged.book.price}
                  </span>
                ) : null}
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold">{selectedAssignmentForLostDamaged.member?.name}</span>
                  <span>({selectedAssignmentForLostDamaged.member?.memberId})</span>
                </div>
                <div className="text-slate-500">
                  Issued: {new Date(selectedAssignmentForLostDamaged.assignedDate).toLocaleDateString()}
                  {selectedAssignmentForLostDamaged.dueDate && (
                    <span> • Due: {new Date(selectedAssignmentForLostDamaged.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* RESOLUTION METHOD SELECTION (Cash Recovery vs Book Replaced) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                Resolution Method (निस्तारण का तरीका) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="loan-res-cash-btn"
                  onClick={() => {
                    const bookPrice = selectedAssignmentForLostDamaged.book?.price ? Math.max(0, Number(selectedAssignmentForLostDamaged.book.price)) : 0;
                    let lateDays = 0;
                    let overdueFine = 0;
                    if (selectedAssignmentForLostDamaged.dueDate) {
                      const due = new Date(selectedAssignmentForLostDamaged.dueDate);
                      const now = new Date();
                      if (now > due) {
                        lateDays = Math.max(0, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
                        overdueFine = lateDays * (settings.finePerDay || 2);
                      }
                    }
                    const totalFine = bookPrice + overdueFine;
                    setLostDamagedForm((prev) => ({
                      ...prev,
                      resolutionType: 'cash_recovery',
                      fineAmount: totalFine,
                      fineStatus: totalFine > 0 ? 'pending' : 'paid',
                    }));
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    lostDamagedForm.resolutionType === 'cash_recovery'
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
                  id="loan-res-replaced-btn"
                  onClick={() => {
                    setLostDamagedForm((prev) => ({
                      ...prev,
                      resolutionType: 'book_replaced',
                      fineAmount: 0,
                      fineStatus: 'paid',
                    }));
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    lostDamagedForm.resolutionType === 'book_replaced'
                      ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 text-emerald-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>🔄 Book Replaced</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Student gave replacement copy. Fine is ₹0 & stock preserved.
                  </p>
                </button>
              </div>

              {/* Helper banner for Book Replaced */}
              {lostDamagedForm.resolutionType === 'book_replaced' && (
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Replacement Copy Accepted (नो फाइन & स्टॉक सुरक्षित)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-normal">
                    Student has provided an exact fresh/replacement book. Fine is ₹0, the loan will be closed, and library catalog stock count will NOT be deducted.
                  </p>
                  <div className="pt-1.5">
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Replacement Copy Accession Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={lostDamagedForm.replacementAccessionNo}
                      onChange={(e) => setLostDamagedForm({ ...lostDamagedForm, replacementAccessionNo: e.target.value })}
                      placeholder="E.g., ACC-0452 (New Accession No)"
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Condition Type Choice: Lost vs Damaged */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reported Incident Condition <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLostDamagedForm({ ...lostDamagedForm, type: 'lost' })}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    lostDamagedForm.type === 'lost'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Book Lost by Borrower</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLostDamagedForm({ ...lostDamagedForm, type: 'damaged' })}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    lostDamagedForm.type === 'damaged'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Book Damaged by Borrower</span>
                </button>
              </div>
            </div>

            {/* Reason / Incident Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Description of Damage or Loss <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="loan-lost-reason-input"
                rows={2}
                required
                value={lostDamagedForm.reason}
                onChange={(e) => setLostDamagedForm({ ...lostDamagedForm, reason: e.target.value })}
                placeholder={
                  lostDamagedForm.resolutionType === 'book_replaced'
                    ? 'e.g. Student lost book and submitted exact replacement copy...'
                    : 'e.g. Student lost book while commuting; Pages torn and binding broken...'
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-rose-500"
              />
              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(lostDamagedForm.resolutionType === 'book_replaced'
                  ? [
                      'Student provided exact new replacement copy',
                      'Replacement copy submitted and verified',
                      'Book replaced with same title & edition',
                    ]
                  : [
                      'Lost by student during transit',
                      'Pages torn & binding damaged',
                      'Cover stained / water damaged',
                      'Pages highlighted & marked',
                    ]
                ).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setLostDamagedForm((prev) => ({ ...prev, reason: tag }))}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin-defined Fine Amount (Only for Cash Recovery) */}
            {lostDamagedForm.resolutionType === 'cash_recovery' && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                {/* Dynamic breakdown */}
                {(() => {
                  const bookPrice = selectedAssignmentForLostDamaged.book?.price ? Math.max(0, Number(selectedAssignmentForLostDamaged.book.price)) : 0;
                  let lateDays = 0;
                  let overdueFine = 0;
                  if (selectedAssignmentForLostDamaged.dueDate) {
                    const due = new Date(selectedAssignmentForLostDamaged.dueDate);
                    const now = new Date();
                    if (now > due) {
                      lateDays = Math.max(0, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
                      overdueFine = lateDays * (settings.finePerDay || 2);
                    }
                  }
                  const total = bookPrice + overdueFine;
                  return (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-amber-900 flex items-center justify-between">
                        <span>Fine Calculation Breakdown:</span>
                        <span className="font-bold text-amber-800">Total: ₹{total}</span>
                      </div>
                      <div className="text-[11px] text-amber-800 flex items-center justify-between">
                        <span>• Book Price (MRP):</span>
                        <span className="font-bold">₹{bookPrice}</span>
                      </div>
                      {lateDays > 0 && (
                        <div className="text-[11px] text-amber-800 flex items-center justify-between">
                          <span>• Overdue Fine ({lateDays} days late @ ₹{settings.finePerDay || 2}/day):</span>
                          <span className="font-bold">₹{overdueFine}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Fine / Penalty to Charge (₹)</span>
                    <span className="text-[11px] text-slate-500">Book cost + overdue fine (editable)</span>
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₹</span>
                      <input
                        id="loan-fine-amount-input"
                        type="number"
                        min="0"
                        value={lostDamagedForm.fineAmount}
                        onChange={(e) => {
                          const amt = parseFloat(e.target.value) || 0;
                          setLostDamagedForm({ ...lostDamagedForm, fineAmount: amt });
                        }}
                        className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:border-rose-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {lostDamagedForm.fineAmount > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">Fine Payment Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLostDamagedForm({ ...lostDamagedForm, fineStatus: 'pending' })}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          lostDamagedForm.fineStatus === 'pending'
                            ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Pending (Charge to Student)
                      </button>

                      <button
                        type="button"
                        onClick={() => setLostDamagedForm({ ...lostDamagedForm, fineStatus: 'paid' })}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          lostDamagedForm.fineStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Paid Now at Counter
                      </button>
                    </div>

                    {lostDamagedForm.fineStatus === 'paid' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Method</label>
                          <select
                            value={lostDamagedForm.paymentMethod}
                            onChange={(e) => setLostDamagedForm({ ...lostDamagedForm, paymentMethod: e.target.value })}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI / Online">UPI / Online</option>
                            <option value="Card">Card</option>
                            <option value="Adjust in Fee">School Fee</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Receipt No</label>
                          <input
                            type="text"
                            value={lostDamagedForm.receiptNo}
                            onChange={(e) => setLostDamagedForm({ ...lostDamagedForm, receiptNo: e.target.value })}
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

            {lostDamagedForm.resolutionType === 'cash_recovery' ? (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Confirming this will close this loan, permanently deduct 1 copy from library catalog stock, and assess the recorded fine.
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Confirming this will close this loan, preserve library catalog stock (0 deducted), and record ₹0 fine.
                </span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsLostDamagedModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-loan-lost-btn"
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer ${
                  lostDamagedForm.resolutionType === 'book_replaced'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting
                  ? 'Processing...'
                  : lostDamagedForm.resolutionType === 'book_replaced'
                  ? 'Confirm Book Replacement'
                  : 'Confirm & Deduct Stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* DIRECT INVENTORY LOST / DAMAGED MODAL */}
      <Modal
        isOpen={isDirectModalOpen}
        onClose={() => setIsDirectModalOpen(false)}
        title="Direct Library Catalog Lost / Damaged Report"
        subtitle="Select a book from catalog stock to record damage or loss and deduct inventory"
        maxWidth="md"
      >
        <form onSubmit={handleDirectSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Condition Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setDirectForm({ ...directForm, type: 'lost' })}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  directForm.type === 'lost'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Book Lost</span>
              </button>

              <button
                type="button"
                onClick={() => setDirectForm({ ...directForm, type: 'damaged' })}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  directForm.type === 'damaged'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Book Damaged</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Book Title <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="direct-book-select"
              options={allBookOptions}
              value={directForm.bookId}
              onChange={(val) => setDirectForm({ ...directForm, bookId: val })}
              placeholder="Search by title, accession number, or author..."
              emptyMessage="No books found in catalog."
            />
          </div>

          {selectedDirectBook && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between items-center text-slate-900 font-bold">
                <span>{selectedDirectBook.title}</span>
                <span className="font-mono text-slate-700">Acc: {selectedDirectBook.accessionNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                <span>Total Copies: <strong>{selectedDirectBook.totalCopies}</strong></span>
                <span>Unassigned Available Stock: <strong className="text-emerald-700">{selectedDirectBook.availableCopies}</strong></span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Number of Copies to Deduct <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedDirectBook ? selectedDirectBook.availableCopies || 1 : 99}
              required
              value={directForm.copiesCount}
              onChange={(e) => setDirectForm({ ...directForm, copiesCount: parseInt(e.target.value, 10) || 1 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Damage Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={directForm.reason}
              onChange={(e) => setDirectForm({ ...directForm, reason: e.target.value })}
              placeholder="e.g. Water damage during monsoon; Pages torn in library reading hall; Missing during shelf audit..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsDirectModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Deducting Stock...' : 'Confirm & Deduct Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* COLLECT FINE / PARTIAL WAIVER MODAL */}
      <Modal
        isOpen={isFineModalOpen}
        onClose={() => setIsFineModalOpen(false)}
        title="Fine Settlement & Fee Collection"
        subtitle="Collect payment or apply partial / full fee waiver"
        maxWidth="md"
      >
        <form onSubmit={handleFineSubmit} className="space-y-4">
          {/* Header Summary */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-amber-900 font-bold">
              <span className="text-sm">Book: {selectedAssignmentForFine?.book?.title}</span>
              <span className="text-sm font-extrabold bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">
                Calculated Fine: ₹{fineForm.originalCalculatedFine}
              </span>
            </div>
            <div className="text-amber-800 text-[11px]">
              Borrower: {selectedAssignmentForFine?.member?.name} ({selectedAssignmentForFine?.member?.memberId})
            </div>

            {selectedAssignmentForFine?.fineBreakdown && selectedAssignmentForFine.fineBreakdown.length > 0 && (
              <div className="pt-2 mt-1 border-t border-amber-200/80 space-y-1">
                <div className="text-[10px] font-bold text-amber-900 uppercase">Calculation Slabs History:</div>
                <div className="space-y-0.5">
                  {selectedAssignmentForFine.fineBreakdown.map((b, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-amber-950">
                      <span>{new Date(b.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – {new Date(b.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ({b.days} days @ ₹{b.ratePerDay}/day)</span>
                      <span className="font-bold">₹{b.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Settlement Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFineForm({
                    ...fineForm,
                    mode: 'pay',
                    waiveAmount: 0,
                    payableAmount: fineForm.originalCalculatedFine,
                  });
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  fineForm.mode === 'pay'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Mark Paid</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFineForm({
                    ...fineForm,
                    mode: 'waive',
                    waiverType: 'partial',
                    waiveAmount: Math.min(fineForm.originalCalculatedFine, fineForm.waiveAmount || Math.round(fineForm.originalCalculatedFine / 2)),
                    payableAmount: Math.max(0, fineForm.originalCalculatedFine - (fineForm.waiveAmount || Math.round(fineForm.originalCalculatedFine / 2))),
                  });
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  fineForm.mode === 'waive'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Percent className="w-4 h-4 text-blue-600" />
                <span>Waiver / Concession</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFineForm({
                    ...fineForm,
                    mode: 'pending',
                    waiveAmount: 0,
                    payableAmount: fineForm.originalCalculatedFine,
                  });
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  fineForm.mode === 'pending'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Keep Pending</span>
              </button>
            </div>
          </div>

          {/* WAIVER FLOW: Full vs Partial Amount */}
          {fineForm.mode === 'waive' && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-blue-900">Choose Waiver Option:</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="waiverTypeRadio"
                    checked={fineForm.waiverType === 'full'}
                    onChange={() =>
                      setFineForm({
                        ...fineForm,
                        waiverType: 'full',
                        waiveAmount: fineForm.originalCalculatedFine,
                        payableAmount: 0,
                      })
                    }
                    className="text-blue-600"
                  />
                  <span>100% Full Waiver (₹0 to pay)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="waiverTypeRadio"
                    checked={fineForm.waiverType === 'partial'}
                    onChange={() => {
                      const initialWaive = Math.min(fineForm.originalCalculatedFine, 20);
                      setFineForm({
                        ...fineForm,
                        waiverType: 'partial',
                        waiveAmount: initialWaive,
                        payableAmount: Math.max(0, fineForm.originalCalculatedFine - initialWaive),
                      });
                    }}
                    className="text-blue-600"
                  />
                  <span>Set Custom Waiver Amount</span>
                </label>
              </div>

              {fineForm.waiverType === 'partial' && (
                <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount to Waive / Discount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="custom-waiver-amount-input"
                        type="number"
                        min="0"
                        max={fineForm.originalCalculatedFine}
                        value={fineForm.waiveAmount}
                        onChange={(e) => {
                          const val = Math.min(fineForm.originalCalculatedFine, Math.max(0, parseInt(e.target.value) || 0));
                          setFineForm({
                            ...fineForm,
                            waiveAmount: val,
                            payableAmount: Math.max(0, fineForm.originalCalculatedFine - val),
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-blue-700 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Remaining Balance to Settle (₹)
                      </label>
                      <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                        ₹{Math.max(0, fineForm.originalCalculatedFine - fineForm.waiveAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Remaining balance handling */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      How to handle remaining ₹{Math.max(0, fineForm.originalCalculatedFine - fineForm.waiveAmount)}?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFineForm({ ...fineForm, handleRemainingAs: 'pay_now' })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          fineForm.handleRemainingAs === 'pay_now'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Collect Balance Now (Mark Paid)
                      </button>

                      <button
                        type="button"
                        onClick={() => setFineForm({ ...fineForm, handleRemainingAs: 'pending' })}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          fineForm.handleRemainingAs === 'pending'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Keep Balance as Pending
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Details when money is collected */}
          {(fineForm.mode === 'pay' || (fineForm.mode === 'waive' && fineForm.waiverType === 'partial' && fineForm.handleRemainingAs === 'pay_now' && (fineForm.originalCalculatedFine - fineForm.waiveAmount) > 0)) && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Being Collected (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fineForm.mode === 'pay' ? fineForm.payableAmount : Math.max(0, fineForm.originalCalculatedFine - fineForm.waiveAmount)}
                    onChange={(e) => {
                      if (fineForm.mode === 'pay') {
                        setFineForm({ ...fineForm, payableAmount: Math.max(0, parseInt(e.target.value) || 0) });
                      }
                    }}
                    disabled={fineForm.mode === 'waive'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    id="fine-payment-method"
                    value={fineForm.paymentMethod}
                    onChange={(e) => setFineForm({ ...fineForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="UPI / QR">UPI / QR Payment</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="School Fee Adjust">Adjusted in School Fee</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Number</label>
                <input
                  id="fine-receipt-no"
                  type="text"
                  value={fineForm.receiptNo}
                  onChange={(e) => setFineForm({ ...fineForm, receiptNo: e.target.value })}
                  placeholder="e.g. REC-104928"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note</label>
            <input
              id="fine-remarks-input"
              type="text"
              value={fineForm.remarks}
              onChange={(e) => setFineForm({ ...fineForm, remarks: e.target.value })}
              placeholder="e.g. Waived by Principal order / Paid at desk"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsFineModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-fine-status-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Fine Settlement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RETURN BOOK MODAL */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Return Book to Inventory"
        subtitle={selectedAssignmentForReturn ? `Processing return for "${selectedAssignmentForReturn.book?.title}"` : ''}
        maxWidth="md"
      >
        {selectedAssignmentForReturn && (
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Book & Borrower Summary Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Book Title:</span>
                <span className="font-bold text-slate-900">{selectedAssignmentForReturn.book?.title}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Accession / Serial No:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                  {selectedAssignmentForReturn.accessionNumber || selectedAssignmentForReturn.book?.accessionNumber || 'ACC-N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Borrower Name:</span>
                <span className="font-bold text-purple-900">{selectedAssignmentForReturn.member?.name} ({selectedAssignmentForReturn.member?.memberId})</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-semibold">Issued Date:</span>
                <span className="font-medium text-slate-700">{new Date(selectedAssignmentForReturn.assignedDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Due Date:</span>
                <span className="font-bold text-purple-800">{new Date(selectedAssignmentForReturn.dueDate).toLocaleDateString()}</span>
              </div>
              {(selectedAssignmentForReturn.fineAmount || selectedAssignmentForReturn.currentFine || 0) > 0 && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-100 bg-rose-50/60 p-2 rounded-xl">
                  <span className="text-rose-800 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Calculated Overdue Fine:
                  </span>
                  <span className="font-mono font-extrabold text-rose-700 text-sm">
                    ₹{selectedAssignmentForReturn.fineAmount || selectedAssignmentForReturn.currentFine || 0}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Return Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="return-date-input"
                type="date"
                required
                value={returnForm.returnDate}
                onChange={(e) => setReturnForm({ ...returnForm, returnDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {(selectedAssignmentForReturn.fineAmount || selectedAssignmentForReturn.currentFine || 0) > 0 && (
              <div className="flex items-center gap-2">
                <input
                  id="return-fine-paid-checkbox"
                  type="checkbox"
                  checked={returnForm.finePaid}
                  onChange={(e) => setReturnForm({ ...returnForm, finePaid: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="return-fine-paid-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Mark Overdue Fine (₹{selectedAssignmentForReturn.fineAmount || selectedAssignmentForReturn.currentFine || 0}) as Paid
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Condition Note (Optional)
              </label>
              <textarea
                id="return-remarks-input"
                rows={2}
                value={returnForm.remarks}
                onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                placeholder="e.g. Returned in good condition"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-return-book-btn"
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-white" />
                <span>{submitting ? 'Returning...' : 'Confirm Return to Inventory'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
