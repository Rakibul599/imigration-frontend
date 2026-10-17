'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  UserCheck,
  Users,
  ShieldCheck,
  Calendar,
  Building2,
  Trash2,
  RefreshCw,
  Plus,
  AlertCircle,
  Zap,
  Coffee,
  UserX,
  UserMinus,
  ChevronRight,
} from 'lucide-react';
import FaceEnrollmentModal from '@/components/FaceEnrollmentModal';
import FaceAttendanceModal from '@/components/FaceAttendanceModal';
import BackgroundTrainingBadge from '@/components/BackgroundTrainingBadge';
import {
  getAttendanceRecords,
  getAttendanceStats,
  getFaceProfiles,
  getEmployeesForFaceTraining,
  deleteEmployeeFaceProfile,
  formatDuration,
  formatTimeAMPM,
  AttendanceRecord,
  FaceProfileItem,
  AttendanceStats,
  EmployeeSelectOption,
  backgroundTrainingManager,
} from '@/lib/faceApi';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import { getMasterAdminUser } from '@/lib/auth';

type DatePresetType = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

function calculatePresetDateRange(preset: 'today' | 'this_week' | 'this_month' | 'this_year'): { start: string; end: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const end = format(now);

  if (preset === 'today') {
    return { start: end, end };
  }

  if (preset === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
    return { start: format(startOfWeek), end };
  }

  if (preset === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: format(startOfMonth), end };
  }

  if (preset === 'this_year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return { start: format(startOfYear), end };
  }

  return { start: end, end };
}

