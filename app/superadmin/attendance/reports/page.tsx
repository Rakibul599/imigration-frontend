'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Coins,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Hourglass,
  Layers,
  MapPin,
  Maximize2,
  Phone,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { AttendanceRecord, getAttendanceRecords, formatTimeAMPM } from '@/lib/faceApi';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import {
  PageStatCardConfig,
  getStoredPageCards,
  saveStoredPageCards,
  resetStoredPageCards,
} from '@/lib/pageCardStorage';
import CardPriorityModal from '@/components/CardPriorityModal';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import { getEmployeeLeaves, EmployeeLeaveItem } from '@/lib/employeeRequestsApi';
import { fetchAttendanceSettings, AttendanceSchedule } from '@/lib/attendanceSettingsStorage';

// Report Tabs definition with new dedicated Rest Time Report
type ReportTab = 'daily' | 'rest_time' | 'monthly' | 'punctuality' | 'overtime' | 'individual' | 'leaves';

const REPORT_TABS = [
  { id: 'daily' as ReportTab, label: 'Daily Attendance Log', icon: CalendarDays, description: 'Day-by-day employee clock-in, rest & clock-out punches' },
  { id: 'monthly' as ReportTab, label: 'Monthly Summary Matrix', icon: BarChart3, description: 'Aggregate monthly attendance rate, total working days & absences' },
  { id: 'punctuality' as ReportTab, label: 'Late & Early Exits', icon: Clock, description: 'Grace period exceptions, late arrivals and early departures audit' },
  { id: 'rest_time' as ReportTab, label: 'Rest Time Report', icon: Coffee, description: 'Break duration, rest intervals, allowed limits & absent time (rest over)' },
  { id: 'overtime' as ReportTab, label: 'Over Time Report', icon: Hourglass, description: 'Tracking extra hours worked beyond the standard general schedule' },
  { id: 'individual' as ReportTab, label: 'Individual Worker Drilldown', icon: User, description: 'Single employee historical attendance breakdown & punch timeline' },
  { id: 'leaves' as ReportTab, label: 'Leaves & Absence Audit', icon: CalendarCheck, description: 'Approved leaves, unexcused absences and yearly annual leave usage' },
];

const DEFAULT_REPORT_CARDS: PageStatCardConfig[] = [
  { id: 'total_records', title: 'Total Punches', subtitle: 'Punches recorded in period', icon: 'Clock', order_num: 1 },
  { id: 'punctuality_rate', title: 'On-Time Punctuality', subtitle: 'Punches within grace period', icon: 'UserCheck', order_num: 2 },
  { id: 'total_rest_time', title: 'Total Rest Time', subtitle: 'Combined break duration taken', icon: 'Clock', order_num: 3 },
  { id: 'total_overtime', title: 'Total Over Time', subtitle: 'Calculated extra hours', icon: 'Hourglass', order_num: 4 },
];

function AttendanceReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active Tab
  const initialTab = (searchParams.get('tab') as ReportTab) || 'daily';
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab);

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leaves, setLeaves] = useState<EmployeeLeaveItem[]>([]);
  const [scheduleRules, setScheduleRules] = useState<AttendanceSchedule | null>(null);

  // Filters State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dateFilterType, setDateFilterType] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Month selector for monthly matrix
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Filter dropdowns
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRestStatus, setSelectedRestStatus] = useState<string>('all');
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Manage Cards Modal
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cards, setCards] = useState<PageStatCardConfig[]>(DEFAULT_REPORT_CARDS);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Load cards customization
  useEffect(() => {
    setCards(getStoredPageCards('attendance_reports', DEFAULT_REPORT_CARDS));
    const handleCardsUpdate = (e: any) => {
      setCards(e.detail || getStoredPageCards('attendance_reports', DEFAULT_REPORT_CARDS));
    };
    window.addEventListener('superadmin_cards_update_attendance_reports', handleCardsUpdate);
    return () => window.removeEventListener('superadmin_cards_update_attendance_reports', handleCardsUpdate);
  }, []);

  const handleSaveCards = (updated: PageStatCardConfig[]) => {
    const saved = saveStoredPageCards('attendance_reports', updated);
    setCards(saved);
    showToast('success', 'Cards layout updated successfully.');
  };

  const handleResetCards = () => {
    const reset = resetStoredPageCards('attendance_reports', DEFAULT_REPORT_CARDS);
    setCards(reset);
    showToast('info', 'Cards reset to default layout.');
  };

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper formatting minutes to "Xh Ym" or "X min"
  const formatDuration = (mins?: number) => {
    if (!mins || mins <= 0) return '0 min';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h}h ${m}m`;
  };

  // Primary Data Loading
  const loadReportData = async () => {
    setLoading(true);
    try {
      const qParams: any = { limit: 1500 };

      if (activeTab === 'daily') {
        if (dateFilterType === 'single') {
          qParams.date = selectedDate;
        } else {
          qParams.start_date = startDate;
          qParams.end_date = endDate;
        }
      } else if (activeTab === 'monthly') {
        const monthPad = String(selectedMonth).padStart(2, '0');
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        qParams.start_date = `${selectedYear}-${monthPad}-01`;
        qParams.end_date = `${selectedYear}-${monthPad}-${String(daysInMonth).padStart(2, '0')}`;
      } else if (activeTab === 'individual') {
        if (selectedEmployeeCode !== 'all') {
          qParams.employee_code = selectedEmployeeCode;
        }
        qParams.start_date = startDate;
        qParams.end_date = endDate;
      } else {
        // rest_time, punctuality, overtime, leaves
        qParams.start_date = startDate;
        qParams.end_date = endDate;
      }

      if (selectedCompanyId !== 'all') {
        qParams.company_id = selectedCompanyId;
      }

      const [attList, compList, leavesRes, schedRes] = await Promise.all([
        getAttendanceRecords(qParams),
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
        getEmployeeLeaves({
          start_date: qParams.start_date || selectedDate,
          end_date: qParams.end_date || selectedDate,
        }),
        fetchAttendanceSettings().catch(() => null),
      ]);

      setAttendances(attList || []);
      setCompanies(compList || []);
      setLeaves(leavesRes?.leaves || []);
      if (schedRes?.schedule) {
        setScheduleRules(schedRes.schedule);
      }
    } catch (err) {
      console.error('Failed to load attendance report data:', err);
      showToast('error', 'Failed to retrieve attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [
    activeTab,
    dateFilterType,
    selectedDate,
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
    selectedCompanyId,
  ]);

  // Unique employee codes & names for selection
  const employeeOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; role: string; company: string }>();
    attendances.forEach((a) => {
      if (a.employee_code && !map.has(a.employee_code)) {
        map.set(a.employee_code, {
          code: a.employee_code,
          name: a.name || 'Unnamed Staff',
          role: a.role || 'Staff',
          company: a.company_name || a.company_id || 'Company',
        });
      }
    });
    return Array.from(map.values());
  }, [attendances]);

  // Filtered records for Daily, Punctuality & Overtime
  const filteredRecords = useMemo(() => {
    return attendances.filter((att) => {
      if (selectedRole !== 'all' && att.role?.toLowerCase() !== selectedRole.toLowerCase()) {
        return false;
      }
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'present' && att.status?.toLowerCase() !== 'present') return false;
        if (selectedStatus === 'late' && att.status?.toLowerCase() !== 'late') return false;
        if (selectedStatus === 'on_rest' && !att.is_on_rest) return false;
        if (selectedStatus === 'half_day' && att.status?.toLowerCase() !== 'half day') return false;
      }
      if (selectedEmployeeCode !== 'all' && att.employee_code !== selectedEmployeeCode) {
        return false;
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchesName = att.name?.toLowerCase().includes(s);
        const matchesCode = att.employee_code?.toLowerCase().includes(s);
        const matchesComp = att.company_name?.toLowerCase().includes(s);
        if (!matchesName && !matchesCode && !matchesComp) return false;
      }
      return true;
    });
  }, [attendances, selectedRole, selectedStatus, selectedEmployeeCode, searchTerm]);

  // Filtered Rest Time Records
  const restTimeRecords = useMemo(() => {
    return filteredRecords.filter((att) => {
      const hasRestActivity = Boolean(
        att.is_on_rest ||
        (att.rest_time_minutes && att.rest_time_minutes > 0) ||
        (att.absent_minutes && att.absent_minutes > 0) ||
        att.rest_start
      );

      if (!hasRestActivity) return false;

      if (selectedRestStatus === 'resting' && !att.is_on_rest) return false;
      if (selectedRestStatus === 'over_break' && !(att.absent_minutes && att.absent_minutes > 0)) return false;
      if (selectedRestStatus === 'normal' && (att.absent_minutes && att.absent_minutes > 0)) return false;

      return true;
    });
  }, [filteredRecords, selectedRestStatus]);

  // Monthly Matrix Summary
  const monthlySummary = useMemo(() => {
    const employeeMap = new Map<
      string,
      {
        employee_code: string;
        name: string;
        role: string;
        company: string;
        total_days: number;
        present_count: number;
        late_count: number;
        half_day_count: number;
        total_working_minutes: number;
        total_overtime_minutes: number;
        total_rest_minutes: number;
        total_absent_minutes: number;
      }
    >();

    filteredRecords.forEach((att) => {
      const key = att.employee_code || att.name;
      const current = employeeMap.get(key) || {
        employee_code: att.employee_code || 'EMP',
        name: att.name || 'Staff Member',
        role: att.role || 'Employee',
        company: att.company_name || 'General',
        total_days: 0,
        present_count: 0,
        late_count: 0,
        half_day_count: 0,
        total_working_minutes: 0,
        total_overtime_minutes: 0,
        total_rest_minutes: 0,
        total_absent_minutes: 0,
      };

      current.total_days += 1;
      const st = att.status?.toLowerCase();
      if (st === 'present') current.present_count += 1;
      if (st === 'late') current.late_count += 1;
      if (st === 'half day') current.half_day_count += 1;

      current.total_working_minutes += Number(att.actual_working_minutes || 0);
      current.total_overtime_minutes += Number(att.overtime_minutes || 0);
      current.total_rest_minutes += Number(att.rest_time_minutes || 0);
      current.total_absent_minutes += Number(att.absent_minutes || 0);

      employeeMap.set(key, current);
    });

    return Array.from(employeeMap.values());
  }, [filteredRecords]);

  // Punctuality & Late Arrival Records
  const punctualityRecords = useMemo(() => {
    return filteredRecords.filter((att) => {
      const isLateStatus = att.status?.toLowerCase() === 'late';
      const hasClockIn = Boolean(att.clock_in);
      return isLateStatus || (hasClockIn && (att.absent_minutes || 0) > 0);
    });
  }, [filteredRecords]);

  // Overtime Records
  const overtimeRecords = useMemo(() => {
    return filteredRecords.filter((att) => Number(att.overtime_minutes || 0) > 0);
  }, [filteredRecords]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const totalPunches = filteredRecords.length;
    const lateCount = filteredRecords.filter((r) => r.status?.toLowerCase() === 'late').length;
    const punctualityRate = totalPunches > 0 ? Math.round(((totalPunches - lateCount) / totalPunches) * 100) : 100;
    const totalRestMins = filteredRecords.reduce((acc, r) => acc + Number(r.rest_time_minutes || 0), 0);
    const totalRestHours = (totalRestMins / 60).toFixed(1);
    const totalOvertimeMins = filteredRecords.reduce((acc, r) => acc + Number(r.overtime_minutes || 0), 0);
    const totalOvertimeHours = (totalOvertimeMins / 60).toFixed(1);

    return { totalPunches, punctualityRate, lateCount, totalRestHours, totalOvertimeHours };
  }, [filteredRecords]);

  const getMetricValue = (cardId: string) => {
    switch (cardId) {
      case 'total_records':
        return metrics.totalPunches;
      case 'punctuality_rate':
        return `${metrics.punctualityRate}%`;
      case 'total_rest_time':
        return `${metrics.totalRestHours} hrs`;
      case 'total_overtime':
        return `${metrics.totalOvertimeHours} hrs`;
      default:
        return 0;
    }
  };

  // Status Badge Component matching Face Attendance Page
  const statusBadge = (status?: string, isOnRest?: boolean) => {
    if (isOnRest) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
          <Coffee size={13} className="text-amber-700" />
          <span>Resting...</span>
        </span>
      );
    }

    const s = (status || '').toLowerCase();
    if (s === 'present') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Present (On-Time)
        </span>
      );
    }
    if (s === 'late') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Late Arrival
        </span>
      );
    }
    if (s === 'half day') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Half Day
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        {status || 'Unknown'}
      </span>
    );
  };

  // CSV EXPORT LOGIC
  const exportToCSV = () => {
    let filename = `attendance_report_${activeTab}_${todayStr}.csv`;
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeTab === 'daily') {
      filename = `daily_attendance_log_${selectedDate}.csv`;
      headers = [
        'Date',
        'Employee ID',
        'Name',
        'Employer Company',
        'General Working Time',
        'Working Start',
        'Rest Time',
        'Absent Time (Rest Over)',
        'Working End Time',
        'Total Actual Working Time',
        'Over Time',
        'Status',
        'Verification Method',
      ];
      rows = filteredRecords.map((r) => [
        r.date,
        r.employee_code,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.company_name || r.company_id || '').replace(/"/g, '""')}"`,
        r.general_working_hours ? `${r.general_working_hours.toFixed(1)} hrs` : '8.0 hrs',
        r.clock_in ? formatTimeAMPM(r.clock_in) : '—',
        r.is_on_rest ? 'Resting...' : formatDuration(r.rest_time_minutes),
        formatDuration(r.absent_minutes),
        r.clock_out ? formatTimeAMPM(r.clock_out) : r.clock_in ? 'Working...' : '—',
        formatDuration(r.actual_working_minutes),
        r.overtime_minutes && r.overtime_minutes > 0 ? `+${formatDuration(r.overtime_minutes)}` : '—',
        r.status,
        r.verification_method || 'AI Bio',
      ]);
    } else if (activeTab === 'rest_time') {
      filename = `rest_time_report_${startDate}_to_${endDate}.csv`;
      headers = [
        'Date',
        'Employee ID',
        'Name',
        'Employer Company',
        'Working Start',
        'Working End Time',
        'Rest Start Time',
        'Rest End Time',
        'Rest Time Taken',
        'Allowed Rest Limit',
        'Absent Time (Rest Over)',
        'Break Status',
      ];
      rows = restTimeRecords.map((r) => [
        r.date,
        r.employee_code,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.company_name || '').replace(/"/g, '""')}"`,
        r.clock_in ? formatTimeAMPM(r.clock_in) : '—',
        r.clock_out ? formatTimeAMPM(r.clock_out) : '—',
        r.rest_start ? formatTimeAMPM(r.rest_start) : '—',
        r.rest_end ? formatTimeAMPM(r.rest_end) : '—',
        r.is_on_rest ? 'Resting Now' : formatDuration(r.rest_time_minutes),
        `${r.allowed_rest_minutes || 60} min`,
        formatDuration(r.absent_minutes),
        r.is_on_rest ? 'Currently Resting' : (r.absent_minutes || 0) > 0 ? 'Break Exceeded' : 'Within Limit',
      ]);
    } else if (activeTab === 'monthly') {
      filename = `monthly_attendance_summary_${selectedMonth}_${selectedYear}.csv`;
      headers = [
        'Employee ID',
        'Name',
        'Employer Company',
        'Tracked Days',
        'Present (On-Time)',
        'Late Arrivals',
        'Half Days',
        'Rest Time Taken',
        'Absent Time (Rest Over)',
        'Total Actual Working Time',
        'Over Time',
        'Attendance Rate %',
      ];
      rows = monthlySummary.map((m) => {
        const rate = m.total_days > 0 ? Math.round((m.present_count / m.total_days) * 100) : 0;
        return [
          m.employee_code,
          `"${m.name.replace(/"/g, '""')}"`,
          `"${m.company.replace(/"/g, '""')}"`,
          m.total_days,
          m.present_count,
          m.late_count,
          m.half_day_count,
          (m.total_rest_minutes / 60).toFixed(1) + ' hrs',
          (m.total_absent_minutes / 60).toFixed(1) + ' hrs',
          (m.total_working_minutes / 60).toFixed(1) + ' hrs',
          (m.total_overtime_minutes / 60).toFixed(1) + ' hrs',
          `${rate}%`,
        ];
      });
    } else if (activeTab === 'punctuality') {
      filename = `late_and_early_exits_audit_${startDate}_to_${endDate}.csv`;
      headers = [
        'Date',
        'Employee ID',
        'Name',
        'Employer Company',
        'Working Start',
        'Working End Time',
        'Absent Time (Rest Over)',
        'Total Actual Working Time',
        'Status',
        'Remarks / Notes',
      ];
      rows = punctualityRecords.map((r) => [
        r.date,
        r.employee_code,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.company_name || '').replace(/"/g, '""')}"`,
        r.clock_in ? formatTimeAMPM(r.clock_in) : '—',
        r.clock_out ? formatTimeAMPM(r.clock_out) : 'Still Active',
        formatDuration(r.absent_minutes),
        formatDuration(r.actual_working_minutes),
        r.status,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ]);
    } else if (activeTab === 'overtime') {
      filename = `overtime_records_${startDate}_to_${endDate}.csv`;
      headers = [
        'Date',
        'Employee ID',
        'Name',
        'Employer Company',
        'General Working Time',
        'Working Start',
        'Working End Time',
        'Total Actual Working Time',
        'Over Time',
        'Status',
      ];
      rows = overtimeRecords.map((r) => [
        r.date,
        r.employee_code,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.company_name || '').replace(/"/g, '""')}"`,
        `${r.general_working_hours || 8} hrs`,
        r.clock_in ? formatTimeAMPM(r.clock_in) : '—',
        r.clock_out ? formatTimeAMPM(r.clock_out) : '—',
        formatDuration(r.actual_working_minutes),
        `+${formatDuration(r.overtime_minutes)}`,
        r.status,
      ]);
    } else if (activeTab === 'leaves') {
      filename = `leaves_and_absence_report_${todayStr}.csv`;
      headers = [
        'Application ID',
        'Employee ID',
        'Name',
        'Leave Type',
        'Title / Reason',
        'Start Date',
        'End Date',
        'Days Count',
        'Status',
        'Approved By',
      ];
      rows = leaves.map((l) => [
        l.id,
        l.employee_code,
        `"${(l.employee_name || '').replace(/"/g, '""')}"`,
        l.leave_type === 'annual_leave' ? 'Yearly Annual Leave' : 'Holiday Application',
        `"${(l.title || l.reason || '').replace(/"/g, '""')}"`,
        l.start_date,
        l.end_date,
        l.days_count,
        l.status,
        `"${(l.approved_by || 'Admin').replace(/"/g, '""')}"`,
      ]);
    } else if (activeTab === 'individual') {
      filename = `worker_drilldown_${selectedEmployeeCode}_${startDate}_to_${endDate}.csv`;
      headers = [
        'Date',
        'Employee ID',
        'Name',
        'General Working Time',
        'Working Start',
        'Rest Time',
        'Absent Time (Rest Over)',
        'Working End Time',
        'Total Actual Working Time',
        'Over Time',
        'Status',
        'Verification Method',
      ];
      rows = filteredRecords.map((r) => [
        r.date,
        r.employee_code,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        r.general_working_hours ? `${r.general_working_hours.toFixed(1)} hrs` : '8.0 hrs',
        r.clock_in ? formatTimeAMPM(r.clock_in) : '—',
        formatDuration(r.rest_time_minutes),
        formatDuration(r.absent_minutes),
        r.clock_out ? formatTimeAMPM(r.clock_out) : 'Still Active',
        formatDuration(r.actual_working_minutes),
        r.overtime_minutes ? `+${formatDuration(r.overtime_minutes)}` : '—',
        r.status,
        r.verification_method || 'AI Bio',
      ]);
    }

    // Build CSV string with UTF-8 BOM
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('success', `Exported ${rows.length} rows to ${filename}`);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 print:p-0 print:m-0 print:max-w-full">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all print:hidden ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <Clock size={14} />
            <Link href="/superadmin/attendance" className="hover:underline">
              Attendance Management
            </Link>
            <span>/</span>
            <span>Reports</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Attendance &amp; Workforce Reports
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Audit daily punches, rest &amp; break times, monthly attendance rates, overtime calculations, and employee work hours.
          </p>
        </div>

        {/* Global Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsCardModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs"
          >
            <SlidersHorizontal size={14} className="text-slate-500" />
            Manage Cards
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {cards
          .slice()
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
          .map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 print:hidden">
                  <DynamicCardIcon icon={card.icon} size={18} />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {getMetricValue(card.id)}
                </div>
                {card.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {card.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* REPORT TABS BAR AT TOP */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {REPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  const p = new URLSearchParams(window.location.search);
                  p.set('tab', tab.id);
                  router.push(`/superadmin/attendance/reports?${p.toString()}`);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER & CONTROLS SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter controls per tab */}
            {activeTab === 'daily' && (
              <>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setDateFilterType('single')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      dateFilterType === 'single' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Single Date
                  </button>
                  <button
                    onClick={() => setDateFilterType('range')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      dateFilterType === 'range' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Date Range
                  </button>
                </div>

                {dateFilterType === 'single' ? (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs">
                    <Calendar size={14} className="text-slate-400" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                )}
              </>
            )}

            {activeTab === 'rest_time' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Audit Period:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <select
                  value={selectedRestStatus}
                  onChange={(e) => setSelectedRestStatus(e.target.value)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="all">All Rest Records</option>
                  <option value="over_break">⚠️ Absent Time (Rest Over Limit)</option>
                  <option value="resting">☕ Currently on Rest</option>
                  <option value="normal">✓ Normal (Within Quota)</option>
                </select>
              </>
            )}

            {activeTab === 'monthly' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(activeTab === 'punctuality' || activeTab === 'overtime' || activeTab === 'individual') && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            )}

            {/* Employee selector for Individual drilldown */}
            {activeTab === 'individual' && (
              <select
                value={selectedEmployeeCode}
                onChange={(e) => setSelectedEmployeeCode(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-indigo-50/80 border border-indigo-200 rounded-xl focus:outline-none"
              >
                <option value="all">-- Select Employee --</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.code} value={emp.code}>
                    {emp.name} ({emp.code}) - {emp.role}
                  </option>
                ))}
              </select>
            )}

            {/* Company Filter Dropdown */}
            {companies.length > 0 && (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Dropdown */}
            {activeTab === 'daily' && (
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="present">Present (On-Time)</option>
                <option value="late">Late Arrival</option>
                <option value="on_rest">On Rest Break</option>
                <option value="half_day">Half Day</option>
              </select>
            )}
          </div>

          {/* Search box & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, ID, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={loadReportData}
              title="Refresh Data"
              className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Official Report Header - Print Only */}
      <div className="hidden print:block mb-4 pb-3 border-b-2 border-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Biometric Attendance &amp; Workforce System
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
              {REPORT_TABS.find((t) => t.id === activeTab)?.label || 'Attendance Report'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {REPORT_TABS.find((t) => t.id === activeTab)?.description}
            </p>
          </div>
          <div className="text-right text-xs text-slate-700 space-y-0.5">
            <div><span className="font-bold">Period:</span> {activeTab === 'daily' ? (dateFilterType === 'single' ? selectedDate : `${startDate} to ${endDate}`) : activeTab === 'monthly' ? `Month ${selectedMonth}, ${selectedYear}` : `${startDate} to ${endDate}`}</div>
            <div><span className="font-bold">Generated:</span> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div><span className="font-bold">Total Records:</span> {
              activeTab === 'daily' ? filteredRecords.length :
              activeTab === 'monthly' ? monthlySummary.length :
              activeTab === 'punctuality' ? punctualityRecords.length :
              activeTab === 'rest_time' ? restTimeRecords.length :
              activeTab === 'overtime' ? overtimeRecords.length :
              activeTab === 'leaves' ? leaves.length :
              filteredRecords.length
            }</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY ATTENDANCE LOG */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Daily Attendance Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing punches recorded for {dateFilterType === 'single' ? selectedDate : `${startDate} to ${endDate}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                Total Records: <strong className="text-indigo-600 font-bold">{filteredRecords.length}</strong>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <Printer size={14} className="text-slate-500" />
                Print Report
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Compiling daily attendance logs...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-16 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CalendarDays size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Attendance Records Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                No punches recorded for the selected date filters or search parameters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[130px]">Date</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Employee ID</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[220px]">Name</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[170px]">General Working Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Working Start</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Rest Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px]">Absent Time (Rest Over)</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Working End Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px]">Total Actual Working Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Over Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Status</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredRecords.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-4.5 px-6 font-mono font-medium text-slate-600 whitespace-nowrap">
                        {att.date}
                      </td>

                      {/* 1. Employee ID */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                          {att.employee_code}
                        </span>
                      </td>

                      {/* 2. Name */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] font-bold flex items-center justify-center shrink-0">
                            {att.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{att.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {att.role} {att.company_name ? `• ${att.company_name}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. General Working Time */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                          {att.general_working_hours ? `${att.general_working_hours.toFixed(1)} hrs` : '8.0 hrs'}
                        </span>
                      </td>

                      {/* 4. Working Start */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {att.clock_in ? (
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                            {formatTimeAMPM(att.clock_in)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 5. Rest Time */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {att.is_on_rest ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 animate-pulse">
                            <Coffee size={13} className="text-amber-700" />
                            <span>Resting...</span>
                          </span>
                        ) : att.rest_time_minutes && att.rest_time_minutes > 0 ? (
                          <span className="font-mono font-semibold text-slate-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200/80">
                            {formatDuration(att.rest_time_minutes)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0 min</span>
                        )}
                      </td>

                      {/* 6. Absent Time (Rest Over) */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {att.absent_minutes && att.absent_minutes > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                            <AlertCircle size={13} className="text-rose-500" />
                            <span>{formatDuration(att.absent_minutes)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">0 min</span>
                        )}
                      </td>

                      {/* 7. Working End Time */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {att.clock_out ? (
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                            {formatTimeAMPM(att.clock_out)}
                          </span>
                        ) : att.clock_in ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                            <span>Working...</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 8. Total Actual Working Time */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {att.actual_working_minutes && att.actual_working_minutes > 0 ? (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
                            {formatDuration(att.actual_working_minutes)}
                          </span>
                        ) : att.clock_in && !att.clock_out ? (
                          <span className="text-slate-400 italic">In Shift</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 9. Over Time */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {att.overtime_minutes && att.overtime_minutes > 0 ? (
                          <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                            +{formatDuration(att.overtime_minutes)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 10. Status */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {statusBadge(att.status, att.is_on_rest)}
                      </td>

                      {/* 11. Verification */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                          <Camera size={13} className="text-slate-400" />
                          {att.verification_method || 'AI Bio'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY SUMMARY MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Monthly Attendance &amp; Working Hours Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated records for Month {selectedMonth}, {selectedYear}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                Staff Count: <strong className="text-indigo-600 font-bold">{monthlySummary.length}</strong>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <Printer size={14} className="text-slate-500" />
                Print Report
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Calculating monthly aggregates...</p>
            </div>
          ) : monthlySummary.length === 0 ? (
            <div className="p-16 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Monthly Records Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                No attendance punches logged for the chosen month and year.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Employee ID</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[220px]">Name</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[180px]">Employer Company</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Tracked Days</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px] text-emerald-700">Present (On-Time)</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px] text-rose-700">Late Arrivals</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px] text-blue-700">Half Days</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Rest Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px] text-rose-700">Absent Time (Rest Over)</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px]">Total Actual Working Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Over Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {monthlySummary.map((emp) => {
                    const rate = emp.total_days > 0 ? Math.round((emp.present_count / emp.total_days) * 100) : 0;
                    return (
                      <tr key={emp.employee_code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4.5 px-6 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                            {emp.employee_code}
                          </span>
                        </td>
                        <td className="py-4.5 px-6 whitespace-nowrap">
                          <div className="font-bold text-slate-900 leading-tight">{emp.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{emp.role}</div>
                        </td>
                        <td className="py-4.5 px-6 font-medium text-slate-800 whitespace-nowrap">
                          {emp.company}
                        </td>
                        <td className="py-4.5 px-6 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {emp.total_days} Days
                        </td>
                        <td className="py-4.5 px-6 font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {emp.present_count}
                        </td>
                        <td className="py-4.5 px-6 font-mono font-bold text-rose-700 whitespace-nowrap">
                          {emp.late_count}
                        </td>
                        <td className="py-4.5 px-6 font-mono font-medium text-blue-700 whitespace-nowrap">
                          {emp.half_day_count}
                        </td>
                        <td className="py-4.5 px-6 font-mono font-medium text-slate-700 whitespace-nowrap">
                          {(emp.total_rest_minutes / 60).toFixed(1)} hrs
                        </td>
                        <td className="py-4.5 px-6 font-mono font-bold text-rose-700 whitespace-nowrap">
                          {(emp.total_absent_minutes / 60).toFixed(1)} hrs
                        </td>
                        <td className="py-4.5 px-6 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {(emp.total_working_minutes / 60).toFixed(1)} hrs
                        </td>
                        <td className="py-4.5 px-6 font-mono font-medium text-purple-700 whitespace-nowrap">
                          {(emp.total_overtime_minutes / 60).toFixed(1)} hrs
                        </td>
                        <td className="py-4.5 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LATE & EARLY EXITS AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'punctuality' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Punctuality, Late Arrivals &amp; Exceptions Audit</span>
                <span className="text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  Policy Exceptions
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff check-ins beyond standard grace period ({scheduleRules?.grace_period_minutes || 15} minutes) or excessive break duration.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                Late Incidents: <strong className="text-rose-600 font-bold">{punctualityRecords.length}</strong>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <Printer size={14} className="text-slate-500" />
                Print Report
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Auditing punctuality records...</p>
            </div>
          ) : punctualityRecords.length === 0 ? (
            <div className="p-16 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">100% On-Time Record!</h3>
              <p className="text-xs text-slate-500 mt-1">
                No late arrivals or policy exceptions logged for the selected period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[130px]">Date</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Employee ID</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[220px]">Name</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[180px]">Employer Company</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px] text-rose-700">Working Start</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Working End Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px] text-rose-700">Absent Time (Rest Over)</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px]">Total Actual Working Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Status</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[220px]">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {punctualityRecords.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4.5 px-6 font-mono font-medium text-slate-600 whitespace-nowrap">
                        {att.date}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                          {att.employee_code}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <div className="font-bold text-slate-900 leading-tight">{att.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{att.role}</div>
                      </td>
                      <td className="py-4.5 px-6 font-medium text-slate-800 whitespace-nowrap">
                        {att.company_name || 'General'}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono font-bold text-rose-700 bg-rose-50/50">
                        {att.clock_in ? formatTimeAMPM(att.clock_in) : '—'}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono text-slate-600">
                        {att.clock_out ? formatTimeAMPM(att.clock_out) : 'Still Active'}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono font-bold text-rose-600">
                        {(att.absent_minutes || 0) > 0 ? formatDuration(att.absent_minutes) : '0 min'}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono font-bold text-slate-800">
                        {formatDuration(att.actual_working_minutes)}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {statusBadge(att.status, att.is_on_rest)}
                      </td>
                      <td className="py-4.5 px-6 text-slate-500 text-xs max-w-sm truncate whitespace-nowrap">
                        {att.notes || 'Late arrival recorded by biometric face match'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REST TIME REPORT (PLACED AFTER LATE TAB) */}
      {/* ========================================================================= */}
      {activeTab === 'rest_time' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Coffee size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Rest Time &amp; Break Audit Report
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Detailed audit of daily break duration, rest start/end timestamps, allowed quotas ({scheduleRules?.rest_time_minutes || 60} mins), and absent time (rest over limit).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                Rest Sessions: <strong className="text-amber-700 font-bold">{restTimeRecords.length}</strong>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <Printer size={14} className="text-slate-500" />
                Print Report
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw size={28} className="animate-spin text-amber-600 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Analyzing rest &amp; break records...</p>
            </div>
          ) : restTimeRecords.length === 0 ? (
            <div className="p-16 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Coffee size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Rest Sessions Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                No break activity or rest timers recorded for this selected date range.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[130px]">Date</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Employee ID</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[220px]">Name</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[180px]">Employer Company</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Working Start</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Working End Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px] text-amber-800">Rest Start</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px] text-amber-800">Rest End</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px] text-amber-900 font-bold">Total Rest Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Allowed Rest Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px] text-rose-700 font-bold">Absent Time (Rest Over)</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[180px]">Break Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {restTimeRecords.map((att) => {
                    const hasOverBreak = Boolean(att.absent_minutes && att.absent_minutes > 0);
                    return (
                      <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Date */}
                        <td className="py-4.5 px-6 font-mono font-medium text-slate-600 whitespace-nowrap">
                          {att.date}
                        </td>

                        {/* Employee ID */}
                        <td className="py-4.5 px-6 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                            {att.employee_code}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                              {att.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">{att.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{att.role}</div>
                            </div>
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-4.5 px-6 font-medium text-slate-800 whitespace-nowrap">
                          {att.company_name || 'General'}
                        </td>

                        {/* Working Start */}
                        <td className="py-4.5 px-6 whitespace-nowrap font-mono">
                          {att.clock_in ? formatTimeAMPM(att.clock_in) : '—'}
                        </td>

                        {/* Working End Time */}
                        <td className="py-4.5 px-6 whitespace-nowrap font-mono">
                          {att.clock_out ? formatTimeAMPM(att.clock_out) : att.clock_in ? 'Working...' : '—'}
                        </td>

                        {/* Rest Start */}
                        <td className="py-4.5 px-6 whitespace-nowrap font-mono text-amber-800 font-semibold">
                          {att.rest_start ? (
                            <span className="bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                              {formatTimeAMPM(att.rest_start)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Rest End */}
                        <td className="py-4.5 px-6 whitespace-nowrap font-mono text-amber-800 font-semibold">
                          {att.rest_end ? (
                            <span className="bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                              {formatTimeAMPM(att.rest_end)}
                            </span>
                          ) : att.is_on_rest ? (
                            <span className="text-amber-600 animate-pulse font-bold">In Progress</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Total Rest Time */}
                        <td className="py-4.5 px-6 whitespace-nowrap">
                          {att.is_on_rest ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 animate-pulse">
                              <Coffee size={13} className="text-amber-700" />
                              <span>Resting Now</span>
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                              {formatDuration(att.rest_time_minutes)}
                            </span>
                          )}
                        </td>

                        {/* Allowed Rest Time */}
                        <td className="py-4.5 px-6 whitespace-nowrap font-mono text-slate-600">
                          {att.allowed_rest_minutes ? `${att.allowed_rest_minutes} min` : '60 min'}
                        </td>

                        {/* Absent Time (Rest Over) */}
                        <td className="py-4.5 px-6 whitespace-nowrap">
                          {hasOverBreak ? (
                            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                              <AlertCircle size={13} className="text-rose-500" />
                              <span>+{formatDuration(att.absent_minutes)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0 min (Within Quota)</span>
                          )}
                        </td>

                        {/* Compliance Status */}
                        <td className="py-4.5 px-6 whitespace-nowrap">
                          {att.is_on_rest ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Currently Resting
                            </span>
                          ) : hasOverBreak ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              ⚠️ Rest Limit Exceeded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Compliant (Within Limit)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: OVERTIME REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'overtime' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Over Time &amp; Extra Working Hours
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hours worked beyond the standard 8-hour general daily shift limit.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                Over Time Workers: <strong className="text-purple-700 font-bold">{overtimeRecords.length}</strong>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <Printer size={14} className="text-slate-500" />
                Print Report
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw size={28} className="animate-spin text-purple-600 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Calculating overtime records...</p>
            </div>
          ) : overtimeRecords.length === 0 ? (
            <div className="p-16 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Hourglass size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Over Time Recorded</h3>
              <p className="text-xs text-slate-500 mt-1">
                No shifts exceeded the general working hours limit in this period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[130px]">Date</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Employee ID</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[220px]">Name</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[180px]">Employer Company</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[170px]">General Working Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Working Start</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Working End Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px]">Total Actual Working Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px] text-purple-700">Over Time</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {overtimeRecords.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4.5 px-6 font-mono font-medium text-slate-600 whitespace-nowrap">
                        {att.date}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                          {att.employee_code}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <div className="font-bold text-slate-900 leading-tight">{att.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{att.role}</div>
                      </td>
                      <td className="py-4.5 px-6 font-medium text-slate-800 whitespace-nowrap">
                        {att.company_name || 'General'}
                      </td>
                      <td className="py-4.5 px-6 font-mono text-slate-600 whitespace-nowrap">
                        {att.general_working_hours ? `${att.general_working_hours.toFixed(1)} hrs` : '8.0 hrs'}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono">
                        {att.clock_in ? formatTimeAMPM(att.clock_in) : '—'}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono">
                        {att.clock_out ? formatTimeAMPM(att.clock_out) : 'Still Active'}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono font-bold text-slate-800">
                        {formatDuration(att.actual_working_minutes)}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono font-bold text-purple-700 bg-purple-50">
                        +{formatDuration(att.overtime_minutes)}
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          <Check size={13} /> Over Time Valid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: INDIVIDUAL WORKER DRILLDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'individual' && (
        <div className="space-y-6">
          {selectedEmployeeCode === 'all' ? (
            <div className="bg-white p-16 text-center rounded-2xl border border-slate-200/80 max-w-md mx-auto">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Select an Employee</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Choose an employee from the dropdown above to view their comprehensive punch timeline, attendance trends, and punctuality breakdown.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Attendance History for {employeeOptions.find((e) => e.code === selectedEmployeeCode)?.name || selectedEmployeeCode}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Individual punch timeline from {startDate} to {endDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                    Total Sessions: <strong className="text-indigo-600 font-bold">{filteredRecords.length}</strong>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                  >
                    <Printer size={14} className="text-slate-500" />
                    Print Report
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="p-16 text-center max-w-sm mx-auto">
                  <p className="text-xs text-slate-500">No punches found for this worker in the selected date range.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[130px]">Date</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Working Start</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Working End Time</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[170px]">General Working Time</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Rest Time</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px] text-rose-700">Absent Time (Rest Over)</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[190px]">Total Actual Working Time</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Over Time</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Status</th>
                        <th className="py-4.5 px-6 whitespace-nowrap min-w-[160px]">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredRecords.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4.5 px-6 font-mono font-medium text-slate-700 whitespace-nowrap">
                            {att.date}
                          </td>
                          <td className="py-4.5 px-6 font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {att.clock_in ? formatTimeAMPM(att.clock_in) : '—'}
                          </td>
                          <td className="py-4.5 px-6 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {att.clock_out ? formatTimeAMPM(att.clock_out) : 'Still Active'}
                          </td>
                          <td className="py-4.5 px-6 font-mono font-medium text-slate-700 whitespace-nowrap">
                            {att.general_working_hours ? `${att.general_working_hours.toFixed(1)} hrs` : '8.0 hrs'}
                          </td>
                          <td className="py-4.5 px-6 font-mono text-slate-600 whitespace-nowrap">
                            {formatDuration(att.rest_time_minutes)}
                          </td>
                          <td className="py-4.5 px-6 font-mono font-bold text-rose-700 whitespace-nowrap">
                            {(att.absent_minutes || 0) > 0 ? formatDuration(att.absent_minutes) : '0 min'}
                          </td>
                          <td className="py-4.5 px-6 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatDuration(att.actual_working_minutes)}
                          </td>
                          <td className="py-4.5 px-6 font-mono whitespace-nowrap">
                            {Number(att.overtime_minutes || 0) > 0 ? (
                              <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded">
                                +{formatDuration(att.overtime_minutes)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-4.5 px-6 whitespace-nowrap">
                            {statusBadge(att.status, att.is_on_rest)}
                          </td>
                          <td className="py-4.5 px-6 font-mono text-xs text-slate-500 whitespace-nowrap">
                            {att.verification_method || 'AI Bio'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: LEAVES & ABSENCE AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Leaves &amp; Absence Requests Audit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of official holiday leaves, yearly annual leaves, and unexcused absences.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                Total Applications: <strong className="text-indigo-600 font-bold">{leaves.length}</strong>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <Printer size={14} className="text-slate-500" />
                Print Report
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Loading leave applications...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-16 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CalendarCheck size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Leave Applications Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                No leave requests logged for the selected period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Employee ID</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[220px]">Name</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[170px]">Leave Type</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[250px]">Title / Reason</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">Start Date</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[140px]">End Date</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[120px]">Days</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Status</th>
                    <th className="py-4.5 px-6 whitespace-nowrap min-w-[150px]">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono font-bold text-slate-900">
                        <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                          {l.employee_code}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <div className="font-bold text-slate-900 leading-tight">
                          {l.employee_name || l.employee_code}
                        </div>
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded">
                          {l.leave_type === 'annual_leave' ? 'Yearly Annual Leave' : 'Holiday'}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-slate-800 font-medium max-w-sm truncate whitespace-nowrap">
                        {l.title || l.reason || 'Leave application'}
                      </td>
                      <td className="py-4.5 px-6 font-mono text-slate-600 whitespace-nowrap">
                        {l.start_date}
                      </td>
                      <td className="py-4.5 px-6 font-mono text-slate-600 whitespace-nowrap">
                        {l.end_date}
                      </td>
                      <td className="py-4.5 px-6 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {l.days_count} Days
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        {l.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Approved
                          </span>
                        ) : l.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-6 text-slate-500 text-xs whitespace-nowrap">
                        {l.approved_by || 'Management'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Card Priority Customization Modal */}
      <CardPriorityModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cards={cards}
        onSave={handleSaveCards}
        onReset={handleResetCards}
        pageTitle="Attendance Reports Cards"
      />
    </div>
  );
}

export default function AttendanceReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-xs font-semibold text-slate-500 bg-white rounded-2xl border border-slate-200 max-w-7xl mx-auto">
          <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p>Loading attendance reports workspace...</p>
        </div>
      }
    >
      <AttendanceReportsContent />
    </Suspense>
  );
}
