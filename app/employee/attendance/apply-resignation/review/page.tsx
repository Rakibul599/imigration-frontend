'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  ShieldCheck,
  Check,
  X,
  Printer,
  Download,
  Building2,
  User,
  ExternalLink,
  ChevronRight,
  Eye,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import {
  getEmployeeResignationById,
  getEmployeeResignations,
  updateResignationStatus,
  EmployeeResignationItem,
} from '@/lib/employeeRequestsApi';

function ResignationReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [resignation, setResignation] = useState<EmployeeResignationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision & Review state
  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [acceptanceLetterText, setAcceptanceLetterText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const loadResignation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (idParam) {
        const item = await getEmployeeResignationById(idParam);
        if (item) {
          setResignation(item);
          setAdminNotes(item.admin_notes || '');
          setAcceptanceLetterText(
            item.official_acceptance_letter ||
              `Dear ${item.employee_name || item.employee_code},\n\nWe formally accept your notice of resignation. Your confirmed final working day with the organization will be ${item.requested_last_day}, in accordance with your ${item.notice_period_days}-day notice period.\n\nPlease coordinate with human resources and your department supervisor to complete the clearance checklist and return all company assets prior to your departure.\n\nWe thank you for your contributions and wish you the best in your future career.\n\nSigned,\nHuman Resources & Management`
          );
          return;
        }
      }

      // Fallback: load latest
      const user = getCurrentUser();
      const list = await getEmployeeResignations({
        employee_code: user?.employee_code,
      });
      if (list && list.length > 0) {
        const item = list[0];
        setResignation(item);
        setAdminNotes(item.admin_notes || '');
        setAcceptanceLetterText(
          item.official_acceptance_letter ||
            `Dear ${item.employee_name || item.employee_code},\n\nWe formally accept your notice of resignation. Your confirmed final working day with the organization will be ${item.requested_last_day}, in accordance with your ${item.notice_period_days}-day notice period.\n\nPlease coordinate with human resources and your department supervisor to complete the clearance checklist and return all company assets prior to your departure.\n\nWe thank you for your contributions and wish you the best in your future career.\n\nSigned,\nHuman Resources & Management`
        );
      } else {
        setError('No resignation record found.');
      }
    } catch (err: any) {
      console.error('Failed to load resignation:', err);
      setError(err.message || 'Failed to load resignation details.');
    } finally {
      setIsLoading(false);
    }
  }, [idParam]);

  useEffect(() => {
    loadResignation();
  }, [loadResignation]);

  // Handle Approve
  const handleApprove = async () => {
    if (!resignation) return;
    if (!acceptanceLetterText.trim()) {
      setFeedback({ type: 'error', message: 'Please provide the official resignation acceptance letter text.' });
      return;
    }

    const confirmed = window.confirm(
      `Confirm approval of resignation notice for ${resignation.employee_name || resignation.employee_code}? This will issue the official clearance letter.`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      const updated = await updateResignationStatus(
        resignation.id,
        'approved',
        adminNotes.trim() || undefined,
        currentUser?.name || 'Administrator',
        acceptanceLetterText.trim()
      );
      setResignation(updated);
      setFeedback({
        type: 'success',
        message: 'Resignation notice approved and official acceptance letter issued successfully.',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee_requests_updated'));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to approve resignation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!resignation) return;
    if (!adminNotes.trim()) {
      setFeedback({ type: 'error', message: 'Please provide the reason for rejecting or declining the notice.' });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to decline/reject this resignation notice?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      const updated = await updateResignationStatus(
        resignation.id,
        'rejected',
        adminNotes.trim(),
        currentUser?.name || 'Administrator'
      );
      setResignation(updated);
      setFeedback({
        type: 'success',
        message: 'Resignation notice declined. Status updated to rejected.',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee_requests_updated'));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reject resignation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center max-w-4xl mx-auto">
        <RefreshCw size={30} className="animate-spin text-[#0b4da2] mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-500 m-0">Loading Resignation Application Review...</p>
      </div>
    );
  }

  if (error || !resignation) {
    return (
      <div className="p-16 text-center max-w-4xl mx-auto space-y-4">
        <AlertCircle size={40} className="text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 m-0">Notice Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto m-0">{error || 'Resignation record does not exist.'}</p>
        <div>
          <Link
            href="/employee/attendance/apply-resignation"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] text-white font-bold text-xs no-underline"
          >
            <ArrowLeft size={14} />
            <span>Return to Resignations Hub</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/employee/attendance/apply-resignation"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Resignations &amp; Clearances</span>
        </Link>

        <div className="flex items-center gap-2">
          {resignation.official_acceptance_letter && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Acceptance Letter</span>
            </button>
          )}

          <Link
            href="/employee/attendance/apply-resignation/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition no-underline shadow-xs"
          >
            <span>+ New Notice</span>
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-rose-200 text-xs font-bold mb-3 border border-white/10">
              <FileText size={13} className="text-rose-400" />
              <span>Resignation Review &bull; Application #{resignation.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              {resignation.employee_name || 'Staff Member'} ({resignation.employee_code})
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed m-0">
              Submitted on {String(resignation.apply_date).slice(0, 10)} &bull; Notice Period: {resignation.notice_period_days} Days
            </p>
          </div>

          <div className="shrink-0">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider ${
                resignation.status === 'approved'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : resignation.status === 'rejected'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                  : 'bg-amber-500 text-white shadow-lg shadow-amber-900/30'
              }`}
            >
              {resignation.status === 'approved' && <CheckCircle2 size={16} />}
              {resignation.status === 'rejected' && <AlertCircle size={16} />}
              {resignation.status === 'pending' && <Clock size={16} />}
              <span>Status: {resignation.status}</span>
            </span>
          </div>
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
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Resignation Details & Attached Files (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Timeline & Date Information Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                <Clock size={18} className="text-rose-600" />
                <span>Notice &amp; Departure Schedule</span>
              </h2>
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Notice #{resignation.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Submission Date
                </span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  {String(resignation.apply_date).slice(0, 10)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/60">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                  Requested Last Working Day
                </span>
                <span className="text-sm font-black text-rose-900 mt-1 block">
                  {String(resignation.requested_last_day).slice(0, 10)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Notice Period Duration
                </span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  {resignation.notice_period_days} Days
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Departure Reason
                </span>
                <span className="text-xs font-black text-slate-900 mt-1 block truncate">
                  {resignation.reason}
                </span>
              </div>
            </div>
          </div>

          {/* Formal Resignation Letter Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
              <FileText size={18} className="text-[#0b4da2]" />
              <span>Formal Resignation Letter</span>
            </h2>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {resignation.resignation_letter || 'No formal letter text entered.'}
            </div>
          </div>

          {/* Attached Document Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
              <Paperclip size={18} className="text-amber-600" />
              <span>Attached Physical Resignation Letter</span>
            </h2>

            {resignation.attachment_url ? (
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                      {resignation.attachment_name || 'Signed_Resignation_Letter'}
                    </span>
                    <span className="text-[11px] text-slate-500">Document attachment file</span>
                  </div>
                </div>

                <a
                  href={resignation.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-blue-800 text-white font-bold text-xs no-underline shadow-xs shrink-0"
                >
                  <Download size={14} />
                  <span>View / Download</span>
                </a>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <Paperclip size={24} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-400 font-semibold m-0">No physical file or document attached.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Decision Actions & Official Acceptance (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Official Acceptance Letter / Clearance Card (if decided) */}
          {resignation.official_acceptance_letter && (
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-xs p-6 space-y-3 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-emerald-900 m-0 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-600" />
                  <span>Issued Clearance Letter</span>
                </h2>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  Official
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0">
                Issued by <span className="font-bold text-slate-800">{resignation.admin_name || 'Management'}</span> on{' '}
                <span className="font-bold text-slate-800">{resignation.admin_action_date || 'Approved'}</span>
              </p>

              <div className="p-4 rounded-2xl bg-white border border-emerald-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {resignation.official_acceptance_letter}
              </div>

              {resignation.admin_notes && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">Admin Remarks:</span>
                  <span>{resignation.admin_notes}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer border-0 transition-all"
              >
                <Printer size={15} />
                <span>Print Official Clearance Letter</span>
              </button>
            </div>
          )}

          {/* Rejection / Decline Notice Card (if rejected) */}
          {resignation.status === 'rejected' && (
            <div className="bg-white rounded-3xl border border-rose-200 shadow-xs p-6 space-y-3 bg-rose-50/20">
              <h2 className="text-base font-bold text-rose-900 m-0 flex items-center gap-2">
                <AlertCircle size={20} className="text-rose-600" />
                <span>Notice Declined by Management</span>
              </h2>
              <p className="text-xs text-slate-600 m-0">
                Action by: <span className="font-bold">{resignation.admin_name || 'Management'}</span> on{' '}
                {resignation.admin_action_date || 'Recent'}
              </p>
              <div className="p-3.5 rounded-xl bg-white border border-rose-200 text-xs text-slate-800">
                <span className="font-bold text-rose-700 block mb-0.5">Decline Reason:</span>
                <p className="m-0 text-slate-700">{resignation.admin_notes || 'Please consult HR for details.'}</p>
              </div>
            </div>
          )}

          {/* Review Decision Panel (Approve and Reject Options) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  Review &amp; Administrative Decision
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 m-0">
                  Review resignation request, issue acceptance letter, or decline.
                </p>
              </div>
            </div>

            {/* Decision Toggle Tabs: Approve vs Reject */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setDecisionMode('approve')}
                className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                  decisionMode === 'approve'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>Approve Notice</span>
              </button>

              <button
                type="button"
                onClick={() => setDecisionMode('reject')}
                className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                  decisionMode === 'reject'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertCircle size={14} />
                <span>Decline / Reject</span>
              </button>
            </div>

            {/* Mode 1: APPROVE Form */}
            {decisionMode === 'approve' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Official Resignation Acceptance Letter to Issue: <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={acceptanceLetterText}
                    onChange={(e) => setAcceptanceLetterText(e.target.value)}
                    placeholder="Compose formal resignation acceptance letter..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600 leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This letter will be published to the employee portal for viewing and printing.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Internal Admin Remarks &amp; Clearance Notes:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clearance checklist verified, handover scheduled..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleApprove}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer border-0 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processing Approval...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Approve &amp; Issue Official Clearance</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mode 2: REJECT Form */}
            {decisionMode === 'reject' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                  <strong>Warning:</strong> Declining this resignation notice will inform the employee and notify HR to arrange a retention meeting.
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Reason for Declining / Management Notes: <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="State the reason for declining or instruction for the employee to contact HR..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleReject}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer border-0 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Declining Notice...</span>
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      <span>Decline / Reject Notice</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResignationReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center max-w-4xl mx-auto">
          <RefreshCw size={30} className="animate-spin text-[#0b4da2] mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500 m-0">Loading Review...</p>
        </div>
      }
    >
      <ResignationReviewContent />
    </Suspense>
  );
}
