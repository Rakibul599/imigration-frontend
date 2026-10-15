'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  const loadData = useCallback(async () => {
    if (!currentUser?.employee_code) return;
    setIsLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const [profiles, allLogs] = await Promise.all([
        getFaceProfiles(),
        getAttendanceRecords({ employee_code: currentUser.employee_code }),
      ]);

      // Find user profile
      const foundProfile = profiles.find(
        (p) => p.employee_code.toLowerCase() === currentUser.employee_code.toLowerCase()
      );
      setUserProfile(foundProfile || null);

      // Filter logs for this employee
      const myLogs = allLogs.filter(
        (l) => l.employee_code.toLowerCase() === currentUser.employee_code.toLowerCase()
      );
      setAttendances(myLogs);

      const todayLog = myLogs.find((l) => l.date === today);
      setTodayRecord(todayLog || null);
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

      {/* Today's Punch Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Working Start */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Working Start</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              {todayRecord?.clock_in ? formatTimeAMPM(todayRecord.clock_in) : 'Not started'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {todayRecord?.clock_in ? `Status: ${todayRecord.status}` : 'Punch in at start of shift'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        {/* Rest Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rest Time</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              {todayRecord?.is_on_rest ? (
                <span className="text-amber-600 flex items-center gap-1.5">
                  <Coffee size={18} /> Resting...
                </span>
              ) : todayRecord?.rest_time_minutes ? (
                formatDuration(todayRecord.rest_time_minutes)
              ) : (
                '0 min'
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {todayRecord?.is_on_rest
                ? `Elapsed: ${formatTimer(restSeconds)}`
                : 'Breaks taken during shift'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Coffee size={24} />
          </div>
        </div>

        {/* Absent Time (Rest Over) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Absent Time (Rest Over)</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              {todayRecord?.absent_minutes && todayRecord.absent_minutes > 0 ? (
                <span className="text-red-600">{formatDuration(todayRecord.absent_minutes)}</span>
              ) : (
                '0 min'
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {todayRecord?.absent_minutes && todayRecord.absent_minutes > 0
                ? 'Excess rest taken beyond allowed limit'
                : 'Within allowed rest quota'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>

        {/* Working End / Actual Working */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Working End</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              {todayRecord?.clock_out ? (
                formatTimeAMPM(todayRecord.clock_out)
              ) : todayRecord?.clock_in ? (
                <span className="text-emerald-600 font-bold text-sm">Working...</span>
              ) : (
                '—'
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {todayRecord?.actual_working_minutes
                ? `Actual: ${formatDuration(todayRecord.actual_working_minutes)}`
                : 'In Progress'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
        </div>
      </div>

      {/* Personal Attendance Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">My Attendance History</h2>
            <p className="text-xs text-slate-400">Past working time, rest duration, and overtime logs</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            title="Refresh History"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer bg-white"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
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
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Clock className="mx-auto mb-2 opacity-40" size={28} />
                    <p>No past attendance logs found for your account.</p>
                  </td>
                </tr>
              ) : (
                attendances.map((att) => (
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
