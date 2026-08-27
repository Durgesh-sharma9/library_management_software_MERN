import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Archive,
  DollarSign,
  Users,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Hash,
  Eye,
  X,
  ChevronRight,
  Info,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { Book, BookCopy, LostDamageLog, Assignment } from '../../types';
import { bookService, assignmentService, lostDamagedService, categoryService } from '../../services/api';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { StatCard } from '../../components/StatCard';

interface InventoryItem {
  copyNumber: number;
  accessionNumber: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  coverImage?: string;
  price: number;
  categoryName: string;
  subCategory?: string;
  shelfLocation: string;
  status: 'available' | 'assigned' | 'lost' | 'damaged';
  assignedToName?: string;
  assignedToId?: string;
  assignedToType?: 'student' | 'teacher';
  assignedDate?: string;
  dueDate?: string;
  incidentType?: string;
  incidentReason?: string;
  incidentDate?: string;
  fineAmount?: number;
  fineStatus?: string;
  rawBook: Book;
  rawCopy: BookCopy;
}

interface InventoryPageProps {
  onNavigateTab?: (tab: string, filters?: any) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [lostLogs, setLostLogs] = useState<LostDamageLog[]>([]);
  const [activeLoans, setActiveLoans] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'assigned' | 'damaged' | 'lost'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedShelf, setSelectedShelf] = useState<string>('all');

  // Audit Modal State
  const [selectedItemForAudit, setSelectedItemForAudit] = useState<InventoryItem | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bList, lLogs, aList, cList] = await Promise.all([
        bookService.getAll({ status: 'all' }),
        lostDamagedService.getLogs({ type: 'all' }),
        assignmentService.getAll({}),
        categoryService.getAll(false),
      ]);
      setBooks(bList);
      setLostLogs(lLogs);
      // Keep only active unreturned loans
      const activeOnly = aList.filter(
        (a) => (a.status === 'assigned' || a.status === 'overdue') && !a.returnedDate
      );
      setActiveLoans(activeOnly);
      setCategories(cList);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Flatten books into individual physical inventory items
  const inventoryItems = useMemo(() => {
    const items: InventoryItem[] = [];

    books.forEach((book) => {
      const catName =
        typeof book.category === 'object' && book.category !== null
          ? (book.category as any).name
          : 'General';

      const copies = Array.isArray(book.copiesList) && book.copiesList.length > 0
        ? book.copiesList
        : Array.from({ length: book.totalCopies || 1 }, (_, i) => ({
            copyNumber: i + 1,
            accessionNumber: book.accessionNumber ? `${book.accessionNumber}` : `COPY-${i + 1}`,
            status: (i < (book.availableCopies || 0) ? 'available' : 'assigned') as any,
          }));

      // Find all active loans for this book
      const bookActiveLoans = activeLoans.filter((a) => {
        const aBookId = typeof a.book === 'object' && a.book !== null ? (a.book as any)._id || a.book : a.book;
        return String(aBookId) === String(book._id);
      });

      const usedLoanIds = new Set<string>();

      copies.forEach((copy) => {
        // Match specific loan by accession or copyNumber
        let loanMatch = bookActiveLoans.find((a) => {
          if (usedLoanIds.has((a as any)._id)) return false;
          if (a.accessionNumber && copy.accessionNumber) {
            return a.accessionNumber.trim().toUpperCase() === copy.accessionNumber.trim().toUpperCase();
          }
          if (a.copyNumber && copy.copyNumber) {
            return Number(a.copyNumber) === Number(copy.copyNumber);
          }
          return false;
        });

        // Fallback: if not matched by accession but copy status is assigned or active loan exists for this book
        if (!loanMatch) {
          loanMatch = bookActiveLoans.find((a) => !usedLoanIds.has((a as any)._id));
        }

        if (loanMatch) {
          usedLoanIds.add((loanMatch as any)._id);
        }

        // Match lost/damaged log for this book/copy
        const logMatch = lostLogs.find((l) => {
          const lBookId = typeof l.book === 'object' && l.book !== null ? (l.book as any)._id || l.book : l.book;
          const isB = String(lBookId) === String(book._id);
          if (!isB) return false;
          if (l.assignment?.accessionNumber && copy.accessionNumber) {
            return l.assignment.accessionNumber.trim().toUpperCase() === copy.accessionNumber.trim().toUpperCase();
          }
          return true;
        });

        let itemStatus: 'available' | 'assigned' | 'lost' | 'damaged' = copy.status || 'available';
        if (loanMatch) itemStatus = 'assigned';
        else if (logMatch && (logMatch.type === 'lost' || logMatch.type === 'damaged')) {
          itemStatus = logMatch.type;
        }

        const memberObj = loanMatch ? (typeof loanMatch.member === 'object' ? loanMatch.member : null) : null;

        const formatDateStr = (dateVal?: any) => {
          if (!dateVal) return undefined;
          const d = new Date(dateVal);
          if (isNaN(d.getTime())) return undefined;
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        items.push({
          copyNumber: copy.copyNumber,
          accessionNumber: copy.accessionNumber,
          bookId: book._id,
          bookTitle: book.title,
          bookAuthor: book.author,
          coverImage: book.coverImage,
          price: book.price || 0,
          categoryName: catName,
          subCategory: book.subCategory,
          shelfLocation: copy.shelfLocation || book.shelfLocation || 'Unassigned',
          status: itemStatus,
          assignedToName: memberObj?.name || copy.assignedToName || (loanMatch ? 'Assigned Member' : undefined),
          assignedToId: memberObj?.memberId || (memberObj as any)?.admissionNo || copy.assignedToId,
          assignedToType: memberObj?.memberType || 'student',
          assignedDate: formatDateStr(loanMatch?.assignedDate),
          dueDate: formatDateStr(loanMatch?.dueDate),
          incidentType: logMatch?.type,
          incidentReason: logMatch?.reason,
          incidentDate: formatDateStr(logMatch?.createdAt),
          fineAmount: logMatch?.fineAmount,
          fineStatus: logMatch?.fineStatus,
          rawBook: book,
          rawCopy: copy,
        });
      });
    });

    return items;
  }, [books, lostLogs, activeLoans]);

  // Extract unique shelf locations
  const shelvesList = useMemo(() => {
    const list = new Set<string>();
    inventoryItems.forEach((item) => {
      if (item.shelfLocation && item.shelfLocation !== 'Unassigned') {
        list.add(item.shelfLocation);
      }
    });
    return Array.from(list).sort();
  }, [inventoryItems]);

  // Overall Inventory Stock Summary Metrics
  const summary = useMemo(() => {
    let totalItems = inventoryItems.length;
    let availableCount = 0;
    let assignedCount = 0;
    let damagedCount = 0;
    let lostCount = 0;
    let totalWorth = 0;

    inventoryItems.forEach((item) => {
      totalWorth += item.price;
      if (item.status === 'available') availableCount++;
      else if (item.status === 'assigned') assignedCount++;
      else if (item.status === 'damaged') damagedCount++;
      else if (item.status === 'lost') lostCount++;
    });

    return {
      totalTitles: books.length,
      totalItems,
      availableCount,
      assignedCount,
      damagedCount,
      lostCount,
      totalWorth,
    };
  }, [inventoryItems, books]);

  // Filtered Items for Audit Table
  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && item.categoryName !== selectedCategory) return false;
      if (selectedShelf !== 'all' && item.shelfLocation !== selectedShelf) return false;

      if (search.trim() !== '') {
        const query = search.toLowerCase().trim();
        const accMatch = item.accessionNumber.toLowerCase().includes(query);
        const titleMatch = item.bookTitle.toLowerCase().includes(query);
        const authorMatch = item.bookAuthor.toLowerCase().includes(query);
        const holderMatch = (item.assignedToName || '').toLowerCase().includes(query);
        const holderIdMatch = (item.assignedToId || '').toLowerCase().includes(query);
        const shelfMatch = item.shelfLocation.toLowerCase().includes(query);

        return accMatch || titleMatch || authorMatch || holderMatch || holderIdMatch || shelfMatch;
      }

      return true;
    });
  }, [inventoryItems, selectedStatus, selectedCategory, selectedShelf, search]);

  const handleOpenAuditModal = (item: InventoryItem) => {
    setSelectedItemForAudit(item);
    setIsAuditModalOpen(true);
  };

  const exportCSV = () => {
    if (filteredItems.length === 0) {
      alert('No inventory items to export.');
      return;
    }

    const headers = [
      'Accession No',
      'Book Title',
      'Author',
      'Category',
      'Shelf Location',
      'Status',
      'Assigned To / Borrower',
      'Member ID',
      'Issue Date',
      'Due Date',
      'Price (INR)',
    ];

    const rows = filteredItems.map((item) => [
      `"${item.accessionNumber}"`,
      `"${item.bookTitle.replace(/"/g, '""')}"`,
      `"${item.bookAuthor.replace(/"/g, '""')}"`,
      `"${item.categoryName}"`,
      `"${item.shelfLocation}"`,
      `"${item.status.toUpperCase()}"`,
      `"${item.assignedToName || '—'}"`,
      `"${item.assignedToId || '—'}"`,
      `"${item.assignedDate || '—'}"`,
      `"${item.dueDate || '—'}"`,
      item.price,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Library_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            <span>360° Library Inventory & Physical Stock Audit</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete physical copy tracking: Available, Issued, Damaged, and Lost copies with location & borrower history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Inventory CSV</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Books</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{summary.totalTitles}</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{summary.totalItems} Total Physical Copies</div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700">{summary.availableCount}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Ready for Issue on Shelf</div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Issued</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-700">{summary.assignedCount}</div>
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">With Students / Faculty</div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Damaged</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-700">{summary.damagedCount}</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Recorded Repairs/Damage</div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lost Copies</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-700">{summary.lostCount}</div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Deducted Stock Copies</div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50/60 rounded-2xl border border-purple-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Valuation</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-900">₹{summary.totalWorth.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-purple-700 font-semibold mt-0.5">Total Physical Asset Value</div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Accession No., Book Title, Author, Borrower Name, ID, or Shelf Location..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Condition Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({inventoryItems.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Available ({summary.availableCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('assigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'assigned'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Issued ({summary.assignedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('damaged')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'damaged'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Damaged ({summary.damagedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('lost')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'lost'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Lost ({summary.lostCount})
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">Shelf Location:</span>
            <select
              value={selectedShelf}
              onChange={(e) => setSelectedShelf(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Shelves</option>
              {shelvesList.map((shelf) => (
                <option key={shelf} value={shelf}>
                  {shelf}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedStatus !== 'all' || selectedCategory !== 'all' || selectedShelf !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedStatus('all');
                setSelectedCategory('all');
                setSelectedShelf('all');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* PHYSICAL COPIES AUDIT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-medium">Loading inventory records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Boxes className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No inventory copies match the selected filters.</p>
            <p className="text-xs text-slate-400">Try clearing your search term or switching condition filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Copy Accession & Book Title</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Condition / Status</th>
                  <th className="py-3.5 px-4">Current Location / Borrower Details</th>
                  <th className="py-3.5 px-3 text-right">Price Value</th>
                  <th className="py-3.5 px-4 text-center">Audit Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item, idx) => {
                  return (
                    <tr key={`${item.bookId}-${item.accessionNumber}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* Accession No & Book Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          {item.coverImage ? (
                            <img
                              src={item.coverImage}
                              alt={item.bookTitle}
                              className="w-8 h-11 object-cover rounded border border-slate-200 shrink-0 bg-slate-100 mt-0.5"
                            />
                          ) : (
                            <div className="w-8 h-11 rounded border border-slate-200 bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-500 mt-0.5">
                              <BookOpen className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                                #{item.accessionNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">Copy #{item.copyNumber}</span>
                            </div>
                            <div className="font-bold text-slate-900 text-xs leading-snug">{item.bookTitle}</div>
                            <div className="text-[11px] text-slate-500">By {item.bookAuthor}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <Badge variant="purple" size="sm">
                          {item.categoryName}
                        </Badge>
                        {item.subCategory && (
                          <div className="text-[10px] text-slate-500 mt-1 font-medium">{item.subCategory}</div>
                        )}
                      </td>

                      {/* Condition Status Badge */}
                      <td className="py-3 px-3">
                        {item.status === 'available' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Available</span>
                          </span>
                        )}

                        {item.status === 'assigned' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Issued</span>
                          </span>
                        )}

                        {item.status === 'damaged' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            <span>Damaged</span>
                          </span>
                        )}

                        {item.status === 'lost' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Lost Copy</span>
                          </span>
                        )}
                      </td>

                      {/* Holder / Location Details */}
                      <td className="py-3 px-4">
                        {item.status === 'available' && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Archive className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px]">
                              {item.shelfLocation}
                            </span>
                          </div>
                        )}

                        {item.status === 'assigned' && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {item.assignedToType === 'teacher' ? (
                                <Briefcase className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              ) : (
                                <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              )}
                              <span className="font-bold text-slate-900">{item.assignedToName || 'Student/Borrower'}</span>
                              {item.assignedToId && (
                                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                                  {item.assignedToId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>Issued: {item.assignedDate || '—'}</span>
                              <span>•</span>
                              <span className="text-rose-600 font-semibold">Due: {item.dueDate || '—'}</span>
                            </div>
                          </div>
                        )}

                        {(item.status === 'damaged' || item.status === 'lost') && (
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-800 font-medium leading-tight">
                              {item.incidentReason || `${item.status.toUpperCase()} copy incident reported`}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>Reported: {item.incidentDate || '—'}</span>
                              {item.fineAmount !== undefined && item.fineAmount > 0 && (
                                <span className="text-rose-600 font-bold">Fine: ₹{item.fineAmount}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Price Value */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{item.price.toLocaleString('en-IN')}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenAuditModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold rounded-lg text-[11px] transition-colors cursor-pointer border border-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit Log</span>
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

      {/* PHYSICAL COPY AUDIT MODAL */}
      {selectedItemForAudit && (
        <Modal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          title={`Physical Copy Audit: ${selectedItemForAudit.accessionNumber}`}
          subtitle={`Detailed audit log & status history for Copy #${selectedItemForAudit.copyNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Copy Card Summary Header */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              {selectedItemForAudit.coverImage ? (
                <img
                  src={selectedItemForAudit.coverImage}
                  alt={selectedItemForAudit.bookTitle}
                  className="w-12 h-16 object-cover rounded-lg border border-slate-200 shrink-0 bg-white shadow-2xs"
                />
              ) : (
                <div className="w-12 h-16 rounded-lg border border-slate-200 bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-500 shadow-2xs">
                  <BookOpen className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                    #{selectedItemForAudit.accessionNumber}
                  </span>
                  <Badge
                    variant={
                      selectedItemForAudit.status === 'available'
                        ? 'success'
                        : selectedItemForAudit.status === 'assigned'
                        ? 'info'
                        : selectedItemForAudit.status === 'damaged'
                        ? 'warning'
                        : 'error'
                    }
                    size="sm"
                  >
                    {selectedItemForAudit.status.toUpperCase()}
                  </Badge>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">{selectedItemForAudit.bookTitle}</h4>
                <p className="text-slate-500 font-medium">By {selectedItemForAudit.bookAuthor}</p>
                <div className="text-[11px] text-slate-600 flex items-center gap-3 pt-1">
                  <span>Category: <strong>{selectedItemForAudit.categoryName}</strong></span>
                  <span>•</span>
                  <span>Shelf: <strong>{selectedItemForAudit.shelfLocation}</strong></span>
                  <span>•</span>
                  <span>Asset Value: <strong>₹{selectedItemForAudit.price}</strong></span>
                </div>
              </div>
            </div>

            {/* Current Status Breakdown */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
              <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Current Status & Allocation Details</span>
              </h5>

              {selectedItemForAudit.status === 'available' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 leading-relaxed">
                  ✅ Physical copy is in excellent condition and currently resting on <strong>{selectedItemForAudit.shelfLocation}</strong>, available for immediate circulation.
                </div>
              )}

              {selectedItemForAudit.status === 'assigned' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1 text-blue-900">
                  <div>
                    Currently issued to: <strong>{selectedItemForAudit.assignedToName}</strong> ({selectedItemForAudit.assignedToId || 'Member'})
                  </div>
                  <div className="text-[11px] text-blue-800">
                    Issued Date: <strong>{selectedItemForAudit.assignedDate}</strong> | Scheduled Due Date: <strong>{selectedItemForAudit.dueDate}</strong>
                  </div>
                </div>
              )}

              {selectedItemForAudit.status === 'damaged' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-amber-900">
                  <div>
                    Condition: <strong>Damaged Copy Recorded</strong>
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Reason / Note: {selectedItemForAudit.incidentReason || 'Damage reported'}
                  </div>
                  {selectedItemForAudit.fineAmount !== undefined && (
                    <div className="text-[11px] text-amber-900 font-bold">
                      Fine Assessed: ₹{selectedItemForAudit.fineAmount} ({selectedItemForAudit.fineStatus?.toUpperCase() || 'NONE'})
                    </div>
                  )}
                </div>
              )}

              {selectedItemForAudit.status === 'lost' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1 text-rose-900">
                  <div>
                    Condition: <strong>Lost Copy (Stock Deducted)</strong>
                  </div>
                  <div className="text-[11px] text-rose-800">
                    Incident Description: {selectedItemForAudit.incidentReason || 'Copy reported lost'}
                  </div>
                  {selectedItemForAudit.fineAmount !== undefined && (
                    <div className="text-[11px] text-rose-900 font-bold">
                      Fine Assessed: ₹{selectedItemForAudit.fineAmount} ({selectedItemForAudit.fineStatus?.toUpperCase() || 'NONE'})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