export default function MasterAdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<'records' | 'profiles'>('records');
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [profiles, setProfiles] = useState<FaceProfileItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeSelectOption[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignedCompanyIds, setAssignedCompanyIds] = useState<string[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [datePreset, setDatePreset] = useState<DatePresetType>('today');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleApplyPreset = (preset: 'today' | 'this_week' | 'this_month' | 'this_year') => {
    setDatePreset(preset);
    const range = calculatePresetDateRange(preset);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  // Modal controls
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [prefilledEmployee, setPrefilledEmployee] = useState<{
    employee_code: string;
    name: string;
    company_name?: string;
  } | undefined>(undefined);

  // Notification banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Load user assigned companies
  useEffect(() => {
    const user = getMasterAdminUser();
    const assigned = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
    setAssignedCompanyIds(assigned);

    const allCompanies = getStoredCompanies();
    const permitted = allCompanies.filter((c) =>
      assigned.some((id) => id.toLowerCase() === c.id.toLowerCase())
    );
    setCompanies(permitted);

    fetchCompaniesFromBackend()
      .then((res) => {
        const p = res.filter((c) =>
          assigned.some((id) => id.toLowerCase() === c.id.toLowerCase())
        );
        setCompanies(p);
      })
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, logsData, profilesData, employeesData] = await Promise.all([
        getAttendanceStats(),
        getAttendanceRecords({
          start_date: startDate,
          end_date: endDate,
          company_id: selectedCompany === 'all' ? undefined : selectedCompany,
        }),
        getFaceProfiles(),
        getEmployeesForFaceTraining().catch(() => []),
      ]);

      // Filter logs, profiles, and employees to master admin's assigned scope if company matches
      const user = getMasterAdminUser();
      const scope = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];

      const scopedLogs = (logsData || []).filter((att: AttendanceRecord) => {
        if (!att.company_id) return true;
        return scope.some((id) => id.toLowerCase() === att.company_id?.toLowerCase());
      });

      const scopedProfiles = (profilesData || []).filter((p: FaceProfileItem) => {
        if (!p.company_id) return true;
        return scope.some((id) => id.toLowerCase() === p.company_id?.toLowerCase());
      });

      const scopedEmployees = (employeesData || []).filter((emp: EmployeeSelectOption) => {
        const comps = emp.assigned_companies || [];
        if (comps.length === 0) return true;
        return comps.some((c) => scope.some((s) => s.toLowerCase() === c.toLowerCase()));
      });

      if (statsData) {
        setStats({
          ...statsData,
          total_employees: scopedEmployees.length || statsData.total_employees,
          today_present: scopedLogs.filter((l: AttendanceRecord) => Boolean(l.clock_in)).length,
          today_late: scopedLogs.filter((l: AttendanceRecord) => l.status === 'Late' || l.status === 'late').length,
          today_clocked_in: scopedLogs.filter((l: AttendanceRecord) => l.clock_in && !l.clock_out && !l.is_on_rest).length,
          total_enrolled_faces: scopedProfiles.length,
        });
      }

      setAttendances(scopedLogs);
      setProfiles(scopedProfiles);
      setEmployees(scopedEmployees);
    } catch (err) {
      console.error('Failed to load master admin attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-reload data when background face training completes
  useEffect(() => {
    const unsub = backgroundTrainingManager.subscribe((jobs) => {
      const anyDone = jobs.some((j) => j.status === 'completed');
      if (anyDone) {
        loadData();
      }
    });
    return unsub;
  }, [loadData]);

  const handleDeleteProfile = async (employeeCode: string, name: string) => {
    if (!confirm(`Are you sure you want to delete biometric profile for ${name}?`)) return;

    try {
      const ok = await deleteEmployeeFaceProfile(employeeCode);
      if (ok) {
        setNotification({
          type: 'success',
          message: `Biometric profile for ${name} deleted successfully.`,
        });
        loadData();
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to delete profile.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error deleting profile.',
      });
    }
  };

  const filteredAttendances = attendances.filter((att) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      att.name.toLowerCase().includes(q) ||
      att.employee_code.toLowerCase().includes(q) ||
      att.company_name?.toLowerCase().includes(q)
    );
  });

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.employee_code.toLowerCase().includes(q) ||
      p.company_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : notification.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-500 hover:text-slate-800 font-bold ml-4 cursor-pointer border-0 bg-transparent"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Master Admin Biometric Attendance
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 whitespace-nowrap">
              Scope: {assignedCompanyIds.length} Companies
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Contactless facial recognition attendance tracking for assigned company personnel.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            href="/masteradmin/attendance/leaves"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs whitespace-nowrap"
          >
            <Calendar size={15} className="text-amber-600" />
            <span>Leaves & Holidays</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsAttendanceModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 hover:shadow-md transition cursor-pointer border-0 whitespace-nowrap"
          >
            <Camera size={16} />
            <span>Face Clock-In Kiosk</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPrefilledEmployee(undefined);
              setIsEnrollModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 hover:shadow-md transition cursor-pointer border-0 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Train Staff Face (15 Poses)</span>
          </button>
        </div>
      </div>

      {/* 9 KPI Stat Cards Grid - Clickable & Aligned */}
      {(() => {
        const totalEmployeesCount = employees.length || stats?.total_employees || 0;
        const faceTrainedCount =
          employees.filter((e) => e.is_face_enrolled).length ||
          stats?.total_enrolled_faces ||
          profiles.length ||
          0;
        const untrainedFaceCount = Math.max(0, totalEmployeesCount - faceTrainedCount);
        const todayPresentCount =
          stats?.today_present ?? attendances.filter((a) => Boolean(a.clock_in)).length;
        const todayAbsentCount = Math.max(0, totalEmployeesCount - todayPresentCount);
        const todayLateCount =
          stats?.today_late ??
          attendances.filter((a) => a.status === 'Late' || a.status === 'late').length;
        const clockInNowCount = attendances.filter(
          (a) => a.clock_in && !a.clock_out && !a.is_on_rest
        ).length;
        const restTimeNowCount = attendances.filter(
          (a) => a.is_on_rest || (a.rest_start && !a.rest_end && !a.clock_out)
        ).length;
        const checkoutNowCount =
          attendances.filter((a) => Boolean(a.clock_out)).length ||
          stats?.today_clocked_out ||
          0;

        const cards = [
          {
            key: 'total_employees',
            title: 'Total Employee',
            value: totalEmployeesCount,
            subtitle: 'Company Staff',
            icon: <Users size={22} />,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-600',
          },
          {
            key: 'face_trained',
            title: 'Total Face Train Employee',
            value: faceTrainedCount,
            subtitle: 'Biometrics Trained',
            icon: <ShieldCheck size={22} />,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            textColor: 'text-emerald-600',
          },
          {
            key: 'untrained_face',
            title: 'Total Untrain Employee',
            value: untrainedFaceCount,
            subtitle: 'Needs Calibration',
            icon: <UserX size={22} />,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            textColor: 'text-amber-600',
          },
          {
            key: 'present_today',
            title: 'Total Present Today',
            value: todayPresentCount,
            subtitle: 'Confirmed On-Site',
            icon: <UserCheck size={22} />,
            iconBg: 'bg-teal-50',
            iconColor: 'text-teal-600',
            textColor: 'text-teal-600',
          },
          {
            key: 'absent_today',
            title: 'Total Absent Today',
            value: todayAbsentCount,
            subtitle: 'Did Not Clock In',
            icon: <UserMinus size={22} />,
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            textColor: 'text-rose-600',
          },
          {
            key: 'late_today',
            title: 'Total Late Present Today',
            value: todayLateCount,
            subtitle: 'Past Schedule',
            icon: <Clock size={22} />,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            textColor: 'text-amber-600',
          },
          {
            key: 'clock_in_now',
            title: 'Total Clock In Now',
            value: clockInNowCount,
            subtitle: 'Working Shift',
            icon: <Zap size={22} />,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            textColor: 'text-indigo-600',
          },
          {
            key: 'rest_time_now',
            title: 'Total Rest Time Now',
            value: restTimeNowCount,
            subtitle: 'On Break / Rest',
            icon: <Coffee size={22} />,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            textColor: 'text-purple-600',
          },
          {
            key: 'checkout_now',
            title: 'Total Checkout Now',
            value: checkoutNowCount,
            subtitle: 'Completed Shift',
            icon: <CheckCircle2 size={22} />,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-700',
            textColor: 'text-slate-700',
          },
        ];

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Link
                key={card.key}
                href={`/masteradmin/attendance/list?type=${card.key}`}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-[#0b4da2] hover:-translate-y-0.5 transition-all flex items-center justify-between group no-underline cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate group-hover:text-[#0b4da2] transition-colors">
                    {card.title}
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{card.value}</p>
                  <p className={`text-[11px] ${card.textColor} font-semibold mt-1 flex items-center gap-1 truncate`}>
                    <span>{card.subtitle}</span>
                    <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-0.5 text-slate-400" />
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                  {card.icon}
                </div>
              </Link>
            ))}
          </div>
        );
      })()}

      {/* Tabs & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Top Row: Tab Switcher & Search / Refresh */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Tab Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0 self-start xl:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`h-7.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeTab === 'records'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Attendance Logs ({filteredAttendances.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profiles')}
              className={`h-7.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeTab === 'profiles'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Enrolled Profiles ({filteredProfiles.length})
            </button>
          </div>

          {/* Search, Company & Refresh - Fixed Alignment */}
          <div className="flex items-center gap-2 flex-nowrap shrink-0 self-start sm:self-auto">
            {/* Company Select */}
            <div className="h-9 px-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl text-xs shrink-0 focus-within:border-[#0b4da2] transition-colors">
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-transparent border-0 text-slate-700 text-xs focus:outline-hidden font-semibold cursor-pointer max-w-[130px] sm:max-w-[170px] truncate"
              >
                <option value="all">All Permitted Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search employee or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#0b4da2] focus:border-[#0b4da2] w-44 sm:w-56 transition-colors"
              />
            </div>

            {/* Refresh Button */}
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

        {/* Bottom Row: Quick Presets (Today, This Week, This Month, This Year) & Custom Date Range */}
        {activeTab === 'records' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
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
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
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
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent border-0 text-slate-700 text-xs focus:outline-hidden cursor-pointer font-semibold"
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
                className="bg-transparent border-0 text-slate-700 text-xs focus:outline-hidden cursor-pointer font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Tab 1: Records Table */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 whitespace-nowrap">Employee ID</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">General Working Time</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Working Start</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Rest Time</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Absent Time (Rest Over)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Working End Time</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Total Actual Working Time</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Over Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      <Camera className="mx-auto mb-2 opacity-40" size={32} />
                      <p>No attendance logs found in your company scope.</p>
                      <button
                        type="button"
                        onClick={() => setIsAttendanceModalOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#0b4da2] font-bold text-xs hover:bg-blue-100 cursor-pointer border-0"
                      >
                        <Camera size={14} /> Open Face Clock-In Kiosk
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredAttendances.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Employee ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {att.employee_code}
                        </span>
                      </td>

                      {/* 2. Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-[140px]">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] font-bold flex items-center justify-center shrink-0">
                            {att.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{att.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {att.role} {att.company_name ? `• ${att.company_name}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. General Working Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {att.general_working_hours ? `${att.general_working_hours.toFixed(1)} hrs` : '8.0 hrs'}
                        </span>
                      </td>

                      {/* 4. Working Start */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {att.clock_in ? (
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {formatTimeAMPM(att.clock_in)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 5. Rest Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {att.is_on_rest ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                            <Coffee size={12} className="text-amber-700" />
                            <span>Resting...</span>
                          </span>
                        ) : att.rest_time_minutes && att.rest_time_minutes > 0 ? (
                          <span className="font-mono font-semibold text-slate-800 bg-amber-50/70 px-2 py-0.5 rounded border border-amber-200/80">
                            {formatDuration(att.rest_time_minutes)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0 min</span>
                        )}
                      </td>

                      {/* 6. Absent Time (Rest Time Over) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {att.absent_minutes && att.absent_minutes > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <AlertCircle size={12} className="text-red-500" />
                            <span>{formatDuration(att.absent_minutes)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">0 min</span>
                        )}
                      </td>

                      {/* 7. Working End Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {att.clock_out ? (
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {formatTimeAMPM(att.clock_out)}
                          </span>
                        ) : att.clock_in ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                            <span>Working...</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 8. Total Actual Working Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {att.actual_working_minutes && att.actual_working_minutes > 0 ? (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {formatDuration(att.actual_working_minutes)}
                          </span>
                        ) : att.clock_in && !att.clock_out ? (
                          <span className="text-slate-400 italic">In Shift</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 9. Over Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {att.overtime_minutes && att.overtime_minutes > 0 ? (
                          <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            +{formatDuration(att.overtime_minutes)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Content Tab 2: Enrolled Profiles */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.length === 0 ? (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <ShieldCheck className="mx-auto mb-2 opacity-40 text-purple-600" size={36} />
              <p className="font-semibold text-slate-600">No enrolled face profiles in your scope.</p>
              <button
                type="button"
                onClick={() => {
                  setPrefilledEmployee(undefined);
                  setIsEnrollModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer border-0"
              >
                <Plus size={15} /> Enroll New Staff Face
              </button>
            </div>
          ) : (
            filteredProfiles.map((p) => (
              <div
                key={p.employee_code}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                        <p className="text-[11px] font-mono text-purple-700 font-semibold">
                          {p.employee_code}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Trained ({p.sample_count}/15 Poses)
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Company:</span>
                      <span className="font-semibold text-slate-800">{p.company_name || 'Assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Role:</span>
                      <span className="font-semibold text-slate-800">{p.role}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trained By:</span>
                      <span className="text-slate-700">{p.trained_by || 'Admin'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrefilledEmployee({
                        employee_code: p.employee_code,
                        name: p.name,
                        company_name: p.company_name,
                      });
                      setIsEnrollModalOpen(true);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#0b4da2] hover:bg-blue-100 font-bold text-xs transition cursor-pointer border-0 text-center"
                  >
                    Retrain 15 Poses
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProfile(p.employee_code, p.name)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer border-0 bg-transparent"
                    title="Delete Face Profile"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Face Attendance Kiosk Modal */}
      <FaceAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          loadData();
        }}
        onAttendanceSuccess={() => {
          loadData();
        }}
      />

      {/* Face 15-Pose Enrollment Modal */}
      <FaceEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          loadData();
        }}
        targetEmployee={prefilledEmployee}
        trainedBy="MasterAdmin"
        onSuccess={() => {
          setNotification({
            type: 'success',
            message: 'Face profile successfully trained and synchronized!',
          });
          loadData();
        }}
      />

      {/* Global Background AI Training Status Widget */}
      <BackgroundTrainingBadge />
    </div>
  );
}
