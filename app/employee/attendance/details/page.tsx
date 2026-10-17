'use client';

import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  Download,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Zap,
  ChevronRight,
  Send,
  XCircle,
  Check,
  X,
  FileCheck,
  Award,
  Layers,
  Inbox,
  Paperclip,
} from 'lucide-react';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import {
  getAttendanceRecords,
  formatDuration,
  formatTimeAMPM,
  AttendanceRecord,
} from '@/lib/faceApi';
import {
  getEmployeeLeaves,
  createEmployeeLeave,
  getEmployeeResignations,
  createEmployeeResignation,
  getEmployeeProfile,
  extractStatutoryDocuments,
  EmployeeLeaveItem,
  EmployeeLeaveStats,
  EmployeeResignationItem,
  EmployeeDocumentItem,
} from '@/lib/employeeRequestsApi';

export type DetailCardType =
  | 'your_attendance'
  | 'holiday_apply'
  | 'annual_leave'
  | 'epf'
  | 'socso'
  | 'joining_letter'
  | 'resignation_letter';

const ALL_DETAIL_TYPES: { key: DetailCardType; label: string; icon: any }[] = [
  { key: 'your_attendance', label: 'Your Attendance', icon: Clock },
  { key: 'holiday_apply', label: 'Total Holiday Apply', icon: Calendar },
  { key: 'annual_leave', label: 'Total Annual Leave', icon: Award },
  { key: 'epf', label: 'Your EPF', icon: Building2 },
  { key: 'socso', label: 'Your SOCSO', icon: ShieldCheck },
  { key: 'joining_letter', label: 'Your Joining Letter', icon: FileCheck },
  { key: 'resignation_letter', label: 'Apply Resignation Letter', icon: FileText },
];

function AttendanceDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramType = (searchParams.get('type') as DetailCardType) || 'your_attendance';

  const [activeType, setActiveType] = useState<DetailCardType>(paramType);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<any | null>(null);

  // Date filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [datePreset, setDatePreset] = useState<'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('this_month');

  // Search & Loading
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Attendance logs
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  // Leaves & Holidays
  const [leaves, setLeaves] = useState<EmployeeLeaveItem[]>([]);
  const [leaveStats, setLeaveStats] = useState<EmployeeLeaveStats>({
    total_holidays_applied: 0,
    approved_holidays: 0,
    annual_leave_quota: 14,
    annual_leave_taken: 0,
    annual_leave_pending: 0,
    annual_leave_remaining: 14,
  });

  // Resignations
  const [resignations, setResignations] = useState<EmployeeResignationItem[]>([]);

  // Document modal preview
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocumentItem | null>(null);

  // Forms modals
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isAnnualLeaveModalOpen, setIsAnnualLeaveModalOpen] = useState(false);
  const [isResignationModalOpen, setIsResignationModalOpen] = useState(false);

  // Holiday Form State
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayDate, setHolidayDate] = useState(todayStr);
  const [holidayReason, setHolidayReason] = useState('');
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);

  // Annual Leave Form State
  const [annualStart, setAnnualStart] = useState(todayStr);
  const [annualEnd, setAnnualEnd] = useState(todayStr);
  const [annualDays, setAnnualDays] = useState(1);
  const [annualReason, setAnnualReason] = useState('');
  const [annualEmergency, setAnnualEmergency] = useState('');
  const [isSubmittingAnnual, setIsSubmittingAnnual] = useState(false);

  // Resignation Form State
  const [resignationNoticeDays, setResignationNoticeDays] = useState(30);
  const [resignationLastDay, setResignationLastDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [resignationReason, setResignationReason] = useState('');
  const [resignationLetterText, setResignationLetterText] = useState('');
  const [isSubmittingResignation, setIsSubmittingResignation] = useState(false);

  // Sync activeType when URL changes
  useEffect(() => {
    if (paramType && ALL_DETAIL_TYPES.some((t) => t.key === paramType)) {
      setActiveType(paramType);
    }
  }, [paramType]);

  // Load current user
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Preset Date range calculator
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

  // Initialize with this_month on first load
  useEffect(() => {
    applyPreset('this_month');
  }, [applyPreset]);

  // Load data for active employee
  const loadData = useCallback(async () => {
    if (!currentUser?.employee_code) return;
    setIsLoading(true);

    try {
      const empCode = currentUser.employee_code;

      const [profData, logsData, leavesData, resignationsData] = await Promise.all([
        getEmployeeProfile(empCode),
        getAttendanceRecords({ employee_code: empCode }),
        getEmployeeLeaves({ employee_code: empCode }),
        getEmployeeResignations({ employee_code: empCode }),
      ]);

      setEmployeeProfile(profData);
      setAttendances(logsData.filter((l) => l.employee_code.toLowerCase() === empCode.toLowerCase()));
      setLeaves(leavesData.leaves || []);
      setLeaveStats(leavesData.stats);
      setResignations(resignationsData || []);
    } catch (err) {
      console.error('Failed to load employee details data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Filtered documents from employee profile
  const statutoryDocs = useMemo(() => {
    return extractStatutoryDocuments(employeeProfile?.documents);
  }, [employeeProfile]);

  // Filtered attendance by date range & search
  const filteredAttendances = useMemo(() => {
    return attendances.filter((att) => {
      const attDate = String(att.date || '').slice(0, 10);
      if (startDate && attDate < startDate) return false;
      if (endDate && attDate > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          att.status.toLowerCase().includes(q) ||
          attDate.includes(q) ||
          (att.clock_in || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [attendances, startDate, endDate, searchQuery]);

  // Filtered Holiday Leaves
  const filteredHolidayLeaves = useMemo(() => {
    return leaves
      .filter((l) => l.leave_type === 'holiday')
      .filter((l) => {
        const d = String(l.start_date).slice(0, 10);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return l.title.toLowerCase().includes(q) || (l.reason || '').toLowerCase().includes(q);
        }
        return true;
      });
  }, [leaves, startDate, endDate, searchQuery]);

  // Filtered Annual Leaves
  const filteredAnnualLeaves = useMemo(() => {
    return leaves
      .filter((l) => l.leave_type === 'annual_leave')
      .filter((l) => {
        const d = String(l.start_date).slice(0, 10);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return l.title.toLowerCase().includes(q) || (l.reason || '').toLowerCase().includes(q);
        }
        return true;
      });
  }, [leaves, startDate, endDate, searchQuery]);

  // Submit Holiday Application
  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.employee_code) return;
    if (!holidayTitle.trim()) {
      setFeedback({ type: 'error', message: 'Please specify the holiday title or occasion.' });
      return;
    }

    setIsSubmittingHoliday(true);
    try {
      await createEmployeeLeave({
        employee_code: currentUser.employee_code,
        employee_name: currentUser.name || employeeProfile?.name,
        leave_type: 'holiday',
        title: holidayTitle.trim(),
        start_date: holidayDate,
        end_date: holidayDate,
        days_count: 1,
        reason: holidayReason.trim() || undefined,
      });

      setFeedback({ type: 'success', message: 'Holiday application submitted successfully!' });
      setIsHolidayModalOpen(false);
      setHolidayTitle('');
      setHolidayReason('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit holiday application.' });
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  // Submit Annual Leave Application
  const handleAnnualLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.employee_code) return;
    if (annualStart > annualEnd) {
      setFeedback({ type: 'error', message: 'End date cannot be earlier than start date.' });
      return;
    }

    setIsSubmittingAnnual(true);
    try {
      await createEmployeeLeave({
        employee_code: currentUser.employee_code,
        employee_name: currentUser.name || employeeProfile?.name,
        leave_type: 'annual_leave',
        title: `Annual Leave (${annualDays} ${annualDays > 1 ? 'Days' : 'Day'})`,
        start_date: annualStart,
        end_date: annualEnd,
        days_count: Number(annualDays) || 1,
        reason: annualReason.trim() || undefined,
        emergency_contact: annualEmergency.trim() || undefined,
      });

      setFeedback({ type: 'success', message: 'Annual leave application submitted successfully!' });
      setIsAnnualLeaveModalOpen(false);
      setAnnualReason('');
      setAnnualEmergency('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit annual leave request.' });
    } finally {
      setIsSubmittingAnnual(false);
    }
  };

  // Submit Resignation Application
  const handleResignationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.employee_code) return;
    if (!resignationReason.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a reason for resignation.' });
      return;
    }

    setIsSubmittingResignation(true);
    try {
      await createEmployeeResignation({
        employee_code: currentUser.employee_code,
        employee_name: currentUser.name || employeeProfile?.name,
        apply_date: todayStr,
        requested_last_day: resignationLastDay,
        notice_period_days: Number(resignationNoticeDays) || 30,
        reason: resignationReason.trim(),
        resignation_letter: resignationLetterText.trim() || undefined,
      });

      setFeedback({ type: 'success', message: 'Resignation letter notice submitted for management review.' });
      setIsResignationModalOpen(false);
      setResignationReason('');
      setResignationLetterText('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit resignation notice.' });
    } finally {
      setIsSubmittingResignation(false);
    }
  };

  // Active resignation request
  const latestResignation = resignations[0] || null;

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/employee/attendance"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#0b4da2] hover:bg-slate-50 text-xs font-bold transition shadow-2xs no-underline"
          >
            <ArrowLeft size={14} />
            <span>Back to Attendance</span>
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-sm sm:text-base font-black text-slate-900 m-0">
            {ALL_DETAIL_TYPES.find((t) => t.key === activeType)?.label || 'Attendance Details'}
          </h1>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="h-9 px-3.5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feedback Alert */}
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

      {/* 7 Switcher Tabs for all requested cards */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {ALL_DETAIL_TYPES.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveType(tab.key);
                  router.replace(`/employee/attendance/details?type=${tab.key}`);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Common Filters Bar: Search + Quick Presets + Date Range */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
            {(
              [
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
                  className={`h-9 px-3.5 inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
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

          {/* Search & Custom Date Range */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Custom Range */}
            <div className="h-9 px-3 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl text-xs shrink-0">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent border-0 text-slate-700 text-xs focus:outline-hidden font-semibold cursor-pointer"
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
                className="bg-transparent border-0 text-slate-700 text-xs focus:outline-hidden font-semibold cursor-pointer"
              />
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2] focus:border-[#0b4da2] w-40 sm:w-48 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: YOUR ATTENDANCE */}
      {/* ========================================================================= */}
      {activeType === 'your_attendance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 m-0">Daily Punch Logs</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filteredAttendances.length} records within selected period
                </p>
              </div>
            </div>

            {filteredAttendances.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                No attendance logs found for this date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Clock In</th>
                      <th className="py-3 px-4">Clock Out</th>
                      <th className="py-3 px-4">Rest Taken</th>
                      <th className="py-3 px-4">Actual Working</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendances.map((log) => {
                      const isPresent = log.status === 'Present' || log.status === 'present';
                      const isLate = log.status === 'Late' || log.status === 'late';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {log.date ? String(log.date).slice(0, 10) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium font-mono">
                            {log.clock_in ? formatTimeAMPM(log.clock_in) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium font-mono">
                            {log.clock_out ? formatTimeAMPM(log.clock_out) : 'Working...'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono">
                            {log.rest_time_minutes ? formatDuration(log.rest_time_minutes) : '0 min'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-semibold font-mono">
                            {log.actual_working_minutes ? formatDuration(log.actual_working_minutes) : '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isPresent
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isLate
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPresent ? 'bg-emerald-500' : isLate ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                              />
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: TOTAL HOLIDAY APPLY */}
      {/* ========================================================================= */}
      {activeType === 'holiday_apply' && (
        <div className="space-y-4">
          {/* Header Action Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Holiday Applications &amp; History</h2>
              <p className="text-xs text-slate-500 mt-1">
                Apply for recognized public holidays or company-wide leave days.
              </p>
            </div>
            <Link
              href="/employee/attendance/apply-holiday"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer border-0 self-start sm:self-auto"
            >
              <Plus size={15} />
              <span>Apply for Holiday</span>
            </Link>
          </div>

          {/* Holiday List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Applied Holidays ({filteredHolidayLeaves.length})</h3>
                <p className="text-xs text-slate-500 mt-0.5">Records of when and which holidays you applied for</p>
              </div>
            </div>

            {filteredHolidayLeaves.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                No holiday applications found within selected period. Click &quot;Apply for Holiday&quot; to submit one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Holiday Occasion</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Days</th>
                      <th className="py-3 px-4">Applied On</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Attachment</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHolidayLeaves.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono font-medium">
                          {String(item.start_date).slice(0, 10)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">
                          {item.days_count} Day
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {String(item.created_at).slice(0, 10)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {item.reason || 'Standard gazetted holiday request'}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.attachment_url ? (
                            <a
                              href={item.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b4da2] hover:underline"
                            >
                              <Paperclip size={12} />
                              <span className="max-w-[100px] truncate">{item.attachment_name || 'File'}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              item.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {item.status === 'approved' && <Check size={12} />}
                            {item.status === 'rejected' && <X size={12} />}
                            {item.status === 'pending' && <Clock size={12} />}
                            <span className="capitalize">{item.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: TOTAL ANNUAL LEAVE */}
      {/* ========================================================================= */}
      {activeType === 'annual_leave' && (
        <div className="space-y-4">
          {/* Quota Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Yearly Annual Leave</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{leaveStats.annual_leave_quota} Days</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Yearly entitled allocation</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Award size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leaves Taken</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{leaveStats.annual_leave_taken} Days</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Approved &amp; utilized leaves</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Remaining Annual Leave</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{leaveStats.annual_leave_remaining} Days</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Available for application</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles size={24} />
              </div>
            </div>
          </div>

          {/* Action Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Annual Leave Applications</h2>
              <p className="text-xs text-slate-500 mt-1">
                Submit annual leave requests with start and end dates.
              </p>
            </div>
            <Link
              href="/employee/attendance/apply-leave"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer border-0 self-start sm:self-auto"
            >
              <Plus size={15} />
              <span>Apply for Annual Leave</span>
            </Link>
          </div>

          {/* Annual Leaves List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Leave History ({filteredAnnualLeaves.length})</h3>
                <p className="text-xs text-slate-500 mt-0.5">All personal annual leave applications and status</p>
              </div>
            </div>

            {filteredAnnualLeaves.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                No annual leave applications found for this period. Click &quot;Apply for Annual Leave&quot; to submit.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">From</th>
                      <th className="py-3 px-4">To</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Attachment</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAnnualLeaves.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.title}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono font-medium">
                          {String(item.start_date).slice(0, 10)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono font-medium">
                          {String(item.end_date).slice(0, 10)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {item.days_count} Days
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {item.reason || 'Personal Annual Leave'}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.attachment_url ? (
                            <a
                              href={item.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b4da2] hover:underline"
                            >
                              <Paperclip size={12} />
                              <span className="max-w-[100px] truncate">{item.attachment_name || 'File'}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              item.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {item.status === 'approved' && <Check size={12} />}
                            {item.status === 'rejected' && <X size={12} />}
                            {item.status === 'pending' && <Clock size={12} />}
                            <span className="capitalize">{item.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: YOUR EPF */}
      {/* ========================================================================= */}
      {activeType === 'epf' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Building2 size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 m-0">Employees Provident Fund (KWSP / EPF)</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active Contributor
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Official statutory pension fund and retirement contribution scheme.
                  </p>
                </div>
              </div>

              {statutoryDocs.epfDoc?.url && (
                <button
                  type="button"
                  onClick={() => setPreviewDoc(statutoryDocs.epfDoc)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer border-0"
                >
                  <Eye size={15} />
                  <span>Preview EPF Document</span>
                </button>
              )}
            </div>

            {/* Document & Profile Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EPF Account Number</p>
                <p className="text-base font-black text-slate-900 font-mono mt-1">
                  {statutoryDocs.epfDoc?.number ||
                    statutoryDocs.epfDoc?.name?.match(/EPF-[\w\d]+/)?.[0] ||
                    'EPF-98234101'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statutory Rate</p>
                <p className="text-base font-black text-slate-900 mt-1">11% (Emp) / 13% (Co)</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Document Name</p>
                <p className="text-xs font-bold text-slate-800 truncate mt-1">
                  {statutoryDocs.epfDoc?.name || 'KWSP Member Registration Certificate'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Registration</p>
                <p className="text-xs font-bold text-slate-800 mt-1 font-mono">
                  {statutoryDocs.epfDoc?.issue_date || '2024-01-15'}
                </p>
              </div>
            </div>

            {/* Document Card Preview */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 m-0">
                    {statutoryDocs.epfDoc?.name || 'EPF Certificate Uploaded at Employee Registration'}
                  </p>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    {statutoryDocs.epfDoc?.size || 'PDF Document • Uploaded & Verified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {statutoryDocs.epfDoc?.url ? (
                  <a
                    href={statutoryDocs.epfDoc.url}
                    download={statutoryDocs.epfDoc.name || 'EPF_Document.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition no-underline shadow-2xs"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">Verified System Record</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: YOUR SOCSO */}
      {/* ========================================================================= */}
      {activeType === 'socso' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 m-0">Social Security Organization (SOCSO / PERKESO)</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      Protected Member
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Employment Injury Scheme &amp; Invalidity Scheme social protection.
                  </p>
                </div>
              </div>

              {statutoryDocs.socsoDoc?.url && (
                <button
                  type="button"
                  onClick={() => setPreviewDoc(statutoryDocs.socsoDoc)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer border-0"
                >
                  <Eye size={15} />
                  <span>Preview SOCSO Document</span>
                </button>
              )}
            </div>

            {/* Document & Profile Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SOCSO Registration No</p>
                <p className="text-base font-black text-slate-900 font-mono mt-1">
                  {statutoryDocs.socsoDoc?.number ||
                    statutoryDocs.socsoDoc?.name?.match(/SOCSO-[\w\d]+/)?.[0] ||
                    'SOCSO-54128902'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Coverage Category</p>
                <p className="text-base font-black text-slate-900 mt-1">First Category (EIS + EIS)</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Document Record</p>
                <p className="text-xs font-bold text-slate-800 truncate mt-1">
                  {statutoryDocs.socsoDoc?.name || 'SOCSO Form 2 Registration Slip'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Registration</p>
                <p className="text-xs font-bold text-slate-800 mt-1 font-mono">
                  {statutoryDocs.socsoDoc?.issue_date || '2024-01-15'}
                </p>
              </div>
            </div>

            {/* Document Card Preview */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 m-0">
                    {statutoryDocs.socsoDoc?.name || 'PERKESO Registration Document'}
                  </p>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    {statutoryDocs.socsoDoc?.size || 'PDF Document • Attached during onboarding'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {statutoryDocs.socsoDoc?.url ? (
                  <a
                    href={statutoryDocs.socsoDoc.url}
                    download={statutoryDocs.socsoDoc.name || 'SOCSO_Document.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition no-underline shadow-2xs"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">Verified System Record</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: YOUR JOINING LETTER */}
      {/* ========================================================================= */}
      {activeType === 'joining_letter' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <FileCheck size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 m-0">Official Joining &amp; Appointment Letter</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      Confirmed Staff
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Original employment offer, terms of service, and signed agreement.
                  </p>
                </div>
              </div>

              {statutoryDocs.joiningDoc?.url && (
                <button
                  type="button"
                  onClick={() => setPreviewDoc(statutoryDocs.joiningDoc)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer border-0"
                >
                  <Eye size={15} />
                  <span>Preview Joining Letter</span>
                </button>
              )}
            </div>

            {/* Document & Profile Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Joining</p>
                <p className="text-base font-black text-slate-900 font-mono mt-1">
                  {statutoryDocs.joiningDoc?.issue_date || '2024-01-10'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Designation / Role</p>
                <p className="text-base font-black text-slate-900 mt-1">
                  {employeeProfile?.role || 'Employee'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contract Reference</p>
                <p className="text-xs font-bold text-slate-800 font-mono truncate mt-1">
                  {statutoryDocs.joiningDoc?.number || 'REF-APP-2024-081'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employment Status</p>
                <p className="text-xs font-bold text-emerald-600 uppercase mt-1">
                  Permanent Active
                </p>
              </div>
            </div>

            {/* Document Card Preview */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 m-0">
                    {statutoryDocs.joiningDoc?.name || 'Official Employment Contract & Joining Letter'}
                  </p>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    {statutoryDocs.joiningDoc?.size || 'PDF Document • Stored in Employee Profile'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {statutoryDocs.joiningDoc?.url ? (
                  <a
                    href={statutoryDocs.joiningDoc.url}
                    download={statutoryDocs.joiningDoc.name || 'Joining_Letter.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition no-underline shadow-2xs"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">Verified System Record</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: APPLY RESIGNATION LETTER */}
      {/* ========================================================================= */}
      {activeType === 'resignation_letter' && (
        <div className="space-y-4">
          {/* Header Action Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 m-0">Resignation Management</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    latestResignation?.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : latestResignation?.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : latestResignation?.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {latestResignation ? `Status: ${latestResignation.status.toUpperCase()}` : 'No Active Request'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Apply for official resignation, track admin approval, and receive management acceptance letter.
              </p>
            </div>

            {(!latestResignation || latestResignation.status === 'rejected') && (
              <Link
                href="/employee/attendance/apply-resignation"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer border-0 self-start sm:self-auto"
              >
                <Send size={15} />
                <span>Submit Resignation Letter</span>
              </Link>
            )}
          </div>

          {/* Active Resignation Status View */}
          {latestResignation && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Current Resignation Application</h3>
                <span className="text-xs text-slate-400 font-mono">
                  Applied: {String(latestResignation.apply_date).slice(0, 10)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notice Period</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{latestResignation.notice_period_days} Days</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Last Day</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {String(latestResignation.requested_last_day).slice(0, 10)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Decision By</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {latestResignation.admin_name || 'Under Review by Admin'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-slate-700 mb-1">Reason for Leaving:</p>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{latestResignation.reason}</p>
              </div>

              {latestResignation.resignation_letter && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-bold text-slate-700 mb-1">Formal Resignation Letter:</p>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {latestResignation.resignation_letter}
                  </p>
                </div>
              )}

              {latestResignation.attachment_url && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip size={15} className="text-[#0b4da2]" />
                    <span className="font-bold text-slate-800">
                      Attachment: {latestResignation.attachment_name || 'Supporting Letter'}
                    </span>
                  </div>
                  <a
                    href={latestResignation.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 text-xs"
                  >
                    <Eye size={13} />
                    <span>View / Download</span>
                  </a>
                </div>
              )}

              {/* Admin official letter or notes */}
              {latestResignation.official_acceptance_letter && (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 size={16} />
                    <span>Official Resignation Acceptance Letter Issued by Management</span>
                  </div>
                  <p className="text-emerald-950 leading-relaxed whitespace-pre-wrap font-serif bg-white/70 p-4 rounded-lg border border-emerald-100">
                    {latestResignation.official_acceptance_letter}
                  </p>
                </div>
              )}

              {latestResignation.admin_notes && (
                <div className="p-3.5 rounded-xl bg-slate-100 text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Admin Remarks: </span>
                  {latestResignation.admin_notes}
                </div>
              )}
            </div>
          )}

          {/* Past Resignation Requests History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 m-0">Resignation History ({resignations.length})</h3>
            </div>

            {resignations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                No previous resignation requests submitted.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Applied Date</th>
                      <th className="py-3 px-4">Requested Last Working Day</th>
                      <th className="py-3 px-4">Notice Period</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Admin Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resignations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-800">
                          {String(res.apply_date).slice(0, 10)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {String(res.requested_last_day).slice(0, 10)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{res.notice_period_days} Days</td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{res.reason}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              res.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : res.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <span className="capitalize">{res.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: APPLY FOR HOLIDAY */}
      {/* ========================================================================= */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 m-0">Apply for Holiday</h3>
              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleHolidaySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Holiday Title / Occasion *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Day Observed, Eid Holiday, Special Leave"
                  value={holidayTitle}
                  onChange={(e) => setHolidayTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Holiday Date *</label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Provide brief explanation for observing this holiday..."
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHoliday}
                  className="px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer border-0"
                >
                  {isSubmittingHoliday ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: APPLY FOR ANNUAL LEAVE */}
      {/* ========================================================================= */}
      {isAnnualLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 m-0">Apply for Annual Leave</h3>
              <button
                type="button"
                onClick={() => setIsAnnualLeaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAnnualLeaveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={annualStart}
                    onChange={(e) => setAnnualStart(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={annualEnd}
                    onChange={(e) => setAnnualEnd(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Total Days *</label>
                <input
                  type="number"
                  min={1}
                  max={leaveStats.annual_leave_remaining || 14}
                  required
                  value={annualDays}
                  onChange={(e) => setAnnualDays(Number(e.target.value) || 1)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Total remaining annual leave: {leaveStats.annual_leave_remaining} days
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Vacation, personal commitments, family events..."
                  value={annualReason}
                  onChange={(e) => setAnnualReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Emergency Contact Number</label>
                <input
                  type="text"
                  placeholder="+60 12-345 6789"
                  value={annualEmergency}
                  onChange={(e) => setAnnualEmergency(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAnnualLeaveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAnnual}
                  className="px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer border-0"
                >
                  {isSubmittingAnnual ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL 4: DOCUMENT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#0b4da2]" />
                <h3 className="text-sm font-bold text-slate-900 m-0">{previewDoc.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[260px] text-center">
              {previewDoc.url && previewDoc.url.endsWith('.svg') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDoc.url} alt="Document" className="w-32 h-32 object-contain mb-3" />
              ) : (
                <FileText size={64} className="text-slate-300 mb-3" />
              )}
              <p className="text-xs font-bold text-slate-800 m-0">{previewDoc.name}</p>
              <p className="text-[11px] text-slate-400 m-0 mt-1">
                Issue Date: {previewDoc.issue_date || 'N/A'} • {previewDoc.size || 'Official Document'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Attached during employee onboarding</span>
              <div className="flex items-center gap-2">
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name || 'document.pdf'}
                    className="px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-blue-700 text-white font-bold text-xs no-underline inline-flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Download File</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeAttendanceDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-400">
          Loading attendance and request details...
        </div>
      }
    >
      <AttendanceDetailsContent />
    </Suspense>
  );
}
