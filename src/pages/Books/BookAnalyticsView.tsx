import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  BookOpen,
  IndianRupee,
  Layers,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Bookmark,
  Hash,
  Search,
  ArrowUpDown,
  Building,
  Archive,
} from 'lucide-react';
import { bookService } from '../../services/api';
import { BookAnalyticsData } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface BookAnalyticsViewProps {
  onNavigateToSupplier?: (supplierName: string) => void;
  onNavigateToShelf?: (shelfName: string) => void;
}

export const BookAnalyticsView: React.FC<BookAnalyticsViewProps> = ({
  onNavigateToSupplier,
  onNavigateToShelf,
}) => {
  const { formatCurrency } = useSettings();
  const [data, setData] = useState<BookAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [shelfSearch, setShelfSearch] = useState<string>('');

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await bookService.getAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load book analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-slate-600">Calculating Inventory & Catalog Analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-xs text-slate-500">Failed to load analytics data.</p>
        <button
          onClick={() => fetchAnalytics()}
          className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, suppliers, shelves, categories, languages, priceDistribution, topExpensiveBooks } = data;

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase().trim())
  );

  const filteredShelves = shelves.filter((sh) =>
    sh.name.toLowerCase().includes(shelfSearch.toLowerCase().trim())
  );

  // Maximum copies for bar width calculation
  const maxCategoryCopies = Math.max(...categories.map((c) => c.totalCopies), 1);
  const maxSupplierCopies = Math.max(...suppliers.map((s) => s.totalCopies), 1);
  const maxShelfCopies = Math.max(...shelves.map((s) => s.totalCopies), 1);
  const maxPriceCount = Math.max(...priceDistribution.map((p) => p.count), 1);

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Library Asset & Stock Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics covering Book Prices, Supplier Spend, Shelf Locations, and Available Stock
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Level Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Catalog Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Catalog Valuation
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            ₹{summary.totalCatalogValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Avg Book Price:</span>
            <span className="font-semibold text-slate-700">₹{summary.averagePrice}</span>
          </div>
        </div>

        {/* Card 2: Available Stock Valuation */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Available Stock Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-2">
            ₹{summary.availableStockValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            {summary.availableCopies} Copies Available in Stacks
          </div>
        </div>

        {/* Card 3: Stock Breakdown */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Inventory Copies
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            {summary.totalCopies}{' '}
            <span className="text-xs font-normal text-slate-500">across {summary.totalTitles} titles</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <span className="text-blue-600">{summary.assignedCopies} Issued</span>
            <span>•</span>
            <span className="text-rose-500">{summary.lostCopies + summary.damagedCopies} Lost/Dmg</span>
          </div>
        </div>

        {/* Card 4: Availability Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Stock Availability Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            {summary.availabilityRate}%
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${summary.availabilityRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Row 2: Suppliers Analysis & Shelf Locations Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Master Analytics */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Supplier Procurement & Spend Breakdown</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total copies procured, available copies on shelf, and total spend per supplier
              </p>
            </div>
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Filter supplier..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-200">
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-2 text-center">Titles</th>
                  <th className="py-2.5 px-2 text-center">Total Copies</th>
                  <th className="py-2.5 px-2 text-center">Available</th>
                  <th className="py-2.5 px-3 text-right">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                      No suppliers found
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600 font-medium">
                        {s.titleCount}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900">
                        {s.totalCopies}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[11px] border border-emerald-200">
                          {s.availableCopies}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                        ₹{(s.totalSpend || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shelf & Rack Location Analytics */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Archive className="w-4 h-4 text-purple-600" />
                <span>Shelf & Rack Storage Utilization</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Track how many book titles and physical copies are stored at each shelf location
              </p>
            </div>
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={shelfSearch}
                onChange={(e) => setShelfSearch(e.target.value)}
                placeholder="Filter shelf..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {filteredShelves.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No shelf locations matched</div>
            ) : (
              filteredShelves.map((sh, idx) => {
                const ratio = Math.round((sh.totalCopies / maxShelfCopies) * 100);
                const availRatio = sh.totalCopies > 0 ? Math.round((sh.availableCopies / sh.totalCopies) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-[11px] border border-purple-200">
                          {sh.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {sh.titleCount} Titles
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900">{sh.totalCopies} Total</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {sh.availableCopies} Available
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Shelf Stored Copies */}
                    <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="bg-purple-600 h-2 transition-all"
                        style={{ width: `${(sh.availableCopies / maxShelfCopies) * 100}%` }}
                        title={`${sh.availableCopies} Available`}
                      ></div>
                      <div
                        className="bg-blue-400 h-2 transition-all"
                        style={{ width: `${((sh.totalCopies - sh.availableCopies) / maxShelfCopies) * 100}%` }}
                        title={`${sh.totalCopies - sh.availableCopies} Issued`}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Price Distribution & Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Ranges Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            <span>Price Range Distribution</span>
          </h3>
          <p className="text-[11px] text-slate-500">Distribution of catalog items by price brackets</p>

          <div className="space-y-3 pt-2">
            {priceDistribution.map((item, idx) => {
              const pct = maxPriceCount > 0 ? Math.round((item.count / maxPriceCount) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.range}</span>
                    <span className="text-slate-900">{item.count} Books</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Category-wise Volume & Available Copies</span>
          </h3>
          <p className="text-[11px] text-slate-500">Volume, stock availability, and valuation per category</p>

          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-200">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-2 text-center">Titles</th>
                  <th className="py-2.5 px-2 text-center">Total Copies</th>
                  <th className="py-2.5 px-2 text-center">Available</th>
                  <th className="py-2.5 px-3 text-right">Category Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {categories.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[11px] border border-indigo-200">
                        {c.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600 font-medium">
                      {c.titleCount}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-900">
                      {c.totalCopies}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[11px] border border-emerald-200">
                        {c.availableCopies}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      ₹{(c.totalValuation || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4: Top High-Value Asset Books */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-600" />
            <span>Highest Value Library Assets</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Key premium reference books, suppliers, and shelf locations
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-200">
                <th className="py-2.5 px-3">Title & Author</th>
                <th className="py-2.5 px-2">Supplier</th>
                <th className="py-2.5 px-2">Shelf Location</th>
                <th className="py-2.5 px-2 text-center">Total Copies</th>
                <th className="py-2.5 px-2 text-center">Available</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Total Asset Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {topExpensiveBooks.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{b.title}</div>
                    <div className="text-[11px] text-slate-500">By {b.author}</div>
                  </td>
                  <td className="py-2.5 px-2 text-slate-700 font-medium">
                    {b.supplierName || 'N/A'}
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono border border-slate-200">
                      {b.shelfLocation || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                    {b.totalCopies}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[11px] border border-emerald-200">
                      {b.availableCopies}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                    ₹{b.price.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                    ₹{(b.price * b.totalCopies).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
