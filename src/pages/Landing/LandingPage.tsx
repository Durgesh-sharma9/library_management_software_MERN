import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Zap,
  Building2,
  Users,
  Layers,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Calculator,
  RefreshCw,
  Search,
  Sliders,
  DollarSign,
  Barcode,
  School as SchoolIcon,
  ChevronDown,
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  Award,
  Lock,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import { School } from '../../types';

interface LandingPageProps {
  onOpenLogin: (defaultMode?: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const { login } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'circulation' | 'lost' | 'multischool' | 'catalog' | 'members'>('circulation');

  // Interactive Fine & Replacement Calculator State
  const [simulatedDaysLate, setSimulatedDaysLate] = useState(14);
  const [simulatedDailyFine, setSimulatedDailyFine] = useState(2);
  const [simulatedGraceDays, setSimulatedGraceDays] = useState(2);
  const [simulatedBookPrice, setSimulatedBookPrice] = useState(380);
  const [simulatedAction, setSimulatedAction] = useState<'return' | 'lost_pay' | 'lost_replaced'>('return');

  // Registered schools count
  const [registeredSchools, setRegisteredSchools] = useState<School[]>([]);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const res = await authService.getSchools();
      if (res && res.schools) {
        setRegisteredSchools(res.schools as any);
      }
    } catch {
      // ignore
    }
  };

  const handleInstantDemoLogin = async () => {
    try {
      setDemoLoading(true);
      await login('admin@school.edu', 'admin123');
    } catch {
      onOpenLogin('login');
    } finally {
      setDemoLoading(false);
    }
  };

  // Fine Calculation logic for simulator
  const billableDays = Math.max(0, simulatedDaysLate - simulatedGraceDays);
  const overdueFine = billableDays * simulatedDailyFine;

  let totalSimulatedPayable = 0;
  let simulatedSummaryText = '';

  if (simulatedAction === 'return') {
    totalSimulatedPayable = overdueFine;
    simulatedSummaryText =
      simulatedDaysLate <= simulatedGraceDays
        ? `Within grace period (${simulatedGraceDays} days). Zero fine charged!`
        : `${billableDays} billable overdue days @ ₹${simulatedDailyFine}/day = ₹${overdueFine}`;
  } else if (simulatedAction === 'lost_pay') {
    totalSimulatedPayable = overdueFine + simulatedBookPrice;
    simulatedSummaryText = `Overdue Fine (₹${overdueFine}) + Book Catalog Value (₹${simulatedBookPrice}) = ₹${totalSimulatedPayable}`;
  } else {
    // Replaced with exact copy
    totalSimulatedPayable = overdueFine;
    simulatedSummaryText = `Book replaced by student (₹0 book replacement fee). Only overdue fine ₹${overdueFine} applied.`;
  }

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Does each school have completely isolated data?',
      a: 'Yes, 100%. Granthshala ERP is architected with strict multi-tenant isolation. Every school has its own independent catalog, student & faculty directories, accession sequence, circulation ledger, and fine rules. No other school can access or view your records.',
    },
    {
      q: 'How is student book loss with exact replacement handled?',
      a: 'If a student loses a book but procures an exact physical copy, the librarian can choose "Replaced with exact copy". This maintains the library inventory count without reducing stock and waives the book cost (₹0 replacement fee) while recording late fees if overdue.',
    },
    {
      q: 'Can we import thousands of existing books and students from Excel?',
      a: 'Absolutely! Our built-in Bulk Import tool accepts standard Excel (.xlsx) and CSV files. You can upload thousands of books (accession numbers, ISBN, authors, racks) and student rosters (admission numbers, classes, sections) in seconds.',
    },
    {
      q: 'Can we customize the fine per day, grace periods, and book limits?',
      a: 'Yes. In System Settings, you can configure fine per day (e.g. ₹2, ₹5), grace period days, maximum allowed books per student/teacher, default issue durations (e.g. 14 days), and custom school currency.',
    },
    {
      q: 'Is barcode scanning supported for fast issue and return?',
      a: 'Yes! The circulation desk supports barcode scanners, accession number lookups, and ISBN scanning. You can issue or return books in under 3 seconds with instant search and validation.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed top-0 left-1/4 -translate-x-1/2 -top-40 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 right-0 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-1/3 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ================= TOP NAVBAR ================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 ring-2 ring-white/10">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">Granthshala</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  Multi-School ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                School & College Library Operating System
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#modules" className="hover:text-white transition-colors">ERP Modules</a>
            <a href="#calculator" className="hover:text-white transition-colors">Fine Simulator</a>
            <a href="#multischool" className="hover:text-white transition-colors">Multi-Tenancy</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              id="nav-demo-btn"
              onClick={handleInstantDemoLogin}
              disabled={demoLoading}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{demoLoading ? 'Launching...' : '1-Click Demo'}</span>
            </button>
            <button
              id="nav-login-btn"
              onClick={() => onOpenLogin('login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-200 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              <span>Login</span>
            </button>
            <button
              id="nav-register-btn"
              onClick={() => onOpenLogin('register')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Register School</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Multi-School Architecture • CBSE & ICSE Compatible • Zero Setup Fee</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
          The Modern Cloud ERP for{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            School & College Libraries
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Complete cataloging with accession numbers, 3-second barcode circulation, intelligent progressive fine engine, exact lost book replacement workflows, and 100% isolated databases for every school.
        </p>

        {/* CTA Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <button
            id="hero-instant-demo-btn"
            onClick={handleInstantDemoLogin}
            disabled={demoLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 shadow-xl shadow-blue-600/30 ring-2 ring-white/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>{demoLoading ? 'Opening Workspace...' : 'Launch Live ERP Demo'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="hero-register-btn"
            onClick={() => onOpenLogin('register')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Register School Workspace</span>
          </button>
        </div>

        {/* Quick Highlights / Trust Metrics */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-black text-white">3 Sec</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Instant Barcode Circulation</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Isolated School Data</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-black text-indigo-400">₹0 Fee</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Exact Lost Book Replacement</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-2xl sm:text-3xl font-black text-amber-400">Excel</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">1-Click Bulk Import & Export</div>
          </div>
        </div>

        {/* ================= INTERACTIVE PREVIEW CARD ================= */}
        <div className="mt-12 relative max-w-5xl mx-auto">
          <div className="relative rounded-3xl p-1.5 bg-gradient-to-b from-blue-500/30 via-slate-800/40 to-slate-900 border border-slate-700/60 shadow-2xl overflow-hidden">
            {/* Mock Mac / Browser Header */}
            <div className="px-4 py-3 bg-slate-900/90 rounded-t-2xl flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                <span className="text-[11px] font-mono text-slate-400 ml-2">
                  app.library-erp.school/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Multi-School Active
                </span>
              </div>
            </div>

            {/* Interactive Preview Body */}
            <div className="p-4 sm:p-6 bg-slate-950/90 rounded-b-2xl text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Circulation Stat 1 */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Total Books</span>
                    <BookOpen className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-2">1,420</div>
                  <div className="text-xs text-blue-400/80 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>87 Accessioned Categories</span>
                  </div>
                </div>

                {/* Circulation Stat 2 */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Active Circulation</span>
                    <RefreshCw className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black text-indigo-200 mt-2">184 Issued</div>
                  <div className="text-xs text-indigo-300/80 mt-1">12 Overdue • Automated Fines</div>
                </div>

                {/* Circulation Stat 3 */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/40 to-slate-900 border border-violet-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Fine Collected</span>
                    <DollarSign className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-2">₹1,850</div>
                  <div className="text-xs text-slate-400 mt-1">Receipts with Printed Slips</div>
                </div>
              </div>

              {/* Sample Quick Issue Bar in Mockup */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Rapid Circulation Terminal</div>
                    <div className="text-[11px] text-slate-400">Scan Student ID + Book Accession Number</div>
                  </div>
                </div>
                <button
                  onClick={handleInstantDemoLogin}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Test in Live Sandbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE FINE & LOST REPLACEMENT SIMULATOR ================= */}
      <section id="calculator" className="py-16 bg-slate-900/50 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-3">
              <Calculator className="w-3.5 h-3.5" />
              <span>Interactive Rule Engine</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Try the Smart Fine & Lost Book Simulator
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              See how our library engine dynamically computes progressive late fees, grace day waivers, and zero-fee exact replacement copies.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
            {/* Simulator Controls (Left Column) */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex justify-between">
                  <span>Days Overdue:</span>
                  <span className="text-blue-400 font-mono font-black">{simulatedDaysLate} Days</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={simulatedDaysLate}
                  onChange={(e) => setSimulatedDaysLate(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>On time (0d)</span>
                  <span>15 days</span>
                  <span>30 days</span>
                  <span>60 days</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Daily Fine Rate:
                  </label>
                  <select
                    value={simulatedDailyFine}
                    onChange={(e) => setSimulatedDailyFine(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="1">₹1 / day</option>
                    <option value="2">₹2 / day (Default)</option>
                    <option value="5">₹5 / day</option>
                    <option value="10">₹10 / day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Grace Period:
                  </label>
                  <select
                    value={simulatedGraceDays}
                    onChange={(e) => setSimulatedGraceDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="0">0 Days (Strict)</option>
                    <option value="2">2 Days (Standard)</option>
                    <option value="3">3 Days</option>
                    <option value="7">7 Days</option>
                  </select>
                </div>
              </div>

              {/* Action Mode Radio */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Return or Lost Status:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimulatedAction('return')}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      simulatedAction === 'return'
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-2xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>📚 Standard Return</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Physical book returned</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedAction('lost_pay')}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      simulatedAction === 'lost_pay'
                        ? 'bg-rose-600/20 border-rose-500 text-white shadow-2xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>💸 Lost: Pay Price</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Student pays catalog cost</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedAction('lost_replaced')}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      simulatedAction === 'lost_replaced'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-2xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>✨ Exact Replacement</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">₹0 replacement fine</div>
                  </button>
                </div>
              </div>

              {simulatedAction === 'lost_pay' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Book Catalog Cost:
                  </label>
                  <input
                    type="number"
                    value={simulatedBookPrice}
                    onChange={(e) => setSimulatedBookPrice(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-blue-500"
                    placeholder="e.g. 380"
                  />
                </div>
              )}
            </div>

            {/* Simulator Output (Right Column) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Simulated Settlement Calculation
                </div>
                <div className="text-3xl font-black text-white flex items-baseline gap-1">
                  <span>₹{totalSimulatedPayable}</span>
                  <span className="text-xs font-medium text-slate-400">Total Payable</span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Total Days Overdue:</span>
                    <span className="font-bold text-white">{simulatedDaysLate} days</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Grace Period Deduction:</span>
                    <span className="font-bold text-emerald-400">-{Math.min(simulatedGraceDays, simulatedDaysLate)} days</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Billable Overdue Days:</span>
                    <span className="font-bold text-amber-400">{billableDays} days</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Late Overdue Fine:</span>
                    <span className="font-bold text-white">₹{overdueFine}</span>
                  </div>
                  {simulatedAction === 'lost_pay' && (
                    <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                      <span className="text-slate-400">Lost Book Replacement Fee:</span>
                      <span className="font-bold text-rose-400">₹{simulatedBookPrice}</span>
                    </div>
                  )}
                  {simulatedAction === 'lost_replaced' && (
                    <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                      <span className="text-slate-400">Lost Book Fee (Replaced):</span>
                      <span className="font-bold text-emerald-400">₹0 (Waived)</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                  {simulatedSummaryText}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                <button
                  onClick={handleInstantDemoLogin}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Test in Actual ERP Circulation Desk →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= COMPLETE ERP MODULES ================= */}
      <section id="modules" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 border border-blue-500/30 text-blue-400 text-xs font-bold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Complete Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Built from the ground up for Educational Institutions
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Every module needed by school librarians, academic coordinators, and principals in a single intuitive portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Module 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mt-4">Multi-School Data Isolation</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Every registered school gets an entirely separate database scope. No overlap between school books, student cards, or transaction history.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Dedicated School Codes (e.g. IPS, SXIS)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Independent librarian & admin logins</span>
              </li>
            </ul>
          </div>

          {/* Module 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mt-4">Rapid Circulation & Issues</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Issue and return books in seconds with barcode scanner support, auto due-date calculation, and member book quota enforcement.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>3-Second quick barcode issue/return</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Maximum book borrowing limit guards</span>
              </li>
            </ul>
          </div>

          {/* Module 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-violet-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mt-4">Lost & Replacement Manager</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Seamlessly handle lost, damaged, or torn books. Automatic pricing retrieval with option to accept student replacement copy without penalty.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                <span>Exact copy replacement workflow (₹0 fine)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                <span>Auto inventory quantity reconciliation</span>
              </li>
            </ul>
          </div>

          {/* Module 4 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mt-4">Students & Faculty Directory</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Digital library card generation with auto LIB-XXXX numbering, class/section tagging, admission numbers, and full borrowing records.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Class 1–12 & Section A–D masters</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Digital Library Card with Barcode ID</span>
              </li>
            </ul>
          </div>

          {/* Module 5 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mt-4">Shelves & Rack Locations</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Organize books by physical racks (e.g. Rack A-1, Floor 2). Track shelf capacity and easily locate any book within 5 seconds.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Rack capacity tracking & utilization</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Supplier ledger & invoice linkage</span>
              </li>
            </ul>
          </div>

          {/* Module 6 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mt-4">Excel Import & Audit Logs</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Upload thousands of books and student lists from Excel (.xlsx) instantly. Maintain audit logs of every issue, return, and payment.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Bulk sample template download & import</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Filterable activity & audit logs</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================= MULTI-SCHOOL SHOWCASE ================= */}
      <section id="multischool" className="py-16 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Enterprise Multi-Tenancy</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                One Platform, Infinite Autonomous School Workspaces
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Whether you are managing a single standalone school or a network of 50 sister institutions, each school operates inside its own isolated enclave with custom rules, distinct accession numbering, and private reports.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Dedicated School IDs</div>
                    <div className="text-xs text-slate-400">Zero chance of books or fines mixing across different campuses.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Custom Fine & Grace Schedules</div>
                    <div className="text-xs text-slate-400">Each branch sets its own daily fine, max books, and return duration.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Instant Self-Service Registration</div>
                    <div className="text-xs text-slate-400">Principals and Head Librarians can launch their ERP in under 60 seconds.</div>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => onOpenLogin('register')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Register Your School Now (Free)</span>
                </button>
              </div>
            </div>

            {/* School isolation diagram card */}
            <div className="lg:col-span-6">
              <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Multi-School Data Isolation Enclaves
                </div>

                <div className="space-y-3">
                  {/* School 1 Enclave */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-blue-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        IPS
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">International Public School</div>
                        <div className="text-[10px] text-slate-400">1,420 Books • 340 Students • Enclave #1</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      Isolated
                    </span>
                  </div>

                  {/* School 2 Enclave */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        SXIS
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">St. Xavier's International School</div>
                        <div className="text-[10px] text-slate-400">890 Books • 210 Students • Enclave #2</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      Isolated
                    </span>
                  </div>

                  {/* School 3 Enclave */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-purple-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                        DPS
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Delhi Public Academy</div>
                        <div className="text-[10px] text-slate-400">2,100 Books • 580 Students • Enclave #3</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      Isolated
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cross-tenant security guaranteed via authenticated school token isolation.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= COMPARISON TABLE ================= */}
      <section id="comparison" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Why Schools Upgrade to Granthshala ERP
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Compare manual registers & scattered spreadsheets with automated multi-school cloud management.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid grid-cols-12 bg-slate-900 p-4 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
            <div className="col-span-6 sm:col-span-5">Capability / Workflow</div>
            <div className="col-span-3 sm:col-span-3 text-rose-400">Old Way (Registers)</div>
            <div className="col-span-3 sm:col-span-4 text-emerald-400">Granthshala ERP</div>
          </div>

          <div className="divide-y divide-slate-800/80 text-xs">
            <div className="grid grid-cols-12 p-4 items-center">
              <div className="col-span-6 sm:col-span-5 font-semibold text-slate-200">
                Book Issue & Return Time
              </div>
              <div className="col-span-3 sm:col-span-3 text-slate-400">2 to 5 mins / entry</div>
              <div className="col-span-3 sm:col-span-4 font-bold text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>3 Seconds (Barcode)</span>
              </div>
            </div>

            <div className="grid grid-cols-12 p-4 items-center">
              <div className="col-span-6 sm:col-span-5 font-semibold text-slate-200">
                Overdue Fine & Grace Calculation
              </div>
              <div className="col-span-3 sm:col-span-3 text-slate-400">Manual math errors</div>
              <div className="col-span-3 sm:col-span-4 font-bold text-emerald-400">
                100% Automated & Receipted
              </div>
            </div>

            <div className="grid grid-cols-12 p-4 items-center">
              <div className="col-span-6 sm:col-span-5 font-semibold text-slate-200">
                Lost Book Replacement Workflow
              </div>
              <div className="col-span-3 sm:col-span-3 text-slate-400">Unrecorded paper notes</div>
              <div className="col-span-3 sm:col-span-4 font-bold text-emerald-400">
                Exact Copy (₹0) or Price Fine
              </div>
            </div>

            <div className="grid grid-cols-12 p-4 items-center">
              <div className="col-span-6 sm:col-span-5 font-semibold text-slate-200">
                Data Migration & Rosters
              </div>
              <div className="col-span-3 sm:col-span-3 text-slate-400">Manual re-typing</div>
              <div className="col-span-3 sm:col-span-4 font-bold text-emerald-400">
                1-Click Excel (.xlsx) Import
              </div>
            </div>

            <div className="grid grid-cols-12 p-4 items-center">
              <div className="col-span-6 sm:col-span-5 font-semibold text-slate-200">
                Multi-Campus Management
              </div>
              <div className="col-span-3 sm:col-span-3 text-slate-400">Scattered notebooks</div>
              <div className="col-span-3 sm:col-span-4 font-bold text-emerald-400">
                Centralized with Full Isolation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section id="faq" className="py-16 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 border border-blue-500/30 text-blue-400 text-xs font-bold mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Got Questions?</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="text-sm font-bold text-white">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-blue-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CTA BANNER ================= */}
      <section className="py-20 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-blue-900/60 via-indigo-900/50 to-violet-900/60 border border-blue-500/30 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <h2 className="text-2xl sm:text-4xl font-black text-white max-w-2xl mx-auto">
            Ready to modernise your school library in under 2 minutes?
          </h2>
          <p className="mt-3 text-sm text-slate-300 max-w-xl mx-auto">
            Try the instant demo sandbox or register your school with zero setup cost.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleInstantDemoLogin}
              disabled={demoLoading}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 text-sm font-bold shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
              <span>Launch Live ERP Demo</span>
            </button>
            <button
              onClick={() => onOpenLogin('register')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-xl shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Register New School</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-800/80 py-10 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-200">Granthshala Library ERP</span>
            <span className="text-slate-600">|</span>
            <span>Educational Edition</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => onOpenLogin('login')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Staff Login
            </button>
            <button
              onClick={() => onOpenLogin('register')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Register School
            </button>
            <button
              onClick={handleInstantDemoLogin}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Instant Demo
            </button>
          </div>

          <div>
            © {new Date().getFullYear()} Granthshala ERP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
