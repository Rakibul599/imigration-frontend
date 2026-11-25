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

export interface WalletSummaryStats {
  total_employees_count: number;
  total_wallet_balance: number;
  total_credits: number;
  total_debits: number;
  active_wallets_count: number;
}

interface AdminEmployeeWalletManagementProps {
  portalType?: 'superadmin' | 'masteradmin';
  adminName?: string;
}

export default function AdminEmployeeWalletManagement({
  portalType = 'superadmin',
  adminName = 'Super Admin',
}: AdminEmployeeWalletManagementProps) {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';

  // Active Tab: 'directory' (Employee Balances) or 'transactions' (Statement Log)
  const [activeTab, setActiveTab] = useState<'directory' | 'transactions'>('directory');

  // Data states
  const [employees, setEmployees] = useState<EmployeeWalletItem[]>([]);
  const [transactions, setTransactions] = useState<EmployeeWalletTransactionItem[]>([]);
  const [summary, setSummary] = useState<WalletSummaryStats>({
    total_employees_count: 0,
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'cancelled'>('all');
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

  // Modal Form States
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('bonus');
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('Bank Transfer');
  const [formReference, setFormReference] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

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

  // Fetch Wallets Directory & Transactions from Backend
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
          setSummary(walletData.summary);
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
      if (statusFilter !== 'all') {
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
    return Array.from(set).sort();
  }, [employees, transactions]);

  // Derived Employee Options for Dropdown
  const employeeOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    employees.forEach((emp) => {
      if (selectedCompany === 'ALL' || emp.company_name === selectedCompany) {
        map.set(emp.employee_code, { code: emp.employee_code, name: emp.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, selectedCompany]);

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

  const typeSelect2Options: Select2Option[] = useMemo(() => [
    { value: 'all', label: 'All Types' },
    { value: 'credit', label: 'Credit / Deposit (+)' },
    { value: 'debit', label: 'Debit / Payout (-)' },
  ], []);

  const statusSelect2Options: Select2Option[] = useMemo(() => [
    { value: 'all', label: 'All Statuses' },
    { value: 'success', label: 'Success / Paid' },
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

  // Filtered employees for Directory tab
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

  // Filtered transactions for Transactions tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedCompany !== 'ALL' && tx.company_name && !tx.company_name.includes(selectedCompany)) return false;
      if (selectedEmployee !== 'ALL' && tx.employee_code !== selectedEmployee) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (startDate && tx.created_at < startDate) return false;
      if (endDate && tx.created_at.slice(0, 10) > endDate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.employee_name.toLowerCase().includes(q) ||
          tx.employee_code.toLowerCase().includes(q) ||
          (tx.reference && tx.reference.toLowerCase().includes(q)) ||
          (tx.wallet_account_no && tx.wallet_account_no.toLowerCase().includes(q)) ||
          (tx.notes && tx.notes.toLowerCase().includes(q))
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
      alert('Network error while processing payout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Transaction Action
  const handleApproveTx = async (txId: number) => {
    if (!confirm('Are you sure you want to approve this withdrawal request?')) return;
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

  // Cancel Transaction Action
  const handleCancelTx = async (txId: number) => {
    if (!confirm('Are you sure you want to cancel / reject this transaction?')) return;
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
    if (activeTab === 'directory') {
      if (filteredEmployees.length === 0) {
        alert('No employee wallet records to export.');
        return;
      }
      const data = filteredEmployees.map((e, idx) => ({
        '#': idx + 1,
        'Wallet Account No': e.wallet_account_no,
        'Employee Code': e.employee_code,
        'Employee Name': e.name,
        Position: e.role,
        Company: e.company_name,
        'Current Balance (RM)': e.wallet_balance,
        'Total Credited (RM)': e.total_credit_amount,
        'Total Debited (RM)': e.total_debit_amount,
        'Bank Name': e.bank_name,
        'Bank Account No': e.bank_account_no,
        Status: e.status.toUpperCase(),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employee Wallets');
      XLSX.writeFile(wb, `employee_wallets_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    if (activeTab === 'directory') {
      if (filteredEmployees.length === 0) return;
      const headers = ['#', 'Wallet Account No', 'Employee Code', 'Employee Name', 'Company', 'Balance (RM)', 'Total Credited', 'Total Debited', 'Status'];
      const rows = filteredEmployees.map((e, idx) => [
        idx + 1,
        `"${e.wallet_account_no}"`,
        `"${e.employee_code}"`,
        `"${e.name}"`,
        `"${e.company_name}"`,
        e.wallet_balance,
        e.total_credit_amount,
        e.total_debit_amount,
        `"${e.status.toUpperCase()}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employee_wallets_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
    } else {
      if (filteredTransactions.length === 0) return;
      const headers = ['#', 'Date', 'Reference', 'Wallet Account', 'Employee', 'Company', 'Type', 'Category', 'Amount (RM)', 'Balance After', 'Status'];
      const rows = filteredTransactions.map((tx, idx) => [
        idx + 1,
        `"${tx.created_at ? tx.created_at.slice(0, 19) : ''}"`,
        `"${tx.reference || tx.id}"`,
        `"${tx.wallet_account_no || ''}"`,
        `"${tx.employee_name}"`,
        `"${tx.company_name || ''}"`,
        `"${tx.type.toUpperCase()}"`,
        `"${tx.category.toUpperCase()}"`,
        tx.amount,
        tx.balance_after,
        `"${tx.status.toUpperCase()}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wallet_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
    }
  };

  const handleResetFilters = () => {
    setSelectedCompany('ALL');
    setSelectedEmployee('ALL');
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
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
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
                    Export {activeTab === 'directory' ? 'Wallets' : 'Statements'}
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
                      window.print();
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

        {/* TOP FILTER BAR: Company, Employee, Type, Status, Date Range */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Company */}
          <div className="relative z-50">
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

          {/* Employee */}
          <div className="relative z-40">
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

          {/* Type Filter */}
          <div className="relative z-30">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Coins size={13} className="text-[#0b4da2]" />
              <span>Type</span>
            </label>
            <Select2Search
              options={typeSelect2Options}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as any)}
              placeholder="All Types"
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

          {/* Date Range */}
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Live Wallet Balance */}
        <div
          className={`admin-stat-card transition-all flex flex-col justify-between min-h-[88px] ${
            isGlass
              ? 'dashboard-card-glass rounded-xl p-4'
              : 'bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
              Total Employees Balance
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Wallet size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-slate-900 mt-2">
            RM {(summary.total_wallet_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 2: Total Credits (Salary & Bonuses) */}
        <div
          className={`admin-stat-card transition-all flex flex-col justify-between min-h-[88px] ${
            isGlass
              ? 'dashboard-card-glass rounded-xl p-4'
              : 'bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
              Total Credited / Paid In
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownLeft size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-emerald-600 mt-2">
            RM {(summary.total_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 3: Total Debits (Withdrawals & Advances) */}
        <div
          className={`admin-stat-card transition-all flex flex-col justify-between min-h-[88px] ${
            isGlass
              ? 'dashboard-card-glass rounded-xl p-4'
              : 'bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
              Total Withdrawn / Payouts
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-rose-600 mt-2">
            RM {(summary.total_debits || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 4: Active Wallets */}
        <div
          className={`admin-stat-card transition-all flex flex-col justify-between min-h-[88px] ${
            isGlass
              ? 'dashboard-card-glass rounded-xl p-4'
              : 'bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
              Active Wallets
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-teal-600 mt-2">
            {summary.active_wallets_count || summary.total_employees_count || 0}
          </div>
        </div>
      </div>

      {/* Tabs & Search Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'directory'
                ? 'bg-white text-[#0b4da2] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <Users size={14} />
            <span>Wallets Directory ({filteredEmployees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer border-0 ${
              activeTab === 'transactions'
                ? 'bg-white text-[#0b4da2] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <Coins size={14} />
            <span>Statements ({filteredTransactions.length})</span>
          </button>
        </div>

        {/* Live Search, Export and Reset - ALL on the same line */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 flex-nowrap">
          <div className="relative w-full md:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff, code, wallet..."
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
            title="Export Excel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Export</span>
          </button>

          {(selectedCompany !== 'ALL' ||
            selectedEmployee !== 'ALL' ||
            typeFilter !== 'all' ||
            statusFilter !== 'all' ||
            startDate ||
            endDate ||
            searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold whitespace-nowrap underline cursor-pointer border-0 bg-transparent inline-flex items-center gap-1 shrink-0"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: EMPLOYEE WALLETS DIRECTORY
          ========================================================================= */}
      {activeTab === 'directory' && (
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
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Current Balance</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      Loading employee wallet balances...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      No employee wallets found matching filters.
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
                            title="Payout / Cash Advance"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition cursor-pointer"
                          >
                            <Banknote size={12} />
                            <span>Payout</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp.employee_code);
                              setActiveTab('transactions');
                            }}
                            title="View Statement / Transactions"
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs transition cursor-pointer"
                          >
                            <Eye size={13} />
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
          TAB 2: ALL WALLET TRANSACTIONS (STATEMENT AUDIT LOG)
          ========================================================================= */}
      {activeTab === 'transactions' && (
        <div
          className={`w-full max-w-full overflow-hidden rounded-xl shadow-xs relative z-10 ${
            isGlass ? 'dashboard-card-glass border border-white/50' : 'bg-white border border-slate-300'
          }`}
        >
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <table className="w-full min-w-[1350px] text-left border-collapse">
              <thead>
                <tr className="bg-[#0b4da2] text-white text-xs font-bold whitespace-nowrap select-none">
                  <th className="py-3.5 px-3 border-r border-blue-600/60 text-center w-12">#</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Date &amp; Time</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Reference</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Wallet Account</th>
                  <th className="py-3.5 px-5 border-r border-blue-600/60 whitespace-nowrap">Employee</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Company</th>
                  <th className="py-3.5 px-3 border-r border-blue-600/60 text-center whitespace-nowrap">Type</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Category</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Amount</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-right whitespace-nowrap">Balance After</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 whitespace-nowrap">Payment Method</th>
                  <th className="py-3.5 px-4 border-r border-blue-600/60 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                      Loading wallet transactions...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                      No wallet transactions found matching filters.
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
                      <td className="py-3 px-4 border-r border-slate-200 text-center font-mono text-slate-600 whitespace-nowrap">
                        {tx.created_at ? tx.created_at.replace('T', ' ').slice(0, 16) : '—'}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono font-semibold text-blue-700 whitespace-nowrap">
                        {tx.reference || `TXN-${tx.id}`}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap">
                        {tx.wallet_account_no || '—'}
                      </td>
                      <td className="py-3 px-5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                        <div>
                          <span>{tx.employee_name}</span>
                          <span className="text-[11px] text-blue-600 font-mono block">({tx.employee_code})</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap">
                        {tx.company_name || 'Corporate HQ'}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            tx.type === 'credit'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tx.type === 'credit' ? '+ Credit' : '- Debit'}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 capitalize font-medium text-slate-800 whitespace-nowrap">
                        {tx.category.replace('_', ' ')}
                      </td>
                      <td
                        className={`py-3 px-4 border-r border-slate-200 text-right font-mono font-bold whitespace-nowrap ${
                          tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'credit' ? '+' : '-'}RM{' '}
                        {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        RM {Number(tx.balance_after).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                        {tx.payment_method || 'Bank Transfer'}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : tx.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxForView(tx);
                              setSlipModalOpen(true);
                            }}
                            title="View Transaction Details"
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs transition cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                          {tx.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveTx(tx.id)}
                                title="Approve Withdrawal"
                                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs transition cursor-pointer"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelTx(tx.id)}
                                title="Cancel / Reject Withdrawal"
                                className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs transition cursor-pointer"
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
          MODAL 1: CREDIT / TOP-UP TO EMPLOYEE WALLET
          ========================================================================= */}
      {creditModalOpen && selectedEmpForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#0b4da2] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold m-0">Credit Employee Wallet</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreditModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreditSubmit} className="p-6 space-y-4">
              {/* Employee Selector */}
              <div className="relative z-50">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Employee
                </label>
                <Select2Search
                  options={modalEmployeeOptions}
                  value={String(selectedEmpForAction.id)}
                  onChange={(val) => {
                    const found = employees.find((x) => x.id === parseInt(val, 10));
                    if (found) setSelectedEmpForAction(found);
                  }}
                  placeholder="Select Employee..."
                  className="w-full"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Company: {selectedEmpForAction.company_name}</span>
                  <span className="font-semibold text-emerald-700">
                    Current Balance: RM {selectedEmpForAction.wallet_balance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deposit Amount (RM) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b4da2]/30 focus:border-[#0b4da2] text-sm font-mono font-bold text-slate-900 bg-white"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    RM
                  </span>
                </div>
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
                    <option value="bonus">Performance Bonus</option>
                    <option value="salary">Salary Payout</option>
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
              {parseFloat(formAmount) > 0 && (
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
          MODAL 2: DEBIT / PAYOUT FROM EMPLOYEE WALLET
          ========================================================================= */}
      {debitModalOpen && selectedEmpForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-rose-400">
                  <Banknote size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold m-0">Deduct / Payout From Wallet</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDebitModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDebitSubmit} className="p-6 space-y-4">
              {/* Employee Selector */}
              <div className="relative z-50">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Employee
                </label>
                <Select2Search
                  options={modalEmployeeOptions}
                  value={String(selectedEmpForAction.id)}
                  onChange={(val) => {
                    const found = employees.find((x) => x.id === parseInt(val, 10));
                    if (found) setSelectedEmpForAction(found);
                  }}
                  placeholder="Select Employee..."
                  className="w-full"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Bank: {selectedEmpForAction.bank_name} ({selectedEmpForAction.bank_account_no})</span>
                  <span className="font-semibold text-slate-900">
                    Available: RM {selectedEmpForAction.wallet_balance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payout Amount (RM) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b4da2]/30 focus:border-[#0b4da2] text-sm font-mono font-bold text-slate-900 bg-white"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    RM
                  </span>
                </div>
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
                    <option value="withdrawal">Employee Bank Withdrawal</option>
                    <option value="advance">Salary Cash Advance</option>
                    <option value="deduction">Administrative Deduction</option>
                    <option value="adjustment">Balance Adjustment</option>
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
                  placeholder="Reason for advance or payout..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              {/* Live Preview */}
              {parseFloat(formAmount) > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Remaining Balance after Payout:</span>
                  <span className="text-sm font-mono font-bold text-slate-900">
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
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer border-0 disabled:opacity-50"
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
          MODAL 3: VIEW TRANSACTION DETAILS SLIP
          ========================================================================= */}
      {slipModalOpen && selectedTxForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#0b4da2] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold m-0">Transaction Receipt</h3>
                  <p className="text-xs text-blue-100 m-0">Ref: {selectedTxForView.reference || selectedTxForView.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSlipModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction Amount</div>
                <div
                  className={`text-3xl font-black font-mono mt-1 ${
                    selectedTxForView.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {selectedTxForView.type === 'credit' ? '+' : '-'}RM {selectedTxForView.amount.toFixed(2)}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedTxForView.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedTxForView.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Employee</span>
                  <span className="font-bold text-slate-900">{selectedTxForView.employee_name} ({selectedTxForView.employee_code})</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Wallet Account</span>
                  <span className="font-mono font-bold text-blue-700">{selectedTxForView.wallet_account_no || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Company</span>
                  <span className="font-semibold text-slate-800">{selectedTxForView.company_name || 'Corporate HQ'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Category</span>
                  <span className="font-bold capitalize text-slate-800">{selectedTxForView.category.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Balance Before / After</span>
                  <span className="font-mono text-slate-700">
                    RM {selectedTxForView.balance_before.toFixed(2)} &rarr; RM {selectedTxForView.balance_after.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Payment Method</span>
                  <span className="font-semibold text-slate-800">{selectedTxForView.payment_method || 'Bank Transfer'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Date &amp; Time</span>
                  <span className="font-mono text-slate-700">{selectedTxForView.created_at ? selectedTxForView.created_at.replace('T', ' ').slice(0, 19) : '—'}</span>
                </div>
                {selectedTxForView.notes && (
                  <div className="py-2">
                    <span className="text-slate-500 font-medium block">Notes:</span>
                    <span className="text-slate-800 mt-0.5 block">{selectedTxForView.notes}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border-0"
                >
                  <Printer size={13} />
                  <span>Print Receipt</span>
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
        </div>
      )}
    </div>
  );
}

// Receipt icon fallback
function Receipt(props: any) {
  return <Coins {...props} />;
}
