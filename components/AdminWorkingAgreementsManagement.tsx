'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FileSignature,
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
  Scale,
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

interface AdminWorkingAgreementsManagementProps {
  portalType?: 'superadmin' | 'masteradmin';
  adminName?: string;
}

export default function AdminWorkingAgreementsManagement({
  portalType = 'superadmin',
  adminName = 'Super Admin',
}: AdminWorkingAgreementsManagementProps) {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Preview Modal
  const [previewEmployee, setPreviewEmployee] = useState<EmployeeItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  // Navigation path helpers
  const isDedicatedSuperadmin = typeof window !== 'undefined' && !window.location.pathname.startsWith('/superadmin');
  const newAgreementUrl = portalType === 'masteradmin'
    ? '/masteradmin/employees/working-agreement/new'
    : isDedicatedSuperadmin
    ? '/employees/working-agreement/new'
    : '/superadmin/employees/working-agreement/new';

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
      console.error('Failed to load employees for working agreements:', err);
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

  // Helper to extract working agreement doc from employee
  const getAgreementDoc = (emp: EmployeeItem): EmployeeDocument | null => {
    if (!Array.isArray(emp.documents)) return null;
    return (
      emp.documents.find(
        (d) =>
          (d.name || '').toLowerCase().includes('agreement') ||
          (d.name || '').toLowerCase().includes('contract') ||
          (d.name || '').toLowerCase().includes('work agreement') ||
          (d.name || '').toLowerCase().includes('nda')
      ) || null
    );
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const agreementDoc = getAgreementDoc(emp);
      const isIssued = Boolean(agreementDoc);

      if (statusFilter === 'active' && !isIssued) return false;
      if (statusFilter === 'pending' && isIssued) return false;

      if (typeFilter !== 'all') {
        const docName = (agreementDoc?.name || '').toLowerCase();
        if (typeFilter === 'nda' && !docName.includes('nda')) return false;
        if (typeFilter === 'contract' && !docName.includes('contract') && !docName.includes('agreement')) return false;
      }

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
  }, [employees, statusFilter, typeFilter, searchQuery]);

  // KPI statistics
  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => Boolean(getAgreementDoc(e))).length;
  const pendingCount = totalEmployees - activeCount;

  // Open Preview Modal
  const handleOpenPreview = (emp: EmployeeItem) => {
    setPreviewEmployee(emp);
    const doc = getAgreementDoc(emp);
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
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
            <Scale size={12} />
            <span>Legal Compliance &amp; Employment Contracts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
            Employee Working Agreements &amp; Contracts
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed m-0">
            Oversee staff working agreements, service contracts, confidentiality NDAs, and operational employment terms.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={newAgreementUrl}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083a7c] text-white shadow-sm transition no-underline cursor-pointer border-0 active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>New Working Agreement</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff Personnel</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalEmployees}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Active workforce profiles</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <User size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active &amp; Enforced Agreements</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {totalEmployees > 0 ? `${Math.round((activeCount / totalEmployees) * 100)}% documented` : '0%'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Execution</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Requires signature or renewal</p>
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
            {(['all', 'active', 'pending'] as const).map((st) => (
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
                <span className="capitalize">{st === 'all' ? 'All Contracts' : st === 'active' ? 'Active & Valid' : 'Pending Agreement'}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search staff, code, contract ref..."
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
                <th className="py-3 px-4">Agreement Type</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Contract Status</th>
                <th className="py-3 px-4">Agreement Reference</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="animate-spin text-blue-600" size={16} />
                      <span className="font-semibold text-xs">Loading agreement records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-600 text-sm m-0">No matching working agreements found</p>
                    <p className="text-xs text-slate-400 mt-1 m-0">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const doc = getAgreementDoc(emp);
                  const isIssued = Boolean(doc);
                  const effectiveDate = doc?.issue_date || (emp.created_at ? emp.created_at.slice(0, 10) : '—');
                  const expiryDate = doc?.expire_date || 'Permanent (Ongoing)';

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Details */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
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

                      {/* Agreement Type */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <FileSignature size={13} className="text-indigo-600 shrink-0" />
                          <span>{doc ? doc.name.replace(/\(.*?\)/g, '').trim() : 'Standard Employment Contract'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">Full-Time Workforce Terms</div>
                      </td>

                      {/* Effective Date */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-mono text-slate-700 font-semibold">{effectiveDate}</div>
                        <div className="text-[10px] text-slate-400">Validity: {expiryDate}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-middle">
                        {isIssued ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            <span>Active &amp; Enforced</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} />
                            <span>Pending Agreement</span>
                          </span>
                        )}
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="text-slate-800 font-mono text-xs font-semibold">
                          {doc?.number || (isIssued ? 'AGR-EMP-VERIFIED' : 'Not generated')}
                        </div>
                        {doc && (
                          <div className="text-[10px] text-slate-400">Legally Bound • HR Encrypted</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Agreement Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(emp)}
                            title="Preview Full Working Agreement"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs"
                          >
                            <Eye size={13} className="text-indigo-600" />
                            <span>View</span>
                          </button>

                          {/* Create / Edit Page Link */}
                          <Link
                            href={`${newAgreementUrl}?employee_code=${emp.employee_code}`}
                            title={isIssued ? 'Update Agreement Terms' : 'Draft Working Agreement'}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition no-underline cursor-pointer shadow-2xs active:scale-[0.98]"
                          >
                            <FileSignature size={13} />
                            <span>{isIssued ? 'Edit' : 'Create'}</span>
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
      {/* MODAL: PREVIEW FULL WORKING AGREEMENT & EMPLOYMENT CONTRACT */}
      {/* ========================================================================= */}
      {previewEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileSignature size={20} className="text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold m-0 text-white">Official Employment &amp; Working Agreement</h3>
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
                  <span>Print Agreement</span>
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

            {/* Printable Contract Body */}
            <div className="p-8 sm:p-12 text-slate-900 text-xs sm:text-sm leading-relaxed bg-white print:p-0 print:m-0 font-serif">
              {/* Header Title */}
              <div className="text-center border-b-2 border-slate-900 pb-6 mb-6">
                <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 m-0">
                  STANDARD EMPLOYMENT &amp; WORKING AGREEMENT
                </h2>
                <p className="text-xs text-slate-500 m-0 mt-1 uppercase tracking-widest font-sans font-bold">
                  ACCO GLOBAL SERVICES &amp; TALENT MANAGEMENT BHD.
                </p>
                <p className="text-[11px] text-slate-400 m-0 mt-0.5 font-mono">
                  CONTRACT REF:{' '}
                  {previewDoc?.number || `AGR-EMP-2024-${previewEmployee.employee_code.replace(/[^0-9]/g, '') || previewEmployee.id}`}
                </p>
              </div>

              {/* Parties */}
              <div className="mb-6 space-y-2 text-justify">
                <p>
                  THIS WORKING AGREEMENT is made and entered into effect as of{' '}
                  <strong>{previewDoc?.issue_date || (previewEmployee.created_at ? previewEmployee.created_at.slice(0, 10) : '10 January 2024')}</strong>, by and between:
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs space-y-1">
                  <p className="m-0">
                    <strong>THE EMPLOYER:</strong> ACCO Global Group of Companies, having its principal corporate address at Level 18, Menara Acco, Kuala Lumpur, Malaysia.
                  </p>
                  <p className="m-0">
                    <strong>THE EMPLOYEE:</strong> {previewEmployee.name}, holder of Employee ID{' '}
                    <strong>{previewEmployee.employee_code}</strong>, resident contact: {previewEmployee.email || 'registered employee'}.
                  </p>
                </div>
              </div>

              {/* Numbered Legal Clauses */}
              <div className="space-y-4 text-justify">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-1">
                    1. Position &amp; Scope of Responsibilities
                  </h4>
                  <p className="text-slate-700 m-0">
                    The Employer hereby employs the Employee in the capacity of{' '}
                    <strong>{previewEmployee.role || 'Executive Officer'}</strong>. The Employee shall diligently execute all duties assigned by management, preserve company assets, and devote full professional time and loyalty to the organization during designated working hours.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-1">
                    2. Working Hours &amp; Workplace Location
                  </h4>
                  <p className="text-slate-700 m-0">
                    The standard working hours shall be forty (40) hours per calendar week, normally structured from Monday through Friday (9:00 AM to 6:00 PM), with official meal breaks. The Employee may be required to attend designated offices or remote operational locations in accordance with business requirements.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-1">
                    3. Compensation &amp; Statutory Benefits
                  </h4>
                  <p className="text-slate-700 m-0">
                    In consideration of services rendered, the Employer shall provide monthly remuneration processed through formal bank direct deposit on or before the final working day of each month. Both parties shall contribute to statutory welfare bodies including the Employees Provident Fund (EPF / KWSP), SOCSO / PERKESO, and the Employment Insurance System (EIS).
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-1">
                    4. Confidentiality &amp; Non-Disclosure
                  </h4>
                  <p className="text-slate-700 m-0">
                    The Employee acknowledges that during employment they will have access to confidential proprietary trade secrets, customer records, financial figures, and technical software algorithms. The Employee covenants not to disclose, duplicate, or misuse any such confidential information during or subsequent to their employment.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-1">
                    5. Termination &amp; Resignation Terms
                  </h4>
                  <p className="text-slate-700 m-0">
                    Either party may terminate this agreement by providing formal written notice of not less than thirty (30) calendar days, or payment of salary in lieu of notice. Upon notice of resignation or termination, the Employee shall surrender all company assets, security access tokens, and project handovers prior to receiving official clearance.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase font-sans text-xs tracking-wider mb-1">
                    6. Governing Law &amp; Jurisdiction
                  </h4>
                  <p className="text-slate-700 m-0">
                    This Agreement shall be construed, interpreted, and governed in all respects in accordance with the laws of Malaysia and standard labor guidelines.
                  </p>
                </div>
              </div>

              {/* Dual Signature Block */}
              <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 font-sans">
                <div>
                  <div className="w-40 h-12 border-b border-slate-400 mb-2 flex items-center text-blue-800 font-serif italic text-sm">
                    {adminName}
                  </div>
                  <p className="font-bold text-slate-900 m-0">Signed on behalf of Employer</p>
                  <p className="text-[11px] text-slate-500 m-0">{adminName} - Director of HR</p>
                  <p className="text-[10px] text-slate-400 m-0 font-mono">ACCO Global Enterprises Bhd.</p>
                </div>

                <div>
                  <div className="w-40 h-12 border-b border-slate-400 mb-2 flex items-center text-slate-800 font-serif italic text-sm">
                    {previewEmployee.name}
                  </div>
                  <p className="font-bold text-slate-900 m-0">Signed by Employee</p>
                  <p className="text-[11px] text-slate-500 m-0">{previewEmployee.name} ({previewEmployee.employee_code})</p>
                  <p className="text-[10px] text-emerald-700 m-0 font-mono font-bold">Authenticated &amp; Accepted</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
              <span className="text-xs text-slate-500 font-semibold">
                Legally binding employment record filed in corporate archives.
              </span>
              <button
                type="button"
                onClick={() => setPreviewEmployee(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer border-0 transition"
              >
                Close Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
