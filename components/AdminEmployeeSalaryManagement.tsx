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
  employee_id: number;
  employee_code: string;
  name: string;
  email: string;
  role: string;
  company_name: string;
  basic_salary: number;
  allowance: number;
  bonus: number;
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

const STORAGE_KEY = 'superadmin_employee_salaries';

export default function AdminEmployeeSalaryManagement({
  portalType = 'superadmin',
  adminName = 'Super Admin',
}: AdminEmployeeSalaryManagementProps) {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<Record<number, Partial<EmployeeSalaryRecord>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'processing'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Export State & Ref
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [editingEmp, setEditingEmp] = useState<EmployeeSalaryRecord | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<EmployeeSalaryRecord | null>(null);

  // Edit Form State
  const [formBasicSalary, setFormBasicSalary] = useState<number>(3500);
  const [formAllowance, setFormAllowance] = useState<number>(300);
  const [formBonus, setFormBonus] = useState<number>(0);
  const [formDeductions, setFormDeductions] = useState<number>(200);
  const [formStatus, setFormStatus] = useState<'paid' | 'pending' | 'processing'>('paid');
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('Bank Transfer');
  const [formNotes, setFormNotes] = useState<string>('');

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  // Load custom salaries from localStorage
  const loadStoredSalaries = (): Record<number, Partial<EmployeeSalaryRecord>> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveStoredSalaries = (data: Record<number, Partial<EmployeeSalaryRecord>>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSalaryRecords(data);
    } catch (err) {
      console.error('Failed to save salaries to localStorage', err);
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load companies
      const storedCos = getStoredCompanies();
      if (storedCos.length > 0) {
        setCompanies(storedCos);
      } else {
        const fetchedCos = await fetchCompaniesFromBackend();
        setCompanies(fetchedCos);
      }

      // Load employees
      const res = await fetch(`${apiBase}/employees`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmployees(data);
        }
      }
    } catch (err) {
      console.error('Failed to load employee salary data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    setSalaryRecords(loadStoredSalaries());
    loadData();
  }, [loadData]);

  // Handle click outside for export dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compute merged salary records for all employees
  const processedRecords: EmployeeSalaryRecord[] = useMemo(() => {
    return employees.map((emp) => {
      const stored = salaryRecords[emp.id] || {};
      const baseSalary = stored.basic_salary !== undefined ? stored.basic_salary : 3500;
      const allowance = stored.allowance !== undefined ? stored.allowance : 300;
      const bonus = stored.bonus !== undefined ? stored.bonus : 0;
      const deductions = stored.deductions !== undefined ? stored.deductions : 200;
      const netPayable = baseSalary + allowance + bonus - deductions;
      const status = stored.status || 'paid';
      const paymentMethod = stored.payment_method || 'Bank Transfer';

      // Find company name
      let compName = 'All Companies';
      if (emp.assigned_companies && emp.assigned_companies.length > 0) {
        const firstCompId = emp.assigned_companies[0];
        const match = companies.find((c) => String(c.id) === String(firstCompId) || c.name === firstCompId);
        compName = match ? match.name : firstCompId;
      }

      return {
        employee_id: emp.id,
        employee_code: emp.employee_code || `EMP-${emp.id}`,
        name: emp.name || 'Staff Member',
        email: emp.email || '—',
        role: emp.role || 'Employee',
        company_name: compName,
        basic_salary: baseSalary,
        allowance,
        bonus,
        deductions,
        net_payable: netPayable > 0 ? netPayable : 0,
        status,
        payment_method: paymentMethod,
        payment_date: stored.payment_date || new Date().toISOString().split('T')[0],
        notes: stored.notes || '',
      };
    });
  }, [employees, salaryRecords, companies]);

  // Filtered list
  const filteredRecords = useMemo(() => {
    return processedRecords.filter((rec) => {
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
      if (selectedCompanyId !== 'ALL' && !rec.company_name.toLowerCase().includes(selectedCompanyId.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.name.toLowerCase().includes(q) ||
          rec.employee_code.toLowerCase().includes(q) ||
          rec.email.toLowerCase().includes(q) ||
          rec.company_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [processedRecords, statusFilter, selectedCompanyId, searchQuery]);

  // Summary Metrics
  const totalEmployeesCount = filteredRecords.length;
  const totalPayrollAmount = filteredRecords.reduce((sum, r) => sum + r.net_payable, 0);
  const paidCount = filteredRecords.filter((r) => r.status === 'paid').length;
  const pendingCount = filteredRecords.filter((r) => r.status === 'pending').length;

  // Edit Salary Modal Open
  const handleOpenEdit = (rec: EmployeeSalaryRecord) => {
    setEditingEmp(rec);
    setFormBasicSalary(rec.basic_salary);
    setFormAllowance(rec.allowance);
    setFormBonus(rec.bonus);
    setFormDeductions(rec.deductions);
    setFormStatus(rec.status);
    setFormPaymentMethod(rec.payment_method);
    setFormNotes(rec.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;

    const updatedData: Record<number, Partial<EmployeeSalaryRecord>> = {
      ...salaryRecords,
      [editingEmp.employee_id]: {
        basic_salary: Number(formBasicSalary) || 0,
        allowance: Number(formAllowance) || 0,
        bonus: Number(formBonus) || 0,
        deductions: Number(formDeductions) || 0,
        status: formStatus,
        payment_method: formPaymentMethod,
        notes: formNotes,
        payment_date: new Date().toISOString().split('T')[0],
      },
    };

    saveStoredSalaries(updatedData);
    setEditingEmp(null);
    setNotification({
      type: 'success',
      message: `Salary for ${editingEmp.name} updated successfully!`,
    });
  };

  // Export handlers
  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (filteredRecords.length === 0) {
      alert('No employee salary records found to export.');
      return;
    }

    const data = filteredRecords.map((r, idx) => ({
      SL: idx + 1,
      'Employee Code': r.employee_code,
      'Staff Name': r.name,
      Email: r.email,
      Designation: r.role,
      Company: r.company_name,
      'Basic Salary (RM)': r.basic_salary,
      'Allowance (RM)': r.allowance,
      'Bonus (RM)': r.bonus,
      'Deductions (RM)': r.deductions,
      'Net Payable (RM)': r.net_payable,
      Status: r.status.toUpperCase(),
      'Payment Method': r.payment_method,
      'Payment Date': r.payment_date || '—',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 22 },
      { wch: 24 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
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
      'SL',
      'Employee Code',
      'Staff Name',
      'Email',
      'Designation',
      'Company',
      'Basic Salary (RM)',
      'Allowance (RM)',
      'Bonus (RM)',
      'Deductions (RM)',
      'Net Payable (RM)',
      'Status',
      'Payment Method',
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
          escapeCSV(r.employee_code),
          escapeCSV(r.name),
          escapeCSV(r.email),
          escapeCSV(r.role),
          escapeCSV(r.company_name),
          r.basic_salary,
          r.allowance,
          r.bonus,
          r.deductions,
          r.net_payable,
          escapeCSV(r.status.toUpperCase()),
          escapeCSV(r.payment_method),
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

  const handlePrint = () => {
    setIsExportOpen(false);
    if (filteredRecords.length === 0) {
      alert('No employee salary records found to print.');
      return;
    }
    window.print();
  };

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
              <p className="text-xs text-slate-500 mt-0.5">
                Manage monthly payrolls, base basic salaries, allowances, deductions, and payslips
              </p>
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
                    onClick={handlePrint}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent border-t border-slate-100"
                  >
                    <Printer size={15} className="text-purple-600 shrink-0" />
                    <span>Print / Save as PDF</span>
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

        {/* Top Filter Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Building2 size={15} className="text-[#0b4da2]" />
            <span>Company:</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Companies ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span>Payroll Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            />
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

        {/* Total Monthly Payroll */}
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
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#22a34a] text-white text-xs font-bold">
                <th className="py-3 px-3 border-r border-green-600/60 w-12 text-center">SL</th>
                <th className="py-3 px-4 border-r border-green-600/60">Employee & Code</th>
                <th className="py-3 px-4 border-r border-green-600/60">Company</th>
                <th className="py-3 px-3 border-r border-green-600/60 text-right">Basic (RM)</th>
                <th className="py-3 px-3 border-r border-green-600/60 text-right">Allowance</th>
                <th className="py-3 px-3 border-r border-green-600/60 text-right">Deductions</th>
                <th className="py-3 px-3 border-r border-green-600/60 text-right">Net Payable</th>
                <th className="py-3 px-3 border-r border-green-600/60 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Loading salary records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
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
                    <td className="py-3 px-4 border-r border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                          {rec.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{rec.name}</div>
                          <div className="text-[11px] font-mono text-blue-600 font-medium">{rec.employee_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-700 truncate max-w-[180px]">
                      {rec.company_name}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-semibold text-slate-800">
                      {rec.basic_salary.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono text-emerald-600 font-medium">
                      +{rec.allowance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono text-rose-600 font-medium">
                      -{rec.deductions.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50/70">
                      RM {rec.net_payable.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                    <td className="py-3 px-4 text-center">
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
                          onClick={() => handleOpenEdit(rec)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
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

      {/* Edit Salary Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">Edit Salary - {editingEmp.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{editingEmp.employee_code}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Basic Salary (RM)</label>
                  <input
                    type="number"
                    min="0"
                    value={formBasicSalary}
                    onChange={(e) => setFormBasicSalary(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Allowance (RM)</label>
                  <input
                    type="number"
                    min="0"
                    value={formAllowance}
                    onChange={(e) => setFormAllowance(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Performance Bonus (RM)</label>
                  <input
                    type="number"
                    min="0"
                    value={formBonus}
                    onChange={(e) => setFormBonus(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deductions (EPF/SOCSO) (RM)</label>
                  <input
                    type="number"
                    min="0"
                    value={formDeductions}
                    onChange={(e) => setFormDeductions(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Calculated Net Payable:</span>
                <span className="text-base font-extrabold text-[#0b4da2] font-mono">
                  RM {(Number(formBasicSalary) + Number(formAllowance) + Number(formBonus) - Number(formDeductions)).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Direct Deposit">Direct Deposit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Approved overtime included..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083a7c] rounded-lg shadow-xs transition-colors cursor-pointer border-0"
                >
                  Save Salary Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <div className="text-xs font-bold text-slate-900">Period: {selectedMonth}</div>
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
                      <td className="py-2 px-4">Basic Salary</td>
                      <td className="py-2 px-4 text-right font-mono">{viewingPayslip.basic_salary.toLocaleString()}</td>
                      <td className="py-2 px-4 border-l border-slate-200">Statutory Deductions (EPF/SOCSO)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">-{viewingPayslip.deductions.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">Allowances</td>
                      <td className="py-2 px-4 text-right font-mono">+{viewingPayslip.allowance.toLocaleString()}</td>
                      <td className="py-2 px-4 border-l border-slate-200">—</td>
                      <td className="py-2 px-4 text-right font-mono">—</td>
                    </tr>
                    {viewingPayslip.bonus > 0 && (
                      <tr>
                        <td className="py-2 px-4">Performance Bonus</td>
                        <td className="py-2 px-4 text-right font-mono">+{viewingPayslip.bonus.toLocaleString()}</td>
                        <td className="py-2 px-4 border-l border-slate-200">—</td>
                        <td className="py-2 px-4 text-right font-mono">—</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <tr>
                      <td className="py-3 px-4">Total Earnings</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        RM {(viewingPayslip.basic_salary + viewingPayslip.allowance + viewingPayslip.bonus).toLocaleString()}
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

