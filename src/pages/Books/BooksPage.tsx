import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  BookMarked,
  Info,
  RefreshCw,
  FileSpreadsheet,
  Hash,
  IndianRupee,
  Truck,
  Archive,
  BarChart3,
  Layers,
  Building,
  DollarSign,
  Image as ImageIcon,
  Upload,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { bookService, categoryService, supplierService, shelfService, uploadService, assignmentService } from '../../services/api';
import { Book, BookCategory, Supplier, Shelf } from '../../types';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { BulkImportBooksModal } from '../../components/BulkImportBooksModal';
import { BookAnalyticsView } from './BookAnalyticsView';
import { useSettings } from '../../context/SettingsContext';

interface BooksPageProps {
  initialFilter?: { status?: string; categoryId?: string };
}

export const BooksPage: React.FC<BooksPageProps> = ({ initialFilter }) => {
  const { formatCurrency, settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'catalog' | 'analytics'>('catalog');

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialFilter?.categoryId || 'all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter?.status || 'all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedShelf, setSelectedShelf] = useState<string>('all');

  // Add / Edit / Bulk Import / Quick Category Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [isCopiesModalOpen, setIsCopiesModalOpen] = useState<boolean>(false);
  const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = useState<boolean>(false);
  const [expandedBookIds, setExpandedBookIds] = useState<string[]>([]);
  const [returningCopyAcc, setReturningCopyAcc] = useState<string | null>(null);
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    description: '',
    subCategories: '',
  });
  const [creatingCategory, setCreatingCategory] = useState<boolean>(false);
  const [addCategoryError, setAddCategoryError] = useState<string>('');
  const [selectedBookForCopiesModal, setSelectedBookForCopiesModal] = useState<Book | null>(null);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    accessionNumber: string;
    title: string;
    author: string;
    language: 'Hindi' | 'English' | 'Other';
    publisher: string;
    publisherNumber: string;
    category: string;
    subCategory: string;
    price: number;
    supplier: string;
    shelfLocation: string;
    coverImage: string;
    totalCopies: number;
    isActive: boolean;
  }>({
    accessionNumber: '',
    title: '',
    author: '',
    language: 'English',
    publisher: '',
    publisherNumber: '',
    category: '',
    subCategory: '',
    price: 250,
    supplier: '',
    shelfLocation: '',
    coverImage: '',
    totalCopies: 5,
    isActive: true,
  });

  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFormError('Image file size exceeds 8MB limit.');
      return;
    }

    try {
      setUploadingImage(true);
      setFormError('');
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await uploadService.uploadImage(base64Data, file.name);
          if (res && res.url) {
            setFormData((prev) => ({ ...prev, coverImage: res.url }));
          } else {
            setFormError('Failed to upload image to ImageKit.');
          }
        } catch (err: any) {
          setFormError('ImageKit Upload Error: ' + (err.response?.data?.message || err.message));
        } finally {
          setUploadingImage(false);
        }
      };
    } catch {
      setUploadingImage(false);
      setFormError('Failed to process image file.');
    }
  };

  // Live sequential serial generator preview for Add Book modal
  const generatedAddSerialsPreview = useMemo(() => {
    const base = (formData.accessionNumber || '').trim().toUpperCase();
    const count = Math.min(Math.max(formData.totalCopies || 1, 1), 200);
    if (!base) return [];

    const match = base.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const padLen = numStr.length;
      const startNum = parseInt(numStr, 10);
      const list: string[] = [];
      for (let i = 0; i < count; i++) {
        list.push(`${prefix}${String(startNum + i).padStart(padLen, '0')}`);
      }
      return list;
    } else {
      const list: string[] = [];
      for (let i = 1; i <= count; i++) {
        list.push(`${base}-${i}`);
      }
      return list;
    }
  }, [formData.accessionNumber, formData.totalCopies]);

  const fetchMasters = async () => {
    try {
      const [catsData, supsData, shelvesData] = await Promise.all([
        categoryService.getAll(false),
        supplierService.getAll(false),
        shelfService.getAll(false),
      ]);
      setCategories(catsData);
      setSuppliers(supsData);
      setShelves(shelvesData);
    } catch (err) {
      console.error('Failed to load master metadata:', err);
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await bookService.getAll({
        search: search.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        language: selectedLanguage !== 'all' ? selectedLanguage : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        supplier: selectedSupplier !== 'all' ? selectedSupplier : undefined,
        shelfLocation: selectedShelf !== 'all' ? selectedShelf : undefined,
      });
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [search, selectedCategory, selectedLanguage, selectedStatus, selectedSupplier, selectedShelf]);

  // Overall catalog summary stats
  const catalogStats = useMemo(() => {
    let totalTitles = books.length;
    let totalCopies = 0;
    let availableCopies = 0;
    let assignedCopies = 0;
    let totalValue = 0;
    let availableValue = 0;

    books.forEach((b) => {
      totalCopies += b.totalCopies || 0;
      availableCopies += b.availableCopies || 0;
      assignedCopies += b.assignedCopies || 0;
      const pr = b.price || 0;
      totalValue += pr * (b.totalCopies || 0);
      availableValue += pr * (b.availableCopies || 0);
    });

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      assignedCopies,
      totalValue,
      availableValue,
    };
  }, [books]);

  const handleOpenAddModal = async () => {
    setFormError('');
    const pfx = settings?.accessionPrefix || 'ACC';
    const start = settings?.accessionStartNumber !== undefined ? settings.accessionStartNumber : 1;
    const pad = settings?.accessionPadding || 4;
    const sep = settings?.accessionSeparator !== undefined ? settings.accessionSeparator : '-';
    let nextAcc = `${pfx}${sep}${String(start).padStart(pad, '0')}`;

    try {
      const acc = await bookService.getNextAccession();
      if (acc) nextAcc = acc;
    } catch {
      // fallback to constructed default
    }

    setFormData({
      accessionNumber: nextAcc,
      title: '',
      author: '',
      language: 'English',
      publisher: '',
      publisherNumber: '',
      category: categories.length > 0 ? categories[0]._id : '',
      subCategory: '',
      price: 250,
      supplier: suppliers.length > 0 ? suppliers[0]._id : '',
      shelfLocation: shelves.length > 0 ? shelves[0].name : 'Shelf A-1',
      coverImage: '',
      totalCopies: 5,
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (book: Book) => {
    setFormError('');
    setCurrentBook(book);
    const supId = typeof book.supplier === 'object' && book.supplier !== null
      ? book.supplier._id
      : (typeof book.supplier === 'string' ? book.supplier : '');

    setFormData({
      accessionNumber: book.accessionNumber || '',
      title: book.title,
      author: book.author,
      language: book.language,
      publisher: book.publisher || '',
      publisherNumber: book.publisherNumber || '',
      category: typeof book.category === 'object' && book.category !== null ? book.category._id : (book.category as string),
      subCategory: book.subCategory || '',
      price: book.price !== undefined ? book.price : 250,
      supplier: supId,
      shelfLocation: book.shelfLocation || '',
      coverImage: book.coverImage || '',
      totalCopies: book.totalCopies,
      isActive: book.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Book title is required.');
      return;
    }
    if (!formData.author.trim()) {
      setFormError('Author name is required.');
      return;
    }
    if (!formData.category) {
      setFormError('Please select a book category.');
      return;
    }
    if (formData.totalCopies <= 0) {
      setFormError('Total quantity/copies must be at least 1.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await bookService.create(formData);
      setIsAddModalOpen(false);
      setFeedbackMessage({ type: 'success', text: `Book "${formData.title}" added to library catalog!` });
      fetchBooks();
      fetchMasters();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBook) return;

    if (!formData.title.trim() || !formData.author.trim() || !formData.category) {
      setFormError('Title, Author, and Category are required.');
      return;
    }

    if (formData.totalCopies < currentBook.assignedCopies) {
      setFormError(
        `Total copies cannot be less than currently assigned copies (${currentBook.assignedCopies}).`
      );
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await bookService.update(currentBook._id, formData);
      setIsEditModalOpen(false);
      setFeedbackMessage({ type: 'success', text: `Book "${formData.title}" updated successfully!` });
      fetchBooks();
      fetchMasters();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBookStatus = async (book: Book) => {
    try {
      const newStatus = !book.isActive;
      await bookService.update(book._id, { isActive: newStatus });
      setFeedbackMessage({
        type: 'success',
        text: `Book "${book.title}" status changed to ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`,
      });
      fetchBooks();
      fetchMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update book status.');
    }
  };

  const toggleExpandBook = (bookId: string) => {
    setExpandedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const handleReturnCopy = async (book: Book, copy: any) => {
    const confirmReturn = window.confirm(
      `Are you sure you want to return copy "${copy.accessionNumber}" of "${book.title}" back to library inventory?`
    );
    if (!confirmReturn) return;

    try {
      setReturningCopyAcc(copy.accessionNumber);
      setFormError('');

      let assignmentIdToReturn = copy.assignmentId;

      if (!assignmentIdToReturn) {
        const activeAssignments = await assignmentService.getAll({
          bookId: book._id,
          status: 'assigned',
        });
        const matched = activeAssignments.find(
          (a) =>
            a.accessionNumber === copy.accessionNumber ||
            a.copyNumber === copy.copyNumber ||
            (typeof a.member === 'object' &&
              a.member?._id ===
                (typeof copy.assignedTo === 'object'
                  ? copy.assignedTo?._id
                  : copy.assignedTo))
        );
        if (matched) {
          assignmentIdToReturn = matched._id;
        }
      }

      if (!assignmentIdToReturn) {
        alert(`Active assignment record not found for copy ${copy.accessionNumber}.`);
        return;
      }

      const res = await assignmentService.returnBook(assignmentIdToReturn, { finePaid: true });
      setFeedbackMessage({
        type: 'success',
        text: res.message || `Book copy ${copy.accessionNumber} returned to inventory!`,
      });

      await fetchBooks();
      await fetchMasters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to return book copy.');
    } finally {
      setReturningCopyAcc(null);
    }
  };

  const handleQuickAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryForm.name.trim()) {
      setAddCategoryError('Category name is required.');
      return;
    }

    try {
      setCreatingCategory(true);
      setAddCategoryError('');
      const subCatArray = newCategoryForm.subCategories
        ? newCategoryForm.subCategories
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const newCategory = await categoryService.create({
        name: newCategoryForm.name.trim(),
        description: newCategoryForm.description.trim(),
        subCategories: subCatArray,
        isActive: true,
      });

      await fetchMasters();

      setFormData((prev) => ({
        ...prev,
        category: newCategory._id,
        subCategory: newCategory.subCategories && newCategory.subCategories.length > 0 ? newCategory.subCategories[0] : '',
      }));

      setFeedbackMessage({
        type: 'success',
        text: `Category "${newCategory.name}" created and selected!`,
      });
      setIsQuickCategoryModalOpen(false);
      setNewCategoryForm({ name: '', description: '', subCategories: '' });
    } catch (err: any) {
      setAddCategoryError(err.response?.data?.message || 'Failed to create category.');
    } finally {
      setCreatingCategory(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback banner */}
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

      {/* Main View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="tab-book-catalog"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Books Catalog ({books.length})</span>
          </button>

          <button
            type="button"
            id="tab-book-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Inventory & Asset Analytics</span>
          </button>
        </div>

        {activeTab === 'catalog' && (
          <div className="flex items-center gap-2.5">
            <button
              id="bulk-import-books-btn"
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Bulk Import Excel</span>
            </button>

            <button
              id="add-book-btn"
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Book</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'analytics' ? (
        <BookAnalyticsView />
      ) : (
        <>
          {/* Quick Summary Cards on Catalog - Multi-Colored Dabang Style */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="bg-[#FFE2E5] p-3 sm:p-3.5 rounded-2xl border border-[#F8CCD0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wide">Titles</span>
                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-rose-950 mt-1">{catalogStats.totalTitles}</p>
              <span className="text-[9px] text-rose-700 font-semibold mt-0.5">Active Catalog</span>
            </div>

            <div className="bg-[#FFF4DE] p-3 sm:p-3.5 rounded-2xl border border-[#FFE7B8] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wide">Total Stock</span>
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-amber-950 mt-1">{catalogStats.totalCopies} <span className="text-[11px] font-semibold text-amber-800">Copies</span></p>
              <span className="text-[9px] text-amber-700 font-semibold mt-0.5">Physical Inventory</span>
            </div>

            <div className="bg-[#DCFCE7] p-3 sm:p-3.5 rounded-2xl border border-[#BBF7D0] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Available</span>
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-emerald-950 mt-1">{catalogStats.availableCopies} <span className="text-[11px] font-semibold text-emerald-800">Copies</span></p>
              <span className="text-[9px] text-emerald-700 font-semibold mt-0.5">Ready to Issue</span>
            </div>

            <div className="bg-[#F3E8FF] p-3 sm:p-3.5 rounded-2xl border border-[#E9D5FF] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-purple-800 uppercase tracking-wide">Catalog Value</span>
                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-xs">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-purple-950 mt-1">₹{catalogStats.totalValue.toLocaleString('en-IN')}</p>
              <span className="text-[9px] text-purple-700 font-semibold mt-0.5">All Book Assets</span>
            </div>

            <div className="bg-[#E0F2FE] p-3 sm:p-3.5 rounded-2xl border border-[#BAE6FD] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-sky-800 uppercase tracking-wide">In-Stock Value</span>
                <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-sky-950 mt-1">₹{catalogStats.availableValue.toLocaleString('en-IN')}</p>
              <span className="text-[9px] text-sky-700 font-semibold mt-0.5">Current Shelf Worth</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              {/* Search Input */}
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="book-search-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, accession no, author..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  id="book-category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Filter */}
              <div>
                <select
                  id="book-supplier-filter"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shelf Location Filter */}
              <div>
                <select
                  id="book-shelf-filter"
                  value={selectedShelf}
                  onChange={(e) => setSelectedShelf(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Shelves</option>
                  {shelves.map((sh) => (
                    <option key={sh._id} value={sh.name}>
                      {sh.name} {sh.floorOrRoom ? `(${sh.floorOrRoom})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  id="book-status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Availability</option>
                  <option value="available">In Stock (Available)</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Books Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2.5 text-xs font-medium">Fetching books from catalog...</span>
              </div>
            ) : books.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  id="empty-books"
                  icon={BookOpen}
                  title="No books found"
                  description={
                    search || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedSupplier !== 'all' || selectedShelf !== 'all'
                      ? 'Try adjusting your search criteria or clearing filters.'
                      : 'Get started by cataloging your first book copy in the library.'
                  }
                  actionLabel={
                    search || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedSupplier !== 'all' || selectedShelf !== 'all'
                      ? 'Reset Filters'
                      : 'Add New Book'
                  }
                  onAction={
                    search || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedSupplier !== 'all' || selectedShelf !== 'all'
                      ? () => {
                          setSearch('');
                          setSelectedCategory('all');
                          setSelectedLanguage('all');
                          setSelectedStatus('all');
                          setSelectedSupplier('all');
                          setSelectedShelf('all');
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
                      <th className="py-3.5 px-4">Accession No & Title</th>
                      <th className="py-3.5 px-3">Author & Publisher</th>
                      <th className="py-3.5 px-3">Category & Lang</th>
                      <th className="py-3.5 px-3">Price & Supplier</th>
                      <th className="py-3.5 px-3">Shelf Location</th>
                      <th className="py-3.5 px-2 text-center">Total</th>
                      <th className="py-3.5 px-2 text-center">Available</th>
                      <th className="py-3.5 px-2 text-center">Assigned</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {books.map((book) => {
                      const isExpanded = expandedBookIds.includes(book._id);
                      const categoryName =
                        typeof book.category === 'object' && book.category !== null
                          ? book.category.name
                          : 'General';

                      const supplierName =
                        typeof book.supplier === 'object' && book.supplier !== null
                          ? book.supplier.name
                          : (book.supplier || 'Standard Supplier');

                      return (
                        <React.Fragment key={book._id}>
                          <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50/80'}`}>
                            {/* Accession No & Title */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-start gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandBook(book._id)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer mt-0.5 shrink-0 ${
                                    isExpanded
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border-slate-200'
                                  }`}
                                  title={isExpanded ? "Collapse copy details" : "Expand to view all copies & issued student details"}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>

                                {book.coverImage ? (
                                  <img
                                    src={book.coverImage}
                                    alt={book.title}
                                    className="w-10 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0 bg-slate-100 mt-0.5"
                                  />
                                ) : (
                                  <div className="w-10 h-14 rounded-lg border border-slate-200 bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5 shadow-2xs">
                                    <BookOpen className="w-5 h-5 text-indigo-500" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                                      {book.copiesList && book.copiesList.length > 1
                                        ? `${book.copiesList[0]?.accessionNumber} ~ ${book.copiesList[book.copiesList.length - 1]?.accessionNumber}`
                                        : book.accessionNumber || 'ACC-N/A'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandBook(book._id)}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer transition-all flex items-center gap-1 ${
                                        isExpanded
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                          : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
                                      }`}
                                      title="Click to expand/collapse copy status"
                                    >
                                      <Hash className="w-3 h-3" />
                                      <span>{book.totalCopies} {book.totalCopies === 1 ? 'Copy' : 'Copies'}</span>
                                      {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                                    </button>
                                  </div>
                                  <div className="font-bold text-slate-900 text-sm leading-snug">
                                    {book.title}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Author & Publisher */}
                            <td className="py-3.5 px-3">
                              <div className="font-semibold text-slate-800">
                                By {book.author}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {book.publisher || 'Publisher N/A'}{' '}
                                {book.publisherNumber ? `• ${book.publisherNumber}` : ''}
                              </div>
                            </td>

                            {/* Category & Language */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col items-start gap-1">
                                <Badge variant="purple" size="sm">
                                  {categoryName}
                                </Badge>
                                {book.subCategory && (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                                    {book.subCategory}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-1">
                                Lang: {book.language}
                              </div>
                            </td>

                            {/* Price & Supplier */}
                            <td className="py-3.5 px-3">
                              <div className="font-mono font-bold text-slate-900 text-xs">
                                ₹{(book.price || 0).toLocaleString('en-IN')}
                              </div>
                              <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                                <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[120px]" title={supplierName}>
                                  {supplierName}
                                </span>
                              </div>
                            </td>

                            {/* Shelf Location */}
                            <td className="py-3.5 px-3">
                              {book.shelfLocation ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-800 font-bold border border-purple-200 text-[11px]">
                                  <Archive className="w-3 h-3 text-purple-600" />
                                  <span>{book.shelfLocation}</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                              )}
                            </td>

                            {/* Total Copies */}
                            <td className="py-3.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandBook(book._id)}
                                className="font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer"
                                title="Click to expand copy details"
                              >
                                {book.totalCopies}
                              </button>
                            </td>

                            {/* Available Copies */}
                            <td className="py-3.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandBook(book._id)}
                                className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs cursor-pointer transition-all hover:scale-105 ${
                                  book.availableCopies > 0
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                                title="Click to view copy details"
                              >
                                {book.availableCopies}
                              </button>
                            </td>

                            {/* Assigned */}
                            <td className="py-3.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandBook(book._id)}
                                className="font-semibold text-blue-700 hover:text-indigo-800 hover:underline cursor-pointer"
                                title="Click to view assigned copy details"
                              >
                                {book.assignedCopies}
                              </button>
                            </td>

                            {/* Status Toggle */}
                            <td className="py-3.5 px-3">
                              <button
                                type="button"
                                onClick={() => handleToggleBookStatus(book)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shadow-2xs ${
                                  book.isActive
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                                }`}
                                title={book.isActive ? "Click to set INACTIVE" : "Click to set ACTIVE"}
                              >
                                <span className={`w-2 h-2 rounded-full ${book.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                <span>{book.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  id={`edit-book-${book._id}`}
                                  type="button"
                                  onClick={() => handleOpenEditModal(book)}
                                  title="Edit Book Details"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* EXPANDED COPIES ACCORDION DRAWER (COMPACT LIST VIEW) */}
                          {isExpanded && (
                            <tr className="bg-indigo-50/30 border-b border-indigo-200/60">
                              <td colSpan={10} className="p-3">
                                <div className="bg-white rounded-2xl p-3 border border-indigo-100 shadow-xs space-y-2.5">
                                  {/* Drawer Header */}
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                                        <Layers className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-bold text-slate-900 text-xs">
                                            Copies List for <span className="text-indigo-600">{book.title}</span>
                                          </h4>
                                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                            {book.totalCopies} {book.totalCopies === 1 ? 'Copy' : 'Copies'}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                          Available: <span className="text-emerald-600 font-bold">{book.availableCopies}</span> | Issued: <span className="text-amber-600 font-bold">{book.assignedCopies}</span>
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedBookForCopiesModal(book);
                                          setIsCopiesModalOpen(true);
                                        }}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Info className="w-3 h-3" />
                                        <span>Full View Modal</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandBook(book._id)}
                                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                        <span>Collapse</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Compact Sub-Table List */}
                                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                          <th className="py-2 px-3 w-14">Copy #</th>
                                          <th className="py-2 px-3">Accession / Serial No</th>
                                          <th className="py-2 px-3">Status</th>
                                          <th className="py-2 px-3">Assigned To / Location</th>
                                          <th className="py-2 px-3">Issued Date</th>
                                          <th className="py-2 px-3">Due Date</th>
                                          <th className="py-2 px-3 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {(() => {
                                          const copies = book.copiesList && book.copiesList.length > 0
                                            ? book.copiesList
                                            : Array.from({ length: book.totalCopies }).map((_, idx) => ({
                                                copyNumber: idx + 1,
                                                accessionNumber: `${book.accessionNumber || 'ACC'}-${idx + 1}`,
                                                status: idx < book.availableCopies ? 'available' : 'assigned',
                                              }));

                                          return copies.map((copy, idx) => {
                                            const isAvailable = copy.status === 'available';
                                            const isAssigned = copy.status === 'assigned';
                                            const isLost = copy.status === 'lost';
                                            const isDamaged = copy.status === 'damaged';

                                            const memberObj: any = typeof copy.assignedTo === 'object' ? copy.assignedTo : null;
                                            const memberName = memberObj?.name || copy.assignedToName || '';
                                            const memberId = memberObj?.memberId || memberObj?.admissionNo || copy.assignedToId || '';
                                            const memberClass = memberObj?.className ? `Class ${memberObj.className}${memberObj.section ? '-' + memberObj.section : ''}` : '';

                                            return (
                                              <tr key={idx} className="hover:bg-indigo-50/40 transition-colors text-xs">
                                                <td className="py-2 px-3 font-semibold text-slate-400 text-[11px]">
                                                  #{copy.copyNumber || (idx + 1)}
                                                </td>
                                                <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">
                                                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                    <Hash className="w-3 h-3 text-slate-400" />
                                                    {copy.accessionNumber}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                  {isAvailable && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                      Available
                                                    </span>
                                                  )}
                                                  {isAssigned && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                      <UserCheck className="w-3 h-3 text-amber-600" />
                                                      Issued / On Loan
                                                    </span>
                                                  )}
                                                  {isLost && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                      Lost
                                                    </span>
                                                  )}
                                                  {isDamaged && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                      Damaged
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-slate-800 font-medium">
                                                  {isAssigned ? (
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="font-bold text-purple-950">{memberName || 'Student'}</span>
                                                      {(memberId || memberClass) && (
                                                        <span className="text-slate-500 text-[11px]">
                                                          ({memberId ? `ID: ${memberId}` : ''}{memberId && memberClass ? ' • ' : ''}{memberClass})
                                                        </span>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                                                      <Archive className="w-3 h-3 text-slate-400" />
                                                      Shelf: <strong className="text-slate-700">{book.shelfLocation || 'Shelf A-1'}</strong>
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-slate-600 text-[11px]">
                                                  {copy.assignedDate ? new Date(copy.assignedDate).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="py-2 px-3 font-semibold text-[11px]">
                                                  {copy.dueDate ? (
                                                    <span className="text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono font-bold">
                                                      {new Date(copy.dueDate).toLocaleDateString()}
                                                    </span>
                                                  ) : (
                                                    <span className="text-slate-400">—</span>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                  {isAssigned ? (
                                                    <button
                                                      type="button"
                                                      disabled={returningCopyAcc === copy.accessionNumber}
                                                      onClick={() => handleReturnCopy(book, copy)}
                                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                                      title="Return this book copy to library inventory"
                                                    >
                                                      <RotateCcw className={`w-3 h-3 ${returningCopyAcc === copy.accessionNumber ? 'animate-spin' : ''}`} />
                                                      <span>{returningCopyAcc === copy.accessionNumber ? 'Returning...' : 'Return Book'}</span>
                                                    </button>
                                                  ) : (
                                                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                      In Stock
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          });
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ADD BOOK MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Book to Catalog"
        subtitle="Register a new book with Accession Number, Price, Supplier, Shelf Location, and Stock"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* ImageKit Cover Photo Upload */}
          <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Book Cover Photo (ImageKit CDN)
              </span>
              {formData.coverImage && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, coverImage: '' })}
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Remove Photo
                </button>
              )}
            </label>

            <div className="flex items-center gap-3">
              {formData.coverImage ? (
                <div className="w-14 h-16 rounded-xl overflow-hidden border-2 border-indigo-200 shadow-xs shrink-0 relative group bg-white">
                  <img
                    src={formData.coverImage}
                    alt="Book Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, coverImage: '' })}
                      className="text-white p-1 rounded-full bg-rose-600 hover:bg-rose-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-14 h-16 rounded-xl border-2 border-dashed border-indigo-200 bg-white flex flex-col items-center justify-center shrink-0 text-slate-400 shadow-2xs">
                  <BookOpen className="w-5 h-5 text-indigo-300 mb-0.5" />
                  <span className="text-[8px] font-bold text-indigo-400">Cover</span>
                </div>
              )}

              <div className="flex-1 flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-500/20 active:scale-95">
                  <Upload className="w-4 h-4 text-indigo-200" />
                  <span>{uploadingImage ? 'Uploading to ImageKit CDN...' : 'Upload Book Cover Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                  />
                </label>
                {uploadingImage && <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Accession No / Book Serial <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-mono">
                  Prefix: {settings?.accessionPrefix || 'ACC'}
                </span>
              </div>
              <input
                id="add-book-accession"
                type="text"
                required
                value={formData.accessionNumber}
                onChange={(e) => setFormData({ ...formData, accessionNumber: e.target.value.toUpperCase() })}
                placeholder={`e.g. ${settings?.accessionPrefix || 'ACC'}-0001`}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-purple-900 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Auto-incremented based on Settings. Format: {settings?.accessionPrefix || 'ACC'}{settings?.accessionSeparator !== undefined ? settings.accessionSeparator : '-'}{String(settings?.accessionStartNumber !== undefined ? settings.accessionStartNumber : 1).padStart(settings?.accessionPadding || 4, '0')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Book Language <span className="text-rose-500">*</span>
              </label>
              <select
                id="add-book-language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Book Name / Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="add-book-title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Concepts of Physics Vol 1"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Author Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="add-book-author"
              type="text"
              required
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="e.g. Dr. H.C. Verma"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Category <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryForm({ name: '', description: '', subCategories: '' });
                    setAddCategoryError('');
                    setIsQuickCategoryModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Category</span>
                </button>
              </div>
              <select
                id="add-book-category"
                value={formData.category}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  const foundCat = categories.find((c) => c._id === newCatId);
                  setFormData({
                    ...formData,
                    category: newCatId,
                    subCategory: foundCat && foundCat.subCategories && foundCat.subCategories.length > 0 ? foundCat.subCategories[0] : '',
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sub-Category (Optional)
              </label>
              {(() => {
                const currentCat = categories.find((c) => c._id === formData.category);
                const subCats = currentCat?.subCategories || [];
                if (subCats.length > 0) {
                  return (
                    <select
                      id="add-book-subcategory"
                      value={formData.subCategory}
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">-- No Sub-Category --</option>
                      {subCats.map((sub, idx) => (
                        <option key={idx} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  );
                }
                return (
                  <input
                    id="add-book-subcategory-input"
                    type="text"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    placeholder="e.g. Fiction, Physics, Algebra"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                  />
                );
              })()}
            </div>
          </div>

          {/* Price & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Book Price / MRP (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  id="add-book-price"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 350"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Book Supplier / Vendor
              </label>
              <select
                id="add-book-supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                <option value="">-- Select Supplier / Vendor --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shelf Location & Copies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shelf / Rack Location
              </label>
              <input
                id="add-book-shelf"
                type="text"
                list="shelf-suggestions"
                value={formData.shelfLocation}
                onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                placeholder="e.g. Shelf A-1, Rack 3B"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
              <datalist id="shelf-suggestions">
                {shelves.map((sh) => (
                  <option key={sh._id} value={sh.name}>
                    {sh.floorOrRoom ? `${sh.name} (${sh.floorOrRoom})` : sh.name}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Quantity / Copies in Stock <span className="text-rose-500">*</span>
              </label>
              <input
                id="add-book-copies"
                type="number"
                min="1"
                required
                value={formData.totalCopies}
                onChange={(e) =>
                  setFormData({ ...formData, totalCopies: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Live Sequential Serial Numbers Preview */}
          {generatedAddSerialsPreview.length > 0 && (
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-purple-600" />
                  Generated Serial / Accession Numbers ({generatedAddSerialsPreview.length} Copies):
                </span>
                <span className="text-[10px] text-purple-700 font-semibold bg-white px-2 py-0.5 rounded border border-purple-200">
                  {generatedAddSerialsPreview[0]} ~ {generatedAddSerialsPreview[generatedAddSerialsPreview.length - 1]}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {generatedAddSerialsPreview.map((serial, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-[11px] font-bold text-purple-800 bg-white px-2 py-0.5 rounded-md border border-purple-200 shadow-2xs"
                  >
                    Copy #{idx + 1}: {serial}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-purple-600 italic">
                Each physical book copy will have its own unique serial number for tracking which student borrows which copy.
              </p>
            </div>
          )}

          {/* Publisher & ISBN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Publisher Name
              </label>
              <input
                id="add-book-publisher"
                type="text"
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                placeholder="e.g. NCERT / Oxford University Press"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ISBN / Edition No
              </label>
              <input
                id="add-book-isbn"
                type="text"
                value={formData.publisherNumber}
                onChange={(e) => setFormData({ ...formData, publisherNumber: e.target.value })}
                placeholder="e.g. 978-817450"
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
              id="save-new-book-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Add Book to Catalog'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT BOOK MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Book Details"
        subtitle={`Updating: ${currentBook?.title}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* ImageKit Cover Photo Upload */}
          <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Book Cover Photo (ImageKit CDN)
              </span>
              {formData.coverImage && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, coverImage: '' })}
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Remove Photo
                </button>
              )}
            </label>

            <div className="flex items-center gap-3">
              {formData.coverImage ? (
                <div className="w-14 h-16 rounded-xl overflow-hidden border-2 border-indigo-200 shadow-xs shrink-0 relative group bg-white">
                  <img
                    src={formData.coverImage}
                    alt="Book Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, coverImage: '' })}
                      className="text-white p-1 rounded-full bg-rose-600 hover:bg-rose-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-14 h-16 rounded-xl border-2 border-dashed border-indigo-200 bg-white flex flex-col items-center justify-center shrink-0 text-slate-400 shadow-2xs">
                  <BookOpen className="w-5 h-5 text-indigo-300 mb-0.5" />
                  <span className="text-[8px] font-bold text-indigo-400">Cover</span>
                </div>
              )}

              <div className="flex-1 flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-500/20 active:scale-95">
                  <Upload className="w-4 h-4 text-indigo-200" />
                  <span>{uploadingImage ? 'Uploading to ImageKit CDN...' : 'Upload Book Cover Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                  />
                </label>
                {uploadingImage && <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Accession Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-book-accession"
                type="text"
                required
                value={formData.accessionNumber}
                onChange={(e) => setFormData({ ...formData, accessionNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-blue-700 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
              <select
                id="edit-book-language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Book Name / Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-book-title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Author Name</label>
            <input
              id="edit-book-author"
              type="text"
              required
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Category <span className="text-rose-500">*</span></label>
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryForm({ name: '', description: '', subCategories: '' });
                    setAddCategoryError('');
                    setIsQuickCategoryModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Category</span>
                </button>
              </div>
              <select
                id="edit-book-category"
                value={formData.category}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  const foundCat = categories.find((c) => c._id === newCatId);
                  setFormData({
                    ...formData,
                    category: newCatId,
                    subCategory: foundCat && foundCat.subCategories && foundCat.subCategories.length > 0 ? foundCat.subCategories[0] : '',
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Category</label>
              {(() => {
                const currentCat = categories.find((c) => c._id === formData.category);
                const subCats = currentCat?.subCategories || [];
                if (subCats.length > 0) {
                  return (
                    <select
                      id="edit-book-subcategory"
                      value={formData.subCategory}
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">-- No Sub-Category --</option>
                      {subCats.map((sub, idx) => (
                        <option key={idx} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  );
                }
                return (
                  <input
                    id="edit-book-subcategory-input"
                    type="text"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    placeholder="e.g. Fiction, Physics, Algebra"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                  />
                );
              })()}
            </div>
          </div>

          {/* Price & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Book Price / MRP (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  id="edit-book-price"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Book Supplier / Vendor
              </label>
              <select
                id="edit-book-supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                <option value="">-- Select Supplier / Vendor --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shelf & Copies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shelf / Rack Location
              </label>
              <input
                id="edit-book-shelf"
                type="text"
                list="shelf-suggestions-edit"
                value={formData.shelfLocation}
                onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                placeholder="e.g. Shelf A-1, Rack 3B"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
              <datalist id="shelf-suggestions-edit">
                {shelves.map((sh) => (
                  <option key={sh._id} value={sh.name}>
                    {sh.floorOrRoom ? `${sh.name} (${sh.floorOrRoom})` : sh.name}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Copies</label>
              <input
                id="edit-book-copies"
                type="number"
                min="1"
                required
                value={formData.totalCopies}
                onChange={(e) =>
                  setFormData({ ...formData, totalCopies: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status & Publisher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Publisher</label>
              <input
                id="edit-book-publisher"
                type="text"
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catalog Status</label>
              <select
                id="edit-book-status"
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
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
              id="save-edit-book-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer"
            >
              {submitting ? 'Updating...' : 'Update Book Details'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportBooksModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={(count) => {
          fetchBooks();
          fetchMasters();
          setFeedbackMessage({
            type: 'success',
            text: `Successfully imported ${count} books into catalog!`,
          });
        }}
      />

      {/* INDIVIDUAL BOOK COPIES & SERIAL NUMBERS MODAL */}
      <Modal
        isOpen={isCopiesModalOpen}
        onClose={() => {
          setIsCopiesModalOpen(false);
          setSelectedBookForCopiesModal(null);
        }}
        title="Physical Copies & Serial Numbers Tracker"
        subtitle={
          selectedBookForCopiesModal
            ? `Tracking all ${selectedBookForCopiesModal.totalCopies} individual copies of "${selectedBookForCopiesModal.title}"`
            : 'Book Copies Inventory'
        }
        maxWidth="2xl"
      >
        {selectedBookForCopiesModal && (
          <div className="space-y-4">
            {/* Book Overview Header Banner */}
            <div className="p-4 bg-linear-to-r from-purple-50 via-slate-50 to-indigo-50 border border-purple-100 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedBookForCopiesModal.title}
                  </h3>
                  <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>By {selectedBookForCopiesModal.author}</span>
                    <span>•</span>
                    <span>Shelf: {selectedBookForCopiesModal.shelfLocation || 'Unassigned'}</span>
                    <span>•</span>
                    <span className="font-mono font-bold text-purple-700">
                      Price: ₹{selectedBookForCopiesModal.price || 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {selectedBookForCopiesModal.availableCopies} Available
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold border border-blue-200">
                    {selectedBookForCopiesModal.assignedCopies} Assigned
                  </span>
                </div>
              </div>
            </div>

            {/* Copies List Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Copy #</th>
                      <th className="py-2.5 px-3">Serial / Accession No</th>
                      <th className="py-2.5 px-3">Inventory Status</th>
                      <th className="py-2.5 px-3">Assigned To (Student / Teacher)</th>
                      <th className="py-2.5 px-3">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(() => {
                      const copies =
                        selectedBookForCopiesModal.copiesList &&
                        selectedBookForCopiesModal.copiesList.length > 0
                          ? selectedBookForCopiesModal.copiesList
                          : Array.from({ length: selectedBookForCopiesModal.totalCopies || 1 }, (_, i) => ({
                              copyNumber: i + 1,
                              accessionNumber: selectedBookForCopiesModal.accessionNumber
                                ? `${selectedBookForCopiesModal.accessionNumber}`
                                : `COPY-${i + 1}`,
                              status:
                                i + 1 <= selectedBookForCopiesModal.availableCopies
                                  ? ('available' as const)
                                  : ('assigned' as const),
                              assignedToName: undefined,
                              assignedToId: undefined,
                              dueDate: undefined,
                            }));

                      return copies.map((copy) => {
                        const isAvail = copy.status === 'available';
                        const isAssigned = copy.status === 'assigned';
                        const isLost = copy.status === 'lost';
                        const isDamaged = copy.status === 'damaged';

                        return (
                          <tr key={copy.copyNumber} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-700">
                              #{copy.copyNumber}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs">
                                {copy.accessionNumber || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                  isAvail
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : isAssigned
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : isLost
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {isAvail ? '● Available' : isAssigned ? '● Issued' : isLost ? '● Lost' : '● Damaged'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {copy.assignedToName ? (
                                <div>
                                  <div className="font-bold text-slate-900">{copy.assignedToName}</div>
                                  {copy.assignedToId && (
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      ID: {copy.assignedToId}
                                    </div>
                                  )}
                                </div>
                              ) : isAvail ? (
                                <span className="text-slate-400 italic">In Library / Ready to Issue</span>
                              ) : (
                                <span className="text-slate-500 italic">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {copy.dueDate ? (
                                <span className="font-semibold text-slate-800">
                                  {new Date(copy.dueDate).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total: <strong>{selectedBookForCopiesModal.totalCopies}</strong> physical copies registered in catalog
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCopiesModalOpen(false);
                  setSelectedBookForCopiesModal(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* QUICK ADD CATEGORY MODAL */}
      <Modal
        isOpen={isQuickCategoryModalOpen}
        onClose={() => setIsQuickCategoryModalOpen(false)}
        title="Add New Book Category"
        subtitle="Create a new category to assign to books"
        maxWidth="sm"
      >
        <form onSubmit={handleQuickAddCategorySubmit} className="space-y-3.5">
          {addCategoryError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {addCategoryError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="quick-add-category-name"
              type="text"
              required
              value={newCategoryForm.name}
              onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
              placeholder="e.g. Science & Technology, Novels, General Knowledge"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sub-Categories (Optional)
            </label>
            <input
              id="quick-add-category-subcategories"
              type="text"
              value={newCategoryForm.subCategories}
              onChange={(e) => setNewCategoryForm({ ...newCategoryForm, subCategories: e.target.value })}
              placeholder="e.g. Physics, Chemistry, Biology (comma separated)"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Separate multiple sub-categories with commas.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="quick-add-category-desc"
              rows={2}
              value={newCategoryForm.description}
              onChange={(e) => setNewCategoryForm({ ...newCategoryForm, description: e.target.value })}
              placeholder="Brief description about this category..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsQuickCategoryModalOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-quick-category-btn"
              type="submit"
              disabled={creatingCategory}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-75 cursor-pointer flex items-center gap-1.5"
            >
              {creatingCategory ? 'Saving...' : 'Add & Select Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
