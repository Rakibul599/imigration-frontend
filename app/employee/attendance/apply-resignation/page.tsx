'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2,
  Printer,
  Download,
  Check,
  X,
  Search,
  Plus,
  Filter,
} from 'lucide-react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import {
  getEmployeeResignations,
  EmployeeResignationItem,
} from '@/lib/employeeRequestsApi';

export default function ResignationsAndClearancesListPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [resignations, setResignations] = useState<EmployeeResignationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewLetterItem, setViewLetterItem] = useState<EmployeeResignationItem | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser?.employee_code) return;
    setIsLoading(true);
    try {
      const data = await getEmployeeResignations({
        employee_code: currentUser.employee_code,
      });
      setResignations(data || []);
    } catch (err) {
      console.error('Failed to load employee resignations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.employee_code) {
      loadData();
    }
    const handleUpdate = () => {
      if (currentUser?.employee_code) loadData();
    };
    window.addEventListener('employee_requests_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('employee_requests_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [currentUser, loadData]);

  // Date Presets Handler
  const applyPreset = (preset: 'all' | 'today' | 'this_week' | 'this_month' | 'this_year') => {
    setDatePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayFormatted = format(now);
      setStartDate(todayFormatted);
      setEndDate(todayFormatted);
      return;
    }
    if (preset === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), diff + 6);
      setStartDate(format(startOfWeek));
      setEndDate(format(endOfWeek));
      return;
    }
    if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(format(startOfMonth));
      setEndDate(format(endOfMonth));
      return;
    }
    if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      setStartDate(format(startOfYear));
      setEndDate(format(endOfYear));
      return;
    }
  };

  // Filtered List
  const filteredResignations = useMemo(() => {
    return resignations.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Date range filter
      if (datePreset !== 'all') {
        const d = String(item.apply_date).slice(0, 10);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (item.reason || '').toLowerCase().includes(q) ||
          (item.resignation_letter || '').toLowerCase().includes(q) ||
          (item.admin_notes || '').toLowerCase().includes(q) ||
          (item.employee_code || '').toLowerCase().includes(q) ||
          (item.official_acceptance_letter || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [resignations, statusFilter, datePreset, startDate, endDate, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = resignations.length;
    const pending = resignations.filter((r) => r.status === 'pending').length;
    const approved = resignations.filter((r) => r.status === 'approved').length;
    const rejected = resignations.filter((r) => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [resignations]);

  const latestResignation = resignations[0] || null;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/employee/attendance"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Attendance Hub</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/employee/attendance/apply-holiday"
            className="text-xs font-bold text-slate-600 hover:text-[#0b4da2] px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors no-underline"
          >
            Holiday Applications
          </Link>
          <Link
            href="/employee/attendance/apply-leave"
            className="text-xs font-bold text-slate-600 hover:text-[#0b4da2] px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors no-underline"
          >
            Annual Leave Applications
          </Link>
        </div>
      </div>

      {/* Header Banner with Direct Apply Button */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-rose-200 text-xs font-bold mb-3 border border-white/10">
              <FileText size={13} className="text-rose-400" />
              <span>Official Resignation &amp; Clearance Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              Resignations &amp; Clearances
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed m-0">
              View your formal departure notices, contractual notice periods, attached documents, and track administrative clearance.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href="/employee/attendance/apply-resignation/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-900/30 transition-all no-underline hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Apply Resignation Notice</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Total Notices</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-500 font-bold">Applications</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 m-0">Lifetime submissions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Under Review</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-600">{stats.pending}</span>
            <span className="text-xs text-amber-600 font-bold">Pending</span>
          </div>
          <p className="text-[11px] text-amber-600 font-semibold mt-1 m-0">Awaiting management</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Approved &amp; Cleared</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">{stats.approved}</span>
            <span className="text-xs text-emerald-600 font-bold">Approved</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 m-0">Clearance issued</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Declined / Withdrawn</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-600">{stats.rejected}</span>
            <span className="text-xs text-slate-500 font-bold">Declined</span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1 m-0">Disapproved or closed</p>
        </div>
      </div>

      {/* Latest Notice Status Alert (if any submitted) */}
      {latestResignation && (
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            latestResignation.status === 'approved'
              ? 'bg-emerald-50/70 border-emerald-200'
              : latestResignation.status === 'rejected'
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                latestResignation.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : latestResignation.status === 'rejected'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Latest Status:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    latestResignation.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : latestResignation.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {latestResignation.status}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-0.5 m-0">
                Requested Last Day: {String(latestResignation.requested_last_day).slice(0, 10)} &bull; Notice: {latestResignation.notice_period_days} Days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/employee/attendance/apply-resignation/review?id=${latestResignation.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs no-underline transition-all shadow-xs"
            >
              <Eye size={14} />
              <span>Review Details</span>
            </Link>
            {latestResignation.official_acceptance_letter && (
              <button
                type="button"
                onClick={() => setViewLetterItem(latestResignation)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border-0 cursor-pointer transition-all shadow-xs"
              >
                <Printer size={14} />
                <span>Print Official Letter</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Table Card with Search & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5">
          {/* Top Row: Status Tabs, Search & Refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Status Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 capitalize ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'bg-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Search Box & Refresh */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reasons, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b4da2]/30 focus:border-[#0b4da2] transition-all"
                />
              </div>

              <button
                type="button"
                onClick={loadData}
                title="Refresh Resignations"
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer bg-white shrink-0"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Bottom Row: Date Presets & Custom Range */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mr-1">Period:</span>
              {[
                { key: 'all', label: 'All Records' },
                { key: 'today', label: 'Today' },
                { key: 'this_week', label: 'This Week' },
                { key: 'this_month', label: 'This Month' },
                { key: 'this_year', label: 'This Year' },
                { key: 'custom', label: 'Custom' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    if (p.key === 'custom') {
                      setDatePreset('custom');
                    } else {
                      applyPreset(p.key as any);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer border ${
                    datePreset === p.key
                      ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                />
              </div>
            )}
          </div>
        </div>

        {/* Resignations Table (Spacious with Wide Columns) */}
        {filteredResignations.length === 0 ? (
          <div className="p-16 text-center">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700 m-0">No Resignation Notices Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto m-0">
              {searchQuery || statusFilter !== 'all' || datePreset !== 'all'
                ? 'Try adjusting your filters or search keywords.'
                : 'You have not submitted any formal resignation notices yet.'}
            </p>
            <div className="mt-5">
              <Link
                href="/employee/attendance/apply-resignation/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs no-underline shadow-xs"
              >
                <Plus size={14} />
                <span>Apply Resignation Notice</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-4 px-5 min-w-[150px]">Notice Date</th>
                  <th className="py-4 px-5 min-w-[180px]">Requested Last Day</th>
                  <th className="py-4 px-5 min-w-[140px]">Notice Period</th>
                  <th className="py-4 px-5 min-w-[200px]">Departure Reason</th>
                  <th className="py-4 px-5 min-w-[170px]">Attached Document</th>
                  <th className="py-4 px-5 min-w-[140px]">Status</th>
                  <th className="py-4 px-5 min-w-[200px]">Clearance &amp; Letter</th>
                  <th className="py-4 px-5 min-w-[150px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResignations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Notice Date */}
                    <td className="py-4 px-5 font-mono text-slate-700 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span className="font-bold">{String(item.apply_date).slice(0, 10)}</span>
                      </div>
                    </td>

                    {/* Requested Last Day */}
                    <td className="py-4 px-5 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-rose-500 shrink-0" />
                        <span className="font-mono font-black text-slate-900">
                          {String(item.requested_last_day).slice(0, 10)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Final working day</span>
                    </td>

                    {/* Notice Period */}
                    <td className="py-4 px-5 text-slate-700 min-w-[140px]">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
                        {item.notice_period_days} Days
                      </span>
                    </td>

                    {/* Departure Reason */}
                    <td className="py-4 px-5 text-slate-700 min-w-[200px]">
                      <span className="font-bold text-slate-900 block">{item.reason}</span>
                      {item.resignation_letter && (
                        <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5 m-0">
                          {item.resignation_letter}
                        </p>
                      )}
                    </td>

                    {/* Attachment */}
                    <td className="py-4 px-5 min-w-[170px]">
                      {item.attachment_url ? (
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#0b4da2] hover:bg-blue-100 font-bold text-xs transition no-underline border border-blue-200/60 max-w-[160px] truncate"
                        >
                          <Paperclip size={13} className="shrink-0" />
                          <span className="truncate">{item.attachment_name || 'Download File'}</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs italic">No attachment</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 min-w-[140px]">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase ${
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status === 'approved' && <CheckCircle2 size={12} />}
                        {item.status === 'rejected' && <AlertCircle size={12} />}
                        {item.status === 'pending' && <Clock size={12} />}
                        <span>{item.status}</span>
                      </span>
                    </td>

                    {/* Clearance & Official Letter */}
                    <td className="py-4 px-5 min-w-[200px]">
                      {item.official_acceptance_letter ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <ShieldCheck size={12} />
                            <span>Letter Issued</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            By {item.admin_name || 'Management'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Awaiting clearance</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 min-w-[150px] text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/employee/attendance/apply-resignation/review?id=${item.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs no-underline transition-all shadow-2xs"
                        >
                          <Eye size={13} />
                          <span>Review</span>
                        </Link>

                        {item.official_acceptance_letter && (
                          <button
                            type="button"
                            onClick={() => setViewLetterItem(item)}
                            title="Print / View Official Letter"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer transition-all"
                          >
                            <Printer size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Acceptance Letter View Modal */}
      {viewLetterItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Official Resignation Acceptance Letter
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Issued by {viewLetterItem.admin_name || 'Management'} on {viewLetterItem.admin_action_date || 'Approved'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewLetterItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {viewLetterItem.official_acceptance_letter}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border-0"
              >
                <Printer size={14} />
                <span>Print Document</span>
              </button>

              <button
                type="button"
                onClick={() => setViewLetterItem(null)}
                className="px-5 py-2 rounded-xl bg-[#0b4da2] text-white font-bold text-xs cursor-pointer border-0"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
