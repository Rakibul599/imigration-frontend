'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import FaceEnrollmentModal from '@/components/FaceEnrollmentModal';
import FaceAttendanceModal from '@/components/FaceAttendanceModal';
import BackgroundTrainingBadge from '@/components/BackgroundTrainingBadge';
import {
  getAttendanceRecords,
  getAttendanceStats,
  getFaceProfiles,
  deleteEmployeeFaceProfile,
  AttendanceRecord,
  FaceProfileItem,
  AttendanceStats,
  backgroundTrainingManager,
} from '@/lib/faceApi';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import { getMasterAdminUser } from '@/lib/auth';

export default function MasterAdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<'records' | 'profiles'>('records');
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [profiles, setProfiles] = useState<FaceProfileItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignedCompanyIds, setAssignedCompanyIds] = useState<string[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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
      const [statsData, logsData, profilesData] = await Promise.all([
        getAttendanceStats(),
        getAttendanceRecords({
          date: selectedDate,
          company_id: selectedCompany === 'all' ? undefined : selectedCompany,
        }),
        getFaceProfiles(),
      ]);

      // Filter logs and profiles to master admin's assigned scope if company matches
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

      if (statsData) {
        setStats({
          ...statsData,
          today_present: scopedLogs.filter((l: AttendanceRecord) => l.status === 'present').length,
          today_late: scopedLogs.filter((l: AttendanceRecord) => l.status === 'late').length,
          today_clocked_in: scopedLogs.filter((l: AttendanceRecord) => l.clock_in && !l.clock_out).length,
          total_enrolled_faces: scopedProfiles.length,
        });
      }

      setAttendances(scopedLogs);
      setProfiles(scopedProfiles);
    } catch (err) {
      console.error('Failed to load master admin attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedCompany]);

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

      {/* Four KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Present Today</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats?.today_present ?? 0}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Staff on shift
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clocked In Now</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats?.today_clocked_in ?? 0}</p>
            <p className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
              <Clock size={12} /> Live presence
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Zap size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Late Arrivals</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats?.today_late ?? 0}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> Flagged punches
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trained Biometrics</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total_enrolled_faces ?? profiles.length}</p>
            <p className="text-[11px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
              <ShieldCheck size={12} /> In company scope
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
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
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'profiles'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Enrolled Profiles ({filteredProfiles.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'records' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 text-slate-700 text-xs focus:outline-hidden"
              />
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Building2 size={14} className="text-slate-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent border-0 text-slate-700 text-xs focus:outline-hidden"
            >
              <option value="all">All Permitted Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Refresh Data"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer bg-white"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content Tab 1: Records Table */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Clock In</th>
                  <th className="py-3 px-4">Clock Out</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
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
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] font-bold flex items-center justify-center shrink-0">
                            {att.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{att.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {att.employee_code} • {att.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {att.company_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{att.date}</td>
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
                          <span className="text-slate-400 italic">Active (In shift)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {att.verification_method}
                          </span>
                          {att.confidence_score !== undefined && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {att.confidence_score}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
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
