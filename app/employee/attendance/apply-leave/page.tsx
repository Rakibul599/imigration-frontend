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
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  ChevronRight,
  Eye,
  Award,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import {
  getEmployeeLeaves,
  EmployeeLeaveItem,
  EmployeeLeaveStats,
} from '@/lib/employeeRequestsApi';

export default function EmployeeAnnualLeaveListPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'annual_leave' | 'medical' | 'emergency'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [leaves, setLeaves] = useState<EmployeeLeaveItem[]>([]);
  const [leaveStats, setLeaveStats] = useState<EmployeeLeaveStats>({
    total_holidays_applied: 0,
    approved_holidays: 0,
    annual_leave_quota: 14,
    annual_leave_taken: 0,
    annual_leave_pending: 0,
    annual_leave_remaining: 14,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser?.employee_code) return;
    setIsLoading(true);
    try {
      const res = await getEmployeeLeaves({
        employee_code: currentUser.employee_code,
        leave_type: 'annual_leave',
      });
      setLeaves(res.leaves || []);
      if (res.stats) {
        setLeaveStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load employee leaves:', err);
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
  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && item.leave_type !== categoryFilter) return false;

      // Date range filter
      if (datePreset !== 'all') {
        const d = String(item.start_date).slice(0, 10);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.reason || '').toLowerCase().includes(q) ||
          (item.admin_notes || '').toLowerCase().includes(q) ||
          (item.emergency_contact || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [leaves, statusFilter, categoryFilter, datePreset, startDate, endDate, searchQuery]);

  // Category labels
  const getCategoryBadge = (type: string) => {
    switch (type) {
      case 'medical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Medical Leave
          </span>
        );
      case 'emergency':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Emergency
          </span>
        );
      case 'holiday':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Holiday
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Annual Leave
          </span>
        );
    }
  };

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
            href="/employee/attendance/apply-resignation"
            className="text-xs font-bold text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors no-underline"
          >
            Resignation Notice
          </Link>
        </div>
      </div>

      {/* Header Banner with Direct Apply Button */}
      <div className="bg-gradient-to-r from-indigo-700 via-[#0b4da2] to-blue-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-100 text-xs font-bold mb-3 border border-white/10">
              <Calendar size={13} className="text-yellow-300" />
              <span>Leave Tracking &amp; Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              My Annual &amp; Medical Leaves
            </h1>
            <p className="text-indigo-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed m-0">
              View your yearly annual leaves, approved leave records, medical certificate attachments, and track approvals.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href="/employee/attendance/apply-leave/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-[#0b4da2] hover:bg-blue-50 font-black text-xs shadow-lg transition-all no-underline hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Apply Annual Leave</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Yearly Leave Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Total Yearly Annual Leave</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-900">{leaveStats.annual_leave_quota}</span>
            <span className="text-xs text-slate-500 font-bold">Days / Year</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 m-0">Statutory annual entitlement</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Taken / Approved</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">{leaveStats.annual_leave_taken}</span>
            <span className="text-xs text-emerald-600 font-bold">Days</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 m-0">Utilized this cycle</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Pending Approval</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-600">{leaveStats.annual_leave_pending}</span>
            <span className="text-xs text-amber-600 font-bold">Days</span>
          </div>
          <p className="text-[11px] text-amber-600 font-semibold mt-1 m-0">Under admin review</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Total Remaining Annual Leave</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-[#0b4da2]">{leaveStats.annual_leave_remaining}</span>
            <span className="text-xs text-[#0b4da2] font-bold">Days</span>
          </div>
          <p className="text-[11px] text-[#0b4da2] font-semibold mt-1 m-0">Available to request</p>
        </div>
      </div>

      {/* Main Table Card with Search & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5">
          {/* Top Row: Status, Category, Search & Refresh */}
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

              {/* Category Select */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2] cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="annual_leave">Annual Leave</option>
                <option value="medical">Medical / MC</option>
                <option value="emergency">Emergency</option>
              </select>

              {/* Search Input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search purpose or remarks..."
                  className="h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2] w-52 sm:w-64 transition-colors"
                />
              </div>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh applications"
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer bg-white shrink-0 self-end sm:self-auto transition"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
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
                    onClick={() => applyPreset(preset.id)}
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

            {/* Custom Date Range Picker */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
              <Calendar size={14} className="text-slate-500 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                className="bg-transparent border-0 text-slate-800 font-semibold focus:outline-hidden text-xs cursor-pointer font-mono"
              />
              <span className="text-slate-300 font-bold">—</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                className="bg-transparent border-0 text-slate-800 font-semibold focus:outline-hidden text-xs cursor-pointer font-mono"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {filteredLeaves.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
              <Calendar size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 m-0">No Leave Applications Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto m-0">
              You haven&apos;t submitted any leave applications matching the selected criteria.
            </p>
            <div className="pt-2">
              <Link
                href="/employee/attendance/apply-leave/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] text-white text-xs font-bold no-underline shadow-sm hover:bg-blue-700 transition"
              >
                <Plus size={14} />
                <span>Submit Leave Application</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 min-w-[280px]">Leave Type / Title</th>
                  <th className="py-4 px-5 min-w-[200px] whitespace-nowrap">Leave Dates</th>
                  <th className="py-4 px-5 min-w-[130px] whitespace-nowrap">Duration</th>
                  <th className="py-4 px-5 min-w-[130px] whitespace-nowrap">Applied On</th>
                  <th className="py-4 px-5 min-w-[160px]">Attachment / MC</th>
                  <th className="py-4 px-5 min-w-[130px] whitespace-nowrap">Status</th>
                  <th className="py-4 px-6 min-w-[240px]">Admin Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getCategoryBadge(item.leave_type)}
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</span>
                      </div>
                      {item.reason && (
                        <p className="text-[11px] text-slate-500 font-normal m-0 mt-1 line-clamp-2">
                          {item.reason}
                        </p>
                      )}
                      {item.emergency_contact && (
                        <p className="text-[10px] text-slate-400 font-mono m-0 mt-0.5">
                          Emergency Contact: {item.emergency_contact}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-700 font-semibold whitespace-nowrap text-xs">
                      {String(item.start_date).slice(0, 10)}
                      {item.end_date !== item.start_date && (
                        <span> → {String(item.end_date).slice(0, 10)}</span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200 font-bold text-xs inline-block">
                        {item.days_count} {item.days_count === 1 ? 'Day' : 'Days'}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-500 text-xs whitespace-nowrap">
                      {String(item.created_at).slice(0, 10)}
                    </td>
                    <td className="py-4 px-5">
                      {item.attachment_url ? (
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-[#0b4da2] font-bold text-xs no-underline border border-slate-200 transition"
                        >
                          <Paperclip size={13} />
                          <span className="max-w-[140px] truncate">{item.attachment_name || 'View File'}</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs font-semibold">—</span>
                      )}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status === 'approved' && <Check size={13} />}
                        {item.status === 'rejected' && <X size={13} />}
                        {item.status === 'pending' && <Clock size={13} />}
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs leading-relaxed">
                      {item.admin_notes || item.approved_by ? (
                        <span className="text-slate-800 font-medium">
                          {item.admin_notes || 'Approved'} {item.approved_by ? `(${item.approved_by})` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Under review by management</span>
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
