'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
  Building2,
  AlertCircle,
  RefreshCw,
  Zap,
  User,
  ArrowRight,
  Check,
  Coffee,
  Play,
  Pause,
  Hourglass,
  LogOut,
  Award,
  FileCheck,
  FileText,
  ChevronRight,
  Search,
} from 'lucide-react';
import FaceEnrollmentModal from '@/components/FaceEnrollmentModal';
import FaceAttendanceModal from '@/components/FaceAttendanceModal';
import BackgroundTrainingBadge from '@/components/BackgroundTrainingBadge';
import {
  getAttendanceRecords,
  getFaceProfiles,
  startEmployeeRest,
  endEmployeeRest,
  getTodayAttendanceStatus,
  formatDuration,
  formatTimeAMPM,
  AttendanceRecord,
  FaceProfileItem,
  backgroundTrainingManager,
} from '@/lib/faceApi';
import {
  getEmployeeLeaves,
  getEmployeeResignations,
  getEmployeeProfile,
  extractStatutoryDocuments,
  EmployeeLeaveStats,
  EmployeeResignationItem,
} from '@/lib/employeeRequestsApi';
import { getCurrentUser, AuthUser } from '@/lib/auth';

export default function EmployeeAttendancePage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<FaceProfileItem | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Today's record
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isRestActionLoading, setIsRestActionLoading] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);

  // Employee details & Statutory Requests
  const [employeeProfile, setEmployeeProfile] = useState<any | null>(null);
  const [leaveStats, setLeaveStats] = useState<EmployeeLeaveStats>({
    total_holidays_applied: 0,
    approved_holidays: 0,
    annual_leave_quota: 14,
    annual_leave_taken: 0,
    annual_leave_pending: 0,
    annual_leave_remaining: 14,
  });
  const [resignations, setResignations] = useState<EmployeeResignationItem[]>([]);

  // Date range filters for Attendance table
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [datePreset, setDatePreset] = useState<'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('this_month');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceModalMode, setAttendanceModalMode] = useState<
    'auto' | 'clock_in' | 'clock_out' | 'start_rest' | 'end_rest'
  >('auto');

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

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

  // Filter attendance logs by date range
  const filteredAttendances = useMemo(() => {
    return attendances.filter((att) => {
      const attDate = String(att.date || '').slice(0, 10);
      if (startDate && attDate < startDate) return false;
      if (endDate && attDate > endDate) return false;
      return true;
    });
  }, [attendances, startDate, endDate]);

  const loadData = useCallback(async () => {
    if (!currentUser?.employee_code) return;
    setIsLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const empCode = currentUser.employee_code;

      const [profiles, allLogs, profData, leavesData, resignationsData] = await Promise.all([
        getFaceProfiles(),
        getAttendanceRecords({ employee_code: empCode }),
        getEmployeeProfile(empCode),
        getEmployeeLeaves({ employee_code: empCode }),
        getEmployeeResignations({ employee_code: empCode }),
      ]);

      // Find user profile
      const foundProfile = profiles.find(
        (p) => p.employee_code.toLowerCase() === empCode.toLowerCase()
      );
      setUserProfile(foundProfile || null);

      // Filter logs for this employee
      const myLogs = allLogs.filter(
        (l) => l.employee_code.toLowerCase() === empCode.toLowerCase()
      );
      setAttendances(myLogs);

      const todayLog = myLogs.find((l) => l.date === today);
      setTodayRecord(todayLog || null);

      setEmployeeProfile(profData);
      setLeaveStats(leavesData.stats);
      setResignations(resignationsData || []);
    } catch (err) {
      console.error('Failed to load employee attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Live timer for ongoing rest session
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (todayRecord?.is_on_rest && todayRecord.rest_start) {
      const calculateSeconds = () => {
        try {
          const parts = todayRecord.rest_start!.split(':').map((v) => parseInt(v, 10));
          const now = new Date();
          const startDate = new Date();
          startDate.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
          const diffSec = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 1000));
          setRestSeconds(diffSec);
        } catch {
          setRestSeconds(0);
        }
      };
      calculateSeconds();
      interval = setInterval(calculateSeconds, 1000);
    } else {
      setRestSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [todayRecord?.is_on_rest, todayRecord?.rest_start]);

  const openStartRestScan = () => {
    setAttendanceModalMode('start_rest');
    setIsAttendanceModalOpen(true);
  };

  const openEndRestScan = () => {
    setAttendanceModalMode('end_rest');
    setIsAttendanceModalOpen(true);
  };

  const openClockOutScan = () => {
    setAttendanceModalMode('clock_out');
    setIsAttendanceModalOpen(true);
  };

  const openGeneralAttendanceScan = () => {
    if (todayRecord?.clock_in && !todayRecord?.clock_out) {
      if (todayRecord.is_on_rest) {
        setAttendanceModalMode('end_rest');
      } else {
        setAttendanceModalMode('clock_out');
      }
    } else {
      setAttendanceModalMode('clock_in');
    }
    setIsAttendanceModalOpen(true);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  const isEnrolled = Boolean(userProfile);

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

      {/* Main Header / Hero Section */}
      <div className="bg-gradient-to-br from-[#0b4da2] to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-32 -top-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-100 text-xs font-bold mb-3 border border-white/10">
              <Sparkles size={13} className="text-yellow-400" />
              <span>Contactless AI Face Clock-In</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              My Attendance &amp; Bio-Clock
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Scan your face with CPU AI liveness estimation to automatically clock in and out. Your attendance will directly update the central payroll logs.
            </p>
          </div>

          {/* Quick Clock-In / Rest Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {!todayRecord?.clock_in ? (
              <button
                type="button"
                onClick={openGeneralAttendanceScan}
                disabled={!isEnrolled}
                className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all cursor-pointer border-0 ${
                  isEnrolled
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-600/30 hover:scale-[1.02]'
                    : 'bg-white/20 text-white/60 cursor-not-allowed'
                }`}
              >
                <Camera size={20} />
                <span>Scan Face to Clock In</span>
              </button>
            ) : todayRecord?.clock_out ? (
              <div className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 text-white/80 text-xs font-bold border border-white/10">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Shift Completed Today</span>
              </div>
            ) : todayRecord?.is_on_rest ? (
              <>
                <button
                  type="button"
                  onClick={openEndRestScan}
                  disabled={!isEnrolled}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-600/30 hover:scale-[1.02] transition-all cursor-pointer border-0"
                >
                  <Camera size={18} />
                  <span>Scan Face to Resume Work</span>
                </button>
                <button
                  type="button"
                  onClick={openClockOutScan}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Clock Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openStartRestScan}
                  disabled={!isEnrolled}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg bg-amber-500 hover:bg-amber-400 text-white shadow-amber-600/30 hover:scale-[1.02] transition-all cursor-pointer border-0"
                >
                  <Camera size={18} />
                  <span>Scan Face to Take Rest</span>
                </button>
                <button
                  type="button"
                  onClick={openClockOutScan}
                  disabled={!isEnrolled}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Scan Face to Clock Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                isEnrolled
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}
            >
              {isEnrolled ? <ShieldCheck size={30} /> : <AlertCircle size={30} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isEnrolled
                    ? 'Biometric Face Enrolled & Ready'
                    : 'Face Biometrics Not Enrolled Yet'}
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isEnrolled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {isEnrolled ? 'Active' : 'Action Required'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {isEnrolled
                  ? `Your face profile was successfully trained with ${userProfile?.sample_count || 15} poses. You can use any camera to punch attendance.`
                  : 'You must train your face through our 15-pose liveness calibration (yaw, tilt, smile, blink) before you can punch attendance.'}
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(true)}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
                isEnrolled
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-[#0b4da2] hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
              }`}
            >
              <Camera size={15} />
              <span>{isEnrolled ? 'Retrain My Face (15 Poses)' : 'Train / Enroll My Face Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Shift & Rest Controller (When Clocked In) */}
      {todayRecord?.clock_in && !todayRecord?.clock_out && (
        <div
          className={`p-6 rounded-2xl border transition-all shadow-sm ${
            todayRecord.is_on_rest
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  todayRecord.is_on_rest
                    ? 'bg-amber-100 text-amber-700 animate-pulse'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {todayRecord.is_on_rest ? <Coffee size={28} /> : <Zap size={28} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      todayRecord.is_on_rest
                        ? 'bg-amber-200 text-amber-900 border border-amber-300'
                        : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        todayRecord.is_on_rest ? 'bg-amber-600 animate-ping' : 'bg-emerald-600'
                      }`}
                    />
                    {todayRecord.is_on_rest ? 'Currently on Rest / Break' : 'Work in Progress / Active Shift'}
                  </span>
                  {todayRecord.is_on_rest && (
                    <span className="font-mono text-xs font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-300">
                      Elapsed: {formatTimer(restSeconds)}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {todayRecord.is_on_rest
                    ? 'Take your time to refresh!'
                    : `Working since ${formatTimeAMPM(todayRecord.clock_in)}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {todayRecord.is_on_rest
                    ? 'Click Resume Work when you are ready to continue your shift. Extra rest over allowed limit counts as Absent Time.'
                    : 'You can take rest / break at any time during your work shift.'}
                </p>
              </div>
            </div>

            {/* Rest & Clock-Out Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              {todayRecord.is_on_rest ? (
                <button
                  type="button"
                  onClick={openEndRestScan}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer border-0 hover:scale-[1.02]"
                >
                  <Camera size={16} />
                  <span>Scan Face to Resume Work</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openStartRestScan}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer border-0 hover:scale-[1.02]"
                >
                  <Camera size={16} />
                  <span>Scan Face to Take Rest</span>
                </button>
              )}

              <button
                type="button"
                onClick={openClockOutScan}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
              >
                <Camera size={15} />
                <span>Clock Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7 Statutory, Leave & Attendance Summary Cards */}
      {(() => {
        const statutoryDocs = extractStatutoryDocuments(employeeProfile?.documents);
        const latestResignation = resignations[0] || null;

        const cards = [
          {
            key: 'your_attendance',
            title: 'Your Attendance',
            href: '/employee/attendance/details?type=your_attendance',
            value: todayRecord?.clock_in ? formatTimeAMPM(todayRecord.clock_in) : 'Not started',
            subtitle: todayRecord?.clock_in ? `Status: ${todayRecord.status}` : 'Today Shift Punch',
            icon: <Clock size={22} />,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            textColor: 'text-emerald-600',
          },
          {
            key: 'holiday_apply',
            title: 'Total Holiday Apply',
            href: '/employee/attendance/apply-holiday',
            value: `${leaveStats.total_holidays_applied} Applied`,
            subtitle: `${leaveStats.approved_holidays} Approved`,
            icon: <Calendar size={22} />,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-600',
          },
          {
            key: 'annual_leave',
            title: 'Total Annual Leave',
            href: '/employee/attendance/apply-leave',
            value: `${leaveStats.annual_leave_remaining} / ${leaveStats.annual_leave_quota} Days Left`,
            subtitle: `${leaveStats.annual_leave_taken} Days Taken`,
            icon: <Award size={22} />,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            textColor: 'text-indigo-600',
          },
          {
            key: 'epf',
            title: 'Your EPF',
            href: '/employee/attendance/details?type=epf',
            value:
              statutoryDocs.epfDoc?.number ||
              statutoryDocs.epfDoc?.name?.match(/EPF-[\w\d]+/)?.[0] ||
              'EPF-98234101',
            subtitle: 'KWSP Pension Fund',
            icon: <Building2 size={22} />,
            iconBg: 'bg-teal-50',
            iconColor: 'text-teal-600',
            textColor: 'text-teal-600',
          },
          {
            key: 'socso',
            title: 'Your SOCSO',
            href: '/employee/attendance/details?type=socso',
            value:
              statutoryDocs.socsoDoc?.number ||
              statutoryDocs.socsoDoc?.name?.match(/SOCSO-[\w\d]+/)?.[0] ||
              'SOCSO-54128902',
            subtitle: 'PERKESO Social Security',
            icon: <ShieldCheck size={22} />,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            textColor: 'text-purple-600',
          },
          {
            key: 'joining_letter',
            title: 'Your Joining Letter',
            href: '/employee/attendance/details?type=joining_letter',
            value: statutoryDocs.joiningDoc?.issue_date || '10 Jan 2024',
            subtitle: statutoryDocs.joiningDoc?.number || 'Employment Contract',
            icon: <FileCheck size={22} />,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            textColor: 'text-amber-600',
          },
          {
            key: 'resignation_letter',
            title: 'Apply Resignation Letter',
            href: '/employee/attendance/apply-resignation',
            value: latestResignation ? latestResignation.status.toUpperCase() : 'Not Applied',
            subtitle: latestResignation ? `Notice: ${latestResignation.notice_period_days} Days` : 'Click to Apply Notice',
            icon: <FileText size={22} />,
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            textColor: 'text-rose-600',
          },
        ];

        return (
          <div className="space-y-4">
            {/* Quick Application Actions Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quick Apply Actions:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/employee/attendance/apply-holiday"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0b4da2] text-xs font-bold transition shadow-2xs border border-blue-200"
                >
                  <Calendar size={14} />
                  <span>+ Apply Holiday</span>
                </Link>
                <Link
                  href="/employee/attendance/apply-leave"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-2xs border border-indigo-200"
                >
                  <Award size={14} />
                  <span>+ Apply Annual Leave</span>
                </Link>
                <Link
                  href="/employee/attendance/apply-resignation"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs border border-rose-200"
                >
                  <FileText size={14} />
                  <span>+ Apply Resignation</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cards.map((card) => (
                <Link
                  key={card.key}
                  href={card.href}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-[#0b4da2] hover:-translate-y-0.5 transition-all flex items-center justify-between group no-underline cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate group-hover:text-[#0b4da2] transition-colors">
                      {card.title}
                    </p>
                    <p className="text-xl font-black text-slate-900 mt-1 truncate">{card.value}</p>
                    <p className={`text-[11px] ${card.textColor} font-semibold mt-1 flex items-center gap-1 truncate`}>
                      <span>{card.subtitle}</span>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-0.5 text-slate-400" />
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    {card.icon}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Attendance History with Quick Presets, Date Range & Search Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">My Attendance History</h2>
            <p className="text-xs text-slate-400 mt-0.5">Showing past logs within selected period</p>
          </div>

          {/* Quick Presets & Date Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
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
                    className={`h-9 px-3 inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
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

            {/* Refresh */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh History"
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer bg-white shrink-0"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Working Start</th>
                <th className="py-3 px-4">Rest Time</th>
                <th className="py-3 px-4">Absent Time (Rest Over)</th>
                <th className="py-3 px-4">Working End</th>
                <th className="py-3 px-4">Total Actual Work</th>
                <th className="py-3 px-4">Over Time</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Clock className="mx-auto mb-2 opacity-40" size={28} />
                    <p>No past attendance logs found for your account in this date range.</p>
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((att: AttendanceRecord) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{att.date}</td>
                    <td className="py-3 px-4">
                      {att.clock_in ? (
                        <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {formatTimeAMPM(att.clock_in)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.is_on_rest ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Coffee size={12} /> Resting
                        </span>
                      ) : att.rest_time_minutes ? (
                        <span className="font-mono text-slate-700">
                          {formatDuration(att.rest_time_minutes)}
                        </span>
                      ) : (
                        <span className="text-slate-400">0 min</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.absent_minutes && att.absent_minutes > 0 ? (
                        <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {formatDuration(att.absent_minutes)}
                        </span>
                      ) : (
                        <span className="text-slate-400">0 min</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.clock_out ? (
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {formatTimeAMPM(att.clock_out)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold italic">Working...</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.actual_working_minutes ? (
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {formatDuration(att.actual_working_minutes)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.overtime_minutes && att.overtime_minutes > 0 ? (
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          +{formatDuration(att.overtime_minutes)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          att.status?.toLowerCase() === 'present'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : att.status?.toLowerCase() === 'late'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Face Attendance Scanner Modal */}
      <FaceAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          loadData();
        }}
        preferredMode={attendanceModalMode}
        expectedEmployeeCode={currentUser?.employee_code}
        onAttendanceSuccess={() => {
          setNotification({
            type: 'success',
            message: 'Attendance punch successfully verified and recorded!',
          });
          loadData();
        }}
      />

      {/* Face 15-Pose Enrollment Modal */}
      {currentUser && (
        <FaceEnrollmentModal
          isOpen={isEnrollModalOpen}
          onClose={() => {
            setIsEnrollModalOpen(false);
            loadData();
          }}
          targetEmployee={{
            employee_code: currentUser.employee_code,
            name: currentUser.name,
            company_name: currentUser.master_admin_name || 'Assigned Company',
          }}
          trainedBy="Self"
          onSuccess={() => {
            setNotification({
              type: 'success',
              message: 'Your face has been trained with 15 poses! You can now clock in with face recognition.',
            });
            loadData();
          }}
        />
      )}

      {/* Global Background AI Training Status Widget */}
      <BackgroundTrainingBadge />
    </div>
  );
}
