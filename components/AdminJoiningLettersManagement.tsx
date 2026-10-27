'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FileCheck,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  X,
  User,
  Calendar,
  Download,
  Eye,
  Printer,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface EmployeeDocument {
  name: string;
  issue_date?: string;
  expire_date?: string;
  url?: string;
  size?: string;
  type?: string;
  number?: string;
}

interface EmployeeItem {
  id: number;
  employee_code: string;
  name: string;
  email?: string;
  role?: string;
  status?: string;
  assigned_companies?: string[];
  documents?: EmployeeDocument[];
  created_at?: string;
}

interface AdminJoiningLettersManagementProps {
  portalType?: 'superadmin' | 'masteradmin';
  adminName?: string;
}

export default function AdminJoiningLettersManagement({
  portalType = 'superadmin',
  adminName = 'Super Admin',
}: AdminJoiningLettersManagementProps) {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'pending'>('all');

  // Preview Modal
  const [previewEmployee, setPreviewEmployee] = useState<EmployeeItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  // Navigation path helpers
  const isDedicatedSuperadmin = typeof window !== 'undefined' && !window.location.pathname.startsWith('/superadmin');
  const newLetterUrl = portalType === 'masteradmin'
    ? '/masteradmin/employees/joining-letter/new'
    : isDedicatedSuperadmin
    ? '/employees/joining-letter/new'
    : '/superadmin/employees/joining-letter/new';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/employees`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmployees(data);
        }
      }
    } catch (err) {
      console.error('Failed to load employees for joining letters:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadData();
    const handleUpdated = () => loadData();
    window.addEventListener('employee_requests_updated', handleUpdated);
    return () => window.removeEventListener('employee_requests_updated', handleUpdated);
  }, [loadData]);

  // Helper to extract joining letter doc from employee
  const getJoiningDoc = (emp: EmployeeItem): EmployeeDocument | null => {
    if (!Array.isArray(emp.documents)) return null;
    return (
      emp.documents.find(
        (d) =>
          (d.name || '').toLowerCase().includes('joining') ||
          (d.name || '').toLowerCase().includes('appointment') ||
          (d.name || '').toLowerCase().includes('offer letter')
      ) || null
    );
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const joiningDoc = getJoiningDoc(emp);
      const isIssued = Boolean(joiningDoc);

      if (statusFilter === 'issued' && !isIssued) return false;
      if (statusFilter === 'pending' && isIssued) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (emp.name || '').toLowerCase().includes(q);
        const matchesCode = (emp.employee_code || '').toLowerCase().includes(q);
        const matchesEmail = (emp.email || '').toLowerCase().includes(q);
        const matchesRole = (emp.role || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesEmail && !matchesRole) return false;
      }

      return true;
    });
  }, [employees, statusFilter, searchQuery]);

  // KPI statistics
  const totalEmployees = employees.length;
  const issuedCount = employees.filter((e) => Boolean(getJoiningDoc(e))).length;
  const pendingCount = totalEmployees - issuedCount;

  // Open Preview Letter Modal
  const handleOpenPreview = (emp: EmployeeItem) => {
    setPreviewEmployee(emp);
    const doc = getJoiningDoc(emp);
    setPreviewDoc(doc);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800 font-bold ml-4 cursor-pointer border-0 bg-transparent"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
            <FileCheck size={12} />
            <span>Staff Onboarding &amp; Documentation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
            Joining Letters &amp; Appointment Records
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed m-0">
            Generate, review, issue, and manage official employee appointment letters and joining contracts for all personnel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={newLetterUrl}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083a7c] text-white shadow-sm transition no-underline cursor-pointer border-0 active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>Issue New Joining Letter</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff Workforce</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalEmployees}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Registered personnel accounts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <User size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Letters Issued</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{issuedCount}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {totalEmployees > 0 ? `${Math.round((issuedCount / totalEmployees) * 100)}% coverage` : '0%'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Issuance</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Action recommended</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'issued', 'pending'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  statusFilter === st
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="capitalize">{st === 'all' ? 'All Employees' : st === 'issued' ? 'Letters Issued' : 'Pending Issuance'}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search staff, code, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2] focus:border-[#0b4da2] w-48 sm:w-64 transition-colors"
              />
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh Data"
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer bg-white shrink-0"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">Employee Details</th>
                <th className="py-3 px-4">Role / Department</th>
                <th className="py-3 px-4">Date of Joining</th>
                <th className="py-3 px-4">Letter Status</th>
                <th className="py-3 px-4">Document Reference</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="animate-spin text-blue-600" size={16} />
                      <span className="font-semibold text-xs">Loading employee records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-600 text-sm m-0">No matching employee records</p>
                    <p className="text-xs text-slate-400 mt-1 m-0">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const doc = getJoiningDoc(emp);
                  const isIssued = Boolean(doc);
                  const joiningDate = doc?.issue_date || (emp.created_at ? emp.created_at.slice(0, 10) : '—');

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Details */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                            {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight flex items-center gap-2">
                              <span>{emp.name}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {emp.employee_code}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{emp.email || 'No email registered'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-semibold text-slate-800">{emp.role || 'Staff Employee'}</div>
                        <div className="text-[11px] text-slate-400">Standard Workforce</div>
                      </td>

                      {/* Date of Joining */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-mono text-slate-700 font-semibold">{joiningDate}</div>
                        <div className="text-[10px] text-slate-400">Official Start</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-middle">
                        {isIssued ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            <span>Official Issued</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} />
                            <span>Pending Issuance</span>
                          </span>
                        )}
                      </td>

                      {/* Document Reference */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="text-slate-800 font-mono text-xs font-semibold">
                          {doc?.number || (isIssued ? 'REF-APP-VERIFIED' : 'Not generated')}
                        </div>
                        {doc && (
                          <div className="text-[10px] text-slate-400">PDF • Verified Record</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Letter Modal Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(emp)}
                            title="Preview Official Joining Letter"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs"
                          >
                            <Eye size={13} className="text-blue-600" />
                            <span>Preview</span>
                          </button>

                          {/* Issue / Edit Page Link */}
                          <Link
                            href={`${newLetterUrl}?employee_code=${emp.employee_code}`}
                            title={isIssued ? 'Update Letter Details' : 'Issue Joining Letter'}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition no-underline cursor-pointer shadow-2xs active:scale-[0.98]"
                          >
                            <FileCheck size={13} />
                            <span>{isIssued ? 'Re-Issue' : 'Issue'}</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW OFFICIAL APPOINTMENT & JOINING LETTER */}
      {/* ========================================================================= */}
      {previewEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck size={20} className="text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold m-0 text-white">Official Joining &amp; Appointment Letter</h3>
                  <p className="text-[11px] text-slate-300 m-0">
                    {previewEmployee.name} ({previewEmployee.employee_code})
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
                  onClick={() => setPreviewEmployee(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 sm:p-12 text-slate-900 text-xs sm:text-sm leading-relaxed bg-white print:p-0 print:m-0 font-serif">
              {/* Official Letterhead */}
              <div className="border-b-2 border-slate-900 pb-6 mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 m-0">
                    ACCO GLOBAL HOLDINGS &amp; ENTERPRISES
                  </h2>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    HUMAN CAPITAL MANAGEMENT &amp; TALENT OPERATIONS
                  </p>
                  <p className="text-[11px] text-slate-400 m-0 mt-1">
                    Level 18, Menara Acco, Jalan Ampang, 50450 Kuala Lumpur, Malaysia
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <ShieldCheck size={32} className="text-[#0b4da2]" />
                  </div>
                </div>
              </div>

              {/* Reference & Date */}
              <div className="flex items-center justify-between text-xs text-slate-600 mb-6 font-mono">
                <div>
                  <strong>REF NO:</strong>{' '}
                  {previewDoc?.number || `REF-APP-2024-${previewEmployee.employee_code.replace(/[^0-9]/g, '') || previewEmployee.id}`}
                </div>
                <div>
                  <strong>DATE:</strong> {previewDoc?.issue_date || (previewEmployee.created_at ? previewEmployee.created_at.slice(0, 10) : '10 Jan 2024')}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="mb-6">
                <p className="font-bold text-slate-900 m-0">{previewEmployee.name}</p>
                <p className="text-slate-600 m-0">Employee Code: {previewEmployee.employee_code}</p>
                <p className="text-slate-600 m-0">{previewEmployee.email || 'Email: registered on personnel system'}</p>
                <p className="text-slate-600 m-0">Status: Confirmed Employment Personnel</p>
              </div>

              {/* Subject */}
              <div className="mb-6 font-bold text-slate-900 uppercase tracking-wide border-y border-slate-200 py-2">
                RE: OFFICIAL LETTER OF APPOINTMENT &amp; COMMENCEMENT OF DUTIES
              </div>

              {/* Body Paragraphs */}
              <div className="space-y-4 text-slate-800 text-justify">
                <p>
                  Dear <strong>{previewEmployee.name}</strong>,
                </p>
                <p>
                  We are pleased to formally confirm your appointment with <strong>ACCO Global Holdings</strong> in the capacity of{' '}
                  <strong>{previewEmployee.role || 'Executive Officer'}</strong>, effective from your official date of joining on{' '}
                  <strong>{previewDoc?.issue_date || (previewEmployee.created_at ? previewEmployee.created_at.slice(0, 10) : '10 January 2024')}</strong>.
                </p>
                <p>
                  This appointment is governed under the Employment Act and organizational bylaws. You will report directly to the Head of Department or designated Supervisor at the corporate offices or designated operational facility.
                </p>

                {/* Key Appointment Terms Grid */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans my-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 m-0">
                    Key Appointment Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Designation:</span>{' '}
                      <strong className="text-slate-800">{previewEmployee.role || 'Executive Officer'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Probation Period:</span>{' '}
                      <strong className="text-slate-800">Three (3) Months</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Working Schedule:</span>{' '}
                      <strong className="text-slate-800">Monday - Friday (9:00 AM - 6:00 PM)</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Statutory Compliance:</span>{' '}
                      <strong className="text-slate-800">EPF / KWSP, SOCSO &amp; EIS Registered</strong>
                    </div>
                  </div>
                </div>

                <p>
                  During your tenure, you agree to comply with all company rules, policies, code of ethics, and statutory guidelines. You shall maintain strict confidentiality regarding all proprietary information, client affairs, and software databases.
                </p>
                <p>
                  We congratulate you on your appointment and look forward to your valuable contributions towards the growth and success of the organization.
                </p>
              </div>

              {/* Signatures */}
              <div className="mt-12 pt-6 border-t border-slate-200 flex items-end justify-between font-sans">
                <div>
                  <div className="w-32 h-12 border-b border-slate-400 mb-2 flex items-center justify-center text-blue-800 font-serif italic text-sm">
                    {adminName}
                  </div>
                  <p className="font-bold text-slate-900 m-0">{adminName}</p>
                  <p className="text-[11px] text-slate-500 m-0">Director of Human Resources &amp; Operations</p>
                  <p className="text-[10px] text-slate-400 m-0 font-mono">ACCO Global Group of Companies</p>
                </div>

                <div className="text-right">
                  <div className="w-24 h-24 border-2 border-emerald-600 rounded-full flex flex-col items-center justify-center text-[10px] font-bold text-emerald-800 uppercase tracking-wider p-2 opacity-80 rotate-[-8deg] border-dashed">
                    <span>ACCO HR</span>
                    <span className="text-[8px] font-mono">OFFICIAL</span>
                    <span>VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
              <span className="text-xs text-slate-500 font-semibold">
                Published to employee portal under Attendance &amp; Service Documents.
              </span>
              <button
                type="button"
                onClick={() => setPreviewEmployee(null)}
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
