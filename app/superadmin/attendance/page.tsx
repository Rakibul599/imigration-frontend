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
  getEmployeesForFaceTraining,
  deleteEmployeeFaceProfile,
  AttendanceRecord,
  FaceProfileItem,
  AttendanceStats,
  EmployeeSelectOption,
  backgroundTrainingManager,
} from '@/lib/faceApi';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';

export default function SuperAdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<'records' | 'profiles' | 'roster'>('records');
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [profiles, setProfiles] = useState<FaceProfileItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeSelectOption[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, logsData, profilesData, employeesData] = await Promise.all([
        getAttendanceStats(),
        getAttendanceRecords({
          date: selectedDate,
          company_id: selectedCompany === 'all' ? undefined : selectedCompany,
        }),
        getFaceProfiles(),
        getEmployeesForFaceTraining().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setAttendances(logsData || []);
      setProfiles(profilesData || []);
      setEmployees(employeesData || []);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedCompany]);

  useEffect(() => {
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend()
      .then((res) => setCompanies(res))
      .catch(() => {});
  }, []);

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
    if (!confirm(`Are you sure you want to delete biometric profile for ${name} (${employeeCode})?`)) {
      return;
    }

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

  const handleRetrainFace = (profile: FaceProfileItem) => {
    setPrefilledEmployee({
      employee_code: profile.employee_code,
      name: profile.name,
      company_name: profile.company_name,
    });
    setIsEnrollModalOpen(true);
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

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.employee_code.toLowerCase().includes(q) ||
      emp.assigned_companies?.some((c) => c.toLowerCase().includes(q))
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
              Biometric Face Attendance Hub
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 whitespace-nowrap">
              AI CPU Recognition
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Automated contactless attendance verification with 15-pose liveness estimation &amp; MySQL synchronization.
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
              <CheckCircle2 size={12} /> Confirmed on-site
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
              <Clock size={12} /> Active shift in progress
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
              <AlertCircle size={12} /> Past scheduled punch
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Face Profiles</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total_enrolled_faces ?? profiles.length}</p>
            <p className="text-[11px] text-[#0b4da2] font-semibold mt-1 flex items-center gap-1">
              <ShieldCheck size={12} /> Biometrics trained
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
            Daily Attendance Records ({filteredAttendances.length})
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
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'roster'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Staff Directory ({filteredEmployees.length})
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
              <option value="all">All Companies</option>
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
              placeholder="Search employee or code..."
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
                  <th className="py-3 px-4">Method &amp; Confidence</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Camera className="mx-auto mb-2 opacity-40" size={32} />
                      <p>No attendance logs found for this filter.</p>
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

      {/* Main Content Tab 2: Enrolled Face Profiles */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.length === 0 ? (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <ShieldCheck className="mx-auto mb-2 opacity-40 text-purple-600" size={36} />
              <p className="font-semibold text-slate-600">No enrolled face profiles found.</p>
              <p className="text-xs text-slate-400 mt-1">
                Train your staff faces through the 15-pose liveness enrollment wizard.
              </p>
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
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trained Date:</span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {p.trained_at ? new Date(p.trained_at).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleRetrainFace(p)}
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

      {/* Main Content Tab 3: Staff Face Directory */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Staff Biometric Enrollment Status</h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Overview of all registered staff. Directly calibrate or train 15-pose facial recognition models.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPrefilledEmployee(undefined);
                setIsEnrollModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer border-0 shrink-0"
            >
              <Plus size={15} />
              <span>Train Staff Face (15 Poses)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Employee Code</th>
                  <th className="py-3 px-4">Role &amp; Assigned Companies</th>
                  <th className="py-3 px-4 text-center">Face Biometrics Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Users className="mx-auto mb-2 opacity-40 text-slate-400" size={32} />
                      <p className="font-semibold text-slate-600">No staff members found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.employee_code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0b4da2] font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{emp.name}</span>
                            <span className="text-[11px] text-slate-500">{emp.email || 'Staff'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 text-xs">
                        {emp.employee_code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800">{emp.role || 'Employee'}</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-xs">
                            {emp.assigned_companies?.join(', ') || 'No company assigned'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {emp.is_face_enrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            Enrolled ({emp.face_sample_count || 15} Poses)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertCircle size={12} />
                            Not Enrolled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setPrefilledEmployee({
                              employee_code: emp.employee_code,
                              name: emp.name,
                              company_name: emp.assigned_companies?.[0],
                            });
                            setIsEnrollModalOpen(true);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                            emp.is_face_enrolled
                              ? 'bg-blue-50 text-[#0b4da2] hover:bg-blue-100'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          <Plus size={13} />
                          <span>{emp.is_face_enrolled ? 'Retrain Face' : 'Train Face'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
        trainedBy="SuperAdmin"
        onSuccess={() => {
          setNotification({
            type: 'success',
            message: 'Face profile successfully trained and synchronized with MySQL!',
          });
          loadData();
        }}
      />

      {/* Global Background AI Training Status Widget */}
      <BackgroundTrainingBadge />
    </div>
  );
}
