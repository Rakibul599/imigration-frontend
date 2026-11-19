'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
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
  RotateCcw,
  ShieldCheck,
  Shield,
  Coins,
  Calendar,
  Trash2,
  Plus,
  FileCheck2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';

export interface StatutoryContributionRecord {
  id: number | string;
  type: 'epf' | 'socso';
  company_id: string;
  company_name: string;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  employee_role?: string;
  basic_salary: number;
  amount: number; // total contribution
  employee_share: number;
  employer_share: number;
  month_year: string;
  status: 'paid' | 'pending' | 'processing';
  payment_method: string;
  reference_no?: string;
  notes?: string;
  created_at?: string;
}

export interface EmployeeItem {
  id: number;
  employee_code: string;
  name: string;
  email?: string;
  role?: string;
  status?: string;
  assigned_companies?: string[];
  basic_salary?: number;
}

interface AdminStatutoryContributionManagementProps {
  type: 'epf' | 'socso';
  portalType?: 'superadmin' | 'masteradmin';
  adminName?: string;
}

const SALARY_STORAGE_KEY = 'superadmin_employee_salaries';

export default function AdminStatutoryContributionManagement({
  type,
  portalType = 'superadmin',
  adminName = 'Super Admin',
}: AdminStatutoryContributionManagementProps) {
  const isEPF = type === 'epf';
  const labelPrefix = isEPF ? 'EPF' : 'SOCSO';
  const fullLabel = isEPF ? 'Employees Provident Fund (KWSP)' : 'Social Security Organisation (PERKESO)';
  const storageKey = isEPF ? 'superadmin_epf_records' : 'superadmin_socso_records';

  const [records, setRecords] = useState<StatutoryContributionRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Filters (No payment/status filter)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Export State & Ref
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StatutoryContributionRecord | null>(null);
  const [viewingStatement, setViewingStatement] = useState<StatutoryContributionRecord | null>(null);

  // Form State (No payment options: simply enter amounts and save with Date)
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formEmployeeId, setFormEmployeeId] = useState<string>('');
  const [formBasicSalary, setFormBasicSalary] = useState<number>(3500);
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formEmployeeShare, setFormEmployeeShare] = useState<number>(0);
  const [formEmployerShare, setFormEmployerShare] = useState<number>(0);
  const [formMonthYear, setFormMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formNotes, setFormNotes] = useState<string>('');

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  // Helper to get employee basic salary from Employee Management
  const getEmployeeSalaryFromManagement = useCallback((empId: number): number => {
    if (typeof window === 'undefined') return 3500;
    try {
      const storedSalariesRaw = localStorage.getItem(SALARY_STORAGE_KEY);
      if (storedSalariesRaw) {
        const storedSalaries = JSON.parse(storedSalariesRaw);
        if (storedSalaries[empId]?.basic_salary !== undefined) {
          return Number(storedSalaries[empId].basic_salary);
        }
      }
    } catch (e) {
      console.warn('Could not read stored salaries', e);
    }
    return 3500;
  }, []);

  // Load records from local storage
  const loadStoredRecords = (): StatutoryContributionRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveStoredRecords = (data: StatutoryContributionRecord[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      setRecords(data);
    } catch (err) {
      console.error('Failed to save statutory records to localStorage', err);
    }
  };

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Load companies
      const storedCos = getStoredCompanies();
      if (storedCos.length > 0) {
        setCompanies(storedCos);
      } else {
        const fetchedCos = await fetchCompaniesFromBackend();
        setCompanies(fetchedCos);
      }

      // 2. Load employees
      const resEmp = await fetch(`${apiBase}/employees`, { cache: 'no-store' });
      let loadedEmployees: EmployeeItem[] = [];
      if (resEmp.ok) {
        const empData = await resEmp.json();
        if (Array.isArray(empData)) {
          loadedEmployees = empData;
          setEmployees(empData);
        }
      }

      // 3. Load contributions from backend
      const resContrib = await fetch(`${apiBase}/attendance/contributions?type=${type}`, { cache: 'no-store' });
      if (resContrib.ok) {
        const contribData = await resContrib.json();
        if (Array.isArray(contribData) && contribData.length > 0) {
          setRecords(contribData);
          localStorage.setItem(storageKey, JSON.stringify(contribData));
          return;
        }
      }

      // Fallback to local storage if backend returned empty or offline
      const local = loadStoredRecords();
      if (local.length > 0) {
        setRecords(local);
      } else if (loadedEmployees.length > 0 && storedCos.length > 0) {
        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const firstCo = storedCos[0];
        const firstEmp = loadedEmployees[0];
        const baseSal = getEmployeeSalaryFromManagement(firstEmp.id);
        const empShare = isEPF ? 150 : 20;
        const emprShare = isEPF ? 200 : 40;
        const tot = empShare + emprShare;

        const sample: StatutoryContributionRecord = {
          id: Date.now(),
          type,
          company_id: firstCo.id,
          company_name: firstCo.name,
          employee_id: firstEmp.id,
          employee_code: firstEmp.employee_code || 'EMP-001',
          employee_name: firstEmp.name,
          employee_role: firstEmp.role || 'Employee',
          basic_salary: baseSal,
          amount: tot,
          employee_share: empShare,
          employer_share: emprShare,
          month_year: currentMonth,
          status: 'paid',
          payment_method: 'Recorded',
          reference_no: `${labelPrefix}-${currentMonth.replace('-', '')}-001`,
          notes: `Monthly statutory ${labelPrefix} contribution for ${firstEmp.name}`,
          created_at: new Date().toISOString(),
        };
        saveStoredRecords([sample]);
      }
    } catch (err) {
      console.error(`Failed to load ${type} data:`, err);
      const local = loadStoredRecords();
      if (local.length > 0) setRecords(local);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, type, storageKey, labelPrefix, isEPF, getEmployeeSalaryFromManagement]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click outside for export dropdown
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

  // Filtered employees based on selected company in Filter Bar or Modal
  const employeesForSelectedCompany = useMemo(() => {
    if (!formCompanyId || formCompanyId === 'ALL') return employees;
    return employees.filter((emp) => {
      if (!emp.assigned_companies || emp.assigned_companies.length === 0) return true;
      if (emp.assigned_companies.includes('*')) return true;
      return emp.assigned_companies.includes(formCompanyId);
    });
  }, [employees, formCompanyId]);

  // Select2 Options for Company
  const companySelectOptions: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Companies', badge: `${companies.length}` },
      ...companies.map((c) => ({
        value: c.id,
        label: c.name,
        subLabel: c.roc ? `ROC: ${c.roc}` : undefined,
        badge: c.totalWorkers ? `${c.totalWorkers} Workers` : undefined,
      })),
    ];
  }, [companies]);

  const modalCompanySelectOptions: Select2Option[] = useMemo(() => {
    return companies.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: c.roc ? `ROC: ${c.roc}` : undefined,
      badge: c.totalWorkers ? `${c.totalWorkers} Workers` : undefined,
    }));
  }, [companies]);

  // Select2 Options for Employee
  const employeeFilterOptions: Select2Option[] = useMemo(() => {
    let filtered = employees;
    if (selectedCompanyId !== 'ALL') {
      filtered = employees.filter((emp) => {
        if (!emp.assigned_companies || emp.assigned_companies.length === 0) return true;
        if (emp.assigned_companies.includes('*')) return true;
        return emp.assigned_companies.includes(selectedCompanyId);
      });
    }
    return [
      { value: 'ALL', label: 'All Employees', badge: `${filtered.length}` },
      ...filtered.map((emp) => ({
        value: String(emp.id),
        label: emp.name,
        subLabel: emp.employee_code,
        badge: emp.role || 'Employee',
      })),
    ];
  }, [employees, selectedCompanyId]);

  const modalEmployeeSelectOptions: Select2Option[] = useMemo(() => {
    return employeesForSelectedCompany.map((emp) => {
      const sal = getEmployeeSalaryFromManagement(emp.id);
      return {
        value: String(emp.id),
        label: emp.name,
        subLabel: `${emp.employee_code} • Basic: RM ${sal.toFixed(2)}`,
        badge: emp.role || 'Employee',
      };
    });
  }, [employeesForSelectedCompany, getEmployeeSalaryFromManagement]);

  // Filtered records (Filtered by Company, Employee, Month, and Search Query only)
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // 1. Company Filter
      if (selectedCompanyId !== 'ALL' && rec.company_id !== selectedCompanyId) {
        return false;
      }
      // 2. Employee Filter
      if (selectedEmployeeId !== 'ALL' && String(rec.employee_id) !== selectedEmployeeId) {
        return false;
      }
      // 3. Month Filter
      if (selectedMonth && rec.month_year && rec.month_year !== selectedMonth) {
        return false;
      }
      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.employee_name?.toLowerCase().includes(q);
        const matchCode = rec.employee_code?.toLowerCase().includes(q);
        const matchCompany = rec.company_name?.toLowerCase().includes(q);
        const matchNotes = rec.notes?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCompany && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [records, selectedCompanyId, selectedEmployeeId, selectedMonth, searchQuery]);

  // Computed summary stats
  const stats = useMemo(() => {
    const totalAmount = filteredRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalEmployeeShare = filteredRecords.reduce((sum, r) => sum + (Number(r.employee_share) || 0), 0);
    const totalEmployerShare = filteredRecords.reduce((sum, r) => sum + (Number(r.employer_share) || 0), 0);
    const uniqueEmployees = new Set(filteredRecords.map((r) => r.employee_id)).size;
    const uniqueCompanies = new Set(filteredRecords.map((r) => r.company_id)).size;

    return {
      totalAmount,
      totalEmployeeShare,
      totalEmployerShare,
      uniqueEmployees,
      uniqueCompanies,
      totalEntries: filteredRecords.length,
    };
  }, [filteredRecords]);

  // Handle Employee Selection in Modal -> load salary from Employee Management
  const handleModalEmployeeChange = (empIdStr: string) => {
    setFormEmployeeId(empIdStr);
    const numId = Number(empIdStr);
    if (!numId) return;

    const emp = employees.find((e) => e.id === numId);
    if (emp) {
      if (!formCompanyId && emp.assigned_companies && emp.assigned_companies[0] && emp.assigned_companies[0] !== '*') {
        setFormCompanyId(emp.assigned_companies[0]);
      }
      const salary = getEmployeeSalaryFromManagement(numId);
      setFormBasicSalary(salary);
    }
  };

  // Manual Handlers for Employee Share and Company Share
  const handleEmployeeShareChange = (val: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    setFormEmployeeShare(safeVal);
    const newTotal = Math.round((safeVal + formEmployerShare) * 100) / 100;
    setFormAmount(newTotal);
  };

  const handleEmployerShareChange = (val: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    setFormEmployerShare(safeVal);
    const newTotal = Math.round((formEmployeeShare + safeVal) * 100) / 100;
    setFormAmount(newTotal);
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    const initialCompanyId = selectedCompanyId !== 'ALL' ? selectedCompanyId : (companies[0]?.id || '');
    setFormCompanyId(initialCompanyId);

    const initialEmp = employees[0];
    const initialEmpId = initialEmp ? String(initialEmp.id) : '';
    setFormEmployeeId(initialEmpId);

    const sal = initialEmp ? getEmployeeSalaryFromManagement(initialEmp.id) : 3500;
    setFormBasicSalary(sal);

    setFormEmployeeShare(0);
    setFormEmployerShare(0);
    setFormAmount(0);

    setFormMonthYear(selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    setFormNotes('');
    setIsRecordModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (rec: StatutoryContributionRecord) => {
    setEditingRecord(rec);
    setFormCompanyId(rec.company_id);
    setFormEmployeeId(String(rec.employee_id));
    setFormBasicSalary(rec.basic_salary);
    setFormAmount(rec.amount);
    setFormEmployeeShare(rec.employee_share);
    setFormEmployerShare(rec.employer_share);
    setFormMonthYear(rec.month_year);
    setFormNotes(rec.notes || '');
    setIsRecordModalOpen(true);
  };

  // Save Modal Record (Pure Entry: Company, Employee, Shares, Date, and Notes)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompanyId) {
      alert('Please select a company.');
      return;
    }
    if (!formEmployeeId) {
      alert('Please select an employee.');
      return;
    }

    const finalEmployeeShare = Number(formEmployeeShare) || 0;
    const finalEmployerShare = Number(formEmployerShare) || 0;
    const finalTotalAmount = Number(formAmount) > 0 ? Number(formAmount) : Math.round((finalEmployeeShare + finalEmployerShare) * 100) / 100;

    if (finalTotalAmount <= 0) {
      alert('Please enter Employee Share or Employer Share amount.');
      return;
    }

    const co = companies.find((c) => c.id === formCompanyId);
    const emp = employees.find((e) => String(e.id) === formEmployeeId);
    const coName = co ? co.name : 'Company';
    const empName = emp ? emp.name : 'Employee';
    const empCode = emp ? emp.employee_code : `EMP-${formEmployeeId}`;
    const empRole = emp ? emp.role : 'Employee';

    const payload: StatutoryContributionRecord = {
      id: editingRecord ? editingRecord.id : Date.now(),
      type,
      company_id: formCompanyId,
      company_name: coName,
      employee_id: Number(formEmployeeId),
      employee_code: empCode,
      employee_name: empName,
      employee_role: empRole,
      basic_salary: Number(formBasicSalary) || 0,
      amount: finalTotalAmount,
      employee_share: finalEmployeeShare,
      employer_share: finalEmployerShare,
      month_year: formMonthYear,
      status: 'paid', // kept default internally for DB compatibility
      payment_method: 'Recorded', // kept default internally for DB compatibility
      reference_no: editingRecord?.reference_no,
      notes: formNotes.trim() || undefined,
      created_at: editingRecord?.created_at || new Date().toISOString(),
    };

    // Optimistically save locally
    let updatedList: StatutoryContributionRecord[];
    if (editingRecord) {
      updatedList = records.map((r) => (r.id === editingRecord.id ? payload : r));
    } else {
      updatedList = [payload, ...records];
    }
    saveStoredRecords(updatedList);
    setIsRecordModalOpen(false);
    showToast('success', `${labelPrefix} contribution record saved successfully!`);

    // Backend sync
    try {
      if (editingRecord && typeof editingRecord.id === 'number' && editingRecord.id < 1000000000) {
        await fetch(`${apiBase}/attendance/contributions/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch(`${apiBase}/attendance/contributions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.record) {
            const synced = updatedList.map((r) => (r.id === payload.id ? resData.record : r));
            saveStoredRecords(synced);
          }
        }
      }
    } catch (err) {
      console.warn('Backend sync failed, saved locally:', err);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (id: number | string, name: string) => {
    if (!confirm(`Are you sure you want to delete the ${labelPrefix} record for ${name}?`)) {
      return;
    }
    const updated = records.filter((r) => r.id !== id);
    saveStoredRecords(updated);
    showToast('info', `${labelPrefix} record deleted.`);

    try {
      if (typeof id === 'number' && id < 1000000000) {
        await fetch(`${apiBase}/attendance/contributions/${id}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        });
      }
    } catch (err) {
      console.warn('Backend delete failed, removed locally:', err);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (filteredRecords.length === 0) {
      alert('No contribution records to export.');
      return;
    }

    const data = filteredRecords.map((r, i) => ({
      SL: i + 1,
      'Contribution Type': labelPrefix,
      'Company Name': r.company_name,
      'Employee Code': r.employee_code,
      'Employee Name': r.employee_name,
      'Basic Salary (RM)': r.basic_salary.toFixed(2),
      'Employee Share (RM)': r.employee_share.toFixed(2),
      'Employer Share (RM)': r.employer_share.toFixed(2),
      'Total Contribution (RM)': r.amount.toFixed(2),
      'Period / Date': r.month_year,
      'Notes': r.notes || '—',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${labelPrefix}_Report`);
    XLSX.writeFile(workbook, `${labelPrefix}_Contributions_${selectedMonth || 'All'}.xlsx`);
  };

  // Export CSV
  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (filteredRecords.length === 0) {
      alert('No contribution records to export.');
      return;
    }
    const headers = [
      'SL',
      'Type',
      'Company Name',
      'Employee Code',
      'Employee Name',
      'Basic Salary',
      'Employee Share',
      'Employer Share',
      'Total Amount',
      'Period / Date',
      'Notes',
    ];
    const rows = filteredRecords.map((r, i) => [
      i + 1,
      labelPrefix,
      `"${r.company_name.replace(/"/g, '""')}"`,
      r.employee_code,
      `"${r.employee_name.replace(/"/g, '""')}"`,
      r.basic_salary.toFixed(2),
      r.employee_share.toFixed(2),
      r.employer_share.toFixed(2),
      r.amount.toFixed(2),
      r.month_year,
      `"${r.notes || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${labelPrefix}_Contributions_${selectedMonth || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-7 pb-16">
      {/* Top Banner / Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
              : 'bg-blue-50 text-blue-800 border border-blue-200 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className={notification.type === 'success' ? 'text-emerald-600' : 'text-blue-600'} />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Breadcrumb & Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href={portalType === 'masteradmin' ? '/masteradmin' : '/'} className="hover:text-slate-800 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-600">Attendance Management</span>
            <span>/</span>
            <span className={isEPF ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>{labelPrefix}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
              isEPF ? 'bg-gradient-to-br from-emerald-600 to-green-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'
            }`}>
              {isEPF ? <ShieldCheck size={22} /> : <Shield size={22} />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{labelPrefix} Statutory Contribution</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isEPF
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {fullLabel}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Record and manage monthly statutory deductions and employer contributions.
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Add Record Button */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
              isEPF
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            <Plus size={15} />
            <span>Record {labelPrefix}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} className="text-slate-500" />
              <span>Export</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <FileText size={15} className="text-blue-600" />
                  <span>Export CSV (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <Printer size={15} className="text-slate-600" />
                  <span>Print Document</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Stat Cards with Glass Theme (.dashboard-card-glass .admin-stat-card) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Contribution with Employee & Employer breakdown */}
        <div className="admin-stat-card dashboard-card-glass p-5 rounded-2xl transition-all flex flex-col justify-between min-h-[120px] group shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total {labelPrefix} Contributed</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              isEPF ? 'bg-emerald-600' : 'bg-blue-600'
            }`}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">RM</span>
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {stats.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2.5 text-[11px] font-mono flex-wrap">
            <span className="text-blue-700 font-bold bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/50" title="Employee Deduction">
              Employee: RM {stats.totalEmployeeShare.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/50" title="Employer Contribution">
              Employer: RM {stats.totalEmployerShare.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Contributing Employees */}
        <div className="admin-stat-card dashboard-card-glass p-5 rounded-2xl transition-all flex flex-col justify-between min-h-[120px] group shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contributing Employees</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900">
            {stats.uniqueEmployees}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {employees.length} Total Registered Employees
          </div>
        </div>

        {/* Card 3: Enrolled Companies */}
        <div className="admin-stat-card dashboard-card-glass p-5 rounded-2xl transition-all flex flex-col justify-between min-h-[120px] group shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contributing Companies</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900">
            {stats.uniqueCompanies}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {companies.length} Registered Employers
          </div>
        </div>

        {/* Card 4: Total Recorded Submissions (Replacing payment/settlement card) */}
        <div className="admin-stat-card dashboard-card-glass p-5 rounded-2xl transition-all flex flex-col justify-between min-h-[120px] group shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Entries</span>
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <FileCheck2 size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900">
            {stats.totalEntries}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Active submissions for {selectedMonth || 'All Months'}
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR: All 4 in ONE Single Row */}
      <div className="dashboard-card-glass p-4 sm:p-5 rounded-2xl shadow-xs relative z-30 !overflow-visible">
        <div className="flex items-center gap-3 w-full flex-nowrap relative z-30">
          {/* 1. Left: Search input (takes remaining space) */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${labelPrefix} by employee, code...`}
              className="w-full bg-white/80 focus:bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-0"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* 2. Company Select2 */}
          <div className="w-56 sm:w-60 lg:w-64 shrink-0 relative z-50">
            <Select2Search
              options={companySelectOptions}
              value={selectedCompanyId}
              onChange={(val) => {
                setSelectedCompanyId(val);
                setSelectedEmployeeId('ALL');
              }}
              placeholder="Filter by Company"
              icon={<Building2 size={13} className="text-slate-400" />}
              className="w-full"
            />
          </div>

          {/* 3. Employee Select2 */}
          <div className="w-56 sm:w-60 lg:w-64 shrink-0 relative z-40">
            <Select2Search
              options={employeeFilterOptions}
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              placeholder="Filter by Employee"
              icon={<Users size={13} className="text-slate-400" />}
              className="w-full"
            />
          </div>

          {/* 4. Month / Date Picker */}
          <div className="w-36 sm:w-40 lg:w-44 shrink-0 relative z-30">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-white/80 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all shadow-2xs cursor-pointer"
              title="Filter by Contribution Month / Date"
            />
          </div>
        </div>

        {/* Reset Filter Button if any filter active */}
        {(selectedCompanyId !== 'ALL' || selectedEmployeeId !== 'ALL' || searchQuery) && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 text-xs">
            <span className="text-slate-500 font-medium">
              Showing <strong>{filteredRecords.length}</strong> matching records
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCompanyId('ALL');
                setSelectedEmployeeId('ALL');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
            >
              <RotateCcw size={12} />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table with Glass Card Wrap and Horizontal Scroll */}
      <div className="dashboard-card-glass w-full max-w-full overflow-hidden rounded-2xl shadow-xs border border-white/50 relative z-10">
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <table className="w-full min-w-[2150px] text-left border-collapse">
            <thead>
              <tr className={`${isEPF ? 'bg-[#1f9343]' : 'bg-[#0b4da2]'} text-white text-xs font-bold whitespace-nowrap select-none`}>
                <th className={`py-4 px-4 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} text-center w-14`}>
                  #
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[280px]`}>
                  Company Name
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[150px] whitespace-nowrap`}>
                  Employee ID
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[240px]`}>
                  Employee Name
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[160px] whitespace-nowrap`}>
                  Position
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[180px] text-right whitespace-nowrap`}>
                  Basic Salary (RM)
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[180px] text-right whitespace-nowrap`}>
                  Employee Share (RM)
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[180px] text-right whitespace-nowrap`}>
                  Employer Share (RM)
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[200px] text-right whitespace-nowrap`}>
                  Total {labelPrefix} (RM)
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[150px] text-center whitespace-nowrap`}>
                  Period / Date
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[260px]`}>
                  Notes / Remarks
                </th>
                <th className="py-4 px-6 text-right min-w-[160px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {filteredRecords.map((record, index) => {
                return (
                  <tr key={record.id} className="hover:bg-blue-50/40 transition-colors group">
                    {/* 1. SL */}
                    <td className="py-4 px-4 border-r border-slate-200/70 align-middle text-center text-slate-400 font-mono font-medium">
                      {index + 1}
                    </td>

                    {/* 2. Company Name */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle font-bold text-slate-900">
                      {record.company_name}
                    </td>

                    {/* 3. Employee ID */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {record.employee_code}
                      </span>
                    </td>

                    {/* 4. Employee Name */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle font-bold text-blue-700">
                      {record.employee_name}
                    </td>

                    {/* 5. Position */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle whitespace-nowrap text-slate-600 font-medium">
                      {record.employee_role || 'Staff'}
                    </td>

                    {/* 6. Basic Salary (RM) */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      RM {record.basic_salary.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 7. Employee Share (RM) */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 inline-block shadow-2xs">
                        RM {record.employee_share.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* 8. Employer Share (RM) */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block shadow-2xs">
                        RM {record.employer_share.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* 9. Total Contribution (RM) */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-right whitespace-nowrap">
                      <span className={`font-mono font-black text-sm px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 inline-block ${
                        isEPF ? 'text-emerald-800' : 'text-blue-800'
                      }`}>
                        RM {record.amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* 10. Period / Date */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-700 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 inline-block">
                        {record.month_year}
                      </span>
                    </td>

                    {/* 11. Notes / Remarks */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-xs text-slate-600 max-w-[260px] truncate" title={record.notes}>
                      {record.notes || '—'}
                    </td>

                    {/* 12. Actions */}
                    <td className="py-4 px-6 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5">
                        {/* View Statement / Voucher Button */}
                        <button
                          type="button"
                          onClick={() => setViewingStatement(record)}
                          title={`View ${labelPrefix} Statement for ${record.employee_name}`}
                          className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(record)}
                          title="Edit Record"
                          className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(record.id, record.employee_name)}
                          title="Delete Record"
                          className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400 font-medium bg-slate-50/50">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-2.5">
                      <AlertCircle size={32} className="text-slate-300" />
                      <div className="font-bold text-slate-700 text-sm">
                        No {labelPrefix} records found
                      </div>
                      <p className="text-xs text-slate-500 m-0 leading-relaxed">
                        No statutory records match your current filter selection. Click &ldquo;Record {labelPrefix}&rdquo; to record a new contribution.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer Summary Row */}
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold text-xs border-t-2 border-slate-300 select-none">
                <tr>
                  <td colSpan={5} className="py-4 px-6 text-right uppercase tracking-wider text-slate-600 border-r border-slate-200/70">
                    Total ({filteredRecords.length} Records):
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 border-r border-slate-200/70 whitespace-nowrap">
                    RM {filteredRecords.reduce((sum, r) => sum + (r.basic_salary || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-bold text-blue-700 border-r border-slate-200/70 whitespace-nowrap">
                    RM {filteredRecords.reduce((sum, r) => sum + (r.employee_share || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-bold text-emerald-700 border-r border-slate-200/70 whitespace-nowrap">
                    RM {filteredRecords.reduce((sum, r) => sum + (r.employer_share || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-black text-slate-900 border-r border-slate-200/70 whitespace-nowrap">
                    RM {filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="py-4 px-6 bg-slate-100/50"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODAL: Record / Edit Contribution (Solid White Card, Crisp & Clean, No Payment Options) */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                  isEPF ? 'bg-emerald-600' : 'bg-blue-600'
                }`}>
                  {isEPF ? <ShieldCheck size={18} /> : <Shield size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRecord ? `Edit ${labelPrefix} Record` : `Record ${labelPrefix} Contribution`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {fullLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveRecord} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* 1. Company Select2 */}
              <div className="space-y-1.5 relative z-50">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-500" />
                  <span>Select Company</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Select2Search
                  options={modalCompanySelectOptions}
                  value={formCompanyId}
                  onChange={(val) => {
                    setFormCompanyId(val);
                  }}
                  placeholder="Choose Company..."
                  className="w-full"
                />
              </div>

              {/* 2. Employee Select2 */}
              <div className="space-y-1.5 relative z-40">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users size={13} className="text-slate-500" />
                  <span>Select Employee</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Select2Search
                  options={modalEmployeeSelectOptions}
                  value={formEmployeeId}
                  onChange={handleModalEmployeeChange}
                  placeholder="Choose Employee..."
                  className="w-full"
                />
              </div>

              {/* 3. Employee Basic Salary (Synced from Employee Management) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <CreditCard size={13} className="text-slate-500" />
                    <span>Employee Basic Salary</span>
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Synced from Employee Management
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formBasicSalary}
                      onChange={(e) => setFormBasicSalary(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Contribution Breakdown (Employee Cut & Employer Share) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Coins size={14} className={isEPF ? 'text-emerald-600' : 'text-blue-600'} />
                    <span>{labelPrefix} Contribution Breakdown</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Manual Entry
                  </span>
                </div>

                {/* Two Distinct Input Cards: Employee Share & Employer Share */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card A: Employee Share */}
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Users size={14} className="text-blue-600" />
                        <span>Employee Share</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-300">
                        Employee Cut
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-700 font-medium leading-tight">
                      Amount deducted directly from employee monthly salary
                    </p>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-blue-500">RM</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formEmployeeShare || ''}
                        onChange={(e) => handleEmployeeShareChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full bg-white border border-blue-300 rounded-lg pl-11 pr-3 py-2 text-sm font-mono font-bold text-blue-950 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Card B: Company Share */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Building2 size={14} className="text-emerald-600" />
                        <span>Company Share</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Employer Paid
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium leading-tight">
                      Amount contributed directly by the employer from company fund
                    </p>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-emerald-500">RM</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formEmployerShare || ''}
                        onChange={(e) => handleEmployerShareChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full bg-white border border-emerald-300 rounded-lg pl-11 pr-3 py-2 text-sm font-mono font-bold text-emerald-950 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Card C: Total Statutory Contribution Summary Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <Coins size={14} className="text-amber-400" />
                      <span>Total Statutory Contribution</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                      Employee Share + Employer Share
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/80">
                    <div className="text-xs text-slate-300 font-mono flex items-center gap-2">
                      <span className="text-blue-300 font-bold">Employee: RM {Number(formEmployeeShare || 0).toFixed(2)}</span>
                      <span className="text-slate-400">+</span>
                      <span className="text-emerald-300 font-bold">Employer: RM {Number(formEmployerShare || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-mono font-bold text-amber-400">RM</span>
                      <span className="text-xl font-black font-mono text-white tracking-tight">
                        {(Number(formEmployeeShare || 0) + Number(formEmployerShare || 0)).toLocaleString('en-MY', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Contribution Date / Period (Only Date) */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <Calendar size={13} className="text-slate-500" />
                  <span>Contribution Date / Period</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  required
                  value={formMonthYear}
                  onChange={(e) => setFormMonthYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* 6. Notes / Remarks */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional remarks or contribution details..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Modal Submit Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow transition-all border-0 cursor-pointer ${
                    isEPF
                      ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  {editingRecord ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Statement / Voucher (Solid White Card, Crisp & Clean, No Payment Options) */}
      {viewingStatement && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-mono font-bold text-slate-500">
                STATUTORY CONTRIBUTION VOUCHER
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 border-0 cursor-pointer"
                >
                  <Printer size={12} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingStatement(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto">
              <div className="text-center pb-2 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-900">{viewingStatement.company_name}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {fullLabel} Statement • Period: {viewingStatement.month_year}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-800">{viewingStatement.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Code:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingStatement.employee_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Basic Salary:</span>
                  <span className="font-mono font-bold text-slate-800">
                    RM {viewingStatement.basic_salary.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contribution Date / Period:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingStatement.month_year}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3 text-xs bg-slate-50">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-200">
                  <span>Contribution Breakdown</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Manual Breakdown
                  </span>
                </div>
                
                {/* Employee Share Row */}
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Users size={13} className="text-blue-600" />
                      <span>Employee Share (Employee Deduction)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 pl-5">
                      Deducted directly from employee monthly salary
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                    RM {viewingStatement.employee_share.toFixed(2)}
                  </span>
                </div>

                {/* Company Share Row */}
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 size={13} className="text-emerald-600" />
                      <span>Company Share (Employer Contribution)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 pl-5">
                      Contributed directly by employer from company fund
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    RM {viewingStatement.employer_share.toFixed(2)}
                  </span>
                </div>

                {/* Total Row */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-300 text-sm">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900">
                      Total Statutory Contribution
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Employee Share (RM {viewingStatement.employee_share.toFixed(2)}) + Employer Share (RM {viewingStatement.employer_share.toFixed(2)})
                    </span>
                  </div>
                  <span className="font-mono font-black text-base text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300">
                    RM {viewingStatement.amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {viewingStatement.notes && (
                <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200">
                  <span className="font-bold">Remarks: </span>
                  {viewingStatement.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
