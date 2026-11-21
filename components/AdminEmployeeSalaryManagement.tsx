'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Receipt,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Building2,
  Download,
  Printer,
  ChevronDown,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  X,
  CreditCard,
  Check,
  RotateCcw,
  ArrowLeft,
  Calendar,
  Lock,
  ShieldCheck,
  Award,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDashboardCardDesign } from '@/lib/themeSettings';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';

export interface EmployeeItem {
  id: number;
  employee_code: string;
  name: string;
  email?: string;
  role?: string;
  status?: string;
  assigned_companies?: string[];
  created_at?: string;
}

export interface EmployeeSalaryRecord {
  id?: number;
  employee_id: number;
  employee_code: string;
  name: string;
  email: string;
  role: string;
  company_name: string;
  month_year: string;
  date?: string;
  basic_salary: number;
  daily_rate: number;
  present_days: number;
  holiday_days: number;
  mc_days?: number;
  total_paid_days: number;
  earned_basic_salary: number;
  overtime_hours: number;
  overtime_amount: number;
  sales_commission: number;
  bonus: number;
  transport: number;
  deductions: number;
  net_payable: number;
  status: 'paid' | 'pending' | 'processing';
  payment_method: string;
  payment_date?: string;
  notes?: string;
}

interface AdminEmployeeSalaryManagementProps {
  portalType?: 'superadmin' | 'masteradmin';
  adminName?: string;
}

