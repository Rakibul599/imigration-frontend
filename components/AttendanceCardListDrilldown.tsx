'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  UserX,
  UserCheck,
  UserMinus,
  Clock,
  Zap,
  Coffee,
  CheckCircle2,
  ChevronLeft,
  Search,
  Building2,
  Calendar,
  AlertCircle,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStats,
  FaceProfileItem,
  EmployeeSelectOption,
  getAttendanceRecords,
  getAttendanceStats,
  getFaceProfiles,
  getEmployeesForFaceTraining,
  formatTimeAMPM,
  formatDuration,
} from '@/lib/faceApi';
import { Company } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import { getMasterAdminUser } from '@/lib/auth';
import FaceEnrollmentModal from '@/components/FaceEnrollmentModal';

export type AttendanceListType =
  | 'total_employees'
  | 'face_trained'
  | 'untrained_face'
  | 'present_today'
  | 'absent_today'
  | 'late_today'
  | 'clock_in_now'
  | 'rest_time_now'
  | 'checkout_now';

interface AttendanceCardListDrilldownProps {
  portalType: 'superadmin' | 'masteradmin';
}

interface DrilldownItem {
  id: string;
  employee_code: string;
  name: string;
  role: string;
  company: string;
  is_face_enrolled: boolean;
  sample_count: number;
  date?: string;
  clock_in?: string | null;
  clock_out?: string | null;
  status: string;
  is_on_rest?: boolean;
  rest_time_minutes?: number;
  actual_working_minutes?: number;
}

