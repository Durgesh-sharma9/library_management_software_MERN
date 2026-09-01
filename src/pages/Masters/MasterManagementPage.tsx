import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  GraduationCap,
  Check,
  RefreshCw,
  Search,
  Users,
  Eye,
  Phone,
  BookOpen,
  ArrowRight,
  Printer,
  History,
  FileSpreadsheet,
  ExternalLink,
  Truck,
  Archive,
  Bookmark,
  Building,
  Mail,
  MapPin,
  FileText,
  IndianRupee,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { masterService, memberService, supplierService, shelfService, categoryService } from '../../services/api';
import { SchoolClass, Member, Supplier, Shelf, BookCategory } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';

const STANDARD_SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface MasterManagementPageProps {
  onNavigateTab?: (tab: string, filters?: any) => void;
}

type MasterTab = 'classes' | 'suppliers' | 'shelves' | 'categories';

export const MasterManagementPage: React.FC<MasterManagementPageProps> = ({ onNavigateTab }) => {
  const { formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState<MasterTab>('classes');

  // Master Data
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allStudents, setAllStudents] = useState<Member[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Class Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<{ id: string; name: string; order: number; sections: string[] } | null>(null);
  const [classNameInput, setClassNameInput] = useState<string>('');
  const [classOrderInput, setClassOrderInput] = useState<number>(1);
  const [selectedSections, setSelectedSections] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [customSectionInput, setCustomSectionInput] = useState<string>('');

  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
    notes: '',
    isActive: true,
  });

  // Shelf Modal State
  const [isShelfModalOpen, setIsShelfModalOpen] = useState<boolean>(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [shelfForm, setShelfForm] = useState({
    name: '',
    floorOrRoom: '',
    capacity: 100,
    description: '',
    isActive: true,
  });

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<BookCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    subCategories: [] as string[],
    isActive: true,
  });
  const [subCategoryTagInput, setSubCategoryTagInput] = useState<string>('');

  // View Class & Section Students State
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState<boolean>(false);
  const [selectedClassForView, setSelectedClassForView] = useState<SchoolClass | null>(null);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Selected Student Profile Modal
  const [isStudentProfileOpen, setIsStudentProfileOpen] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<{
    member: Member | null;
    currentlyAssigned: any[];
    previousHistory: any[];
  }>({
    member: null,
    currentlyAssigned: [],
    previousHistory: [],
  });
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [classList, studentList, supplierList, shelfList, categoryList] = await Promise.all([
        masterService.getClasses(true),
        memberService.getAll({ memberType: 'student' }),
        supplierService.getAll(true),
        shelfService.getAll(true),
        categoryService.getAll(true),
      ]);
      setClasses(classList);
      setAllStudents(studentList);
      setSuppliers(supplierList);
      setShelves(shelfList);
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to load master metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Map of Class Name -> Total Student Count & Per-Section Count
  const classStudentStats = useMemo(() => {
    const map: Record<string, { total: number; sections: Record<string, number> }> = {};

    classes.forEach((cls) => {
      map[cls.name] = { total: 0, sections: {} };
      const clsSecs = Array.isArray(cls.sections) && cls.sections.length > 0 ? cls.sections : ['A', 'B', 'C', 'D'];
      clsSecs.forEach((sec) => {
        map[cls.name].sections[sec] = 0;
      });
    });

    allStudents.forEach((student) => {
      const clsName = student.className;
      const secName = student.section || 'A';
      if (clsName && map[clsName]) {
        map[clsName].total += 1;
        if (map[clsName].sections[secName] !== undefined) {
          map[clsName].sections[secName] += 1;
        } else {
          map[clsName].sections[secName] = 1;
        }
      }
    });

    return map;
  }, [classes, allStudents]);

  // Open "View Students" in Class & Section
  const handleOpenViewStudents = (cls: SchoolClass, section = 'all') => {
    setSelectedClassForView(cls);
    setActiveSectionFilter(section);
    setStudentSearchQuery('');
    setIsViewStudentsModalOpen(true);
  };

  // Open Student Full Profile from Roster
  const handleOpenStudentProfile = async (studentId: string) => {
    try {
      setProfileLoading(true);
      setIsStudentProfileOpen(true);
      const data = await memberService.getById(studentId);
      setProfileData(data);
    } catch (err) {
      console.error('Failed to load student profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // CLASS HANDLERS
  const handleOpenAddClass = () => {
    setFormError('');
    setEditingClass(null);
    setClassNameInput('');
    setClassOrderInput(classes.length + 1);
    setSelectedSections(['A', 'B', 'C', 'D']);
    setCustomSectionInput('');
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls: SchoolClass) => {
    setFormError('');
    const clsSections = Array.isArray(cls.sections) && cls.sections.length > 0 ? cls.sections : ['A', 'B', 'C', 'D'];
    setEditingClass({ id: cls._id, name: cls.name, order: cls.order, sections: clsSections });
    setClassNameInput(cls.name);
    setClassOrderInput(cls.order);
    setSelectedSections(clsSections);
    setCustomSectionInput('');
    setIsClassModalOpen(true);
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) {
      setFormError('Class name is required.');
      return;
    }
    if (selectedSections.length === 0) {
      setFormError('Please select or add at least one section for this class.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      if (editingClass) {
        await masterService.updateClass(editingClass.id, {
          name: classNameInput.trim(),
          order: Number(classOrderInput),
          sections: selectedSections,
        });
        setFeedbackMessage({ type: 'success', text: `Class ${classNameInput} updated successfully.` });
      } else {
        await masterService.createClass({
          name: classNameInput.trim(),
          order: Number(classOrderInput),
          sections: selectedSections,
        });
        setFeedbackMessage({ type: 'success', text: `Class ${classNameInput} added successfully.` });
      }
      setIsClassModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save class.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (cls: SchoolClass) => {
    const studentCount = classStudentStats[cls.name]?.total || 0;
    if (studentCount > 0) {
      alert(`Cannot delete ${cls.name}: It currently contains ${studentCount} enrolled student(s).`);
      return;
    }

    if (!window.confirm(`Are you sure you want to remove Class "${cls.name}"?`)) return;

    try {
      await masterService.deleteClass(cls._id);
      setFeedbackMessage({ type: 'success', text: `Class ${cls.name} removed successfully.` });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete class.');
    }
  };

  // SUPPLIER HANDLERS
  const handleOpenAddSupplier = () => {
    setFormError('');
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      gstNumber: '',
      address: '',
      notes: '',
      isActive: true,
    });
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setFormError('');
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      gstNumber: sup.gstNumber || '',
      address: sup.address || '',
      notes: sup.notes || '',
      isActive: sup.isActive,
    });
    setIsSupplierModalOpen(true);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      setFormError('Supplier / Vendor Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      if (editingSupplier) {
        await supplierService.update(editingSupplier._id, supplierForm);
        setFeedbackMessage({ type: 'success', text: `Supplier "${supplierForm.name}" updated successfully.` });
      } else {
        await supplierService.create(supplierForm);
        setFeedbackMessage({ type: 'success', text: `Supplier "${supplierForm.name}" created successfully.` });
      }
      setIsSupplierModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (sup: Supplier) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) return;

    try {
      const res = await supplierService.delete(sup._id);
      setFeedbackMessage({ type: 'success', text: res.message || 'Supplier deleted.' });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete supplier.');
    }
  };

  // SHELF HANDLERS
  const handleOpenAddShelf = () => {
    setFormError('');
    setEditingShelf(null);
    setShelfForm({
      name: '',
      floorOrRoom: '',
      capacity: 100,
      description: '',
      isActive: true,
    });
    setIsShelfModalOpen(true);
  };

  const handleOpenEditShelf = (sh: Shelf) => {
    setFormError('');
    setEditingShelf(sh);
    setShelfForm({
      name: sh.name,
      floorOrRoom: sh.floorOrRoom || '',
      capacity: sh.capacity || 100,
      description: sh.description || '',
      isActive: sh.isActive,
    });
    setIsShelfModalOpen(true);
  };

  const handleShelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelfForm.name.trim()) {
      setFormError('Shelf / Rack Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      if (editingShelf) {
        await shelfService.update(editingShelf._id, shelfForm);
        setFeedbackMessage({ type: 'success', text: `Shelf "${shelfForm.name}" updated successfully.` });
      } else {
        await shelfService.create(shelfForm);
        setFeedbackMessage({ type: 'success', text: `Shelf "${shelfForm.name}" created successfully.` });
      }
      setIsShelfModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save shelf.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShelf = async (sh: Shelf) => {
    if (!window.confirm(`Are you sure you want to delete shelf "${sh.name}"?`)) return;

    try {
      const res = await shelfService.delete(sh._id);
      setFeedbackMessage({ type: 'success', text: res.message || 'Shelf location deleted.' });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete shelf.');
    }
  };

  // CATEGORY HANDLERS
  const handleOpenAddCategory = () => {
    setFormError('');
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      subCategories: ['General'],
      isActive: true,
    });
    setSubCategoryTagInput('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: BookCategory) => {
    setFormError('');
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      subCategories: Array.isArray(cat.subCategories) ? cat.subCategories : [],
      isActive: cat.isActive,
    });
    setSubCategoryTagInput('');
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setFormError('Category Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      if (editingCategory) {
        await categoryService.update(editingCategory._id, categoryForm);
        setFeedbackMessage({ type: 'success', text: `Category "${categoryForm.name}" updated successfully.` });
      } else {
        await categoryService.create(categoryForm);
        setFeedbackMessage({ type: 'success', text: `Category "${categoryForm.name}" created successfully.` });
      }
      setIsCategoryModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: BookCategory) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      await categoryService.delete(cat._id);
      setFeedbackMessage({ type: 'success', text: `Category "${cat.name}" removed.` });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete category.');
    }
  };

  // Filtered lists based on search query
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
    (s.phone && s.phone.includes(searchQuery.trim()))
  );

  const filteredShelves = shelves.filter((sh) =>
    sh.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (sh.floorOrRoom && sh.floorOrRoom.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
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

      {/* Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Classes Tab */}
          <button
            type="button"
            id="tab-master-classes"
            onClick={() => {
              setActiveTab('classes');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'classes'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Classes & Sections ({classes.length})</span>
          </button>

          {/* Suppliers Tab */}
          <button
            type="button"
            id="tab-master-suppliers"
            onClick={() => {
              setActiveTab('suppliers');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/20'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Book Suppliers ({suppliers.length})</span>
          </button>

          {/* Shelves Tab */}
          <button
            type="button"
            id="tab-master-shelves"
            onClick={() => {
              setActiveTab('shelves');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'shelves'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/20'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Shelves & Racks ({shelves.length})</span>
          </button>

          {/* Categories Tab */}
          <button
            type="button"
            id="tab-master-categories"
            onClick={() => {
              setActiveTab('categories');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/20'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Book Categories ({categories.length})</span>
          </button>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'classes' && (
            <button
              id="add-class-btn"
              type="button"
              onClick={handleOpenAddClass}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Class</span>
            </button>
          )}

          {activeTab === 'suppliers' && (
            <button
              id="add-supplier-btn"
              type="button"
              onClick={handleOpenAddSupplier}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Supplier</span>
            </button>
          )}

          {activeTab === 'shelves' && (
            <button
              id="add-shelf-btn"
              type="button"
              onClick={handleOpenAddShelf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Shelf / Rack</span>
            </button>
          )}

          {activeTab === 'categories' && (
            <button
              id="add-category-btn"
              type="button"
              onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Category</span>
            </button>
          )}
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="master-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'classes'
                ? 'Search class name...'
                : activeTab === 'suppliers'
                ? 'Search supplier name, contact, phone...'
                : activeTab === 'shelves'
                ? 'Search shelf name or location...'
                : 'Search category name...'
            }
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={fetchAllData}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TAB 1: CLASSES & SECTIONS */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2.5 text-xs font-medium">Loading classes & student rosters...</span>
            </div>
          ) : filteredClasses.length === 0 ? (
            <EmptyState
              id="empty-classes"
              icon={GraduationCap}
              title="No classes found"
              description="Define classes and their active sections to assign students."
              actionLabel="Add Class"
              onAction={handleOpenAddClass}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cls) => {
                const totalStudentsInClass = classStudentStats[cls.name]?.total || 0;
                const sectionsList = Array.isArray(cls.sections) && cls.sections.length > 0 ? cls.sections : ['A', 'B', 'C', 'D'];

                return (
                  <div
                    key={cls._id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                            {cls.name.replace(/^class\s+/i, '').slice(0, 3) || 'C'}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">{cls.name}</h3>
                            <span className="text-[11px] text-slate-500 font-medium">Order: #{cls.order}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditClass(cls)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Class"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(cls)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Sections Badges & Counts */}
                      <div className="space-y-2 mb-4">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Sections & Roster
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {sectionsList.map((sec) => {
                            const count = classStudentStats[cls.name]?.sections[sec] || 0;
                            return (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => handleOpenViewStudents(cls, sec)}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <span>Sec {sec}:</span>
                                <span className="font-bold">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{totalStudentsInClass} Enrolled</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenViewStudents(cls, 'all')}
                        className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Students</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOOK SUPPLIERS MASTER */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2.5 text-xs font-medium">Loading book suppliers...</span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                id="empty-suppliers"
                icon={Truck}
                title="No book suppliers registered"
                description="Keep track of book publishers, vendors, distributors, GST details, and total spend."
                actionLabel="Add New Supplier"
                onAction={handleOpenAddSupplier}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3.5 px-4">Supplier Name & Contact</th>
                    <th className="py-3.5 px-3">Phone & Email</th>
                    <th className="py-3.5 px-3">GST / Tax ID</th>
                    <th className="py-3.5 px-3">Address / Location</th>
                    <th className="py-3.5 px-2 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSuppliers.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{s.name}</span>
                        </div>
                        {s.contactPerson && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Contact Person: <span className="font-semibold text-slate-700">{s.contactPerson}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          {s.phone && (
                            <div className="flex items-center gap-1 text-slate-700 font-medium">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{s.phone}</span>
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{s.email}</span>
                            </div>
                          )}
                          {!s.phone && !s.email && <span className="text-slate-400 italic">No contact info</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {s.gstNumber ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-mono font-bold rounded text-[11px] border border-slate-200">
                            {s.gstNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">N/A</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="max-w-[200px] truncate text-slate-600 text-[11px]">
                          {s.address || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-2 text-center">
                        {s.isActive ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Inactive</Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSupplier(s)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupplier(s)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* TAB 3: SHELVES & RACKS MASTER */}
      {activeTab === 'shelves' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2.5 text-xs font-medium">Loading shelves and physical racks...</span>
            </div>
          ) : filteredShelves.length === 0 ? (
            <div className="p-6">
              <EmptyState
                id="empty-shelves"
                icon={Archive}
                title="No shelf / rack locations defined"
                description="Organize books by physical shelf identifiers like 'Shelf A-1', 'Rack 3B', or 'Main Almirah'."
                actionLabel="Add New Shelf"
                onAction={handleOpenAddShelf}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3.5 px-4">Shelf / Rack Name</th>
                    <th className="py-3.5 px-3">Floor / Room Location</th>
                    <th className="py-3.5 px-3">Storage Capacity</th>
                    <th className="py-3.5 px-3">Description</th>
                    <th className="py-3.5 px-2 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredShelves.map((sh) => (
                    <tr key={sh._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-800 font-bold rounded-lg text-xs border border-purple-200 inline-flex items-center gap-1.5">
                          <Archive className="w-3.5 h-3.5 text-purple-600" />
                          <span>{sh.name}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {sh.floorOrRoom || 'Main Library Room'}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900">{sh.capacity || 100}</span>
                        <span className="text-slate-500 text-[11px] ml-1">books capacity</span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                        {sh.description || 'General storage rack'}
                      </td>

                      <td className="py-3.5 px-2 text-center">
                        {sh.isActive ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Inactive</Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditShelf(sh)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Shelf"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteShelf(sh)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Shelf"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* TAB 4: BOOK CATEGORIES MASTER */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2.5 text-xs font-medium">Loading categories & sub-genres...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-6">
              <EmptyState
                id="empty-categories"
                icon={Layers}
                title="No categories found"
                description="Organize your library catalog into genres, subjects, and sub-categories."
                actionLabel="Add Category"
                onAction={handleOpenAddCategory}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3.5 px-4">Category Name</th>
                    <th className="py-3.5 px-3">Description</th>
                    <th className="py-3.5 px-3">Sub-Categories / Tags</th>
                    <th className="py-3.5 px-2 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCategories.map((cat) => (
                    <tr key={cat._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-bold rounded-lg text-xs border border-indigo-200 inline-flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{cat.name}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 text-[11px]">
                        {cat.description || 'Standard category'}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {Array.isArray(cat.subCategories) && cat.subCategories.length > 0 ? (
                            cat.subCategories.map((sub, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded text-[10px] border border-blue-200"
                              >
                                {sub}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No sub-categories</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-2 text-center">
                        {cat.isActive ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Inactive</Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCategory(cat)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* CLASS MODAL */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title={editingClass ? 'Edit Class & Sections' : 'Add New Class'}
        subtitle="Configure standard school classes and their assigned sections"
        maxWidth="md"
      >
        <form onSubmit={handleClassSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={classNameInput}
                onChange={(e) => setClassNameInput(e.target.value)}
                placeholder="e.g. Class 10, Nursery, Grade 5"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
              <input
                type="number"
                min="1"
                required
                value={classOrderInput}
                onChange={(e) => setClassOrderInput(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Active Sections <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {STANDARD_SECTION_OPTIONS.map((sec) => {
                const isSelected = selectedSections.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSections(selectedSections.filter((s) => s !== sec));
                      } else {
                        setSelectedSections([...selectedSections, sec].sort());
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Section {sec}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customSectionInput}
                onChange={(e) => setCustomSectionInput(e.target.value.toUpperCase())}
                placeholder="Custom Section (e.g. Lotus, Red)"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
              />
              <button
                type="button"
                onClick={() => {
                  const s = customSectionInput.trim();
                  if (s && !selectedSections.includes(s)) {
                    setSelectedSections([...selectedSections, s]);
                    setCustomSectionInput('');
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                + Add Section
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsClassModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting ? 'Saving...' : editingClass ? 'Update Class' : 'Save Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SUPPLIER MODAL */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title={editingSupplier ? 'Edit Book Supplier' : 'Add New Book Supplier'}
        subtitle="Manage vendor profile, contact details, GST, and address"
        maxWidth="md"
      >
        <form onSubmit={handleSupplierSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              placeholder="e.g. Standard Book Depot / Oxford India"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={supplierForm.contactPerson}
                onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                placeholder="e.g. Mr. Rajesh Kumar"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                placeholder="e.g. vendor@books.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST / Tax Number</label>
              <input
                type="text"
                value={supplierForm.gstNumber}
                onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. 07AAAAA0000A1Z5"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Office / Warehouse Address</label>
            <input
              type="text"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              placeholder="e.g. 42 Daryaganj, New Delhi"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SHELF MODAL */}
      <Modal
        isOpen={isShelfModalOpen}
        onClose={() => setIsShelfModalOpen(false)}
        title={editingShelf ? 'Edit Shelf / Rack' : 'Add New Shelf / Rack'}
        subtitle="Manage physical storage locations and rack capacity"
        maxWidth="md"
      >
        <form onSubmit={handleShelfSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shelf / Rack Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={shelfForm.name}
                onChange={(e) => setShelfForm({ ...shelfForm, name: e.target.value })}
                placeholder="e.g. Shelf A-1, Rack 3B"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-purple-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Floor / Room Location</label>
              <input
                type="text"
                value={shelfForm.floorOrRoom}
                onChange={(e) => setShelfForm({ ...shelfForm, floorOrRoom: e.target.value })}
                placeholder="e.g. 1st Floor / Hall 2"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Book Capacity</label>
              <input
                type="number"
                min="1"
                value={shelfForm.capacity}
                onChange={(e) => setShelfForm({ ...shelfForm, capacity: parseInt(e.target.value) || 100 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
              <input
                type="text"
                value={shelfForm.description}
                onChange={(e) => setShelfForm({ ...shelfForm, description: e.target.value })}
                placeholder="e.g. Science fiction & reference"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsShelfModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting ? 'Saving...' : editingShelf ? 'Update Shelf' : 'Save Shelf'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Book Category' : 'Add New Book Category'}
        subtitle="Manage genres, subjects, and sub-category tags"
        maxWidth="md"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. Science & Tech / Fiction / Textbooks"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-indigo-900 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              placeholder="Brief description of this genre"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Sub Categories Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Categories / Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {categoryForm.subCategories.map((sub, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs border border-blue-200 flex items-center gap-1"
                >
                  <span>{sub}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm({
                        ...categoryForm,
                        subCategories: categoryForm.subCategories.filter((_, i) => i !== idx),
                      })
                    }
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subCategoryTagInput}
                onChange={(e) => setSubCategoryTagInput(e.target.value)}
                placeholder="Add sub-category (e.g. Physics, Novel)"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  const tag = subCategoryTagInput.trim();
                  if (tag && !categoryForm.subCategories.includes(tag)) {
                    setCategoryForm({
                      ...categoryForm,
                      subCategories: [...categoryForm.subCategories, tag],
                    });
                    setSubCategoryTagInput('');
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                + Add Tag
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW STUDENTS MODAL */}
      <Modal
        isOpen={isViewStudentsModalOpen}
        onClose={() => setIsViewStudentsModalOpen(false)}
        title={selectedClassForView ? `Class Roster: ${selectedClassForView.name}` : 'Class Students'}
        subtitle="View all enrolled students, active loans, and parent contact details"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Section tabs */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSectionFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSectionFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Sections
              </button>
              {selectedClassForView?.sections?.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setActiveSectionFilter(sec)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSectionFilter === sec
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Section {sec}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Search student..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Student list */}
          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
            {(() => {
              const list = allStudents.filter((st) => {
                if (st.className !== selectedClassForView?.name) return false;
                if (activeSectionFilter !== 'all' && st.section !== activeSectionFilter) return false;
                if (studentSearchQuery) {
                  const q = studentSearchQuery.toLowerCase();
                  return (
                    st.name.toLowerCase().includes(q) ||
                    (st.memberId && st.memberId.toLowerCase().includes(q)) ||
                    (st.admissionNo && st.admissionNo.toLowerCase().includes(q))
                  );
                }
                return true;
              });

              if (list.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                    No students found for this selection.
                  </div>
                );
              }

              return list.map((st) => (
                <div
                  key={st._id}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-blue-200 transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <span>{st.name}</span>
                      <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {st.memberId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Adm No: <span className="font-semibold text-slate-700">{st.admissionNo || 'N/A'}</span> • Sec:{' '}
                      <span className="font-semibold text-slate-700">{st.section || 'A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenStudentProfile(st._id)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </Modal>

      {/* STUDENT PROFILE & CIRCULATION HISTORY MODAL */}
      <Modal
        isOpen={isStudentProfileOpen}
        onClose={() => setIsStudentProfileOpen(false)}
        title="Student Circulation Profile"
        subtitle={profileData.member ? `${profileData.member.name} (${profileData.member.memberId})` : 'Student History'}
        maxWidth="lg"
      >
        {profileLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading history...</div>
        ) : !profileData.member ? (
          <div className="p-4 text-center text-slate-500 text-xs">No profile loaded.</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{profileData.member.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profileData.member.className} - Section {profileData.member.section || 'A'} • Adm No:{' '}
                  {profileData.member.admissionNo || 'N/A'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs border border-blue-200">
                  {profileData.currentlyAssigned.length} Active Loans
                </span>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 text-xs mb-2">Currently Assigned Books</h5>
              {profileData.currentlyAssigned.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No books currently borrowed.
                </div>
              ) : (
                <div className="space-y-2">
                  {profileData.currentlyAssigned.map((a: any) => (
                    <div
                      key={a._id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {typeof a.book === 'object' ? a.book?.title : 'Book'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Issued: {new Date(a.assignedDate).toLocaleDateString()} • Due:{' '}
                          {new Date(a.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={new Date(a.dueDate) < new Date() ? 'danger' : 'warning'} size="sm">
                        {new Date(a.dueDate) < new Date() ? 'Overdue' : 'Active Loan'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
