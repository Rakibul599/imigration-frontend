'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Sparkles,
  UserCheck,
  Building2,
  Award,
} from 'lucide-react';
import { createEmployeeLeave } from '@/lib/employeeRequestsApi';

interface AdminAssignLeaveSubpageProps {
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
}

interface EmployeeOption {
  id: number;
  employee_code: string;
  name: string;
  email?: string;
  role?: string;
  assigned_companies?: string[];
}

export default function AdminAssignLeaveSubpage({
  portalType,
  adminName = 'Super Admin',
}: AdminAssignLeaveSubpageProps) {
  const router = useRouter();
  const backHref = portalType === 'superadmin'
    ? '/superadmin/attendance/leaves'
    : '/masteradmin/attendance/leaves';

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form State
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [leaveType, setLeaveType] = useState<'holiday' | 'annual_leave'>('holiday');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('Directly approved and granted by administrative office.');
  const [initialStatus, setInitialStatus] = useState<'approved' | 'pending'>('approved');

  // Attachment State
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load employees
  useEffect(() => {
    setIsLoadingEmployees(true);
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    fetch(`${apiBase}/employees`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data);
          if (data.length > 0) {
            setSelectedEmployeeCode(data[0].employee_code);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load employees for leave assignment:', err);
      })
      .finally(() => {
        setIsLoadingEmployees(false);
      });
  }, []);

  // Filtered employees for dropdown
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.employee_code === selectedEmployeeCode) || null;
  }, [employees, selectedEmployeeCode]);

  // Duration calculation
  const daysCount = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  // Handle attachment file
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
    if (!selectedEmployeeCode) {
      setFeedback({ type: 'error', message: 'Please select an employee.' });
      return;
    }
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a title or occasion for the assignment.' });
      return;
    }
    if (!startDate || !endDate) {
      setFeedback({ type: 'error', message: 'Please specify the start and end dates.' });
      return;
    }
    if (endDate < startDate) {
      setFeedback({ type: 'error', message: 'End date cannot be earlier than start date.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await createEmployeeLeave({
        employee_code: selectedEmployeeCode,
        employee_name: selectedEmployee?.name || selectedEmployeeCode,
        leave_type: leaveType,
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        reason: reason.trim() || undefined,
        attachment_url: attachmentPreview || undefined,
        attachment_name: attachmentName || undefined,
        status: initialStatus,
        approved_by: initialStatus === 'approved' ? adminName : undefined,
        admin_notes: adminNotes.trim() || undefined,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee_requests_updated'));
      }

      setFeedback({
        type: 'success',
        message: `${leaveType === 'holiday' ? 'Holiday' : 'Annual Leave'} assigned successfully for ${selectedEmployee?.name || selectedEmployeeCode}!`,
      });

      setTimeout(() => {
        router.push(backHref);
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to assign leave. Please check your connection and try again.',
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
          href={backHref}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Leaves &amp; Holiday Management</span>
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-yellow-300 text-xs font-bold mb-3 border border-white/10">
              <Calendar size={13} className="text-yellow-400" />
              <span>Administrative Directive &bull; Dedicated Sub-Page</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              Assign Holiday / Leave to Employee
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed m-0">
              Officially allocate a gazetted holiday extension, duty compensation off, or annual leave to a specific staff member.
            </p>
          </div>
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

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 m-0">Assignment Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5 m-0">
            Select the employee, define holiday dates, and specify administrative clearance notes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Choose Employee */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Staff Member <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search staff by name or EMP code..."
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all"
                  />
                </div>

                {/* Dropdown */}
                <select
                  required
                  value={selectedEmployeeCode}
                  onChange={(e) => setSelectedEmployeeCode(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all font-mono"
                >
                  {filteredEmployees.map((emp) => (
                    <option key={emp.employee_code} value={emp.employee_code}>
                      {emp.name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-[#0b4da2]" />
                    <span className="font-bold text-slate-900">{selectedEmployee.name}</span>
                    <span className="font-mono text-slate-500">[{selectedEmployee.employee_code}]</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#0b4da2] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    {selectedEmployee.role || 'Staff'}
                  </span>
                </div>
              )}
            </div>

            {/* Leave / Holiday Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assignment Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveType('holiday')}
                  className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    leaveType === 'holiday'
                      ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Calendar size={14} />
                  <span>Holiday Assign</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveType('annual_leave')}
                  className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    leaveType === 'annual_leave'
                      ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Award size={14} />
                  <span>Annual Leave</span>
                </button>
              </div>
            </div>

            {/* Initial Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Approval Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all"
              >
                <option value="approved">Approve &amp; Grant Immediately</option>
                <option value="pending">Keep in Pending Review Queue</option>
              </select>
            </div>

            {/* Title / Occasion */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Occasion / Subject Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. National Day Gazetted Holiday, Labour Day Off Compensation, Festival Break"
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

            {/* Total Duration Banner */}
            <div className="md:col-span-2 bg-blue-50/60 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-950 m-0">Granted Period Duration</p>
                  <p className="text-[11px] text-blue-700 m-0">
                    From {startDate} to {endDate}
                  </p>
                </div>
              </div>
              <span className="text-base font-black text-[#0b4da2] bg-white px-4 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
              </span>
            </div>

            {/* Reason / Administrative Directive */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Reason &amp; Description
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the purpose for officially assigning this holiday or leave..."
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all resize-y"
              />
            </div>

            {/* Admin Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Administrator Approval Remarks
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Approved and authorized by Super Administrator"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all"
              />
            </div>

            {/* Supporting Document / Circular Attachment */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Supporting Circular / Official Memo Attachment (Optional)
              </label>

              {!attachmentFile ? (
                <label className="border-2 border-dashed border-slate-300 hover:border-[#0b4da2] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all text-center">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0b4da2] flex items-center justify-center">
                    <Upload size={22} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Upload official holiday notice or administrative memorandum
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports PDF, DOC, PNG, JPG (Max: 10MB)
                  </span>
                </label>
              ) : (
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0">
                      <Paperclip size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate m-0">{attachmentName}</p>
                      <p className="text-[11px] text-slate-500 m-0">
                        {(attachmentFile.size / 1024).toFixed(1)} KB &bull; Attached and ready
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
              href={backHref}
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
                  <span>Assigning &amp; Saving...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Assign &amp; Grant Holiday</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
