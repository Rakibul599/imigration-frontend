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
  FileCheck,
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

export interface StatutoryRecordItem {
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

export default function EmployeeWalletPortal() {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';
  const cardClasses = isGlass
    ? 'dashboard-card-glass rounded-xl'
    : 'bg-white border border-slate-200 rounded-xl';
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [wallet, setWallet] = useState<EmployeeWalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [epfRecords, setEpfRecords] = useState<StatutoryRecordItem[]>([]);
  const [socsoRecords, setSocsoRecords] = useState<StatutoryRecordItem[]>([]);
  const [epfSummary, setEpfSummary] = useState({ total_amount: 0, records_count: 0 });
  const [socsoSummary, setSocsoSummary] = useState({ total_amount: 0, records_count: 0 });

  // Active Fund Tab: 'salary' (Employee Pass) | 'epf' (EPF Wallet Pass) | 'socso' (SOCSO Wallet Pass)
  const [activeFundTab, setActiveFundTab] = useState<'salary' | 'epf' | 'socso'>('salary');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'credit' | 'debit'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'success' | 'paid' | 'pending' | 'cancelled'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedTxForSlip, setSelectedTxForSlip] = useState<WalletTransactionItem | null>(null);
  const [selectedStatutorySlip, setSelectedStatutorySlip] = useState<StatutoryRecordItem | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
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

  // Load User, Wallet, EPF and SOCSO
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
      let epfList: StatutoryRecordItem[] = [];
      let socsoList: StatutoryRecordItem[] = [];
      let epfSum = { total_amount: 0, records_count: 0 };
      let socsoSum = { total_amount: 0, records_count: 0 };

