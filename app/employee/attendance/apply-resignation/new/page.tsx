'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  ShieldCheck,
  Check,
  X,
  File,
} from 'lucide-react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import { createEmployeeResignation } from '@/lib/employeeRequestsApi';

export default function ApplyResignationNewPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [noticeDays, setNoticeDays] = useState<number>(30);
  const [lastDay, setLastDay] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [departureReason, setDepartureReason] = useState<string>('Career Opportunity & Growth');
  const [letterText, setLetterText] = useState<string>('');

  // Attachment state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentSize, setAttachmentSize] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Update last day when notice days change
  const handleNoticeDaysChange = (days: number) => {
    setNoticeDays(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setLastDay(d.toISOString().split('T')[0]);
  };

  // Preload standard professional resignation letter template
  const handleLoadTemplate = () => {
    const empName = currentUser?.name || 'Employee';
    const empCode = currentUser?.employee_code || 'EMP';
    const template = `Dear Management,\n\nPlease accept this letter as formal notification that I am resigning from my position at the company. My requested last working day of employment will be ${lastDay}, in accordance with my ${noticeDays}-day notice period.\n\nI want to thank you and the management for the opportunities and professional experience I have gained during my tenure. I am committed to assisting with a smooth handover of my tasks and responsibilities prior to my departure.\n\nSincerely,\n${empName} (${empCode})`;
    setLetterText(template);
  };

  // Handle file attachment selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Attachment file size exceeds 10MB limit.' });
      return;
    }

    setAttachmentFile(file);
    setAttachmentName(file.name);

    // Format size
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastDay) {
      setFeedback({ type: 'error', message: 'Please specify your requested last working day.' });
      return;
    }
    if (!letterText.trim()) {
      setFeedback({ type: 'error', message: 'Please write or generate your formal resignation letter text.' });
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to submit your official resignation notice? This action will notify human resources and administrative management.'
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await createEmployeeResignation({
        employee_code: currentUser?.employee_code || 'DEMO2026',
        employee_name: currentUser?.name || 'Staff Member',
        apply_date: todayStr,
        requested_last_day: lastDay,
        notice_period_days: noticeDays,
        reason: departureReason,
        resignation_letter: letterText.trim(),
        attachment_url: attachmentPreview || undefined,
        attachment_name: attachmentName || undefined,
      });

      setFeedback({
        type: 'success',
        message: 'Formal resignation notice submitted successfully. Redirecting to your notice dashboard...',
      });

      // Dispatch event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee_requests_updated'));
      }

      setTimeout(() => {
        router.push('/employee/attendance/apply-resignation');
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit resignation notice. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/employee/attendance/apply-resignation"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Resignations &amp; Clearances</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-rose-200 text-xs font-bold mb-3 border border-white/10">
              <FileText size={13} className="text-rose-400" />
              <span>Official Resignation Notice Form &bull; Sub-Page</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              Submit Notice of Resignation
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed m-0">
              Schedule your contractual notice period, provide departure details, attach your signed letter, and initiate clearance with management.
            </p>
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

      {/* Main Resignation Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 m-0">Resignation &amp; Clearance Details</h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Fill in all mandatory fields before sending for formal administrative review.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Applicant: {currentUser?.name || 'Employee'} ({currentUser?.employee_code || 'EMP'})
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Notice Period & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Notice Period Quick Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Contractual Notice Period <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleNoticeDaysChange(days)}
                    className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      noticeDays === days
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400">Or custom days:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={noticeDays}
                  onChange={(e) => handleNoticeDaysChange(Number(e.target.value) || 30)}
                  className="w-24 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Requested Last Working Day */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Requested Last Working Day <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={lastDay}
                  onChange={(e) => setLastDay(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 m-0">
                Calculated based on notice period. Can be adjusted per mutual agreement.
              </p>
            </div>
          </div>

          {/* Section 2: Reason for Departure */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Primary Reason for Resignation <span className="text-rose-500">*</span>
            </label>
            <select
              value={departureReason}
              onChange={(e) => setDepartureReason(e.target.value)}
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="Career Opportunity & Growth">Career Opportunity &amp; Growth</option>
              <option value="Personal / Family Commitments">Personal / Family Commitments</option>
              <option value="Relocation / Geographic Move">Relocation / Geographic Move</option>
              <option value="Higher Education / Further Studies">Higher Education / Further Studies</option>
              <option value="Health / Medical Reasons">Health / Medical Reasons</option>
              <option value="Better Compensation & Benefits">Better Compensation &amp; Benefits</option>
              <option value="Retirement">Retirement</option>
              <option value="Other">Other Personal Reasons</option>
            </select>
          </div>

          {/* Section 3: Resignation Letter Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider m-0">
                Formal Resignation Letter Text <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleLoadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 py-1 px-3 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Load Professional Letter Template</span>
              </button>
            </div>
            <textarea
              rows={7}
              required
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              placeholder="Write your official resignation letter here, addressing management with your reasons and handover commitment..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-mono leading-relaxed focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Section 4: File Attachment Option */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Attach Physical Signed Letter or Handover File (Optional)
            </label>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              {!attachmentFile ? (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-rose-400 bg-white transition-colors cursor-pointer relative">
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">
                    Click to browse or drag &amp; drop signed document
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Supports PDF, DOC, DOCX, PNG, JPG (Max: 10MB)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 bg-white border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <File size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-sm">
                        {attachmentName}
                      </span>
                      <span className="text-[10px] text-slate-400">{attachmentSize} &bull; Ready to upload</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                    title="Remove attachment"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/employee/attendance/apply-resignation"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors no-underline"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer border-0 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Submitting Notice...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Submit Formal Resignation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
