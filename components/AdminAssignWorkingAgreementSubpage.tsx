'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileSignature,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Check,
  X,
  User,
  Building2,
  Search,
  Scale,
  Briefcase,
  Layers,
  Printer,
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

interface AdminAssignWorkingAgreementSubpageProps {
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
  assignedScope?: string[];
}

function AdminAssignWorkingAgreementContent({
  portalType,
  adminName = 'Super Admin',
  assignedScope = [],
}: AdminAssignWorkingAgreementSubpageProps) {
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
  const [contractType, setContractType] = useState<string>('Full-Time Permanent Employment Agreement');
  const [contractRef, setContractRef] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>('');
  const [isIndefinite, setIsIndefinite] = useState<boolean>(true);
  const [weeklyHours, setWeeklyHours] = useState<string>('40 Hours/Week (Monday - Friday 9:00 AM - 6:00 PM)');
  const [noticePeriod, setNoticePeriod] = useState<string>('30 Calendar Days');
  const [salary, setSalary] = useState<string>('RM 4,200.00');
  const [governingLaw, setGoverningLaw] = useState<string>('Laws of Malaysia (Employment Act 1955)');
  const [specialTerms, setSpecialTerms] = useState<string>(
    'Standard non-disclosure, intellectual property protection, client non-solicitation covenants, and operational compliance apply in full force.'
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
    ? '/masteradmin/employees/working-agreement'
    : isDedicatedSuperadmin
    ? '/employees/working-agreement'
    : '/superadmin/employees/working-agreement';

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
        console.error('Failed to load employees for working agreement subpage:', err);
      })
      .finally(() => {
        setIsLoadingEmployees(false);
      });
  }, [portalType, preselectedCode]);

  // Synchronize employee fields when selected
  const syncEmployeeDetails = (emp: EmployeeOption) => {
    const rawCode = emp.employee_code.replace(/[^0-9]/g, '') || String(emp.id);
    setContractRef(`AGR-EMP-${new Date().getFullYear()}-${rawCode.padStart(3, '0')}`);
    if (emp.created_at) {
      setStartDate(emp.created_at.slice(0, 10));
    }
  };

  // Selected employee object
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.employee_code === selectedEmployeeCode) || null;
  }, [employees, selectedEmployeeCode]);

  // Check existing agreement
  const existingAgreementDoc = useMemo(() => {
    if (!selectedEmployee || !Array.isArray(selectedEmployee.documents)) return null;
    return (
      selectedEmployee.documents.find(
        (d: any) =>
          (d.name || '').toLowerCase().includes('agreement') ||
          (d.name || '').toLowerCase().includes('contract')
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

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setFeedback({ type: 'error', message: 'Please select an employee.' });
      return;
    }

    if (!contractRef.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a contract reference ID.' });
      return;
    }

    if (!startDate) {
      setFeedback({ type: 'error', message: 'Please specify the commencement date.' });
      return;
    }

    if (!isIndefinite && !endDate) {
      setFeedback({ type: 'error', message: 'Please specify the contract expiry / renewal date.' });
      return;
    }

    if (!confirmedLegal) {
      setFeedback({ type: 'error', message: 'Please confirm the administrative legal acknowledgment.' });
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
          !(d.name || '').toLowerCase().includes('agreement') &&
          !(d.name || '').toLowerCase().includes('contract')
      );

      const newDoc = {
        name: `Official Working Agreement & Contract (${contractRef.trim()})`,
        issue_date: startDate,
        expire_date: isIndefinite ? null : endDate,
        number: contractRef.trim(),
        url: attachmentDataUrl || '/images/work-agreement.svg',
        dataUrl: attachmentDataUrl || undefined,
        size: attachmentSize || '540 KB',
        type: attachmentFile ? attachmentFile.type : 'application/pdf',
      };

      filteredDocs.unshift(newDoc);

      const updatePayload = {
        name: currentEmp.name,
        employee_code: currentEmp.employee_code,
        email: currentEmp.email,
        role: currentEmp.role,
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
        throw new Error(errorData.message || 'Failed to update employee working agreement record on server.');
      }

      setFeedback({
        type: 'success',
        message: `Working Agreement created and enforced successfully for ${selectedEmployee.name} (${contractRef}). Redirecting...`,
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
        message: err.message || 'Failed to save working agreement. Please try again.',
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
          <span>Back to Working Agreements &amp; Contracts</span>
        </Link>

        {/* Eye icon preview button */}
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          title="Preview Official Working Agreement"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all py-1.5 px-3.5 rounded-xl cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          <Eye size={15} className="text-indigo-600" />
          <span>Preview Agreement</span>
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
            <Scale size={12} />
            <span>Legal Compliance &amp; Employment Contracts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
            Draft &amp; Enforce Employee Working Agreement
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed m-0">
            Establish legally binding employment agreements, terms of service, IP confidentiality covenants, and operational covenants.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer border-0 shrink-0"
        >
          <Eye size={14} className="text-indigo-600" />
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
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
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
                  <div className="w-11 h-11 rounded-xl bg-indigo-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
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

                {existingAgreementDoc && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold">
                    <AlertCircle size={14} className="shrink-0 text-indigo-600" />
                    <span>Existing agreement: {existingAgreementDoc.number || 'Active'} (Will be updated)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: CONTRACT SPECIFICATIONS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-bold text-slate-900 m-0">Contract Specifications &amp; Terms</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Agreement Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Agreement Type</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              >
                <option value="Full-Time Permanent Employment Agreement">Full-Time Permanent Employment Agreement</option>
                <option value="Fixed-Term Project Contract">Fixed-Term Project Contract</option>
                <option value="Probationary Service Agreement">Probationary Service Agreement</option>
                <option value="NDA & Confidentiality Covenants">NDA &amp; Confidentiality Covenants</option>
              </select>
            </div>

            {/* Reference ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contract Reference ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={contractRef}
                onChange={(e) => setContractRef(e.target.value)}
                required
                placeholder="e.g. AGR-EMP-2026-081"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Commencement Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Effective Commencement Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Expiry / Renewal Date</label>
              <input
                type="date"
                disabled={isIndefinite}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2] disabled:bg-slate-100 disabled:text-slate-400"
              />
              <label className="inline-flex items-center gap-1.5 mt-1.5 cursor-pointer text-[11px] text-slate-600 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={isIndefinite}
                  onChange={(e) => setIsIndefinite(e.target.checked)}
                  className="rounded text-[#0b4da2]"
                />
                <span>Permanent / Ongoing Indefinite Contract</span>
              </label>
            </div>

            {/* Departure Notice Period */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Departure Notice Period</label>
              <select
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              >
                <option value="14 Calendar Days">14 Calendar Days (Probation)</option>
                <option value="30 Calendar Days">30 Calendar Days (Standard Staff)</option>
                <option value="60 Calendar Days">60 Calendar Days (Senior Executive)</option>
                <option value="90 Calendar Days">90 Calendar Days (Management / Director)</option>
              </select>
            </div>

            {/* Standard Weekly Hours */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Standard Weekly Schedule</label>
              <input
                type="text"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Monthly Salary */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Monthly Remuneration</label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>

            {/* Governing Law */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Governing Jurisdiction</label>
              <input
                type="text"
                value={governingLaw}
                onChange={(e) => setGoverningLaw(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Special Covenants &amp; Terms
            </label>
            <textarea
              rows={2}
              value={specialTerms}
              onChange={(e) => setSpecialTerms(e.target.value)}
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2]"
            />
          </div>
        </div>

        {/* SECTION 3: PHYSICAL ATTACHMENT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
              3
            </span>
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Attach Physical Signed Contract / NDA Document (Optional)
            </h3>
          </div>

          <div className="space-y-3">
            {!attachmentFile ? (
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-600 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                  <Upload size={22} />
                </div>
                <p className="text-xs font-bold text-slate-800 m-0">
                  Click to upload signed contract document or drag &amp; drop
                </p>
                <p className="text-[11px] text-slate-400 m-0 mt-1">
                  Supports PDF or high-resolution document scans (max 15 MB)
                </p>
              </label>
            ) : (
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
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

        {/* SECTION 4: CONFIRMATION & ACTIONS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700 font-semibold select-none">
            <input
              type="checkbox"
              checked={confirmedLegal}
              onChange={(e) => setConfirmedLegal(e.target.checked)}
              className="mt-0.5 rounded text-indigo-700 w-4 h-4 cursor-pointer"
            />
            <span>
              I authenticate that this working agreement has been verified according to corporate legal standards and shall be enforced as the binding employment contract for this staff member.
            </span>
          </label>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            {/* Eye icon preview button */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition shadow-2xs"
            >
              <Eye size={15} className="text-indigo-600" />
              <span>Preview Full Agreement</span>
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
                className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs cursor-pointer transition flex items-center gap-2 border-0 shadow-sm disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Enforcing Agreement...</span>
                  </>
                ) : (
                  <>
                    <FileSignature size={15} />
                    <span>Save &amp; Enforce Working Agreement</span>
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
                <FileSignature size={20} className="text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold m-0 text-white">Official Working Agreement Preview</h3>
                  <p className="text-[11px] text-slate-300 m-0">
                    {selectedEmployee?.name || 'Selected Employee'} ({selectedEmployee?.employee_code || contractRef})
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
                  <span>Print Agreement</span>
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

            {/* Contract Body */}
            <div className="p-8 sm:p-12 text-slate-900 text-xs sm:text-sm leading-relaxed bg-white print:p-0 print:m-0 font-serif">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-5 mb-5">
                <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 m-0">
                  {contractType.toUpperCase()}
                </h2>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5 uppercase tracking-widest font-sans font-bold">
                  ACCO GLOBAL ENTERPRISES &amp; HUMAN CAPITAL MANAGEMENT BHD.
                </p>
                <p className="text-[10px] text-slate-400 m-0 mt-0.5 font-mono">CONTRACT REF: {contractRef || 'AGR-EMP-PENDING'}</p>
              </div>

              {/* Preamble */}
              <div className="mb-4 text-justify space-y-2">
                <p>
                  THIS EMPLOYMENT AND WORKING AGREEMENT is entered into effect as of <strong>{startDate}</strong>, by and between:
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs space-y-1">
                  <p className="m-0">
                    <strong>THE EMPLOYER:</strong> ACCO Global Group of Companies, having its principal corporate office at Level 18, Menara Acco, Kuala Lumpur, Malaysia.
                  </p>
                  <p className="m-0">
                    <strong>THE EMPLOYEE:</strong> {selectedEmployee?.name || 'Selected Employee'}, holder of Employee Code{' '}
                    <strong>{selectedEmployee?.employee_code || 'EMP-XXXX'}</strong>.
                  </p>
                </div>
              </div>

              {/* Numbered Legal Clauses */}
              <div className="space-y-3.5 text-justify">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-0.5">
                    1. Engagement &amp; Duties
                  </h4>
                  <p className="text-slate-700 m-0">
                    The Employer hereby engages the Employee in the capacity of <strong>{selectedEmployee?.role || 'Staff Employee'}</strong>. The Employee shall faithfully and diligently perform all duties, devote full professional fidelity during assigned working hours, and comply with all instructions issued by organizational management.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-0.5">
                    2. Working Hours &amp; Schedule
                  </h4>
                  <p className="text-slate-700 m-0">
                    The standard working hours shall be structured as: <strong>{weeklyHours}</strong>. Overtime, rest days, and public holidays shall be governed in accordance with Malaysian Employment Regulations.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-0.5">
                    3. Remuneration &amp; Statutory Welfare
                  </h4>
                  <p className="text-slate-700 m-0">
                    The Employee shall be entitled to receive monthly compensation of <strong>{salary}</strong>. Both parties agree to participate in statutory welfare funds including EPF / KWSP, SOCSO / PERKESO, and EIS deductions.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-0.5">
                    4. Confidentiality &amp; Non-Disclosure
                  </h4>
                  <p className="text-slate-700 m-0">
                    The Employee acknowledges that all proprietary source codes, client registers, data tables, and internal documents are strictly confidential and remain the exclusive intellectual property of the Employer. The Employee shall not disclose or reproduce confidential records at any time.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-0.5">
                    5. Termination &amp; Resignation Terms
                  </h4>
                  <p className="text-slate-700 m-0">
                    Either party may terminate this agreement by providing formal written notice of not less than <strong>{noticePeriod}</strong>, or salary in lieu of notice. All assigned assets and passwords must be surrendered prior to exit clearance.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-0.5">
                    6. Governing Law
                  </h4>
                  <p className="text-slate-700 m-0">
                    This Agreement shall be construed and enforced pursuant to the <strong>{governingLaw}</strong>.
                  </p>
                </div>
              </div>

              {/* Signature Block */}
              <div className="mt-8 pt-5 border-t border-slate-200 grid grid-cols-2 gap-8 font-sans">
                <div>
                  <div className="w-36 h-10 border-b border-slate-400 mb-1 flex items-center text-blue-800 font-serif italic text-sm">
                    {adminName}
                  </div>
                  <p className="font-bold text-slate-900 m-0">Signed for Employer</p>
                  <p className="text-[11px] text-slate-500 m-0">{adminName} - Director of HR</p>
                  <p className="text-[10px] text-slate-400 m-0 font-mono">ACCO Global Enterprises Bhd.</p>
                </div>

                <div>
                  <div className="w-36 h-10 border-b border-slate-400 mb-1 flex items-center text-slate-800 font-serif italic text-sm">
                    {selectedEmployee?.name || 'Employee Signature'}
                  </div>
                  <p className="font-bold text-slate-900 m-0">Signed by Employee</p>
                  <p className="text-[11px] text-slate-500 m-0">{selectedEmployee?.name || 'Employee'}</p>
                  <p className="text-[10px] text-emerald-700 m-0 font-mono font-bold">Authenticated &amp; Accepted</p>
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

export default function AdminAssignWorkingAgreementSubpage(props: AdminAssignWorkingAgreementSubpageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-2" size={24} />
          <span className="text-xs font-bold">Loading agreement form...</span>
        </div>
      }
    >
      <AdminAssignWorkingAgreementContent {...props} />
    </Suspense>
  );
}