const TYPE_CONFIG: Record<
  AttendanceListType,
  {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  total_employees: {
    title: 'Total Employee',
    description: 'Complete roster of active staff registered in the organization.',
    icon: <Users size={20} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  face_trained: {
    title: 'Total Face Train Employee',
    description: 'Staff members with 15-pose facial recognition biometrics enrolled.',
    icon: <ShieldCheck size={20} />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  untrained_face: {
    title: 'Total Untrain Employee',
    description: 'Staff members needing 15-pose face calibration for contactless punch.',
    icon: <UserX size={20} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  present_today: {
    title: 'Total Present Today',
    description: 'Staff members who punched in attendance today.',
    icon: <UserCheck size={20} />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  absent_today: {
    title: 'Total Absent Today',
    description: 'Active staff members who have not clocked in for today.',
    icon: <UserMinus size={20} />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  late_today: {
    title: 'Total Late Present Today',
    description: 'Staff who arrived after scheduled start time plus grace period.',
    icon: <Clock size={20} />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  clock_in_now: {
    title: 'Total Clock In Now',
    description: 'Staff currently on active duty right now (clocked in and not on break).',
    icon: <Zap size={20} />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  rest_time_now: {
    title: 'Total Rest Time Now',
    description: 'Staff currently taking rest or break time.',
    icon: <Coffee size={20} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  checkout_now: {
    title: 'Total Checkout Now',
    description: 'Staff members who have completed shift and clocked out today.',
    icon: <CheckCircle2 size={20} />,
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
};

const ALL_TYPES: AttendanceListType[] = [
  'total_employees',
  'face_trained',
  'untrained_face',
  'present_today',
  'absent_today',
  'late_today',
  'clock_in_now',
  'rest_time_now',
  'checkout_now',
];

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

export default function AttendanceCardListDrilldown({
  portalType,
}: AttendanceCardListDrilldownProps) {
  const searchParams = useSearchParams();
  const paramType = searchParams.get('type') as AttendanceListType | null;

  const [activeType, setActiveType] = useState<AttendanceListType>(
    paramType && ALL_TYPES.includes(paramType) ? paramType : 'total_employees'
  );
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [datePreset, setDatePreset] = useState<DatePresetType>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const handleApplyPreset = (preset: 'today' | 'this_week' | 'this_month' | 'this_year') => {
    setDatePreset(preset);
    const range = calculatePresetDateRange(preset);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const [employees, setEmployees] = useState<EmployeeSelectOption[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [profiles, setProfiles] = useState<FaceProfileItem[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Enrollment modal trigger
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<
    | {
        employee_code: string;
        name: string;
        company_name?: string;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    if (paramType && ALL_TYPES.includes(paramType)) {
      setActiveType(paramType);
    }
  }, [paramType]);

  // Load companies
  useEffect(() => {
    if (portalType === 'masteradmin') {
      const user = getMasterAdminUser();
      const assigned: string[] = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
      const allCompanies = getStoredCompanies();
      const permitted = allCompanies.filter((c) =>
        assigned.some((id: string) => id.toLowerCase() === c.id.toLowerCase())
      );
      setCompanies(permitted);
      fetchCompaniesFromBackend()
        .then((res) => {
          const p = res.filter((c) =>
            assigned.some((id: string) => id.toLowerCase() === c.id.toLowerCase())
          );
          setCompanies(p);
        })
        .catch(() => {});
    } else {
      setCompanies(getStoredCompanies());
      fetchCompaniesFromBackend().then((res) => setCompanies(res)).catch(() => {});
    }
  }, [portalType]);

  // Load data
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

      let finalLogs = logsData || [];
      let finalProfiles = profilesData || [];
      let finalEmployees = employeesData || [];

      if (portalType === 'masteradmin') {
        const user = getMasterAdminUser();
        const scope: string[] = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
        finalLogs = finalLogs.filter((att) => {
          if (!att.company_id) return true;
          return scope.some((id: string) => id.toLowerCase() === att.company_id?.toLowerCase());
        });
        finalProfiles = finalProfiles.filter((p) => {
          if (!p.company_id) return true;
          return scope.some((id: string) => id.toLowerCase() === p.company_id?.toLowerCase());
        });
        finalEmployees = finalEmployees.filter((emp) => {
          const comps = emp.assigned_companies || [];
          if (comps.length === 0) return true;
          return comps.some((c) => scope.some((s: string) => s.toLowerCase() === c.toLowerCase()));
        });
      }

      if (statsData) setStats(statsData);
      setAttendances(finalLogs);
      setProfiles(finalProfiles);
      setEmployees(finalEmployees);
    } catch (err) {
      console.error('Failed to load drilldown attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedCompany, portalType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Metric counts for each pill
  const metricCounts = useMemo(() => {
    const totalEmployees = employees.length || stats?.total_employees || 0;
    const faceTrained = employees.filter((e) => e.is_face_enrolled).length || profiles.length || 0;
    const untrainedFace = Math.max(0, totalEmployees - faceTrained);
    const presentToday = attendances.filter((a) => Boolean(a.clock_in)).length || stats?.today_present || 0;
    const absentToday = Math.max(0, totalEmployees - presentToday);
    const lateToday = attendances.filter((a) => a.status === 'Late' || a.status === 'late').length || stats?.today_late || 0;
    const clockInNow = attendances.filter((a) => a.clock_in && !a.clock_out && !a.is_on_rest).length;
    const restTimeNow = attendances.filter((a) => a.is_on_rest || (a.rest_start && !a.rest_end && !a.clock_out)).length;
    const checkoutNow = attendances.filter((a) => Boolean(a.clock_out)).length || stats?.today_clocked_out || 0;

    return {
      total_employees: totalEmployees,
      face_trained: faceTrained,
      untrained_face: untrainedFace,
      present_today: presentToday,
      absent_today: absentToday,
      late_today: lateToday,
      clock_in_now: clockInNow,
      rest_time_now: restTimeNow,
      checkout_now: checkoutNow,
    };
  }, [employees, attendances, profiles, stats]);

  // Display items for current type
  const displayItems = useMemo<DrilldownItem[]>(() => {
    const q = searchQuery.toLowerCase().trim();

    // 1. Total Employees
    if (activeType === 'total_employees') {
      return employees
        .filter((emp) => {
          if (!q) return true;
          return (
            emp.name.toLowerCase().includes(q) ||
            emp.employee_code.toLowerCase().includes(q) ||
            (emp.assigned_companies || []).some((c) => c.toLowerCase().includes(q))
          );
        })
        .map((emp) => {
          const att = attendances.find((a) => a.employee_code === emp.employee_code);
          return {
            id: String(emp.id),
            employee_code: emp.employee_code,
            name: emp.name,
            role: emp.role || 'Employee',
            company: emp.assigned_companies?.[0] || 'Assigned Company',
            is_face_enrolled: emp.is_face_enrolled,
            sample_count: emp.face_sample_count || (emp.is_face_enrolled ? 15 : 0),
            date: att?.date ? String(att.date).slice(0, 10) : undefined,
            clock_in: att?.clock_in,
            clock_out: att?.clock_out,
            status: att?.status || (att?.clock_in ? 'Present' : 'Not Clocked In'),
            is_on_rest: att?.is_on_rest,
            rest_time_minutes: att?.rest_time_minutes,
          };
        });
    }

    // 2. Face Trained
    if (activeType === 'face_trained') {
      return employees
        .filter((emp) => emp.is_face_enrolled)
        .filter((emp) => {
          if (!q) return true;
          return (
            emp.name.toLowerCase().includes(q) ||
            emp.employee_code.toLowerCase().includes(q) ||
            (emp.assigned_companies || []).some((c) => c.toLowerCase().includes(q))
          );
        })
        .map((emp) => {
          const att = attendances.find((a) => a.employee_code === emp.employee_code);
          return {
            id: String(emp.id),
            employee_code: emp.employee_code,
            name: emp.name,
            role: emp.role || 'Employee',
            company: emp.assigned_companies?.[0] || 'Assigned Company',
            is_face_enrolled: true,
            sample_count: emp.face_sample_count || 15,
            date: att?.date ? String(att.date).slice(0, 10) : undefined,
            clock_in: att?.clock_in,
            clock_out: att?.clock_out,
            status: att?.status || (att?.clock_in ? 'Present' : 'Not Clocked In'),
            is_on_rest: att?.is_on_rest,
            rest_time_minutes: att?.rest_time_minutes,
          };
        });
    }

    // 3. Untrained Face
    if (activeType === 'untrained_face') {
      return employees
        .filter((emp) => !emp.is_face_enrolled)
        .filter((emp) => {
          if (!q) return true;
          return (
            emp.name.toLowerCase().includes(q) ||
            emp.employee_code.toLowerCase().includes(q) ||
            (emp.assigned_companies || []).some((c) => c.toLowerCase().includes(q))
          );
        })
        .map((emp) => {
          const att = attendances.find((a) => a.employee_code === emp.employee_code);
          return {
            id: String(emp.id),
            employee_code: emp.employee_code,
            name: emp.name,
            role: emp.role || 'Employee',
            company: emp.assigned_companies?.[0] || 'Assigned Company',
            is_face_enrolled: false,
            sample_count: 0,
            date: att?.date ? String(att.date).slice(0, 10) : undefined,
            clock_in: att?.clock_in,
            clock_out: att?.clock_out,
            status: att?.status || (att?.clock_in ? 'Present' : 'Not Clocked In'),
            is_on_rest: att?.is_on_rest,
            rest_time_minutes: att?.rest_time_minutes,
          };
        });
    }

    // 4. Present Today
    if (activeType === 'present_today') {
      return attendances
        .filter((att) => Boolean(att.clock_in))
        .filter((att) => {
          if (!q) return true;
          return (
            att.name.toLowerCase().includes(q) ||
            att.employee_code.toLowerCase().includes(q) ||
            (att.company_name || '').toLowerCase().includes(q)
          );
        })
        .map((att) => {
          const emp = employees.find((e) => e.employee_code === att.employee_code);
          return {
            id: String(att.id),
            employee_code: att.employee_code,
            name: att.name,
            role: att.role || emp?.role || 'Employee',
            company: att.company_name || emp?.assigned_companies?.[0] || 'Assigned Company',
            is_face_enrolled: emp?.is_face_enrolled ?? true,
            sample_count: emp?.face_sample_count || 15,
            date: att.date ? String(att.date).slice(0, 10) : undefined,
            clock_in: att.clock_in,
            clock_out: att.clock_out,
            status: att.status || 'Present',
            is_on_rest: att.is_on_rest,
            rest_time_minutes: att.rest_time_minutes,
            actual_working_minutes: att.actual_working_minutes,
          };
        });
    }

    // 5. Absent Today
    if (activeType === 'absent_today') {
      return employees
        .filter((emp) => {
          const hasClockIn = attendances.some(
            (a) => a.employee_code === emp.employee_code && Boolean(a.clock_in)
          );
          return !hasClockIn;
        })
        .filter((emp) => {
          if (!q) return true;
          return (
            emp.name.toLowerCase().includes(q) ||
            emp.employee_code.toLowerCase().includes(q) ||
            (emp.assigned_companies || []).some((c) => c.toLowerCase().includes(q))
          );
        })
        .map((emp) => ({
          id: String(emp.id),
          employee_code: emp.employee_code,
          name: emp.name,
          role: emp.role || 'Employee',
          company: emp.assigned_companies?.[0] || 'Assigned Company',
          is_face_enrolled: emp.is_face_enrolled,
          sample_count: emp.face_sample_count || 0,
          date: undefined,
          clock_in: null,
          clock_out: null,
          status: 'Absent',
          is_on_rest: false,
          rest_time_minutes: 0,
        }));
    }

    // 6. Late Today
    if (activeType === 'late_today') {
      return attendances
        .filter((att) => att.status === 'Late' || att.status === 'late')
        .filter((att) => {
          if (!q) return true;
          return (
            att.name.toLowerCase().includes(q) ||
            att.employee_code.toLowerCase().includes(q) ||
            (att.company_name || '').toLowerCase().includes(q)
          );
        })
        .map((att) => {
          const emp = employees.find((e) => e.employee_code === att.employee_code);
          return {
            id: String(att.id),
            employee_code: att.employee_code,
            name: att.name,
            role: att.role || emp?.role || 'Employee',
            company: att.company_name || emp?.assigned_companies?.[0] || 'Assigned Company',
            is_face_enrolled: emp?.is_face_enrolled ?? true,
            sample_count: emp?.face_sample_count || 15,
            date: att.date ? String(att.date).slice(0, 10) : undefined,
            clock_in: att.clock_in,
            clock_out: att.clock_out,
            status: 'Late',
            is_on_rest: att.is_on_rest,
            rest_time_minutes: att.rest_time_minutes,
            actual_working_minutes: att.actual_working_minutes,
          };
        });
    }

    // 7. Clock In Now
    if (activeType === 'clock_in_now') {
      return attendances
        .filter((att) => att.clock_in && !att.clock_out && !att.is_on_rest)
        .filter((att) => {
          if (!q) return true;
          return (
            att.name.toLowerCase().includes(q) ||
            att.employee_code.toLowerCase().includes(q) ||
            (att.company_name || '').toLowerCase().includes(q)
          );
        })
        .map((att) => {
          const emp = employees.find((e) => e.employee_code === att.employee_code);
          return {
            id: String(att.id),
            employee_code: att.employee_code,
            name: att.name,
            role: att.role || emp?.role || 'Employee',
            company: att.company_name || emp?.assigned_companies?.[0] || 'Assigned Company',
            is_face_enrolled: emp?.is_face_enrolled ?? true,
            sample_count: emp?.face_sample_count || 15,
            date: att.date ? String(att.date).slice(0, 10) : undefined,
            clock_in: att.clock_in,
            clock_out: null,
            status: 'Working Now',
            is_on_rest: false,
            rest_time_minutes: att.rest_time_minutes,
          };
        });
    }

    // 8. Rest Time Now
    if (activeType === 'rest_time_now') {
      return attendances
        .filter((att) => att.is_on_rest || (att.rest_start && !att.rest_end && !att.clock_out))
        .filter((att) => {
          if (!q) return true;
          return (
            att.name.toLowerCase().includes(q) ||
            att.employee_code.toLowerCase().includes(q) ||
            (att.company_name || '').toLowerCase().includes(q)
          );
        })
        .map((att) => {
          const emp = employees.find((e) => e.employee_code === att.employee_code);
          return {
            id: String(att.id),
            employee_code: att.employee_code,
            name: att.name,
            role: att.role || emp?.role || 'Employee',
            company: att.company_name || emp?.assigned_companies?.[0] || 'Assigned Company',
            is_face_enrolled: emp?.is_face_enrolled ?? true,
            sample_count: emp?.face_sample_count || 15,
            date: att.date ? String(att.date).slice(0, 10) : undefined,
            clock_in: att.clock_in,
            clock_out: null,
            status: 'On Rest',
            is_on_rest: true,
            rest_time_minutes: att.rest_time_minutes,
          };
        });
    }

    // 9. Checkout Now
    if (activeType === 'checkout_now') {
      return attendances
        .filter((att) => Boolean(att.clock_out))
        .filter((att) => {
          if (!q) return true;
          return (
            att.name.toLowerCase().includes(q) ||
            att.employee_code.toLowerCase().includes(q) ||
            (att.company_name || '').toLowerCase().includes(q)
          );
        })
        .map((att) => {
          const emp = employees.find((e) => e.employee_code === att.employee_code);
          return {
            id: String(att.id),
            employee_code: att.employee_code,
            name: att.name,
            role: att.role || emp?.role || 'Employee',
            company: att.company_name || emp?.assigned_companies?.[0] || 'Assigned Company',
            is_face_enrolled: emp?.is_face_enrolled ?? true,
            sample_count: emp?.face_sample_count || 15,
            date: att.date ? String(att.date).slice(0, 10) : undefined,
            clock_in: att.clock_in,
            clock_out: att.clock_out,
            status: 'Checked Out',
            is_on_rest: false,
            rest_time_minutes: att.rest_time_minutes,
            actual_working_minutes: att.actual_working_minutes,
          };
        });
    }

    return [];
  }, [activeType, employees, attendances, searchQuery]);

  const currentConfig = TYPE_CONFIG[activeType];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/${portalType}/attendance`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0b4da2] bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors no-underline"
          >
            <ChevronLeft size={16} />
            <span>Back to Attendance</span>
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 m-0">
                {currentConfig.title}
              </h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${currentConfig.bgColor} ${currentConfig.color} border ${currentConfig.borderColor}`}>
                {displayItems.length} Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0 mt-0.5 max-w-xl">
              {currentConfig.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border-0"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 9 Quick Category Switcher Tabs */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {ALL_TYPES.map((typeKey) => {
            const cfg = TYPE_CONFIG[typeKey];
            const isActive = activeType === typeKey;
            const count = metricCounts[typeKey] ?? 0;

            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setActiveType(typeKey)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{cfg.title}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Top Row: Search & Company Filter & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID (#EMP), or company..."
              className="w-full h-9 bg-slate-50 border border-slate-200 focus:border-[#0b4da2] rounded-xl pl-8.5 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            <div className="h-9 px-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl text-xs shrink-0 focus-within:border-[#0b4da2] transition-colors">
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-transparent border-0 text-slate-700 text-xs focus:outline-hidden font-semibold cursor-pointer max-w-[130px] sm:max-w-[170px] truncate"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

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

          {/* Custom Date Range Picker */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar size={14} className="text-slate-500 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent border-0 text-slate-800 font-semibold focus:outline-hidden text-xs cursor-pointer"
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
              className="bg-transparent border-0 text-slate-800 font-semibold focus:outline-hidden text-xs cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Company &amp; Role</th>
                {startDate !== endDate && <th className="py-3 px-4">Date</th>}
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Rest Time</th>
                <th className="py-3 px-4">Checkout</th>
                <th className="py-3 px-4">Face Biometrics</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={startDate !== endDate ? 10 : 9} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto text-[#0b4da2] mb-2" />
                    <span>Loading staff records...</span>
                  </td>
                </tr>
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan={startDate !== endDate ? 10 : 9} className="py-12 text-center text-slate-400">
                    <AlertCircle size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No staff found for this category</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try choosing a different date range or search query</p>
                  </td>
                </tr>
              ) : (
                displayItems.map((item, index) => (
                  <tr key={item.employee_code || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {index + 1}
                    </td>

                    {/* Staff Member */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] font-bold text-xs flex items-center justify-center shrink-0">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 m-0 truncate">{item.name}</p>
                          <p className="font-mono text-[10px] text-slate-500 m-0">{item.employee_code}</p>
                        </div>
                      </div>
                    </td>

                    {/* Company & Role */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 m-0 truncate max-w-[170px]">{item.company}</p>
                      <p className="text-[11px] text-slate-400 m-0">{item.role}</p>
                    </td>

                    {/* Optional Date if Range */}
                    {startDate !== endDate && (
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {item.date || '—'}
                      </td>
                    )}

                    {/* 1. Clock In */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.clock_in ? (
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {formatTimeAMPM(item.clock_in)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* 2. Rest Time (Placed in between Clock In and Checkout) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.is_on_rest ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          <Coffee size={11} className="text-amber-700" />
                          <span>Resting...</span>
                        </span>
                      ) : (item.rest_time_minutes ?? 0) > 0 ? (
                        <span className="font-mono font-semibold text-slate-800 bg-amber-50/70 px-2 py-0.5 rounded border border-amber-200/80">
                          {formatDuration(item.rest_time_minutes)}
                        </span>
                      ) : (
                        <span className="text-slate-400">0 min</span>
                      )}
                    </td>

                    {/* 3. Checkout (Clock Out) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.clock_out ? (
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {formatTimeAMPM(item.clock_out)}
                        </span>
                      ) : item.clock_in ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                          <span>Working...</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Face Biometrics */}
                    <td className="py-3.5 px-4">
                      {item.is_face_enrolled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 size={11} />
                          <span>Enrolled ({item.sample_count}/15)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <AlertCircle size={11} />
                          <span>Needs Training</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          item.status === 'Present' || item.status === 'Working Now'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'Late'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.status === 'On Rest'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : item.status === 'Checked Out'
                            ? 'bg-blue-50 text-[#0b4da2] border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {!item.is_face_enrolled ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetEmployee({
                              employee_code: item.employee_code,
                              name: item.name,
                              company_name: item.company,
                            });
                            setIsEnrollModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs transition cursor-pointer border-0 whitespace-nowrap"
                        >
                          <Plus size={12} />
                          <span>Train Face</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetEmployee({
                              employee_code: item.employee_code,
                              name: item.name,
                              company_name: item.company,
                            });
                            setIsEnrollModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer border-0 whitespace-nowrap"
                        >
                          <RefreshCw size={11} />
                          <span>Retrain</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Face Enrollment Modal */}
      <FaceEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          loadData();
        }}
        targetEmployee={targetEmployee}
        trainedBy={portalType === 'superadmin' ? 'SuperAdmin' : 'MasterAdmin'}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
