import React, { useState, useEffect } from 'react';
import {
  Settings,
  Layers,
  Save,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  BookOpen,
  DollarSign,
  Calendar,
  Building,
  Database,
  Sparkles,
  Tag,
  ShieldCheck,
  AlertTriangle,
  Users,
  ExternalLink,
  BookCheck,
  ArrowRight,
  Clock,
  Calculator,
  History,
  CalendarDays,
  Check,
  HelpCircle,
  Info,
  Search,
  LayoutGrid,
  List,
  PlusCircle,
  Filter,
  FolderPlus,
  SlidersHorizontal,
  BookMarked,
  Hash,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { categoryService, settingService } from '../../services/api';
import { BookCategory, CheckLimitResult, ViolatingMember, FineRule } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { calculateClientFineBreakdown } from '../../utils/fineCalculator';

interface SettingsPageProps {
  onNavigateTab?: (tab: string, filters?: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigateTab }) => {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'categories'>('general');
  const [seedingData, setSeedingData] = useState<boolean>(false);

  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // General Settings Form
  const [generalForm, setGeneralForm] = useState<{
    libraryName: string;
    schoolName: string;
    finePerDay: number;
    fineEffectiveDate: string;
    fineRules: FineRule[];
    issueDuration: number;
    maxBooksPerMember: number;
    accessionPrefix: string;
    accessionStartNumber: number | string;
    accessionPadding: number;
    accessionSeparator: string;
    currency: string;
    contactEmail: string;
    contactPhone: string;
  }>({
    libraryName: '',
    schoolName: '',
    finePerDay: 2,
    fineEffectiveDate: getTodayStr(),
    fineRules: [],
    issueDuration: 14,
    maxBooksPerMember: 3,
    accessionPrefix: 'ACC',
    accessionStartNumber: 1,
    accessionPadding: 4,
    accessionSeparator: '-',
    currency: '₹',
    contactEmail: '',
    contactPhone: '',
  });

  // Fine Rule Schedule Modal State
  const [isAddFineRuleModalOpen, setIsAddFineRuleModalOpen] = useState<boolean>(false);
  const [newFineRuleForm, setNewFineRuleForm] = useState<{
    effectiveDate: string;
    finePerDay: number;
    note: string;
  }>({
    effectiveDate: getTodayStr(),
    finePerDay: 5,
    note: '',
  });

  // Live Fine Calculation Simulator State
  const [simDueDate, setSimDueDate] = useState<string>(getPastDateStr(9));
  const [simTargetDate, setSimTargetDate] = useState<string>(getTodayStr());
  const [simResult, setSimResult] = useState<any>(null);

  // Category Master State
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState<boolean>(false);
  const [currentCategory, setCurrentCategory] = useState<BookCategory | null>(null);

  // Category UX & Filtering State
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'active' | 'inactive' | 'has_sub' | 'no_sub'>('all');
  const [categoryViewMode, setCategoryViewMode] = useState<'table' | 'cards'>('table');
  const [isManageSubModalOpen, setIsManageSubModalOpen] = useState<boolean>(false);
  const [selectedCategoryForSubManage, setSelectedCategoryForSubManage] = useState<BookCategory | null>(null);
  const [manageSubInput, setManageSubInput] = useState<string>('');
  const [inlineAddingCatId, setInlineAddingCatId] = useState<string | null>(null);
  const [inlineSubInput, setInlineSubInput] = useState<string>('');

  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    description: string;
    subCategories: string[];
    isActive: boolean;
  }>({
    name: '',
    description: '',
    subCategories: [],
    isActive: true,
  });

  const [newSubCatInput, setNewSubCatInput] = useState<string>('');

  const [formError, setFormError] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [submittingCategory, setSubmittingCategory] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Limit Violation State & Modal
  const [isLimitViolationModalOpen, setIsLimitViolationModalOpen] = useState<boolean>(false);
  const [limitViolationData, setLimitViolationData] = useState<CheckLimitResult | null>(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      const effDate = settings.fineEffectiveDate
        ? new Date(settings.fineEffectiveDate).toISOString().split('T')[0]
        : getTodayStr();

      const startNumStr =
        settings.accessionPadding && settings.accessionStartNumber !== undefined
          ? String(settings.accessionStartNumber).padStart(settings.accessionPadding, '0')
          : settings.accessionStartNumber !== undefined
          ? String(settings.accessionStartNumber)
          : '0001';

      setGeneralForm({
        libraryName: settings.libraryName || 'School Central Library',
        schoolName: settings.schoolName || 'International Public School',
        finePerDay: settings.finePerDay ?? 2,
        fineEffectiveDate: effDate,
        fineRules: settings.fineRules && settings.fineRules.length > 0 ? [...settings.fineRules] : [],
        issueDuration: settings.issueDuration ?? 14,
        maxBooksPerMember: settings.maxBooksPerMember ?? 3,
        accessionPrefix: settings.accessionPrefix || 'ACC',
        accessionStartNumber: startNumStr,
        accessionPadding: settings.accessionPadding ?? (startNumStr.length || 4),
        accessionSeparator: settings.accessionSeparator !== undefined ? settings.accessionSeparator : '-',
        currency: settings.currency || '₹',
        contactEmail: settings.contactEmail || 'library@school.edu',
        contactPhone: settings.contactPhone || '+91 98765 43210',
      });
    }
  }, [settings]);

  // Recalculate Simulator Output whenever rules or dates change
  useEffect(() => {
    if (simDueDate && simTargetDate) {
      const preview = calculateClientFineBreakdown(simDueDate, simTargetDate, {
        finePerDay: generalForm.finePerDay,
        fineRules: generalForm.fineRules,
      });
      setSimResult(preview);
    } else {
      setSimResult(null);
    }
  }, [simDueDate, simTargetDate, generalForm.finePerDay, generalForm.fineRules]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await categoryService.getAll(true);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    }
  }, [activeTab]);

  const handleManualCheckLimit = async () => {
    try {
      setIsCheckingLimit(true);
      const res = await settingService.checkMaxBooksLimit(generalForm.maxBooksPerMember);
      if (!res.allowed && res.violatingMembers && res.violatingMembers.length > 0) {
        setLimitViolationData(res);
        setIsLimitViolationModalOpen(true);
      } else {
        setFeedbackMessage({
          type: 'success',
          text: `Verified! No members currently have more than ${generalForm.maxBooksPerMember} books assigned. Limit can be safely set.`,
        });
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to check limit.');
    } finally {
      setIsCheckingLimit(false);
    }
  };

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setFormError('');

      // Pre-check borrowing limit before submitting
      const targetMax = generalForm.maxBooksPerMember;
      const checkRes = await settingService.checkMaxBooksLimit(targetMax);

      if (!checkRes.allowed && checkRes.violatingMembers && checkRes.violatingMembers.length > 0) {
        setLimitViolationData(checkRes);
        setIsLimitViolationModalOpen(true);
        setFormError(
          `Cannot reduce Maximum Books Limit to ${targetMax}: ${checkRes.violatingMembers.length} member(s) currently hold more than ${targetMax} books. Please ensure these books are returned first.`
        );
        setSavingSettings(false);
        return;
      }

      const startNumStr = String(generalForm.accessionStartNumber || '0');
      const parsedStart = Math.max(0, parseInt(startNumStr, 10) || 0);
      const padLen = Math.max(1, startNumStr.length);

      const payload = {
        ...generalForm,
        accessionStartNumber: parsedStart,
        accessionPadding: padLen,
      };
      await updateSettings(payload);
      setFeedbackMessage({
        type: 'success',
        text: `Library configuration updated! Max book limit set to ${generalForm.maxBooksPerMember} books per member.`,
      });
    } catch (err: any) {
      if (err.response?.data?.violatingMembers) {
        setLimitViolationData(err.response.data);
        setIsLimitViolationModalOpen(true);
      }
      setFormError(err.response?.data?.message || 'Failed to update library settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRevertToCurrentLimit = () => {
    if (settings) {
      setGeneralForm((prev) => ({
        ...prev,
        maxBooksPerMember: settings.maxBooksPerMember || 3,
      }));
    }
    setIsLimitViolationModalOpen(false);
    setFormError('');
  };

  const handleGoToMemberCirculation = (member: ViolatingMember) => {
    setIsLimitViolationModalOpen(false);
    if (onNavigateTab) {
      onNavigateTab('assignments', { search: member.name || member.memberCode });
    }
  };

  const handleSeedData = async () => {
    if (
      !window.confirm(
        'Would you like to seed/refresh the database with comprehensive sample library books, student members, categories, and circulation records?'
      )
    ) {
      return;
    }
    try {
      setSeedingData(true);
      setFormError('');
      const res = await settingService.seedSampleData();
      await refreshSettings();
      await fetchCategories();
      setFeedbackMessage({ type: 'success', text: res.message || 'Extensive demo dataset seeded successfully!' });
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to seed sample dataset.');
    } finally {
      setSeedingData(false);
    }
  };

  const handleOpenAddCategory = () => {
    setFormError('');
    setNewSubCatInput('');
    setCategoryForm({
      name: '',
      description: '',
      subCategories: [],
      isActive: true,
    });
    setIsAddCategoryOpen(true);
  };

  const handleOpenEditCategory = (cat: BookCategory) => {
    setFormError('');
    setNewSubCatInput('');
    setCurrentCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      subCategories: Array.isArray(cat.subCategories) ? [...cat.subCategories] : [],
      isActive: cat.isActive,
    });
    setIsEditCategoryOpen(true);
  };

  const handleOpenManageSubModal = (cat: BookCategory) => {
    setSelectedCategoryForSubManage(cat);
    setManageSubInput('');
    setFormError('');
    setIsManageSubModalOpen(true);
  };

  const handleQuickAddSubToCategory = async (cat: BookCategory, subName: string) => {
    const trimmed = subName.trim();
    if (!trimmed) return;

    const existing = Array.isArray(cat.subCategories) ? cat.subCategories : [];
    if (existing.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setFeedbackMessage({ type: 'error', text: `Sub-category "${trimmed}" already exists in ${cat.name}.` });
      return;
    }

    const updatedSubList = [...existing, trimmed];
    try {
      const updatedCat = await categoryService.update(cat._id, {
        name: cat.name,
        description: cat.description,
        subCategories: updatedSubList,
        isActive: cat.isActive,
      });

      // Update in local state
      setCategories((prev) => prev.map((c) => (c._id === cat._id ? updatedCat : c)));
      if (selectedCategoryForSubManage?._id === cat._id) {
        setSelectedCategoryForSubManage(updatedCat);
      }
      setFeedbackMessage({ type: 'success', text: `Added "${trimmed}" to ${cat.name}` });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add sub-category.' });
    }
  };

  const handleQuickRemoveSubFromCategory = async (cat: BookCategory, subNameToRemove: string) => {
    const existing = Array.isArray(cat.subCategories) ? cat.subCategories : [];
    const updatedSubList = existing.filter((s) => s !== subNameToRemove);

    try {
      const updatedCat = await categoryService.update(cat._id, {
        name: cat.name,
        description: cat.description,
        subCategories: updatedSubList,
        isActive: cat.isActive,
      });

      // Update in local state
      setCategories((prev) => prev.map((c) => (c._id === cat._id ? updatedCat : c)));
      if (selectedCategoryForSubManage?._id === cat._id) {
        setSelectedCategoryForSubManage(updatedCat);
      }
      setFeedbackMessage({ type: 'success', text: `Removed "${subNameToRemove}" from ${cat.name}` });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.response?.data?.message || 'Failed to remove sub-category.' });
    }
  };

  const handleToggleCategoryStatus = async (cat: BookCategory) => {
    try {
      const updated = await categoryService.toggleStatus(cat._id);
      setCategories((prev) => prev.map((c) => (c._id === cat._id ? updated : c)));
      setFeedbackMessage({
        type: 'success',
        text: `Category "${cat.name}" is now ${updated.isActive ? 'Active' : 'Inactive'}.`,
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: 'Failed to update status.' });
    }
  };

  const handleInlineAddSub = async (cat: BookCategory) => {
    const trimmed = inlineSubInput.trim();
    if (!trimmed) {
      setInlineAddingCatId(null);
      return;
    }
    const parts = trimmed.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p.length > 0);
    const existing = Array.isArray(cat.subCategories) ? cat.subCategories : [];
    const merged = Array.from(new Set([...existing, ...parts]));

    try {
      const updatedCat = await categoryService.update(cat._id, {
        name: cat.name,
        description: cat.description,
        subCategories: merged,
        isActive: cat.isActive,
      });
      setCategories((prev) => prev.map((c) => (c._id === cat._id ? updatedCat : c)));
      setInlineSubInput('');
      setInlineAddingCatId(null);
      setFeedbackMessage({ type: 'success', text: `Added ${parts.length} sub-category(ies) to "${cat.name}"!` });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add sub-category.' });
    }
  };

  const handleAddSubCategoryChip = () => {
    const trimmed = newSubCatInput.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p.length > 0);
    const updated = Array.from(new Set([...categoryForm.subCategories, ...parts]));
    setCategoryForm({ ...categoryForm, subCategories: updated });
    setNewSubCatInput('');
  };

  const handleRemoveSubCategoryChip = (indexToRemove: number) => {
    const updated = categoryForm.subCategories.filter((_, idx) => idx !== indexToRemove);
    setCategoryForm({ ...categoryForm, subCategories: updated });
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    try {
      setSubmittingCategory(true);
      setFormError('');
      let finalSubCats = [...categoryForm.subCategories];
      if (newSubCatInput.trim()) {
        const parts = newSubCatInput.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p.length > 0);
        finalSubCats = Array.from(new Set([...finalSubCats, ...parts]));
      }

      await categoryService.create({
        ...categoryForm,
        subCategories: finalSubCats,
      });
      setIsAddCategoryOpen(false);
      setFeedbackMessage({ type: 'success', text: `Category "${categoryForm.name}" created successfully with ${finalSubCats.length} sub-categories!` });
      fetchCategories();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create category.');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory) return;
    if (!categoryForm.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    try {
      setSubmittingCategory(true);
      setFormError('');
      let finalSubCats = [...categoryForm.subCategories];
      if (newSubCatInput.trim()) {
        const parts = newSubCatInput.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p.length > 0);
        finalSubCats = Array.from(new Set([...finalSubCats, ...parts]));
      }

      await categoryService.update(currentCategory._id, {
        ...categoryForm,
        subCategories: finalSubCats,
      });
      setIsEditCategoryOpen(false);
      setFeedbackMessage({ type: 'success', text: `Category "${categoryForm.name}" updated successfully!` });
      fetchCategories();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update category.');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleOpenAddFineRule = () => {
    setNewFineRuleForm({
      effectiveDate: getTodayStr(),
      finePerDay: 5,
      note: 'Scheduled rate revision',
    });
    setIsAddFineRuleModalOpen(true);
  };

  const handleAddFineRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFineRuleForm.effectiveDate) {
      setFormError('Effective Date is required for the new fine rate.');
      return;
    }
    const newRule: FineRule = {
      effectiveDate: newFineRuleForm.effectiveDate,
      finePerDay: Math.max(0, Number(newFineRuleForm.finePerDay)),
      note: newFineRuleForm.note.trim() || undefined,
    };

    // Filter out duplicates on same effective date
    const updated = [
      ...generalForm.fineRules.filter(
        (r) => r.effectiveDate.split('T')[0] !== newRule.effectiveDate.split('T')[0]
      ),
      newRule,
    ].sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    setGeneralForm({
      ...generalForm,
      fineRules: updated,
      finePerDay: newRule.finePerDay,
      fineEffectiveDate: newRule.effectiveDate,
    });
    setIsAddFineRuleModalOpen(false);
  };

  const handleDeleteFineRule = (index: number) => {
    const updated = generalForm.fineRules.filter((_, idx) => idx !== index);
    setGeneralForm({
      ...generalForm,
      fineRules: updated,
    });
  };

  const handleLoadUserExampleScenario = () => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    const effective1st = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-01`;
    const prevMonthEnd = new Date(curYear, curMonth, 1);
    prevMonthEnd.setDate(prevMonthEnd.getDate() - 6);
    const yyyyPrev = prevMonthEnd.getFullYear();
    const mmPrev = String(prevMonthEnd.getMonth() + 1).padStart(2, '0');
    const ddPrev = String(prevMonthEnd.getDate()).padStart(2, '0');
    const exampleDueDate = `${yyyyPrev}-${mmPrev}-${ddPrev}`;

    const target3rd = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-03`;

    const rules: FineRule[] = [
      {
        effectiveDate: `${curYear - 1}-01-01`,
        finePerDay: 2,
        note: 'Base standard fine (₹2/day)',
      },
      {
        effectiveDate: effective1st,
        finePerDay: 5,
        note: 'Effective rate change (₹5/day)',
      },
    ];

    setGeneralForm((prev) => ({
      ...prev,
      finePerDay: 5,
      fineEffectiveDate: effective1st,
      fineRules: rules,
    }));

    setSimDueDate(exampleDueDate);
    setSimTargetDate(target3rd);
    setFeedbackMessage({
      type: 'success',
      text: 'Loaded test scenario: Rate ₹2/day before 1st, then ₹5/day from 1st onwards. Check the live calculation simulator below!',
    });
  };

  const handleDeleteCategory = async (cat: BookCategory) => {
    const confirm = window.confirm(
      `Are you sure you want to delete or deactivate category "${cat.name}"?`
    );
    if (!confirm) return;

    try {
      const res = await categoryService.delete(cat._id);
      setFeedbackMessage({ type: 'success', text: res.message || 'Category deleted.' });
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete category.');
    }
  };

  const isLimitReduced = (settings?.maxBooksPerMember || 3) > generalForm.maxBooksPerMember;

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
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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

      {/* Tabs Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Library Control & Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage fine policies, borrowing limits, school branding and Book Category Master with Sub-Categories
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            id="tab-general-settings"
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>General Rules & Policies</span>
          </button>

          <button
            id="tab-category-master"
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Book Categories & Sub-Categories</span>
          </button>
        </div>
      </div>

      {/* GENERAL RULES TAB */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <form onSubmit={handleGeneralSubmit} className="space-y-6">
            {formError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Configuration Alert:</span> {formError}
                  </div>
                </div>
                {limitViolationData && limitViolationData.violatingMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsLimitViolationModalOpen(true)}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold shrink-0 hover:bg-rose-700 cursor-pointer flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>View {limitViolationData.violatingMembers.length} Over-Limit Members</span>
                  </button>
                )}
              </div>
            )}

            {/* School & Library Branding */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>School & Library Identity</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Library Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="settings-library-name"
                    type="text"
                    required
                    value={generalForm.libraryName}
                    onChange={(e) =>
                      setGeneralForm({ ...generalForm, libraryName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School / Institute Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="settings-school-name"
                    type="text"
                    required
                    value={generalForm.schoolName}
                    onChange={(e) =>
                      setGeneralForm({ ...generalForm, schoolName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Displayed across the application sidebar, slips, and receipts
                  </p>
                </div>
              </div>
            </div>

            {/* Accession Number & Book Serial Configuration */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-purple-600" />
                  <span>Accession Number & Serial Configuration</span>
                </h3>
                <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                  <span className="text-[11px] font-bold text-slate-500">Live Preview:</span>
                  <span className="text-xs font-mono font-black text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                    {((generalForm.accessionPrefix || 'ACC').trim().toUpperCase()) +
                      (generalForm.accessionSeparator !== undefined ? generalForm.accessionSeparator : '-') +
                      (generalForm.accessionStartNumber !== '' ? generalForm.accessionStartNumber : '0')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                {/* Prefix */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Accession Prefix <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="settings-accession-prefix"
                    type="text"
                    required
                    placeholder="e.g. ACC, PCC"
                    value={generalForm.accessionPrefix}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        accessionPrefix: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-purple-900 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Prefix code (e.g. ACC, PCC, LIB)
                  </p>
                </div>

                {/* Separator / Delimiter */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Separator / Delimiter
                  </label>
                  <select
                    id="settings-accession-separator"
                    value={generalForm.accessionSeparator !== undefined ? generalForm.accessionSeparator : '-'}
                    onChange={(e) =>
                      setGeneralForm({
                        ...generalForm,
                        accessionSeparator: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-purple-500 bg-white"
                  >
                    <option value="-">Hyphen (-) e.g. {generalForm.accessionPrefix || 'PCC'}-0001</option>
                    <option value="/">Slash (/) e.g. {generalForm.accessionPrefix || 'PCC'}/0001</option>
                    <option value="_">Underscore (_) e.g. {generalForm.accessionPrefix || 'PCC'}_0001</option>
                    <option value="">None e.g. {generalForm.accessionPrefix || 'PCC'}0001</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Symbol between prefix & serial
                  </p>
                </div>

                {/* Starting Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Starting Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="settings-accession-start-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="01"
                    value={generalForm.accessionStartNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setGeneralForm({
                        ...generalForm,
                        accessionStartNumber: val,
                        accessionPadding: Math.max(1, val.length),
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format: {generalForm.accessionStartNumber || '0'} ({Math.max(1, String(generalForm.accessionStartNumber || '0').length)} digits)
                  </p>
                </div>
              </div>
            </div>

            {/* Circulation & Lending Policies */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Circulation Limits & Lending Policies</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Max Book Limit per member */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-blue-900">
                        Maximum Books Limit per Member <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                        Current: {settings?.maxBooksPerMember ?? 3}
                      </span>
                    </div>
                    <input
                      id="settings-max-books"
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={generalForm.maxBooksPerMember}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          maxBooksPerMember: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold text-blue-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-blue-700 mt-1.5 font-medium leading-relaxed">
                      Strictly limits how many active unreturned books a member can have assigned simultaneously.
                    </p>
                  </div>

                  {isLimitReduced && (
                    <div className="mt-2.5 pt-2 border-t border-blue-200/60">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reducing limit to {generalForm.maxBooksPerMember}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleManualCheckLimit}
                          disabled={isCheckingLimit}
                          className="text-blue-700 hover:text-blue-900 underline font-bold cursor-pointer"
                        >
                          {isCheckingLimit ? 'Verifying...' : 'Check Borrowers'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Issue duration */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Issue Duration (Days) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="settings-issue-duration"
                      type="number"
                      min="1"
                      required
                      value={generalForm.issueDuration}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          issueDuration: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 font-semibold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Auto-calculates standard due date when issuing books
                    </p>
                  </div>
                </div>
              </div>

              {/* DATE-TIERED FINE CONFIGURATION CARD */}
              <div className="p-4 bg-gradient-to-br from-rose-50/40 via-amber-50/30 to-orange-50/40 border border-amber-200/80 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      ₹
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Date-Tiered Late Fine Rates (Active & Effective Dates)</span>
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                          Live Slabs
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Overdue fine is calculated proportionally by date ranges (e.g. ₹2/day before 1 Aug, ₹5/day from 1 Aug).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadUserExampleScenario}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                      title="Load example: ₹2/day before 1st, ₹5/day from 1st onwards"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Test Preset (₹2 → ₹5 on 1st)</span>
                    </button>

                    <button
                      id="add-fine-rule-btn"
                      type="button"
                      onClick={handleOpenAddFineRule}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Schedule New Rate</span>
                    </button>
                  </div>
                </div>

                {/* Primary Active Fine Input + Effective From Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-amber-200/60 shadow-2xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Current Default Fine Rate (₹ per Day) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        id="settings-fine-per-day"
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={generalForm.finePerDay}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            finePerDay: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-rose-500 font-bold text-rose-700"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Base rate applied when no custom schedule applies
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                      <span>Effective From Date</span>
                    </label>
                    <input
                      id="settings-fine-effective-date"
                      type="date"
                      value={generalForm.fineEffectiveDate}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          fineEffectiveDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 font-medium text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Date from which new fine rate applies to overdue days
                    </p>
                  </div>
                </div>

                {/* SCHEDULED FINE RULES TABLE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-purple-600" />
                      <span>Effective Fine Rate Schedule & Slabs History</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {generalForm.fineRules.length} scheduled rate slab(s)
                    </span>
                  </div>

                  {generalForm.fineRules.length === 0 ? (
                    <div className="p-3 bg-white/80 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                      <span>No custom date slabs added yet. Fine will be charged uniformly at ₹{generalForm.finePerDay}/day. Click </span>
                      <button
                        type="button"
                        onClick={handleOpenAddFineRule}
                        className="text-rose-600 font-bold underline hover:text-rose-700 cursor-pointer"
                      >
                        Schedule New Rate
                      </button>
                      <span> to add an effective-date slab (e.g. ₹5/day starting from 1st Aug).</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold">
                            <th className="py-2.5 px-3">Effective Date</th>
                            <th className="py-2.5 px-3">Fine Rate / Day</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Note / Reason</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {generalForm.fineRules.map((rule, idx) => {
                            const ruleDate = new Date(rule.effectiveDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isFuture = ruleDate.getTime() > today.getTime();
                            const isPastOrToday = !isFuture;

                            return (
                              <tr key={idx} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{new Date(rule.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-rose-700">
                                  ₹{rule.finePerDay} <span className="text-[10px] font-normal text-slate-400">/ day</span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {isFuture ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                      Upcoming
                                    </span>
                                  ) : idx === generalForm.fineRules.length - 1 ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      Active Now
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                      Historical
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                  {rule.note || <span className="text-slate-400 italic">—</span>}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFineRule(idx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete rule"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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

                {/* LIVE FINE CALCULATION SIMULATOR & BREAKDOWN TESTER */}
                <div className="p-3.5 bg-white rounded-xl border border-blue-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <span>Interactive Fine Calculation Simulator</span>
                    </div>
                    <span className="text-[10px] text-blue-700 bg-blue-50 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      Live Verification Tool
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Test Due Date:
                      </label>
                      <input
                        type="date"
                        value={simDueDate}
                        onChange={(e) => setSimDueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Test Return / Calculation Date:
                      </label>
                      <input
                        type="date"
                        value={simTargetDate}
                        onChange={(e) => setSimTargetDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Simulator Breakdown Output */}
                  {simResult && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">
                          Total Overdue: <strong className="text-slate-900">{simResult.lateDays} Days</strong>
                        </span>
                        <span className="font-extrabold text-rose-700 text-sm">
                          Total Fine: ₹{simResult.fineAmount}
                        </span>
                      </div>

                      {simResult.breakdown && simResult.breakdown.length > 0 ? (
                        <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                          <div className="text-[11px] font-bold text-slate-700">Detailed Slabs Breakdown:</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {simResult.breakdown.map((b: any, bIdx: number) => (
                              <div
                                key={bIdx}
                                className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800">
                                    {new Date(b.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – {new Date(b.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  </span>
                                  <span className="text-slate-500 block text-[10px]">
                                    {b.days} day(s) @ ₹{b.ratePerDay}/day
                                  </span>
                                </div>
                                <span className="font-bold text-rose-600 text-xs">
                                  ₹{b.amount}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-700 font-medium">
                          No overdue days! The book is returned within the due date.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contacts & Currency */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Contact Details & Currency</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Library Helpdesk Email
                  </label>
                  <input
                    type="email"
                    value={generalForm.contactEmail}
                    onChange={(e) =>
                      setGeneralForm({ ...generalForm, contactEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Library Contact Phone
                  </label>
                  <input
                    type="text"
                    value={generalForm.contactPhone}
                    onChange={(e) =>
                      setGeneralForm({ ...generalForm, contactPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={generalForm.currency}
                    onChange={(e) =>
                      setGeneralForm({ ...generalForm, currency: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                id="save-settings-btn"
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Saving Settings...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>

          {/* DEMO DATA SEEDING CARD */}
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border border-blue-200/80 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Comprehensive Demo Dataset</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    30+ Books & 25+ Students
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  Quickly seed realistic books across all 9 categories with sub-categories, active student borrowers across classes, and live circulation records.
                </p>
              </div>
            </div>

            <button
              id="seed-more-data-btn"
              type="button"
              onClick={handleSeedData}
              disabled={seedingData}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-75"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{seedingData ? 'Seeding Demo Data...' : 'Seed / Re-populate Demo Data'}</span>
            </button>
          </div>
        </div>
      )}

      {/* CATEGORY MASTER TAB */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Top Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Book Categories & Sub-Categories Master
                </h3>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-bold">
                  {categories.length} Categories •{' '}
                  {categories.reduce(
                    (acc, cat) =>
                      acc + (Array.isArray(cat.subCategories) ? cat.subCategories.length : 0),
                    0
                  )}{' '}
                  Sub-Categories
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Define main curriculum categories, language genres, and sub-categories to organize your school library books. Sub-categories make book cataloging, tagging, and search seamless.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="add-category-btn"
                type="button"
                onClick={handleOpenAddCategory}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Search, Filter & Layout Switcher Bar */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2.5">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="category-search-input"
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search by category name or sub-category tag (e.g. Physics, Python, Fiction)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 shadow-2xs"
                />
                {categorySearch && (
                  <button
                    type="button"
                    onClick={() => setCategorySearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status & Sub-Category Filters */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    categoryFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All ({categories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('has_sub')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    categoryFilter === 'has_sub'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  With Sub-Categories ({categories.filter((c) => Array.isArray(c.subCategories) && c.subCategories.length > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('no_sub')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    categoryFilter === 'no_sub'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Needs Sub-Categories ({categories.filter((c) => !Array.isArray(c.subCategories) || c.subCategories.length === 0).length})
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 self-end md:self-center border-l border-slate-200 pl-3">
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">View:</span>
              <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setCategoryViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    categoryViewMode === 'table' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    categoryViewMode === 'cards' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Cards / Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loadingCategories ? (
              <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold text-slate-600">Loading book categories and sub-categories...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">No book categories defined yet</p>
                  <p className="text-slate-500 mt-1">Click "Add Category" or seed the sample dataset from General Settings.</p>
                </div>
              </div>
            ) : (() => {
                const filtered = categories.filter((cat) => {
                  const subList = Array.isArray(cat.subCategories) ? cat.subCategories : [];
                  const q = categorySearch.toLowerCase().trim();
                  if (q) {
                    const matchName = cat.name.toLowerCase().includes(q);
                    const matchSub = subList.some((s) => s.toLowerCase().includes(q));
                    const matchDesc = (cat.description || '').toLowerCase().includes(q);
                    if (!matchName && !matchSub && !matchDesc) return false;
                  }
                  if (categoryFilter === 'active') return cat.isActive;
                  if (categoryFilter === 'inactive') return !cat.isActive;
                  if (categoryFilter === 'has_sub') return subList.length > 0;
                  if (categoryFilter === 'no_sub') return subList.length === 0;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                      <p className="font-semibold text-slate-700">No categories matching "{categorySearch}"</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCategorySearch('');
                          setCategoryFilter('all');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>
                  );
                }

                {/* TABLE VIEW */}
                if (categoryViewMode === 'table') {
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                            <th className="py-3 px-4 w-48">Category Name</th>
                            <th className="py-3 px-4 min-w-[360px]">Sub-Categories & Quick Add</th>
                            <th className="py-3 px-3">Description</th>
                            <th className="py-3 px-3 text-center">Books</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filtered.map((cat) => {
                            const subList = Array.isArray(cat.subCategories) ? cat.subCategories : [];
                            const isAddingInline = inlineAddingCatId === cat._id;

                            return (
                              <tr key={cat._id} className="hover:bg-slate-50/70 transition-colors">
                                {/* Category Name */}
                                <td className="py-3.5 px-4 font-bold text-slate-900 text-sm align-top">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span>{cat.name}</span>
                                    </div>
                                    <span className="text-[11px] font-normal text-slate-400 mt-0.5">
                                      {subList.length} sub-categor{subList.length === 1 ? 'y' : 'ies'}
                                    </span>
                                  </div>
                                </td>

                                {/* Sub-Categories Enhanced UX */}
                                <td className="py-3.5 px-4 align-top">
                                  <div className="space-y-2">
                                    {subList.length > 0 ? (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {subList.map((sub, idx) => (
                                          <span
                                            key={idx}
                                            className="group inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50/80 hover:bg-blue-100/90 text-blue-900 border border-blue-200/80 rounded-lg text-xs font-semibold shadow-2xs transition-all"
                                          >
                                            <Tag className="w-3 h-3 text-blue-500 shrink-0" />
                                            <span>{sub}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleQuickRemoveSubFromCategory(cat, sub)}
                                              title={`Remove "${sub}"`}
                                              className="text-blue-400 hover:text-rose-600 transition-colors cursor-pointer ml-0.5 opacity-60 group-hover:opacity-100"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </span>
                                        ))}

                                        {/* Inline Add Button / Form */}
                                        {!isAddingInline ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setInlineAddingCatId(cat._id);
                                              setInlineSubInput('');
                                            }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-700 border border-dashed border-slate-300 hover:border-blue-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                                          >
                                            <Plus className="w-3 h-3 text-blue-600" />
                                            <span>Add Sub</span>
                                          </button>
                                        ) : (
                                          <div className="inline-flex items-center gap-1.5 bg-white p-1 border border-blue-400 rounded-lg shadow-xs">
                                            <input
                                              type="text"
                                              autoFocus
                                              value={inlineSubInput}
                                              onChange={(e) => setInlineSubInput(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ',') {
                                                  e.preventDefault();
                                                  handleInlineAddSub(cat);
                                                } else if (e.key === 'Escape') {
                                                  setInlineAddingCatId(null);
                                                }
                                              }}
                                              placeholder="Type sub-category & Enter..."
                                              className="px-2 py-0.5 text-xs text-slate-800 focus:outline-hidden w-40"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleInlineAddSub(cat)}
                                              className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                                              title="Save Sub-Category"
                                            >
                                              <Check className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setInlineAddingCatId(null)}
                                              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                              title="Cancel"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenManageSubModal(cat)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 border border-dashed border-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                      >
                                        <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                                        <span>+ Add Sub-Categories</span>
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Description */}
                                <td className="py-3.5 px-3 text-slate-500 text-xs align-top">
                                  {cat.description || <span className="text-slate-400 italic">No description</span>}
                                </td>

                                {/* Total Books */}
                                <td className="py-3.5 px-3 text-center align-top">
                                  <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs inline-block">
                                    {cat.bookCount || 0}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-3 text-center align-top">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCategoryStatus(cat)}
                                    className="cursor-pointer"
                                    title="Click to toggle Active/Inactive"
                                  >
                                    <Badge variant={cat.isActive ? 'success' : 'neutral'} size="sm">
                                      {cat.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </button>
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-4 text-right align-top">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      id={`manage-subcat-${cat._id}`}
                                      type="button"
                                      onClick={() => handleOpenManageSubModal(cat)}
                                      className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer"
                                      title="Manage Sub-Categories & Recommendations"
                                    >
                                      <Tag className="w-4 h-4" />
                                    </button>
                                    <button
                                      id={`edit-cat-${cat._id}`}
                                      type="button"
                                      onClick={() => handleOpenEditCategory(cat)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Edit Category Details"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      id={`delete-cat-${cat._id}`}
                                      type="button"
                                      onClick={() => handleDeleteCategory(cat)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Delete Category"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                {/* BENTO CARDS / GRID VIEW */}
                return (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((cat) => {
                      const subList = Array.isArray(cat.subCategories) ? cat.subCategories : [];
                      const isAddingInline = inlineAddingCatId === cat._id;

                      return (
                        <div
                          key={cat._id}
                          className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3.5"
                        >
                          {/* Card Top: Name, Status & Book Count */}
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                  {cat.description || 'Curriculum classification category'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                                  {cat.bookCount || 0} books
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryStatus(cat)}
                                  className="cursor-pointer"
                                  title="Toggle Status"
                                >
                                  <Badge variant={cat.isActive ? 'success' : 'neutral'} size="sm">
                                    {cat.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </button>
                              </div>
                            </div>

                            {/* Sub-Categories Cloud */}
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Tag className="w-3 h-3 text-blue-600" />
                                  <span>Sub-Categories ({subList.length}):</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenManageSubModal(cat)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                                >
                                  Manage
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 min-h-[50px] bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                                {subList.length > 0 ? (
                                  subList.map((sub, idx) => (
                                    <span
                                      key={idx}
                                      className="group inline-flex items-center gap-1 px-2 py-0.5 bg-white text-blue-900 border border-blue-200 rounded-md text-[11px] font-semibold shadow-2xs"
                                    >
                                      <span>{sub}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickRemoveSubFromCategory(cat, sub)}
                                        className="text-blue-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                        title={`Remove ${sub}`}
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    No sub-categories yet
                                  </span>
                                )}

                                {/* Inline Add */}
                                {!isAddingInline ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInlineAddingCatId(cat._id);
                                      setInlineSubInput('');
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-700 border border-dashed border-slate-300 rounded-md text-[11px] font-semibold transition-all cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5 text-blue-600" />
                                    <span>Add</span>
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-1 bg-white p-0.5 border border-blue-400 rounded-lg shadow-xs">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={inlineSubInput}
                                      onChange={(e) => setInlineSubInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                          e.preventDefault();
                                          handleInlineAddSub(cat);
                                        } else if (e.key === 'Escape') {
                                          setInlineAddingCatId(null);
                                        }
                                      }}
                                      placeholder="Sub-category..."
                                      className="px-1.5 py-0.5 text-xs text-slate-800 focus:outline-hidden w-28"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleInlineAddSub(cat)}
                                      className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setInlineAddingCatId(null)}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              {subList.length} sub-categor{subList.length === 1 ? 'y' : 'ies'}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenManageSubModal(cat)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                                title="Manage Sub-Categories"
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditCategory(cat)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                title="Edit Category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* LIMIT VIOLATION BLOCKING MODAL */}
      {isLimitViolationModalOpen && limitViolationData && (
        <Modal
          isOpen={isLimitViolationModalOpen}
          onClose={() => setIsLimitViolationModalOpen(false)}
          title="Borrowing Limit Change Blocked"
          subtitle={`Cannot reduce maximum limit to ${limitViolationData.proposedLimit} book(s) per member`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Warning Explanation Header */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900">
                  {limitViolationData.violatingCount} Member(s) Currently Exceed the Proposed Limit
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  You are attempting to set the maximum borrowing limit to{' '}
                  <strong className="font-bold underline">{limitViolationData.proposedLimit} books</strong>. However, the students and teachers listed below currently hold{' '}
                  <strong className="font-bold">more than {limitViolationData.proposedLimit} unreturned books</strong>.
                </p>
                <p className="text-[11px] text-amber-700 font-semibold">
                  📌 The system will not allow changing this limit until these members return their excess books to the library.
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Proposed Limit</span>
                <span className="text-base font-bold text-blue-600">{limitViolationData.proposedLimit} Books</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Current Limit</span>
                <span className="text-base font-bold text-slate-700">{settings?.maxBooksPerMember || 3} Books</span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-[10px] text-rose-600 font-semibold block uppercase">Over-Limit Members</span>
                <span className="text-base font-bold text-rose-700">{limitViolationData.violatingCount} Members</span>
              </div>
            </div>

            {/* Over-Limit Members List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Members Holding &gt; {limitViolationData.proposedLimit} Books:</span>
                <span className="text-[11px] text-slate-500 font-normal">Click member to manage returns</span>
              </div>

              {limitViolationData.violatingMembers.map((member, idx) => {
                const excess = member.activeBooksCount - limitViolationData.proposedLimit;
                return (
                  <div
                    key={member.memberId || idx}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all shadow-2xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">{member.name}</h5>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                              {member.memberCode}
                            </span>
                            <Badge variant={member.memberType === 'teacher' ? 'purple' : 'info'} size="sm">
                              {member.memberType === 'teacher' ? 'Teacher' : 'Student'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {member.memberType === 'student' ? (
                              <span>
                                {member.className ? `${member.className} ${member.section || ''}` : 'Class —'}
                                {member.admissionNo ? ` • Adm #${member.admissionNo}` : ''}
                              </span>
                            ) : (
                              <span>{member.designation || member.department || 'Faculty'}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                          {member.activeBooksCount} Books Held ({excess > 0 ? `+${excess} excess` : 'Exceeds'})
                        </span>
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => handleGoToMemberCirculation(member)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Return Books</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Breakdown of books currently issued */}
                    {member.books && member.books.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                          Currently Borrowed Books ({member.books.length}):
                        </span>
                        <div className="space-y-1">
                          {member.books.map((b, bIdx) => (
                            <div
                              key={b.assignmentId || bIdx}
                              className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-200/70"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{b.title}</span>
                                {b.accessionNumber && (
                                  <span className="text-[10px] text-slate-400 font-mono">({b.accessionNumber})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-[10px]">
                                <span className="text-slate-500">
                                  Due: {new Date(b.dueDate).toLocaleDateString()}
                                </span>
                                {b.status === 'overdue' ? (
                                  <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded font-bold">
                                    Overdue
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded font-medium">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleRevertToCurrentLimit}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to Current Limit ({settings?.maxBooksPerMember || 3} Books)</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLimitViolationModalOpen(false);
                      onNavigateTab('assignments');
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <BookCheck className="w-3.5 h-3.5" />
                    <span>Go to Circulation Desk</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsLimitViolationModalOpen(false)}
                  className="px-3.5 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DEDICATED MANAGE SUB-CATEGORIES MODAL */}
      {isManageSubModalOpen && selectedCategoryForSubManage && (
        <Modal
          isOpen={isManageSubModalOpen}
          onClose={() => setIsManageSubModalOpen(false)}
          title={`Sub-Categories Manager: ${selectedCategoryForSubManage.name}`}
          subtitle="Add and organize sub-categories for this classification category"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Category Info Header Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {selectedCategoryForSubManage.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {selectedCategoryForSubManage.description || 'Library Book Category'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                  {selectedCategoryForSubManage.bookCount || 0} books
                </span>
                <Badge variant={selectedCategoryForSubManage.isActive ? 'success' : 'neutral'} size="sm">
                  {selectedCategoryForSubManage.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Quick Add Sub-Category Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Add Sub-Category</span>
                <span className="text-[10px] text-slate-400 font-normal">Press Enter or comma (,) to add</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={manageSubInput}
                  onChange={(e) => setManageSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      if (manageSubInput.trim()) {
                        const parts = manageSubInput.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p.length > 0);
                        parts.forEach((p) => handleQuickAddSubToCategory(selectedCategoryForSubManage, p));
                        setManageSubInput('');
                      }
                    }
                  }}
                  placeholder="e.g. Artificial Intelligence, Quantum Physics, Shakespeare Plays..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (manageSubInput.trim()) {
                      const parts = manageSubInput.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p.length > 0);
                      parts.forEach((p) => handleQuickAddSubToCategory(selectedCategoryForSubManage, p));
                      setManageSubInput('');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Active Sub-Categories Cloud */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Configured Sub-Categories</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                    {Array.isArray(selectedCategoryForSubManage.subCategories)
                      ? selectedCategoryForSubManage.subCategories.length
                      : 0}
                  </span>
                </span>
                {Array.isArray(selectedCategoryForSubManage.subCategories) &&
                  selectedCategoryForSubManage.subCategories.length > 0 && (
                    <span className="text-[10px] text-slate-500">Click ✕ on any tag to remove</span>
                  )}
              </div>

              {Array.isArray(selectedCategoryForSubManage.subCategories) &&
              selectedCategoryForSubManage.subCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                  {selectedCategoryForSubManage.subCategories.map((sub, idx) => (
                    <span
                      key={idx}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-900 border border-blue-200 rounded-xl text-xs font-semibold shadow-2xs hover:border-blue-300 transition-all"
                    >
                      <Tag className="w-3 h-3 text-blue-500" />
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => handleQuickRemoveSubFromCategory(selectedCategoryForSubManage, sub)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                        title={`Remove "${sub}"`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 italic">
                  No sub-categories added to "{selectedCategoryForSubManage.name}" yet.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageSubModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD CATEGORY MODAL */}
      <Modal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        title="Add Book Category & Sub-Categories"
        subtitle="Create a new classification category and specify optional sub-categories"
        maxWidth="lg"
      >
        <form onSubmit={handleAddCategorySubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Main Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="add-cat-name"
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. Science, Mathematics, Computer, Story Books, Hindi, English"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              id="add-cat-desc"
              type="text"
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, description: e.target.value })
              }
              placeholder="Brief description of this book collection"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Sub-Categories Interactive Manager */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Sub-Categories (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-500">Press Enter or comma (,) to add</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubCatInput}
                onChange={(e) => setNewSubCatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddSubCategoryChip();
                  }
                }}
                placeholder="Type sub-category (e.g. Physics, Fiction, Algebra) and press Add..."
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubCategoryChip}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Render subcategory chips */}
            {categoryForm.subCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {categoryForm.subCategories.map((sub, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 font-semibold rounded-lg text-xs shadow-2xs"
                  >
                    <span>{sub}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubCategoryChip(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="add-cat-active"
              type="checkbox"
              checked={categoryForm.isActive}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, isActive: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <label
              htmlFor="add-cat-active"
              className="text-xs font-medium text-slate-700 cursor-pointer"
            >
              Active (Available for cataloging and search)
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddCategoryOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-cat-btn"
              type="submit"
              disabled={submittingCategory}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-75"
            >
              {submittingCategory ? 'Saving...' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT CATEGORY MODAL */}
      <Modal
        isOpen={isEditCategoryOpen}
        onClose={() => setIsEditCategoryOpen(false)}
        title="Edit Book Category & Sub-Categories"
        subtitle={`Editing: ${currentCategory?.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditCategorySubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Main Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-cat-name"
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              id="edit-cat-desc"
              type="text"
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Sub-Categories Interactive Manager */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Sub-Categories (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-500">Press Enter or comma (,) to add</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubCatInput}
                onChange={(e) => setNewSubCatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddSubCategoryChip();
                  }
                }}
                placeholder="Type sub-category (e.g. Physics, Fiction, Algebra) and press Add..."
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubCategoryChip}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Render subcategory chips */}
            {categoryForm.subCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {categoryForm.subCategories.map((sub, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 font-semibold rounded-lg text-xs shadow-2xs"
                  >
                    <span>{sub}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubCategoryChip(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="edit-cat-active"
              type="checkbox"
              checked={categoryForm.isActive}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, isActive: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <label
              htmlFor="edit-cat-active"
              className="text-xs font-medium text-slate-700 cursor-pointer"
            >
              Active
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditCategoryOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="update-cat-btn"
              type="submit"
              disabled={submittingCategory}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-75"
            >
              {submittingCategory ? 'Saving...' : 'Update Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SCHEDULE FINE RATE SLAB MODAL */}
      <Modal
        isOpen={isAddFineRuleModalOpen}
        onClose={() => setIsAddFineRuleModalOpen(false)}
        title="Schedule Effective Fine Rate Slab"
        subtitle="Set a new fine per day that becomes effective starting from a specific date"
        maxWidth="md"
      >
        <form onSubmit={handleAddFineRuleSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>How Date-Tiered Calculation Works:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              When a book is overdue across this effective date, days prior to the date are charged at the previous rate, and days on/after this date are charged at the new rate.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Effective From Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-fine-rule-date"
              type="date"
              required
              value={newFineRuleForm.effectiveDate}
              onChange={(e) =>
                setNewFineRuleForm({ ...newFineRuleForm, effectiveDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              New Fine Rate (₹ per Day) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
              <input
                id="new-fine-rule-rate"
                type="number"
                min="0"
                step="0.5"
                required
                value={newFineRuleForm.finePerDay}
                onChange={(e) =>
                  setNewFineRuleForm({
                    ...newFineRuleForm,
                    finePerDay: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-rose-700 focus:outline-hidden focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Note / Policy Reason (Optional)
            </label>
            <input
              id="new-fine-rule-note"
              type="text"
              placeholder="e.g. Academic Year 2026 Revision, Library Council Policy"
              value={newFineRuleForm.note}
              onChange={(e) =>
                setNewFineRuleForm({ ...newFineRuleForm, note: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddFineRuleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-fine-rule-btn"
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              Add Rate Slab
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

