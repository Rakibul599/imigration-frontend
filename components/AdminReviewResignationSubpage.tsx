'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Award,
  ShieldCheck,
  Check,
  X,
  File,
  User,
  Building2,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  getEmployeeResignationById,
  updateResignationStatus,
  EmployeeResignationItem,
} from '@/lib/employeeRequestsApi';

interface AdminReviewResignationSubpageProps {
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
}

function AdminReviewResignationContent({
  portalType,
  adminName = 'Super Admin',
}: AdminReviewResignationSubpageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');

  const [resignation, setResignation] = useState<EmployeeResignationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form decision state
  const [acceptanceLetterText, setAcceptanceLetterText] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Admin attachment state (for official signed clearance letter / exit form)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentSize, setAttachmentSize] = useState<string>('');

  const loadResignation = useCallback(async () => {
    if (!idParam) {
      setError('No resignation notice ID specified.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const item = await getEmployeeResignationById(idParam);
      if (item) {
        setResignation(item);
        setAdminNotes(item.admin_notes || '');
        if (item.official_acceptance_letter) {
          setAcceptanceLetterText(item.official_acceptance_letter);
        } else {
          setAcceptanceLetterText(
            `Dear ${item.employee_name || item.employee_code},\n\nThis letter serves as official confirmation and formal acceptance of your resignation from the organization. Your requested last working day has been confirmed as ${item.requested_last_day}, in accordance with your ${item.notice_period_days}-day notice period.\n\nPlease coordinate closely with HR and department management for the completion of the handover checklist and return of all company property.\n\nWe thank you for your service and wish you every success in your future endeavors.\n\nSincerely,\n${adminName}\nManagement & Human Resources`
          );
        }
      } else {
        setError('Resignation record not found.');
      }
    } catch (err: any) {
      console.error('Failed to load resignation:', err);
      setError(err.message || 'Failed to load resignation details.');
    } finally {
      setIsLoading(false);
    }
  }, [idParam, adminName]);

  useEffect(() => {
    loadResignation();
  }, [loadResignation]);

  // Handle attachment selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Attachment file size exceeds 10MB limit.' });
      return;
    }

    setAttachmentFile(file);
    setAttachmentName(file.name);

    const sizeInKb = (file.size / 1024).toFixed(1);
    setAttachmentSize(Number(sizeInKb) > 1024 ? `${(Number(sizeInKb) / 1024).toFixed(2)} MB` : `${sizeInKb} KB`);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setAttachmentName('');
    setAttachmentSize('');
  };

  // Reset template
  const handleResetTemplate = () => {
    if (!resignation) return;
    setAcceptanceLetterText(
      `Dear ${resignation.employee_name || resignation.employee_code},\n\nThis letter serves as official confirmation and formal acceptance of your resignation from the organization. Your requested last working day has been confirmed as ${resignation.requested_last_day}, in accordance with your ${resignation.notice_period_days}-day notice period.\n\nPlease coordinate closely with HR and department management for the completion of the handover checklist and return of all company property.\n\nWe thank you for your service and wish you every success in your future endeavors.\n\nSincerely,\n${adminName}\nManagement & Human Resources`
    );
  };

  // Approve Resignation
  const handleApprove = async () => {
    if (!resignation) return;
    if (!acceptanceLetterText.trim()) {
      setFeedback({ type: 'error', message: 'Please provide the official resignation acceptance letter text.' });
      return;
    }

    const confirmed = window.confirm(
      `Confirm approval of resignation notice for ${resignation.employee_name || resignation.employee_code}? This will issue the official clearance letter and update the employee portal.`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setFeedback(null);
    try {
      const updated = await updateResignationStatus(
        resignation.id,
        'approved',
        adminNotes.trim() || 'Resignation notice approved by management.',
        adminName,
        acceptanceLetterText.trim(),
        attachmentPreview || resignation.attachment_url,
        attachmentName || resignation.attachment_name
      );

      setResignation(updated);
      setFeedback({
        type: 'success',
        message: 'Resignation notice approved and official clearance letter issued successfully.',
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

  // Reject Resignation
  const handleReject = async () => {
    if (!resignation) return;

    const confirmed = window.confirm(
      `Are you sure you want to decline / reject this resignation notice for ${resignation.employee_name || resignation.employee_code}?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setFeedback(null);
    try {
      const updated = await updateResignationStatus(
        resignation.id,
        'rejected',
        adminNotes.trim() || 'Resignation notice declined after management review.',
        adminName,
        undefined
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
      <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-600 m-0">Loading Resignation Notice Review...</p>
      </div>
    );
  }

  if (error || !resignation) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-base font-bold text-slate-900 m-0">Unable to Load Notice</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto m-0">{error || 'Resignation record does not exist.'}</p>
        <div className="pt-2">
          <Link
            href={`/${portalType}/employees/resignations`}
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
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Breadcrumb & Nav */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/${portalType}/employees/resignations`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] bg-white border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition shadow-2xs no-underline"
        >
          <ArrowLeft size={14} />
          <span>Back to Resignations &amp; Clearances</span>
        </Link>

        <div className="flex items-center gap-2">
          {resignation.official_acceptance_letter && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Printer size={13} />
              <span>Print Letter</span>
            </button>
          )}

          <Link
            href={`/${portalType}/employees/resignations/new`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b4da2] text-white hover:bg-blue-800 text-xs font-bold transition shadow-2xs no-underline"
          >
            <span>+ Issue New Resignation</span>
          </Link>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800 font-bold ml-4 cursor-pointer border-0 bg-transparent"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Resignation Notice Review &bull; ID #{resignation.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 m-0">
              {resignation.employee_name || 'Staff Member'} ({resignation.employee_code})
            </h1>
            <p className="text-xs text-slate-500 mt-1 m-0">
              Submitted on {String(resignation.apply_date).slice(0, 10)} &bull; Notice Period: {resignation.notice_period_days} Days
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                resignation.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : resignation.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {resignation.status === 'approved' && <CheckCircle2 size={15} />}
              {resignation.status === 'rejected' && <XCircle size={15} />}
              {resignation.status === 'pending' && <Clock size={15} />}
              <span>{resignation.status}</span>
            </span>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Code</span>
            <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">{resignation.employee_code}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Notice Period</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">{resignation.notice_period_days} Days</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submission Date</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">{String(resignation.apply_date).slice(0, 10)}</span>
          </div>

          <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200/80">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Confirmed Last Day</span>
            <span className="text-xs font-black text-rose-700 mt-0.5 block">{String(resignation.requested_last_day).slice(0, 10)}</span>
          </div>
        </div>

        {/* Departure Reason */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Departure Category / Reason</span>
          <p className="text-xs font-semibold text-slate-800 m-0">{resignation.reason}</p>
        </div>

        {/* Employee's Attached File (if any) */}
        {resignation.attachment_url && (
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0">
                <Paperclip size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 m-0">{resignation.attachment_name || 'Signed Physical Resignation Document'}</p>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5">Physical document attached by applicant</p>
              </div>
            </div>

            <a
              href={resignation.attachment_url}
              target="_blank"
              rel="noreferrer"
              download={resignation.attachment_name || 'resignation_document'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b4da2] text-white hover:bg-blue-800 text-xs font-bold transition shadow-2xs no-underline shrink-0"
            >
              <Download size={13} />
              <span>Download File</span>
            </a>
          </div>
        )}

        {/* Employee's Submitted Formal Resignation Letter */}
        {resignation.resignation_letter && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">Formal Resignation Notice Submitted by Employee:</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {resignation.resignation_letter}
            </div>
          </div>
        )}
      </div>

      {/* Admin Decision Section */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0b4da2] border border-blue-200 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-1">
            <ShieldCheck size={12} />
            <span>Management Decision &amp; Clearance</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 m-0">Official Clearance &amp; Acceptance Letter</h2>
          <p className="text-xs text-slate-500 mt-0.5 m-0">
            {resignation.status === 'pending'
              ? 'Review the resignation terms, customize the official acceptance letter, attach physical clearance documents, and approve or reject.'
              : 'Review the issued clearance document and management decision records.'}
          </p>
        </div>

        {/* If Pending: Edit & Decide Form */}
        {resignation.status === 'pending' ? (
          <div className="space-y-5">
            {/* Acceptance Letter Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Official Resignation Acceptance Letter to Issue</span>
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="text-[11px] font-bold text-[#0b4da2] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
                >
                  <Sparkles size={11} />
                  <span>Reset to Standard Template</span>
                </button>
              </div>
              <textarea
                rows={7}
                value={acceptanceLetterText}
                onChange={(e) => setAcceptanceLetterText(e.target.value)}
                placeholder="Enter official acceptance letter text..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#0b4da2] leading-relaxed resize-y"
              />
              <p className="text-[11px] text-slate-400 mt-1 m-0">
                This official letter will be published directly to the employee&apos;s portal under Resignations &amp; Clearances.
              </p>
            </div>

            {/* Internal Admin Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Internal Admin Notes / Handover Clearance Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Handover checklist completed, IT assets surrendered, no liabilities."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
              />
            </div>

            {/* Admin File Attachment Option */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Attach Physical Signed Resignation Document or NDA (Optional)
              </label>

              {!attachmentFile ? (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-[#0b4da2] rounded-2xl cursor-pointer bg-slate-50/60 hover:bg-blue-50/30 transition-all text-center">
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">
                    Click to browse or drag and drop signed physical letter
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Supports PDF, DOC, DOCX, PNG, JPG (Max 10MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0">
                      <Paperclip size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 m-0 truncate max-w-sm">{attachmentName}</p>
                      <p className="text-[11px] text-slate-500 m-0">{attachmentSize} &bull; Attached</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Decision Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleReject}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer border-0 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Decline / Reject Notice'}
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApprove}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer border-0 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Approve Notice &amp; Issue Clearance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Already Decided View */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-xs">Issued Official Acceptance Letter:</span>
                <span className="text-[11px] text-emerald-700 font-bold">
                  Decision by {resignation.admin_name || 'Management'} on {resignation.admin_action_date || 'Confirmed'}
                </span>
              </div>
              <div className="p-4 bg-white border border-emerald-200/80 rounded-xl font-mono text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed">
                {resignation.official_acceptance_letter || 'No formal letter text recorded.'}
              </div>
            </div>

            {resignation.admin_notes && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Internal Clearance Notes
                </span>
                <p className="text-xs font-semibold text-slate-800 m-0">{resignation.admin_notes}</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer border-0"
              >
                <Printer size={14} />
                <span>Print Official Clearance Letter</span>
              </button>

              <Link
                href={`/${portalType}/employees/resignations`}
                className="px-5 py-2 rounded-xl bg-[#0b4da2] text-white font-bold text-xs no-underline hover:bg-blue-800 transition"
              >
                Done
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminReviewResignationSubpage(props: AdminReviewResignationSubpageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold">Loading resignation notice review...</span>
        </div>
      }
    >
      <AdminReviewResignationContent {...props} />
    </Suspense>
  );
}
