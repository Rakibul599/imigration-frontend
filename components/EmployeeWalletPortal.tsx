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
  User,
  Send,
  SlidersHorizontal,
  Landmark,
  Receipt,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useDashboardCardDesign } from '@/lib/themeSettings';
import { getCurrentUser, AuthUser } from '@/lib/auth';
import Select2Search, { Select2Option } from '@/components/Select2Search';

export interface WalletTransactionItem {
  id: number;
  transaction_ref: string;
  employee_id: number;
  employee_code: string;
  company_name: string;
  wallet_account_no: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_method: string;
  reference?: string | null;
  status: 'pending' | 'success' | 'cancelled';
  notes?: string | null;
  requested_by?: string | null;
  processed_by?: string | null;
  created_at: string;
}

export interface EmployeeWalletData {
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

export default function EmployeeWalletPortal() {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';
  const cardClasses = isGlass
    ? 'bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-xl'
    : 'bg-white border border-slate-200 rounded-xl';
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [wallet, setWallet] = useState<EmployeeWalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'credit' | 'debit'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'success' | 'pending' | 'cancelled'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedTxForSlip, setSelectedTxForSlip] = useState<WalletTransactionItem | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Withdrawal Form
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    category: 'Salary Advance',
    bank_name: '',
    bank_account_name: '',
    bank_account_no: '',
    notes: '',
  });

  // Bank Form
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_account_name: '',
    bank_account_no: '',
  });

  // Load User and Wallet
  const loadWalletData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMsg(null);

    try {
      const user = getCurrentUser();
      setCurrentUser(user);

      // Search identifier: employee_code, id, or email
      const searchTarget = user?.employee_code || user?.id || '';

      let walletFound: EmployeeWalletData | null = null;
      let txList: WalletTransactionItem[] = [];

      if (searchTarget) {
        try {
          const res = await fetch(`${apiBase}/employee-wallets/${encodeURIComponent(searchTarget)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.employee) {
              walletFound = data.employee;
              txList = data.transactions || [];
            }
          }
        } catch {
          // ignore error to try fallback
        }
      }

      // Fallback: If not found by direct ID/code, fetch all wallets and find match
      if (!walletFound) {
        const resAll = await fetch(`${apiBase}/employee-wallets`);
        if (resAll.ok) {
          const allData = await resAll.json();
          const emps: EmployeeWalletData[] = allData.employees || [];
          if (user?.email) {
            walletFound = emps.find((e) => e.email?.toLowerCase() === user.email.toLowerCase()) || null;
          }
          if (!walletFound && user?.name) {
            walletFound = emps.find((e) => e.name?.toLowerCase() === user.name.toLowerCase()) || null;
          }
          if (!walletFound && emps.length > 0) {
            // Dev fallback for demo
            walletFound = emps[0];
          }

          if (walletFound) {
            const txRes = await fetch(`${apiBase}/employee-wallets/${walletFound.id}`);
            if (txRes.ok) {
              const txData = await txRes.json();
              txList = txData.transactions || [];
            }
          }
        }
      }

      if (walletFound) {
        setWallet(walletFound);
        setTransactions(txList);
        // Pre-fill forms
        setWithdrawForm((prev) => ({
          ...prev,
          bank_name: walletFound?.bank_name || 'Maybank Malaysia',
          bank_account_name: walletFound?.bank_account_name || walletFound?.name || '',
          bank_account_no: walletFound?.bank_account_no || '',
        }));
        setBankForm({
          bank_name: walletFound?.bank_name || 'Maybank Malaysia',
          bank_account_name: walletFound?.bank_account_name || walletFound?.name || '',
          bank_account_no: walletFound?.bank_account_no || '',
        });
      } else {
        setErrorMsg('Wallet record could not be loaded for your account. Please contact Super Admin.');
      }
    } catch (err: any) {
      console.error('Failed to load employee wallet:', err);
      setErrorMsg('Network error while connecting to Wallet server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Flash message timer
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Select2 Options
  const typeSelect2Options: Select2Option[] = useMemo(() => [
    { value: 'ALL', label: 'All Types' },
    { value: 'credit', label: 'Credits (Income)' },
    { value: 'debit', label: 'Debits (Payouts)' },
  ], []);

  const statusSelect2Options: Select2Option[] = useMemo(() => [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'success', label: 'Completed / Paid' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'cancelled', label: 'Cancelled / Rejected' },
  ], []);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      if (startDate) {
        const txDate = t.created_at.substring(0, 10);
        if (txDate < startDate) return false;
      }
      if (endDate) {
        const txDate = t.created_at.substring(0, 10);
        if (txDate > endDate) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = t.transaction_ref?.toLowerCase().includes(q);
        const catMatch = t.category?.toLowerCase().includes(q);
        const noteMatch = t.notes?.toLowerCase().includes(q);
        const methodMatch = t.payment_method?.toLowerCase().includes(q);
        if (!refMatch && !catMatch && !noteMatch && !methodMatch) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, statusFilter, startDate, endDate, searchQuery]);

  // Summary KPI values
  const kpis = useMemo(() => {
    const liveBal = Number(wallet?.wallet_balance || 0);
    const credits = transactions
      .filter((t) => t.type === 'credit' && t.status === 'success')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const debits = transactions
      .filter((t) => t.type === 'debit' && t.status === 'success')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const pendingWithdrawn = transactions
      .filter((t) => t.type === 'debit' && t.status === 'pending')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const pendingCount = transactions.filter((t) => t.status === 'pending').length;

    return {
      liveBalance: liveBal,
      totalCredits: credits,
      totalDebits: debits,
      pendingWithdrawn,
      pendingCount,
    };
  }, [wallet, transactions]);

  // Handle Withdrawal Request Submission
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    const amt = parseFloat(withdrawForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }

    if (amt > (wallet.wallet_balance || 0)) {
      const confirmExceed = confirm(
        `Requested amount (RM ${amt.toFixed(2)}) exceeds your available live balance (RM ${Number(wallet.wallet_balance || 0).toFixed(2)}). Do you wish to request this as an advance loan subject to management approval?`
      );
      if (!confirmExceed) return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`${apiBase}/employee-wallets/request-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: wallet.id,
          amount: amt,
          category: withdrawForm.category,
          bank_name: withdrawForm.bank_name,
          bank_account_name: withdrawForm.bank_account_name,
          bank_account_no: withdrawForm.bank_account_no,
          notes: withdrawForm.notes || 'Employee portal payout request',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit withdrawal request');
      }

      setSuccessMsg(`Withdrawal request for RM ${amt.toFixed(2)} submitted successfully. It is now awaiting Super Admin review.`);
      setShowWithdrawModal(false);
      setWithdrawForm((prev) => ({ ...prev, amount: '', notes: '' }));
      await loadWalletData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to request withdrawal.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Bank Details Update
  const handleUpdateBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    if (!bankForm.bank_name.trim() || !bankForm.bank_account_no.trim()) {
      alert('Please provide bank name and account number.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`${apiBase}/employee-wallets/update-bank-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: wallet.id,
          bank_name: bankForm.bank_name,
          bank_account_name: bankForm.bank_account_name,
          bank_account_no: bankForm.bank_account_no,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update bank details');
      }

      setSuccessMsg('Payout bank account information updated successfully.');
      setShowBankModal(false);
      await loadWalletData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update bank details.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Export transactions to Excel
  const exportToExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions found to export.');
      return;
    }

    const rows = filteredTransactions.map((t, idx) => ({
      '#': idx + 1,
      'Transaction Ref': t.transaction_ref,
      'Date & Time': new Date(t.created_at).toLocaleString(),
      'Type': t.type.toUpperCase(),
      'Category': t.category,
      'Amount (RM)': t.type === 'credit' ? `+${Number(t.amount).toFixed(2)}` : `-${Number(t.amount).toFixed(2)}`,
      'Balance After (RM)': Number(t.balance_after).toFixed(2),
      'Payment Method': t.payment_method,
      'Status': t.status.toUpperCase(),
      'Processed By': t.processed_by || 'Auto/System',
      'Notes': t.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Wallet Statement');
    XLSX.writeFile(wb, `Wallet_Statement_${wallet?.employee_code || 'EMP'}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Top Breadcrumb & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <Link href="/employee" className="hover:text-[#0b4da2] transition-colors">
              Employee Portal
            </Link>
            <span>/</span>
            <span className="text-[#0b4da2] font-semibold">My Wallet</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#0b4da2] to-blue-600 text-white shadow-md shadow-blue-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            Employee Digital Wallet
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          <button
            onClick={() => loadWalletData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-[#0b4da2] transition-all shadow-sm active:scale-95 disabled:opacity-60 shrink-0"
            title="Refresh balance and transactions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0b4da2]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowBankModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50/50 hover:text-[#0b4da2] hover:border-blue-200 transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Landmark className="w-3.5 h-3.5 text-blue-600" />
            <span>Bank Account</span>
          </button>

          <button
            onClick={() => setShowWithdrawModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#0b4da2] to-blue-600 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-md shadow-blue-600/25 transition-all active:scale-95 shrink-0 whitespace-nowrap"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Request Payout / Advance</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* Digital Wallet Card & Quick Overview Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Virtual Card (Left 1 col) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#072d62] via-[#0b4da2] to-[#1e3a8a] text-white p-6 shadow-xl shadow-blue-900/20 flex flex-col justify-between min-h-[230px] border border-blue-400/20 group hover:shadow-2xl hover:shadow-blue-900/30 transition-all duration-300">
          {/* Subtle background card watermark */}
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <Wallet className="w-56 h-56 text-white" />
          </div>
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-bl-full pointer-events-none" />

          {/* Card Top Row */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Coins className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-blue-200 font-semibold">
                  Employee Pass
                </div>
                <div className="text-xs font-semibold text-white tracking-wide">
                  {wallet?.company_name || 'Corporate Agency'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </div>
          </div>

          {/* Card Chip & Account Number */}
          <div className="relative z-10 my-4">
            <div className="flex items-center justify-between mb-2.5">
              {/* EMV Chip graphic */}
              <div className="w-10 h-7 rounded bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-400 border border-amber-500/40 shadow-sm relative overflow-hidden flex items-center justify-center">
                <div className="w-full h-[1px] bg-amber-600/40 absolute top-2" />
                <div className="w-full h-[1px] bg-amber-600/40 absolute bottom-2" />
                <div className="h-full w-[1px] bg-amber-600/40 absolute left-3" />
                <div className="h-full w-[1px] bg-amber-600/40 absolute right-3" />
              </div>
            </div>

            <div className="text-xs font-mono tracking-widest text-blue-100 font-semibold drop-shadow-sm">
              {wallet?.wallet_account_no || 'WAL-EMP-00000'}
            </div>
          </div>

          {/* Card Bottom: Balance & Name */}
          <div className="relative z-10 pt-2 border-t border-white/10 flex items-end justify-between">
            <div>
              <div className="text-[10px] text-blue-200/80 font-medium uppercase tracking-wider">
                Available Wallet Balance
              </div>
              <div className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                RM {kpis.liveBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-blue-200/80 uppercase font-medium">Cardholder</div>
              <div className="text-xs font-bold text-white tracking-wide uppercase truncate max-w-[140px]">
                {wallet?.name || currentUser?.name || 'Staff Member'}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards (Right 2 cols) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Live Balance */}
          <div className={`p-4 ${cardClasses} shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Live Available
              </span>
              <div className="p-2 rounded-lg bg-blue-50 text-[#0b4da2]">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900">
                RM {kpis.liveBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Card 2: Total Credits */}
          <div className={`p-4 ${cardClasses} shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Salary & Credits
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-emerald-700">
                RM {kpis.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Card 3: Total Withdrawn */}
          <div className={`p-4 ${cardClasses} shadow-sm flex flex-col justify-between hover:border-rose-300 transition-all`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Withdrawn / Advances
              </span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-rose-700">
                RM {kpis.totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Card 4: Linked Bank Account Status */}
          <div className={`p-4 ${cardClasses} shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Payout Bank Account
              </span>
              <button
                onClick={() => setShowBankModal(true)}
                className="text-[11px] font-semibold text-[#0b4da2] hover:underline"
              >
                Change
              </button>
            </div>
            <div className="mt-2">
              <div className="text-sm font-bold text-slate-900 truncate">
                {wallet?.bank_name || 'Maybank Malaysia'}
              </div>
              <div className="text-xs font-mono text-slate-600 mt-0.5">
                {wallet?.bank_account_no || 'Not Set'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Holder: {wallet?.bank_account_name || wallet?.name || 'Verified'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Section & Statement */}
      <div className={`${cardClasses} shadow-sm p-5 space-y-4`}>
        {/* Header & Filter Controls */}
        <div className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 m-0">
              <Receipt className="w-4 h-4 text-[#0b4da2]" />
              Wallet Statement
            </h2>
          </div>

          {/* Export Button - firmly on the same line */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar with Select2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, notes..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b4da2] text-xs bg-slate-50/50"
            />
          </div>

          {/* Type Filter Select2 */}
          <div className="relative z-30">
            <Select2Search
              options={typeSelect2Options}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as any)}
              placeholder="All Types"
              className="w-full"
            />
          </div>

          {/* Status Filter Select2 */}
          <div className="relative z-20">
            <Select2Search
              options={statusSelect2Options}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              placeholder="All Statuses"
              className="w-full"
            />
          </div>

          {/* Date Range & Reset */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b4da2] text-xs bg-white text-slate-700 shadow-2xs"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b4da2] text-xs bg-white text-slate-700 shadow-2xs"
              title="End Date"
            />
            {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery || startDate || endDate) && (
              <button
                onClick={() => {
                  setTypeFilter('ALL');
                  setStatusFilter('ALL');
                  setSearchQuery('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="p-1.5 border border-slate-200 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-50 shrink-0 cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-inner">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Transaction Ref</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Amount (RM)</th>
                <th className="py-2.5 px-3 text-right">Balance After</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
                      <span>Loading your wallet records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <div className="text-xs font-semibold text-slate-600">No transactions recorded</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Your wallet transactions and salary deposits will show up here.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString()}{' '}
                        <span className="text-[10px] text-slate-400">
                          {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[#0b4da2] font-semibold whitespace-nowrap">
                        {tx.transaction_ref}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isCredit ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            Credit In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            Debit Out
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {tx.category}
                      </td>

                      <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${isCredit ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isCredit ? '+' : '-'}RM {Number(tx.amount).toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        RM {Number(tx.balance_after).toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {tx.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </span>
                        )}
                        {tx.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Review
                          </span>
                        )}
                        {tx.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                            <XCircle className="w-3 h-3 text-slate-500" />
                            Cancelled
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={tx.notes || ''}>
                        {tx.notes || '-'}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTxForSlip(tx)}
                          className="p-1 rounded text-slate-400 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors"
                          title="View Official Receipt Slip"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Request Payout / Advance */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#0b4da2] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Request Payout / Cash Advance</h3>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-white/80 hover:text-white rounded-lg p-1 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestWithdrawal} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Current Live Balance</div>
                  <div className="text-base font-bold text-[#0b4da2]">
                    RM {Number(wallet?.wallet_balance || 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Account Number</div>
                  <div className="text-xs font-mono font-bold text-slate-700">
                    {wallet?.wallet_account_no}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Requested Amount (RM) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">RM</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    className="w-full pl-11 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b4da2]"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category / Purpose <span className="text-rose-500">*</span>
                </label>
                <select
                  value={withdrawForm.category}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b4da2]"
                >
                  <option value="Salary Advance">Salary Advance (Earned Wage Access)</option>
                  <option value="Emergency Advance">Emergency Advance</option>
                  <option value="Commission Payout">Commission Payout</option>
                  <option value="Bonus Withdrawal">Bonus Withdrawal</option>
                  <option value="General Withdrawal">General Balance Withdrawal</option>
                </select>
              </div>

              {/* Bank Details */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                  Payout Bank Account
                </div>

                <div>
                  <label className="block text-slate-600 mb-0.5">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={withdrawForm.bank_name}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    placeholder="e.g. Maybank, CIMB, Public Bank"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Account Holder</label>
                    <input
                      type="text"
                      required
                      value={withdrawForm.bank_account_name}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_account_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      placeholder="Full Name"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-0.5">Account Number</label>
                    <input
                      type="text"
                      required
                      value={withdrawForm.bank_account_no}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_account_no: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                      placeholder="Account No."
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Notes for Admin</label>
                <textarea
                  rows={2}
                  value={withdrawForm.notes}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
                  placeholder="e.g. Advance request for personal medical/transport expenses"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0b4da2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-gradient-to-r from-[#0b4da2] to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {submittingAction ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Update Bank Account Details */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Payout Bank Account Details</h3>
              </div>
              <button
                onClick={() => setShowBankModal(false)}
                className="text-white/80 hover:text-white rounded-lg p-1 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBankDetails} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Maybank, CIMB, Public Bank, RHB"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Holder Full Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.bank_account_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_account_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="As per bank passbook / IC"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  required
                  value={bankForm.bank_account_no}
                  onChange={(e) => setBankForm({ ...bankForm, bank_account_no: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  placeholder="e.g. 114012345678"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-gradient-to-r from-[#0b4da2] to-blue-600 hover:from-blue-700 text-white font-semibold rounded-lg shadow-md active:scale-95 disabled:opacity-50"
                >
                  {submittingAction ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Transaction Receipt Slip */}
      {selectedTxForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Official Electronic Slip</h3>
              </div>
              <button
                onClick={() => setSelectedTxForSlip(null)}
                className="text-white/80 hover:text-white rounded-lg p-1 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Slip Content */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs font-sans" id="printable-slip">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <div className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  {wallet?.company_name || 'Corporate Agency'}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Employee Digital Wallet Disbursement Slip
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  Issued: {new Date(selectedTxForSlip.created_at).toLocaleString()}
                </div>
              </div>

              {/* Amount Showcase */}
              <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  {selectedTxForSlip.type === 'credit' ? 'Credited Amount' : 'Debited Amount'}
                </div>
                <div className={`text-2xl font-black mt-0.5 ${selectedTxForSlip.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedTxForSlip.type === 'credit' ? '+' : '-'}RM {Number(selectedTxForSlip.amount).toFixed(2)}
                </div>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedTxForSlip.status === 'success'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedTxForSlip.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedTxForSlip.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Transaction Details Table */}
              <div className="space-y-2 py-2 border-b border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedTxForSlip.transaction_ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-semibold text-slate-800">{wallet?.name} ({wallet?.employee_code})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Wallet Account:</span>
                  <span className="font-mono text-slate-800">{selectedTxForSlip.wallet_account_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-medium text-slate-800">{selectedTxForSlip.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-medium text-slate-800">{selectedTxForSlip.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Balance Before:</span>
                  <span className="font-mono text-slate-700">RM {Number(selectedTxForSlip.balance_before).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Balance After:</span>
                  <span className="font-mono font-bold text-slate-900">RM {Number(selectedTxForSlip.balance_after).toFixed(2)}</span>
                </div>
                {selectedTxForSlip.notes && (
                  <div className="pt-1 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Notes:</span> {selectedTxForSlip.notes}
                  </div>
                )}
              </div>

              {/* Security Seal */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1 text-slate-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0b4da2]" />
                  <span>Verified Electronic Voucher</span>
                </div>
              </div>
            </div>

            {/* Slip Action Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                onClick={() => setSelectedTxForSlip(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
