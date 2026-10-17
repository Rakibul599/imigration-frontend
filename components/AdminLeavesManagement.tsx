'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  Check,
  X,
  User,
  Building2,
  FileText,
  Filter,
  Paperclip,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  getEmployeeLeaves,
  createEmployeeLeave,
  updateLeaveStatus,
  deleteEmployeeLeave,
  EmployeeLeaveItem,
} from '@/lib/employeeRequestsApi';

interface AdminLeavesManagementProps {
  portalType: 'superadmin' | 'masteradmin';
  adminName?: string;
  assignedScope?: string[];
}

export default function AdminLeavesManagement({
  portalType,
  adminName = 'Super Admin',
  assignedScope = [],
}: AdminLeavesManagementProps) {
  const [leaves, setLeaves] = useState<EmployeeLeaveItem[]>([]);
  const [employees, setEmployees] = useState<{ id: number; employee_code: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'holiday' | 'annual_leave'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Reject Modal
  const [rejectItem, setRejectItem] = useState<EmployeeLeaveItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const applyPreset = useCallback((preset: 'all' | 'today' | 'this_week' | 'this_month' | 'this_year') => {
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
  }, []);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leavesRes, employeesRes] = await Promise.all([
        getEmployeeLeaves({}),
        fetch(`${apiBase}/employees`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => []),
      ]);

      setLeaves(leavesRes.leaves || []);
      if (Array.isArray(employeesRes)) {
        setEmployees(employeesRes);
      }
    } catch (err) {
      console.error('Failed to load leaves for admin:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('employee_requests_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('employee_requests_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [loadData]);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      // Type filter
      if (typeFilter !== 'all' && item.leave_type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Date range filter (only applied if not 'all')
      if (datePreset !== 'all') {
        const d = String(item.start_date).slice(0, 10);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (item.employee_name || '').toLowerCase().includes(q) ||
          item.employee_code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (item.reason || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [leaves, typeFilter, statusFilter, startDate, endDate, searchQuery]);

  // Metrics
  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const approvedHolidayCount = leaves.filter((l) => l.leave_type === 'holiday' && l.status === 'approved').length;
  const approvedAnnualCount = leaves.filter((l) => l.leave_type === 'annual_leave' && l.status === 'approved').length;

  const handleApprove = async (item: EmployeeLeaveItem) => {
    setIsProcessing(true);
    try {
      await updateLeaveStatus(item.id, 'approved', 'Approved by administrator.', adminName);
      setFeedback({ type: 'success', message: `Leave for ${item.employee_name || item.employee_code} has been approved.` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to approve leave.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectItem) return;

    setIsProcessing(true);
    try {
      await updateLeaveStatus(
        rejectItem.id,
        'rejected',
        rejectReason.trim() || 'Declined by administration after operational review.',
        adminName
      );
      setFeedback({ type: 'success', message: `Leave for ${rejectItem.employee_name || rejectItem.employee_code} rejected.` });
      setRejectItem(null);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reject leave.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLeave = async (item: EmployeeLeaveItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this ${item.leave_type === 'holiday' ? 'holiday' : 'leave'} application for ${item.employee_name || item.employee_code}?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await deleteEmployeeLeave(item.id);
      setFeedback({ type: 'success', message: 'Application deleted successfully.' });
      await loadData();
      window.dispatchEvent(new Event('employee_requests_updated'));
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete application.' });
    } finally {
      setIsProcessing(false);
    }
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
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0b4da2] border border-blue-200 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
            <Calendar size={12} />
            <span>Leave &amp; Holiday Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
            Leaves &amp; Holiday Requests
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed m-0">
            Review staff holiday applications and annual leave requests. Approve, decline, or grant leaves directly.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={portalType === 'superadmin' ? '/superadmin/attendance/leaves/assign' : '/masteradmin/attendance/leaves/assign'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083a7c] text-white shadow-sm transition cursor-pointer no-underline active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>Assign Employee Holiday / Leave</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{leaves.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">All staff leave records</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <FileText size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Needs action</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Holidays</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{approvedHolidayCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Recognized holiday days</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Annual Leaves</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{approvedAnnualCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Annual quota deducted</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Top Row: Types, Status, Search & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Request Types Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
              {(
                [
                  { id: 'all', label: 'All Requests' },
                  { id: 'holiday', label: 'Holidays' },
                  { id: 'annual_leave', label: 'Annual Leaves' },
                ] as const
              ).map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setTypeFilter(type.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                    typeFilter === type.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Quick Status */}
            <div className="flex items-center gap-1">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    statusFilter === st
                      ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="capitalize">{st}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search staff, code, reason..."
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
            <h2 className="text-sm font-bold text-slate-900 m-0">Leave Applications ({filteredLeaves.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">Review and manage employee leave approvals</p>
          </div>
        </div>

        {filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold">
            No leave requests found matching selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1250px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 min-w-[200px]">Staff Member</th>
                  <th className="py-4 px-5 min-w-[140px] whitespace-nowrap">Category</th>
                  <th className="py-4 px-5 min-w-[220px]">Occasion / Title</th>
                  <th className="py-4 px-5 min-w-[200px] whitespace-nowrap">Leave Dates</th>
                  <th className="py-4 px-5 min-w-[120px] whitespace-nowrap">Duration</th>
                  <th className="py-4 px-5 min-w-[220px]">Reason / Notes</th>
                  <th className="py-4 px-5 min-w-[160px]">Attachment</th>
                  <th className="py-4 px-5 min-w-[130px] whitespace-nowrap">Status</th>
                  <th className="py-4 px-6 text-right min-w-[200px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm m-0 leading-snug">{item.employee_name || 'Staff'}</p>
                      <p className="font-mono text-xs text-slate-400 font-medium m-0 mt-0.5">{item.employee_code}</p>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          item.leave_type === 'holiday'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {item.leave_type === 'holiday' ? 'Public Holiday' : 'Annual Leave'}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-900 text-xs sm:text-sm">{item.title}</td>
                    <td className="py-4 px-5 text-slate-700 font-mono font-semibold whitespace-nowrap text-xs">
                      {String(item.start_date).slice(0, 10)}
                      {item.end_date !== item.start_date && (
                        <span> → {String(item.end_date).slice(0, 10)}</span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-xl border border-slate-200 text-xs font-bold inline-block">
                        {item.days_count} {item.days_count === 1 ? 'Day' : 'Days'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-600 text-xs leading-relaxed max-w-xs">
                      <p className="m-0 line-clamp-2">{item.reason || 'Standard application'}</p>
                      {item.emergency_contact && (
                        <span className="block text-[11px] text-slate-400 font-mono mt-1">Tel: {item.emergency_contact}</span>
                      )}
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
                          <span className="max-w-[130px] truncate">{item.attachment_name || 'View File'}</span>
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
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {item.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleApprove(item)}
                              title="Approve request"
                              className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer border-0 inline-flex items-center gap-1 shadow-2xs transition"
                            >
                              <Check size={13} />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => {
                                setRejectItem(item);
                                setRejectReason('');
                              }}
                              title="Reject request"
                              className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer border-0 inline-flex items-center gap-1 shadow-2xs transition"
                            >
                              <X size={13} />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </>
                        )}

                        {/* View Application in Dedicated Subpage */}
                        <Link
                          href={`/${portalType}/attendance/leaves/${item.id}`}
                          title="View complete application"
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0b4da2] inline-flex items-center justify-center transition border border-slate-200 no-underline"
                        >
                          <Eye size={14} />
                        </Link>

                        {/* Edit Application in Dedicated Subpage */}
                        <Link
                          href={`/${portalType}/attendance/leaves/${item.id}/edit`}
                          title="Edit application details"
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 inline-flex items-center justify-center transition border border-slate-200 no-underline"
                        >
                          <Pencil size={14} />
                        </Link>

                        {/* Delete Application */}
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleDeleteLeave(item)}
                          title="Delete application"
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 inline-flex items-center justify-center transition border border-slate-200 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>



      {/* Reject Modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 m-0">
                Decline Leave Request: {rejectItem.employee_name}
              </h3>
              <button
                type="button"
                onClick={() => setRejectItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify operational reasons, schedule conflicts, or project deadlines..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 cursor-pointer border-0"
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
