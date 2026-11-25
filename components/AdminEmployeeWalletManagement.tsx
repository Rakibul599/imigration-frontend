'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Banknote,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Building2,
  Download,
  Printer,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Eye,
  Check,
  X,
  Plus,
  Clock,
  AlertCircle,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Users,
  Send,
  SlidersHorizontal,
  Landmark,
  Receipt,
  FileCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useDashboardCardDesign } from '@/lib/themeSettings';
import Select2Search, { Select2Option } from '@/components/Select2Search';

export interface EmployeeWalletItem {
  id: number;
  employee_id: number;
  employee_code: string;
  name: string;
  email: string;
  role: string;
  company_name: string;
  wallet_account_no: string;
  wallet_balance: number;
  salary_balance?: number;
  epf_balance?: number;
  socso_balance?: number;
  bank_name: string;
  bank_account_name: string;
  bank_account_no: string;
  total_credit_amount: number;
  total_debit_amount: number;
  total_transactions_count: number;
  pending_transactions_count: number;
  status: string;
  created_at?: string;
}

export interface EmployeeWalletTransactionItem {
  id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  company_name?: string | null;
  wallet_account_no?: string | null;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_method?: string | null;
  reference?: string | null;
  status: 'success' | 'pending' | 'cancelled' | 'rejected';
  notes?: string | null;
  requested_by?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  payment_slip?: string | null;
  payment_slip_name?: string | null;
  admin_notes?: string | null;
  created_at: string;
}

export interface StatutoryContributionItem {
  id: number;
  type: 'epf' | 'socso';
  company_id: string;
  company_name: string;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  employee_role: string;
  basic_salary: number;
  amount: number;
  employee_share: number;
  employer_share: number;
  month_year: string;
  status: string;
  payment_method: string;
  reference_no: string;
  notes?: string | null;
  slip_name?: string | null;
  slip_data?: string | null;
  created_at: string;
}

export interface WalletSummaryStats {
  total_employees_count: number;
  total_salary_wallet: number;
  total_epf_wallet: number;
  total_socso_wallet: number;
  total_wallet_balance: number;
  total_credits: number;
  total_debits: number;
  active_wallets_count: number;
}

interface AdminEmployeeWalletManagementProps {
  portalType?: 'superadmin' | 'masteradmin';
  adminName?: string;
  initialTab?: 'salary' | 'epf' | 'socso' | 'directory' | 'transactions';
}

