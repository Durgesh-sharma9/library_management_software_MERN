import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  UserCheck,
  Edit2,
  Trash2,
  BookOpen,
  History,
  Calendar,
  IndianRupee,
  CheckCircle2,
  X,
  Phone,
  Mail,
  FileSpreadsheet,
  Check,
  CreditCard,
  DollarSign,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { memberService, masterService, assignmentService } from '../../services/api';
import { Member, SchoolClass, SchoolSection } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { BulkImportMembersModal } from '../../components/BulkImportMembersModal';
import { useSettings } from '../../context/SettingsContext';

interface StudentsPageProps {
  initialFilter?: {
    className?: string;
    section?: string;
    status?: string;
    search?: string;
  };
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ initialFilter }) => {
  const { formatCurrency } = useSettings();
  const [students, setStudents] = useState<Member[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>(initialFilter?.search || '');
  const [selectedClass, setSelectedClass] = useState<string>(initialFilter?.className || 'all');
  const [selectedSection, setSelectedSection] = useState<string>(initialFilter?.section || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter?.status || 'all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);

  // Collect Fee Modal from Student Profile / Row
  const [isCollectFeeOpen, setIsCollectFeeOpen] = useState<boolean>(false);
  const [selectedAssignmentForFee, setSelectedAssignmentForFee] = useState<any>(null);
  const [feeForm, setFeeForm] = useState<{
    fineAmount: number;
    fineStatus: 'paid' | 'pending' | 'none';
    paymentMethod: string;
    receiptNo: string;
    remarks: string;
  }>({
    fineAmount: 0,
    fineStatus: 'paid',
    paymentMethod: 'Cash',
    receiptNo: '',
    remarks: 'Settled at circulation desk',
  });

  const [currentStudent, setCurrentStudent] = useState<Member | null>(null);
  const [studentProfileData, setStudentProfileData] = useState<{
    member: Member | null;
    currentlyAssigned: any[];
    previousHistory: any[];
  }>({
    member: null,
    currentlyAssigned: [],
    previousHistory: [],
  });

  // Form State
  const [formData, setFormData] = useState<{
    memberId: string;
    admissionNo: string;
    name: string;
    whatsapp: string;
    email: string;
    className: string;
    section: string;
    status: 'active' | 'inactive';
  }>({
    memberId: '',
    admissionNo: '',
    name: '',
    whatsapp: '',
    email: '',
    className: 'Class 10',
    section: 'A',
    status: 'active',
  });

  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getSectionsForClass = (className: string): string[] => {
    const found = classes.find((c) => c.name === className);
    if (found && Array.isArray(found.sections) && found.sections.length > 0) {
      return found.sections;
    }
    return ['A', 'B', 'C', 'D'];
  };

  const fetchMasters = async () => {
    try {
      const classList = await masterService.getClasses(false);
      setClasses(classList);
    } catch (err) {
      console.error('Failed to load classes master:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await memberService.getAll({
        memberType: 'student',
        search: search.trim() || undefined,
        className: selectedClass !== 'all' ? selectedClass : undefined,
        section: selectedSection !== 'all' ? selectedSection : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [search, selectedClass, selectedSection, selectedStatus]);

  const handleOpenAddModal = async () => {
    setFormError('');
    const defaultClassName = classes.length > 0 ? classes[0].name : 'Class 10';
    const defaultSections = getSectionsForClass(defaultClassName);
    try {
      const nextId = await memberService.getNextId('student');
      setFormData({
        memberId: nextId || 'LIB-0001',
        admissionNo: '',
        name: '',
        whatsapp: '',
        email: '',
        className: defaultClassName,
        section: defaultSections[0] || 'A',
        status: 'active',
      });
    } catch {
      setFormData({
        memberId: 'LIB-0001',
        admissionNo: '',
        name: '',
        whatsapp: '',
        email: '',
        className: defaultClassName,
        section: defaultSections[0] || 'A',
        status: 'active',
      });
    }
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (student: Member) => {
    setFormError('');
    setCurrentStudent(student);
    setFormData({
      memberId: student.memberId,
      admissionNo: student.admissionNo || '',
      name: student.name,
      whatsapp: student.whatsapp,
      email: student.email || '',
      className: student.className || (classes.length > 0 ? classes[0].name : 'Class 10'),
      section: student.section || 'A',
      status: student.status,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenProfileModal = async (student: Member) => {
    try {
      setCurrentStudent(student);
      setIsProfileModalOpen(true);
      const profile = await memberService.getById(student._id);
      setStudentProfileData(profile);
    } catch (err) {
      console.error('Failed to load student profile:', err);
    }
  };

  const handleOpenCollectFeeModal = (assignment: any) => {
    setSelectedAssignmentForFee(assignment);
    const amount = assignment.fineAmount || assignment.liveFine || assignment.currentFine || 0;
    setFeeForm({
      fineAmount: amount,
      fineStatus: 'paid',
      paymentMethod: 'Cash',
      receiptNo: `REC-${Date.now().toString().slice(-6)}`,
      remarks: 'Settled by student at library counter',
    });
    setIsCollectFeeOpen(true);
  };

  const handleCollectFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForFee) return;

    try {
      setSubmitting(true);
      let note = `[${feeForm.paymentMethod}]`;
      if (feeForm.receiptNo) note += ` Rec# ${feeForm.receiptNo}`;
      if (feeForm.remarks) note += ` - ${feeForm.remarks}`;

      await assignmentService.updateFineStatus(selectedAssignmentForFee._id, {
        fineStatus: feeForm.fineStatus,
        fineAmount: Number(feeForm.fineAmount),
        remarks: note.trim(),
      });

      setIsCollectFeeOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: `Fee/Fine of ₹${feeForm.fineAmount} marked as ${feeForm.fineStatus.toUpperCase()} successfully!`,
      });

      if (currentStudent) {
        const updatedProfile = await memberService.getById(currentStudent._id);
        setStudentProfileData(updatedProfile);
      }
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update fee record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Student Full Name is required.');
      return;
    }
    if (!formData.whatsapp.trim()) {
      setFormError('WhatsApp / Phone number is required.');
      return;
    }
    if (!formData.memberId.trim()) {
      setFormError('Student Member ID is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await memberService.create({
        ...formData,
        memberType: 'student',
      });
      setIsAddModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: `Student ${formData.name} (${formData.memberId}) registered successfully!`,
      });
      fetchStudents();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to register student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    if (!formData.name.trim() || !formData.whatsapp.trim() || !formData.memberId.trim()) {
      setFormError('Name, Member ID, and WhatsApp number are required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await memberService.update(currentStudent._id, {
        ...formData,
        memberType: 'student',
      });
      setIsEditModalOpen(false);
      setFeedbackMessage({ type: 'success', text: `Student ${formData.name} updated successfully!` });
      fetchStudents();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update student profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student: Member) => {
    if ((student.assignedBooksCount || 0) > 0) {
      alert(`Cannot delete ${student.name}: Student currently has ${student.assignedBooksCount} active borrowed book(s).`);
      return;
    }

    const confirm = window.confirm(`Are you sure you want to remove student ${student.name} (${student.memberId})?`);
    if (!confirm) return;

    try {
      const res = await memberService.delete(student._id);
      setFeedbackMessage({ type: 'success', text: res.message || 'Student member removed.' });
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete student.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>Students Directory</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage student library cards with auto-generated unique ID, Admission No, Class & Section master dropdowns
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="bulk-import-students-btn"
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel Import</span>
            </button>

            <button
              id="add-student-btn"
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Student</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="search-students-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Member ID, Admission No..."
              className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <select
              id="filter-student-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              id="filter-student-section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Sections</option>
              {selectedClass !== 'all'
                ? getSectionsForClass(selectedClass).map((secName) => (
                    <option key={secName} value={secName}>
                      Section {secName}
                    </option>
                  ))
                : ['A', 'B', 'C', 'D', 'E', 'F'].map((secName) => (
                    <option key={secName} value={secName}>
                      Section {secName}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <select
              id="filter-student-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="inactive">Inactive / Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="py-14 text-center text-slate-400 text-xs font-medium">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading student directory...
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          title="No Students Found"
          description="Register new school students or adjust your search filters."
          actionText="Add Student"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Student Info & IDs</th>
                  <th className="py-3.5 px-3">Class & Section</th>
                  <th className="py-3.5 px-3">Contact WhatsApp</th>
                  <th className="py-3.5 px-3">Active Issues</th>
                  <th className="py-3.5 px-3">Pending Fine</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-blue-50/20 transition-colors">
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-snug">{student.name}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[10px]">
                              ID: {student.memberId}
                            </span>
                            {student.admissionNo && (
                              <span className="font-mono font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 text-[10px]">
                                Adm: {student.admissionNo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Class & Section */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">
                        {student.className || 'General'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Section: {student.section || 'A'}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 text-slate-800 font-bold">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{student.whatsapp}</span>
                      </div>
                      {student.email && (
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {student.email}
                        </div>
                      )}
                    </td>

                    {/* Active Loans */}
                    <td className="py-3.5 px-3">
                      <span className="font-black text-slate-900">{student.assignedBooksCount || 0}</span>
                      {student.overdueBooksCount ? (
                        <span className="ml-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                          {student.overdueBooksCount} Overdue
                        </span>
                      ) : null}
                    </td>

                    {/* Pending Fine */}
                    <td className="py-3.5 px-3">
                      {(student.pendingFine || 0) > 0 ? (
                        <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {formatCurrency(student.pendingFine || 0)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">₹0.00</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <Badge variant={student.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {student.status.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`profile-btn-${student._id}`}
                          type="button"
                          onClick={() => handleOpenProfileModal(student)}
                          title="View Library Card & History"
                          className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-800 border border-blue-200/80 text-xs font-bold rounded-lg transition-all shadow-2xs cursor-pointer"
                        >
                          Profile & History
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(student)}
                          title="Edit Student Info"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student)}
                          title="Remove Student Record"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student Member"
        subtitle="Register a new student in the school library database with auto-generated ID"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Member ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-student-id"
                type="text"
                required
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value.toUpperCase() })}
                placeholder="e.g. LIB-0001"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-blue-700 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Auto-generated, editable unique ID</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admission No / Roll No (Optional)
              </label>
              <input
                id="add-student-adm"
                type="text"
                value={formData.admissionNo}
                onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                placeholder="e.g. ADM-2024-884"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">School admission record number</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="add-student-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class / Grade <span className="text-rose-500">*</span>
              </label>
              <select
                id="add-student-class"
                value={formData.className}
                onChange={(e) => {
                  const newClass = e.target.value;
                  const availableSecs = getSectionsForClass(newClass);
                  setFormData({
                    ...formData,
                    className: newClass,
                    section: availableSecs.includes(formData.section) ? formData.section : (availableSecs[0] || 'A'),
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                {classes.length > 0 ? (
                  classes.map((cls) => (
                    <option key={cls._id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 8">Class 8</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section <span className="text-rose-500">*</span>
              </label>
              <select
                id="add-student-section"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                {getSectionsForClass(formData.className).map((secName) => (
                  <option key={secName} value={secName}>
                    Section {secName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp / Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-student-whatsapp"
                type="text"
                required
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                id="add-student-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. student@school.edu"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-student-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Registering...' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT STUDENT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Information"
        subtitle={`Editing details for: ${currentStudent?.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Member ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-student-id"
                type="text"
                required
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-blue-700 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admission No
              </label>
              <input
                id="edit-student-adm"
                type="text"
                value={formData.admissionNo}
                onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-student-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Grade</label>
              <select
                id="edit-student-class"
                value={formData.className}
                onChange={(e) => {
                  const newClass = e.target.value;
                  const availableSecs = getSectionsForClass(newClass);
                  setFormData({
                    ...formData,
                    className: newClass,
                    section: availableSecs.includes(formData.section) ? formData.section : (availableSecs[0] || 'A'),
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                {classes.map((cls) => (
                  <option key={cls._id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
              <select
                id="edit-student-section"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                {getSectionsForClass(formData.className).map((secName) => (
                  <option key={secName} value={secName}>
                    Section {secName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp</label>
              <input
                id="edit-student-whatsapp"
                type="text"
                required
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                id="edit-student-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              id="edit-student-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
            >
              <option value="active">Active (Can borrow books)</option>
              <option value="inactive">Inactive (Suspended/Alumni)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-edit-student-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Update Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* STUDENT PROFILE & HISTORY MODAL WITH FEE SETTLEMENT */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Student Library Profile & History"
        subtitle="Complete overview of current book issues, past circulation history and dues"
        maxWidth="2xl"
      >
        {studentProfileData.member && (
          <div className="space-y-6">
            {/* Student ID Card Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-blue-600/30">
                    {studentProfileData.member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {studentProfileData.member.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-600">
                      <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {studentProfileData.member.memberId}
                      </span>
                      {studentProfileData.member.admissionNo && (
                        <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                          Adm: {studentProfileData.member.admissionNo}
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {studentProfileData.member.className || 'Class N/A'}{' '}
                        {studentProfileData.member.section ? `(Sec ${studentProfileData.member.section})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Badge variant={studentProfileData.member.status === 'active' ? 'success' : 'neutral'}>
                    {studentProfileData.member.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-blue-200/50 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp</span>
                  <span className="font-medium text-slate-800">{studentProfileData.member.whatsapp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {studentProfileData.member.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Joined On</span>
                  <span className="font-medium text-slate-800">
                    {studentProfileData.member.createdAt
                      ? new Date(studentProfileData.member.createdAt).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Currently Assigned Books */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Currently Assigned Books ({studentProfileData.currentlyAssigned.length})</span>
                </h4>
              </div>

              {studentProfileData.currentlyAssigned.length > 0 ? (
                <div className="space-y-2">
                  {studentProfileData.currentlyAssigned.map((item: any) => (
                    <div
                      key={item._id}
                      className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.isOverdue ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.book?.title || 'Book'}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {item.book?.accessionNumber ? `Acc: ${item.book.accessionNumber} • ` : ''}Author: {item.book?.author} • Issued: {new Date(item.assignedDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-500">
                            Due: <strong>{new Date(item.dueDate).toLocaleDateString()}</strong>
                          </div>
                          {item.isOverdue && item.liveFine > 0 && (
                            <span className="text-[11px] font-bold text-rose-700 block">
                              Fine: {formatCurrency(item.liveFine)} ({item.lateDays}d late)
                            </span>
                          )}
                        </div>

                        {item.liveFine > 0 && item.fineStatus !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleOpenCollectFeeModal(item)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Collect Fee</span>
                          </button>
                        )}

                        <Badge variant={item.isOverdue ? 'danger' : 'primary'} size="sm">
                          {item.isOverdue ? 'OVERDUE' : 'ISSUED'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No active borrowed books right now.
                </div>
              )}
            </div>

            {/* Previous History Section */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-emerald-600" />
                  <span>Borrowing History & Returned Books ({studentProfileData.previousHistory.length})</span>
                </h4>
              </div>

              {studentProfileData.previousHistory.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {studentProfileData.previousHistory.map((item: any) => (
                    <div
                      key={item._id}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{item.book?.title || 'Book'}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.book?.accessionNumber ? `Acc: ${item.book.accessionNumber} • ` : ''}Issued: {new Date(item.assignedDate).toLocaleDateString()} → Returned: {item.returnedDate ? new Date(item.returnedDate).toLocaleDateString() : '—'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.fineAmount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                item.fineStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Fine: {formatCurrency(item.fineAmount)} ({item.fineStatus?.toUpperCase()})
                            </span>
                            {item.fineStatus === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleOpenCollectFeeModal(item)}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[10px] cursor-pointer"
                              >
                                Collect Fee
                              </button>
                            )}
                          </div>
                        )}
                        <Badge variant="success" size="sm">
                          Returned
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No previous return records.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* COLLECT FEE MODAL */}
      <Modal
        isOpen={isCollectFeeOpen}
        onClose={() => setIsCollectFeeOpen(false)}
        title="Collect Library Fee / Settle Fine"
        subtitle="Record fine payment from student or waive overdue penalties"
        maxWidth="md"
      >
        <form onSubmit={handleCollectFeeSubmit} className="space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-amber-900 font-bold">
              <span>Book: {selectedAssignmentForFee?.book?.title}</span>
            </div>
            <div className="text-[11px] text-amber-800">
              Fine calculated for overdue loan.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status Action</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFeeForm({ ...feeForm, fineStatus: 'paid' })}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  feeForm.fineStatus === 'paid'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Mark Paid</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFeeForm({
                    ...feeForm,
                    fineStatus: 'none',
                    fineAmount: 0,
                    remarks: 'Waived by librarian',
                  })
                }
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  feeForm.fineStatus === 'none'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Waive (₹0)</span>
              </button>

              <button
                type="button"
                onClick={() => setFeeForm({ ...feeForm, fineStatus: 'pending' })}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  feeForm.fineStatus === 'pending'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Keep Pending</span>
              </button>
            </div>
          </div>

          {feeForm.fineStatus !== 'none' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fine Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  id="collect-student-fee-amount"
                  type="number"
                  min="0"
                  required
                  value={feeForm.fineAmount}
                  onChange={(e) =>
                    setFeeForm({ ...feeForm, fineAmount: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {feeForm.fineStatus === 'paid' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                id="collect-student-fee-method"
                value={feeForm.paymentMethod}
                onChange={(e) => setFeeForm({ ...feeForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-amber-500"
              >
                <option value="Cash">Cash at Counter</option>
                <option value="UPI / QR">UPI / QR Payment</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="School Fee Adjust">Adjusted in School Term Fee</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt / Ref No.</label>
              <input
                id="collect-student-fee-receipt"
                type="text"
                value={feeForm.receiptNo}
                onChange={(e) => setFeeForm({ ...feeForm, receiptNo: e.target.value })}
                placeholder="e.g. REC-12345"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
              <input
                id="collect-student-fee-remarks"
                type="text"
                value={feeForm.remarks}
                onChange={(e) => setFeeForm({ ...feeForm, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCollectFeeOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-collect-fee-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Saving...' : feeForm.fineStatus === 'paid' ? `Collect ₹${feeForm.fineAmount}` : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportMembersModal
        isOpen={isBulkImportOpen}
        memberType="student"
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={(count) => {
          fetchStudents();
          setFeedbackMessage({
            type: 'success',
            text: `Successfully imported ${count} students from Excel into directory!`,
          });
        }}
      />
    </div>
  );
};
