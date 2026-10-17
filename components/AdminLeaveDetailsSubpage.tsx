'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Paperclip,
  Check,
  X,
  Pencil,
  Trash2,
  User,
  ShieldCheck,
  Building2,
  AlertTriangle,
  ExternalLink,
  Phone,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  getEmployeeLeaveById,
  updateLeaveStatus,
  deleteEmployeeLeave,
  EmployeeLeaveItem,
} from '@/lib/employeeRequestsApi';

interface AdminLeaveDetailsSubpageProps {
  leaveId: string;
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
}

export default function AdminLeaveDetailsSubpage({
  leaveId,
  portalType,
  adminName = 'Administrator',
}: AdminLeaveDetailsSubpageProps) {
  const router = useRouter();
  const [leave, setLeave] = useState<EmployeeLeaveItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reject modal state
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadLeave = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEmployeeLeaveById(leaveId);
      setLeave(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load application details.' });
    } finally {
      setIsLoading(false);
    }
  }, [leaveId]);

  useEffect(() => {
    loadLeave();
  }, [loadLeave]);

  const handleApprove = async () => {
    if (!leave) return;
    setIsProcessing(true);
    try {
      const updated = await updateLeaveStatus(
        leave.id,
        'approved',
        'Approved by administrator.',
        adminName
      );
      setLeave(updated);
      setFeedback({ type: 'success', message: 'Application approved successfully.' });
      window.dispatchEvent(new Event('employee_requests_updated'));
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to approve application.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leave || !rejectReason.trim()) return;
    setIsProcessing(true);
    try {
      const updated = await updateLeaveStatus(
        leave.id,
        'rejected',
        rejectReason.trim(),
        adminName
      );
      setLeave(updated);
      setIsRejectOpen(false);
      setRejectReason('');
      setFeedback({ type: 'success', message: 'Application rejected.' });
      window.dispatchEvent(new Event('employee_requests_updated'));
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reject application.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!leave) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this ${leave.leave_type === 'holiday' ? 'holiday' : 'leave'} application for ${leave.employee_name || leave.employee_code}?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await deleteEmployeeLeave(leave.id);
      window.dispatchEvent(new Event('employee_requests_updated'));
      router.push(`/${portalType}/attendance/leaves`);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete application.' });
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading application details...</span>
        </div>
      </div>
    );
  }

  if (!leave) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-base font-bold text-slate-800 m-0">Application Not Found</h2>
        <p className="text-xs text-slate-500 m-0">
          The requested holiday or leave application #{leaveId} could not be located or has been deleted.
        </p>
        <div>
          <Link
            href={`/${portalType}/attendance/leaves`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold no-underline hover:bg-slate-800 transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Leaves Management</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href={`/${portalType}/attendance/leaves`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Leaves &amp; Holidays</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/${portalType}/attendance/leaves/${leave.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 text-xs font-bold transition-colors no-underline border border-slate-200"
          >
            <Pencil size={14} />
            <span>Edit Application</span>
          </Link>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer border border-rose-200"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline cursor-pointer border-0 bg-transparent p-0 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner Card */}
      <div className="bg-gradient-to-r from-blue-700 via-[#0b4da2] to-indigo-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                  leave.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                    : leave.status === 'rejected'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                }`}
              >
                {leave.status === 'approved' && <Check size={13} />}
                {leave.status === 'rejected' && <X size={13} />}
                {leave.status === 'pending' && <Clock size={13} />}
                <span>Status: {leave.status}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider border border-white/10">
                {leave.leave_type === 'holiday' ? 'Public / Special Holiday' : 'Annual / Medical Leave'}
              </span>

              <span className="font-mono text-xs text-blue-200">#REQ-{leave.id}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white m-0 tracking-tight">
              {leave.title}
            </h1>

            <p className="text-blue-100/90 text-xs sm:text-sm m-0">
              Submitted on {new Date(leave.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Quick Decision Action Buttons */}
          {leave.status === 'pending' && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer border-0 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Check size={16} />
                <span>Approve Request</span>
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsRejectOpen(true)}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-white/10 hover:bg-rose-600 text-white font-bold text-xs shadow-lg transition-all cursor-pointer border border-white/20 hover:border-transparent hover:scale-[1.02] active:scale-[0.98]"
              >
                <X size={16} />
                <span>Reject</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Application Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Employee & Timeline Information (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Employee & Applicant Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0 flex items-center gap-2">
              <User size={15} className="text-[#0b4da2]" />
              <span>Applicant Information</span>
            </h2>

            <div className="flex items-center gap-4 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#0b4da2] font-black text-base flex items-center justify-center shrink-0 border border-blue-200">
                {leave.employee_name?.slice(0, 2).toUpperCase() || 'EM'}
              </div>
              <div className="flex-1 truncate">
                <p className="text-base font-black text-slate-900 m-0 truncate">
                  {leave.employee_name || 'Staff Member'}
                </p>
                <p className="text-xs font-mono font-bold text-[#0b4da2] m-0 mt-0.5">
                  ID: {leave.employee_code}
                </p>
              </div>
            </div>

            {leave.emergency_contact && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs text-slate-700">
                <Phone size={14} className="text-slate-500 shrink-0" />
                <span className="font-semibold">Emergency Contact:</span>
                <span className="font-mono text-slate-900">{leave.emergency_contact}</span>
              </div>
            )}
          </div>

          {/* Schedule & Duration Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0 flex items-center gap-2">
              <Calendar size={15} className="text-[#0b4da2]" />
              <span>Leave Schedule &amp; Duration</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">Start Date</p>
                <p className="text-sm font-bold text-slate-900 font-mono mt-1 m-0">
                  {String(leave.start_date).slice(0, 10)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">End Date</p>
                <p className="text-sm font-bold text-slate-900 font-mono mt-1 m-0">
                  {String(leave.end_date).slice(0, 10)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <p className="text-[11px] font-bold text-[#0b4da2] uppercase tracking-wider m-0">Total Duration</p>
                <p className="text-xl font-black text-[#0b4da2] mt-0.5 m-0">
                  {leave.days_count} {leave.days_count === 1 ? 'Day' : 'Days'}
                </p>
              </div>
            </div>

            {/* Application Reason */}
            <div className="pt-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Application Purpose / Remarks
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                {leave.reason || 'No detailed remarks submitted by applicant.'}
              </div>
            </div>
          </div>

          {/* Document Attachment Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0 flex items-center gap-2">
              <Paperclip size={15} className="text-[#0b4da2]" />
              <span>Supporting Documents &amp; Certificates</span>
            </h2>

            {leave.attachment_url ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 m-0 truncate">
                      {leave.attachment_name || 'Attached Document'}
                    </p>
                    <p className="text-[11px] text-slate-400 m-0">Uploaded with request</p>
                  </div>
                </div>

                <a
                  href={leave.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] text-white hover:bg-blue-700 font-bold text-xs no-underline shadow-xs transition"
                >
                  <ExternalLink size={13} />
                  <span>View Document</span>
                </a>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                No supporting file or medical certificate was attached with this application.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status & Administrative Decision Audit */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0 flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#0b4da2]" />
              <span>Review &amp; Decision</span>
            </h2>

            <div className="space-y-3 pt-1">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">Current Status</p>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold capitalize ${
                      leave.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : leave.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {leave.status === 'approved' && <Check size={13} />}
                    {leave.status === 'rejected' && <X size={13} />}
                    {leave.status === 'pending' && <Clock size={13} />}
                    <span>{leave.status}</span>
                  </span>
                </div>
              </div>

              {leave.approved_by && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">Reviewed By</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 m-0">{leave.approved_by}</p>
                </div>
              )}

              {leave.admin_notes && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">Admin Notes / Remarks</p>
                  <p className="text-xs text-slate-700 mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed m-0">
                    {leave.admin_notes}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">Last Updated</p>
                <p className="text-xs font-mono text-slate-600 mt-1 m-0">
                  {new Date(leave.updated_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Actions button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href={`/${portalType}/attendance/leaves/${leave.id}/edit`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold no-underline transition"
              >
                <Pencil size={14} />
                <span>Modify Application Details</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 m-0">
                Decline Application: {leave.employee_name}
              </h3>
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify operational reasons, schedule conflicts, or project deadlines..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border-0 bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold border-0 cursor-pointer shadow-xs"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
