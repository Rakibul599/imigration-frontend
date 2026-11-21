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
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import { Company, resolveFileUrl } from '@/lib/companies';
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
  status: 'paid' | 'unpaid' | 'pending' | 'processing';
  payment_method: string;
  reference_no?: string;
  notes?: string;
  slip_name?: string;
  slip_data?: string;
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
  avatar?: string;
  profile_pic?: string;
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

  // Specific Labels for EPF / SOCSO
  const empDepositLabel = isEPF ? 'Employe epf deposit' : 'Employe socso deposit';
  const companyDepositLabel = isEPF ? 'company epf deposit' : 'company socso deposit';
  const empWalletLabel = isEPF ? 'Employer Epf wallet' : 'Employer Socso wallet';
  const companyWalletLabel = isEPF ? 'Companies Epf payment wallet' : 'Companies Socso payment wallet';
  const totalWalletLabel = isEPF ? 'Total Employer epf wallet' : 'Total Employer Socso wallet';

  const [records, setRecords] = useState<StatutoryContributionRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Filters (Search, Company, Employee, Month)
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

  // Form State
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [formEmployeeId, setFormEmployeeId] = useState<string>('');
  const [formBasicSalary, setFormBasicSalary] = useState<number>(3500);
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formEmployeeShare, setFormEmployeeShare] = useState<number>(0);
  const [formEmployerShare, setFormEmployerShare] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'paid' | 'unpaid'>('paid');
  const [formSlipName, setFormSlipName] = useState<string>('');
  const [formSlipData, setFormSlipData] = useState<string>('');
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
  const loadStoredRecords = useCallback((): StatutoryContributionRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

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
  }, [apiBase, type, storageKey, labelPrefix, isEPF, getEmployeeSalaryFromManagement, loadStoredRecords]);

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

  // Filtered records
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

    // Pending / Unpaid Contributions
    const pendingRecords = filteredRecords.filter((r) => r.status === 'unpaid' || r.status === 'pending');
    const totalPendingAmount = pendingRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const pendingCount = pendingRecords.length;

    return {
      totalAmount,
      totalEmployeeShare,
      totalEmployerShare,
      totalPendingAmount,
      pendingCount,
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
    setFormStatus('paid');
    setFormSlipName('');
    setFormSlipData('');

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
    setFormStatus(rec.status === 'unpaid' ? 'unpaid' : 'paid');
    setFormSlipName(rec.slip_name || '');
    setFormSlipData(rec.slip_data || '');
    setFormMonthYear(rec.month_year);
    setFormNotes(rec.notes || '');
    setIsRecordModalOpen(true);
  };

  // Save Modal Record
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
      alert(`Please enter ${empDepositLabel} or ${companyDepositLabel} amount.`);
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
      status: formStatus,
      payment_method: 'Recorded',
      reference_no: editingRecord?.reference_no,
      notes: formNotes.trim() || undefined,
      slip_name: formSlipName.trim() || undefined,
      slip_data: formSlipData.trim() || undefined,
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
    showToast('success', `${labelPrefix} contribution record saved successfully.`);

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

  // High-Quality Standard Statement Printing for both EPF and SOCSO
  const handlePrintStatement = (rec: StatutoryContributionRecord) => {
    const isEpfItem = rec.type === 'epf';
    const targetCo = companies.find((c) => c.id === rec.company_id || c.name === rec.company_name);
    const targetEmp = employees.find((e) => e.id === rec.employee_id || e.employee_code === rec.employee_code);
    const coLogo = targetCo?.logo ? resolveFileUrl(targetCo.logo) : '/images/companies/gamuda.svg';
    const empPic = targetEmp?.avatar || targetEmp?.profile_pic || '';
    const employeeAvatar = empPic ? resolveFileUrl(empPic) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rec.employee_name)}`;

    const currentItemEmpLabel = isEpfItem ? 'Employe epf deposit' : 'Employe socso deposit';
    const currentItemCoLabel = isEpfItem ? 'company epf deposit' : 'company socso deposit';
    const currentItemDocTitle = isEpfItem ? 'Employees Provident Fund (KWSP) Statement' : 'Social Security Organisation (PERKESO / SOCSO) Statement';

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${rec.type.toUpperCase()} Statement - ${rec.employee_name} (${rec.month_year})</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 12px; line-height: 1.5; background: #fff; }
    .voucher-card { border: 2px solid #cbd5e1; border-radius: 14px; padding: 28px; max-width: 820px; margin: 0 auto; background: #fff; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
    .header-table td { border: none; padding: 0; vertical-align: middle; }
    .co-logo-wrap { width: 75px; height: 75px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px; background: #fff; display: inline-block; }
    .co-logo { width: 100%; height: 100%; object-fit: contain; }
    .emp-pic-wrap { width: 75px; height: 75px; border: 2px solid #cbd5e1; border-radius: 14px; overflow: hidden; background: #f8fafc; display: inline-block; }
    .emp-pic { width: 100%; height: 100%; object-fit: cover; }
    .title-banner { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center; padding: 14px; margin-bottom: 22px; }
    .title-banner h1 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; }
    .title-banner .sub { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 22px; }
    .info-item { font-size: 11px; }
    .info-label { color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px; }
    .info-val { color: #0f172a; font-weight: 700; font-size: 12px; }
    table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 22px; border: 1px solid #cbd5e1; }
    table.data-table th { background: #f1f5f9; color: #334155; font-weight: 800; padding: 10px 14px; border: 1px solid #cbd5e1; text-align: left; }
    table.data-table td { padding: 12px 14px; border: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; }
    .status-paid { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .status-unpaid { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .total-row { background: #f8fafc; font-weight: 900; font-size: 14px; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 45px; padding-top: 25px; border-top: 1px dashed #cbd5e1; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 6px; font-size: 10px; font-weight: 700; color: #334155; }
    .watermark { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 25px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="voucher-card">
    <table class="header-table">
      <tr>
        <td style="width: 50%;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="co-logo-wrap">
              <img src="${coLogo}" class="co-logo" alt="Company Logo" onerror="this.src='/images/companies/gamuda.svg';" />
            </div>
            <div>
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Employer / Company</div>
              <div style="font-size: 16px; font-weight: 900; color: #0f172a; line-height: 1.2;">${rec.company_name}</div>
              <div style="color: #64748b; font-size: 11px; font-family: monospace; font-weight: 600; margin-top: 2px;">ROC: ${targetCo?.roc || '199801012345 (456789-A)'}</div>
              <div style="color: ${isEpfItem ? '#047857' : '#1d4ed8'}; font-size: 10px; font-weight: 600;">Registered ${rec.type.toUpperCase()} Contributor</div>
            </div>
          </div>
        </td>
        <td style="width: 50%; text-align: right;">
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 14px;">
            <div style="text-align: right;">
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Employee / Contributor</div>
              <div style="font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.2;">${rec.employee_name}</div>
              <div style="color: #475569; font-size: 11px; font-family: monospace; font-weight: 700; margin-top: 2px;">ID: ${rec.employee_code}</div>
              <div style="color: #64748b; font-size: 10px; font-weight: 500;">${rec.employee_role || 'Staff Member'}</div>
            </div>
            <div class="emp-pic-wrap">
              <img src="${employeeAvatar}" class="emp-pic" alt="Employee Avatar" onerror="this.src='/images/customer.svg';" />
            </div>
          </div>
        </td>
      </tr>
    </table>

    <div class="title-banner">
      <div style="font-size: 10px; font-family: monospace; color: #64748b; font-weight: 800; letter-spacing: 1.5px; margin-bottom: 2px;">
        OFFICIAL STATUTORY DEPOSIT VOUCHER
      </div>
      <h1>${currentItemDocTitle}</h1>
      <div class="sub">
        Period: <strong style="color: #0f172a;">${rec.month_year}</strong> &nbsp;•&nbsp; 
        Ref No: <span style="font-family: monospace; font-weight: 700;">${rec.reference_no || `${rec.type.toUpperCase()}-${rec.month_year.replace('-', '')}-${String(rec.id).slice(-3)}`}</span> &nbsp;•&nbsp; 
        Status: <span class="status-badge ${rec.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${rec.status.toUpperCase()}</span>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Contribution Period</span>
        <span class="info-val font-mono">${rec.month_year}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Basic Salary</span>
        <span class="info-val font-mono">RM ${rec.basic_salary.toFixed(2)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Payment Method</span>
        <span class="info-val">${rec.payment_method || 'Recorded'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Payment Status</span>
        <span class="info-val" style="color: ${rec.status === 'paid' ? '#047857' : '#b45309'}; font-weight: 800;">
          ${rec.status === 'paid' ? 'PAID / SETTLED' : 'PENDING / UNPAID'}
        </span>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Deposit Item Breakdown</th>
          <th class="text-center" style="width: 150px;">Classification</th>
          <th class="text-right" style="width: 170px;">Deposit Amount (RM)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${currentItemEmpLabel}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">Statutory monthly deduction from employee salary</span>
          </td>
          <td class="text-center font-mono" style="color: #475569;">Employee Deduction</td>
          <td class="text-right font-mono" style="font-weight: 800; color: #1d4ed8; font-size: 13px;">${rec.employee_share.toFixed(2)}</td>
        </tr>
        <tr>
          <td>
            <strong>${currentItemCoLabel}</strong><br/>
            <span style="font-size: 10px; color: #64748b;">Statutory contribution contributed by company fund</span>
          </td>
          <td class="text-center font-mono" style="color: #475569;">Employer Paid</td>
          <td class="text-right font-mono" style="font-weight: 800; color: #047857; font-size: 13px;">${rec.employer_share.toFixed(2)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2" class="text-right" style="text-transform: uppercase; color: #334155;">
            total deposit amount:
          </td>
          <td class="text-right font-mono" style="color: #0f172a; font-size: 15px;">
            RM ${rec.amount.toFixed(2)}
          </td>
        </tr>
      </tfoot>
    </table>

    ${rec.notes ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-size: 11px; color: #92400e; margin-bottom: 22px;"><strong>Remarks:</strong> ${rec.notes}</div>` : ''}

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line">Prepared By (HR & Payroll)</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Verified & Audited</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Employer Authorization & Seal</div>
      </div>
    </div>

    <div class="watermark">
      Computer generated official document • Issued by Statutory Attendance Management System • Page 1 of 1
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  // Download statement as text/receipt file
  const handleDownloadStatementText = (rec: StatutoryContributionRecord) => {
    const isEpfItem = rec.type === 'epf';
    const content = `=====================================================
${isEpfItem ? 'EPF STATUTORY DEPOSIT STATEMENT' : 'SOCSO STATUTORY DEPOSIT STATEMENT'}
=====================================================
Date / Period:           ${rec.month_year}
Company Name:            ${rec.company_name}
Employer / Employee:     ${rec.employee_name}
Employer / Employee ID:  ${rec.employee_code}
Position:                ${rec.employee_role || 'Staff'}
Basic Salary:            RM ${rec.basic_salary.toFixed(2)}
-----------------------------------------------------
${isEpfItem ? 'Employe epf deposit' : 'Employe socso deposit'}:   RM ${rec.employee_share.toFixed(2)}
${isEpfItem ? 'company epf deposit' : 'company socso deposit'}:   RM ${rec.employer_share.toFixed(2)}
-----------------------------------------------------
Total Deposit Amount:    RM ${rec.amount.toFixed(2)}
Payment Status:          ${rec.status.toUpperCase()}
Reference No:            ${rec.reference_no || 'N/A'}
Pay Slip Attached:       ${rec.slip_name || 'None'}
Generated Date:          ${new Date().toLocaleString()}
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rec.type.toUpperCase()}_Deposit_${rec.employee_code}_${rec.month_year}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      Date: r.month_year,
      'Company Name': r.company_name,
      'Employer Name': r.employee_name,
      'Employer Id': r.employee_code,
      Position: r.employee_role || 'Staff',
      'Basic Salary (RM)': r.basic_salary.toFixed(2),
      [`${empDepositLabel} (RM)`]: r.employee_share.toFixed(2),
      [`${companyDepositLabel} (RM)`]: r.employer_share.toFixed(2),
      'Total Deposit Amount (RM)': r.amount.toFixed(2),
      Status: r.status ? r.status.toUpperCase() : 'PAID',
      'Pay Slip': r.slip_name || '—',
      Notes: r.notes || '—',
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
      'Date',
      'Company Name',
      'Employer Name',
      'Employer Id',
      'Position',
      'Basic Salary',
      empDepositLabel,
      companyDepositLabel,
      'Total Deposit Amount',
      'Status',
      'Pay Slip',
      'Notes',
    ];
    const rows = filteredRecords.map((r, i) => [
      i + 1,
      r.month_year,
      `"${r.company_name.replace(/"/g, '""')}"`,
      `"${r.employee_name.replace(/"/g, '""')}"`,
      r.employee_code,
      r.employee_role || 'Staff',
      r.basic_salary.toFixed(2),
      r.employee_share.toFixed(2),
      r.employer_share.toFixed(2),
      r.amount.toFixed(2),
      r.status ? r.status.toUpperCase() : 'PAID',
      `"${r.slip_name || ''}"`,
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

      {/* FILTER CONTROLS BAR: Positioned ABOVE the Cards */}
      <div className="dashboard-card-glass p-4 sm:p-5 rounded-2xl shadow-xs relative z-30 !overflow-visible border border-white/60">
        <div className="flex items-center gap-3 w-full flex-nowrap relative z-30">
          {/* 1. Left: Search input */}
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

      {/* Summary KPI Stat Cards: Identical 4 Cards for both EPF and SOCSO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Employer Epf / Socso wallet */}
        <div className="admin-stat-card dashboard-card-glass p-5 rounded-2xl transition-all flex flex-col justify-between min-h-[125px] group shadow-xs hover:shadow-md border border-white/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {empWalletLabel}
            </span>
            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs ${
              isEPF ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-blue-600 to-cyan-600'
            }`}>
              <Users size={17} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">RM</span>
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {stats.totalEmployeeShare.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Employee {labelPrefix} Total</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {stats.uniqueEmployees} Employees
            </span>
          </div>
        </div>

        {/* Card 2: Companies Epf / Socso payment wallet */}
        <div className="admin-stat-card dashboard-card-glass p-5 rounded-2xl transition-all flex flex-col justify-between min-h-[125px] group shadow-xs hover:shadow-md border border-white/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {companyWalletLabel}
            </span>
            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs ${
              isEPF ? 'bg-gradient-to-br from-emerald-600 to-green-600' : 'bg-gradient-to-br from-indigo-600 to-blue-700'
            }`}>
              <Building2 size={17} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">RM</span>
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {stats.totalEmployerShare.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Company {labelPrefix} Total</span>
            <span className={`font-bold px-2 py-0.5 rounded border ${
              isEPF ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
            }`}>
              {stats.uniqueCompanies} Companies
            </span>
          </div>
        </div>

        {/* Card 3: Total Employer epf / socso wallet */}
        <div className="admin-stat-card dashboard-card-glass p-5 rounded-2xl transition-all flex flex-col justify-between min-h-[125px] group shadow-xs hover:shadow-md border border-white/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {totalWalletLabel}
            </span>
            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs ${
              isEPF ? 'bg-gradient-to-br from-teal-600 to-emerald-700' : 'bg-gradient-to-br from-teal-600 to-blue-600'
            }`}>
              <Coins size={17} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">RM</span>
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {stats.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Total Contribution</span>
            <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {stats.totalEntries} Records
            </span>
          </div>
        </div>

        {/* Card 4: Total Employee and company pending wallet */}
        <div className="admin-stat-card dashboard-card-glass p-5 rounded-2xl transition-all flex flex-col justify-between min-h-[125px] group shadow-xs hover:shadow-md border border-white/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Total Employee and company pending wallet
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
              <Clock size={17} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">RM</span>
            <span className="text-2xl font-black font-mono text-amber-900 tracking-tight">
              {stats.totalPendingAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Pending / Unpaid Deposits</span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {stats.pendingCount} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Main Table with Glass Card Wrap and Horizontal Scroll */}
      <div className="dashboard-card-glass w-full max-w-full overflow-hidden rounded-2xl shadow-xs border border-white/50 relative z-10">
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <table className="w-full min-w-[2150px] text-left border-collapse">
            <thead>
              {/* Identical Column Headers for both EPF and SOCSO */}
              <tr className={`${isEPF ? 'bg-[#1f9343]' : 'bg-[#0b4da2]'} text-white text-xs font-bold whitespace-nowrap select-none`}>
                <th className={`py-4 px-4 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} text-center w-14`}>
                  #
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[140px] text-center whitespace-nowrap`}>
                  Date
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[260px]`}>
                  Company name
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[220px]`}>
                  Employer name
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[150px] whitespace-nowrap`}>
                  Employer Id
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[160px] whitespace-nowrap`}>
                  Position
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[160px] text-right whitespace-nowrap`}>
                  Basic salary
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[180px] text-right whitespace-nowrap`}>
                  {empDepositLabel}
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[180px] text-right whitespace-nowrap`}>
                  {companyDepositLabel}
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[190px] text-right whitespace-nowrap`}>
                  total deposit amount
                </th>
                <th className={`py-4 px-6 ${isEPF ? 'border-r border-green-600/60' : 'border-r border-blue-600/60'} min-w-[130px] text-center whitespace-nowrap`}>
                  Status
                </th>
                <th className="py-4 px-6 text-center min-w-[180px] whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {filteredRecords.map((record, index) => {
                const isPaid = record.status === 'paid';
                return (
                  <tr key={record.id} className="hover:bg-blue-50/40 transition-colors group">
                    {/* 1. SL */}
                    <td className="py-4 px-4 border-r border-slate-200/70 align-middle text-center text-slate-400 font-mono font-medium">
                      {index + 1}
                    </td>

                    {/* 2. Date */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-700 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 inline-block">
                        {record.month_year}
                      </span>
                    </td>

                    {/* 3. Company name */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle font-bold text-slate-900">
                      {record.company_name}
                    </td>

                    {/* 4. Employer name */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle font-bold text-blue-700">
                      {record.employee_name}
                    </td>

                    {/* 5. Employer Id */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {record.employee_code}
                      </span>
                    </td>

                    {/* 6. Position */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle whitespace-nowrap text-slate-600 font-medium">
                      {record.employee_role || 'Staff'}
                    </td>

                    {/* 7. Basic salary */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      RM {record.basic_salary.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 8. Employe deposit */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 inline-block shadow-2xs">
                        RM {record.employee_share.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* 9. company deposit */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-right whitespace-nowrap">
                      <span className={`font-mono font-bold px-3 py-1.5 rounded-lg border inline-block shadow-2xs ${
                        isEPF ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                      }`}>
                        RM {record.employer_share.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* 10. total deposit amount */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-right whitespace-nowrap">
                      <span className={`font-mono font-black text-sm px-3 py-1.5 rounded-lg border inline-block ${
                        isEPF ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' : 'bg-blue-50/80 border-blue-200 text-blue-900'
                      }`}>
                        RM {record.amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* 11. Status */}
                    <td className="py-4 px-6 border-r border-slate-200/70 align-middle text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isPaid ? (
                          <>
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Paid</span>
                          </>
                        ) : (
                          <>
                            <Clock size={13} className="text-amber-600" />
                            <span>Unpaid</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* 12. Action Column: Download Icon opens Preview Modal where user can download & print */}
                    <td className="py-4 px-6 align-middle text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* Primary Download Icon Button -> Opens Preview */}
                        <button
                          type="button"
                          onClick={() => setViewingStatement(record)}
                          title="Click to preview, download & print statement"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer shadow-2xs ${
                            isEPF
                              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 hover:border-emerald-400'
                              : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800 hover:border-blue-400'
                          }`}
                        >
                          <Download size={14} className={isEPF ? 'text-emerald-700' : 'text-blue-700'} />
                          <span>Download</span>
                        </button>

                        {/* View Statement Preview */}
                        <button
                          type="button"
                          onClick={() => setViewingStatement(record)}
                          title={`Preview Statement for ${record.employee_name}`}
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye size={13} />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(record)}
                          title="Edit Record"
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(record.id, record.employee_name)}
                          title="Delete Record"
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Trash2 size={13} />
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
                  <td colSpan={6} className="py-4 px-6 text-right uppercase tracking-wider text-slate-600 border-r border-slate-200/70">
                    Total ({filteredRecords.length} Records):
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 border-r border-slate-200/70 whitespace-nowrap">
                    RM {filteredRecords.reduce((sum, r) => sum + (r.basic_salary || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-bold text-blue-700 border-r border-slate-200/70 whitespace-nowrap">
                    RM {filteredRecords.reduce((sum, r) => sum + (r.employee_share || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`py-4 px-6 text-right font-mono font-bold border-r border-slate-200/70 whitespace-nowrap ${
                    isEPF ? 'text-emerald-700' : 'text-indigo-700'
                  }`}>
                    RM {filteredRecords.reduce((sum, r) => sum + (r.employer_share || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-black text-slate-900 border-r border-slate-200/70 whitespace-nowrap">
                    RM {filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="py-4 px-6 bg-slate-100/50"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODAL: Record / Edit Contribution (Clean, Formal, Executive Style) */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col max-h-[92vh] overflow-hidden">
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

            {/* Modal Form */}
            <form onSubmit={handleSaveRecord} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* 1. Company Select */}
              <div className="space-y-1 relative z-50">
                <label className="text-xs font-semibold text-slate-700">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <Select2Search
                  options={modalCompanySelectOptions}
                  value={formCompanyId}
                  onChange={(val) => {
                    setFormCompanyId(val);
                  }}
                  placeholder="Select Company..."
                  className="w-full"
                />
              </div>

              {/* 2. Employee Select */}
              <div className="space-y-1 relative z-40">
                <label className="text-xs font-semibold text-slate-700">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <Select2Search
                  options={modalEmployeeSelectOptions}
                  value={formEmployeeId}
                  onChange={handleModalEmployeeChange}
                  placeholder="Select Employee..."
                  className="w-full"
                />
              </div>

              {/* 3. Basic Salary */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Basic Salary (RM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">RM</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formBasicSalary}
                    onChange={(e) => setFormBasicSalary(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 4. Deposit Inputs: Formal Two Column Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Employe deposit */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {empDepositLabel} (RM) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formEmployeeShare || ''}
                      onChange={(e) => handleEmployeeShareChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* company deposit */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {companyDepositLabel} (RM) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formEmployerShare || ''}
                      onChange={(e) => handleEmployerShareChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Total Summary Field (Formal Read-Only Box) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Total Deposit Amount
                </span>
                <span className="text-sm font-black font-mono text-slate-900">
                  RM {(Number(formEmployeeShare || 0) + Number(formEmployerShare || 0)).toLocaleString('en-MY', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* 6. Status Selection (Paid / Unpaid) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Payment Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStatus('paid')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formStatus === 'paid'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 size={14} className={formStatus === 'paid' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>Paid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('unpaid')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formStatus === 'unpaid'
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock size={14} className={formStatus === 'unpaid' ? 'text-amber-600' : 'text-slate-400'} />
                    <span>Unpaid</span>
                  </button>
                </div>
              </div>

              {/* 7. Pay Slip Upload */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Pay Slip Attachment
                </label>
                {formSlipName ? (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-300">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-800 truncate">
                      <FileCheck2 size={16} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{formSlipName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {formSlipData && (
                        <a
                          href={formSlipData}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={formSlipName}
                          className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                        >
                          Preview
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFormSlipName('');
                          setFormSlipData('');
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5 border-0 bg-transparent cursor-pointer"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-3 text-center cursor-pointer transition-colors bg-slate-50/50">
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setFormSlipName(file.name);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) {
                            setFormSlipData(ev.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Upload size={14} className="text-slate-400" />
                      <span className="text-xs font-medium">Click or browse to attach pay slip (PDF, JPG, PNG)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 8. Contribution Date / Period */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Date / Period <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  required
                  value={formMonthYear}
                  onChange={(e) => setFormMonthYear(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* 9. Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional remarks..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-sm hover:shadow transition-all border-0 cursor-pointer ${
                    isEPF
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {editingRecord ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Statement / Voucher Preview (Large Official Document with Company Logo & Employee Profile Pic) */}
      {viewingStatement && (() => {
        const isEpfItem = viewingStatement.type === 'epf';
        const targetCompany = companies.find((c) => c.id === viewingStatement.company_id || c.name === viewingStatement.company_name);
        const targetEmployee = employees.find((e) => e.id === viewingStatement.employee_id || e.employee_code === viewingStatement.employee_code);
        const companyLogoUrl = targetCompany?.logo ? resolveFileUrl(targetCompany.logo) : '/images/companies/gamuda.svg';
        const empPic = targetEmployee?.avatar || targetEmployee?.profile_pic || '';
        const employeeAvatarUrl = empPic ? resolveFileUrl(empPic) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(viewingStatement.employee_name)}`;

        const currentItemEmpLabel = isEpfItem ? 'Employe epf deposit' : 'Employe socso deposit';
        const currentItemCoLabel = isEpfItem ? 'company epf deposit' : 'company socso deposit';
        const currentItemDocTitle = isEpfItem ? 'EMPLOYEES PROVIDENT FUND (KWSP) STATEMENT' : 'SOCIAL SECURITY ORGANISATION (PERKESO / SOCSO) STATEMENT';

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 relative flex flex-col max-h-[94vh] overflow-hidden">
              {/* Top Header Control Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                    isEpfItem ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    <FileText size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      {viewingStatement.type.toUpperCase()} Contribution Voucher & Statement
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Standard Preview & Official Print Layout
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Download Receipt/Text File */}
                  <button
                    type="button"
                    onClick={() => handleDownloadStatementText(viewingStatement)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 cursor-pointer transition-colors"
                  >
                    <Download size={13} />
                    <span>Download Voucher</span>
                  </button>

                  {/* Standard Print Button */}
                  <button
                    type="button"
                    onClick={() => handlePrintStatement(viewingStatement)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 border-0 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Printer size={13} />
                    <span>Print Statement</span>
                  </button>

                  {/* Close Modal Button */}
                  <button
                    type="button"
                    onClick={() => setViewingStatement(null)}
                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer bg-transparent border-0 ml-1 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Document Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-slate-100/50">
                {/* Official Printable Statement Sheet */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                  {/* 1. Official Header: Company Logo (Left) and Employee Profile Pic (Right) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-6 border-b-2 border-slate-200">
                    {/* Left: Company Logo and Company Details */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                        <img
                          src={companyLogoUrl}
                          alt={viewingStatement.company_name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).setAttribute('src', '/images/companies/gamuda.svg');
                          }}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Employer / Company
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                          {viewingStatement.company_name}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-500 font-semibold mt-0.5">
                          ROC: {targetCompany?.roc || '199801012345 (456789-A)'}
                        </p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isEpfItem ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-blue-700 bg-blue-50 border-blue-200'
                        }`}>
                          Registered {viewingStatement.type.toUpperCase()} Contributor
                        </span>
                      </div>
                    </div>

                    {/* Right: Employee Profile Picture and Employee Details */}
                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Employee / Contributor
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                          {viewingStatement.employee_name}
                        </h4>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            ID: {viewingStatement.employee_code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {viewingStatement.employee_role || 'Staff Member'}
                        </p>
                      </div>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-slate-200 bg-slate-50 overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
                        <img
                          src={employeeAvatarUrl}
                          alt={viewingStatement.employee_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).setAttribute('src', '/images/customer.svg');
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Official Title Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                    <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">
                      <span>OFFICIAL STATUTORY RECORD</span>
                      <span>•</span>
                      <span>REF: {viewingStatement.reference_no || `${labelPrefix}-${viewingStatement.month_year.replace('-', '')}-${String(viewingStatement.id).slice(-3)}`}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                      {currentItemDocTitle}
                    </h2>
                    <div className="flex items-center justify-center gap-3 text-xs text-slate-600 mt-1 font-medium">
                      <span>Period: <strong className="font-mono text-slate-900">{viewingStatement.month_year}</strong></span>
                      <span>•</span>
                      <span>Status: <strong className={viewingStatement.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>{viewingStatement.status.toUpperCase()}</strong></span>
                    </div>
                  </div>

                  {/* 3. Key Information Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Contribution Period</span>
                      <span className="font-mono font-bold text-slate-800">{viewingStatement.month_year}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Basic Salary</span>
                      <span className="font-mono font-bold text-slate-800">
                        RM {viewingStatement.basic_salary.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Payment Method</span>
                      <span className="font-semibold text-slate-800">{viewingStatement.payment_method || 'Recorded'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Payment Status</span>
                      <span className={`inline-flex items-center gap-1 font-bold ${
                        viewingStatement.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {viewingStatement.status === 'paid' ? (
                          <>
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Paid / Settled</span>
                          </>
                        ) : (
                          <>
                            <Clock size={13} className="text-amber-600" />
                            <span>Pending / Unpaid</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 4. Tabular Breakdown */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="py-3 px-4 border-r border-slate-200">Description</th>
                          <th className="py-3 px-4 border-r border-slate-200 text-center w-40">Classification</th>
                          <th className="py-3 px-4 text-right w-48">Deposit Amount (RM)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        <tr>
                          <td className="py-3.5 px-4 border-r border-slate-200">
                            <span className="font-bold text-slate-900 block">{currentItemEmpLabel}</span>
                            <span className="text-[11px] text-slate-500">Statutory employee monthly salary deduction</span>
                          </td>
                          <td className="py-3.5 px-4 border-r border-slate-200 text-center font-mono text-slate-600">
                            Employee Deduction
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700 text-sm">
                            RM {viewingStatement.employee_share.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3.5 px-4 border-r border-slate-200">
                            <span className="font-bold text-slate-900 block">{currentItemCoLabel}</span>
                            <span className="text-[11px] text-slate-500">Statutory company employer contribution</span>
                          </td>
                          <td className="py-3.5 px-4 border-r border-slate-200 text-center font-mono text-slate-600">
                            Employer Paid
                          </td>
                          <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                            isEpfItem ? 'text-emerald-700' : 'text-indigo-700'
                          }`}>
                            RM {viewingStatement.employer_share.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                        <tr>
                          <td colSpan={2} className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-700 border-r border-slate-200">
                            total deposit amount:
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-base">
                            RM {viewingStatement.amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 5. Remarks */}
                  {viewingStatement.notes && (
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900">
                      <span className="font-bold">Remarks: </span>
                      <span>{viewingStatement.notes}</span>
                    </div>
                  )}

                  {/* 6. Pay Slip Attachment (if any) */}
                  {viewingStatement.slip_name && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck2 size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-slate-600 font-medium">Attached Pay Slip:</span>
                        <span className="font-bold text-slate-800 truncate">{viewingStatement.slip_name}</span>
                      </div>
                      {viewingStatement.slip_data && (
                        <a
                          href={viewingStatement.slip_data}
                          download={viewingStatement.slip_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 border border-blue-200 transition-colors"
                        >
                          <Download size={12} />
                          <span>Download Pay Slip</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* 7. Official Signatures */}
                  <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
                    <div>
                      <div className="h-12 border-b border-slate-300"></div>
                      <span className="text-[11px] font-bold text-slate-700 block mt-1.5">Prepared By</span>
                      <span className="text-[10px] text-slate-400">HR & Payroll Specialist</span>
                    </div>
                    <div>
                      <div className="h-12 border-b border-slate-300"></div>
                      <span className="text-[11px] font-bold text-slate-700 block mt-1.5">Verified & Processed</span>
                      <span className="text-[10px] text-slate-400">Finance & Accounts</span>
                    </div>
                    <div>
                      <div className="h-12 border-b border-slate-300"></div>
                      <span className="text-[11px] font-bold text-slate-700 block mt-1.5">Employer Authorization</span>
                      <span className="text-[10px] text-slate-400">Authorized Signature & Seal</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadStatementText(viewingStatement)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors border-0 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download Voucher File</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintStatement(viewingStatement)}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all border-0 cursor-pointer ${
                    isEpfItem ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Printer size={14} />
                  <span>Print Official Statement</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
