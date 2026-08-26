import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { School } from '../../types';

interface StatusConfirmModalProps {
  school: School | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (schoolId: string, isActive: boolean, status: string, reason: string) => Promise<void>;
}

export const StatusConfirmModal: React.FC<StatusConfirmModalProps> = ({
  school,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !school) return null;

  const willDeactivate = school.isActive;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newStatus = willDeactivate ? 'suspended' : 'active';
      const newIsActive = !willDeactivate;
      await onConfirm(school._id || school.id || '', newIsActive, newStatus, reason.trim());
      onClose();
    } catch (err) {
      console.error('Status update failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                willDeactivate
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {willDeactivate ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {willDeactivate ? 'Deactivate / Suspend School' : 'Reactivate School Workspace'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{school.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
            {willDeactivate ? (
              <span>
                Deactivating <strong>{school.name}</strong> will temporarily block all librarians and staff from logging into this school's library portal. The school's books, members, and records remain safe.
              </span>
            ) : (
              <span>
                Reactivating <strong>{school.name}</strong> will immediately restore full portal access for the school's staff and librarians.
              </span>
            )}
          </div>

          {willDeactivate && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Deactivation (Optional)
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Subscription expired, pending payment, administrative audit..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-rose-500 font-medium"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md cursor-pointer transition-all ${
                willDeactivate
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              {loading ? (
                <span>Updating...</span>
              ) : willDeactivate ? (
                'Confirm Deactivation'
              ) : (
                'Reactivate School'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
