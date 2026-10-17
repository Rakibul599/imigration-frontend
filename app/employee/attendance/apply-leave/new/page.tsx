'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  Send,
  Eye,
  RefreshCw,
  Sparkles,
  Award,
} from 'lucide-react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import {
  getEmployeeLeaves,
  createEmployeeLeave,
  EmployeeLeaveStats,
} from '@/lib/employeeRequestsApi';

export default function NewAnnualLeaveApplicationPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [leaveCategory, setLeaveCategory] = useState<'annual_leave' | 'medical' | 'emergency'>('annual_leave');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Attachment state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Annual leave stats
  const [leaveStats, setLeaveStats] = useState<EmployeeLeaveStats>({
    total_holidays_applied: 0,
    approved_holidays: 0,
    annual_leave_quota: 14,
    annual_leave_taken: 0,
    annual_leave_pending: 0,
    annual_leave_remaining: 14,
  });

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user?.employee_code) {
      getEmployeeLeaves({ employee_code: user.employee_code, leave_type: 'annual_leave' })
        .then((res) => {
          if (res.stats) setLeaveStats(res.stats);
        })
        .catch(() => {});
    }
  }, []);

  // Calculate day count
  const daysCount = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setFeedback({ type: 'error', message: 'Please specify the start and end dates.' });
      return;
    }
    if (endDate < startDate) {
      setFeedback({ type: 'error', message: 'End date cannot be earlier than start date.' });
      return;
    }

    if (daysCount > leaveStats.annual_leave_remaining && leaveCategory === 'annual_leave') {
      const confirmed = window.confirm(
        `Requested duration (${daysCount} days) exceeds your total remaining annual leave (${leaveStats.annual_leave_remaining} days). Do you still wish to submit for special approval?`
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const leaveTitle = title.trim() || `Annual Leave (${daysCount} ${daysCount === 1 ? 'Day' : 'Days'})`;

    try {
      await createEmployeeLeave({
        employee_code: currentUser?.employee_code || 'DEMO2026',
        employee_name: currentUser?.name || 'Staff Member',
        leave_type: 'annual_leave',
        title: leaveTitle,
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        reason: reason.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        attachment_url: attachmentPreview || undefined,
        attachment_name: attachmentName || undefined,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee_requests_updated'));
      }

      setFeedback({
        type: 'success',
        message: 'Annual leave application submitted successfully! Redirecting to applications list...',
      });

      setTimeout(() => {
        router.push('/employee/attendance/apply-leave');
      }, 1000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit leave application. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/employee/attendance/apply-leave"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Annual Leave List</span>
        </Link>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-[#0b4da2] to-blue-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-bold mb-3 border border-white/10">
              <Award size={13} className="text-yellow-300" />
              <span>Annual Leave Application Form &bull; Sub-Page</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              Apply for Annual Leave
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed m-0">
              Submit your paid annual vacation leave, medical leave, or personal time-off with instant leave tracking and document attachments.
            </p>
          </div>
        </div>
      </div>

      {/* Annual Leave Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Yearly Annual Leave</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{leaveStats.annual_leave_quota} Days</span>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Total entitlement</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Leaves Taken</span>
          <span className="text-2xl font-black text-slate-700 mt-1 block">{leaveStats.annual_leave_taken} Days</span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Approved</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{leaveStats.annual_leave_pending} Days</span>
          <span className="text-[11px] text-amber-600 font-semibold mt-1 block">Awaiting decision</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <span className="text-xs font-bold text-[#0b4da2] uppercase tracking-wider block">Total Remaining Annual Leave</span>
          <span className="text-2xl font-black text-[#0b4da2] mt-1 block">{leaveStats.annual_leave_remaining} Days</span>
          <span className="text-[11px] text-[#0b4da2] font-semibold mt-1 block">Available now</span>
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

      {/* Main Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 m-0">Leave Application Information</h2>
          <p className="text-xs text-slate-500 mt-0.5 m-0">
            Select dates, provide handover notes, and attach medical certificate or travel documentation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Leave Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={leaveCategory}
                onChange={(e) => setLeaveCategory(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all font-semibold"
              >
                <option value="annual_leave">Annual Paid Vacation Leave</option>
                <option value="medical">Medical / Sick Leave (With MC)</option>
                <option value="emergency">Emergency / Compassionate Leave</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Subject / Purpose
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Family Vacation, Doctor Appointment"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all font-semibold"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all font-mono font-bold"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all font-mono font-bold"
              />
            </div>

            {/* Duration Display */}
            <div className="md:col-span-2 bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-950 m-0">Requested Duration: {daysCount} Days</p>
                  <p className="text-[11px] text-indigo-700 m-0">
                    Remaining after this application: {Math.max(0, leaveStats.annual_leave_remaining - daysCount)} Days
                  </p>
                </div>
              </div>

              {daysCount > leaveStats.annual_leave_remaining && (
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  Exceeds total remaining annual leave ({leaveStats.annual_leave_remaining} days left)
                </span>
              )}
            </div>

            {/* Reason */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Reason &amp; Work Handover Instructions
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State your reason and note any duties assigned to colleagues during your leave..."
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all resize-y"
              />
            </div>

            {/* Emergency Contact */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Emergency Contact Number
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. +60 12-345 6789"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Attachment */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Supporting Attachment (Medical Certificate / Tickets / Proof)
              </label>

              {!attachmentFile ? (
                <label className="border-2 border-dashed border-slate-300 hover:border-[#0b4da2] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all text-center">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Upload size={22} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Click to browse or drag &amp; drop document
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports Medical Certificates, PDF, PNG, JPG (Max: 10MB)
                  </span>
                </label>
              ) : (
                <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Paperclip size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate m-0">{attachmentName}</p>
                      <p className="text-[11px] text-slate-500 m-0">
                        {(attachmentFile.size / 1024).toFixed(1)} KB &bull; Ready for upload
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {attachmentPreview && (
                      <a
                        href={attachmentPreview}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl text-slate-600 hover:text-[#0b4da2] hover:bg-white transition-colors"
                        title="Preview attachment"
                      >
                        <Eye size={16} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors border-0 bg-transparent cursor-pointer"
                      title="Remove attachment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/employee/attendance/apply-leave"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors no-underline"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer border-0 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Submitting Leave...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Submit Annual Leave Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
