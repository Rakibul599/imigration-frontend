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
} from 'lucide-react';
import FaceEnrollmentModal from '@/components/FaceEnrollmentModal';
import FaceAttendanceModal from '@/components/FaceAttendanceModal';
import BackgroundTrainingBadge from '@/components/BackgroundTrainingBadge';
import {
  getAttendanceRecords,
  getFaceProfiles,
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

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

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

          {/* Quick Clock-In Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(true)}
              disabled={!isEnrolled}
              className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all cursor-pointer border-0 ${
                isEnrolled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-600/30 hover:scale-[1.02]'
                  : 'bg-white/20 text-white/60 cursor-not-allowed'
              }`}
            >
              <Camera size={20} />
              <span>Scan Face to Clock In / Out</span>
            </button>
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

      {/* Today's Punch Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Clock In */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clock In Time</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              {todayRecord?.clock_in ? todayRecord.clock_in : 'Not punched yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {todayRecord?.clock_in ? `Status: ${todayRecord.status}` : 'Punch in at start of shift'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        {/* Today's Clock Out */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clock Out Time</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              {todayRecord?.clock_out ? todayRecord.clock_out : todayRecord?.clock_in ? 'In Shift' : '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {todayRecord?.clock_out ? 'Shift completed' : 'Punch out when leaving'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap size={24} />
          </div>
        </div>

        {/* Match Verification Method */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Biometric Method</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              {todayRecord ? `${todayRecord.verification_method}` : 'CPU HOG AI'}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              {todayRecord?.confidence_score ? `Confidence: ${todayRecord.confidence_score}%` : 'Euclidean 128-d'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
        </div>
      </div>

      {/* Personal Attendance Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">My Attendance History</h2>
            <p className="text-xs text-slate-400">Past logs recorded via biometric facial scan</p>
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
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification Method</th>
                <th className="py-3 px-4">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
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
                          {att.clock_in}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {att.clock_out ? (
                        <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          {att.clock_out}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">In Shift</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          att.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : att.status === 'late'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {att.verification_method}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {att.confidence_score ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {att.confidence_score}%
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

      {/* Face Attendance Scanner Modal */}
      <FaceAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          loadData();
        }}
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