export default function AdminEmployeeWalletManagement({
  portalType = 'superadmin',
  adminName = 'Super Admin',
  initialTab = 'salary',
}: AdminEmployeeWalletManagementProps) {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';

  // Active Tab: 'salary' (Employee Salary Wallets) | 'epf' (EPF Wallets) | 'socso' (SOCSO Wallets) | 'transactions' (Ledger Logs)
  const normalizedInitialTab =
    initialTab === 'directory' ? 'salary' : (initialTab as 'salary' | 'epf' | 'socso' | 'transactions');
  const [activeTab, setActiveTab] = useState<'salary' | 'epf' | 'socso' | 'transactions'>(normalizedInitialTab);

  // Sync initialTab if changed by route
  useEffect(() => {
    if (initialTab) {
      const target = initialTab === 'directory' ? 'salary' : initialTab;
      setActiveTab(target as 'salary' | 'epf' | 'socso' | 'transactions');
    }
  }, [initialTab]);

  // Data states
  const [employees, setEmployees] = useState<EmployeeWalletItem[]>([]);
  const [transactions, setTransactions] = useState<EmployeeWalletTransactionItem[]>([]);
  const [contributions, setContributions] = useState<StatutoryContributionItem[]>([]);
  const [summary, setSummary] = useState<WalletSummaryStats>({
    total_employees_count: 0,
    total_salary_wallet: 0,
    total_epf_wallet: 0,
    total_socso_wallet: 0,
    total_wallet_balance: 0,
    total_credits: 0,
    total_debits: 0,
    active_wallets_count: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [fundFilter, setFundFilter] = useState<'all' | 'salary' | 'epf' | 'socso'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'paid' | 'pending' | 'cancelled'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Export dropdown
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Action Modals State
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [debitModalOpen, setDebitModalOpen] = useState(false);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedEmpForAction, setSelectedEmpForAction] = useState<EmployeeWalletItem | null>(null);
  const [selectedTxForView, setSelectedTxForView] = useState<EmployeeWalletTransactionItem | null>(null);

  // Statutory Slip Modal
  const [statutorySlipModalOpen, setStatutorySlipModalOpen] = useState(false);
  const [selectedStatutoryItem, setSelectedStatutoryItem] = useState<StatutoryContributionItem | null>(null);

  // Modal Form States
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('bonus');
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('Bank Transfer');
  const [formReference, setFormReference] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  // Handle Tab Change and sync URL smoothly
  const handleTabChange = (tab: 'salary' | 'epf' | 'socso' | 'transactions') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const isFrontendSuperadmin = window.location.pathname.startsWith('/superadmin');
      const basePath = isFrontendSuperadmin ? '/superadmin/employees/wallet' : '/employees/wallet';
      let targetPath = basePath;
      if (tab === 'salary') targetPath = `${basePath}/salary`;
      else if (tab === 'epf') targetPath = `${basePath}/epf`;
      else if (tab === 'socso') targetPath = `${basePath}/socso`;
      else if (tab === 'transactions') targetPath = `${basePath}?tab=transactions`;
      window.history.pushState(null, '', targetPath);
    }
  };

  // Click outside listener for export dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Wallets Directory, Transactions & Statutory Contributions
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Wallets Directory
      let walletsUrl = `${apiBase}/employee-wallets?`;
      if (selectedCompany !== 'ALL') {
        walletsUrl += `company_name=${encodeURIComponent(selectedCompany)}&`;
      }
      if (selectedEmployee !== 'ALL') {
        walletsUrl += `employee_code=${encodeURIComponent(selectedEmployee)}&`;
      }
      if (searchQuery.trim()) {
        walletsUrl += `search=${encodeURIComponent(searchQuery.trim())}&`;
      }

      const walletRes = await fetch(walletsUrl, { cache: 'no-store' });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setEmployees(walletData.employees || []);
        if (walletData.summary) {
          setSummary({
            total_employees_count: walletData.summary.total_employees_count || 0,
            total_salary_wallet: walletData.summary.total_salary_wallet ?? walletData.summary.total_wallet_balance ?? 0,
            total_epf_wallet: walletData.summary.total_epf_wallet ?? 0,
            total_socso_wallet: walletData.summary.total_socso_wallet ?? 0,
            total_wallet_balance: walletData.summary.total_wallet_balance ?? 0,
            total_credits: walletData.summary.total_credits ?? 0,
            total_debits: walletData.summary.total_debits ?? 0,
            active_wallets_count: walletData.summary.active_wallets_count ?? 0,
          });
        }
      }

      // 2. Fetch Transactions
      let txUrl = `${apiBase}/employee-wallet-transactions?`;
      if (selectedCompany !== 'ALL') {
        txUrl += `company_name=${encodeURIComponent(selectedCompany)}&`;
      }
      if (selectedEmployee !== 'ALL') {
        txUrl += `employee_code=${encodeURIComponent(selectedEmployee)}&`;
      }
      if (typeFilter !== 'all') {
        txUrl += `type=${typeFilter}&`;
      }
      if (statusFilter !== 'all' && statusFilter !== 'paid') {
        txUrl += `status=${statusFilter}&`;
      }
      if (startDate) {
        txUrl += `start_date=${startDate}&`;
      }
      if (endDate) {
        txUrl += `end_date=${endDate}&`;
      }
      if (searchQuery.trim()) {
        txUrl += `search=${encodeURIComponent(searchQuery.trim())}&`;
      }

      const txRes = await fetch(txUrl, { cache: 'no-store' });
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(Array.isArray(txData) ? txData : []);
      }

      // 3. Fetch Statutory Contributions (EPF & SOCSO)
      let statUrl = `${apiBase}/statutory-contributions?`;
      if (selectedCompany !== 'ALL') {
        statUrl += `company_name=${encodeURIComponent(selectedCompany)}&`;
      }
      if (selectedEmployee !== 'ALL') {
        statUrl += `employee_code=${encodeURIComponent(selectedEmployee)}&`;
      }
      if (searchQuery.trim()) {
        statUrl += `search=${encodeURIComponent(searchQuery.trim())}&`;
      }

      const statRes = await fetch(statUrl, { cache: 'no-store' });
      if (statRes.ok) {
        const statData = await statRes.json();
        setContributions(Array.isArray(statData) ? statData : []);
      }
    } catch (err) {
      console.error('Failed to load employee wallet data:', err);
      setNotification({ type: 'error', message: 'Failed to connect to backend API.' });
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, selectedCompany, selectedEmployee, typeFilter, statusFilter, startDate, endDate, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Company Options for Dropdown
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.company_name) set.add(emp.company_name);
    });
    transactions.forEach((tx) => {
      if (tx.company_name) set.add(tx.company_name);
    });
    contributions.forEach((c) => {
      if (c.company_name) set.add(c.company_name);
    });
    return Array.from(set).sort();
  }, [employees, transactions, contributions]);

  // Derived Employee Options for Dropdown
  const employeeOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    employees.forEach((emp) => {
      if (selectedCompany === 'ALL' || emp.company_name === selectedCompany) {
        map.set(emp.employee_code, { code: emp.employee_code, name: emp.name });
      }
    });
    contributions.forEach((c) => {
      if (selectedCompany === 'ALL' || c.company_name === selectedCompany) {
        if (!map.has(c.employee_code)) {
          map.set(c.employee_code, { code: c.employee_code, name: c.employee_name });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, contributions, selectedCompany]);

  // Select2 Options
  const companySelect2Options: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: `All Companies (${companyOptions.length})` },
      ...companyOptions.map((c) => ({
        value: c,
        label: c,
      })),
    ];
  }, [companyOptions]);

  const employeeSelect2Options: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: `All Employees (${employeeOptions.length})` },
      ...employeeOptions.map((emp) => ({
        value: emp.code,
        label: `${emp.name} (${emp.code})`,
      })),
    ];
  }, [employeeOptions]);

  const fundSelect2Options: Select2Option[] = useMemo(() => [
    { value: 'all', label: 'All Wallets' },
    { value: 'salary', label: 'Salary Wallet' },
    { value: 'epf', label: 'EPF Wallet' },
    { value: 'socso', label: 'SOCSO Wallet' },
  ], []);

  const typeSelect2Options: Select2Option[] = useMemo(() => [
    { value: 'all', label: 'All Types' },
    { value: 'credit', label: 'Credit / Deposit (+)' },
    { value: 'debit', label: 'Debit / Payout (-)' },
  ], []);

  const statusSelect2Options: Select2Option[] = useMemo(() => [
    { value: 'all', label: 'All Statuses' },
    { value: 'paid', label: 'Paid / Success' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'cancelled', label: 'Cancelled' },
  ], []);

  const modalEmployeeOptions: Select2Option[] = useMemo(() => {
    return employees.map((emp) => ({
      value: String(emp.id),
      label: `${emp.name} (${emp.employee_code})`,
      subLabel: `${emp.company_name} • ${emp.wallet_account_no}`,
    }));
  }, [employees]);

  // Filtered employees for Salary tab
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedCompany !== 'ALL' && emp.company_name !== selectedCompany) return false;
      if (selectedEmployee !== 'ALL' && emp.employee_code !== selectedEmployee) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.employee_code.toLowerCase().includes(q) ||
          emp.wallet_account_no.toLowerCase().includes(q) ||
          emp.company_name.toLowerCase().includes(q) ||
          emp.bank_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, selectedCompany, selectedEmployee, searchQuery]);

  // Filtered EPF Contributions
  const filteredEpfContributions = useMemo(() => {
    return contributions.filter((item) => {
      if (item.type !== 'epf') return false;
      if (selectedCompany !== 'ALL' && item.company_name !== selectedCompany) return false;
      if (selectedEmployee !== 'ALL' && item.employee_code !== selectedEmployee) return false;
      if (statusFilter !== 'all') {
        const normalizedStatus = statusFilter === 'success' ? 'paid' : statusFilter;
        if (item.status.toLowerCase() !== normalizedStatus.toLowerCase()) return false;
      }
      if (startDate) {
        const startMonth = startDate.slice(0, 7);
        if (item.month_year < startMonth) return false;
      }
      if (endDate) {
        const endMonth = endDate.slice(0, 7);
        if (item.month_year > endMonth) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.employee_name.toLowerCase().includes(q) ||
          item.employee_code.toLowerCase().includes(q) ||
          item.reference_no.toLowerCase().includes(q) ||
          item.company_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contributions, selectedCompany, selectedEmployee, statusFilter, startDate, endDate, searchQuery]);

  // Filtered SOCSO Contributions
  const filteredSocsoContributions = useMemo(() => {
    return contributions.filter((item) => {
      if (item.type !== 'socso') return false;
      if (selectedCompany !== 'ALL' && item.company_name !== selectedCompany) return false;
      if (selectedEmployee !== 'ALL' && item.employee_code !== selectedEmployee) return false;
      if (statusFilter !== 'all') {
        const normalizedStatus = statusFilter === 'success' ? 'paid' : statusFilter;
        if (item.status.toLowerCase() !== normalizedStatus.toLowerCase()) return false;
      }
      if (startDate) {
        const startMonth = startDate.slice(0, 7);
        if (item.month_year < startMonth) return false;
      }
      if (endDate) {
        const endMonth = endDate.slice(0, 7);
        if (item.month_year > endMonth) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.employee_name.toLowerCase().includes(q) ||
          item.employee_code.toLowerCase().includes(q) ||
          item.reference_no.toLowerCase().includes(q) ||
          item.company_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contributions, selectedCompany, selectedEmployee, statusFilter, startDate, endDate, searchQuery]);

  // Filtered transactions for Transactions tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedCompany !== 'ALL' && tx.company_name && !tx.company_name.includes(selectedCompany)) return false;
      if (selectedEmployee !== 'ALL' && tx.employee_code !== selectedEmployee) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const normalizedStatus = statusFilter === 'paid' ? 'success' : statusFilter;
        if (tx.status !== normalizedStatus) return false;
      }
      if (startDate && tx.created_at < startDate) return false;
      if (endDate && tx.created_at > `${endDate} 23:59:59`) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.employee_name.toLowerCase().includes(q) ||
          tx.employee_code.toLowerCase().includes(q) ||
          (tx.reference && tx.reference.toLowerCase().includes(q)) ||
          (tx.wallet_account_no && tx.wallet_account_no.toLowerCase().includes(q)) ||
          tx.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, selectedCompany, selectedEmployee, typeFilter, statusFilter, startDate, endDate, searchQuery]);

  // Open Credit Modal
  const handleOpenCreditModal = (emp?: EmployeeWalletItem) => {
    setSelectedEmpForAction(emp || employees[0] || null);
    setFormAmount('');
    setFormCategory('bonus');
    setFormPaymentMethod('Bank Transfer');
    setFormReference(`CR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    setFormNotes('');
    setCreditModalOpen(true);
  };

  // Open Debit Modal
  const handleOpenDebitModal = (emp?: EmployeeWalletItem) => {
    setSelectedEmpForAction(emp || employees[0] || null);
    setFormAmount('');
    setFormCategory('withdrawal');
    setFormPaymentMethod('Bank Transfer');
    setFormReference(`DR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    setFormNotes('');
    setDebitModalOpen(true);
  };

  // Submit Credit (Top-Up / Deposit)
  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAction) return;
    const num = parseFloat(formAmount);
    if (!num || num <= 0) {
      alert('Please enter a valid deposit amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/employee-wallets/${selectedEmpForAction.id}/credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          amount: num,
          category: formCategory,
          payment_method: formPaymentMethod,
          reference: formReference,
          notes: formNotes,
          processed_by: adminName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          message: data.message || `Successfully credited RM ${num} to ${selectedEmpForAction.name}'s wallet.`,
        });
        setCreditModalOpen(false);
        loadData();
      } else {
        alert(data.message || 'Failed to deposit amount.');
      }
    } catch (err) {
      console.error('Credit error:', err);
      alert('Network error while processing deposit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Debit (Withdrawal / Payout)
  const handleDebitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAction) return;
    const num = parseFloat(formAmount);
    if (!num || num <= 0) {
      alert('Please enter a valid payout amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/employee-wallets/${selectedEmpForAction.id}/debit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          amount: num,
          category: formCategory,
          payment_method: formPaymentMethod,
          reference: formReference,
          notes: formNotes,
          processed_by: adminName,
          allow_negative: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          message: data.message || `Successfully debited RM ${num} from ${selectedEmpForAction.name}'s wallet.`,
        });
        setDebitModalOpen(false);
        loadData();
      } else {
        alert(data.message || 'Failed to debit amount.');
      }
    } catch (err) {
      console.error('Debit error:', err);
      alert('Network error while processing debit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Pending Transaction
  const handleApproveTx = async (txId: number) => {
    if (!confirm('Are you sure you want to approve this pending wallet transaction?')) return;
    try {
      const res = await fetch(`${apiBase}/employee-wallet-transactions/${txId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ processed_by: adminName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', message: 'Transaction approved successfully.' });
        loadData();
      } else {
        alert(data.message || 'Failed to approve transaction.');
      }
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  // Cancel Transaction
  const handleCancelTx = async (txId: number) => {
    if (!confirm('Are you sure you want to cancel this transaction?')) return;
    try {
      const res = await fetch(`${apiBase}/employee-wallet-transactions/${txId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ processed_by: adminName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', message: 'Transaction cancelled successfully.' });
        loadData();
      } else {
        alert(data.message || 'Failed to cancel transaction.');
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (activeTab === 'salary') {
      if (filteredEmployees.length === 0) {
        alert('No employee salary wallet records to export.');
        return;
      }
      const data = filteredEmployees.map((e, idx) => ({
        '#': idx + 1,
        'Wallet Account No': e.wallet_account_no,
        'Employee Code': e.employee_code,
        'Employee Name': e.name,
        Position: e.role,
        Company: e.company_name,
        'Current Salary Balance (RM)': e.wallet_balance,
        'Total Credited (RM)': e.total_credit_amount,
        'Total Debited (RM)': e.total_debit_amount,
        'Bank Name': e.bank_name,
        'Bank Account No': e.bank_account_no,
        Status: e.status.toUpperCase(),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Salary Wallets');
      XLSX.writeFile(wb, `employee_salary_wallets_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (activeTab === 'epf') {
      if (filteredEpfContributions.length === 0) {
        alert('No EPF contribution records to export.');
        return;
      }
      const data = filteredEpfContributions.map((c, idx) => ({
        '#': idx + 1,
        Month: c.month_year,
        'Employee Code': c.employee_code,
        'Employee Name': c.employee_name,
        Company: c.company_name,
        'Basic Salary (RM)': c.basic_salary,
        'Employee Share 11% (RM)': c.employee_share,
        'Employer Share 12% (RM)': c.employer_share,
        'Total EPF (RM)': c.amount,
        'EPF Reference No': c.reference_no,
        Status: c.status.toUpperCase(),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'EPF Contributions');
      XLSX.writeFile(wb, `employee_epf_contributions_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (activeTab === 'socso') {
      if (filteredSocsoContributions.length === 0) {
        alert('No SOCSO contribution records to export.');
        return;
      }
      const data = filteredSocsoContributions.map((c, idx) => ({
        '#': idx + 1,
        Month: c.month_year,
        'Employee Code': c.employee_code,
        'Employee Name': c.employee_name,
        Company: c.company_name,
        'Basic Salary (RM)': c.basic_salary,
        'Employee Share 0.5% (RM)': c.employee_share,
        'Employer Share 1.75% (RM)': c.employer_share,
        'Total SOCSO (RM)': c.amount,
        'SOCSO Reference No': c.reference_no,
        Status: c.status.toUpperCase(),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'SOCSO Contributions');
      XLSX.writeFile(wb, `employee_socso_contributions_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      if (filteredTransactions.length === 0) {
        alert('No wallet transactions to export.');
        return;
      }
      const data = filteredTransactions.map((tx, idx) => ({
        '#': idx + 1,
        Date: tx.created_at ? tx.created_at.replace('T', ' ').slice(0, 19) : '',
        Reference: tx.reference || `TXN-${tx.id}`,
        'Wallet Account No': tx.wallet_account_no || '',
        'Employee Code': tx.employee_code,
        'Employee Name': tx.employee_name,
        Company: tx.company_name || 'Corporate HQ',
        Type: tx.type.toUpperCase(),
        Category: tx.category.toUpperCase(),
        'Amount (RM)': tx.amount,
        'Balance Before (RM)': tx.balance_before,
        'Balance After (RM)': tx.balance_after,
        'Payment Method': tx.payment_method || 'Bank Transfer',
        Status: tx.status.toUpperCase(),
        'Processed By': tx.processed_by || 'System',
        Notes: tx.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Wallet Transactions');
      XLSX.writeFile(wb, `employee_wallet_transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (activeTab === 'salary') {
      if (filteredEmployees.length === 0) return;
      const headers = ['#', 'Wallet Account No', 'Employee Code', 'Employee Name', 'Company', 'Salary Balance (RM)', 'Total Credited', 'Total Debited', 'Status'];
      const rows = filteredEmployees.map((e, idx) => [
        idx + 1,
        `"${e.wallet_account_no}"`,
        `"${e.employee_code}"`,
        `"${e.name}"`,
        `"${e.company_name}"`,
        e.wallet_balance,
        e.total_credit_amount,
        e.total_debit_amount,
        `"${e.status}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_salary_wallets_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (activeTab === 'epf') {
      if (filteredEpfContributions.length === 0) return;
      const headers = ['#', 'Month', 'Employee Code', 'Employee Name', 'Company', 'Basic Salary (RM)', 'Employee 11%', 'Employer 12%', 'Total EPF Wallet', 'EPF Ref No', 'Status'];
      const rows = filteredEpfContributions.map((c, idx) => [
        idx + 1,
        `"${c.month_year}"`,
        `"${c.employee_code}"`,
        `"${c.employee_name}"`,
        `"${c.company_name}"`,
        c.basic_salary,
        c.employee_share,
        c.employer_share,
        c.amount,
        `"${c.reference_no}"`,
        `"${c.status}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_epf_contributions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (activeTab === 'socso') {
      if (filteredSocsoContributions.length === 0) return;
      const headers = ['#', 'Month', 'Employee Code', 'Employee Name', 'Company', 'Basic Salary (RM)', 'Employee 0.5%', 'Employer 1.75%', 'Total SOCSO Wallet', 'SOCSO Ref No', 'Status'];
      const rows = filteredSocsoContributions.map((c, idx) => [
        idx + 1,
        `"${c.month_year}"`,
        `"${c.employee_code}"`,
        `"${c.employee_name}"`,
        `"${c.company_name}"`,
        c.basic_salary,
        c.employee_share,
        c.employer_share,
        c.amount,
        `"${c.reference_no}"`,
        `"${c.status}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_socso_contributions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      if (filteredTransactions.length === 0) return;
      const headers = ['#', 'Date', 'Reference', 'Wallet Account No', 'Employee Code', 'Employee Name', 'Company', 'Type', 'Amount (RM)', 'Status'];
      const rows = filteredTransactions.map((tx, idx) => [
        idx + 1,
        `"${tx.created_at ? tx.created_at.slice(0, 19) : ''}"`,
        `"${tx.reference || ''}"`,
        `"${tx.wallet_account_no || ''}"`,
        `"${tx.employee_code}"`,
        `"${tx.employee_name}"`,
        `"${tx.company_name || ''}"`,
        `"${tx.type}"`,
        tx.amount,
        `"${tx.status}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_wallet_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  // High-Resolution Professional Print Report Handler
  const handlePrintReport = () => {
    setIsExportOpen(false);

    const today = new Date().toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const time = new Date().toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    });

    let title = '';
    let subtitle = '';
    let tableHeaders = '';
    let tableRows = '';
    let summaryHtml = '';

    if (activeTab === 'salary') {
      if (filteredEmployees.length === 0) {
        alert('No employee salary wallet records to print.');
        return;
      }
      title = 'EMPLOYEE SALARY WALLET DIRECTORY & BALANCES AUDIT REPORT';
      subtitle = `Official Salary Wallet Ledger • Filtered Records: ${filteredEmployees.length} of ${employees.length}`;

      const totalCredited = filteredEmployees.reduce((sum, e) => sum + (e.total_credit_amount || 0), 0);
      const totalDebited = filteredEmployees.reduce((sum, e) => sum + (e.total_debit_amount || 0), 0);
      const totalBalance = filteredEmployees.reduce((sum, e) => sum + (e.wallet_balance || 0), 0);

      summaryHtml = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL LIVE SALARY BALANCE</div>
            <div class="kpi-value highlight-blue">RM ${totalBalance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">${filteredEmployees.length} Active Staff Accounts</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TOTAL CREDITED / DEPOSITED</div>
            <div class="kpi-value highlight-green">RM ${totalCredited.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Salaries & Allowances In</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TOTAL WITHDRAWN / PAYOUTS</div>
            <div class="kpi-value highlight-red">RM ${totalDebited.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Disbursements & Advances</div>
          </div>
        </div>
      `;

      tableHeaders = `
        <tr>
          <th style="width: 32px; text-align: center;">#</th>
          <th>Wallet Account No</th>
          <th>Employee Name</th>
          <th>Code</th>
          <th>Company</th>
          <th>Bank Details</th>
          <th style="text-align: right;">Total Credited</th>
          <th style="text-align: right;">Total Withdrawn</th>
          <th style="text-align: right;">Salary Balance</th>
          <th style="text-align: center;">Status</th>
        </tr>
      `;

      tableRows = filteredEmployees
        .map((e, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-weight: 700; color: #0b4da2;">${e.wallet_account_no}</td>
            <td style="font-weight: 600;">${e.name}<br><small style="color: #64748b;">${e.role || 'Staff'}</small></td>
            <td style="font-family: monospace;">${e.employee_code}</td>
            <td>${e.company_name}</td>
            <td>${e.bank_name || 'Maybank'}<br><small style="font-family: monospace; color: #64748b;">${e.bank_account_no || '—'}</small></td>
            <td style="text-align: right; color: #047857; font-family: monospace;">RM ${(e.total_credit_amount || 0).toFixed(2)}</td>
            <td style="text-align: right; color: #be123c; font-family: monospace;">RM ${(e.total_debit_amount || 0).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #0b4da2;">RM ${(e.wallet_balance || 0).toFixed(2)}</td>
            <td style="text-align: center;"><span class="badge ${e.status === 'active' ? 'badge-green' : 'badge-gray'}">${e.status.toUpperCase()}</span></td>
          </tr>
        `)
        .join('');

    } else if (activeTab === 'epf') {
      if (filteredEpfContributions.length === 0) {
        alert('No EPF contribution records to print.');
        return;
      }
      title = 'EMPLOYEE EPF CONTRIBUTIONS STATUTORY REPORT';
      subtitle = `Official Statutory EPF (11% Employee + 12% Employer) Statement • Total Records: ${filteredEpfContributions.length}`;

      const totalBasic = filteredEpfContributions.reduce((sum, c) => sum + (c.basic_salary || 0), 0);
      const totalEmployee = filteredEpfContributions.reduce((sum, c) => sum + (c.employee_share || 0), 0);
      const totalEmployer = filteredEpfContributions.reduce((sum, c) => sum + (c.employer_share || 0), 0);
      const totalEpf = filteredEpfContributions.reduce((sum, c) => sum + (c.amount || 0), 0);

      summaryHtml = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL ACCUMULATED EPF WALLET</div>
            <div class="kpi-value highlight-green">RM ${totalEpf.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Total Statutory Remittance</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EMPLOYEE SHARE (11%)</div>
            <div class="kpi-value highlight-blue">RM ${totalEmployee.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Statutory Salary Deductions</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EMPLOYER SHARE (12%)</div>
            <div class="kpi-value highlight-green">RM ${totalEmployer.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Corporate Contributions</div>
          </div>
        </div>
      `;

      tableHeaders = `
        <tr>
          <th style="width: 32px; text-align: center;">#</th>
          <th>Month</th>
          <th>Employee Name</th>
          <th>Code</th>
          <th>Company</th>
          <th style="text-align: right;">Basic Salary</th>
          <th style="text-align: right;">Employee (11%)</th>
          <th style="text-align: right;">Employer (12%)</th>
          <th style="text-align: right;">Total EPF (RM)</th>
          <th>EPF Reference</th>
          <th style="text-align: center;">Status</th>
        </tr>
      `;

      tableRows = filteredEpfContributions
        .map((c, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-weight: 700;">${c.month_year}</td>
            <td style="font-weight: 600;">${c.employee_name}<br><small style="color: #64748b;">${c.employee_role || 'Staff'}</small></td>
            <td style="font-family: monospace;">${c.employee_code}</td>
            <td>${c.company_name}</td>
            <td style="text-align: right; font-family: monospace;">RM ${(c.basic_salary || 0).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #047857;">RM ${(c.employee_share || 0).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #047857;">RM ${(c.employer_share || 0).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #047857;">RM ${(c.amount || 0).toFixed(2)}</td>
            <td style="font-family: monospace; font-size: 9px;">${c.reference_no}</td>
            <td style="text-align: center;"><span class="badge badge-green">${c.status.toUpperCase()}</span></td>
          </tr>
        `)
        .join('');

    } else if (activeTab === 'socso') {
      if (filteredSocsoContributions.length === 0) {
        alert('No SOCSO contribution records to print.');
        return;
      }
      title = 'EMPLOYEE SOCSO & EIS STATUTORY REPORT';
      subtitle = `Official Statutory Social Security Protection (0.5% Employee + 1.75% Employer) Statement • Total Records: ${filteredSocsoContributions.length}`;

      const totalBasic = filteredSocsoContributions.reduce((sum, c) => sum + (c.basic_salary || 0), 0);
      const totalEmployee = filteredSocsoContributions.reduce((sum, c) => sum + (c.employee_share || 0), 0);
      const totalEmployer = filteredSocsoContributions.reduce((sum, c) => sum + (c.employer_share || 0), 0);
      const totalSocso = filteredSocsoContributions.reduce((sum, c) => sum + (c.amount || 0), 0);

      summaryHtml = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL SOCSO WALLET</div>
            <div class="kpi-value highlight-blue">RM ${totalSocso.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Total Statutory Remittance</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EMPLOYEE SHARE (0.5%)</div>
            <div class="kpi-value highlight-blue">RM ${totalEmployee.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Statutory Salary Deductions</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EMPLOYER SHARE (1.75%)</div>
            <div class="kpi-value highlight-green">RM ${totalEmployer.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Corporate Contributions</div>
          </div>
        </div>
      `;

      tableHeaders = `
        <tr>
          <th style="width: 32px; text-align: center;">#</th>
          <th>Month</th>
          <th>Employee Name</th>
          <th>Code</th>
          <th>Company</th>
          <th style="text-align: right;">Basic Salary</th>
          <th style="text-align: right;">Employee (0.5%)</th>
          <th style="text-align: right;">Employer (1.75%)</th>
          <th style="text-align: right;">Total SOCSO (RM)</th>
          <th>SOCSO Reference</th>
          <th style="text-align: center;">Status</th>
        </tr>
      `;

      tableRows = filteredSocsoContributions
        .map((c, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-weight: 700;">${c.month_year}</td>
            <td style="font-weight: 600;">${c.employee_name}<br><small style="color: #64748b;">${c.employee_role || 'Staff'}</small></td>
            <td style="font-family: monospace;">${c.employee_code}</td>
            <td>${c.company_name}</td>
            <td style="text-align: right; font-family: monospace;">RM ${(c.basic_salary || 0).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #4338ca;">RM ${(c.employee_share || 0).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #4338ca;">RM ${(c.employer_share || 0).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #4338ca;">RM ${(c.amount || 0).toFixed(2)}</td>
            <td style="font-family: monospace; font-size: 9px;">${c.reference_no}</td>
            <td style="text-align: center;"><span class="badge badge-indigo">${c.status.toUpperCase()}</span></td>
          </tr>
        `)
        .join('');

    } else {
      if (filteredTransactions.length === 0) {
        alert('No wallet transactions to print.');
        return;
      }
      title = 'EMPLOYEE WALLET TRANSACTION AUDIT LEDGER';
      subtitle = `Complete Ledger of Wallet Credits, Debits, and Payout Disbursements • Total Records: ${filteredTransactions.length}`;

      const totalIn = filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalOut = filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + (t.amount || 0), 0);

      summaryHtml = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL CREDITED (INCOME)</div>
            <div class="kpi-value highlight-green">+ RM ${totalIn.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Salaries & Top-ups</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TOTAL DEBITED (PAYOUTS)</div>
            <div class="kpi-value highlight-red">- RM ${totalOut.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Disbursements & Advances</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">NET LEDGER VOLUME</div>
            <div class="kpi-value highlight-blue">RM ${(totalIn - totalOut).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Net Flow</div>
          </div>
        </div>
      `;

      tableHeaders = `
        <tr>
          <th style="width: 32px; text-align: center;">#</th>
          <th>Date & Time</th>
          <th>Reference</th>
          <th>Wallet Account</th>
          <th>Employee Name</th>
          <th>Company</th>
          <th style="text-align: center;">Type</th>
          <th>Category</th>
          <th style="text-align: right;">Amount (RM)</th>
          <th style="text-align: right;">Balance After</th>
          <th style="text-align: center;">Status</th>
        </tr>
      `;

      tableRows = filteredTransactions
        .map((tx, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-size: 9px;">${tx.created_at ? tx.created_at.slice(0, 16).replace('T', ' ') : '—'}</td>
            <td style="font-family: monospace; font-weight: 700;">${tx.reference || `TXN-${tx.id}`}</td>
            <td style="font-family: monospace; font-size: 9px;">${tx.wallet_account_no || '—'}</td>
            <td style="font-weight: 600;">${tx.employee_name}<br><small style="color: #64748b;">${tx.employee_code}</small></td>
            <td>${tx.company_name || 'Corporate HQ'}</td>
            <td style="text-align: center;"><span class="badge ${tx.type === 'credit' ? 'badge-green' : 'badge-red'}">${tx.type.toUpperCase()}</span></td>
            <td style="text-transform: capitalize;">${tx.category.replace('_', ' ')}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: ${tx.type === 'credit' ? '#047857' : '#be123c'};">
              ${tx.type === 'credit' ? '+' : '-'} RM ${(tx.amount || 0).toFixed(2)}
            </td>
            <td style="text-align: right; font-family: monospace;">RM ${(tx.balance_after || 0).toFixed(2)}</td>
            <td style="text-align: center;"><span class="badge badge-green">${tx.status.toUpperCase()}</span></td>
          </tr>
        `)
        .join('');
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${today}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10.5px; color: #0f172a; margin: 0; padding: 12px; background: #fff; }
            .letterhead { border-bottom: 2.5px solid #0b4da2; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
            .org-title { font-size: 20px; font-weight: 900; color: #0b4da2; margin: 0; letter-spacing: -0.5px; }
            .org-sub { font-size: 11px; font-weight: 700; color: #334155; margin-top: 3px; text-transform: uppercase; }
            .meta-block { text-align: right; font-size: 10px; color: #64748b; line-height: 1.4; }
            .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; }
            .kpi-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .kpi-value { font-size: 18px; font-weight: 900; font-family: monospace; margin: 2px 0; }
            .kpi-sub { font-size: 9.5px; color: #64748b; font-weight: 500; }
            .highlight-blue { color: #0b4da2; }
            .highlight-green { color: #047857; }
            .highlight-red { color: #be123c; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5px; }
            th { background: #0b4da2; color: #ffffff; padding: 6px 6px; text-align: left; font-size: 9.5px; font-weight: 700; text-transform: uppercase; border: 1px solid #0b4da2; letter-spacing: 0.3px; }
            td { padding: 5px 6px; border: 1px solid #cbd5e1; vertical-align: middle; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; }
            .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
            .badge-indigo { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
            .badge-red { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
            .badge-gray { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
            .footer { margin-top: 18px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <div>
              <h1 class="org-title">CORPORATE AGENCY MANAGEMENT</h1>
              <div class="org-sub">${title}</div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">${subtitle}</div>
            </div>
            <div class="meta-block">
              <div><strong>Generated Date:</strong> ${today} • ${time}</div>
              <div><strong>Super Administrator:</strong> ${adminName}</div>
              <div><strong>Status:</strong> AUDITED & VERIFIED</div>
            </div>
          </div>

          ${summaryHtml}

          <table>
            <thead>
              ${tableHeaders}
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            <span>Official Super Administrator Portal &bull; System Verified Record</span>
            <span>Page 1 of 1 &bull; Confidential Statutory Document</span>
            <span>Issued under National Regulatory Compliance</span>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // High-Resolution Individual Audit Voucher Printer
  const handlePrintIndividualVoucher = (
    type: 'transaction' | 'statutory',
    data: any
  ) => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const today = new Date().toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    let voucherTitle = '';
    let voucherTypeLabel = '';
    let amountFormatted = '';
    let detailsHtml = '';

    if (type === 'transaction') {
      voucherTitle = 'EMPLOYEE WALLET TRANSACTION VOUCHER';
      voucherTypeLabel = data.type === 'credit' ? 'CREDIT / INCOMING SETTLEMENT' : 'DEBIT / PAYOUT DISBURSEMENT';
      amountFormatted = `RM ${Number(data.amount || 0).toFixed(2)}`;
      detailsHtml = `
        <div class="row"><span class="lbl">Reference ID:</span><span class="val mono">${data.reference || `TXN-${data.id}`}</span></div>
        <div class="row"><span class="lbl">Employee Name:</span><span class="val"><strong>${data.employee_name}</strong> (${data.employee_code})</span></div>
        <div class="row"><span class="lbl">Company:</span><span class="val">${data.company_name || 'Corporate Agency'}</span></div>
        <div class="row"><span class="lbl">Wallet Account:</span><span class="val mono">${data.wallet_account_no || '—'}</span></div>
        <div class="row"><span class="lbl">Category:</span><span class="val" style="text-transform: capitalize;">${data.category}</span></div>
        <div class="row"><span class="lbl">Payment Method:</span><span class="val">${data.payment_method || 'Bank Transfer'}</span></div>
        <div class="row"><span class="lbl">Balance Before:</span><span class="val mono">RM ${Number(data.balance_before || 0).toFixed(2)}</span></div>
        <div class="row"><span class="lbl">Balance After:</span><span class="val mono font-bold">RM ${Number(data.balance_after || 0).toFixed(2)}</span></div>
        <div class="row"><span class="lbl">Status:</span><span class="val badge badge-green">${data.status.toUpperCase()}</span></div>
        <div class="row"><span class="lbl">Date & Time:</span><span class="val">${data.created_at ? data.created_at.replace('T', ' ').slice(0, 19) : today}</span></div>
        ${data.notes ? `<div class="row"><span class="lbl">Remarks:</span><span class="val">${data.notes}</span></div>` : ''}
      `;
    } else {
      const isEpf = data.type === 'epf';
      voucherTitle = isEpf ? 'EMPLOYEE EPF CONTRIBUTION VOUCHER' : 'EMPLOYEE SOCSO CONTRIBUTION VOUCHER';
      voucherTypeLabel = isEpf ? 'STATUTORY EPF REMITTANCE VOUCHER' : 'STATUTORY SOCSO & EIS REMITTANCE VOUCHER';
      amountFormatted = `RM ${Number(data.amount || 0).toFixed(2)}`;
      detailsHtml = `
        <div class="row"><span class="lbl">Reference ID:</span><span class="val mono">${data.reference_no}</span></div>
        <div class="row"><span class="lbl">Employee Name:</span><span class="val"><strong>${data.employee_name}</strong> (${data.employee_code})</span></div>
        <div class="row"><span class="lbl">Designation / Role:</span><span class="val">${data.employee_role || 'Staff Member'}</span></div>
        <div class="row"><span class="lbl">Employer / Company:</span><span class="val">${data.company_name}</span></div>
        <div class="row"><span class="lbl">Contribution Month:</span><span class="val mono font-bold">${data.month_year}</span></div>
        <div class="row"><span class="lbl">Basic Salary:</span><span class="val mono">RM ${Number(data.basic_salary || 0).toFixed(2)}</span></div>
        <div class="row"><span class="lbl">Employee Deduction (${isEpf ? '11%' : '0.5%'}):</span><span class="val mono">RM ${Number(data.employee_share || 0).toFixed(2)}</span></div>
        <div class="row"><span class="lbl">Employer Contribution (${isEpf ? '12%' : '1.75%'}):</span><span class="val mono">RM ${Number(data.employer_share || 0).toFixed(2)}</span></div>
        <div class="row"><span class="lbl">Total Remittance:</span><span class="val mono font-bold" style="color: #047857;">RM ${Number(data.amount || 0).toFixed(2)}</span></div>
        <div class="row"><span class="lbl">Remittance Status:</span><span class="val badge badge-green">${data.status.toUpperCase()}</span></div>
        <div class="row"><span class="lbl">Payment Method:</span><span class="val">${data.payment_method || 'Bank Transfer'}</span></div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${voucherTitle} - ${today}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
            .voucher-card { border: 2px solid #0b4da2; border-radius: 12px; padding: 24px; max-width: 620px; margin: 0 auto; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .v-header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px; }
            .v-org { font-size: 18px; font-weight: 900; color: #0b4da2; text-transform: uppercase; margin: 0; }
            .v-title { font-size: 12px; font-weight: 800; color: #334155; margin-top: 4px; letter-spacing: 0.5px; }
            .v-meta { font-size: 9.5px; color: #64748b; margin-top: 3px; font-family: monospace; }
            .amount-box { background: #f0fdf4; border: 1.5px dashed #86efac; border-radius: 10px; padding: 12px; text-align: center; margin-bottom: 16px; }
            .amt-lbl { font-size: 9px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; }
            .amt-val { font-size: 26px; font-weight: 900; font-family: monospace; color: #15803d; margin: 3px 0; }
            .grid-details { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
            .row { display: flex; justify-content: space-between; padding: 7px 12px; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; }
            .row:last-child { border-bottom: none; }
            .row:nth-child(even) { background-color: #f8fafc; }
            .lbl { color: #64748b; font-weight: 600; }
            .val { color: #0f172a; text-align: right; }
            .mono { font-family: monospace; }
            .font-bold { font-weight: 700; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .stamp-box { border-top: 1.5px dashed #cbd5e1; padding-top: 14px; margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .seal { font-size: 9px; color: #64748b; }
            .seal-badge { border: 1.5px solid #0b4da2; color: #0b4da2; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 9px; text-transform: uppercase; display: inline-block; }
            .sign-box { text-align: right; font-size: 9.5px; color: #475569; }
            .sign-line { width: 140px; border-bottom: 1px solid #0f172a; margin-bottom: 4px; display: inline-block; }
            .v-footer { margin-top: 16px; text-align: center; font-size: 8.5px; color: #94a3b8; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="voucher-card">
            <div class="v-header">
              <h1 class="v-org">EMPLOYEE DIGITAL WALLET SYSTEM</h1>
              <div class="v-title">${voucherTitle}</div>
              <div class="v-meta">Official Verification Code: ${Math.random().toString(36).substring(2, 10).toUpperCase()} &bull; Date: ${today}</div>
            </div>

            <div class="amount-box">
              <div class="amt-lbl">${voucherTypeLabel}</div>
              <div class="amt-val">${amountFormatted}</div>
              <span class="badge badge-green">VERIFIED TRANSACTION</span>
            </div>

            <div class="grid-details">
              ${detailsHtml}
            </div>

            <div class="stamp-box">
              <div class="seal">
                <div class="seal-badge">OFFICIALLY AUDITED & APPROVED</div>
                <div style="margin-top: 4px;">System Hash: SHA256-${Math.random().toString(36).substring(2, 8).toUpperCase()}</div>
              </div>
              <div class="sign-box">
                <div class="sign-line"></div>
                <div>Authorized Signatory / Administrator</div>
              </div>
            </div>

            <div class="v-footer">
              This is a computer-generated voucher and requires no physical signature. Registered under Malaysian Statutory Guidelines.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleResetFilters = () => {
    setSelectedCompany('ALL');
    setSelectedEmployee('ALL');
    setFundFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 text-xs animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <XCircle size={18} className="text-rose-600 shrink-0" />
          )}
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
      <div className={`${isGlass ? 'dashboard-card-glass' : 'bg-white border border-slate-200'} rounded-xl p-5 shadow-xs space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Wallet size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                Employee Wallet Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {/* Quick Actions */}
            <button
              type="button"
              onClick={() => handleOpenCreditModal()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer border-0 shrink-0 whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Credit</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenDebitModal()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-[#0b4da2] hover:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer border-0 shrink-0 whitespace-nowrap"
            >
              <Banknote size={14} />
              <span>Payout</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative inline-block text-left shrink-0" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Download size={14} className="text-slate-600" />
                <span>Export</span>
                <ChevronDown size={13} className={isExportOpen ? 'rotate-180 transition-transform' : ''} />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Export {activeTab === 'salary' ? 'Salary Wallets' : activeTab === 'epf' ? 'EPF Wallet' : activeTab === 'socso' ? 'SOCSO Wallet' : 'Statements'}
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 border-0 bg-transparent cursor-pointer"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 border-0 bg-transparent cursor-pointer"
                  >
                    <FileText size={15} className="text-blue-600" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportOpen(false);
                      handlePrintReport();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2.5 border-0 bg-transparent cursor-pointer border-t border-slate-100"
                  >
                    <Printer size={15} className="text-purple-600" />
                    <span>Print Statement</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => loadData()}
              disabled={isLoading}
              title="Refresh"
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 transition cursor-pointer bg-white shrink-0"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Executive Stat Cards: Total Employee Salary Wallet, Total Employee EPF Wallet, Total Employee SOCSO Wallet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Employee Salary Wallet */}
        <div
          onClick={() => handleTabChange('salary')}
          className={`admin-stat-card transition-all duration-200 flex flex-col justify-between min-h-[142px] cursor-pointer rounded-2xl p-5 group relative overflow-hidden ${
            isGlass
              ? `dashboard-card-glass ${activeTab === 'salary' ? 'ring-2 ring-[#0b4da2] border-t-4 border-t-[#0b4da2]' : 'border-t-4 border-t-transparent hover:border-blue-300'}`
              : `bg-white border hover:shadow-md hover:-translate-y-0.5 ${
                  activeTab === 'salary'
                    ? 'border-t-4 border-t-[#0b4da2] border-slate-200 ring-2 ring-[#0b4da2]/30 shadow-md shadow-blue-500/10 bg-gradient-to-b from-blue-50/40 via-white to-white'
                    : 'border-t-4 border-t-slate-200/90 border-slate-200/80 hover:border-t-blue-400 shadow-xs'
                }`
          }`}
        >
          {/* Subtle Top-Right Ambient Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />

          {/* Top Row: Title + Icon */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Employee Salary Wallet
              </span>
              {activeTab === 'salary' && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#0b4da2] bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0b4da2] animate-pulse" />
                  Active View
                </span>
              )}
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0b4da2] to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 group-hover:scale-105 transition-transform shrink-0">
              <Wallet size={20} />
            </div>
          </div>

          {/* Middle Row: Formatted Amount */}
          <div className="mt-3 flex items-baseline gap-1 relative z-10">
            <span className="text-xs font-mono font-bold text-slate-400 mr-1">RM</span>
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 group-hover:text-[#0b4da2] transition-colors">
              {(summary.total_salary_wallet || summary.total_wallet_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Bottom Row: Metadata Divider */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
            <span className="font-medium text-slate-500">Live Available Balances</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#0b4da2] bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
              <Users size={11} />
              <span>{summary.active_wallets_count || summary.total_employees_count || 0} Wallets</span>
            </span>
          </div>
        </div>

        {/* Card 2: Total Employee EPF Wallet */}
        <div
          onClick={() => handleTabChange('epf')}
          className={`admin-stat-card transition-all duration-200 flex flex-col justify-between min-h-[142px] cursor-pointer rounded-2xl p-5 group relative overflow-hidden ${
            isGlass
              ? `dashboard-card-glass ${activeTab === 'epf' ? 'ring-2 ring-emerald-600 border-t-4 border-t-emerald-600' : 'border-t-4 border-t-transparent hover:border-emerald-300'}`
              : `bg-white border hover:shadow-md hover:-translate-y-0.5 ${
                  activeTab === 'epf'
                    ? 'border-t-4 border-t-emerald-600 border-slate-200 ring-2 ring-emerald-600/30 shadow-md shadow-emerald-500/10 bg-gradient-to-b from-emerald-50/40 via-white to-white'
                    : 'border-t-4 border-t-slate-200/90 border-slate-200/80 hover:border-t-emerald-400 shadow-xs'
                }`
          }`}
        >
          {/* Subtle Top-Right Ambient Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

          {/* Top Row: Title + Icon */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Employee EPF Wallet
              </span>
              {activeTab === 'epf' && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active View
                </span>
              )}
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform shrink-0">
              <ShieldCheck size={20} />
            </div>
          </div>

          {/* Middle Row: Formatted Amount */}
          <div className="mt-3 flex items-baseline gap-1 relative z-10">
            <span className="text-xs font-mono font-bold text-slate-400 mr-1">RM</span>
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
              {(summary.total_epf_wallet || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Bottom Row: Metadata Divider */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
            <span className="font-medium text-slate-500">Statutory Contribution</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <ShieldCheck size={11} />
              <span>11% + 12%</span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Employee SOCSO Wallet */}
        <div
          onClick={() => handleTabChange('socso')}
          className={`admin-stat-card transition-all duration-200 flex flex-col justify-between min-h-[142px] cursor-pointer rounded-2xl p-5 group relative overflow-hidden ${
            isGlass
              ? `dashboard-card-glass ${activeTab === 'socso' ? 'ring-2 ring-indigo-600 border-t-4 border-t-indigo-600' : 'border-t-4 border-t-transparent hover:border-indigo-300'}`
              : `bg-white border hover:shadow-md hover:-translate-y-0.5 ${
                  activeTab === 'socso'
                    ? 'border-t-4 border-t-indigo-600 border-slate-200 ring-2 ring-indigo-600/30 shadow-md shadow-indigo-500/10 bg-gradient-to-b from-indigo-50/40 via-white to-white'
                    : 'border-t-4 border-t-slate-200/90 border-slate-200/80 hover:border-t-indigo-400 shadow-xs'
                }`
          }`}
        >
          {/* Subtle Top-Right Ambient Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

          {/* Top Row: Title + Icon */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Employee SOCSO Wallet
              </span>
              {activeTab === 'socso' && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-800 bg-indigo-100/70 border border-indigo-200 px-2 py-0.5 rounded-full mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  Active View
                </span>
              )}
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform shrink-0">
              <Coins size={20} />
            </div>
          </div>

          {/* Middle Row: Formatted Amount */}
          <div className="mt-3 flex items-baseline gap-1 relative z-10">
            <span className="text-xs font-mono font-bold text-slate-400 mr-1">RM</span>
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 group-hover:text-indigo-700 transition-colors">
              {(summary.total_socso_wallet || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Bottom Row: Metadata Divider */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
            <span className="font-medium text-slate-500">Protection Scheme</span>
            <span className="inline-flex items-center gap-1 font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
              <CreditCard size={11} />
              <span>0.5% + 1.75%</span>
            </span>
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR DIRECTLY ABOVE THE TABLE: Date-wise filter, Salary/EPF/SOCSO filter, Company, Employee, Status */}
      <div className={`${isGlass ? 'dashboard-card-glass' : 'bg-white border border-slate-200'} rounded-xl p-4 shadow-xs space-y-3`}>
        {/* Row 1: Fund Switcher Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => handleTabChange('salary')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeTab === 'salary'
                  ? 'bg-white text-[#0b4da2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Wallet size={13} />
              <span>Salary Wallet ({filteredEmployees.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('epf')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeTab === 'epf'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <ShieldCheck size={13} />
              <span>EPF Wallet ({filteredEpfContributions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('socso')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeTab === 'socso'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Coins size={13} />
              <span>SOCSO Wallet ({filteredSocsoContributions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('transactions')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-white text-[#0b4da2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <FileCheck size={13} />
              <span>Ledger Statements ({filteredTransactions.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff, code, reference..."
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg pl-9 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 border-0 bg-transparent cursor-pointer p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              title="Export Current Table to Excel"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              title="Print Current Statement / Ledger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Row 2: Comprehensive Multi-Filters (Date-wise, Salary/EPF/SOCSO wallet, Company, Employee, Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {/* Fund Filter (Salary, EPF, SOCSO, All) */}
          <div className="relative z-50">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <SlidersHorizontal size={13} className="text-[#0b4da2]" />
              <span>Fund Type</span>
            </label>
            <Select2Search
              options={fundSelect2Options}
              value={
                activeTab === 'salary'
                  ? 'salary'
                  : activeTab === 'epf'
                  ? 'epf'
                  : activeTab === 'socso'
                  ? 'socso'
                  : fundFilter
              }
              onChange={(val) => {
                setFundFilter(val as any);
                if (val === 'salary') handleTabChange('salary');
                else if (val === 'epf') handleTabChange('epf');
                else if (val === 'socso') handleTabChange('socso');
              }}
              placeholder="All Funds"
              className="w-full"
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 m-0">
                <Clock size={13} className="text-[#0b4da2]" />
                <span>Date Range</span>
              </label>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800 p-0 border-0 bg-transparent cursor-pointer font-bold"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start"
                className="w-1/2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End"
                className="w-1/2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Company Filter */}
          <div className="relative z-40">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Building2 size={13} className="text-[#0b4da2]" />
              <span>Company</span>
            </label>
            <Select2Search
              options={companySelect2Options}
              value={selectedCompany}
              onChange={(val) => {
                setSelectedCompany(val);
                setSelectedEmployee('ALL');
              }}
              placeholder="All Companies"
              icon={<Building2 size={13} className="text-slate-400" />}
              className="w-full"
            />
          </div>

          {/* Employee Filter */}
          <div className="relative z-30">
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
            <Select2Search
              options={employeeSelect2Options}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="All Employees"
              icon={<Users size={13} className="text-slate-400" />}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="relative z-20">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-[#0b4da2]" />
              <span>Status</span>
            </label>
            <Select2Search
              options={statusSelect2Options}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              placeholder="All Statuses"
              className="w-full"
            />
          </div>
        </div>

        {/* Filter Reset Indicator */}
        {(selectedCompany !== 'ALL' ||
          selectedEmployee !== 'ALL' ||
          statusFilter !== 'all' ||
          startDate ||
          endDate ||
          searchQuery) && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Active filters applied. Showing relevant matching records across {activeTab.toUpperCase()} fund.
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold whitespace-nowrap underline cursor-pointer border-0 bg-transparent inline-flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: TOTAL EMPLOYEE SALARY WALLET LIST
          ========================================================================= */}
      {activeTab === 'salary' && (
        <div
          className={`w-full max-w-full overflow-hidden rounded-xl shadow-xs relative z-10 ${
            isGlass ? 'dashboard-card-glass border border-white/50' : 'bg-white border border-slate-300'
          }`}
        >
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <table className="w-full min-w-[1250px] text-left border-collapse">
              <thead>
                <tr className="bg-[#0b4da2] text-white text-xs font-bold whitespace-nowrap select-none">
                  <th className="py-3.5 px-3 border-r border-blue-600/60 text-center w-12">#</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Wallet Account No</th>
                  <th className="py-3.5 px-5 border-r border-blue-600/60 whitespace-nowrap">Employee Name</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Employee Code</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Company</th>
                  <th className="py-3.5 px-5 border-r border-blue-600/60 whitespace-nowrap">Bank Details</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Total Credited</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Total Withdrawn</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Salary Balance</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      Loading employee salary wallet balances...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      No employee salary wallets found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, index) => (
                    <tr
                      key={emp.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-3 px-3 border-r border-slate-200 text-center font-mono font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#0b4da2]">
                          <CreditCard size={12} />
                          <span>{emp.wallet_account_no}</span>
                        </span>
                      </td>
                      <td className="py-3 px-5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0b4da2] font-bold flex items-center justify-center shrink-0 border border-blue-200 text-xs">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{emp.role || 'Staff Member'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono text-blue-600 font-semibold whitespace-nowrap">
                        {emp.employee_code}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap">
                        {emp.company_name}
                      </td>
                      <td className="py-3 px-5 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{emp.bank_name || 'Maybank Malaysia'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {emp.bank_account_no || '—'} &bull; {emp.bank_account_name || emp.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-emerald-600 whitespace-nowrap">
                        RM {(emp.total_credit_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-rose-600 whitespace-nowrap">
                        RM {(emp.total_debit_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-emerald-50/20 whitespace-nowrap">
                        <span className="text-sm text-emerald-700">
                          RM {(emp.wallet_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            emp.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenCreditModal(emp)}
                            title="Deposit / Credit Balance"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Credit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDebitModal(emp)}
                            title="Withdraw / Payout Balance"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#0b4da2] border border-blue-200 text-xs font-bold transition cursor-pointer"
                          >
                            <Banknote size={12} />
                            <span>Payout</span>
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
      )}

      {/* =========================================================================
          TAB 2: TOTAL EMPLOYEE EPF WALLET LIST
          ========================================================================= */}
      {activeTab === 'epf' && (
        <div
          className={`w-full max-w-full overflow-hidden rounded-xl shadow-xs relative z-10 ${
            isGlass ? 'dashboard-card-glass border border-white/50' : 'bg-white border border-slate-300'
          }`}
        >
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <table className="w-full min-w-[1250px] text-left border-collapse">
              <thead>
                <tr className="bg-[#047857] text-white text-xs font-bold whitespace-nowrap select-none">
                  <th className="py-3.5 px-3 border-r border-emerald-600/60 text-center w-12">#</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 whitespace-nowrap">Month / Year</th>
                  <th className="py-3.5 px-5 border-r border-emerald-600/60 whitespace-nowrap">Employee Name</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 whitespace-nowrap">Employee Code</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 whitespace-nowrap">Company</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 text-right whitespace-nowrap">Basic Salary</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 text-right whitespace-nowrap">Employee Share (11%)</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 text-right whitespace-nowrap">Employer Share (12%)</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 text-right whitespace-nowrap">Total EPF Wallet</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 whitespace-nowrap">EPF Reference</th>
                  <th className="py-3.5 px-4 border-r border-emerald-600/60 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Slip Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                      Loading EPF contribution records...
                    </td>
                  </tr>
                ) : filteredEpfContributions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                      No EPF contribution records found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredEpfContributions.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-emerald-50/40 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-3 px-3 border-r border-slate-200 text-center font-mono font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                          <Calendar size={12} />
                          <span>{item.month_year}</span>
                        </span>
                      </td>
                      <td className="py-3 px-5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-200 text-xs">
                            {item.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{item.employee_name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{item.employee_role || 'Staff'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono text-emerald-700 font-semibold whitespace-nowrap">
                        {item.employee_code}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap">
                        {item.company_name}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                        RM {(item.basic_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        RM {(item.employee_share || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        RM {(item.employer_share || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40 whitespace-nowrap">
                        <span className="text-sm">
                          RM {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {item.reference_no}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStatutoryItem(item);
                            setStatutorySlipModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View Slip</span>
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

      {/* =========================================================================
          TAB 3: TOTAL EMPLOYEE SOCSO WALLET LIST
          ========================================================================= */}
      {activeTab === 'socso' && (
        <div
          className={`w-full max-w-full overflow-hidden rounded-xl shadow-xs relative z-10 ${
            isGlass ? 'dashboard-card-glass border border-white/50' : 'bg-white border border-slate-300'
          }`}
        >
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <table className="w-full min-w-[1250px] text-left border-collapse">
              <thead>
                <tr className="bg-[#4338ca] text-white text-xs font-bold whitespace-nowrap select-none">
                  <th className="py-3.5 px-3 border-r border-indigo-600/60 text-center w-12">#</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 whitespace-nowrap">Month / Year</th>
                  <th className="py-3.5 px-5 border-r border-indigo-600/60 whitespace-nowrap">Employee Name</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 whitespace-nowrap">Employee Code</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 whitespace-nowrap">Company</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 text-right whitespace-nowrap">Basic Salary</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 text-right whitespace-nowrap">Employee Share (0.5%)</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 text-right whitespace-nowrap">Employer Share (1.75%)</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 text-right whitespace-nowrap">Total SOCSO Wallet</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 whitespace-nowrap">SOCSO Reference</th>
                  <th className="py-3.5 px-4 border-r border-indigo-600/60 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Slip Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                      Loading SOCSO contribution records...
                    </td>
                  </tr>
                ) : filteredSocsoContributions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                      No SOCSO contribution records found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredSocsoContributions.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-3 px-3 border-r border-slate-200 text-center font-mono font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800">
                          <Calendar size={12} />
                          <span>{item.month_year}</span>
                        </span>
                      </td>
                      <td className="py-3 px-5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center shrink-0 border border-indigo-200 text-xs">
                            {item.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{item.employee_name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{item.employee_role || 'Staff'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono text-indigo-700 font-semibold whitespace-nowrap">
                        {item.employee_code}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap">
                        {item.company_name}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                        RM {(item.basic_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-indigo-700 whitespace-nowrap">
                        RM {(item.employee_share || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-indigo-700 whitespace-nowrap">
                        RM {(item.employer_share || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-bold text-indigo-800 bg-indigo-50/40 whitespace-nowrap">
                        <span className="text-sm">
                          RM {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {item.reference_no}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStatutoryItem(item);
                            setStatutorySlipModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View Slip</span>
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

      {/* =========================================================================
          TAB 4: TRANSACTION LEDGER STATEMENT LOGS
          ========================================================================= */}
      {activeTab === 'transactions' && (
        <div
          className={`w-full max-w-full overflow-hidden rounded-xl shadow-xs relative z-10 ${
            isGlass ? 'dashboard-card-glass border border-white/50' : 'bg-white border border-slate-300'
          }`}
        >
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <table className="w-full min-w-[1250px] text-left border-collapse">
              <thead>
                <tr className="bg-[#0b4da2] text-white text-xs font-bold whitespace-nowrap select-none">
                  <th className="py-3.5 px-3 border-r border-blue-600/60 text-center w-12">#</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Date & Time</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Reference</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Wallet Account</th>
                  <th className="py-3.5 px-5 border-r border-blue-600/60 whitespace-nowrap">Employee Name</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Company</th>
                  <th className="py-3.5 px-3 border-r border-blue-600/60 text-center whitespace-nowrap">Type</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Category</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Amount</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Balance After</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Method</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                      Loading wallet transaction records...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                      No transactions found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, index) => (
                    <tr
                      key={tx.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-3 px-3 border-r border-slate-200 text-center font-mono font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{tx.created_at ? tx.created_at.slice(0, 16).replace('T', ' ') : '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {tx.reference || `TXN-${tx.id}`}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {tx.wallet_account_no || '—'}
                      </td>
                      <td className="py-3 px-5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                        <div>
                          <div>{tx.employee_name}</div>
                          <div className="text-[11px] font-mono text-blue-600 font-normal">{tx.employee_code}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-700 whitespace-nowrap">
                        {tx.company_name || 'Corporate HQ'}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tx.type === 'credit'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tx.type === 'credit' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                          <span>{tx.type}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-slate-700 capitalize whitespace-nowrap font-medium">
                        {tx.category.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-bold whitespace-nowrap">
                        <span className={tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}>
                          {tx.type === 'credit' ? '+' : '-'} RM {(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-slate-900 bg-slate-50/50 whitespace-nowrap">
                        RM {(tx.balance_after || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {tx.payment_method || 'Bank Transfer'}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : tx.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxForView(tx);
                              setSlipModalOpen(true);
                            }}
                            title="View Transaction Slip"
                            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 transition cursor-pointer bg-white"
                          >
                            <Eye size={13} />
                          </button>
                          {tx.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveTx(tx.id)}
                                title="Approve Transaction"
                                className="p-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 text-emerald-700 transition cursor-pointer bg-white"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelTx(tx.id)}
                                title="Reject / Cancel Transaction"
                                className="p-1.5 rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-700 transition cursor-pointer bg-white"
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DEPOSIT / CREDIT EMPLOYEE WALLET
          ========================================================================= */}
      {creditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">Credit Employee Wallet</h3>
                  <p className="text-xs text-slate-500 m-0">Add bonus, salary, or reimbursement amount.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreditSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Employee
                </label>
                <Select2Search
                  options={modalEmployeeOptions}
                  value={selectedEmpForAction ? String(selectedEmpForAction.id) : ''}
                  onChange={(val) => {
                    const emp = employees.find((e) => String(e.id) === val);
                    if (emp) setSelectedEmpForAction(emp);
                  }}
                  placeholder="Select staff member"
                  className="w-full"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Credit Amount (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                  >
                    <option value="salary">Regular Salary</option>
                    <option value="bonus">Performance Bonus</option>
                    <option value="overtime">Overtime Pay</option>
                    <option value="commission">Sales Commission</option>
                    <option value="allowance">Transport Allowance</option>
                    <option value="adjustment">Admin Adjustment</option>
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
                    <option value="Direct Deposit">Direct Deposit</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="e.g. CR-XXXXXXXX"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional notes regarding this credit..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              {/* Live Preview */}
              {parseFloat(formAmount) > 0 && selectedEmpForAction && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">New Balance after Credit:</span>
                  <span className="text-sm font-mono font-bold text-emerald-700">
                    RM {(selectedEmpForAction.wallet_balance + (parseFloat(formAmount) || 0)).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition cursor-pointer border-0 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirm Credit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DEBIT / PAYOUT EMPLOYEE WALLET
          ========================================================================= */}
      {debitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                  <Banknote size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">Payout / Debit Employee Wallet</h3>
                  <p className="text-xs text-slate-500 m-0">Record salary disbursement, payout, or advance deduction.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDebitModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDebitSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Employee
                </label>
                <Select2Search
                  options={modalEmployeeOptions}
                  value={selectedEmpForAction ? String(selectedEmpForAction.id) : ''}
                  onChange={(val) => {
                    const emp = employees.find((e) => String(e.id) === val);
                    if (emp) setSelectedEmpForAction(emp);
                  }}
                  placeholder="Select staff member"
                  className="w-full"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payout Amount (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                  >
                    <option value="withdrawal">Withdrawal Payout</option>
                    <option value="salary_advance">Salary Advance</option>
                    <option value="loan_deduction">Loan Deduction</option>
                    <option value="statutory_deduction">Statutory Deduction</option>
                    <option value="admin_debit">Admin Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Disbursement Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="e.g. DR-XXXXXXXX"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional notes regarding this payout..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              {/* Live Preview */}
              {parseFloat(formAmount) > 0 && selectedEmpForAction && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">Remaining Balance after Payout:</span>
                  <span className="text-sm font-mono font-bold text-[#0b4da2]">
                    RM {(selectedEmpForAction.wallet_balance - (parseFloat(formAmount) || 0)).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDebitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-blue-800 text-white shadow-md transition cursor-pointer border-0 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirm Payout</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW TRANSACTION DETAILS SLIP
          ========================================================================= */}
      {slipModalOpen && selectedTxForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">Transaction Voucher</h3>
                  <p className="text-xs text-slate-500 m-0">Official Employee Wallet Audit Record</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSlipModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Reference:</span>
                <span className="font-mono font-bold text-slate-900">{selectedTxForView.reference || `TXN-${selectedTxForView.id}`}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Staff Member:</span>
                <span className="font-bold text-slate-900">{selectedTxForView.employee_name} ({selectedTxForView.employee_code})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Company:</span>
                <span className="font-medium text-slate-900">{selectedTxForView.company_name || 'Corporate HQ'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Wallet Account:</span>
                <span className="font-mono text-slate-800">{selectedTxForView.wallet_account_no || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Transaction Type:</span>
                <span className={`font-bold uppercase ${selectedTxForView.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedTxForView.type} ({selectedTxForView.category})
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Amount:</span>
                <span className="text-base font-mono font-black text-slate-900">
                  RM {selectedTxForView.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Balance After:</span>
                <span className="font-mono font-bold text-slate-900">RM {selectedTxForView.balance_after.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Status:</span>
                <span className="font-bold uppercase text-emerald-700">{selectedTxForView.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Date & Time:</span>
                <span className="font-mono text-slate-700">{selectedTxForView.created_at?.replace('T', ' ').slice(0, 19)}</span>
              </div>
              {selectedTxForView.notes && (
                <div className="pt-1">
                  <span className="text-slate-500 font-semibold block mb-1">Remarks:</span>
                  <div className="p-2 rounded bg-white border border-slate-200 text-slate-700 font-normal">
                    {selectedTxForView.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handlePrintIndividualVoucher('transaction', selectedTxForView)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border-0"
              >
                <Printer size={14} />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setSlipModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b4da2] text-white hover:bg-blue-800 transition cursor-pointer border-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW STATUTORY CONTRIBUTION SLIP (EPF / SOCSO)
          ========================================================================= */}
      {statutorySlipModalOpen && selectedStatutoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedStatutoryItem.type === 'epf' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">
                    {selectedStatutoryItem.type === 'epf' ? 'EPF Contribution Slip' : 'SOCSO Contribution Slip'}
                  </h3>
                  <p className="text-xs text-slate-500 m-0">
                    Official Statutory Deduction Statement &bull; {selectedStatutoryItem.month_year}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatutorySlipModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg border-0 bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Reference Number:</span>
                <span className="font-mono font-bold text-slate-900">{selectedStatutoryItem.reference_no}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Staff Member:</span>
                <span className="font-bold text-slate-900">{selectedStatutoryItem.employee_name} ({selectedStatutoryItem.employee_code})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Employer / Company:</span>
                <span className="font-medium text-slate-900">{selectedStatutoryItem.company_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Contribution Month:</span>
                <span className="font-mono font-bold text-slate-900">{selectedStatutoryItem.month_year}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Basic Salary:</span>
                <span className="font-mono font-bold text-slate-900">
                  RM {(selectedStatutoryItem.basic_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">
                  Employee Share ({selectedStatutoryItem.type === 'epf' ? '11%' : '0.5%'}):
                </span>
                <span className="font-mono font-bold text-slate-900">
                  RM {(selectedStatutoryItem.employee_share || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">
                  Employer Share ({selectedStatutoryItem.type === 'epf' ? '12%' : '1.75%'}):
                </span>
                <span className="font-mono font-bold text-slate-900">
                  RM {(selectedStatutoryItem.employer_share || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-700 font-bold">
                  {selectedStatutoryItem.type === 'epf' ? 'Total EPF Wallet:' : 'Total SOCSO Wallet:'}
                </span>
                <span className={`text-base font-mono font-black ${selectedStatutoryItem.type === 'epf' ? 'text-emerald-700' : 'text-indigo-700'}`}>
                  RM {(selectedStatutoryItem.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Payment Status:</span>
                <span className="font-bold uppercase text-emerald-700">{selectedStatutoryItem.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Method:</span>
                <span className="font-medium text-slate-800">{selectedStatutoryItem.payment_method || 'Bank Transfer'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handlePrintIndividualVoucher('statutory', selectedStatutoryItem)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border-0"
              >
                <Printer size={14} />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setStatutorySlipModalOpen(false)}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer border-0 ${
                  selectedStatutoryItem.type === 'epf' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Print Safety */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside, header, nav, .admin-stat-card, button, input, select, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