const STORAGE_KEY = 'superadmin_employee_salaries_v2';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminEmployeeSalaryManagement({
  portalType = 'superadmin',
  adminName = 'Super Admin',
}: AdminEmployeeSalaryManagementProps) {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';

  // Navigation View: 'list' or full-page 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<EmployeeSalaryRecord[]>([]);
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<EmployeeSalaryRecord>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Filters: Company, Employee, Month, Year, Date-wise (Start/End Date), Search, Status
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'processing'>('all');

  // Export State & Ref
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Editing state for full-page edit
  const [editingRecord, setEditingRecord] = useState<EmployeeSalaryRecord | null>(null);
  const [formSalesCommission, setFormSalesCommission] = useState<number>(0);
  const [formBonus, setFormBonus] = useState<number>(0);
  const [formTransport, setFormTransport] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'paid' | 'pending' | 'processing'>('paid');
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('Bank Transfer');
  const [formPaymentDate, setFormPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Payslip Modal State
  const [viewingPayslip, setViewingPayslip] = useState<EmployeeSalaryRecord | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  // Load local overrides
  const loadLocalOverrides = (): Record<string, Partial<EmployeeSalaryRecord>> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveLocalOverrides = (data: Record<string, Partial<EmployeeSalaryRecord>>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLocalOverrides(data);
    } catch (err) {
      console.error('Failed to save salary overrides', err);
    }
  };

  // Fetch data from backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const monthYear = `${selectedYear}-${selectedMonth}`;

    try {
      // 1. Load companies directly from backend or fallback to storage
      try {
        const fetchedCos = await fetchCompaniesFromBackend();
        if (Array.isArray(fetchedCos) && fetchedCos.length > 0) {
          setCompanies(fetchedCos);
        } else {
          setCompanies(getStoredCompanies());
        }
      } catch {
        setCompanies(getStoredCompanies());
      }

      // Always load full employees list to populate Employee filter dropdown
      try {
        const empRes = await fetch(`${apiBase}/employees`, { cache: 'no-store' });
        if (empRes.ok) {
          const empData = await empRes.json();
          if (Array.isArray(empData)) {
            setEmployees(empData);
          }
        }
      } catch (err) {
        console.warn('Could not load employees list:', err);
      }

      // 2. Fetch employee salaries from backend API
      let url = `${apiBase}/employee-salaries?month_year=${monthYear}`;
      if (selectedCompany !== 'ALL') {
        url += `&company_name=${encodeURIComponent(selectedCompany)}`;
      }
      if (selectedEmployee !== 'ALL') {
        url += `&employee_code=${encodeURIComponent(selectedEmployee)}`;
      }
      if (startDate) {
        url += `&start_date=${startDate}`;
      }
      if (endDate) {
        url += `&end_date=${endDate}`;
      }

      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSalaryRecords(data);
          setHasFetched(true);
          setIsLoading(false);
          return;
        }
      }
      setSalaryRecords([]);
      setHasFetched(true);
    } catch (err) {
      console.error('Failed to load salary data:', err);
      setSalaryRecords([]);
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, selectedYear, selectedMonth, selectedCompany, selectedEmployee, startDate, endDate]);

  useEffect(() => {
    setLocalOverrides(loadLocalOverrides());
    loadData();
  }, [loadData]);

  // Click outside listener for export dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Merge backend / employee records with local overrides
  const processedRecords: EmployeeSalaryRecord[] = useMemo(() => {
    const monthYear = `${selectedYear}-${selectedMonth}`;

    // If backend returned records, enrich with local overrides
    if (salaryRecords.length > 0) {
      return salaryRecords.map((r) => {
        const override = localOverrides[`${r.employee_code}_${monthYear}`] || {};
        const sc = override.sales_commission !== undefined ? override.sales_commission : r.sales_commission;
        const bn = override.bonus !== undefined ? override.bonus : r.bonus;
        const tr = override.transport !== undefined ? override.transport : r.transport;
        const st = (override.status || r.status || 'paid') as 'paid' | 'pending' | 'processing';
        const pm = override.payment_method || r.payment_method || 'Bank Transfer';
        const pd = override.payment_date || r.payment_date || r.date || `${monthYear}-01`;
        const nt = override.notes !== undefined ? override.notes : r.notes;

        const net = Math.max(0, (r.earned_basic_salary || 0) + (r.overtime_amount || 0) + sc + bn + tr - (r.deductions || 0));

        return {
          ...r,
          date: r.date || pd,
          mc_days: r.mc_days !== undefined ? r.mc_days : 0,
          sales_commission: sc,
          bonus: bn,
          transport: tr,
          net_payable: Math.round(net * 100) / 100,
          status: st,
          payment_method: pm,
          payment_date: pd,
          notes: nt,
        };
      });
    }

    // When backend has finished fetching and returned empty, show empty list (no dummy mock staff)
    if (hasFetched) {
      return [];
    }

    return [];
  }, [salaryRecords, hasFetched, localOverrides, selectedYear, selectedMonth]);

  // Comprehensive company options derived from backend companies and loaded records
  const allCompanyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    companies.forEach((c) => {
      if (c && c.name && c.name.trim()) {
        map.set(c.name.trim().toLowerCase(), {
          id: String(c.id || c.name),
          name: c.name.trim(),
        });
      }
    });

    employees.forEach((emp) => {
      if (emp.assigned_companies && emp.assigned_companies.length > 0) {
        emp.assigned_companies.forEach((ac) => {
          const norm = String(ac).trim().toLowerCase();
          if (!map.has(norm)) {
            const found = companies.find((c) => String(c.id).toLowerCase() === norm || c.name.toLowerCase() === norm);
            if (found) {
              map.set(norm, { id: String(found.id), name: found.name });
            } else {
              const displayName = ac.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
              map.set(norm, { id: ac, name: displayName });
            }
          }
        });
      }
    });

    salaryRecords.forEach((r) => {
      if (r.company_name && r.company_name.trim()) {
        const norm = r.company_name.trim().toLowerCase();
        if (!map.has(norm)) {
          map.set(norm, { id: r.company_name, name: r.company_name.trim() });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, employees, salaryRecords]);

  // Employee options for the Employee filter (filtered by company if selected)
  const employeeOptions = useMemo(() => {
    const map = new Map<string, { id: string | number; name: string; code: string; role?: string }>();

    const matchesCompany = (assigned?: string[], compName?: string) => {
      if (selectedCompany === 'ALL') return true;
      const target = selectedCompany.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (compName && compName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(target)) return true;
      if (!assigned || assigned.length === 0) return false;
      return assigned.some((c) => {
        const norm = String(c).toLowerCase().replace(/[^a-z0-9]/g, '');
        return norm === target || norm.includes(target) || target.includes(norm);
      });
    };

    // 1. From loaded employees
    employees.forEach((emp) => {
      if (!matchesCompany(emp.assigned_companies)) return;
      const code = emp.employee_code || `EMP-${emp.id}`;
      map.set(code, {
        id: emp.id,
        name: emp.name,
        code,
        role: emp.role,
      });
    });

    // 2. Also include from salary records
    salaryRecords.forEach((rec) => {
      if (!matchesCompany(undefined, rec.company_name)) return;
      if (!map.has(rec.employee_code)) {
        map.set(rec.employee_code, {
          id: rec.employee_id || rec.employee_code,
          name: rec.name,
          code: rec.employee_code,
          role: rec.role,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, salaryRecords, selectedCompany]);

  // Filtered records: fully applies Company, Employee, Status, and Search
  const filteredRecords = useMemo(() => {
    return processedRecords.filter((rec) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;

      // 2. Company Filter (client validation fallback)
      if (selectedCompany !== 'ALL') {
        const selNorm = selectedCompany.toLowerCase().replace(/[^a-z0-9]/g, '');
        const recNorm = (rec.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!recNorm.includes(selNorm) && !selNorm.includes(recNorm)) {
          return false;
        }
      }

      // 3. Employee Filter (client validation fallback)
      if (selectedEmployee !== 'ALL') {
        const sel = selectedEmployee.toLowerCase().trim();
        const empCode = (rec.employee_code || '').toLowerCase().trim();
        const empId = String(rec.employee_id || '').trim();
        const empName = (rec.name || '').toLowerCase().trim();
        if (empCode !== sel && empId !== sel && empName !== sel) {
          return false;
        }
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.name.toLowerCase().includes(q) ||
          rec.employee_code.toLowerCase().includes(q) ||
          (rec.email && rec.email.toLowerCase().includes(q)) ||
          (rec.company_name && rec.company_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [processedRecords, statusFilter, selectedCompany, selectedEmployee, searchQuery]);

  // KPI Metrics
  const totalEmployeesCount = filteredRecords.length;
  const totalPayrollAmount = filteredRecords.reduce((sum, r) => sum + r.net_payable, 0);
  const paidCount = filteredRecords.filter((r) => r.status === 'paid').length;
  const pendingCount = filteredRecords.filter((r) => r.status === 'pending').length;

  // Open Full-Page Edit
  const handleOpenEditPage = (rec: EmployeeSalaryRecord) => {
    setEditingRecord(rec);
    setFormSalesCommission(rec.sales_commission || 0);
    setFormBonus(rec.bonus || 0);
    setFormTransport(rec.transport || 0);
    setFormStatus(rec.status || 'paid');
    setFormPaymentMethod(rec.payment_method || 'Bank Transfer');
    setFormPaymentDate(rec.payment_date || new Date().toISOString().split('T')[0]);
    setFormNotes(rec.notes || '');
    setViewMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Live auto-calculated net payable in Edit Page
  const liveNetPayable = useMemo(() => {
    if (!editingRecord) return 0;
    const earned = Number(editingRecord.earned_basic_salary) || 0;
    const ot = Number(editingRecord.overtime_amount) || 0;
    const sc = Number(formSalesCommission) || 0;
    const bn = Number(formBonus) || 0;
    const tr = Number(formTransport) || 0;
    const ded = Number(editingRecord.deductions) || 0;
    return Math.max(0, Math.round((earned + ot + sc + bn + tr - ded) * 100) / 100);
  }, [editingRecord, formSalesCommission, formBonus, formTransport]);

  // Save changes from Edit Page
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setIsSaving(true);
    const monthYear = editingRecord.month_year || `${selectedYear}-${selectedMonth}`;
    const overrideKey = `${editingRecord.employee_code}_${monthYear}`;

    const updatePayload = {
      sales_commission: Number(formSalesCommission) || 0,
      bonus: Number(formBonus) || 0,
      transport: Number(formTransport) || 0,
      status: formStatus,
      payment_method: formPaymentMethod,
      payment_date: formPaymentDate,
      notes: formNotes,
    };

    // 1. Save locally
    const newOverrides = {
      ...localOverrides,
      [overrideKey]: updatePayload,
    };
    saveLocalOverrides(newOverrides);

    // 2. Persist to Backend API if ID exists
    try {
      if (editingRecord.id) {
        await fetch(`${apiBase}/employee-salaries/${editingRecord.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });
      }
    } catch (err) {
      console.warn('Backend update error, saved locally:', err);
    } finally {
      setIsSaving(false);
    }

    setNotification({
      type: 'success',
      message: `Salary for ${editingRecord.name} updated successfully.`,
    });
    setTimeout(() => setNotification(null), 4000);
    setViewMode('list');
    loadData();
  };

  // Reset Date Filter
  const handleResetDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // Export handlers
  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (filteredRecords.length === 0) {
      alert('No employee salary records found to export.');
      return;
    }

    const data = filteredRecords.map((r, idx) => ({
      '#': idx + 1,
      Date: r.date || r.payment_date || `${r.month_year}-01`,
      'Company Name': r.company_name,
      'Employee Name': r.name,
      'Employee ID': r.employee_code,
      Position: r.role || 'Staff Member',
      'Basic Salary': r.basic_salary,
      'Attended Days': r.present_days,
      Holidays: r.holiday_days,
      'Medical Leave': r.mc_days || 0,
      'Earned Salary': r.earned_basic_salary,
      'Overtime Hours': r.overtime_hours,
      'Overtime Pay': r.overtime_amount,
      'Sales Commission': r.sales_commission,
      Bonus: r.bonus,
      Transport: r.transport,
      Deductions: r.deductions,
      'Net Payable': r.net_payable,
      Status: r.status.toUpperCase(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 24 },
      { wch: 22 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Salaries');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `employee_salaries_${today}.xlsx`);
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (filteredRecords.length === 0) {
      alert('No employee salary records found to export.');
      return;
    }

    const headers = [
      '#',
      'Date',
      'Company Name',
      'Employee Name',
      'Employee ID',
      'Position',
      'Basic Salary',
      'Attended Days',
      'Holidays',
      'Medical Leave',
      'Earned Salary',
      'Overtime Hours',
      'Overtime Pay',
      'Sales Commission',
      'Bonus',
      'Transport',
      'Deductions',
      'Net Payable',
      'Status',
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      headers.join(','),
      ...filteredRecords.map((r, idx) =>
        [
          idx + 1,
          escapeCSV(r.date || r.payment_date || `${r.month_year}-01`),
          escapeCSV(r.company_name),
          escapeCSV(r.name),
          escapeCSV(r.employee_code),
          escapeCSV(r.role || 'Staff Member'),
          r.basic_salary,
          r.present_days,
          r.holiday_days,
          r.mc_days || 0,
          r.earned_basic_salary,
          r.overtime_hours,
          r.overtime_amount,
          r.sales_commission,
          r.bonus,
          r.transport,
          r.deductions,
          r.net_payable,
          escapeCSV(r.status.toUpperCase()),
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employee_salaries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // RENDER FULL PAGE EDIT VIEW
  // =========================================================================
  if (viewMode === 'edit' && editingRecord) {
    return (
      <div className="space-y-6">
        {/* Back and Page Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-0"
            >
              <ArrowLeft size={15} />
              <span>Back to Salary List</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 m-0">Edit Employee Salary</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingRecord.name} ({editingRecord.employee_code}) &bull; {editingRecord.company_name} &bull; Period: {MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                formStatus === 'paid'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : formStatus === 'processing'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              Status: {formStatus}
            </span>
          </div>
        </div>

        {/* 4 KPI Summary Cards for this Employee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Base Monthly Salary</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              RM {editingRecord.basic_salary.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Rate: RM {editingRecord.daily_rate}/day (26d base)</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Earned Salary</div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              RM {editingRecord.earned_basic_salary.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {editingRecord.total_paid_days} Days ({editingRecord.present_days} Attended + {editingRecord.holiday_days} Holidays/MC)
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overtime Pay (OT)</div>
            <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
              RM {editingRecord.overtime_amount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {editingRecord.overtime_hours} hrs OT &bull; Auto-calculated (1.5x)
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 shadow-xs">
            <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Net Payable</div>
            <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
              RM {liveNetPayable.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5 font-semibold">Total with current allowances</div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSaveEdit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Read-Only Auto-Calculated Details */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-slate-400" />
                  <h2 className="text-sm font-bold text-slate-900 m-0 uppercase tracking-wide">
                    Auto-Calculated Salary Breakdown
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  Read-Only (Settings Driven)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Staff Name</span>
                  <span className="text-xs font-bold text-slate-900 block mt-0.5">{editingRecord.name}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Employee Code</span>
                  <span className="text-xs font-mono font-bold text-blue-700 block mt-0.5">{editingRecord.employee_code}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Company</span>
                  <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate">{editingRecord.company_name}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Monthly Base Wage</span>
                  <span className="text-xs font-mono font-bold text-slate-900 block mt-0.5">RM {editingRecord.basic_salary.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Attended Days</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">{editingRecord.present_days} d</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Holidays &amp; MC</span>
                  <span className="text-sm font-bold text-blue-700 block mt-0.5">{editingRecord.holiday_days} d</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Paid Days</span>
                  <span className="text-sm font-bold text-emerald-700 block mt-0.5">{editingRecord.total_paid_days} d</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Earned Basic Salary</span>
                  <span className="text-sm font-mono font-black text-[#0b4da2] block mt-0.5">
                    RM {editingRecord.earned_basic_salary.toLocaleString()}
                  </span>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Overtime Pay (OT)</span>
                  <span className="text-sm font-mono font-black text-blue-800 block mt-0.5">
                    RM {editingRecord.overtime_amount.toLocaleString()} ({editingRecord.overtime_hours}h)
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Statutory Deductions (EPF/SOCSO)</span>
                  <span className="text-[11px] text-rose-600 mt-0.5 block">Standard monthly statutory cut</span>
                </div>
                <span className="text-sm font-mono font-bold text-rose-700">-RM {editingRecord.deductions.toLocaleString()}</span>
              </div>
            </div>

            {/* Right Card: ONLY 3 Editable Fields */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Edit2 size={16} className="text-[#0b4da2]" />
                  <h2 className="text-sm font-bold text-slate-900 m-0 uppercase tracking-wide">
                    Editable Allowances (3 Fields)
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Authorized Adjustments
                </span>
              </div>

              {/* Field 1: Sales Commission */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Sales Commission (RM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formSalesCommission}
                    onChange={(e) => setFormSalesCommission(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b4da2]/30 focus:border-[#0b4da2] text-sm font-mono font-bold text-slate-900 bg-white"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    RM
                  </span>
                </div>
              </div>

              {/* Field 2: Bonus */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Bonus (RM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formBonus}
                    onChange={(e) => setFormBonus(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b4da2]/30 focus:border-[#0b4da2] text-sm font-mono font-bold text-slate-900 bg-white"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    RM
                  </span>
                </div>
              </div>

              {/* Field 3: Transport */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  3. Transport (RM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formTransport}
                    onChange={(e) => setFormTransport(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b4da2]/30 focus:border-[#0b4da2] text-sm font-mono font-bold text-slate-900 bg-white"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    RM
                  </span>
                </div>
              </div>

              {/* Payment Status & Method */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Direct Deposit">Direct Deposit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={formPaymentDate}
                  onChange={(e) => setFormPaymentDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional notes regarding commission or bonus..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>
            </div>
          </div>

          {/* Bottom Live Net Pay Banner & Actions */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Net Payable for {editingRecord.name}
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
                RM {liveNetPayable.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Earned (RM {editingRecord.earned_basic_salary}) + OT (RM {editingRecord.overtime_amount}) + Comm (RM {formSalesCommission}) + Bonus (RM {formBonus}) + Transport (RM {formTransport}) - Ded (RM {editingRecord.deductions})
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition cursor-pointer border-0 disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Salary Updates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // RENDER LIST VIEW (DEFAULT)
  // =========================================================================
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

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Receipt size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                Employee Salary Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Export Dropdown Button */}
            <div className="relative inline-block text-left shrink-0" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer border border-emerald-700"
                title="Export Salary Records"
              >
                <Download size={14} className="shrink-0" />
                <span>Export</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Export ({filteredRecords.length} records)
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <FileText size={15} className="text-blue-600 shrink-0" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportOpen(false);
                      window.print();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent border-t border-slate-100"
                  >
                    <Printer size={15} className="text-purple-600 shrink-0" />
                    <span>Print Page</span>
                  </button>
                </div>
              )}
            </div>

            <Link
              href={portalType === 'masteradmin' ? '/masteradmin/employees' : '/superadmin/employees'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all no-underline"
            >
              <Users size={14} className="text-slate-600" />
              <span>Employees List</span>
            </Link>
          </div>
        </div>

        {/* TOP FILTER BAR: Company, Employee, Month, Year, Date-wise (Start/End Date) */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Company Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Building2 size={13} className="text-[#0b4da2]" />
              <span>Company</span>
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setSelectedEmployee('ALL');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Companies ({allCompanyOptions.length})</option>
              {allCompanyOptions.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Employee Filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 m-0">
                <Users size={13} className="text-[#0b4da2]" />
                <span>Employee</span>
              </label>
              {selectedEmployee !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedEmployee('ALL')}
                  className="text-[10px] text-blue-600 hover:text-blue-800 p-0 border-0 bg-transparent cursor-pointer font-bold"
                >
                  Clear
                </button>
              )}
            </div>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Employees ({employeeOptions.length})</option>
              {employeeOptions.map((emp) => (
                <option key={emp.code} value={emp.code}>
                  {emp.name} ({emp.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Month Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Calendar size={13} className="text-[#0b4da2]" />
              <span>Month</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              {MONTH_NAMES.map((name, idx) => {
                const val = String(idx + 1).padStart(2, '0');
                return (
                  <option key={val} value={val}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 4. Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Calendar size={13} className="text-[#0b4da2]" />
              <span>Year</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              {['2024', '2025', '2026', '2027'].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Date-wise Range */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 m-0">
                <Clock size={13} className="text-[#0b4da2]" />
                <span>Date Range</span>
              </label>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleResetDateFilter}
                  className="text-[10px] text-blue-600 hover:text-blue-800 p-0 border-0 bg-transparent cursor-pointer font-bold"
                >
                  Clear Date
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start"
                className="w-1/2 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End"
                className="w-1/2 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div
          className={`admin-stat-card transition-all flex flex-col justify-between min-h-[96px] ${
            isGlass
              ? 'dashboard-card-glass rounded-xl p-4'
              : 'bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
              Total Employees
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-slate-900 mt-2">
            {totalEmployeesCount}
          </div>
        </div>

        {/* Total Net Payroll */}
        <div
          className={`admin-stat-card transition-all flex flex-col justify-between min-h-[96px] ${
            isGlass
              ? 'dashboard-card-glass rounded-xl p-4'
              : 'bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
              Total Net Payroll
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-emerald-600 mt-2">
            RM {totalPayrollAmount.toLocaleString()}
          </div>
        </div>

        {/* Paid Salaries */}
        <div
          className={`admin-stat-card transition-all flex flex-col justify-between min-h-[96px] ${
            isGlass
              ? 'dashboard-card-glass rounded-xl p-4'
              : 'bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
              Salaries Paid
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-teal-600 mt-2">
            {paidCount}
          </div>
        </div>

        {/* Pending Salaries */}
        <div
          className={`admin-stat-card transition-all flex flex-col justify-between min-h-[96px] ${
            isGlass
              ? 'dashboard-card-glass rounded-xl p-4'
              : 'bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
              Pending / Due
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-amber-600 mt-2">
            {pendingCount}
          </div>
        </div>
      </div>

      {/* Search Bar & Status Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff, code, company..."
            className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg pl-10 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 bg-transparent border-0 cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'paid', 'pending', 'processing'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer border ${
                statusFilter === st
                  ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
          <span className="text-xs text-slate-500 ml-2 font-medium">
            Showing <strong>{filteredRecords.length}</strong> records
          </span>
          {(selectedCompany !== 'ALL' ||
            selectedEmployee !== 'ALL' ||
            startDate !== '' ||
            endDate !== '' ||
            searchQuery.trim() !== '' ||
            statusFilter !== 'all' ||
            selectedMonth !== String(new Date().getMonth() + 1).padStart(2, '0') ||
            selectedYear !== String(new Date().getFullYear())) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCompany('ALL');
                setSelectedEmployee('ALL');
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedMonth(String(new Date().getMonth() + 1).padStart(2, '0'));
                setSelectedYear(String(new Date().getFullYear()));
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-2 underline cursor-pointer border-0 bg-transparent inline-flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Salary Table */}
      <div
        className={`w-full max-w-full overflow-hidden rounded-xl shadow-xs relative z-10 ${
          isGlass ? 'dashboard-card-glass border border-white/50' : 'bg-white border border-slate-300'
        }`}
      >
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <table className="w-full min-w-[2150px] text-left border-collapse">
            <thead>
              <tr className="bg-[#0b4da2] text-white text-xs font-bold whitespace-nowrap select-none">
                <th className="py-3.5 px-3 border-r border-blue-600/60 text-center w-12">#</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Date</th>
                <th className="py-3.5 px-5 border-r border-blue-600/60 whitespace-nowrap">Company Name</th>
                <th className="py-3.5 px-5 border-r border-blue-600/60 whitespace-nowrap">Employee Name</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Employee ID</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Position</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Basic Salary</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Attended Days</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Holidays</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Medical Leave</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Earned Salary</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Overtime Hours</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Overtime Pay</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Sales Commission</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Bonus</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Transport</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Deductions</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Net Payable</th>
                <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-slate-400 font-medium">
                    Loading salary records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-slate-400 font-medium">
                    No employee salary records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, index) => (
                  <tr
                    key={rec.employee_id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="py-3 px-3 border-r border-slate-200 text-center font-mono font-medium text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-center font-mono text-slate-600 whitespace-nowrap">
                      {rec.date || rec.payment_date || `${rec.month_year}-01`}
                    </td>
                    <td className="py-3 px-5 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap">
                      {rec.company_name}
                    </td>
                    <td className="py-3 px-5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0b4da2] font-bold flex items-center justify-center shrink-0 border border-blue-200 text-xs">
                          {rec.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{rec.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 font-mono text-blue-600 font-semibold whitespace-nowrap">
                      {rec.employee_code}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                      {rec.role || 'Staff Member'}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      RM {Number(rec.basic_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-center font-mono text-emerald-700 font-semibold whitespace-nowrap">
                      {rec.present_days}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-center font-mono text-slate-700 font-semibold whitespace-nowrap">
                      {rec.holiday_days}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-center font-mono text-blue-700 font-semibold whitespace-nowrap">
                      {rec.mc_days ?? 0}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      RM {Number(rec.earned_basic_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-center font-mono text-slate-700 font-medium whitespace-nowrap">
                      {rec.overtime_hours}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-blue-700 whitespace-nowrap">
                      RM {Number(rec.overtime_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap">
                      RM {Number(rec.sales_commission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap">
                      RM {Number(rec.bonus).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap">
                      RM {Number(rec.transport).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-rose-600 whitespace-nowrap">
                      RM {Number(rec.deductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40 whitespace-nowrap">
                      RM {Number(rec.net_payable).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rec.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : rec.status === 'processing'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingPayslip(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                          title="View Payslip"
                        >
                          <Eye size={12} />
                          <span>Payslip</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPage(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083c80] rounded-md transition-colors cursor-pointer border-0 shadow-2xs"
                          title="Edit Salary"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip View Modal */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Salary Payslip Preview</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083a7c] rounded-lg cursor-pointer border-0 shadow-xs"
                >
                  <Printer size={13} />
                  <span>Print Payslip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPayslip(null)}
                  className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg bg-transparent border-0 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Payslip Card */}
            <div className="p-8 space-y-6 bg-white" id="printable-payslip">
              <div className="flex items-center justify-between border-b pb-4 border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-[#0b4da2] m-0">{viewingPayslip.company_name}</h2>
                  <p className="text-xs text-slate-500 mt-1">Monthly Salary Payslip</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">
                    Period: {MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">Date: {viewingPayslip.payment_date}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">Staff Name</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{viewingPayslip.name}</div>
                  <div className="text-slate-500 mt-1">Designation: <strong className="text-slate-700">{viewingPayslip.role}</strong></div>
                </div>
                <div>
                  <div className="text-slate-400 font-semibold uppercase text-[10px]">Employee ID</div>
                  <div className="font-mono font-bold text-blue-700 text-sm mt-0.5">{viewingPayslip.employee_code}</div>
                  <div className="text-slate-500 mt-1">Payment Method: <strong className="text-slate-700">{viewingPayslip.payment_method}</strong></div>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Earnings</th>
                      <th className="py-2.5 px-4 text-right">Amount (RM)</th>
                      <th className="py-2.5 px-4 text-left border-l border-slate-200">Deductions</th>
                      <th className="py-2.5 px-4 text-right">Amount (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2 px-4">
                        Basic Salary (Earned)
                        <span className="block text-[10px] text-slate-400">
                          {viewingPayslip.total_paid_days} Paid Days ({viewingPayslip.present_days} Attended + {viewingPayslip.holiday_days} Holidays/MC)
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right font-mono">{viewingPayslip.earned_basic_salary.toLocaleString()}</td>
                      <td className="py-2 px-4 border-l border-slate-200">Statutory Deductions (EPF/SOCSO)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">-{viewingPayslip.deductions.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">Overtime Pay (OT) ({viewingPayslip.overtime_hours} hrs)</td>
                      <td className="py-2 px-4 text-right font-mono">+{viewingPayslip.overtime_amount.toLocaleString()}</td>
                      <td className="py-2 px-4 border-l border-slate-200">—</td>
                      <td className="py-2 px-4 text-right font-mono">—</td>
                    </tr>
                    {viewingPayslip.sales_commission > 0 && (
                      <tr>
                        <td className="py-2 px-4">Sales Commission</td>
                        <td className="py-2 px-4 text-right font-mono">+{viewingPayslip.sales_commission.toLocaleString()}</td>
                        <td className="py-2 px-4 border-l border-slate-200">—</td>
                        <td className="py-2 px-4 text-right font-mono">—</td>
                      </tr>
                    )}
                    {viewingPayslip.bonus > 0 && (
                      <tr>
                        <td className="py-2 px-4">Performance Bonus</td>
                        <td className="py-2 px-4 text-right font-mono">+{viewingPayslip.bonus.toLocaleString()}</td>
                        <td className="py-2 px-4 border-l border-slate-200">—</td>
                        <td className="py-2 px-4 text-right font-mono">—</td>
                      </tr>
                    )}
                    {viewingPayslip.transport > 0 && (
                      <tr>
                        <td className="py-2 px-4">Transport Allowance</td>
                        <td className="py-2 px-4 text-right font-mono">+{viewingPayslip.transport.toLocaleString()}</td>
                        <td className="py-2 px-4 border-l border-slate-200">—</td>
                        <td className="py-2 px-4 text-right font-mono">—</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <tr>
                      <td className="py-3 px-4">Total Earnings</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        RM {(viewingPayslip.earned_basic_salary + viewingPayslip.overtime_amount + viewingPayslip.sales_commission + viewingPayslip.bonus + viewingPayslip.transport).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 border-l border-slate-200">Total Deductions</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700">
                        -RM {viewingPayslip.deductions.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Net Pay Box */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">Net Payable Salary</span>
                  <span className="text-[11px] text-emerald-700">Status: <strong className="uppercase">{viewingPayslip.status}</strong></span>
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  RM {viewingPayslip.net_payable.toLocaleString()}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span>Computer Generated Salary Slip — No physical signature required.</span>
                <span>Verified by {adminName}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
