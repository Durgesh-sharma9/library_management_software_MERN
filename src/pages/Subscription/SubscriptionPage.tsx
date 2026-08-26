import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Building2,
  BookOpen,
  Users,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  QrCode,
  Landmark,
  FileText,
  Check,
  X,
  ChevronRight,
  Info,
  Calendar,
  Zap,
} from 'lucide-react';
import { subscriptionService } from '../../services/api';
import { Plan, SchoolSubscriptionDetails, SubscriptionRequest } from '../../types';

interface SubscriptionPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = () => {
  const [subscription, setSubscription] = useState<SchoolSubscriptionDetails | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [requestHistory, setRequestHistory] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Purchase Modal state
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<Plan | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'upi' | 'bank_transfer' | 'cheque' | 'po'>('upi');
  const [durationDays, setDurationDays] = useState<number>(365);
  const [transactionRef, setTransactionRef] = useState('');
  const [schoolNotes, setSchoolNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadSubscriptionData = async () => {
    try {
      setRefreshing(true);
      const [subData, plansData, historyData] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getAvailablePlans(),
        subscriptionService.getMyRequests(),
      ]);

      setSubscription(subData);
      setAvailablePlans(plansData || []);
      setRequestHistory(historyData || []);
    } catch (err: any) {
      console.error('Failed to load subscription data', err);
      showToast('Error loading subscription info. Please retry.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenPurchase = (plan: Plan) => {
    setSelectedPlanForPurchase(plan);
    setTransactionRef('');
    setSchoolNotes('');
    setPaymentMode('upi');
    // Set default duration based on plan's billing cycle
    if (plan.billingCycle === 'monthly') {
      setDurationDays(30);
    } else if (plan.billingCycle === 'lifetime') {
      setDurationDays(3650);
    } else {
      setDurationDays(365);
    }
    setIsPurchaseModalOpen(true);
  };

  const calculateTotalAmount = () => {
    if (!selectedPlanForPurchase) return 0;
    if (durationDays === 30) {
      return selectedPlanForPurchase.billingCycle === 'monthly'
        ? selectedPlanForPurchase.price
        : Math.round(selectedPlanForPurchase.price / 12);
    }
    if (durationDays === 180) {
      return Math.round(selectedPlanForPurchase.price * 0.55);
    }
    if (durationDays === 730) {
      return Math.round(selectedPlanForPurchase.price * 1.8); // 10% multi-year discount
    }
    if (durationDays >= 3650) {
      return selectedPlanForPurchase.price * 3;
    }
    return selectedPlanForPurchase.price;
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForPurchase) return;

    if (!transactionRef.trim()) {
      showToast('Please enter the payment transaction reference / UTR / Cheque number', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const amount = calculateTotalAmount();
      const res = await subscriptionService.submitPurchaseRequest({
        planId: selectedPlanForPurchase._id,
        billingCycle: selectedPlanForPurchase.billingCycle,
        durationDays,
        amount,
        paymentMode,
        transactionReference: transactionRef.trim(),
        schoolNotes: schoolNotes.trim(),
      });

      showToast(res.message || 'Purchase request sent for Super Admin approval!', 'success');
      setIsPurchaseModalOpen(false);
      await loadSubscriptionData();
    } catch (err: any) {
      console.error('Error submitting purchase request:', err);
      showToast(err.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-9 h-9 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Subscription & Billing Info...</p>
      </div>
    );
  }

  const currentPlan = subscription?.currentPlan;
  const usage = subscription?.usage;
  const pendingRequest = subscription?.pendingRequest;

  // Usage percentage helpers
  const booksLimit = usage?.maxBooks ?? -1;
  const booksCount = usage?.booksCount ?? 0;
  const booksPercent = booksLimit > 0 ? Math.min(100, Math.round((booksCount / booksLimit) * 100)) : 0;

  const membersLimit = usage?.maxMembers ?? -1;
  const membersCount = usage?.membersCount ?? 0;
  const membersPercent = membersLimit > 0 ? Math.min(100, Math.round((membersCount / membersLimit) * 100)) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : 'bg-rose-950 text-rose-200 border-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Compact Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                <Crown className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300">
                Library Subscription & Plan Catalog
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-[11px] font-bold border border-indigo-500/30">
                {subscription?.school?.name || 'School Library Campus'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Choose & Upgrade Subscription Plan
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
              Select a subscription plan below to expand your book catalog capacity, increase student member limits, and unlock advanced library ERP features.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSubscriptionData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Plans</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Request Alert (If any) */}
      {pendingRequest && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-900">Plan Purchase Request Pending Super Admin Approval</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                Pending Review
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Your request for <strong>{pendingRequest.plan?.name || 'Subscription Plan'}</strong> (₹
              {pendingRequest.amount?.toLocaleString('en-IN')}) has been submitted and is currently awaiting approval
              from the Super Administrator. Once verified, your library quotas and new features will automatically
              activate.
            </p>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-amber-900/80 font-medium">
              <span>Payment Mode: <strong>{pendingRequest.paymentMode?.toUpperCase()}</strong></span>
              {pendingRequest.transactionReference && (
                <span>Ref / UTR: <strong>{pendingRequest.transactionReference}</strong></span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= 1. AVAILABLE SUBSCRIPTION TIERS (PLANS CATALOG AT TOP) ================= */}
      <div id="plans-catalog" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-indigo-600" />
              Available Subscription Plans
            </h2>
            <p className="text-xs text-slate-500">
              Live pricing tiers and quotas for your library campus. Instant Super Admin verification on purchase.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
            {availablePlans.length} Plans Available
          </span>
        </div>

        {availablePlans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No public subscription plans available right now.</p>
            <p className="text-xs text-slate-500 mt-1">
              Please contact the Super Administrator to configure plans.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePlans.map((plan) => {
              const isCurrent = currentPlan?._id === plan._id || currentPlan?.code === plan.code;

              return (
                <div
                  key={plan._id}
                  className={`rounded-3xl p-6 transition-all flex flex-col justify-between relative bg-white ${
                    isCurrent
                      ? 'ring-2 ring-emerald-500 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                      : plan.isPopular
                      ? 'border-2 border-indigo-600 shadow-xl shadow-indigo-500/10'
                      : 'border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300'
                  }`}
                >
                  {/* Popular or Current Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Current Active Plan
                    </div>
                  )}
                  {plan.isPopular && !isCurrent && (
                    <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2 mt-1">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                        <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1">
                          {plan.code}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">
                          {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString('en-IN')}`}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          / {plan.billingCycle}
                        </span>
                      </div>
                    </div>

                    {plan.description && (
                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                        {plan.description}
                      </p>
                    )}

                    {/* Limits Highlight Box */}
                    <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-extrabold block">Book Titles</span>
                        <span className="font-black text-slate-900 text-sm">
                          {plan.maxBooks === -1 ? 'Unlimited' : `${plan.maxBooks.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-extrabold block">Members</span>
                        <span className="font-black text-slate-900 text-sm">
                          {plan.maxMembers === -1 ? 'Unlimited' : `${plan.maxMembers.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                        Included Features:
                      </span>
                      <ul className="space-y-2 text-xs text-slate-600">
                        <li className="flex items-center gap-2 font-semibold text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Max {plan.maxIssuedPerStudent ?? 3} books issued per student</span>
                        </li>
                        {(plan.features || []).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      id={`purchase-plan-btn-${plan.code}`}
                      type="button"
                      onClick={() => handleOpenPurchase(plan)}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                        isCurrent
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          : plan.isPopular
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>{isCurrent ? 'Renew / Extend Current Plan' : 'Purchase / Upgrade Plan'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 2. CURRENT SUBSCRIPTION STATUS & QUOTA USAGE ================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Active School Quotas
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                {currentPlan?.name || 'Custom / Starter Trial'}
                {currentPlan?.code && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {currentPlan.code}
                  </span>
                )}
              </h2>
            </div>
          </div>

          {/* Status Badge */}
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                subscription?.isExpired
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  subscription?.isExpired ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              {subscription?.isExpired ? 'Plan Expired' : 'Active Subscription'}
            </span>
            {subscription?.daysRemaining !== null && subscription?.daysRemaining !== undefined && (
              <span className="text-[11px] font-semibold text-slate-500 block mt-1">
                {subscription.isExpired
                  ? 'Please renew plan'
                  : `${subscription.daysRemaining} days remaining`}
              </span>
            )}
          </div>
        </div>

        {/* Quota Progress Meters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Books Quota */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Book Titles Catalog
              </span>
              <span className="font-black text-slate-900">
                {booksCount}{' '}
                <span className="text-slate-400 font-normal">
                  / {booksLimit === -1 ? 'Unlimited' : booksLimit}
                </span>
              </span>
            </div>
            {booksLimit > 0 ? (
              <>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      booksPercent > 90
                        ? 'bg-rose-500'
                        : booksPercent > 75
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${booksPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  {booksPercent}% capacity utilized
                </span>
              </>
            ) : (
              <span className="text-[10px] text-emerald-600 font-bold mt-1 block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Unlimited Titles Allowed
              </span>
            )}
          </div>

          {/* Members Quota */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Registered Members
              </span>
              <span className="font-black text-slate-900">
                {membersCount}{' '}
                <span className="text-slate-400 font-normal">
                  / {membersLimit === -1 ? 'Unlimited' : membersLimit}
                </span>
              </span>
            </div>
            {membersLimit > 0 ? (
              <>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      membersPercent > 90
                        ? 'bg-rose-500'
                        : membersPercent > 75
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${membersPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  {membersPercent}% member slots filled
                </span>
              </>
            ) : (
              <span className="text-[10px] text-emerald-600 font-bold mt-1 block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Unlimited Members Allowed
              </span>
            )}
          </div>

          {/* Additional Parameters */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>Plan Expiry:</span>
                <strong className="text-slate-900 font-bold">
                  {subscription?.planExpiresAt
                    ? new Date(subscription.planExpiresAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Lifetime / Continuous'}
                </strong>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span>Max Issue/Student:</span>
                <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                  {usage?.maxIssuedPerStudent ?? 3} Books
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request History Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Subscription Purchase & Approval Requests History
            </h3>
            <p className="text-xs text-slate-500">
              Track requests submitted for Super Administrator verification and activation.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            {requestHistory.length} Total Requests
          </span>
        </div>

        {requestHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No previous subscription requests found for this school campus.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Plan Requested</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payment Mode & Ref</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Request Date</th>
                  <th className="py-2.5 px-3">Approval Status</th>
                  <th className="py-2.5 px-3">Admin Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requestHistory.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{req.plan?.name || 'Custom Plan'}</div>
                      <span className="text-[10px] font-mono text-indigo-600">{req.plan?.code || 'TIER'}</span>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-slate-800">
                      ₹{req.amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-700 uppercase">{req.paymentMode}</span>
                      {req.transactionReference && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Ref: {req.transactionReference}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {req.durationDays >= 3650 ? 'Lifetime' : `${req.durationDays} Days`}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                          Pending SuperAdmin Review
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Approved & Active
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Declined
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {req.adminRemarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= PURCHASE / UPGRADE MODAL ================= */}
      {isPurchaseModalOpen && selectedPlanForPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 sm:p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Purchase / Upgrade Subscription
                  </h3>
                  <p className="text-xs text-indigo-300">
                    Selected Tier: <strong>{selectedPlanForPurchase.name}</strong> ({selectedPlanForPurchase.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPurchase} className="p-5 sm:p-6 space-y-5">
              {/* Duration Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  1. Select Subscription Term Duration
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDurationDays(180)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      durationDays === 180
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-bold">6 Months</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      ₹{Math.round(selectedPlanForPurchase.price * 0.55).toLocaleString('en-IN')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationDays(365)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer relative ${
                      durationDays === 365
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-extrabold rounded">
                      Standard
                    </span>
                    <div className="font-bold">1 Year (365 D)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      ₹{selectedPlanForPurchase.price.toLocaleString('en-IN')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationDays(730)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      durationDays === 730
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-bold">2 Years (730 D)</div>
                    <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                      ₹{Math.round(selectedPlanForPurchase.price * 1.8).toLocaleString('en-IN')} (10% OFF)
                    </div>
                  </button>
                </div>
              </div>

              {/* Total Price Summary Box */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Payable Amount</span>
                  <span className="text-xs text-indigo-300">
                    Plan: {selectedPlanForPurchase.name} ({durationDays} Days)
                  </span>
                </div>
                <div className="text-xl font-black text-white">
                  ₹{calculateTotalAmount().toLocaleString('en-IN')}
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  2. Choose Payment Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMode === 'upi'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('bank_transfer')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMode === 'bank_transfer'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span>Bank Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('cheque')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMode === 'cheque'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Cheque / DD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('po')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMode === 'po'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Purchase Order</span>
                  </button>
                </div>
              </div>

              {/* Payment Instructions Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                {paymentMode === 'upi' && (
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                      Platform UPI ID: <span className="font-mono text-indigo-700">granthshala.erp@icici</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Scan or pay via Google Pay / PhonePe / Paytm to the above UPI ID and enter the 12-digit UTR below.
                    </p>
                  </div>
                )}
                {paymentMode === 'bank_transfer' && (
                  <div className="space-y-1 text-[11px]">
                    <div className="font-bold text-slate-900">Bank Details for NEFT / RTGS / IMPS:</div>
                    <div>Account Name: <strong>Granthshala Library ERP Solutions</strong></div>
                    <div>A/C Number: <strong className="font-mono">50200088912345</strong> (Current A/C)</div>
                    <div>IFSC: <strong className="font-mono">ICIC0001234</strong> | ICICI Bank</div>
                  </div>
                )}
                {paymentMode === 'cheque' && (
                  <p className="text-[11px] text-slate-600">
                    Draw cheque in favor of <strong>"Granthshala Library ERP Solutions"</strong> and enter cheque number and bank name below.
                  </p>
                )}
                {paymentMode === 'po' && (
                  <p className="text-[11px] text-slate-600">
                    Enter your official School Purchase Order / Sanction Number for corporate invoice billing.
                  </p>
                )}
              </div>

              {/* Reference ID / UTR Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Payment Reference / UTR / Transaction No. <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UTR492819482910 or Cheque #88219"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Optional Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Additional Notes / Purchase Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={schoolNotes}
                  onChange={(e) => setSchoolNotes(e.target.value)}
                  placeholder="e.g. Adding 500 new student admissions for academic year 2026-27"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-purchase-approval-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Send for Super Admin Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
