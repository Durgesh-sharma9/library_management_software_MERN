import React, { useState, useEffect } from 'react';
import {
  Briefcase,
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
  DollarSign,
  Building2,
  Award,
} from 'lucide-react';
import { memberService, assignmentService } from '../../services/api';
import { Member } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { BulkImportMembersModal } from '../../components/BulkImportMembersModal';
import { useSettings } from '../../context/SettingsContext';

export const TeachersPage: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [teachers, setTeachers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);

  // Collect Fee Modal
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
    remarks: 'Settled by faculty member',
  });

  const [currentTeacher, setCurrentTeacher] = useState<Member | null>(null);
  const [teacherProfileData, setTeacherProfileData] = useState<{
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
    name: string;
    designation: string;
    department: string;
    whatsapp: string;
    email: string;
    status: 'active' | 'inactive';
  }>({
    memberId: '',
    name: '',
    designation: 'PGT',
    department: 'Science',
    whatsapp: '',
    email: '',
    status: 'active',
  });

  const [customDesignation, setCustomDesignation] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await memberService.getAll({
        memberType: 'teacher',
        search: search.trim() || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });

      let filtered = data;
      if (selectedDepartment !== 'all') {
        filtered = filtered.filter((t) => t.department === selectedDepartment);
      }
      if (selectedDesignation !== 'all') {
        filtered = filtered.filter((t) => {
          const des = (t.designation || '').trim().toUpperCase();
          if (selectedDesignation === 'Others') {
            return !['PGT', 'TGT', 'PRT', 'NTT'].some((k) => des.startsWith(k));
          }
          return des.startsWith(selectedDesignation.toUpperCase()) || des.includes(selectedDesignation.toUpperCase());
        });
      }
      setTeachers(filtered);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [search, selectedDesignation, selectedDepartment, selectedStatus]);

  const handleOpenAddModal = async () => {
    setFormError('');
    setCustomDesignation('');
    try {
      const nextId = await memberService.getNextId('teacher');
      setFormData({
        memberId: nextId || 'LIB-T001',
        name: '',
        designation: 'PGT',
        department: 'Science',
        whatsapp: '',
        email: '',
        status: 'active',
      });
    } catch {
      setFormData({
        memberId: 'LIB-T001',
        name: '',
        designation: 'PGT',
        department: 'Science',
        whatsapp: '',
        email: '',
        status: 'active',
      });
    }
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (teacher: Member) => {
    setFormError('');
    setCurrentTeacher(teacher);
    const des = teacher.designation || '';
    const isStandard = ['PGT', 'TGT', 'PRT', 'NTT'].includes(des);
    
    setFormData({
      memberId: teacher.memberId,
      name: teacher.name,
      designation: isStandard ? des : 'Others',
      department: teacher.department || 'General',
      whatsapp: teacher.whatsapp,
      email: teacher.email || '',
      status: teacher.status,
    });
    setCustomDesignation(isStandard ? '' : des);
    setIsEditModalOpen(true);
  };

  const handleOpenProfileModal = async (teacher: Member) => {
    try {
      setCurrentTeacher(teacher);
      setIsProfileModalOpen(true);
      const profile = await memberService.getById(teacher._id);
      setTeacherProfileData(profile);
    } catch (err) {
      console.error('Failed to load teacher profile:', err);
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
      remarks: 'Settled by faculty member',
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
        text: `Fee record updated successfully!`,
      });

      if (currentTeacher) {
        const updated = await memberService.getById(currentTeacher._id);
        setTeacherProfileData(updated);
      }
      fetchTeachers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update fee record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Teacher / Staff Name is required.');
      return;
    }
    if (!formData.whatsapp.trim()) {
      setFormError('WhatsApp / Phone number is required.');
      return;
    }
    if (!formData.memberId.trim()) {
      setFormError('Teacher Staff ID is required.');
      return;
    }

    const effectiveDesignation =
      formData.designation === 'Others'
        ? customDesignation.trim() || 'Others'
        : formData.designation;

    try {
      setSubmitting(true);
      setFormError('');
      await memberService.create({
        ...formData,
        designation: effectiveDesignation,
        memberType: 'teacher',
        className: 'Staff',
        section: formData.department,
      });
      setIsAddModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: `Teacher ${formData.name} (${formData.memberId}) registered successfully!`,
      });
      fetchTeachers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to register teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacher) return;

    if (!formData.name.trim() || !formData.whatsapp.trim() || !formData.memberId.trim()) {
      setFormError('Name, Staff ID, and WhatsApp number are required.');
      return;
    }

    const effectiveDesignation =
      formData.designation === 'Others'
        ? customDesignation.trim() || 'Others'
        : formData.designation;

    try {
      setSubmitting(true);
      setFormError('');
      await memberService.update(currentTeacher._id, {
        ...formData,
        designation: effectiveDesignation,
        memberType: 'teacher',
        className: 'Staff',
        section: formData.department,
      });
      setIsEditModalOpen(false);
      setFeedbackMessage({ type: 'success', text: `Teacher ${formData.name} updated successfully!` });
      fetchTeachers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update teacher profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (teacher: Member) => {
    if ((teacher.assignedBooksCount || 0) > 0) {
      alert(`Cannot delete ${teacher.name}: Faculty member currently has ${teacher.assignedBooksCount} active borrowed book(s).`);
      return;
    }

    const confirm = window.confirm(`Are you sure you want to remove teacher ${teacher.name} (${teacher.memberId})?`);
    if (!confirm) return;

    try {
      const res = await memberService.delete(teacher._id);
      setFeedbackMessage({ type: 'success', text: res.message || 'Teacher record removed.' });
      fetchTeachers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete teacher.');
    }
  };

  const departmentList = ['Science', 'Mathematics', 'Languages', 'Social Studies', 'Commerce', 'Computer Science', 'Sports & Arts', 'Administration'];

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
      )}

      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <span>Teachers & Faculty Directory</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage faculty library memberships with staff ID, designation, department, and borrowing records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="bulk-import-teachers-btn"
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel Import</span>
            </button>

            <button
              id="add-teacher-btn"
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Teacher</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="search-teachers-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Teacher Name, Staff ID..."
              className="w-full pl-8.5 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              id="filter-teacher-designation"
              value={selectedDesignation}
              onChange={(e) => setSelectedDesignation(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Designations</option>
              <option value="PGT">PGT</option>
              <option value="TGT">TGT</option>
              <option value="PRT">PRT</option>
              <option value="NTT">NTT</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div>
            <select
              id="filter-teacher-department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departmentList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              id="filter-teacher-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Faculty</option>
              <option value="inactive">Inactive / On Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading teachers list...</div>
      ) : teachers.length === 0 ? (
        <EmptyState
          title="No Teachers Found"
          description="Register faculty members or adjust your search filters."
          actionText="Add Teacher"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">Teacher Name & Staff ID</th>
                  <th className="py-3.5 px-3">Designation & Department</th>
                  <th className="py-3.5 px-3">Contact WhatsApp</th>
                  <th className="py-3.5 px-3">Active Books</th>
                  <th className="py-3.5 px-3">Pending Fine</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {teachers.map((teacher) => (
                  <tr key={teacher._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Teacher Name & Staff ID */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{teacher.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[11px]">
                          Staff ID: {teacher.memberId}
                        </span>
                      </div>
                    </td>

                    {/* Designation & Department */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800">
                        {teacher.designation || 'Faculty Member'}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{teacher.department || 'Academics'}</span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 text-slate-800 font-medium">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{teacher.whatsapp}</span>
                      </div>
                      {teacher.email && (
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {teacher.email}
                        </div>
                      )}
                    </td>

                    {/* Active Books */}
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-slate-900">{teacher.assignedBooksCount || 0}</span>
                      {teacher.overdueBooksCount ? (
                        <span className="ml-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {teacher.overdueBooksCount} Overdue
                        </span>
                      ) : null}
                    </td>

                    {/* Pending Fine */}
                    <td className="py-3.5 px-3">
                      {(teacher.pendingFine || 0) > 0 ? (
                        <span className="font-bold text-rose-600">
                          {formatCurrency(teacher.pendingFine || 0)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">₹0</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <Badge variant={teacher.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {teacher.status.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`teacher-profile-btn-${teacher._id}`}
                          type="button"
                          onClick={() => handleOpenProfileModal(teacher)}
                          title="View Library Profile & History"
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Profile & History
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(teacher)}
                          title="Edit Teacher"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(teacher)}
                          title="Delete Teacher"
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

      {/* ADD TEACHER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Teacher / Staff Member"
        subtitle="Register faculty member in the school library database"
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
                Teacher / Staff ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-teacher-id"
                type="text"
                required
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value.toUpperCase() })}
                placeholder="e.g. LIB-T001"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-indigo-700 focus:outline-hidden focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Auto-generated, unique Staff ID</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teacher Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-teacher-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dr. Rajesh Mehra"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation / Role <span className="text-rose-500">*</span>
              </label>
              <select
                id="add-teacher-designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="PGT">PGT (Post Graduate Teacher)</option>
                <option value="TGT">TGT (Trained Graduate Teacher)</option>
                <option value="PRT">PRT (Primary Teacher)</option>
                <option value="NTT">NTT (Nursery Teacher Training)</option>
                <option value="Others">Others / Custom</option>
              </select>
              {formData.designation === 'Others' && (
                <input
                  id="add-teacher-custom-designation"
                  type="text"
                  required
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  placeholder="Specify other designation (e.g. Principal, Lab Assistant)..."
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 animate-in fade-in-50 duration-150"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                id="add-teacher-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                {departmentList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp / Mobile <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-teacher-whatsapp"
                type="text"
                required
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                id="add-teacher-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. teacher@school.edu"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
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
              id="save-teacher-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Registering...' : 'Register Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT TEACHER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Teacher Information"
        subtitle={`Editing details for: ${currentTeacher?.name}`}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Staff ID</label>
              <input
                id="edit-teacher-id"
                type="text"
                required
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-indigo-700 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher Full Name</label>
              <input
                id="edit-teacher-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation / Role <span className="text-rose-500">*</span>
              </label>
              <select
                id="edit-teacher-designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="PGT">PGT (Post Graduate Teacher)</option>
                <option value="TGT">TGT (Trained Graduate Teacher)</option>
                <option value="PRT">PRT (Primary Teacher)</option>
                <option value="NTT">NTT (Nursery Teacher Training)</option>
                <option value="Others">Others / Custom</option>
              </select>
              {formData.designation === 'Others' && (
                <input
                  id="edit-teacher-custom-designation"
                  type="text"
                  required
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  placeholder="Specify other designation (e.g. Principal, Lab Assistant)..."
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 animate-in fade-in-50 duration-150"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                id="edit-teacher-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                {departmentList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp</label>
              <input
                id="edit-teacher-whatsapp"
                type="text"
                required
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                id="edit-teacher-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              id="edit-teacher-status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="active">Active (Can borrow books)</option>
              <option value="inactive">Inactive / On Leave</option>
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
              id="save-edit-teacher-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Update Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* TEACHER PROFILE & HISTORY MODAL */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Teacher Library Profile & History"
        subtitle="Complete overview of current faculty book issues and borrowing history"
        maxWidth="2xl"
      >
        {teacherProfileData.member && (
          <div className="space-y-6">
            {/* ID Card Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-slate-50 to-purple-50 border border-indigo-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-indigo-600/30">
                    {teacherProfileData.member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {teacherProfileData.member.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-600">
                      <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                        {teacherProfileData.member.memberId}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-800">
                        {teacherProfileData.member.designation || 'Teacher'}
                      </span>
                      <span>•</span>
                      <span>
                        Dept: {teacherProfileData.member.department || 'Academics'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Badge variant={teacherProfileData.member.status === 'active' ? 'success' : 'neutral'}>
                    {teacherProfileData.member.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-indigo-200/50 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp</span>
                  <span className="font-medium text-slate-800">{teacherProfileData.member.whatsapp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {teacherProfileData.member.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Joined On</span>
                  <span className="font-medium text-slate-800">
                    {teacherProfileData.member.createdAt
                      ? new Date(teacherProfileData.member.createdAt).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Currently Assigned Books */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Currently Assigned Books ({teacherProfileData.currentlyAssigned.length})</span>
                </h4>
              </div>

              {teacherProfileData.currentlyAssigned.length > 0 ? (
                <div className="space-y-2">
                  {teacherProfileData.currentlyAssigned.map((item: any) => (
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
                  <span>Borrowing History & Returned Books ({teacherProfileData.previousHistory.length})</span>
                </h4>
              </div>

              {teacherProfileData.previousHistory.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {teacherProfileData.previousHistory.map((item: any) => (
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
        subtitle="Record fine payment from teacher or waive overdue penalties"
        maxWidth="md"
      >
        <form onSubmit={handleCollectFeeSubmit} className="space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-amber-900 font-bold">
              <span>Book: {selectedAssignmentForFee?.book?.title}</span>
            </div>
            <div className="text-[11px] text-amber-800">
              Fine calculated for overdue faculty loan.
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
                  id="collect-teacher-fee-amount"
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
                id="collect-teacher-fee-method"
                value={feeForm.paymentMethod}
                onChange={(e) => setFeeForm({ ...feeForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-amber-500"
              >
                <option value="Cash">Cash at Counter</option>
                <option value="UPI / QR">UPI / QR Payment</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Salary Deduct">Deducted from Faculty Payroll</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt / Ref No.</label>
              <input
                id="collect-teacher-fee-receipt"
                type="text"
                value={feeForm.receiptNo}
                onChange={(e) => setFeeForm({ ...feeForm, receiptNo: e.target.value })}
                placeholder="e.g. REC-55412"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
              <input
                id="collect-teacher-fee-remarks"
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
              id="confirm-collect-teacher-fee-btn"
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
        memberType="teacher"
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={(count) => {
          fetchTeachers();
          setFeedbackMessage({
            type: 'success',
            text: `Successfully imported ${count} teachers/faculty members into directory!`,
          });
        }}
      />
    </div>
  );
};