      if (searchTarget) {
        try {
          const res = await fetch(`${apiBase}/employee-wallets/${encodeURIComponent(searchTarget)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.employee) {
              walletFound = data.employee;
              txList = data.transactions || [];
              epfList = data.epf_records || [];
              socsoList = data.socso_records || [];
              if (data.epf_summary) epfSum = data.epf_summary;
              if (data.socso_summary) socsoSum = data.socso_summary;
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
            walletFound = emps[0];
          }

          if (walletFound) {
            const detailRes = await fetch(`${apiBase}/employee-wallets/${walletFound.id}`);
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              txList = detailData.transactions || [];
              epfList = detailData.epf_records || [];
              socsoList = detailData.socso_records || [];
              if (detailData.epf_summary) epfSum = detailData.epf_summary;
              if (detailData.socso_summary) socsoSum = detailData.socso_summary;
            }
          }
        }
      }

      if (walletFound) {
        setWallet(walletFound);
        setTransactions(txList);
        setEpfRecords(epfList);
        setSocsoRecords(socsoList);
        setEpfSummary(epfSum);
        setSocsoSummary(socsoSum);

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

  // Filtered transactions for Salary view
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (statusFilter !== 'ALL') {
        const norm = statusFilter === 'paid' ? 'success' : statusFilter;
        if (t.status !== norm) return false;
      }

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
        const notesMatch = t.notes?.toLowerCase().includes(q);
        const methodMatch = t.payment_method?.toLowerCase().includes(q);
        return refMatch || catMatch || notesMatch || methodMatch;
      }
      return true;
    });
  }, [transactions, typeFilter, statusFilter, startDate, endDate, searchQuery]);

  // Filtered EPF Records
  const filteredEpfRecords = useMemo(() => {
    return epfRecords.filter((rec) => {
      if (statusFilter !== 'ALL') {
        const norm = statusFilter === 'success' ? 'paid' : statusFilter;
        if (rec.status.toLowerCase() !== norm.toLowerCase()) return false;
      }
      if (startDate) {
        const startMonth = startDate.slice(0, 7);
        if (rec.month_year < startMonth) return false;
      }
      if (endDate) {
        const endMonth = endDate.slice(0, 7);
        if (rec.month_year > endMonth) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.month_year.toLowerCase().includes(q) ||
          rec.reference_no.toLowerCase().includes(q) ||
          (rec.notes && rec.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [epfRecords, statusFilter, startDate, endDate, searchQuery]);

  // Filtered SOCSO Records
  const filteredSocsoRecords = useMemo(() => {
    return socsoRecords.filter((rec) => {
      if (statusFilter !== 'ALL') {
        const norm = statusFilter === 'success' ? 'paid' : statusFilter;
        if (rec.status.toLowerCase() !== norm.toLowerCase()) return false;
      }
      if (startDate) {
        const startMonth = startDate.slice(0, 7);
        if (rec.month_year < startMonth) return false;
      }
      if (endDate) {
        const endMonth = endDate.slice(0, 7);
        if (rec.month_year > endMonth) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.month_year.toLowerCase().includes(q) ||
          rec.reference_no.toLowerCase().includes(q) ||
          (rec.notes && rec.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [socsoRecords, statusFilter, startDate, endDate, searchQuery]);

  // KPIs
  const kpis = useMemo(() => {
    const liveBalance = Number(wallet?.wallet_balance || 0);
    const totalCredits = Number(wallet?.total_credit_amount || 0);
    const totalDebits = Number(wallet?.total_debit_amount || 0);
    const epfBalance = Number(wallet?.epf_balance ?? epfSummary.total_amount ?? 0);
    const socsoBalance = Number(wallet?.socso_balance ?? socsoSummary.total_amount ?? 0);
    const pendingWithdrawalsCount = Number(wallet?.pending_transactions_count || 0);

    return {
      liveBalance,
      totalCredits,
      totalDebits,
      epfBalance,
      socsoBalance,
      pendingWithdrawalsCount,
    };
  }, [wallet, epfSummary, socsoSummary]);

  // Handle Withdrawal Request
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    const reqAmount = parseFloat(withdrawForm.amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (reqAmount > kpis.liveBalance) {
      if (!confirm('Requested amount exceeds current available balance. Submit as advance request?')) {
        return;
      }
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`${apiBase}/employee-wallets/${wallet.id}/request-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          amount: reqAmount,
          category: withdrawForm.category,
          bank_name: withdrawForm.bank_name,
          bank_account_name: withdrawForm.bank_account_name,
          bank_account_no: withdrawForm.bank_account_no,
          notes: withdrawForm.notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Payout request submitted successfully.');
        setShowWithdrawModal(false);
        setWithdrawForm({
          amount: '',
          category: 'Salary Advance',
          bank_name: wallet.bank_name || 'Maybank Malaysia',
          bank_account_name: wallet.bank_account_name || wallet.name,
          bank_account_no: wallet.bank_account_no || '',
          notes: '',
        });
        loadWalletData(true);
      } else {
        alert(data.message || 'Failed to submit withdrawal request.');
      }
    } catch (err: any) {
      console.error('Withdraw error:', err);
      alert('Network error while submitting payout request.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Bank Info Update
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    setSubmittingAction(true);
    try {
      const res = await fetch(`${apiBase}/employee-wallets/${wallet.id}/bank-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(bankForm),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Bank account information updated successfully.');
        setShowBankModal(false);
        loadWalletData(true);
      } else {
        alert(data.message || 'Failed to update bank details.');
      }
    } catch (err: any) {
      console.error('Bank update error:', err);
      alert('Network error while updating bank details.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Export Table Data
  const exportToExcel = () => {
    if (activeFundTab === 'salary') {
      if (filteredTransactions.length === 0) {
        alert('No transactions found to export.');
        return;
      }
      const data = filteredTransactions.map((t, idx) => ({
        '#': idx + 1,
        'Date & Time': t.created_at ? t.created_at.replace('T', ' ').slice(0, 19) : '',
        Reference: t.transaction_ref,
        Type: t.type.toUpperCase(),
        Category: t.category,
        'Amount (RM)': Number(t.amount).toFixed(2),
        'Balance Before (RM)': Number(t.balance_before).toFixed(2),
        'Balance After (RM)': Number(t.balance_after).toFixed(2),
        Method: t.payment_method,
        Status: t.status.toUpperCase(),
        Notes: t.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Wallet Statement');
      XLSX.writeFile(wb, `${wallet?.name || 'employee'}_wallet_statement.xlsx`);
    } else if (activeFundTab === 'epf') {
      if (filteredEpfRecords.length === 0) {
        alert('No EPF records found to export.');
        return;
      }
      const data = filteredEpfRecords.map((r, idx) => ({
        '#': idx + 1,
        'Contribution Month': r.month_year,
        'Basic Salary (RM)': Number(r.basic_salary).toFixed(2),
        'Employee Share 11% (RM)': Number(r.employee_share).toFixed(2),
        'Employer Share 12% (RM)': Number(r.employer_share).toFixed(2),
        'Total EPF Amount (RM)': Number(r.amount).toFixed(2),
        'EPF Reference No': r.reference_no,
        Status: r.status.toUpperCase(),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'EPF Contributions');
      XLSX.writeFile(wb, `${wallet?.name || 'employee'}_epf_statement.xlsx`);
    } else {
      if (filteredSocsoRecords.length === 0) {
        alert('No SOCSO records found to export.');
        return;
      }
      const data = filteredSocsoRecords.map((r, idx) => ({
        '#': idx + 1,
        'Contribution Month': r.month_year,
        'Basic Salary (RM)': Number(r.basic_salary).toFixed(2),
        'Employee Share 0.5% (RM)': Number(r.employee_share).toFixed(2),
        'Employer Share 1.75% (RM)': Number(r.employer_share).toFixed(2),
        'Total SOCSO Amount (RM)': Number(r.amount).toFixed(2),
        'SOCSO Reference No': r.reference_no,
        Status: r.status.toUpperCase(),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'SOCSO Contributions');
      XLSX.writeFile(wb, `${wallet?.name || 'employee'}_socso_statement.xlsx`);
    }
  };

  // Dedicated High-Resolution Official Statement Printer
  const handlePrintOfficialStatement = () => {
    setShowStatementModal(false);
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
    const time = new Date().toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    });

    let docTitle = '';
    let fundLabel = '';
    let accountLabel = '';
    let accountValue = '';
    let kpiBlocksHtml = '';
    let tableHeaders = '';
    let tableRows = '';

    if (activeFundTab === 'salary') {
      docTitle = 'OFFICIAL EMPLOYEE SALARY WALLET LEDGER STATEMENT';
      fundLabel = 'Employee Salary Wallet Account';
      accountLabel = 'Wallet Account Number';
      accountValue = wallet?.wallet_account_no || 'WAL-EMP-00000';

      kpiBlocksHtml = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL LIVE SALARY BALANCE</div>
            <div class="kpi-value highlight-blue">RM ${kpis.liveBalance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Available for payout</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TOTAL CREDITED</div>
            <div class="kpi-value highlight-green">RM ${kpis.totalCredits.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Salaries & allowances</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TOTAL DISBURSED</div>
            <div class="kpi-value highlight-red">RM ${kpis.totalDebits.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Withdrawals & payouts</div>
          </div>
        </div>
      `;

      tableHeaders = `
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>Date & Time</th>
          <th>Reference ID</th>
          <th>Category</th>
          <th>Payment Method</th>
          <th style="text-align: right;">Amount</th>
          <th style="text-align: right;">Balance After</th>
          <th style="text-align: center;">Status</th>
        </tr>
      `;

      tableRows = filteredTransactions
        .map((t, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="white-space: nowrap; font-family: monospace;">${t.created_at ? t.created_at.replace('T', ' ').slice(0, 19) : today}</td>
            <td style="font-family: monospace; font-weight: 700; color: #0b4da2;">${t.transaction_ref}</td>
            <td style="text-transform: capitalize;">${t.category}</td>
            <td>${t.payment_method || 'Bank Transfer'}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: ${t.type === 'credit' ? '#047857' : '#be123c'};">
              ${t.type === 'credit' ? '+' : '-'}RM ${Number(t.amount).toFixed(2)}
            </td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">RM ${Number(t.balance_after).toFixed(2)}</td>
            <td style="text-align: center;"><span class="badge ${t.status === 'success' ? 'badge-green' : t.status === 'pending' ? 'badge-amber' : 'badge-gray'}">${t.status.toUpperCase()}</span></td>
          </tr>
        `)
        .join('');

    } else if (activeFundTab === 'epf') {
      docTitle = 'OFFICIAL EMPLOYEE EPF STATEMENT';
      fundLabel = 'Employee EPF Statutory Account';
      accountLabel = 'EPF Member ID';
      accountValue = `EPF-${wallet?.employee_code?.replace('EMP-', '') || '00000'}-MY`;

      const totalEmployeeShare = filteredEpfRecords.reduce((sum, r) => sum + (Number(r.employee_share) || 0), 0);
      const totalEmployerShare = filteredEpfRecords.reduce((sum, r) => sum + (Number(r.employer_share) || 0), 0);

      kpiBlocksHtml = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL ACCUMULATED EPF WALLET</div>
            <div class="kpi-value highlight-green">RM ${kpis.epfBalance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Total Statutory Balance</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EMPLOYEE CONTRIBUTION (11%)</div>
            <div class="kpi-value highlight-blue">RM ${totalEmployeeShare.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Salary Deductions</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EMPLOYER CONTRIBUTION (12%)</div>
            <div class="kpi-value highlight-blue">RM ${totalEmployerShare.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Company Remittances</div>
          </div>
        </div>
      `;

      tableHeaders = `
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>Contribution Month</th>
          <th>EPF Reference</th>
          <th style="text-align: right;">Basic Salary</th>
          <th style="text-align: right;">Employee Share (11%)</th>
          <th style="text-align: right;">Employer Share (12%)</th>
          <th style="text-align: right;">Total EPF Wallet</th>
          <th style="text-align: center;">Status</th>
        </tr>
      `;

      tableRows = filteredEpfRecords
        .map((r, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-weight: 700; color: #065f46;">${r.month_year}</td>
            <td style="font-family: monospace;">${r.reference_no}</td>
            <td style="text-align: right; font-family: monospace;">RM ${Number(r.basic_salary).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #0284c7;">RM ${Number(r.employee_share).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #0284c7;">RM ${Number(r.employer_share).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #047857;">RM ${Number(r.amount).toFixed(2)}</td>
            <td style="text-align: center;"><span class="badge ${r.status === 'paid' ? 'badge-green' : 'badge-amber'}">${r.status.toUpperCase()}</span></td>
          </tr>
        `)
        .join('');

    } else {
      docTitle = 'OFFICIAL EMPLOYEE SOCSO & EIS STATEMENT';
      fundLabel = 'Employee SOCSO & EIS Statutory Account';
      accountLabel = 'SOCSO Member ID';
      accountValue = `SOCSO-${wallet?.employee_code?.replace('EMP-', '') || '00000'}-MY`;

      const totalEmployeeShare = filteredSocsoRecords.reduce((sum, r) => sum + (Number(r.employee_share) || 0), 0);
      const totalEmployerShare = filteredSocsoRecords.reduce((sum, r) => sum + (Number(r.employer_share) || 0), 0);

      kpiBlocksHtml = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">TOTAL SOCSO WALLET</div>
            <div class="kpi-value highlight-purple">RM ${kpis.socsoBalance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Total Statutory Balance</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EMPLOYEE CONTRIBUTION (0.5%)</div>
            <div class="kpi-value highlight-blue">RM ${totalEmployeeShare.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Salary Deductions</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EMPLOYER CONTRIBUTION (1.75%)</div>
            <div class="kpi-value highlight-blue">RM ${totalEmployerShare.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Company Remittances</div>
          </div>
        </div>
      `;

      tableHeaders = `
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>Contribution Month</th>
          <th>SOCSO Reference</th>
          <th style="text-align: right;">Basic Salary</th>
          <th style="text-align: right;">Employee Share (0.5%)</th>
          <th style="text-align: right;">Employer Share (1.75%)</th>
          <th style="text-align: right;">Total SOCSO Wallet</th>
          <th style="text-align: center;">Status</th>
        </tr>
      `;

      tableRows = filteredSocsoRecords
        .map((r, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-family: monospace; font-weight: 700; color: #4338ca;">${r.month_year}</td>
            <td style="font-family: monospace;">${r.reference_no}</td>
            <td style="text-align: right; font-family: monospace;">RM ${Number(r.basic_salary).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #0284c7;">RM ${Number(r.employee_share).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #0284c7;">RM ${Number(r.employer_share).toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700; color: #4338ca;">RM ${Number(r.amount).toFixed(2)}</td>
            <td style="text-align: center;"><span class="badge ${r.status === 'paid' ? 'badge-green' : 'badge-amber'}">${r.status.toUpperCase()}</span></td>
          </tr>
        `)
        .join('');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>\${docTitle} - \${wallet?.name || 'Staff'}</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
            .header-table { width: 100%; border-bottom: 2.5px solid #0b4da2; padding-bottom: 12px; margin-bottom: 14px; }
            .org-title { font-size: 18px; font-weight: 900; color: #0b4da2; text-transform: uppercase; margin: 0; }
            .report-title { font-size: 12px; font-weight: 800; color: #1e293b; margin-top: 4px; letter-spacing: 0.3px; }
            .meta-text { font-size: 10px; color: #64748b; font-family: monospace; }
            .info-panel { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }
            .info-col { flex: 1; }
            .info-lbl { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .info-val { font-size: 11.5px; font-weight: 700; color: #0f172a; margin-top: 2px; }
            .kpi-grid { display: flex; gap: 12px; margin-bottom: 14px; }
            .kpi-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #ffffff; }
            .kpi-label { font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .kpi-value { font-size: 16px; font-weight: 900; font-family: monospace; margin: 4px 0; }
            .kpi-sub { font-size: 9px; color: #94a3b8; }
            .highlight-blue { color: #0b4da2; }
            .highlight-green { color: #047857; }
            .highlight-red { color: #be123c; }
            .highlight-purple { color: #4338ca; }
            table.data-table { width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1; }
            table.data-table th { background: #0b4da2; color: #ffffff; padding: 6px 8px; font-weight: 700; text-align: left; font-size: 9.5px; text-transform: uppercase; }
            table.data-table td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            table.data-table tbody tr:nth-child(even) { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; }
            .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-gray { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
            .footer-block { margin-top: 18px; border-top: 1px dashed #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; }
            .seal-badge { border: 1.5px solid #0b4da2; color: #0b4da2; padding: 3px 6px; border-radius: 4px; font-weight: 800; font-size: 8px; text-transform: uppercase; }
            @media print {
              body { padding: 0; }
              @page { margin: 8mm; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="org-title">\${wallet?.company_name || 'AGENCY EMPLOYEE SERVICES'}</div>
                <div class="report-title">\${docTitle}</div>
                <div style="font-size: 9.5px; color: #475569; margin-top: 2px;">\${fundLabel}</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="meta-text">STATEMENT DATE: \${today}</div>
                <div class="meta-text">TIME: \${time}</div>
                <div class="meta-text">RECORD ID: \${wallet?.employee_code || 'EMP-SYS'}</div>
              </td>
            </tr>
          </table>

          <div class="info-panel">
            <div class="info-col">
              <div class="info-lbl">Staff Member Name</div>
              <div class="info-val">\${wallet?.name || 'Staff Member'}</div>
            </div>
            <div class="info-col">
              <div class="info-lbl">Employee Code</div>
              <div class="info-val" style="font-family: monospace; color: #0b4da2;">\${wallet?.employee_code || '—'}</div>
            </div>
            <div class="info-col">
              <div class="info-lbl">Designation / Role</div>
              <div class="info-val">\${wallet?.role || 'Staff Member'}</div>
            </div>
            <div class="info-col">
              <div class="info-lbl">\${accountLabel}</div>
              <div class="info-val" style="font-family: monospace;">\${accountValue}</div>
            </div>
            <div class="info-col" style="text-align: right;">
              <div class="info-lbl">Bank / Settlement</div>
              <div class="info-val">\${wallet?.bank_name || 'Maybank'} (\${wallet?.bank_account_no || '—'})</div>
            </div>
          </div>

          \${kpiBlocksHtml}

          <table class="data-table">
            <thead>\${tableHeaders}</thead>
            <tbody>\${tableRows}</tbody>
          </table>

          <div class="footer-block">
            <div>
              <strong>Computer-Generated Official Record:</strong> Issued by \${wallet?.company_name || 'Corporate Agency'}. No manual signature required.
            </div>
            <div>
              <span class="seal-badge">OFFICIALLY VERIFIED ELECTRONIC LEDGER</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Dedicated High-Resolution Statutory Contribution Slip Printer
  const handlePrintStatutorySlip = (slip: StatutoryRecordItem | null) => {
    if (!slip) return;
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
    const isEpf = slip.type === 'epf';
    const voucherTitle = isEpf ? 'EPF CONTRIBUTION SLIP' : 'SOCSO CONTRIBUTION SLIP';
    const voucherTypeLabel = isEpf ? 'OFFICIAL EPF STATUTORY REMITTANCE SLIP' : 'OFFICIAL SOCSO & EIS REMITTANCE SLIP';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>\${voucherTitle} - \${slip.reference_no}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
            .voucher-card { border: 2px solid \${isEpf ? '#047857' : '#4338ca'}; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .v-header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px; }
            .v-org { font-size: 18px; font-weight: 900; color: \${isEpf ? '#047857' : '#4338ca'}; text-transform: uppercase; margin: 0; }
            .v-title { font-size: 12px; font-weight: 800; color: #334155; margin-top: 4px; letter-spacing: 0.5px; }
            .v-meta { font-size: 9.5px; color: #64748b; margin-top: 3px; font-family: monospace; }
            .amount-box { background: \${isEpf ? '#f0fdf4' : '#eef2ff'}; border: 1.5px dashed \${isEpf ? '#86efac' : '#a5b4fc'}; border-radius: 10px; padding: 12px; text-align: center; margin-bottom: 16px; }
            .amt-lbl { font-size: 9px; font-weight: 800; color: \${isEpf ? '#166534' : '#3730a3'}; text-transform: uppercase; letter-spacing: 0.5px; }
            .amt-val { font-size: 26px; font-weight: 900; font-family: monospace; color: \${isEpf ? '#15803d' : '#4338ca'}; margin: 3px 0; }
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
            .seal-badge { border: 1.5px solid \${isEpf ? '#047857' : '#4338ca'}; color: \${isEpf ? '#047857' : '#4338ca'}; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 9px; text-transform: uppercase; display: inline-block; }
            .sign-box { text-align: right; font-size: 9.5px; color: #475569; }
            .sign-line { width: 140px; border-bottom: 1px solid #0f172a; margin-bottom: 4px; display: inline-block; }
            .v-footer { margin-top: 16px; text-align: center; font-size: 8.5px; color: #94a3b8; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="voucher-card">
            <div class="v-header">
              <div class="v-org">\${wallet?.company_name || 'AGENCY EMPLOYEE SERVICES'}</div>
              <div class="v-title">\${voucherTitle}</div>
              <div class="v-meta">\${voucherTypeLabel} &bull; \${today}</div>
            </div>

            <div class="amount-box">
              <div class="amt-lbl">Total Statutory Contribution</div>
              <div class="amt-val">RM \${Number(slip.amount || 0).toFixed(2)}</div>
              <div style="font-size: 9px; color: #64748b;">Contribution Month: \${slip.month_year}</div>
            </div>

            <div class="grid-details">
              <div class="row"><span class="lbl">Reference ID:</span><span class="val mono font-bold">\${slip.reference_no}</span></div>
              <div class="row"><span class="lbl">Staff Member:</span><span class="val"><strong>\${slip.employee_name}</strong> (\${slip.employee_code})</span></div>
              <div class="row"><span class="lbl">Employer / Company:</span><span class="val">\${slip.company_name}</span></div>
              <div class="row"><span class="lbl">Basic Salary:</span><span class="val mono">RM \${Number(slip.basic_salary || 0).toFixed(2)}</span></div>
              <div class="row"><span class="lbl">Employee Deduction (\${isEpf ? '11%' : '0.5%'}):</span><span class="val mono font-bold">RM \${Number(slip.employee_share || 0).toFixed(2)}</span></div>
              <div class="row"><span class="lbl">Employer Contribution (\${isEpf ? '12%' : '1.75%'}):</span><span class="val mono font-bold">RM \${Number(slip.employer_share || 0).toFixed(2)}</span></div>
              <div class="row"><span class="lbl">Remittance Status:</span><span class="val badge badge-green">\${slip.status.toUpperCase()}</span></div>
              <div class="row"><span class="lbl">Settlement Method:</span><span class="val">\${slip.payment_method || 'Bank Transfer'}</span></div>
            </div>

            <div class="stamp-box">
              <div>
                <span class="seal-badge">OFFICIALLY VERIFIED STATUTORY REMITTANCE</span>
                <div style="font-size: 8.5px; color: #94a3b8; margin-top: 4px;">System Audit Verified &bull; Electronically Generated</div>
              </div>
              <div class="sign-box">
                <span class="sign-line"></span>
                <div>Authorized Officer</div>
              </div>
            </div>

            <div class="v-footer">This is an officially certified Malaysian Statutory Contribution Slip generated from the secure agency portal.</div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Dedicated High-Resolution Salary Transaction Slip Printer
  const handlePrintSalarySlip = (tx: WalletTransactionItem | null) => {
    if (!tx) return;
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
    const isCredit = tx.type === 'credit';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wallet Slip - \${tx.transaction_ref}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
            .voucher-card { border: 2px solid #0b4da2; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .v-header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px; }
            .v-org { font-size: 18px; font-weight: 900; color: #0b4da2; text-transform: uppercase; margin: 0; }
            .v-title { font-size: 12px; font-weight: 800; color: #334155; margin-top: 4px; letter-spacing: 0.5px; }
            .v-meta { font-size: 9.5px; color: #64748b; margin-top: 3px; font-family: monospace; }
            .amount-box { background: \${isCredit ? '#f0fdf4' : '#fff1f2'}; border: 1.5px dashed \${isCredit ? '#86efac' : '#fecdd3'}; border-radius: 10px; padding: 12px; text-align: center; margin-bottom: 16px; }
            .amt-lbl { font-size: 9px; font-weight: 800; color: \${isCredit ? '#166534' : '#be123c'}; text-transform: uppercase; letter-spacing: 0.5px; }
            .amt-val { font-size: 26px; font-weight: 900; font-family: monospace; color: \${isCredit ? '#15803d' : '#e11d48'}; margin: 3px 0; }
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
            .seal-badge { border: 1.5px solid #0b4da2; color: #0b4da2; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 9px; text-transform: uppercase; display: inline-block; }
            .sign-box { text-align: right; font-size: 9.5px; color: #475569; }
            .sign-line { width: 140px; border-bottom: 1px solid #0f172a; margin-bottom: 4px; display: inline-block; }
            .v-footer { margin-top: 16px; text-align: center; font-size: 8.5px; color: #94a3b8; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="voucher-card">
            <div class="v-header">
              <div class="v-org">\${wallet?.company_name || 'AGENCY EMPLOYEE SERVICES'}</div>
              <div class="v-title">EMPLOYEE DIGITAL WALLET DISBURSEMENT SLIP</div>
              <div class="v-meta">TRANSACTION RECEIPT &bull; \${today}</div>
            </div>

            <div class="amount-box">
              <div class="amt-lbl">\${isCredit ? 'Credited Amount' : 'Debited Amount'}</div>
              <div class="amt-val">\${isCredit ? '+' : '-'}RM \${Number(tx.amount || 0).toFixed(2)}</div>
              <div style="font-size: 9px; color: #64748b;">Status: \${tx.status.toUpperCase()}</div>
            </div>

            <div class="grid-details">
              <div class="row"><span class="lbl">Transaction Reference:</span><span class="val mono font-bold">\${tx.transaction_ref}</span></div>
              <div class="row"><span class="lbl">Staff Member:</span><span class="val"><strong>\${wallet?.name}</strong> (\${wallet?.employee_code})</span></div>
              <div class="row"><span class="lbl">Wallet Account:</span><span class="val mono">\${tx.wallet_account_no}</span></div>
              <div class="row"><span class="lbl">Category:</span><span class="val" style="text-transform: capitalize;">\${tx.category}</span></div>
              <div class="row"><span class="lbl">Payment Method:</span><span class="val">\${tx.payment_method || 'Bank Transfer'}</span></div>
              <div class="row"><span class="lbl">Balance Before:</span><span class="val mono">RM \${Number(tx.balance_before || 0).toFixed(2)}</span></div>
              <div class="row"><span class="lbl">Balance After:</span><span class="val mono font-bold">RM \${Number(tx.balance_after || 0).toFixed(2)}</span></div>
              <div class="row"><span class="lbl">Date & Time:</span><span class="val">\${tx.created_at ? tx.created_at.replace('T', ' ').slice(0, 19) : today}</span></div>
              \${tx.notes ? \`<div class="row"><span class="lbl">Notes / Remarks:</span><span class="val">\${tx.notes}</span></div>\` : ''}
            </div>

            <div class="stamp-box">
              <div>
                <span class="seal-badge">VERIFIED ELECTRONIC VOUCHER</span>
                <div style="font-size: 8.5px; color: #94a3b8; margin-top: 4px;">System Audit Verified &bull; Electronically Generated</div>
              </div>
              <div class="sign-box">
                <span class="sign-line"></span>
                <div>Authorized Officer</div>
              </div>
            </div>

            <div class="v-footer">This is an officially certified Employee Digital Wallet voucher generated from the secure agency portal.</div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0">
              Employee Digital Wallet
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time balance, EPF Wallet, and SOCSO Wallet statutory accounts.
          </p>
        </div>

        {/* Top Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#0b4da2] hover:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer border-0"
          >
            <Banknote size={14} />
            <span>Request Payout</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBankModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Landmark size={14} className="text-slate-500" />
            <span>Bank Account</span>
          </button>

          <button
            type="button"
            onClick={() => loadWalletData(true)}
            disabled={refreshing}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer bg-white"
            title="Refresh balance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-600 hover:text-emerald-800 border-0 bg-transparent cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* =========================================================================
          3 VIRTUAL PASS CARDS (Same Pass Card Design):
          1. Employee Pass (Salary Wallet)
          2. EPF Wallet Pass
          3. SOCSO Wallet Pass
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {/* CARD 1: Employee Pass (Salary Wallet) */}
        <div
          onClick={() => setActiveFundTab('salary')}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#072d62] via-[#0b4da2] to-[#1e3a8a] text-white p-5 shadow-lg flex flex-col justify-between min-h-[220px] border cursor-pointer transition-all duration-300 group select-none ${
            activeFundTab === 'salary'
              ? 'ring-4 ring-blue-400/60 shadow-2xl scale-[1.02] border-blue-300'
              : 'border-blue-400/20 hover:shadow-xl hover:scale-[1.01] opacity-95 hover:opacity-100'
          }`}
        >
          {/* Background Watermark */}
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Wallet className="w-44 h-44 text-white" />
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-bl-full pointer-events-none" />

          {/* Top Row */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Coins className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">
                  Employee Pass
                </div>
                <div className="text-xs font-semibold text-white tracking-wide truncate max-w-[150px]">
                  {wallet?.company_name || 'Corporate Agency'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </div>
          </div>

          {/* EMV Chip & Account Number */}
          <div className="relative z-10 my-3">
            <div className="w-9 h-6 rounded bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-400 border border-amber-500/40 shadow-xs relative overflow-hidden mb-2">
              <div className="w-full h-[1px] bg-amber-600/40 absolute top-2" />
              <div className="w-full h-[1px] bg-amber-600/40 absolute bottom-2" />
              <div className="h-full w-[1px] bg-amber-600/40 absolute left-2.5" />
              <div className="h-full w-[1px] bg-amber-600/40 absolute right-2.5" />
            </div>

            <div className="text-xs font-mono tracking-widest text-blue-100 font-bold drop-shadow-xs">
              {wallet?.wallet_account_no || 'WAL-EMP-00000'}
            </div>
          </div>

          {/* Bottom Row: Balance & Name */}
          <div className="relative z-10 pt-2 border-t border-white/10 flex items-end justify-between">
            <div>
              <div className="text-[10px] text-blue-200/80 font-medium uppercase tracking-wider">
                Salary Wallet Balance
              </div>
              <div className="text-2xl font-black text-white tracking-tight drop-shadow-xs">
                RM {kpis.liveBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-blue-200/80 uppercase font-medium">Cardholder</div>
              <div className="text-xs font-bold text-white tracking-wide uppercase truncate max-w-[120px]">
                {wallet?.name || currentUser?.name || 'Staff Member'}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: EPF Wallet Pass */}
        <div
          onClick={() => setActiveFundTab('epf')}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white p-5 shadow-lg flex flex-col justify-between min-h-[220px] border cursor-pointer transition-all duration-300 group select-none ${
            activeFundTab === 'epf'
              ? 'ring-4 ring-emerald-400/60 shadow-2xl scale-[1.02] border-emerald-300'
              : 'border-emerald-400/20 hover:shadow-xl hover:scale-[1.01] opacity-95 hover:opacity-100'
          }`}
        >
          {/* Background Watermark */}
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <ShieldCheck className="w-44 h-44 text-white" />
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-400/20 to-transparent rounded-bl-full pointer-events-none" />

          {/* Top Row */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">
                  EPF Wallet Pass
                </div>
                <div className="text-xs font-semibold text-white tracking-wide truncate max-w-[150px]">
                  {wallet?.company_name || 'Corporate Agency'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              11% + 12%
            </div>
          </div>

          {/* EMV Chip & Account Number */}
          <div className="relative z-10 my-3">
            <div className="w-9 h-6 rounded bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-400 border border-amber-500/40 shadow-xs relative overflow-hidden mb-2">
              <div className="w-full h-[1px] bg-amber-600/40 absolute top-2" />
              <div className="w-full h-[1px] bg-amber-600/40 absolute bottom-2" />
              <div className="h-full w-[1px] bg-amber-600/40 absolute left-2.5" />
              <div className="h-full w-[1px] bg-amber-600/40 absolute right-2.5" />
            </div>

            <div className="text-xs font-mono tracking-widest text-emerald-100 font-bold drop-shadow-xs">
              EPF-{wallet?.employee_code?.replace('EMP-', '') || '00000'}-MY
            </div>
          </div>

          {/* Bottom Row: Balance & Name */}
          <div className="relative z-10 pt-2 border-t border-white/10 flex items-end justify-between">
            <div>
              <div className="text-[10px] text-emerald-200/80 font-medium uppercase tracking-wider">
                Total Accumulated EPF Wallet
              </div>
              <div className="text-2xl font-black text-white tracking-tight drop-shadow-xs">
                RM {kpis.epfBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-emerald-200/80 uppercase font-medium">Cardholder</div>
              <div className="text-xs font-bold text-white tracking-wide uppercase truncate max-w-[120px]">
                {wallet?.name || currentUser?.name || 'Staff Member'}
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: SOCSO Wallet Pass */}
        <div
          onClick={() => setActiveFundTab('socso')}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#312e81] via-[#4338ca] to-[#3730a3] text-white p-5 shadow-lg flex flex-col justify-between min-h-[220px] border cursor-pointer transition-all duration-300 group select-none ${
            activeFundTab === 'socso'
              ? 'ring-4 ring-indigo-400/60 shadow-2xl scale-[1.02] border-indigo-300'
              : 'border-indigo-400/20 hover:shadow-xl hover:scale-[1.01] opacity-95 hover:opacity-100'
          }`}
        >
          {/* Background Watermark */}
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Coins className="w-44 h-44 text-white" />
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-indigo-400/20 to-transparent rounded-bl-full pointer-events-none" />

          {/* Top Row */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Coins className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">
                  SOCSO Wallet Pass
                </div>
                <div className="text-xs font-semibold text-white tracking-wide truncate max-w-[150px]">
                  {wallet?.company_name || 'Corporate Agency'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-400/20 border border-indigo-300/40 text-indigo-200 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
              0.5% + 1.75%
            </div>
          </div>

          {/* EMV Chip & Account Number */}
          <div className="relative z-10 my-3">
            <div className="w-9 h-6 rounded bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-400 border border-amber-500/40 shadow-xs relative overflow-hidden mb-2">
              <div className="w-full h-[1px] bg-amber-600/40 absolute top-2" />
              <div className="w-full h-[1px] bg-amber-600/40 absolute bottom-2" />
              <div className="h-full w-[1px] bg-amber-600/40 absolute left-2.5" />
              <div className="h-full w-[1px] bg-amber-600/40 absolute right-2.5" />
            </div>

            <div className="text-xs font-mono tracking-widest text-indigo-100 font-bold drop-shadow-xs">
              SOCSO-{wallet?.employee_code?.replace('EMP-', '') || '00000'}-MY
            </div>
          </div>

          {/* Bottom Row: Balance & Name */}
          <div className="relative z-10 pt-2 border-t border-white/10 flex items-end justify-between">
            <div>
              <div className="text-[10px] text-indigo-200/80 font-medium uppercase tracking-wider">
                Total Accumulated SOCSO Wallet
              </div>
              <div className="text-2xl font-black text-white tracking-tight drop-shadow-xs">
                RM {kpis.socsoBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-indigo-200/80 uppercase font-medium">Cardholder</div>
              <div className="text-xs font-bold text-white tracking-wide uppercase truncate max-w-[120px]">
                {wallet?.name || currentUser?.name || 'Staff Member'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILTER & STATEMENT ACTION TOOLBAR DIRECTLY ABOVE THE LIST
          ========================================================================= */}
      <div className={`${cardClasses} shadow-xs p-4 space-y-3`}>
        {/* Row 1: Fund Switcher & Print Statement */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Fund Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFundTab('salary')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeFundTab === 'salary'
                  ? 'bg-white text-[#0b4da2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Wallet size={13} />
              <span>Salary Ledger ({filteredTransactions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFundTab('epf')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeFundTab === 'epf'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <ShieldCheck size={13} />
              <span>EPF Wallet ({filteredEpfRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFundTab('socso')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeFundTab === 'socso'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Coins size={13} />
              <span>SOCSO Wallet ({filteredSocsoRecords.length})</span>
            </button>
          </div>

          {/* Action Buttons: Print Statement & Export */}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowStatementModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0b4da2] hover:bg-blue-800 rounded-lg transition-colors shadow-2xs shrink-0 whitespace-nowrap cursor-pointer border-0"
            >
              <Printer size={14} />
              <span>Print Statement</span>
            </button>

            <button
              type="button"
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search & Date Range Filters */}
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

          {/* Type Filter (for salary) or Status Filter */}
          <div className="relative z-30">
            {activeFundTab === 'salary' ? (
              <Select2Search
                options={typeSelect2Options}
                value={typeFilter}
                onChange={(val) => setTypeFilter(val as any)}
                placeholder="All Types"
                className="w-full"
              />
            ) : (
              <Select2Search
                options={statusSelect2Options}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                placeholder="All Statuses"
                className="w-full"
              />
            )}
          </div>

          {/* Status Filter for Salary */}
          <div className="relative z-20">
            {activeFundTab === 'salary' ? (
              <Select2Search
                options={statusSelect2Options}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                placeholder="All Statuses"
                className="w-full"
              />
            ) : (
              <div className="flex items-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
                <span>Fund: {activeFundTab.toUpperCase()}</span>
              </div>
            )}
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
                className="p-1.5 border border-slate-200 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-50 shrink-0 cursor-pointer bg-white"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          LIST VIEW 1: SALARY WALLET TRANSACTIONS TABLE
          ========================================================================= */}
      {activeFundTab === 'salary' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#0b4da2] text-white font-semibold border-b border-blue-700">
              <tr>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Transaction Ref</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Amount (RM)</th>
                <th className="py-3 px-3 text-right">Balance After</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
                      <span>Loading your salary wallet transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div>No salary wallet transactions found matching filters.</div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      {tx.transaction_ref}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.type === 'credit'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.type === 'credit' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {tx.type === 'credit' ? 'INCOME' : 'PAYOUT'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {tx.category}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                      tx.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}RM {Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      RM {Number(tx.balance_after).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'success'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {tx.notes || '—'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTxForSlip(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#0b4da2] hover:bg-blue-50 rounded-md transition-colors border border-blue-100 cursor-pointer bg-white"
                        title="View & Print Slip"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          LIST VIEW 2: EPF WALLET CONTRIBUTIONS TABLE
          ========================================================================= */}
      {activeFundTab === 'epf' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#047857] text-white font-semibold border-b border-emerald-700">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4">Contribution Month</th>
                <th className="py-3 px-4 text-right">Basic Salary</th>
                <th className="py-3 px-4 text-right">Employee Share (11%)</th>
                <th className="py-3 px-4 text-right">Employer Share (12%)</th>
                <th className="py-3 px-4 text-right">Total EPF Amount</th>
                <th className="py-3 px-4">EPF Reference No</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading your EPF Wallet records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEpfRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div>No EPF Wallet records found.</div>
                  </td>
                </tr>
              ) : (
                filteredEpfRecords.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                        <Calendar size={12} />
                        <span>{rec.month_year}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                      RM {Number(rec.basic_salary).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                      RM {Number(rec.employee_share).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                      RM {Number(rec.employer_share).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30 whitespace-nowrap">
                      RM {Number(rec.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {rec.reference_no}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedStatutorySlip(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 cursor-pointer bg-emerald-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Voucher</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          LIST VIEW 3: SOCSO WALLET CONTRIBUTIONS TABLE
          ========================================================================= */}
      {activeFundTab === 'socso' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#4338ca] text-white font-semibold border-b border-indigo-700">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4">Contribution Month</th>
                <th className="py-3 px-4 text-right">Basic Salary</th>
                <th className="py-3 px-4 text-right">Employee Share (0.5%)</th>
                <th className="py-3 px-4 text-right">Employer Share (1.75%)</th>
                <th className="py-3 px-4 text-right">Total SOCSO Amount</th>
                <th className="py-3 px-4">SOCSO Reference No</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading your SOCSO Wallet records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSocsoRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div>No SOCSO Wallet records found.</div>
                  </td>
                </tr>
              ) : (
                filteredSocsoRecords.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800">
                        <Calendar size={12} />
                        <span>{rec.month_year}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                      RM {Number(rec.basic_salary).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-700 whitespace-nowrap">
                      RM {Number(rec.employee_share).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-700 whitespace-nowrap">
                      RM {Number(rec.employer_share).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-800 bg-indigo-50/30 whitespace-nowrap">
                      RM {Number(rec.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {rec.reference_no}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedStatutorySlip(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-200 cursor-pointer bg-indigo-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Voucher</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          MODAL: OFFICIAL STATEMENT (WITH PRINT CAPABILITY)
          ========================================================================= */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm m-0">Official Malaysian Statement</h3>
              </div>
              <button
                onClick={() => setShowStatementModal(false)}
                className="text-white/80 hover:text-white rounded-lg p-1 hover:bg-white/10 border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Statement Document */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800" id="printable-statement">
              {/* Document Letterhead */}
              <div className="text-center pb-4 border-b-2 border-slate-900">
                <div className="text-lg font-black text-slate-900 uppercase tracking-wider">
                  {wallet?.company_name || 'Corporate Agency'}
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase mt-0.5">
                  {activeFundTab === 'salary'
                    ? 'Official Employee Salary Wallet Ledger Statement'
                    : activeFundTab === 'epf'
                    ? 'Official Employee EPF Statement'
                    : 'Official Employee SOCSO & EIS Statement'}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  Generated On: {new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Employee & Account Information Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Employee Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{wallet?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Employee Code:</span>
                  <span className="font-mono font-bold text-blue-700">{wallet?.employee_code}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Department / Role:</span>
                  <span className="font-medium text-slate-800">{wallet?.role || 'Staff Member'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">
                    {activeFundTab === 'salary' ? 'Wallet Account No:' : activeFundTab === 'epf' ? 'EPF Member No:' : 'SOCSO Member No:'}
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {activeFundTab === 'salary'
                      ? wallet?.wallet_account_no
                      : activeFundTab === 'epf'
                      ? `EPF-${wallet?.employee_code?.replace('EMP-', '')}-MY`
                      : `SOCSO-${wallet?.employee_code?.replace('EMP-', '')}-MY`}
                  </span>
                </div>
              </div>

              {/* Summary Balance Strip */}
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase">
                    {activeFundTab === 'salary'
                      ? 'Total Available Wallet Balance'
                      : activeFundTab === 'epf'
                      ? 'Total Accumulated EPF Wallet'
                      : 'Total SOCSO & EIS Protection'}
                  </div>
                  <div className="text-2xl font-black text-[#0b4da2] font-mono mt-0.5">
                    RM {(
                      activeFundTab === 'salary'
                        ? kpis.liveBalance
                        : activeFundTab === 'epf'
                        ? kpis.epfBalance
                        : kpis.socsoBalance
                    ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right text-[11px] font-semibold text-slate-500">
                  <div>Status: <span className="font-bold text-emerald-700">VERIFIED ACTIVE</span></div>
                  <div>Period: {startDate || 'Earliest'} to {endDate || 'Latest'}</div>
                </div>
              </div>

              {/* Statement Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    {activeFundTab === 'salary' ? (
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Amount (RM)</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="py-2.5 px-3">Month</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3 text-right">Employee Share</th>
                        <th className="py-2.5 px-3 text-right">Employer Share</th>
                        <th className="py-2.5 px-3 text-right">Total Fund (RM)</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {activeFundTab === 'salary' ? (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="py-2 px-3 text-slate-600">{tx.created_at?.slice(0, 10)}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{tx.transaction_ref}</td>
                          <td className="py-2 px-3 font-sans capitalize text-slate-700">{tx.category}</td>
                          <td className={`py-2 px-3 text-right font-bold ${tx.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {tx.type === 'credit' ? '+' : '-'}RM {Number(tx.amount).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-900 font-bold">
                            RM {Number(tx.balance_after).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : activeFundTab === 'epf' ? (
                      filteredEpfRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{r.month_year}</td>
                          <td className="py-2 px-3 text-slate-600">{r.reference_no}</td>
                          <td className="py-2 px-3 text-right text-emerald-700">RM {Number(r.employee_share).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-emerald-700">RM {Number(r.employer_share).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-800">RM {Number(r.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      filteredSocsoRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{r.month_year}</td>
                          <td className="py-2 px-3 text-slate-600">{r.reference_no}</td>
                          <td className="py-2 px-3 text-right text-indigo-700">RM {Number(r.employee_share).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-indigo-700">RM {Number(r.employer_share).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-indigo-800">RM {Number(r.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Official Computer Generated Certification Notice */}
              <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
                <div className="flex items-center justify-center gap-1.5 font-bold text-slate-700 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0b4da2]" />
                  <span>Officially Verified Electronic Record</span>
                </div>
                <div>This is a computer-generated statement issued by {wallet?.company_name || 'Agency Portal'}. No signature is required.</div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handlePrintOfficialStatement}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b4da2] hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer border-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement Now</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStatementModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW STATUTORY VOUCHER SLIP (EPF / SOCSO)
          ========================================================================= */}
      {selectedStatutorySlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`px-5 py-4 text-white flex items-center justify-between ${
              selectedStatutorySlip.type === 'epf' ? 'bg-[#047857]' : 'bg-[#4338ca]'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" />
                <h3 className="font-bold text-sm m-0">
                  {selectedStatutorySlip.type === 'epf' ? 'EPF Contribution Voucher' : 'SOCSO Contribution Voucher'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStatutorySlip(null)}
                className="text-white/80 hover:text-white rounded-lg p-1 hover:bg-white/10 border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs" id="printable-statutory-slip">
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <div className="text-base font-bold text-slate-900 uppercase">
                  {selectedStatutorySlip.company_name}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {selectedStatutorySlip.type === 'epf' ? 'EPF Statutory Contribution' : 'SOCSO & EIS Statutory Contribution'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  Contribution Month: {selectedStatutorySlip.month_year}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Total Statutory Contribution</div>
                <div className={`text-2xl font-black mt-0.5 ${selectedStatutorySlip.type === 'epf' ? 'text-emerald-700' : 'text-indigo-700'}`}>
                  RM {Number(selectedStatutorySlip.amount).toFixed(2)}
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mt-1">
                  {selectedStatutorySlip.status}
                </span>
              </div>

              <div className="space-y-2 py-2 border-b border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference No:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedStatutorySlip.reference_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-semibold text-slate-800">{selectedStatutorySlip.employee_name} ({selectedStatutorySlip.employee_code})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Basic Salary:</span>
                  <span className="font-mono text-slate-800">RM {Number(selectedStatutorySlip.basic_salary).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Share ({selectedStatutorySlip.type === 'epf' ? '11%' : '0.5%'}):</span>
                  <span className="font-mono font-bold text-slate-800">RM {Number(selectedStatutorySlip.employee_share).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employer Share ({selectedStatutorySlip.type === 'epf' ? '12%' : '1.75%'}):</span>
                  <span className="font-mono font-bold text-slate-800">RM {Number(selectedStatutorySlip.employer_share).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handlePrintStatutorySlip(selectedStatutorySlip)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatutorySlip(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-2xs cursor-pointer border-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VIEW SALARY TRANSACTION SLIP
          ========================================================================= */}
      {selectedTxForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm m-0">Official Electronic Slip</h3>
              </div>
              <button
                onClick={() => setSelectedTxForSlip(null)}
                className="text-white/80 hover:text-white rounded-lg p-1 hover:bg-white/10 border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs" id="printable-slip">
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

              <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1 text-slate-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0b4da2]" />
                  <span>Verified Electronic Voucher</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handlePrintSalarySlip(selectedTxForSlip)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTxForSlip(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-2xs cursor-pointer border-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REQUEST WITHDRAWAL / ADVANCE
          ========================================================================= */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-[#0b4da2]" />
                <h3 className="font-bold text-sm text-slate-900 m-0">Request Payout / Advance</h3>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Payout Amount (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Available Salary Balance: RM {kpis.liveBalance.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Category
                </label>
                <select
                  value={withdrawForm.category}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                >
                  <option value="Salary Advance">Salary Advance</option>
                  <option value="Withdrawal Payout">Withdrawal Payout</option>
                  <option value="Medical Allowance">Medical Allowance</option>
                  <option value="Emergency Expense">Emergency Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  value={withdrawForm.bank_name}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawForm.bank_account_name}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_account_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Account No
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawForm.bank_account_no}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_account_no: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason / Notes
                </label>
                <textarea
                  rows={2}
                  value={withdrawForm.notes}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
                  placeholder="Optional payout explanation..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0b4da2] hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  {submittingAction ? <span>Submitting...</span> : <span>Submit Request</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: UPDATE BANK DETAILS
          ========================================================================= */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#0b4da2]" />
                <h3 className="font-bold text-sm text-slate-900 m-0">Payout Bank Details</h3>
              </div>
              <button
                onClick={() => setShowBankModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBankSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  placeholder="e.g. Maybank, CIMB, Public Bank"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  value={bankForm.bank_account_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_account_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  required
                  value={bankForm.bank_account_no}
                  onChange={(e) => setBankForm({ ...bankForm, bank_account_no: e.target.value })}
                  placeholder="e.g. 114012345678"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0b4da2] hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  {submittingAction ? <span>Saving...</span> : <span>Save Bank Info</span>}
                </button>
              </div>
            </form>
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
          aside, header, nav, button, input, select, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
