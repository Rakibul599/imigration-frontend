'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
  User,
  UserCheck,
  Building2,
  Search,
} from 'lucide-react';
import { issueOfficialResignationLetter } from '@/lib/employeeRequestsApi';

interface EmployeeOption {
  id: number;
  employee_code: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
  assigned_companies?: string[];
}

interface AdminAssignResignationSubpageProps {
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
  assignedScope?: string[];
}

function AdminAssignResignationContent({
  portalType,
  adminName = 'Super Admin',
  assignedScope = [],
}: AdminAssignResignationSubpageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCode = searchParams.get('employee_code') || '';

  // Employee State
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>(preselectedCode);
  const [employeeSearch, setEmployeeSearch] = useState<string>('');

  // Form State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [noticeDays, setNoticeDays] = useState<number>(30);
  const [lastDay, setLastDay] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [departureReason, setDepartureReason] = useState<string>('Formal Resignation Notice Accepted');
  const [adminNotes, setAdminNotes] = useState<string>('Clearance checklist verified and official release processed.');
  const [officialLetterText, setOfficialLetterText] = useState<string>('');

  // File Attachment State
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentSize, setAttachmentSize] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper to generate official acceptance letter
  const generateLetter = (empName: string, empCode: string, targetLastDay: string, days: number) => {
    return `Dear ${empName} (${empCode}),\n\nThis letter serves as official confirmation and formal acceptance of your resignation from the organization. Your final working day has been confirmed as ${targetLastDay}, in accordance with your ${days}-day notice period.\n\nPlease ensure all assigned company assets, equipment, access cards, and handover files are surrendered to human resources prior to your final departure.\n\nWe appreciate the dedication and effort you provided during your tenure and wish you the greatest success in your future professional endeavors.\n\nSincerely,\n${adminName}\nManagement & Human Resources`;
  };

  // Load employees ONCE on mount
  useEffect(() => {
    setIsLoadingEmployees(true);
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

    fetch(`${apiBase}/employees`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        let emps: EmployeeOption[] = Array.isArray(data) ? data : data.employees || [];

        // If masteradmin has assigned company scope, filter employees by company
        if (portalType === 'masteradmin' && assignedScope && assignedScope.length > 0) {
          emps = emps.filter((e) =>
            Array.isArray(e.assigned_companies)
              ? e.assigned_companies.some((c: string) => assignedScope.includes(c))
              : true
          );
        }

        setEmployees(emps);

        if (emps.length > 0) {
          // Check if preselected code exists in fetched employees
          const matched = preselectedCode
            ? emps.find((e) => e.employee_code.toLowerCase() === preselectedCode.toLowerCase())
            : null;

          const chosen = matched || emps[0];
          setSelectedEmployeeCode(chosen.employee_code);

          const defaultDate = new Date();
          defaultDate.setDate(defaultDate.getDate() + 30);
          const formattedLastDay = defaultDate.toISOString().split('T')[0];

          setOfficialLetterText(
            generateLetter(chosen.name, chosen.employee_code, formattedLastDay, 30)
          );
        }
      })
      .catch((err) => {
        console.error('Failed to load employees for resignation assignment:', err);
      })
      .finally(() => {
        setIsLoadingEmployees(false);
      });
  }, []); // Run only once on mount!

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // Currently selected employee object
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.employee_code === selectedEmployeeCode) || null;
  }, [employees, selectedEmployeeCode]);

  // When selected employee changes
  const handleEmployeeChange = (code: string) => {
    setSelectedEmployeeCode(code);
    const emp = employees.find((e) => e.employee_code === code);
    if (emp) {
      setOfficialLetterText(
        generateLetter(emp.name, emp.employee_code, lastDay, noticeDays)
      );
    }
  };

  // Update last day when notice days change
  const handleNoticeDaysChange = (days: number) => {
    setNoticeDays(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    const formatted = d.toISOString().split('T')[0];
    setLastDay(formatted);

    const empName = selectedEmployee?.name || 'Employee';
    const empCode = selectedEmployee?.employee_code || selectedEmployeeCode || 'EMP';
    setOfficialLetterText(generateLetter(empName, empCode, formatted, days));
  };

  // Preload standard professional letter template
  const handleLoadTemplate = () => {
    const empName = selectedEmployee?.name || 'Employee';
    const empCode = selectedEmployee?.employee_code || selectedEmployeeCode || 'EMP';
    setOfficialLetterText(generateLetter(empName, empCode, lastDay, noticeDays));
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeCode) {
      setFeedback({ type: 'error', message: 'Please select an employee.' });
      return;
    }
    if (!lastDay) {
      setFeedback({ type: 'error', message: "Please confirm the employee's last working day." });
      return;
    }
    if (!officialLetterText.trim()) {
      setFeedback({ type: 'error', message: 'Please provide the official resignation clearance letter text.' });
      return;
    }

    const empName = selectedEmployee?.name || selectedEmployeeCode;

    const confirmed = window.confirm(
      `Confirm issuing official resignation acceptance letter and clearance for ${empName} (${selectedEmployeeCode})? This will be published to the employee portal.`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await issueOfficialResignationLetter({
        employee_code: selectedEmployeeCode,
        employee_name: empName,
        last_working_day: lastDay,
        notice_period_days: noticeDays,
        reason: departureReason,
        official_acceptance_letter: officialLetterText.trim(),
        admin_name: adminName,
        admin_notes: adminNotes.trim() || undefined,
        attachment_url: attachmentPreview || undefined,
        attachment_name: attachmentName || undefined,
      });

      setFeedback({
        type: 'success',
        message: `Official resignation letter issued successfully for ${empName}. Redirecting...`,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee_requests_updated'));
      }

      setTimeout(() => {
        router.push(`/${portalType}/employees/resignations`);
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to issue resignation letter. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/${portalType}/employees/resignations`}
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
              <span>Administrative Offboarding &bull; Issue Notice Sub-Page</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              Issue Resignation &amp; Clearance Letter
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed m-0">
              Formally issue resignation acceptance, confirm the employee&apos;s contractual last day, attach signed handover documents, and generate official clearance.
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

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 m-0">Official Clearance &amp; Departure Form</h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Assigned by: <span className="font-bold text-slate-800">{adminName}</span>
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Official Management Direct Issue
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Select Employee */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Staff Member to Issue Notice <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Quick Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Filter staff by name or EMP code..."
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white transition-all"
                />
              </div>

              {/* Main Dropdown */}
              <div className="relative">
                <select
                  required
                  value={selectedEmployeeCode}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  disabled={isLoadingEmployees}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#0b4da2] focus:bg-white cursor-pointer transition-all font-mono"
                >
                  <option value="">-- Choose Employee --</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.employee_code} value={emp.employee_code}>
                      {emp.name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Employee Badge Card */}
            {selectedEmployee ? (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">{selectedEmployee.name}</span>
                    <span className="font-mono text-[11px] text-[#0b4da2] font-semibold">{selectedEmployee.employee_code}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[#0b4da2] uppercase">
                    {selectedEmployee.role || selectedEmployee.department || 'Active Staff'}
                  </span>
                  {selectedEmployee.email && (
                    <span className="text-[11px] text-slate-400 block mt-0.5 truncate max-w-[200px]">
                      {selectedEmployee.email}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              !isLoadingEmployees && employees.length === 0 && (
                <p className="text-xs text-rose-600 font-semibold mt-1">
                  No employee records available. Please check system staff list.
                </p>
              )
            )}
          </div>

          {/* Section 2: Notice Period & Confirmed Last Day */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Notice Period Duration <span className="text-rose-500">*</span>
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
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">Custom Days:</span>
                <input
                  type="number"
                  min={1}
                  value={noticeDays}
                  onChange={(e) => handleNoticeDaysChange(Number(e.target.value) || 1)}
                  className="w-24 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Confirmed Last Working Day <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={lastDay}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setLastDay(newDate);
                    const empName = selectedEmployee?.name || 'Employee';
                    const empCode = selectedEmployee?.employee_code || selectedEmployeeCode || 'EMP';
                    setOfficialLetterText(generateLetter(empName, empCode, newDate, noticeDays));
                  }}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 m-0">
                Automatically calculated based on the selected notice period.
              </p>
            </div>
          </div>

          {/* Section 3: Reason / Departure Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Departure Category / Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={departureReason}
              onChange={(e) => setDepartureReason(e.target.value)}
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="Formal Resignation Notice Accepted">Formal Resignation Notice Accepted</option>
              <option value="Contract Completion / Mutual Release">Contract Completion / Mutual Release</option>
              <option value="Career Transition &amp; External Opportunity">Career Transition &amp; External Opportunity</option>
              <option value="Relocation / Personal Circumstances">Relocation / Personal Circumstances</option>
              <option value="Administrative Offboarding">Administrative Offboarding</option>
            </select>
          </div>

          {/* Section 4: Official Resignation Acceptance Letter to Issue */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Official Resignation Acceptance Letter to Issue <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleLoadTemplate}
                className="text-xs font-bold text-[#0b4da2] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
              >
                <Sparkles size={12} />
                <span>Reset to Standard Letter Template</span>
              </button>
            </div>
            <textarea
              rows={7}
              required
              value={officialLetterText}
              onChange={(e) => setOfficialLetterText(e.target.value)}
              placeholder="Enter official resignation letter text..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#0b4da2] leading-relaxed resize-y"
            />
            <p className="text-[11px] text-slate-400 mt-1 m-0">
              This official letter will be published directly to the employee portal under Resignations &amp; Clearances.
            </p>
          </div>

          {/* Section 5: Internal Clearance Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Internal Clearance Remarks &amp; Asset Handover Notes (Optional)
            </label>
            <input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Returned laptop and company badge, no outstanding payroll balance."
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
            />
          </div>

          {/* Section 6: File Attachment */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
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

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href={`/${portalType}/employees/resignations`}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors no-underline"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !selectedEmployeeCode}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#0b4da2] hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer border-0 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Issuing Clearance...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Issue &amp; Send to Employee</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminAssignResignationSubpage(props: AdminAssignResignationSubpageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold">Loading resignation form...</span>
        </div>
      }
    >
      <AdminAssignResignationContent {...props} />
    </Suspense>
  );
}
