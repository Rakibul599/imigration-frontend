'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  Check,
  X,
  User,
  Calendar,
  Send,
  Download,
  Eye,
  ShieldCheck,
  Paperclip,
} from 'lucide-react';
import {
  getEmployeeResignations,
  EmployeeResignationItem,
} from '@/lib/employeeRequestsApi';

interface AdminResignationsManagementProps {
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
  assignedScope?: string[];
}

export default function AdminResignationsManagement({
  portalType,
  adminName = 'Super Admin',
  assignedScope = [],
}: AdminResignationsManagementProps) {
  const [resignations, setResignations] = useState<EmployeeResignationItem[]>([]);
  const [employees, setEmployees] = useState<{ id: number; employee_code: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [datePreset, setDatePreset] = useState<'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('this_month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');



  const applyPreset = useCallback((preset: 'today' | 'this_week' | 'this_month' | 'this_year') => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const end = format(now);

    if (preset === 'today') {
      setStartDate(end);
      setEndDate(end);
      return;
    }
    if (preset === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
      setStartDate(format(startOfWeek));
      setEndDate(end);
      return;
    }
    if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(format(startOfMonth));
      setEndDate(end);
      return;
    }
    if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setStartDate(format(startOfYear));
      setEndDate(end);
      return;
    }
  }, []);

  useEffect(() => {
    applyPreset('this_month');
  }, [applyPreset]);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resData, empData] = await Promise.all([
        getEmployeeResignations({}),
        fetch(`${apiBase}/employees`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => []),
      ]);

      setResignations(resData || []);
      if (Array.isArray(empData)) {
        setEmployees(empData);
      }
    } catch (err) {
      console.error('Failed to load resignations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered resignations
  const filteredResignations = useMemo(() => {
    return resignations.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Date filter
      const d = String(item.apply_date).slice(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (item.employee_name || '').toLowerCase().includes(q) ||
          item.employee_code.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [resignations, statusFilter, startDate, endDate, searchQuery]);

  // Summary counts
  const pendingCount = resignations.filter((r) => r.status === 'pending').length;
  const approvedCount = resignations.filter((r) => r.status === 'approved').length;
  const rejectedCount = resignations.filter((r) => r.status === 'rejected').length;



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
          <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
            <FileText size={12} />
            <span>Staff Departures &amp; Offboarding</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
            Resignations &amp; Clearances
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed m-0">
            Review staff resignation notices, approve or reject applications, and issue official resignation clearance letters.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={`/${portalType}/employees/resignations/new`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083a7c] text-white shadow-sm transition no-underline cursor-pointer"
          >
            <Plus size={15} />
            <span>Issue Resignation Letter</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Notices</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{resignations.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Submitted resignation requests</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <FileText size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Awaiting decision</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved &amp; Released</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Formal letter issued</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rejected Notices</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{rejectedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Declined or withdrawn</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Top Row: Status Pills, Search & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
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
                <span className="capitalize">{st}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search employee, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2] focus:border-[#0b4da2] w-48 sm:w-60 transition-colors"
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

        {/* Bottom Row: Quick Presets (All Dates, Today, This Week, This Month, This Year) & Custom Date Range */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
            {(
              [
                { id: 'all', label: 'All Dates' },
                { id: 'today', label: 'Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'this_year', label: 'This Year' },
              ] as const
            ).map((preset) => {
              const isActive = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Range */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
            <Calendar size={14} className="text-slate-500 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent border-0 text-slate-800 font-semibold focus:outline-hidden text-xs cursor-pointer font-mono"
            />
            <span className="text-slate-300 font-bold">—</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent border-0 text-slate-800 font-semibold focus:outline-hidden text-xs cursor-pointer font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">Resignation Applications ({filteredResignations.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage employee departure notices and letters</p>
          </div>
        </div>

        {filteredResignations.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold">
            No resignation records found matching selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-4 px-5 min-w-[190px]">Staff Member</th>
                  <th className="py-4 px-5 min-w-[140px]">Notice Date</th>
                  <th className="py-4 px-5 min-w-[170px]">Requested Last Day</th>
                  <th className="py-4 px-5 min-w-[130px]">Notice Period</th>
                  <th className="py-4 px-5 min-w-[220px]">Reason / Letter</th>
                  <th className="py-4 px-5 min-w-[170px]">Attachment</th>
                  <th className="py-4 px-5 min-w-[130px]">Status</th>
                  <th className="py-4 px-5 min-w-[180px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResignations.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 min-w-[190px]">
                      <p className="font-bold text-slate-900 m-0">{item.employee_name || 'Staff'}</p>
                      <p className="font-mono text-[11px] text-slate-400 m-0">{item.employee_code}</p>
                    </td>
                    <td className="py-4 px-5 min-w-[140px] text-slate-700 font-mono">
                      {String(item.apply_date).slice(0, 10)}
                    </td>
                    <td className="py-4 px-5 min-w-[170px] text-slate-900 font-mono font-bold">
                      {String(item.requested_last_day).slice(0, 10)}
                    </td>
                    <td className="py-4 px-5 min-w-[130px] text-slate-700">{item.notice_period_days} Days</td>
                    <td className="py-4 px-5 min-w-[220px] text-slate-600">
                      <p className="font-bold text-slate-900 m-0 truncate max-w-xs">{item.reason}</p>
                      {item.resignation_letter && (
                        <p className="text-[11px] text-slate-400 truncate max-w-xs m-0 mt-0.5">
                          {item.resignation_letter}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-5 min-w-[170px]">
                      {item.attachment_url ? (
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-[#0b4da2] hover:bg-blue-100 font-bold text-[11px] transition no-underline border border-blue-200/60 max-w-[160px] truncate"
                        >
                          <Paperclip size={12} className="shrink-0" />
                          <span className="truncate">{item.attachment_name || 'View File'}</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-5 min-w-[130px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 min-w-[180px] text-right space-x-1.5 whitespace-nowrap">
                      {item.status === 'pending' ? (
                        <Link
                          href={`/${portalType}/employees/resignations/review?id=${item.id}`}
                          className="px-3.5 py-2 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-all no-underline inline-block"
                        >
                          Review &amp; Decide
                        </Link>
                      ) : (
                        <Link
                          href={`/${portalType}/employees/resignations/review?id=${item.id}`}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all no-underline inline-block"
                        >
                          View Details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
