import React, { useState, useEffect } from 'react';
import { X, Building2, Shield, Calendar, Mail, Phone, MapPin, Sparkles } from 'lucide-react';
import { School, Plan } from '../../types';

interface SchoolModalProps {
  isOpen: boolean;
  school: School | null; // null for create mode
  plans: Plan[];
  onClose: () => void;
  onSave: (formData: any, isEdit: boolean, schoolId?: string) => Promise<void>;
}

export const SchoolModal: React.FC<SchoolModalProps> = ({
  isOpen,
  school,
  plans,
  onClose,
  onSave,
}) => {
  const isEdit = Boolean(school);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [libraryName, setLibraryName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [planId, setPlanId] = useState('');
  const [planDurationDays, setPlanDurationDays] = useState(365);
  const [planExpiresAt, setPlanExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (school) {
      setName(school.name || '');
      setCode(school.code || '');
      setLibraryName(school.libraryName || '');
      setAdminName(school.adminName || '');
      setEmail(school.email || '');
      setPassword('');
      setPhone(school.phone || '');
      setCity(school.city || '');
      setState(school.state || '');
      setAddress(school.address || '');
      const rawPlanId = school.plan?._id || school.plan?.id || school.plan || '';
      setPlanId(typeof rawPlanId === 'string' ? rawPlanId : '');
      if (school.planExpiresAt) {
        setPlanExpiresAt(new Date(school.planExpiresAt).toISOString().split('T')[0]);
      } else {
        setPlanExpiresAt('');
      }
      setNotes(school.notes || '');
    } else {
      setName('');
      setCode('');
      setLibraryName('');
      setAdminName('');
      setEmail('');
      setPassword('school123');
      setPhone('');
      setCity('');
      setState('');
      setAddress('');
      const defaultPlan = plans.find((p) => p.isPopular) || plans[0];
      setPlanId(defaultPlan?._id || defaultPlan?.id || '');
      setPlanDurationDays(365);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365);
      setPlanExpiresAt(futureDate.toISOString().split('T')[0]);
      setNotes('');
    }
    setError('');
  }, [school, isOpen, plans]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !adminName.trim() || !email.trim()) {
      setError('Please fill in school name, administrator name, and email.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload: any = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        libraryName: libraryName.trim() || `${name.trim()} Central Library`,
        adminName: adminName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim(),
        state: state.trim(),
        address: address.trim(),
        planId: planId || undefined,
        notes: notes.trim(),
      };

      if (!isEdit) {
        payload.password = password || 'school123';
        payload.planDurationDays = planDurationDays;
      } else if (planExpiresAt) {
        payload.planExpiresAt = planExpiresAt;
      }

      await onSave(payload, isEdit, school?._id || school?.id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save school details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {isEdit ? `Edit School: ${school?.name}` : 'Provision New School Campus'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEdit
                  ? 'Update campus configuration, contact details, and subscription tier'
                  : 'Instantly create isolated library database & assign plan package'}
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
          {/* School Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                School / Institution Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEdit && !libraryName) {
                    setLibraryName(`${e.target.value} Central Library`);
                  }
                }}
                placeholder="e.g. Modern Public Academy"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                School Code (Unique Prefix)
              </label>
              <input
                type="text"
                disabled={isEdit}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. MPA (Auto-generated if blank)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-mono uppercase disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Library Name / Unit
              </label>
              <input
                type="text"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="e.g. Senior Wing Digital Library"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          {/* Admin User Info */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Campus Head Librarian / Admin Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Mrs. Sunita Verma"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Admin Login Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600 font-medium"
                />
              </div>

              {!isEdit && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="school123"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Subscription Plan Selection */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Subscription Plan & Quotas</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Subscription Plan
                </label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="">-- Select a Plan Tier --</option>
                  {plans.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} (₹{p.price.toLocaleString('en-IN')}/{p.billingCycle}) -{' '}
                      {p.maxBooks === -1 ? 'Unlimited' : p.maxBooks} Books
                    </option>
                  ))}
                </select>
              </div>

              {isEdit ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plan Expiry Date
                  </label>
                  <input
                    type="date"
                    value={planExpiresAt}
                    onChange={(e) => setPlanExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Validity Duration
                  </label>
                  <select
                    value={planDurationDays}
                    onChange={(e) => setPlanDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-indigo-600"
                  >
                    <option value={30}>30 Days (1 Month Trial)</option>
                    <option value={90}>90 Days (Quarterly)</option>
                    <option value={180}>180 Days (Half-Yearly)</option>
                    <option value={365}>365 Days (1 Full Year)</option>
                    <option value={730}>730 Days (2 Years Campus License)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. New Delhi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State / Province</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Delhi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Internal Administrative Notes (Private to SuperAdmin)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. CBSE Affiliated 2026, requested custom accession format..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          {/* Modal Actions */}
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
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 cursor-pointer transition-all disabled:opacity-70"
            >
              {loading ? (
                <span>Saving...</span>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create & Provision School'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
