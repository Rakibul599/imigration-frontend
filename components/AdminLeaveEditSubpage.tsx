'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  Save,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  getEmployeeLeaveById,
  updateEmployeeLeave,
  deleteEmployeeLeave,
  EmployeeLeaveItem,
} from '@/lib/employeeRequestsApi';

interface AdminLeaveEditSubpageProps {
  leaveId: string;
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
}

export default function AdminLeaveEditSubpage({
  leaveId,
  portalType,
  adminName = 'Administrator',
}: AdminLeaveEditSubpageProps) {
  const router = useRouter();
  const [leave, setLeave] = useState<EmployeeLeaveItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [leaveType, setLeaveType] = useState<'holiday' | 'annual_leave'>('holiday');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [adminNotes, setAdminNotes] = useState('');

  // Attachment state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');

  const loadLeave = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEmployeeLeaveById(leaveId);
      setLeave(data);
      setLeaveType(data.leave_type);
      setTitle(data.title);
      setStartDate(String(data.start_date).slice(0, 10));
      setEndDate(String(data.end_date).slice(0, 10));
      setReason(data.reason || '');
      setEmergencyContact(data.emergency_contact || '');
      setStatus(data.status);
      setAdminNotes(data.admin_notes || '');
      if (data.attachment_url) {
        setAttachmentPreview(data.attachment_url);
        setAttachmentName(data.attachment_name || 'Current Attachment');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load application data.' });
    } finally {
      setIsLoading(false);
    }
  }, [leaveId]);

  useEffect(() => {
    loadLeave();
  }, [loadLeave]);

  // Calculate day count
  const daysCount = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'File size exceeds maximum limit of 10MB.' });
        return;
      }
      setAttachmentFile(file);
      setAttachmentName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setAttachmentPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview(null);
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setAttachmentName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a title / occasion.' });
      return;
    }
    if (!startDate || !endDate) {
      setFeedback({ type: 'error', message: 'Please select both start and end dates.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      let finalAttachmentUrl = attachmentFile ? null : leave?.attachment_url;
      let finalAttachmentName = attachmentFile ? null : leave?.attachment_name;

      // Upload file if new file selected
      if (attachmentFile) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
        const upRes = await fetch(`${apiBase}/upload`, {
          method: 'POST',
          body: formData,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          finalAttachmentUrl = upData.url || upData.file_url;
          finalAttachmentName = attachmentFile.name;
        }
      }

      await updateEmployeeLeave(leaveId, {
        leave_type: leaveType,
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        reason: reason.trim(),
        emergency_contact: emergencyContact.trim(),
        status,
        approved_by: status === 'approved' ? adminName : leave?.approved_by,
        admin_notes: adminNotes.trim(),
        attachment_url: finalAttachmentUrl || undefined,
        attachment_name: finalAttachmentName || undefined,
      });

      setFeedback({ type: 'success', message: 'Application updated successfully!' });
      window.dispatchEvent(new Event('employee_requests_updated'));

      setTimeout(() => {
        router.push(`/${portalType}/attendance/leaves`);
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!leave) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this application for ${leave.employee_name || leave.employee_code}?`
    );
    if (!confirmed) return;

    try {
      await deleteEmployeeLeave(leave.id);
      window.dispatchEvent(new Event('employee_requests_updated'));
      router.push(`/${portalType}/attendance/leaves`);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete application.' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href={`/${portalType}/attendance/leaves/${leaveId}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 no-underline"
        >
          <ArrowLeft size={16} />
          <span>Cancel &amp; Back to Details</span>
        </Link>

        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 py-1.5 px-3 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200 bg-white"
        >
          <Trash2 size={14} />
          <span>Delete Application</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-100 text-xs font-bold mb-3 border border-white/10">
            <Calendar size={13} className="text-yellow-300" />
            <span>Application Editor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white m-0 tracking-tight">
            Edit Holiday / Leave #{leaveId}
          </h1>
          <p className="text-amber-100/90 text-xs sm:text-sm mt-1 max-w-2xl m-0">
            Applicant: <span className="font-bold text-white">{leave?.employee_name} ({leave?.employee_code})</span>
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
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
            ✕
          </button>
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        {/* Row 1: Type & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Leave Category *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeaveType('holiday')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  leaveType === 'holiday'
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Public Holiday
              </button>
              <button
                type="button"
                onClick={() => setLeaveType('annual_leave')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  leaveType === 'annual_leave'
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Annual / Medical
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Approval Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved (Granted)</option>
              <option value="rejected">Rejected (Declined)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Occasion / Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Eid-ul-Fitr, Annual Leave, Deepavali Holiday"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
          />
        </div>

        {/* Row 3: Dates & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Date *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">End Date *</label>
            <input
              type="date"
              required
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Calculated Duration</label>
            <div className="h-11 px-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <span className="text-xs font-bold text-[#0b4da2]">Total Days:</span>
              <span className="text-sm font-black text-[#0b4da2]">{daysCount} {daysCount === 1 ? 'Day' : 'Days'}</span>
            </div>
          </div>
        </div>

        {/* Row 4: Reason & Emergency Contact */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason / Remarks</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the purpose, travel plans, or remarks..."
              className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Emergency Contact (Optional)</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+60 12-345 6789"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin Directive Notes</label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Official notes or remarks for records..."
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>
          </div>
        </div>

        {/* Row 5: Supporting Attachment */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold text-slate-700">Supporting File Attachment</label>
          {attachmentName ? (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <Paperclip size={16} className="text-[#0b4da2] shrink-0" />
                <span className="text-xs font-bold text-[#0b4da2] truncate">{attachmentName}</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="p-1 rounded-lg hover:bg-red-100 text-rose-600 transition cursor-pointer border-0 bg-transparent shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-200 hover:border-[#0b4da2] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition group">
              <Upload size={22} className="text-slate-400 group-hover:text-[#0b4da2] mb-1" />
              <p className="text-xs font-bold text-slate-700 m-0">Click to upload new document</p>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">PDF, PNG, JPG up to 10MB</p>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href={`/${portalType}/attendance/leaves/${leaveId}`}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition no-underline"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer border-0 disabled:opacity-50"
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
