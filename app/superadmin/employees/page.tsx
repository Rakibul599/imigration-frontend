'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  KeyRound,
  Plus,
  Power,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import CardPriorityModal from '@/components/CardPriorityModal';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import {
  PageStatCardConfig,
  getStoredPageCards,
  saveStoredPageCards,
  resetStoredPageCards,
} from '@/lib/pageCardStorage';
import { Company } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';

export type EmployeeRecord = {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: 'Employee' | 'Admin';
  master_admin_id?: number | null;
  master_admin_name?: string | null;
  assigned_companies: string[];
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  module_permissions?: {
    companies?: { view: boolean; edit?: boolean; delete?: boolean };
    customers?: { view: boolean; create?: boolean; edit?: boolean; delete?: boolean };
    services?: { view: boolean; create?: boolean; edit?: boolean; delete?: boolean };
    passwords?: { view: boolean; edit?: boolean };
  };
  status: 'active' | 'inactive';
  status_scheduled_date?: string | null;
  status_scheduled_action?: 'active' | 'inactive' | null;
  documents?: Array<{ name: string; issue_date?: string; expire_date?: string; url?: string; size?: string }>;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_EMPLOYEE_CARDS: PageStatCardConfig[] = [
  { id: 'total_accounts', title: 'Total Employees', subtitle: '', icon: 'Users', order_num: 1 },
  { id: 'active_logins', title: 'Active Accounts', subtitle: '', icon: 'UserCheck', order_num: 2 },
  { id: 'available_companies', title: 'Companies', subtitle: '', icon: 'Building2', order_num: 3 },
];

export default function SuperAdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Status Modal State
  const [statusModalEmployee, setStatusModalEmployee] = useState<EmployeeRecord | null>(null);
  const [modalMode, setModalMode] = useState<'instant' | 'scheduled'>('instant');
  const [modalInstantStatus, setModalInstantStatus] = useState<'active' | 'inactive'>('active');
  const [modalScheduledDate, setModalScheduledDate] = useState<string>('');
  const [modalScheduledTime, setModalScheduledTime] = useState<string>('23:59');
  const [modalScheduledAction, setModalScheduledAction] = useState<'active' | 'inactive'>('inactive');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [mounted, setMounted] = useState<boolean>(false);

  // Top Company Filter State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Live 1-second countdown ticker & background sync
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    const syncInterval = setInterval(() => {
      fetchEmployees();
    }, 30000);
    return () => {
      clearInterval(timer);
      clearInterval(syncInterval);
    };
  }, []);

  // Manage Cards Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cards, setCards] = useState<PageStatCardConfig[]>(DEFAULT_EMPLOYEE_CARDS);

  useEffect(() => {
    setCards(getStoredPageCards('employees', DEFAULT_EMPLOYEE_CARDS));
    const handleUpdate = (e: any) => {
      setCards(e.detail || getStoredPageCards('employees', DEFAULT_EMPLOYEE_CARDS));
    };
    window.addEventListener('superadmin_cards_update_employees', handleUpdate);
    return () => window.removeEventListener('superadmin_cards_update_employees', handleUpdate);
  }, []);

  const handleSaveCards = (updated: PageStatCardConfig[]) => {
    const saved = saveStoredPageCards('employees', updated);
    setCards(saved);
    setNotification({ type: 'success', message: 'Cards priority and names updated successfully.' });
  };

  const handleResetCards = () => {
    const reset = resetStoredPageCards('employees', DEFAULT_EMPLOYEE_CARDS);
    setCards(reset);
    setNotification({ type: 'info', message: 'Cards reset to default layout.' });
  };

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${apiBase}/employees`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Error fetching employees from backend:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend()
      .then((list) => {
        setCompanies(list);
      })
      .catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleDeleteEmployee = async (id: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/employees/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        await fetchEmployees();
        setDeleteConfirmId(null);
        showToast('info', 'Employee profile deleted successfully.');
      }
    } catch (err) {
      console.error('Delete employee error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCountdownInfo = (scheduledDateStr?: string | null, scheduledAction?: string | null) => {
    if (!scheduledDateStr) {
      return {
        status: 'none' as const,
        label: '',
        color: '',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isUrgent: false,
      };
    }

    let targetTime = new Date(scheduledDateStr).getTime();
    if (isNaN(targetTime)) {
      targetTime = new Date(scheduledDateStr.replace(' ', 'T')).getTime();
    }

    if (isNaN(targetTime)) {
      return {
        status: 'invalid' as const,
        label: 'Invalid Date',
        color: 'text-slate-400 bg-slate-50 border-slate-200',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isUrgent: false,
      };
    }

    const diffMs = targetTime - currentTime;
    if (diffMs <= 0) {
      return {
        status: 'expired' as const,
        label: 'Expired',
        color: 'text-rose-700 bg-rose-50 border-rose-300 font-bold',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isUrgent: true,
      };
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    let label = '';
    if (days > 0) {
      label = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    } else if (hours > 0) {
      label = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    } else {
      label = `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }

    const isUrgent = days === 0 && hours < 24;
    const isAutoActive = scheduledAction === 'active';

    let color = '';
    if (isAutoActive) {
      color = isUrgent
        ? 'text-emerald-800 bg-emerald-100 border-emerald-400 ring-1 ring-emerald-300 animate-pulse'
        : 'text-emerald-700 bg-emerald-50 border-emerald-300';
    } else {
      color = isUrgent
        ? 'text-rose-700 bg-rose-50 border-rose-300 ring-1 ring-rose-200 animate-pulse'
        : 'text-amber-800 bg-amber-50 border-amber-300';
    }

    return {
      status: 'active' as const,
      label,
      days,
      hours,
      minutes,
      seconds,
      color,
      isUrgent,
    };
  };

  const handleOpenStatusModal = (emp: EmployeeRecord) => {
    setStatusModalEmployee(emp);
    setModalInstantStatus(emp.status);

    if (emp.status_scheduled_date) {
      setModalMode('scheduled');
      const d = new Date(emp.status_scheduled_date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setModalScheduledDate(`${yyyy}-${mm}-${dd}`);
      setModalScheduledTime(`${hh}:${min}`);
      setModalScheduledAction(emp.status_scheduled_action || (emp.status === 'active' ? 'inactive' : 'active'));
    } else {
      setModalMode('instant');
      setModalScheduledAction(emp.status === 'active' ? 'inactive' : 'active');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      const yyyy = defaultDate.getFullYear();
      const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const dd = String(defaultDate.getDate()).padStart(2, '0');
      setModalScheduledDate(`${yyyy}-${mm}-${dd}`);
      setModalScheduledTime('23:59');
    }
  };

  const handleSaveStatusModal = async () => {
    if (!statusModalEmployee) return;
    setIsSavingStatus(true);

    const payload: {
      status?: 'active' | 'inactive';
      status_scheduled_date?: string | null;
      status_scheduled_action?: 'active' | 'inactive' | null;
    } = {};

    if (modalMode === 'instant') {
      payload.status = modalInstantStatus;
      payload.status_scheduled_date = null;
      payload.status_scheduled_action = null;
    } else {
      if (!modalScheduledDate) {
        showToast('info', 'Please select a date for the scheduled status transition.');
        setIsSavingStatus(false);
        return;
      }
      const timePart = modalScheduledTime ? `${modalScheduledTime}:00` : '23:59:59';
      payload.status_scheduled_date = `${modalScheduledDate} ${timePart}`;
      payload.status_scheduled_action = modalScheduledAction;
    }

    try {
      const res = await fetch(`${apiBase}/employees/${statusModalEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setEmployees((prev) =>
          prev.map((e) => (e.id === statusModalEmployee.id ? { ...e, ...updated } : e))
        );
        showToast(
          'success',
          modalMode === 'instant'
            ? `Status updated immediately to ${modalInstantStatus}.`
            : `Scheduled to auto-${modalScheduledAction} on ${modalScheduledDate}.`
        );
        setStatusModalEmployee(null);
      } else {
        showToast('info', 'Failed to update employee status.');
      }
    } catch {
      showToast('info', 'Network error occurred while updating status.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleClearSchedule = async () => {
    if (!statusModalEmployee) return;
    setIsSavingStatus(true);
    try {
      const res = await fetch(`${apiBase}/employees/${statusModalEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          status_scheduled_date: null,
          status_scheduled_action: null,
        }),
      });

      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === statusModalEmployee.id
              ? { ...e, status_scheduled_date: null, status_scheduled_action: null }
              : e
          )
        );
        showToast('info', 'Scheduled status change removed.');
        setStatusModalEmployee(null);
      }
    } catch {
      showToast('info', 'Failed to remove schedule.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleToggleStatus = async (emp: EmployeeRecord) => {
    const newStatus: 'active' | 'inactive' = emp.status === 'active' ? 'inactive' : 'active';
    // Optimistic state update
    setEmployees((prev) =>
      prev.map((e) => (e.id === emp.id ? { ...e, status: newStatus } : e))
    );

    try {
      const res = await fetch(`${apiBase}/employees/${emp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast('success', `Employee "${emp.name}" is now ${newStatus}.`);
      } else {
        // Revert on error
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, status: emp.status } : e))
        );
        showToast('info', 'Failed to update employee status.');
      }
    } catch (err) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, status: emp.status } : e))
      );
      showToast('info', 'Network error updating employee status.');
    }
  };

  // Helper: check if employee is assigned to a target company
  const isEmployeeAssignedToCompany = (emp: EmployeeRecord, targetCompanyId: string) => {
    if (!targetCompanyId || targetCompanyId === 'ALL') return true;
    const assigned = Array.isArray(emp.assigned_companies) ? emp.assigned_companies : [];
    if (assigned.includes('*')) return true;

    const targetCompany = companies.find((c) => String(c.id) === String(targetCompanyId));
    const cleanTargetId = String(targetCompanyId).trim().toLowerCase();
    const cleanTargetName = (targetCompany?.name || '').trim().toLowerCase();
    const cleanTargetRoc = (targetCompany?.roc || '').trim().toLowerCase();

    return assigned.some((raw) => {
      const a = String(raw || '').trim().toLowerCase();
      return (
        a === cleanTargetId ||
        (cleanTargetName && a === cleanTargetName) ||
        (cleanTargetRoc && a === cleanTargetRoc)
      );
    });
  };

  // Company select options for the top filter
  const companyFilterOptions: Select2Option[] = useMemo(() => {
    const opts: Select2Option[] = [
      {
        value: 'ALL',
        label: 'All Companies',
        badge: String(employees.length),
      },
    ];

    companies.forEach((comp) => {
      const count = employees.filter((emp) => isEmployeeAssignedToCompany(emp, comp.id)).length;
      opts.push({
        value: comp.id,
        label: comp.name,
        subLabel: comp.roc ? `ROC: ${comp.roc}` : (comp.sector || undefined),
        badge: String(count),
      });
    });

    return opts;
  }, [companies, employees]);

  // Filtered employee list by Company Filter & Search Term
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Company filter
      if (!isEmployeeAssignedToCompany(emp, selectedCompanyId)) return false;

      // 2. Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        emp.name.toLowerCase().includes(term) ||
        emp.employee_code.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term)
      );
    });
  }, [employees, selectedCompanyId, searchTerm, companies]);

  const activeCount = useMemo(() => {
    return filteredEmployees.filter((e) => e.status === 'active').length;
  }, [filteredEmployees]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 text-xs animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-3 text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner with Top Company Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
              Employees
            </h1>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
              {filteredEmployees.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/superadmin/employees/resignations"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all no-underline"
            >
              <FileText size={14} className="text-rose-600" />
              <span>Resignations</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsCardModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
            >
              <SlidersHorizontal size={14} />
              <span>Cards</span>
            </button>

            <Link
              href="/superadmin/employees/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-[#083a7c] text-white shadow-xs transition-all no-underline cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Employee</span>
            </Link>
          </div>
        </div>

        {/* Top Company Filter Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
            <Building2 size={15} className="text-[#0b4da2]" />
            <span>Company:</span>
          </div>
          <div className="w-full sm:w-80">
            <Select2Search
              options={companyFilterOptions}
              value={selectedCompanyId}
              onChange={(val) => setSelectedCompanyId(val || 'ALL')}
              placeholder="All Companies"
              searchPlaceholder="Search company..."
              icon={<Building2 size={14} className="text-slate-400" />}
            />
          </div>
          {selectedCompanyId !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedCompanyId('ALL')}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer w-fit"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards (Exact Dashboard Card Design, Dynamic from Card Priority Config) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => {
          let value: number = 0;
          let themeColor = 'text-slate-900';
          let iconBg = 'bg-blue-50 text-[#0b4da2]';

          if (card.id === 'total_accounts') {
            value = filteredEmployees.length;
            themeColor = 'text-slate-900';
            iconBg = 'bg-blue-50 text-[#0b4da2]';
          } else if (card.id === 'active_logins') {
            value = activeCount;
            themeColor = 'text-emerald-600';
            iconBg = 'bg-emerald-50 text-emerald-600';
          } else if (card.id === 'available_companies') {
            value = selectedCompanyId === 'ALL' ? companies.length : 1;
            themeColor = 'text-slate-900';
            iconBg = 'bg-indigo-50 text-indigo-600';
          }

          return (
            <div
              key={card.id}
              className="admin-stat-card bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between group min-h-[92px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
                  {card.title}
                </span>
                <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                  <DynamicCardIcon icon={card.icon} size={15} />
                </div>
              </div>
              <div className={`text-2xl font-bold tracking-tight font-mono ${themeColor}`}>
                {value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employees..."
            className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg pl-10 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 bg-transparent border-0 cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedCompanyId !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
              <Building2 size={12} className="text-slate-500" />
              <span className="max-w-[200px] truncate">{companies.find((c) => String(c.id) === String(selectedCompanyId))?.name}</span>
              <button
                type="button"
                onClick={() => setSelectedCompanyId('ALL')}
                className="hover:text-slate-900 p-0.5 bg-transparent border-0 cursor-pointer"
                title="Clear filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong>{filteredEmployees.length}</strong> of {employees.length} employees
          </span>
        </div>
      </div>

      {/* Employee Table with Signature Green Header */}
      <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#22a34a] text-white text-xs font-bold">
              <th className="py-3 px-4 border-r border-green-600/60 w-[24%]">
                Employee Name
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[26%]">
                Company Access
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 text-center w-[20%]">
                Permissions
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 text-center w-[18%]">
                Status
              </th>
              <th className="py-3 px-4 text-right w-[12%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredEmployees.map((emp) => {
              const assignedIds = Array.isArray(emp.assigned_companies) ? emp.assigned_companies : [];
              const assignedCompanyObjects = companies.filter((c) => assignedIds.includes(c.id));
              const perms = emp.module_permissions || {
                companies: { view: true, edit: emp.can_edit, delete: emp.can_delete },
                customers: { view: true, create: emp.can_create, edit: emp.can_edit, delete: emp.can_delete },
                services: { view: true },
                passwords: { view: false },
              };

              return (
                <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                  {/* Employee Name (Only Name) */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <span className="font-bold text-slate-900 block text-xs sm:text-[13px]">
                      {emp.name}
                    </span>
                  </td>

                  {/* Assigned Companies */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {assignedCompanyObjects.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">None</span>
                      ) : assignedCompanyObjects.length === companies.length ? (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          All Companies
                        </span>
                      ) : (
                        assignedCompanyObjects.map((c) => (
                          <span
                            key={c.id}
                            className="inline-block text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded"
                          >
                            {c.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  {/* Module Permissions Matrix Badges */}
                  <td className="py-3.5 px-4 border-r border-slate-200 text-center align-middle">
                    <div className="flex flex-col gap-1 items-start justify-center max-w-[200px] mx-auto text-[10px]">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-500 font-semibold">Companies:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded ${
                            perms.companies?.view
                              ? perms.companies?.delete
                                ? 'bg-red-50 text-red-700'
                                : perms.companies?.edit
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {perms.companies?.view
                            ? perms.companies?.delete
                              ? 'Full'
                              : perms.companies?.edit
                              ? 'Edit'
                              : 'View'
                            : 'None'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-500 font-semibold">Customers:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded ${
                            perms.customers?.view
                              ? perms.customers?.delete
                                ? 'bg-red-50 text-red-700'
                                : perms.customers?.create || perms.customers?.edit
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {perms.customers?.view
                            ? perms.customers?.delete
                              ? 'Full'
                              : perms.customers?.create && perms.customers?.edit
                              ? 'Create/Edit'
                              : perms.customers?.edit
                              ? 'Edit'
                              : 'View'
                            : 'None'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-500 font-semibold">Services:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded ${
                            perms.services?.view
                              ? perms.services?.delete
                                ? 'bg-red-50 text-red-700'
                                : perms.services?.edit
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {perms.services?.view ? (perms.services?.edit ? 'Edit' : 'View') : 'None'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Employee Active / Inactive Toggle Switch & Schedule Modal Trigger */}
                  <td className="py-3 px-4 border-r border-slate-200 text-center align-middle" suppressHydrationWarning>
                    <div className="flex flex-col items-center justify-center gap-1.5 py-0.5" suppressHydrationWarning>
                      <button
                        type="button"
                        onClick={() => handleOpenStatusModal(emp)}
                        className="group inline-flex items-center gap-2 p-1 px-2.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        title="Click to manage instant status or schedule active/inactive date"
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            emp.status === 'active' ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              emp.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </span>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            emp.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {emp.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </button>

                      {/* Live Scheduled Transition Countdown Badge (Appears when date-wise status is given) */}
                      {emp.status_scheduled_date && (() => {
                        const cd = getCountdownInfo(emp.status_scheduled_date, emp.status_scheduled_action);
                        if (cd.status === 'none') return null;
                        const isAutoActive = emp.status_scheduled_action === 'active';
                        return (
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(emp)}
                            className={`inline-flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs group/cd hover:scale-[1.02] ${cd.color}`}
                            title={`Scheduled to ${isAutoActive ? 'Auto Activate' : 'Auto Deactivate'} on ${new Date(emp.status_scheduled_date).toLocaleString()} - Click to edit or clear`}
                            suppressHydrationWarning
                          >
                            <div className="inline-flex items-center gap-1 font-mono text-[11px] font-bold tabular-nums tracking-tight" suppressHydrationWarning>
                              <Clock size={11} className="shrink-0 animate-pulse text-current" />
                              <span>{mounted ? cd.label : '...'}</span>
                            </div>
                            <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-90">
                              {isAutoActive ? 'Auto Activates' : 'Auto Deactivates'}
                            </div>
                          </button>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/superadmin/employees/resignations/new?employee_code=${emp.employee_code}`}
                        title="Issue Resignation & Clearance"
                        className="w-8 h-8 rounded border border-rose-200 bg-white hover:bg-rose-50 flex items-center justify-center text-rose-600 hover:text-rose-700 transition-colors no-underline shadow-2xs"
                      >
                        <UserMinus size={14} />
                      </Link>

                      <Link
                        href={`/superadmin/employees/edit?id=${emp.id}`}
                        title="Edit Employee & Permissions"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors no-underline shadow-2xs"
                      >
                        <Edit2 size={14} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(emp.id)}
                        title="Delete Employee"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-red-50 flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building2 size={32} className="text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600 m-0">No staff accounts found</p>
                    <p className="text-xs text-slate-400 m-0">
                      {selectedCompanyId !== 'ALL'
                        ? `No staff members are assigned to "${companies.find((c) => String(c.id) === String(selectedCompanyId))?.name || 'this company'}".`
                        : searchTerm
                        ? `No employees matching "${searchTerm}".`
                        : 'No employees available.'}
                    </p>
                    {selectedCompanyId !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setSelectedCompanyId('ALL')}
                        className="mt-2 text-xs font-bold text-[#0b4da2] hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        Reset Company Filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 m-0 mb-1">
              Delete Employee?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to delete this employee?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDeleteEmployee(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-xs"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS & SCHEDULE MODAL */}
      {statusModalEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    statusModalEmployee.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Power size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 m-0">
                    Employee Status
                  </h3>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{statusModalEmployee.name}</span>
                    <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      {statusModalEmployee.employee_code}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer border-0 bg-transparent"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Tabs: Instant vs Scheduled */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setModalMode('instant')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                  modalMode === 'instant'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <Power size={14} className={modalMode === 'instant' ? 'text-blue-600' : ''} />
                <span>Instant</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('scheduled')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                  modalMode === 'scheduled'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <Calendar size={14} className={modalMode === 'scheduled' ? 'text-amber-600' : ''} />
                <span>Scheduled</span>
              </button>
            </div>

            {/* MODE 1: Instant Toggle */}
            {modalMode === 'instant' && (
              <div className="space-y-3 py-1">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setModalInstantStatus('active')}
                    className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all select-none ${
                      modalInstantStatus === 'active'
                        ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-300 text-emerald-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs">Active</span>
                  </div>

                  <div
                    onClick={() => setModalInstantStatus('inactive')}
                    className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all select-none ${
                      modalInstantStatus === 'inactive'
                        ? 'border-rose-400 bg-rose-50/80 ring-1 ring-rose-200 text-rose-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-xs">Inactive</span>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: Scheduled Status Change */}
            {modalMode === 'scheduled' && (
              <div className="space-y-3.5 py-1">
                {/* Target Action */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Action:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalScheduledAction('inactive')}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        modalScheduledAction === 'inactive'
                          ? 'border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <UserMinus size={14} className="text-rose-600" />
                      <span>Auto Deactivate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalScheduledAction('active')}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        modalScheduledAction === 'active'
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck size={14} className="text-emerald-600" />
                      <span>Auto Activate</span>
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Presets:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '+7 Days', days: 7 },
                      { label: '+15 Days', days: 15 },
                      { label: '+30 Days', days: 30 },
                      { label: '+60 Days', days: 60 },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          const target = new Date();
                          target.setDate(target.getDate() + preset.days);
                          const yyyy = target.getFullYear();
                          const mm = String(target.getMonth() + 1).padStart(2, '0');
                          const dd = String(target.getDate()).padStart(2, '0');
                          setModalScheduledDate(`${yyyy}-${mm}-${dd}`);
                          setModalScheduledTime('23:59');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Date & Time Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Date:
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={modalScheduledDate}
                      onChange={(e) => setModalScheduledDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Time:
                    </label>
                    <input
                      type="time"
                      value={modalScheduledTime}
                      onChange={(e) => setModalScheduledTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    />
                  </div>
                </div>

                {/* Live Countdown Preview Banner (Appears when date is set) */}
                {modalScheduledDate && (() => {
                  const targetStr = `${modalScheduledDate} ${modalScheduledTime || '23:59'}:00`;
                  const cd = getCountdownInfo(targetStr, modalScheduledAction);
                  if (cd.status === 'none') return null;
                  const isAutoActive = modalScheduledAction === 'active';
                  return (
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all shadow-2xs ${
                        isAutoActive
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                          : 'bg-amber-50/90 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                            isAutoActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <Clock size={16} className="animate-pulse" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Countdown:
                          </div>
                          <div className="text-sm font-mono font-extrabold tabular-nums tracking-tight">
                            ⏳ {cd.label}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                          isAutoActive
                            ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-200 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isAutoActive ? 'Activate' : 'Deactivate'}
                      </span>
                    </div>
                  );
                })()}

                {/* Existing Schedule Notice with Live Countdown */}
                {statusModalEmployee.status_scheduled_date && (() => {
                  const existingCd = getCountdownInfo(
                    statusModalEmployee.status_scheduled_date,
                    statusModalEmployee.status_scheduled_action
                  );
                  const isAutoActive = statusModalEmployee.status_scheduled_action === 'active';
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between text-xs text-slate-800 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <Clock size={16} className="animate-spin-slow" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Active Schedule:
                          </div>
                          <div className="text-xs font-mono font-bold text-amber-900 tabular-nums">
                            ⏳ {existingCd.label} left
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {isAutoActive ? 'Auto Activate' : 'Auto Deactivate'}:{' '}
                            <strong>{new Date(statusModalEmployee.status_scheduled_date).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSchedule}
                        className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        Clear Schedule
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setStatusModalEmployee(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingStatus}
                onClick={handleSaveStatusModal}
                className="px-5 py-2 bg-[#0b4da2] hover:bg-[#083a7c] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-0 shadow-xs disabled:opacity-50"
              >
                {isSavingStatus ? 'Saving...' : 'Apply Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Priority & Customization Modal */}
      <CardPriorityModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cards={cards}
        onSave={handleSaveCards}
        onReset={handleResetCards}
        pageTitle="Employees"
      />
    </div>
  );
}
