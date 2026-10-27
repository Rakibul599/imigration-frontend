'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileCheck,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Check,
  X,
  File,
  User,
  UserCheck,
  Building2,
  Search,
  DollarSign,
  Briefcase,
  Printer,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface EmployeeOption {
  id: number;
  employee_code: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
  status?: string;
  assigned_companies?: string[];
  documents?: any[];
  created_at?: string;
}

interface AdminAssignJoiningLetterSubpageProps {
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
  assignedScope?: string[];
}

function AdminAssignJoiningLetterContent({
  portalType,
  adminName = 'Super Admin',
  assignedScope = [],
}: AdminAssignJoiningLetterSubpageProps) {
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
  const [refNumber, setRefNumber] = useState<string>('');
  const [joiningDate, setJoiningDate] = useState<string>(todayStr);
  const [designation, setDesignation] = useState<string>('Executive Officer');
  const [department, setDepartment] = useState<string>('Operations & Management');
  const [salary, setSalary] = useState<string>('RM 3,800.00');
  const [allowances, setAllowances] = useState<string>('RM 400.00 (Transport & Utilities)');
  const [probationMonths, setProbationMonths] = useState<string>('3 Months');
  const [workingSchedule, setWorkingSchedule] = useState<string>('Monday - Friday (9:00 AM - 6:00 PM)');
  const [supervisorTitle, setSupervisorTitle] = useState<string>('Director of Operations & Human Resources');
  const [workLocation, setWorkLocation] = useState<string>('Corporate Headquarters, Menara Acco, Kuala Lumpur');
  const [specialTerms, setSpecialTerms] = useState<string>(
    'Employee has successfully satisfied standard reference checks and background credentials. Appointment is governed under organization bylaws and statutory labor compliance.'
  );

  // File Attachment State
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentSize, setAttachmentSize] = useState<string>('');

  // Preview Modal State (opened via Eye icon)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [confirmedLegal, setConfirmedLegal] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Path helper
  const isDedicatedSuperadmin = typeof window !== 'undefined' && !window.location.pathname.startsWith('/superadmin');
  const listPageUrl = portalType === 'masteradmin'
    ? '/masteradmin/employees/joining-letter'
    : isDedicatedSuperadmin
    ? '/employees/joining-letter'
    : '/superadmin/employees/joining-letter';

  // Load employees
  useEffect(() => {
    setIsLoadingEmployees(true);
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

    fetch(`${apiBase}/employees`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        let emps: EmployeeOption[] = Array.isArray(data) ? data : data.employees || [];

        if (portalType === 'masteradmin' && assignedScope && assignedScope.length > 0) {
          emps = emps.filter((e) =>
            Array.isArray(e.assigned_companies)
              ? e.assigned_companies.some((c) => assignedScope.includes(c))
              : false
          );
        }

        setEmployees(emps);

        if (preselectedCode) {
          const match = emps.find((e) => e.employee_code.toLowerCase() === preselectedCode.toLowerCase());
          if (match) {
            setSelectedEmployeeCode(match.employee_code);
            syncEmployeeDetails(match);
          }
        } else if (emps.length > 0) {
          setSelectedEmployeeCode(emps[0].employee_code);
          syncEmployeeDetails(emps[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load employees for joining letter subpage:', err);
      })
      .finally(() => {
        setIsLoadingEmployees(false);
      });
  }, [portalType, preselectedCode]);

  // Synchronize employee fields when selected
  const syncEmployeeDetails = (emp: EmployeeOption) => {
    const rawCode = emp.employee_code.replace(/[^0-9]/g, '') || String(emp.id);
    setRefNumber(`REF-APP-${new Date().getFullYear()}-${rawCode.padStart(3, '0')}`);
    setDesignation(emp.role || 'Executive Officer');
    if (emp.created_at) {
      setJoiningDate(emp.created_at.slice(0, 10));
    }
  };

  // Selected employee object
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.employee_code === selectedEmployeeCode) || null;
  }, [employees, selectedEmployeeCode]);

  // Check if selected employee already has a joining letter
  const existingJoiningDoc = useMemo(() => {
    if (!selectedEmployee || !Array.isArray(selectedEmployee.documents)) return null;
    return (
      selectedEmployee.documents.find(
        (d: any) =>
          (d.name || '').toLowerCase().includes('joining') ||
          (d.name || '').toLowerCase().includes('appointment')
      ) || null
    );
  }, [selectedEmployee]);

  // Filtered dropdown list
  const filteredEmployeeOptions = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // File change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Attachment size exceeds maximum limit of 15 MB.' });
      return;
    }

    setAttachmentFile(file);
    setAttachmentName(file.name);
    const sizeKB = Math.round(file.size / 1024);
    setAttachmentSize(sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB / 1024).toFixed(1)} MB`);

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentDataUrl(null);
    setAttachmentName('');
    setAttachmentSize('');
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setFeedback({ type: 'error', message: 'Please select an employee to issue the letter.' });
      return;
    }

    if (!refNumber.trim()) {
      setFeedback({ type: 'error', message: 'Please provide an appointment reference number.' });
      return;
    }

    if (!joiningDate) {
      setFeedback({ type: 'error', message: 'Please provide the official date of joining.' });
      return;
    }

    if (!confirmedLegal) {
      setFeedback({ type: 'error', message: 'Please verify the administrative confirmation checkbox.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

    try {
      const empRes = await fetch(`${apiBase}/employees/${selectedEmployee.id}`, { cache: 'no-store' });
      const currentEmp = empRes.ok ? await empRes.json() : selectedEmployee;

      const currentDocs = Array.isArray(currentEmp.documents) ? [...currentEmp.documents] : [];
      const filteredDocs = currentDocs.filter(
        (d: any) =>
          !(d.name || '').toLowerCase().includes('joining') &&
          !(d.name || '').toLowerCase().includes('appointment')
      );

      const newDoc = {
        name: `Official Employment Contract & Joining Letter (${refNumber.trim()})`,
        issue_date: joiningDate,
        expire_date: null,
        number: refNumber.trim(),
        url: attachmentDataUrl || '/images/epf-kwsp.svg',
        dataUrl: attachmentDataUrl || undefined,
        size: attachmentSize || '420 KB',
        type: attachmentFile ? attachmentFile.type : 'application/pdf',
      };

      filteredDocs.unshift(newDoc);

      const updatePayload = {
        name: currentEmp.name,
        employee_code: currentEmp.employee_code,
        email: currentEmp.email,
        role: designation.trim() || currentEmp.role,
        assigned_companies: currentEmp.assigned_companies,
        status: currentEmp.status || 'active',
        documents: filteredDocs,
      };

      const putRes = await fetch(`${apiBase}/employees/${currentEmp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!putRes.ok) {
        const errorData = await putRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update employee joining letter record on server.');
      }

      setFeedback({
        type: 'success',
        message: `Official Joining & Appointment Letter issued successfully for ${selectedEmployee.name} (${refNumber}). Redirecting...`,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee_requests_updated'));
      }

      setTimeout(() => {
        router.push(listPageUrl);
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to issue joining letter. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Breadcrumb & Action Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={listPageUrl}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Joining Letters &amp; Records</span>
        </Link>

        {/* Eye icon preview button */}
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          title="Preview Official Joining Letter"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all py-1.5 px-3.5 rounded-xl cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          <Eye size={15} className="text-[#0b4da2]" />
          <span>Preview Letter</span>
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
            <FileCheck size={12} />
            <span>Formal Staff Appointment &amp; Onboarding</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
            Issue Official Joining &amp; Appointment Letter
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed m-0">
            Configure official remuneration terms, attach signed agreements, and publish directly to the employee portal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer border-0 shrink-0"
        >
          <Eye size={14} className="text-[#0b4da2]" />
          <span>Quick Preview</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800 font-bold ml-4 cursor-pointer border-0 bg-transparent"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: EMPLOYEE SELECTION */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-[#0b4da2] font-black text-xs flex items-center justify-center">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-900 m-0">Select Target Staff Employee</h3>
            </div>
            {isLoadingEmployees && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                <RefreshCw size={12} className="animate-spin" /> Loading personnel...
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search staff by name, employee code, or email..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Staff Account <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmployeeCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setSelectedEmployeeCode(code);
                  const match = employees.find((x) => x.employee_code === code);
                  if (match) syncEmployeeDetails(match);
                }}
                required
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              >
                <option value="">-- Choose Employee --</option>
                {filteredEmployeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.employee_code}>
                    {emp.name} ({emp.employee_code}) - {emp.role || 'Staff Employee'}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Employee Info Banner */}
            {selectedEmployee && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#0b4da2] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {selectedEmployee.name ? selectedEmployee.name.slice(0, 2).toUpperCase() : 'EM'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{selectedEmployee.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                        {selectedEmployee.employee_code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{selectedEmployee.email || 'No email registered'}</span>
                      <span>•</span>
                      <span>{selectedEmployee.role || 'Staff Employee'}</span>
                    </div>
                  </div>
                </div>

                {existingJoiningDoc && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                    <AlertCircle size={14} className="shrink-0 text-amber-600" />
                    <span>Existing record: {existingJoiningDoc.number || 'Issued'} (Will be re-issued)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: APPOINTMENT PARAMETERS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-[#0b4da2] font-black text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-bold text-slate-900 m-0">Appointment Terms &amp; Compensation</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Reference Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Appointment Reference Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                required
                placeholder="e.g. REF-APP-2026-081"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Date of Joining */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Date of Joining <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Designation / Role Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                placeholder="e.g. Senior Operations Executive"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Department / Business Unit</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Talent & Operations Division"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Monthly Basic Salary */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Monthly Basic Salary</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. RM 4,500.00"
                  className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
                />
              </div>
            </div>

            {/* Fixed Allowances */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Fixed Allowances / Subsidies</label>
              <input
                type="text"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                placeholder="e.g. RM 500.00 (Transport/Meal)"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Probation Period */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Probationary Period</label>
              <select
                value={probationMonths}
                onChange={(e) => setProbationMonths(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              >
                <option value="None (Direct Confirmation)">None (Direct Confirmation)</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
              </select>
            </div>

            {/* Working Schedule */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Working Hours &amp; Schedule</label>
              <input
                type="text"
                value={workingSchedule}
                onChange={(e) => setWorkingSchedule(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Reporting Supervisor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Reporting Authority / Supervisor</label>
              <input
                type="text"
                value={supervisorTitle}
                onChange={(e) => setSupervisorTitle(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Work Facility / Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Workplace Facility / Location</label>
              <input
                type="text"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Special Stipulations &amp; Conditions
            </label>
            <textarea
              rows={2}
              value={specialTerms}
              onChange={(e) => setSpecialTerms(e.target.value)}
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
            />
          </div>
        </div>

        {/* SECTION 3: PHYSICAL DOCUMENT UPLOAD / ATTACHMENT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-[#0b4da2] font-black text-xs flex items-center justify-center">
              3
            </span>
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Attach Physical Signed Offer / Joining Document (Optional)
            </h3>
          </div>

          <div className="space-y-3">
            {!attachmentFile ? (
              <label className="border-2 border-dashed border-slate-300 hover:border-[#0b4da2] bg-slate-50 hover:bg-blue-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center mb-3">
                  <Upload size={22} />
                </div>
                <p className="text-xs font-bold text-slate-800 m-0">
                  Click to upload signed appointment letter or drag &amp; drop
                </p>
                <p className="text-[11px] text-slate-400 m-0 mt-1">
                  Supports PDF or high-resolution document images (max 15 MB)
                </p>
              </label>
            ) : (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 m-0">{attachmentName}</p>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">{attachmentSize} • Ready to upload</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: ADMINISTRATIVE CONFIRMATION & ACTIONS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700 font-semibold select-none">
            <input
              type="checkbox"
              checked={confirmedLegal}
              onChange={(e) => setConfirmedLegal(e.target.checked)}
              className="mt-0.5 rounded text-[#0b4da2] w-4 h-4 cursor-pointer"
            />
            <span>
              I confirm that this official appointment and joining letter complies with organizational policies and statutory regulations, and will be published directly to the employee portal.
            </span>
          </label>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            {/* Eye icon preview button */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition shadow-2xs"
            >
              <Eye size={15} className="text-[#0b4da2]" />
              <span>Preview Official Letter</span>
            </button>

            <div className="flex items-center gap-3">
              <Link
                href={listPageUrl}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition no-underline"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !confirmedLegal}
                className="px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white font-bold text-xs cursor-pointer transition flex items-center gap-2 border-0 shadow-sm disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Issuing Appointment Letter...</span>
                  </>
                ) : (
                  <>
                    <FileCheck size={15} />
                    <span>Issue Official Joining Letter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW TRIGGERED BY EYE ICON */}
      {/* ========================================================================= */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck size={20} className="text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold m-0 text-white">Official Joining &amp; Appointment Letter Preview</h3>
                  <p className="text-[11px] text-slate-300 m-0">
                    {selectedEmployee?.name || 'Selected Employee'} ({selectedEmployee?.employee_code || refNumber})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print Letter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Letterhead Body */}
            <div className="p-8 sm:p-12 text-slate-900 text-xs sm:text-sm leading-relaxed bg-white print:p-0 print:m-0 font-serif">
              {/* Corporate Header */}
              <div className="border-b-2 border-slate-900 pb-5 mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 m-0">
                    ACCO GLOBAL HOLDINGS &amp; ENTERPRISES BHD.
                  </h2>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5 font-sans font-bold uppercase tracking-wider">
                    DIVISION OF HUMAN CAPITAL MANAGEMENT &amp; GOVERNANCE
                  </p>
                  <p className="text-[10px] text-slate-400 m-0 mt-0.5 font-sans">
                    Level 18, Menara Acco, Jalan Ampang, 50450 Kuala Lumpur, Malaysia
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <ShieldCheck size={26} className="text-[#0b4da2]" />
                </div>
              </div>

              {/* Reference & Date Bar */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-600 mb-5">
                <div>
                  <strong>REF NO:</strong> {refNumber || 'REF-APP-PENDING'}
                </div>
                <div>
                  <strong>DATE:</strong> {joiningDate}
                </div>
              </div>

              {/* Recipient */}
              <div className="mb-5 space-y-0.5">
                <p className="font-bold text-slate-900 m-0">{selectedEmployee?.name || 'Selected Employee'}</p>
                <p className="text-slate-600 m-0 font-mono text-xs">
                  Employee Code: {selectedEmployee?.employee_code || 'EMP-XXXX'}
                </p>
                <p className="text-slate-600 m-0 text-xs">{selectedEmployee?.email || 'email@company.com'}</p>
              </div>

              {/* Subject */}
              <div className="mb-5 font-bold text-slate-900 uppercase tracking-wide border-y border-slate-200 py-2 font-sans text-xs">
                RE: FORMAL LETTER OF APPOINTMENT &amp; COMMENCEMENT AS {designation.toUpperCase()}
              </div>

              {/* Body */}
              <div className="space-y-3.5 text-slate-800 text-justify">
                <p>
                  Dear <strong>{selectedEmployee?.name || 'Sir / Madam'}</strong>,
                </p>
                <p>
                  We are pleased to formally offer and confirm your appointment with <strong>ACCO Global Holdings</strong> in the capacity of{' '}
                  <strong>{designation}</strong> under the <strong>{department}</strong>, effective from your official date of joining on{' '}
                  <strong>{joiningDate}</strong>.
                </p>

                {/* Appointment Term Details Grid */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans my-3 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-slate-400">Position / Role:</span>{' '}
                      <strong className="text-slate-900">{designation}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Probation Term:</span>{' '}
                      <strong className="text-slate-900">{probationMonths}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Basic Monthly Remuneration:</span>{' '}
                      <strong className="text-slate-900 font-mono">{salary}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Fixed Monthly Allowance:</span>{' '}
                      <strong className="text-slate-900 font-mono">{allowances}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Work Hours Schedule:</span>{' '}
                      <strong className="text-slate-900">{workingSchedule}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Reporting Authority:</span>{' '}
                      <strong className="text-slate-900">{supervisorTitle}</strong>
                    </div>
                  </div>
                </div>

                <p>
                  During your employment, both parties shall make statutory contributions to the Employees Provident Fund (EPF / KWSP), SOCSO / PERKESO, and the Employment Insurance System (EIS).
                </p>
                <p>
                  You are required to adhere to all corporate regulations, confidentiality guidelines, and ethics standards of the company. We wish you great success in your professional career with us.
                </p>
              </div>

              {/* Signature & Seal */}
              <div className="mt-8 pt-5 border-t border-slate-200 flex items-end justify-between font-sans">
                <div>
                  <div className="w-36 h-10 border-b border-slate-400 mb-1 flex items-center text-blue-800 font-serif italic text-sm">
                    {adminName}
                  </div>
                  <p className="font-bold text-slate-900 m-0">{adminName}</p>
                  <p className="text-[11px] text-slate-500 m-0">Director of Human Resources &amp; Personnel</p>
                  <p className="text-[10px] text-slate-400 m-0 font-mono">ACCO Global Group of Companies</p>
                </div>

                <div className="text-right">
                  <div className="w-20 h-20 border-2 border-emerald-600 rounded-full flex flex-col items-center justify-center text-[9px] font-bold text-emerald-800 uppercase tracking-wider p-2 opacity-80 rotate-[-6deg] border-dashed">
                    <span>ACCO HR</span>
                    <span className="text-[7px] font-mono">VERIFIED</span>
                    <span>APPOINTED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end print:hidden">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer border-0 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAssignJoiningLetterSubpage(props: AdminAssignJoiningLetterSubpageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="animate-spin text-blue-600 mx-auto mb-2" size={24} />
          <span className="text-xs font-bold">Loading appointment form...</span>
        </div>
      }
    >
      <AdminAssignJoiningLetterContent {...props} />
    </Suspense>
  );
}
