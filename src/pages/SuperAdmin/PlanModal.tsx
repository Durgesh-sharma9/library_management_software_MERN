import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, Plus, Trash2 } from 'lucide-react';
import { Plan } from '../../types';

interface PlanModalProps {
  isOpen: boolean;
  plan: Plan | null; // null for create mode
  onClose: () => void;
  onSave: (formData: Partial<Plan>, isEdit: boolean, planId?: string) => Promise<void>;
}

const DEFAULT_FEATURE_SUGGESTIONS = [
  'Unlimited Student & Teacher Membership',
  'Automated Barcode Generation & Scanning',
  'Dual-Rule Fine Calculator & Grace Period',
  'Lost & Damaged Replacement Ledger',
  'Bulk Excel / CSV Import & Export',
  'School Custom Accession Format',
  'WhatsApp & Email Due Reminders',
  'Multi-Role Librarian & Admin Access',
  'Shelf & Rack Location Tracker',
  'Priority 24/7 Phone & SLA Support',
];

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  plan,
  onClose,
  onSave,
}) => {
  const isEdit = Boolean(plan);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(4999);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [maxBooks, setMaxBooks] = useState(5000);
  const [isUnlimitedBooks, setIsUnlimitedBooks] = useState(false);
  const [maxMembers, setMaxMembers] = useState(1500);
  const [isUnlimitedMembers, setIsUnlimitedMembers] = useState(false);
  const [maxIssuedPerStudent, setMaxIssuedPerStudent] = useState(5);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plan) {
      setName(plan.name || '');
      setCode(plan.code || '');
      setDescription(plan.description || '');
      setPrice(plan.price ?? 4999);
      setBillingCycle(plan.billingCycle || 'yearly');
      setIsUnlimitedBooks(plan.maxBooks === -1);
      setMaxBooks(plan.maxBooks === -1 ? 5000 : plan.maxBooks);
      setIsUnlimitedMembers(plan.maxMembers === -1);
      setMaxMembers(plan.maxMembers === -1 ? 1500 : plan.maxMembers);
      setMaxIssuedPerStudent(plan.maxIssuedPerStudent ?? 5);
      setFeatures(Array.isArray(plan.features) ? plan.features : []);
      setIsPopular(Boolean(plan.isPopular));
      setIsActive(plan.isActive !== false);
    } else {
      setName('');
      setCode('');
      setDescription('');
      setPrice(4999);
      setBillingCycle('yearly');
      setIsUnlimitedBooks(false);
      setMaxBooks(5000);
      setIsUnlimitedMembers(false);
      setMaxMembers(1500);
      setMaxIssuedPerStudent(5);
      setFeatures([
        'Automated Barcode Generation & Scanning',
        'Dual-Rule Fine Calculator & Grace Period',
        'Lost & Damaged Replacement Ledger',
        'Bulk Excel Import & Export',
        'Custom Accession Format',
      ]);
      setIsPopular(false);
      setIsActive(true);
    }
    setError('');
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleTogglePresetFeature = (feat: string) => {
    if (features.includes(feat)) {
      setFeatures(features.filter((f) => f !== feat));
    } else {
      setFeatures([...features, feat]);
    }
  };

  const handleAddCustomFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureText.trim()) return;
    if (!features.includes(newFeatureText.trim())) {
      setFeatures([...features, newFeatureText.trim()]);
    }
    setNewFeatureText('');
  };

  const handleRemoveFeature = (feat: string) => {
    setFeatures(features.filter((f) => f !== feat));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a Plan Name.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload: Partial<Plan> = {
        name: name.trim(),
        code: code.trim() ? code.trim().toUpperCase() : name.trim().toUpperCase().replace(/\s+/g, '_'),
        description: description.trim(),
        price: Number(price),
        billingCycle,
        maxBooks: isUnlimitedBooks ? -1 : Number(maxBooks),
        maxMembers: isUnlimitedMembers ? -1 : Number(maxMembers),
        maxIssuedPerStudent: Number(maxIssuedPerStudent),
        features,
        isPopular,
        isActive,
      };

      await onSave(payload, isEdit, plan?._id || plan?.id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subscription plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {isEdit ? `Edit Plan: ${plan?.name}` : 'Create New Subscription Plan'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure pricing tier, book storage quotas, and feature flags
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Plan Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plan Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEdit && !code) {
                    setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                  }
                }}
                placeholder="e.g. Pro Growth Edition"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-purple-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plan Code (Unique Identifier)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. PRO_GROWTH"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-purple-600 font-mono uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Short Description / Tagline
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Best for growing K-12 schools with up to 5,000 books & active circulation"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-purple-600 font-medium"
              />
            </div>
          </div>

          {/* Pricing & Billing */}
          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
            <div className="text-xs font-bold text-purple-950">Pricing & Billing Cycle</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Price (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Billing Cycle
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-purple-600"
                >
                  <option value="yearly">Per Year (Annual License)</option>
                  <option value="monthly">Per Month</option>
                  <option value="lifetime">One-time / Lifetime</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quotas and Limits */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800">Capacity Limits & Quotas</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Max Books</label>
                  <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlimitedBooks}
                      onChange={(e) => setIsUnlimitedBooks(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-0"
                    />
                    <span>Unlimited</span>
                  </label>
                </div>
                <input
                  type="number"
                  disabled={isUnlimitedBooks}
                  value={isUnlimitedBooks ? '' : maxBooks}
                  onChange={(e) => setMaxBooks(Number(e.target.value))}
                  placeholder={isUnlimitedBooks ? 'Unlimited' : 'e.g. 5000'}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-purple-600 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Max Members</label>
                  <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlimitedMembers}
                      onChange={(e) => setIsUnlimitedMembers(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-0"
                    />
                    <span>Unlimited</span>
                  </label>
                </div>
                <input
                  type="number"
                  disabled={isUnlimitedMembers}
                  value={isUnlimitedMembers ? '' : maxMembers}
                  onChange={(e) => setMaxMembers(Number(e.target.value))}
                  placeholder={isUnlimitedMembers ? 'Unlimited' : 'e.g. 1500'}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-purple-600 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Max Issues / Member
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxIssuedPerStudent}
                  onChange={(e) => setMaxIssuedPerStudent(Number(e.target.value))}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>
            </div>
          </div>

          {/* Features Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Included Plan Features ({features.length} selected)
            </label>

            {/* Quick toggles */}
            <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {DEFAULT_FEATURE_SUGGESTIONS.map((preset) => {
                const isSelected = features.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTogglePresetFeature(preset)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{preset}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Feature Add Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                placeholder="Type custom feature and click Add..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-purple-600 font-medium"
              />
              <button
                type="button"
                onClick={handleAddCustomFeature}
                className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Feature</span>
              </button>
            </div>

            {/* List of currently chosen features with delete buttons */}
            <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
              {features.map((feat) => (
                <div
                  key={feat}
                  className="flex items-center justify-between py-1 px-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(feat)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Badges and active status */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="rounded text-purple-600 focus:ring-0 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-800">
                ⭐ Mark as "Most Popular / Recommended" Plan
              </span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-800">
                ✅ Active (Available for new school assignment)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/30 cursor-pointer transition-all disabled:opacity-70"
            >
              {loading ? (
                <span>Saving...</span>
              ) : isEdit ? (
                'Save Plan Changes'
              ) : (
                'Create Subscription Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
