import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Crown,
  Calendar,
  CreditCard,
  RefreshCw,
  QrCode,
  Landmark,
  FileText,
  Clock,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import { SubscriptionRequest } from '../../types';
import { superAdminService } from '../../services/api';

interface RequestApprovalModalProps {
  request: SubscriptionRequest;
  actionType: 'approve' | 'reject';
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const RequestApprovalModal: React.FC<RequestApprovalModalProps> = ({
  request,
  actionType,
  onClose,
  onSuccess,
}) => {
  const [adminRemarks, setAdminRemarks] = useState(
    actionType === 'approve'
      ? `Payment verified via ${request.paymentMode?.toUpperCase()} (Ref: ${request.transactionReference || 'N/A'})`
      : 'Payment details could not be verified'
  );
  const [customDays, setCustomDays] = useState(request.durationDays || 365);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const school = request.school && typeof request.school === 'object' ? request.school : null;
  const plan = request.plan && typeof request.plan === 'object' ? request.plan : null;

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      if (actionType === 'approve') {
        const res = await superAdminService.approveSubscriptionRequest(request._id, {
          adminRemarks: adminRemarks.trim(),
        });
        onSuccess(res.message || 'Subscription request approved and activated!');
      } else {
        const res = await superAdminService.rejectSubscriptionRequest(request._id, {
          adminRemarks: adminRemarks.trim(),
        });
        onSuccess(res.message || 'Subscription request has been rejected.');
      }
      onClose();
    } catch (err: any) {
      console.error('Approval/Rejection error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div
          className={`p-5 sm:p-6 flex items-center justify-between border-b ${
            actionType === 'approve'
              ? 'bg-emerald-950/40 border-emerald-900/50'
              : 'bg-rose-950/40 border-rose-900/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                actionType === 'approve'
                  ? 'bg-emerald-600 shadow-emerald-500/25'
                  : 'bg-rose-600 shadow-rose-500/25'
              }`}
            >
              {actionType === 'approve' ? <ShieldCheck className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {actionType === 'approve' ? 'Approve & Activate Subscription' : 'Reject Purchase Request'}
              </h3>
              <p className="text-xs text-slate-400">
                School Campus: <strong className="text-white">{school?.name || 'School'}</strong> ({school?.code || 'CAMPUS'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleProcess} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Request Details Breakdown Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-bold">Requested Plan Tier:</span>
              <span className="font-black text-purple-300 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                {plan?.name || 'Plan'} ({plan?.code || 'TIER'})
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-bold">Payment Mode:</span>
              <span className="font-bold text-slate-200 uppercase flex items-center gap-1.5">
                {request.paymentMode === 'upi' && <QrCode className="w-3.5 h-3.5 text-indigo-400" />}
                {request.paymentMode === 'bank_transfer' && <Landmark className="w-3.5 h-3.5 text-blue-400" />}
                {request.paymentMode === 'cheque' && <CreditCard className="w-3.5 h-3.5 text-amber-400" />}
                {request.paymentMode === 'po' && <FileText className="w-3.5 h-3.5 text-purple-400" />}
                {request.paymentMode}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-bold">Transaction / UTR Reference:</span>
              <span className="font-mono font-bold text-emerald-400">
                {request.transactionReference || 'Not Provided'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-bold">Payable Amount:</span>
              <span className="font-black text-white text-sm">
                ₹{request.amount?.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">Requested Duration:</span>
              <span className="font-bold text-slate-300">
                {request.durationDays >= 3650 ? 'Lifetime' : `${request.durationDays} Days (1 Year)`}
              </span>
            </div>

            {request.schoolNotes && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300">School Remark: </span>
                {request.schoolNotes}
              </div>
            )}
          </div>

          {actionType === 'approve' && (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/50 text-[11px] text-indigo-200">
              ⚡ Approving this request will immediately assign the <strong>{plan?.name}</strong> plan to{' '}
              <strong>{school?.name}</strong>, activate their account, and extend their expiry date.
            </div>
          )}

          {/* Admin Remarks Input */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Super Admin Remarks / Verification Note: <span className="text-slate-500 font-normal">(Visible to School Admin)</span>
            </label>
            <textarea
              rows={2}
              required
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              placeholder="e.g. Payment verified in ICICI Current Account"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                actionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : actionType === 'approve' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Activate Plan</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
