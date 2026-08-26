import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  UserCheck,
  Edit2,
  Trash2,
  BookOpen,
  History,
  Calendar,
  AlertCircle,
  IndianRupee,
  CheckCircle2,
  X,
  Phone,
  Mail,
  GraduationCap,
  FileSpreadsheet,
} from 'lucide-react';
import { memberService } from '../../services/api';
import { Member, Assignment } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { BulkImportMembersModal } from '../../components/BulkImportMembersModal';
import { useSettings } from '../../context/SettingsContext';

export const MembersPage: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [importMemberType, setImportMemberType] = useState<'student' | 'teacher'>('student');

  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [memberProfileData, setMemberProfileData] = useState<{
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
    whatsapp: string;
    email: string;
    className: string;
    section: string;
    status: 'active' | 'inactive';
  }>({
    memberId: '',
    name: '',
    whatsapp: '',
    email: '',
    className: '',
    section: '',
    status: 'active',
  });

  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await memberService.getAll({
        search: search.trim() || undefined,
        className: selectedClass !== 'all' ? selectedClass : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search, selectedClass, selectedStatus]);

  const handleOpenAddModal = async () => {
    setFormError('');
    try {
      const nextId = await memberService.getNextId();
      setFormData({
        memberId: nextId || 'LIB-0001',
        name: '',
        whatsapp: '',
        email: '',
        className: 'Class 10',
        section: 'A',
        status: 'active',
      });
    } catch {
      setFormData({
        memberId: 'LIB-0001',
        name: '',
        whatsapp: '',
        email: '',
        className: '',
        section: '',
        status: 'active',
      });
    }
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (member: Member) => {
    setFormError('');
    setCurrentMember(member);
    setFormData({
      memberId: member.memberId,
      name: member.name,
      whatsapp: member.whatsapp,
      email: member.email || '',
      className: member.className || '',
      section: member.section || '',
      status: member.status,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenProfileModal = async (member: Member) => {
    try {
      setCurrentMember(member);
      setIsProfileModalOpen(true);
      const profile = await memberService.getById(member._id);
      setMemberProfileData(profile);
    } catch (err) {
      console.error('Failed to load member profile:', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Student Name is required.');
      return;
    }
    if (!formData.whatsapp.trim()) {
      setFormError('WhatsApp / Phone number is required.');
      return;
    }
    if (!formData.memberId.trim()) {
      setFormError('Member ID is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await memberService.create(formData);
      setIsAddModalOpen(false);
      setFeedbackMessage({ type: 'success', text: `Student ${formData.name} (${formData.memberId}) registered successfully!` });
      fetchMembers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to register student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) return;

    if (!formData.name.trim() || !formData.whatsapp.trim() || !formData.memberId.trim()) {
      setFormError('Name, Member ID and WhatsApp number are required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await memberService.update(currentMember._id, formData);
      setIsEditModalOpen(false);
      setFeedbackMessage({ type: 'success', text: `Member ${formData.name} updated successfully!` });
      fetchMembers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if ((member.assignedBooksCount || 0) > 0) {
      alert(`Cannot delete ${member.name}: Student currently has ${member.assignedBooksCount} active borrowed book(s).`);
      return;
    }

    const confirm = window.confirm(`Are you sure you want to remove or deactivate student member ${member.name} (${member.memberId})?`);
    if (!confirm) return;

    try {
      const res = await memberService.delete(member._id);
      setFeedbackMessage({ type: 'success', text: res.message || 'Student member removed.' });
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete member.');
    }
  };

  // Distinct classes for filter
  const classOptions = Array.from(new Set(members.map((m) => m.className).filter(Boolean))).sort();

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Alert */}
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
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Student & Member Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage student library cards, track borrowed books, overdue issues, and penalty balances
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="bulk-import-students-btn"
              type="button"
              onClick={() => {
                setImportMemberType('student');
                setIsBulkImportOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
              title="Bulk import student records from Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import Students</span>
            </button>

            <button
              id="bulk-import-teachers-btn"
              type="button"
              onClick={() => {
                setImportMemberType('teacher');
                setIsBulkImportOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
              title="Bulk import teacher/faculty records from Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              <span>Import Teachers</span>
            </button>

            <button
              id="add-member-btn"
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-blue-600/20 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Register Member</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="member-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, ID, phone, email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              id="member-class-filter"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Classes & Grades</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="member-status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Membership Status</option>
              <option value="active">Active Members</option>
              <option value="inactive">Inactive Members</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2.5 text-xs font-medium">Fetching students list...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="p-6">
            <EmptyState
              id="empty-members"
              icon={Users}
              title="No students or members found"
              description={
                search || selectedClass !== 'all' || selectedStatus !== 'all'
                  ? 'No students matched your search filters.'
                  : 'Register student members to start assigning library books.'
              }
              actionLabel={
                search || selectedClass !== 'all' || selectedStatus !== 'all'
                  ? 'Clear Search'
                  : 'Register Student'
              }
              onAction={
                search || selectedClass !== 'all' || selectedStatus !== 'all'
                  ? () => {
                      setSearch('');
                      setSelectedClass('all');
                      setSelectedStatus('all');
                    }
                  : handleOpenAddModal
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Member ID</th>
                  <th className="py-3.5 px-3">Student Name</th>
                  <th className="py-3.5 px-3">Class & Section</th>
                  <th className="py-3.5 px-3">WhatsApp / Phone</th>
                  <th className="py-3.5 px-3 text-center">Assigned</th>
                  <th className="py-3.5 px-3 text-center">Overdue</th>
                  <th className="py-3.5 px-3 text-center">Pending Fine</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {members.map((member) => (
                  <tr key={member._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {member.memberId}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div
                        onClick={() => handleOpenProfileModal(member)}
                        className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer transition-colors"
                      >
                        {member.name}
                      </div>
                      {member.email && (
                        <div className="text-[11px] text-slate-400 truncate">{member.email}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {member.className ? (
                        <span className="font-medium text-slate-800">
                          {member.className} {member.section ? `(${member.section})` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-medium text-slate-600">
                      {member.whatsapp}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-blue-50 text-blue-700">
                        {member.assignedBooksCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {(member.overdueBooksCount || 0) > 0 ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200">
                          {member.overdueBooksCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {(member.pendingFine || 0) > 0 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {formatCurrency(member.pendingFine || 0)}
                        </span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {member.status === 'active' ? (
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Inactive
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`profile-member-${member._id}`}
                          type="button"
                          onClick={() => handleOpenProfileModal(member)}
                          title="View Student Library History & Profile"
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          Profile
                        </button>
                        <button
                          id={`edit-member-${member._id}`}
                          type="button"
                          onClick={() => handleOpenEditModal(member)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-member-${member._id}`}
                          type="button"
                          onClick={() => handleDeleteMember(member)}
                          title="Delete / Deactivate"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
        )}
      </div>

      {/* ADD MEMBER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Student Member"
        subtitle="Create a unique library card profile for a student"
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
                Unique Member ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-member-id"
                type="text"
                required
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value.toUpperCase() })}
                placeholder="e.g. LIB-0001"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-blue-700 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Auto-generated, unique ID</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-member-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp / Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-member-whatsapp"
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
                id="add-member-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. rahul@school.edu"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class / Grade (Optional)
              </label>
              <input
                id="add-member-class"
                type="text"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                placeholder="e.g. Class 10"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section (Optional)
              </label>
              <input
                id="add-member-section"
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="e.g. A"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-add-member-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Registering...' : 'Register Student Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MEMBER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Member Information"
        subtitle={`Editing profile for: ${currentMember?.name}`}
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
                Member ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-member-id"
                type="text"
                required
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-blue-700 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-member-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp</label>
              <input
                id="edit-member-whatsapp"
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
                id="edit-member-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
              <input
                id="edit-member-class"
                type="text"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
              <input
                id="edit-member-section"
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              id="edit-member-status"
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-edit-member-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Update Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MEMBER PROFILE & LIBRARY HISTORY MODAL */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Student Library Profile & History"
        subtitle="Complete overview of current book issues and past circulation history"
        maxWidth="2xl"
      >
        {memberProfileData.member && (
          <div className="space-y-6">
            {/* Student ID Card Banner */}
            <div className="p-4 rounded-2xl bg-linear-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-blue-600/30">
                    {memberProfileData.member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {memberProfileData.member.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                      <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.2 rounded border border-blue-200">
                        {memberProfileData.member.memberId}
                      </span>
                      <span>•</span>
                      <span>
                        {memberProfileData.member.className || 'Class N/A'}{' '}
                        {memberProfileData.member.section ? `(${memberProfileData.member.section})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Badge
                    variant={memberProfileData.member.status === 'active' ? 'success' : 'neutral'}
                  >
                    {memberProfileData.member.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-blue-200/50 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp</span>
                  <span className="font-medium text-slate-800">{memberProfileData.member.whatsapp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {memberProfileData.member.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Joined On</span>
                  <span className="font-medium text-slate-800">
                    {memberProfileData.member.createdAt
                      ? new Date(memberProfileData.member.createdAt).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Currently Assigned Section */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Currently Assigned Books ({memberProfileData.currentlyAssigned.length})</span>
                </h4>
              </div>

              {memberProfileData.currentlyAssigned.length > 0 ? (
                <div className="space-y-2">
                  {memberProfileData.currentlyAssigned.map((item: any) => (
                    <div
                      key={item._id}
                      className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.isOverdue
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[10px]">
                            {item.accessionNumber || item.book?.accessionNumber || 'N/A'}
                          </span>
                          {item.copyNumber && (
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1 py-0.2 rounded font-medium">
                              Copy #{item.copyNumber}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900">{item.book?.title || 'Book'}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Author: {item.book?.author} • Issued:{' '}
                          {new Date(item.assignedDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-500">
                            Due: <strong>{new Date(item.dueDate).toLocaleDateString()}</strong>
                          </div>
                          {item.isOverdue && item.liveFine > 0 && (
                            <span className="text-[11px] font-bold text-rose-700">
                              Fine: {formatCurrency(item.liveFine)} ({item.lateDays} days late)
                            </span>
                          )}
                        </div>

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
                  <span>Borrowing History & Returned Books ({memberProfileData.previousHistory.length})</span>
                </h4>
              </div>

              {memberProfileData.previousHistory.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {memberProfileData.previousHistory.map((item: any) => (
                    <div
                      key={item._id}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                            {item.accessionNumber || item.book?.accessionNumber || 'N/A'}
                          </span>
                          {item.copyNumber && (
                            <span className="text-[10px] text-slate-500 bg-slate-200/60 px-1 py-0.2 rounded font-medium">
                              Copy #{item.copyNumber}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-900">{item.book?.title || 'Book'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Issued: {new Date(item.assignedDate).toLocaleDateString()} → Returned:{' '}
                          {item.returnedDate ? new Date(item.returnedDate).toLocaleDateString() : '—'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.fineAmount > 0 && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.fineStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Fine: {formatCurrency(item.fineAmount)} ({item.fineStatus})
                          </span>
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

      {/* Bulk Import Excel Modal */}
      <BulkImportMembersModal
        isOpen={isBulkImportOpen}
        memberType={importMemberType}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={(count) => {
          fetchMembers();
          setFeedbackMessage({
            type: 'success',
            text: `Successfully imported ${count} ${importMemberType === 'teacher' ? 'teachers/faculty' : 'students'} from Excel into directory!`,
          });
        }}
      />
    </div>
  );
};
