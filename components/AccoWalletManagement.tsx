'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  AlertTriangle,
  Coins,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Globe,
  Layers,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useDashboardCardDesign, useCardAnimationSettings, getServiceCardAnimationClass } from '@/lib/themeSettings';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend, addCompanyWalletBalance } from '@/lib/companyStorage';

export interface WalletRequestItem {
  id: number;
  company_id: string;
  company_name: string;
  wallet_account_no: string;
  company_current_balance: number;
  company_roc?: string | null;
  company_currency?: string;
  type: 'credit' | 'debit' | string;
  status: 'pending' | 'success' | 'cancelled' | 'refunded';
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_method: string;
  reference: string;
  is_duplicate_ref?: boolean;
  duplicate_ref_count?: number;
  notes?: string | null;
  requested_by?: string | null;
  payment_slip?: string | null;
  payment_slip_name?: string | null;
  admin_notes?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  created_at?: string | null;
}

export interface CompanyBalanceRow {
  company_id: string;
  company_name: string;
  wallet_account_no: string;
  roc?: string | null;
  pending_count: number;
  pending_amount: number;
  success_count: number;
  success_amount: number;
  spent_count: number;
  spent_amount: number;
  cancel_count: number;
  refund_count: number;
  refund_amount: number;
  live_wallet_balance: number;
  expected_balance: number;
  is_balanced: boolean;
  has_activity: boolean;
}

export interface WalletSummary {
  cash_deposit_count: number;
  cash_deposit_amount: number;
  success_count: number;
  success_amount: number;
  cancel_count: number;
  cancel_amount: number;
  refund_count: number;
  refund_amount: number;
  wallet_spent_count: number;
  wallet_spent_amount: number;
  total_live_wallet_balance: number;
  expected_net_balance: number;
  is_balanced: boolean;
  cash_method_amount: number;
  online_method_amount: number;
  card_method_amount: number;
  total_count: number;
  total_amount: number;
}

const DEFAULT_SUMMARY: WalletSummary = {
  cash_deposit_count: 0,
  cash_deposit_amount: 0,
  success_count: 0,
  success_amount: 0,
  cancel_count: 0,
  cancel_amount: 0,
  refund_count: 0,
  refund_amount: 0,
  wallet_spent_count: 0,
  wallet_spent_amount: 0,
  total_live_wallet_balance: 0,
  expected_net_balance: 0,
  is_balanced: true,
  cash_method_amount: 0,
  online_method_amount: 0,
  card_method_amount: 0,
  total_count: 0,
  total_amount: 0,
};

function formatCurrency(val: number): string {
  return `RM ${(Number(val) || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function getPaymentChannel(tx: WalletRequestItem): 'cash' | 'online' | 'card' | 'wallet' {
  const m = (tx.payment_method || '').toLowerCase();
  if (tx.type === 'debit' || m.includes('wallet')) return 'wallet';
  if (m.includes('card') || m.includes('visa') || m.includes('master') || m.includes('debit') || m.includes('credit')) {
    return 'card';
  }
  if (m.includes('online') || m.includes('fpx') || m.includes('bank') || m.includes('duitnow') || m.includes('transfer')) {
    return 'online';
  }
  return 'cash';
}

export default function AccoWalletManagement() {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';
  const { animation: cardAnimation } = useCardAnimationSettings();

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const [transactions, setTransactions] = useState<WalletRequestItem[]>([]);
  const [companyBalances, setCompanyBalances] = useState<CompanyBalanceRow[]>([]);
  const [summary, setSummary] = useState<WalletSummary>(DEFAULT_SUMMARY);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active View Tab: Ledger vs Per-Company Reconciliation
  const [activeViewTab, setActiveViewTab] = useState<'ledger' | 'balances'>('ledger');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'debit' | 'cancelled' | 'refunded'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'online' | 'card'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notification toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Action Modals
  const [viewingTx, setViewingTx] = useState<WalletRequestItem | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'cancel' | 'refund';
    tx: WalletRequestItem;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Direct Deposit Modal (Super Admin manual top-up)
  const [isDirectModalOpen, setIsDirectModalOpen] = useState<boolean>(false);
  const [directCompanyId, setDirectCompanyId] = useState<string>('');
  const [directAmount, setDirectAmount] = useState<string>('');
  const [directMethod, setDirectMethod] = useState<string>('Cash Payment');
  const [directRef, setDirectRef] = useState<string>('');
  const [directNotes, setDirectNotes] = useState<string>('');
  const [isSubmittingDirect, setIsSubmittingDirect] = useState<boolean>(false);

  // Export Dropdown
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const storedCos = getStoredCompanies();
        if (storedCos.length > 0) {
          setCompanies(storedCos);
        }
        fetchCompaniesFromBackend()
          .then((list) => {
            if (Array.isArray(list) && list.length > 0) setCompanies(list);
          })
          .catch(() => {});

        const query = selectedCompanyId !== 'ALL' ? `?company_id=${encodeURIComponent(selectedCompanyId)}` : '';
        const res = await fetch(`${apiBase}/wallet-requests${query}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
            setCompanyBalances(Array.isArray(data.company_balances) ? data.company_balances : []);
            setSummary(data.summary || DEFAULT_SUMMARY);
          }
        }
      } catch (err) {
        console.error('Failed to fetch Acco Wallet requests:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiBase, selectedCompanyId]
  );

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(true), 15000);
    const handleEvent = () => loadData(true);
    window.addEventListener('acco_wallet_updated', handleEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('acco_wallet_updated', handleEvent);
    };
  }, [loadData]);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Counts for top method tabs (All, Cash Deposit, Online Deposit, Debit / Credit Card)
  const methodTabCounts = useMemo(() => {
    let cash = 0;
    let online = 0;
    let card = 0;
    transactions.forEach((tx) => {
      const ch = getPaymentChannel(tx);
      if (ch === 'cash') cash += 1;
      else if (ch === 'online') online += 1;
      else if (ch === 'card') card += 1;
    });
    return {
      all: transactions.length,
      cash,
      online,
      card,
    };
  }, [transactions]);

  // Filtered ledger table rows
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const isDebit = tx.type === 'debit';

      // Status / Type filter
      if (statusFilter === 'debit') {
        if (!isDebit) return false;
      } else if (statusFilter !== 'all') {
        if (isDebit || tx.status !== statusFilter) return false;
      }

      // Payment Method Tab filter
      if (methodFilter !== 'all') {
        if (getPaymentChannel(tx) !== methodFilter) return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const txDate = tx.created_at ? tx.created_at.slice(0, 10) : '';
        if (dateFrom && txDate < dateFrom) return false;
        if (dateTo && txDate > dateTo) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (tx.company_name || '').toLowerCase().includes(q) ||
          (tx.wallet_account_no || '').toLowerCase().includes(q) ||
          (tx.reference || '').toLowerCase().includes(q) ||
          (tx.payment_method || '').toLowerCase().includes(q) ||
          (tx.requested_by || '').toLowerCase().includes(q) ||
          (tx.notes || '').toLowerCase().includes(q) ||
          String(tx.id).includes(q)
        );
      }
      return true;
    });
  }, [transactions, statusFilter, methodFilter, dateFrom, dateTo, searchQuery]);

  // Filtered company balances rows
  const filteredCompanyBalances = useMemo(() => {
    return companyBalances.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          row.company_name.toLowerCase().includes(q) ||
          row.wallet_account_no.toLowerCase().includes(q) ||
          (row.roc || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [companyBalances, searchQuery]);

  // Open confirmation modal for Approve / Cancel / Refund
  const openActionModal = (type: 'approve' | 'cancel' | 'refund', tx: WalletRequestItem) => {
    setActionModal({ type, tx });
    if (type === 'approve') {
      setActionNotes('Verified and approved by Super Admin');
      setRefundAmountInput('');
    } else if (type === 'cancel') {
      setActionNotes('');
      setRefundAmountInput('');
    } else {
      const maxRefundable = Math.max(0, Math.min(tx.amount, tx.company_current_balance));
      setRefundAmountInput(maxRefundable > 0 ? maxRefundable.toFixed(2) : '0.00');
      setActionNotes('');
    }
  };

  // Execute Approve / Cancel / Refund
  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    const { type, tx } = actionModal;

    if (type === 'refund') {
      const parsedRefund = parseFloat(refundAmountInput);
      const maxRefundable = Math.max(0, Math.min(tx.amount, tx.company_current_balance));
      if (isNaN(parsedRefund) || parsedRefund <= 0) {
        showToast('error', 'Please enter a valid positive refund amount.');
        return;
      }
      if (parsedRefund > maxRefundable + 0.001) {
        showToast(
          'error',
          `Over-refund blocked! Maximum refundable amount is ${formatCurrency(maxRefundable)}.`
        );
        return;
      }
    }

    setIsProcessingAction(true);

    try {
      const endpoint = `${apiBase}/wallet-requests/${tx.id}/${type}`;
      const bodyPayload: Record<string, any> = {
        admin_notes: actionNotes.trim() || undefined,
        processed_by: 'Super Admin',
      };
      if (type === 'refund') {
        bodyPayload.refund_amount = parseFloat(refundAmountInput);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to ${type} deposit request.`);
      }

      setActionModal(null);
      setActionNotes('');
      setRefundAmountInput('');
      showToast('success', data.message || `Request ${type}d successfully!`);
      window.dispatchEvent(new Event('acco_wallet_updated'));
      await loadData(true);
    } catch (err: any) {
      showToast('error', err.message || 'Operation failed. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Direct deposit submission
  const handleDirectDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directCompanyId) {
      alert('Please select a company.');
      return;
    }
    const amt = parseFloat(directAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    setIsSubmittingDirect(true);
    try {
      await addCompanyWalletBalance(directCompanyId, {
        amount: amt,
        payment_method: directMethod,
        reference: directRef || `ADMIN-${Date.now().toString().slice(-6)}`,
        notes: directNotes || 'Direct wallet credit by Super Admin',
        mode: 'direct',
        requested_by: 'Super Admin',
      });
      setIsDirectModalOpen(false);
      setDirectCompanyId('');
      setDirectAmount('');
      setDirectRef('');
      setDirectNotes('');
      showToast('success', `${formatCurrency(amt)} credited directly to company wallet!`);
      window.dispatchEvent(new Event('acco_wallet_updated'));
      await loadData(true);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add direct wallet deposit.');
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  // Export Excel (.xlsx) with corporate styling
  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (filteredTransactions.length === 0) {
      alert('No wallet transactions found to export.');
      return;
    }

    const data = filteredTransactions.map((tx, idx) => ({
      SL: idx + 1,
      'Entry Type': tx.type === 'debit' ? 'DEBIT (SPENT)' : 'CREDIT (DEPOSIT)',
      Reference: tx.reference || `#${tx.id}`,
      'Duplicate Ref': tx.is_duplicate_ref ? `YES (x${tx.duplicate_ref_count})` : 'No',
      'Company Name': tx.company_name,
      'Account No': tx.wallet_account_no,
      'Payment Method': tx.payment_method,
      'Amount (RM)': tx.type === 'debit' ? -Number(tx.amount) : Number(tx.amount),
      'Balance Before (RM)': Number(tx.balance_before) || 0,
      'Balance After (RM)': Number(tx.balance_after) || 0,
      Status:
        tx.type === 'debit'
          ? 'WALLET SPENT'
          : tx.status === 'pending'
          ? 'CASH DEPOSIT (PENDING)'
          : tx.status === 'success'
          ? 'SUCCESS'
          : tx.status === 'cancelled'
          ? 'CANCELLED'
          : 'REFUNDED',
      'Requested By': tx.requested_by || 'Master Admin',
      'Date & Time': formatDateTime(tx.created_at),
      'Admin Remarks': tx.admin_notes || tx.notes || '—',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    const headerStyle = {
      fill: { fgColor: { rgb: '0B4DA2' } },
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '083877' } },
        bottom: { style: 'medium', color: { rgb: '083877' } },
        left: { style: 'thin', color: { rgb: '083877' } },
        right: { style: 'thin', color: { rgb: '083877' } },
      },
    };

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellRef]) worksheet[cellRef].s = headerStyle;
    }

    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const isEven = row % 2 === 0;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellRef]) continue;
        const isNumeric = col === 7 || col === 8 || col === 9;
        worksheet[cellRef].s = {
          fill: isEven ? { fgColor: { rgb: 'F8FAFC' } } : undefined,
          font: { name: 'Calibri', sz: 10, bold: col === 7 },
          alignment: { vertical: 'center', horizontal: col === 0 ? 'center' : isNumeric ? 'right' : 'left' },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };
      }
    }

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 26 },
      { wch: 14 },
      { wch: 22 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Acco Wallet Ledger');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `acco_wallet_audit_ledger_${today}.xlsx`);
  };

  // Export CSV
  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (filteredTransactions.length === 0) {
      alert('No wallet transactions found to export.');
      return;
    }

    const headers = [
      'SL',
      'Type',
      'Reference',
      'Duplicate Ref',
      'Company Name',
      'Account No',
      'Payment Method',
      'Amount (RM)',
      'Balance Before',
      'Balance After',
      'Status',
      'Requested By',
      'Date',
      'Remarks',
    ];

    const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = [
      headers.join(','),
      ...filteredTransactions.map((tx, idx) =>
        [
          idx + 1,
          tx.type === 'debit' ? 'DEBIT' : 'CREDIT',
          escapeCSV(tx.reference || `#${tx.id}`),
          tx.is_duplicate_ref ? 'YES' : 'NO',
          escapeCSV(tx.company_name),
          escapeCSV(tx.wallet_account_no),
          escapeCSV(tx.payment_method),
          tx.type === 'debit' ? (-Number(tx.amount)).toFixed(2) : Number(tx.amount).toFixed(2),
          Number(tx.balance_before || 0).toFixed(2),
          Number(tx.balance_after || 0).toFixed(2),
          escapeCSV(tx.type === 'debit' ? 'WALLET_SPENT' : tx.status.toUpperCase()),
          escapeCSV(tx.requested_by || 'Master Admin'),
          escapeCSV(formatDateTime(tx.created_at)),
          escapeCSV(tx.admin_notes || tx.notes || ''),
        ].join(',')
      ),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `acco_wallet_audit_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    setIsExportOpen(false);
    window.print();
  };

  const getCardClasses = (index: number, active: boolean, activeRing: string) => {
    const animClass = getServiceCardAnimationClass(cardAnimation, index);
    return `admin-stat-card ${animClass} text-left w-full cursor-pointer transition-all flex flex-col justify-between min-h-[116px] ${
      isGlass
        ? `dashboard-card-glass rounded-2xl p-5 ${active ? `ring-2 ${activeRing}` : ''}`
        : `bg-white border rounded-2xl p-5 shadow-xs ${
            active ? `ring-2 ${activeRing} border-transparent` : 'border-slate-200 hover:border-slate-300'
          }`
    }`;
  };

  const kpiCards = [
    {
      key: 'pending' as const,
      title: 'Cash Deposit Wallet',
      amount: summary.cash_deposit_amount,
      count: summary.cash_deposit_count,
      subLabel: `${summary.cash_deposit_count} Pending ${summary.cash_deposit_count === 1 ? 'Request' : 'Requests'}`,
      icon: Banknote,
      iconBg: 'bg-blue-50 text-[#0b4da2]',
      valueColor: 'text-[#0b4da2]',
      activeRing: 'ring-[#0b4da2]',
    },
    {
      key: 'success' as const,
      title: 'Success Deposit Wallet',
      amount: summary.success_amount,
      count: summary.success_count,
      subLabel: `${summary.success_count} Approved ${summary.success_count === 1 ? 'Deposit' : 'Deposits'}`,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      valueColor: 'text-emerald-600',
      activeRing: 'ring-emerald-500',
    },
    {
      key: 'cancelled' as const,
      title: 'Cancel Deposit Wallet',
      amount: summary.cancel_amount,
      count: summary.cancel_count,
      subLabel: `${summary.cancel_count} Cancelled ${summary.cancel_count === 1 ? 'Request' : 'Requests'}`,
      icon: XCircle,
      iconBg: 'bg-rose-50 text-rose-600',
      valueColor: 'text-rose-600',
      activeRing: 'ring-rose-500',
    },
    {
      key: 'refunded' as const,
      title: 'Refund Wallet',
      amount: summary.refund_amount,
      count: summary.refund_count,
      subLabel: `${summary.refund_count} Refunded ${summary.refund_count === 1 ? 'Transaction' : 'Transactions'}`,
      icon: RotateCcw,
      iconBg: 'bg-purple-50 text-purple-600',
      valueColor: 'text-purple-600',
      activeRing: 'ring-purple-500',
    },
  ];

  const getStatusBadge = (tx: WalletRequestItem) => {
    if (tx.type === 'debit') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <ArrowUpRight size={12} />
          <span>Wallet Spent</span>
        </span>
      );
    }
    switch (tx.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} />
            <span>Pending</span>
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} />
            <span>Success</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={11} />
            <span>Cancelled</span>
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw size={11} />
            <span>Refunded</span>
          </span>
        );
    }
  };

  const hasActiveFilters = statusFilter !== 'all' || methodFilter !== 'all' || dateFrom !== '' || dateTo !== '' || searchQuery.trim() !== '';

  return (
    <div className="w-full max-w-full min-w-0 space-y-5">
      {/* Floating Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3.5 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 max-w-md ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0b4da2] to-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Wallet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                  Acco Wallet
                </h1>
                {summary.cash_deposit_count > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    <Clock size={11} />
                    {summary.cash_deposit_count} Pending Request{summary.cash_deposit_count > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Audit-grade wallet ledger: approve deposits, track wallet spending, block over-refunds &amp; reconcile company balances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              title="Refresh wallet requests"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#0b4da2]' : ''} />
              <span>Refresh</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative inline-flex items-center shrink-0" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="h-9 inline-flex items-center justify-center gap-2 px-3.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer border border-emerald-700 whitespace-nowrap"
              >
                <Download size={14} />
                <span>Export</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Export ({filteredTransactions.length} records)
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

            <button
              type="button"
              onClick={() => {
                setDirectRef(`ADMIN-${Date.now().toString().slice(-6)}`);
                setIsDirectModalOpen(true);
              }}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-[#083a7c] text-white shadow-xs transition-all cursor-pointer border border-[#0b4da2] whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Direct Top-Up</span>
            </button>
          </div>
        </div>

        {/* Company Filter & View Switcher Bar */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Building2 size={15} className="text-[#0b4da2]" />
              <span>Company:</span>
            </div>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="h-9 bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0b4da2] min-w-[230px]"
            >
              <option value="ALL">All Companies ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {selectedCompanyId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCompanyId('ALL')}
                className="h-9 inline-flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 rounded-lg transition-colors cursor-pointer"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* 2 View Tabs: All Requests & Ledger | Company Balances */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveViewTab('ledger')}
              className={`h-7 px-3.5 rounded-md text-xs font-bold inline-flex items-center justify-center transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeViewTab === 'ledger'
                  ? 'bg-white text-[#0b4da2] shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              All Requests &amp; Ledger ({summary.total_count})
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('balances')}
              className={`h-7 px-3.5 rounded-md text-xs font-bold inline-flex items-center justify-center transition-all cursor-pointer border-0 whitespace-nowrap ${
                activeViewTab === 'balances'
                  ? 'bg-white text-[#0b4da2] shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Company Balances ({companyBalances.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Row: Cash Deposit Wallet, Success Deposit Wallet, Cancel Deposit Wallet, Refund Wallet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => {
          const IconComponent = card.icon;
          const isActive = activeViewTab === 'ledger' && statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setActiveViewTab('ledger');
                setStatusFilter(isActive ? 'all' : card.key);
              }}
              className={getCardClasses(index, isActive, card.activeRing)}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
                  {card.title}
                </span>
                <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <IconComponent size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-extrabold tracking-tight font-mono ${card.valueColor}`}>
                  {formatCurrency(card.amount)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center justify-between">
                  <span>{card.subLabel}</span>
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-1.5 py-0.5 rounded">
                      Filtered
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Formal Corporate Audit Reconciliation Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                summary.is_balanced
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              <ShieldCheck size={17} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 m-0">
                Audit Reconciliation Summary
              </h2>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                Formula: Success Deposits (+) − Wallet Spent (−) = Live Available Balance
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${
              summary.is_balanced
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {summary.is_balanced ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{summary.is_balanced ? 'Accounts Balanced' : 'Ledger Variance Detected'}</span>
          </span>
        </div>

        {/* 3 Equal Formal Accounting Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Column 1: Success Deposits */}
          <div className="px-5 py-4 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Success Deposits (+)
            </span>
            <div className="text-xl font-extrabold font-mono text-emerald-700 mt-1.5">
              {formatCurrency(summary.success_amount)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              {summary.success_count} Approved {summary.success_count === 1 ? 'Deposit' : 'Deposits'}
            </span>
          </div>

          {/* Column 2: Wallet Spent (Clickable filter) */}
          <button
            type="button"
            onClick={() => {
              setActiveViewTab('ledger');
              setMethodFilter('all');
              setStatusFilter(statusFilter === 'debit' ? 'all' : 'debit');
            }}
            className={`px-5 py-4 text-left flex flex-col justify-between transition-colors cursor-pointer border-0 ${
              statusFilter === 'debit' ? 'bg-indigo-50/70' : 'bg-white hover:bg-slate-50'
            }`}
            title="Click to filter Wallet Spent debit entries"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Wallet Spent / Debits (−)
              </span>
              {statusFilter === 'debit' && (
                <span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  Filtered
                </span>
              )}
            </div>
            <div className="text-xl font-extrabold font-mono text-indigo-700 mt-1.5">
              {formatCurrency(summary.wallet_spent_amount)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              {summary.wallet_spent_count} Package Payment {summary.wallet_spent_count === 1 ? 'Debit' : 'Debits'}
            </span>
          </button>

          {/* Column 3: Live Wallet Balance */}
          <div className="px-5 py-4 bg-blue-50/35 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b4da2]">
              Live Wallet Balance (=)
            </span>
            <div className="text-xl font-extrabold font-mono text-slate-900 mt-1.5">
              {formatCurrency(summary.total_live_wallet_balance)}
            </div>
            <span className="text-[11px] text-slate-600 mt-1">
              Net Available Across {companyBalances.length} {companyBalances.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </div>
        </div>

        {/* Formal Footer Channel Breakdown */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Approved Deposits by Channel
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveViewTab('ledger');
                setMethodFilter('cash');
                if (statusFilter === 'debit') setStatusFilter('all');
              }}
              className={`h-8 inline-flex items-center gap-2 px-3 rounded-lg text-xs border transition-colors cursor-pointer ${
                methodFilter === 'cash'
                  ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className={methodFilter === 'cash' ? 'text-blue-100' : 'text-slate-500'}>Cash:</span>
              <strong className="font-mono">{formatCurrency(summary.cash_method_amount)}</strong>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveViewTab('ledger');
                setMethodFilter('online');
                if (statusFilter === 'debit') setStatusFilter('all');
              }}
              className={`h-8 inline-flex items-center gap-2 px-3 rounded-lg text-xs border transition-colors cursor-pointer ${
                methodFilter === 'online'
                  ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className={methodFilter === 'online' ? 'text-blue-100' : 'text-slate-500'}>Online:</span>
              <strong className="font-mono">{formatCurrency(summary.online_method_amount)}</strong>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveViewTab('ledger');
                setMethodFilter('card');
                if (statusFilter === 'debit') setStatusFilter('all');
              }}
              className={`h-8 inline-flex items-center gap-2 px-3 rounded-lg text-xs border transition-colors cursor-pointer ${
                methodFilter === 'card'
                  ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className={methodFilter === 'card' ? 'text-blue-100' : 'text-slate-500'}>Card:</span>
              <strong className="font-mono">{formatCurrency(summary.card_method_amount)}</strong>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: ALL REQUESTS & LEDGER */}
      {activeViewTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Top Payment Method Tabs: All | Cash Deposit | Online Deposit | Debit / Credit Card */}
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 pt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { key: 'all', label: 'All', count: methodTabCounts.all, icon: Layers },
                { key: 'cash', label: 'Cash Deposit', count: methodTabCounts.cash, icon: Banknote },
                { key: 'online', label: 'Online Deposit', count: methodTabCounts.online, icon: Globe },
                { key: 'card', label: 'Debit / Credit Card', count: methodTabCounts.card, icon: CreditCard },
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = methodFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setMethodFilter(tab.key as any);
                      if (tab.key !== 'all' && statusFilter === 'debit') {
                        setStatusFilter('all');
                      }
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-lg border-t border-x border-b-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#0b4da2] border-t-slate-200 border-x-slate-200 border-b-[#0b4da2] -mb-[1px]'
                        : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <IconComp size={14} className={isActive ? 'text-[#0b4da2]' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-blue-100 text-[#0b4da2]' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-slate-500 font-medium pb-2">
              Showing <strong>{filteredTransactions.length}</strong> entries
            </span>
          </div>

          {/* Search, Date Range & Status Filter Bar */}
          <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company, account no, reference..."
                  className="h-9 w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg pl-10 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0b4da2] focus:ring-1 focus:ring-blue-400 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 bg-transparent border-0 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-9 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3">
                  <Calendar size={13} className="text-slate-500 shrink-0" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    title="From Date"
                    className="bg-transparent text-xs text-slate-700 border-0 focus:outline-none"
                  />
                  <span className="text-slate-400 text-xs">→</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    title="To Date"
                    className="bg-transparent text-xs text-slate-700 border-0 focus:outline-none"
                  />
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setMethodFilter('all');
                      setDateFrom('');
                      setDateTo('');
                      setSearchQuery('');
                    }}
                    className="h-9 inline-flex items-center justify-center gap-1 px-3 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer whitespace-nowrap"
                  >
                    <X size={12} />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status Quick Filter Pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'all', label: `All (${summary.total_count})` },
                  { key: 'pending', label: `Pending (${summary.cash_deposit_count})` },
                  { key: 'success', label: `Success (${summary.success_count})` },
                  { key: 'debit', label: `Wallet Spent (${summary.wallet_spent_count})` },
                  { key: 'cancelled', label: `Cancel (${summary.cancel_count})` },
                  { key: 'refunded', label: `Refund (${summary.refund_count})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.key as any);
                      if (tab.key === 'debit') setMethodFilter('all');
                    }}
                    className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center transition-colors cursor-pointer border whitespace-nowrap ${
                      statusFilter === tab.key
                        ? tab.key === 'debit'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-[#0b4da2] text-white border-[#0b4da2]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                Scroll horizontally to view all columns →
              </span>
            </div>
          </div>

          {/* Clean Single-Value-Per-Column Wallet Ledger Table (Generous Widths + Smooth Horizontal Scroll) */}
          <div className="w-full max-w-full overflow-x-auto pb-1">
            <table className="w-full text-left border-collapse min-w-[2040px]">
              <thead>
                <tr className="bg-[#0b4da2] text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-4 text-center min-w-[64px] whitespace-nowrap border-r border-white/10">SL</th>
                  <th className="py-4 px-4 min-w-[185px] whitespace-nowrap border-r border-white/10">Date &amp; Time</th>
                  <th className="py-4 px-4 min-w-[180px] whitespace-nowrap border-r border-white/10">Reference</th>
                  <th className="py-4 px-4 min-w-[260px] whitespace-nowrap border-r border-white/10">Company Name</th>
                  <th className="py-4 px-4 min-w-[140px] whitespace-nowrap border-r border-white/10">Account No</th>
                  <th className="py-4 px-4 min-w-[175px] whitespace-nowrap border-r border-white/10">Payment Method</th>
                  <th className="py-4 px-4 text-center min-w-[130px] whitespace-nowrap border-r border-white/10">Slip</th>
                  <th className="py-4 px-4 text-right min-w-[155px] whitespace-nowrap border-r border-white/10">Amount</th>
                  <th className="py-4 px-4 text-right min-w-[155px] whitespace-nowrap border-r border-white/10">Before Balance</th>
                  <th className="py-4 px-4 text-right min-w-[155px] whitespace-nowrap border-r border-white/10">After Balance</th>
                  <th className="py-4 px-4 text-center min-w-[140px] whitespace-nowrap border-r border-white/10">Status</th>
                  <th className="py-4 px-4 min-w-[150px] whitespace-nowrap border-r border-white/10">Requested By</th>
                  <th className="py-4 px-4 min-w-[240px] whitespace-nowrap border-r border-white/10">Remarks</th>
                  <th className="py-4 px-4 text-center min-w-[195px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center text-slate-400 font-medium">
                      Loading Acco Wallet audit ledger...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Wallet size={36} className="mb-2 opacity-40" />
                        <p className="text-sm font-semibold text-slate-600 m-0">No wallet ledger entries found</p>
                        <p className="text-xs text-slate-400 mt-1 m-0">
                          Adjust your tab or filters to view matching transactions.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, index) => {
                    const isDebit = tx.type === 'debit';
                    const hasBalanceTrail = isDebit || tx.status === 'success' || tx.status === 'refunded';
                    return (
                      <tr
                        key={tx.id}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          tx.is_duplicate_ref
                            ? 'bg-rose-50/40'
                            : isDebit
                            ? 'bg-indigo-50/20'
                            : tx.status === 'pending'
                            ? 'bg-amber-50/25'
                            : index % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/40'
                        }`}
                      >
                        {/* 1. SL */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-500 border-r border-slate-100">
                          {index + 1}
                        </td>

                        {/* 2. Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600 border-r border-slate-100">
                          {formatDateTime(tx.created_at)}
                        </td>

                        {/* 3. Reference */}
                        <td className="py-3.5 px-4 whitespace-nowrap border-r border-slate-100">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">
                              {tx.reference || `REQ-${tx.id}`}
                            </span>
                            {tx.is_duplicate_ref && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300"
                                title={`Warning: Duplicate reference appears ${tx.duplicate_ref_count} times`}
                              >
                                <AlertTriangle size={10} />
                                ×{tx.duplicate_ref_count}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Company Name */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap border-r border-slate-100" title={tx.company_name}>
                          {tx.company_name}
                        </td>

                        {/* 5. Account No */}
                        <td className="py-3.5 px-4 whitespace-nowrap border-r border-slate-100">
                          <span className="font-mono text-xs font-bold text-[#0b4da2] bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
                            {tx.wallet_account_no}
                          </span>
                        </td>

                        {/* 6. Payment Method */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800 border-r border-slate-100">
                          {tx.payment_method}
                        </td>

                        {/* 7. Slip */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap border-r border-slate-100">
                          {tx.payment_slip ? (
                            <button
                              type="button"
                              onClick={() => setViewingTx(tx)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-[#0b4da2] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                              title={tx.payment_slip_name || 'Inspect Payment Slip'}
                            >
                              {tx.payment_slip.startsWith('data:image') ? (
                                <img
                                  src={tx.payment_slip}
                                  alt="Slip"
                                  className="w-4 h-4 rounded object-cover border border-blue-200 shrink-0"
                                />
                              ) : (
                                <FileText size={12} className="shrink-0" />
                              )}
                              <span>View Slip</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 8. Amount */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap border-r border-slate-100">
                          <span
                            className={`font-mono font-extrabold text-[13px] inline-flex items-center gap-0.5 ${
                              isDebit
                                ? 'text-indigo-700'
                                : tx.status === 'refunded'
                                ? 'text-purple-700'
                                : tx.status === 'cancelled'
                                ? 'text-rose-600 line-through'
                                : 'text-emerald-700'
                            }`}
                          >
                            {isDebit ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                            {isDebit ? '-' : '+'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>

                        {/* 9. Before Balance */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-slate-600 border-r border-slate-100">
                          {hasBalanceTrail ? formatCurrency(tx.balance_before) : '—'}
                        </td>

                        {/* 10. After Balance */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900 border-r border-slate-100">
                          {hasBalanceTrail ? formatCurrency(tx.balance_after) : '—'}
                        </td>

                        {/* 11. Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap border-r border-slate-100">
                          {getStatusBadge(tx)}
                        </td>

                        {/* 12. Requested By */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700 border-r border-slate-100">
                          {tx.requested_by || 'Master Admin'}
                        </td>

                        {/* 13. Remarks */}
                        <td
                          className="py-3.5 px-4 max-w-[260px] truncate text-slate-500 border-r border-slate-100"
                          title={tx.admin_notes || tx.notes || ''}
                        >
                          {tx.admin_notes || tx.notes || '—'}
                        </td>

                        {/* 14. Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isDebit && tx.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openActionModal('approve', tx)}
                                  className="h-7 inline-flex items-center justify-center gap-1 px-2.5 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer border border-emerald-600"
                                  title="Approve & Credit Wallet"
                                >
                                  <Check size={12} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openActionModal('cancel', tx)}
                                  className="h-7 inline-flex items-center justify-center gap-1 px-2.5 rounded-md text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                                  title="Cancel Deposit Request"
                                >
                                  <X size={12} />
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}

                            {!isDebit && tx.status === 'success' && (
                              <button
                                type="button"
                                onClick={() => openActionModal('refund', tx)}
                                className="h-7 inline-flex items-center justify-center gap-1 px-2.5 rounded-md text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                                title="Refund Deposit (with over-refund protection)"
                              >
                                <RotateCcw size={12} />
                                <span>Refund</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setViewingTx(tx)}
                              className="h-7 inline-flex items-center justify-center gap-1 px-2.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                              title="View Full Receipt & Details"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PER-COMPANY WALLET BALANCES & RECONCILIATION */}
      {activeViewTab === 'balances' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company name, account no..."
                className="h-9 w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg pl-10 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0b4da2]"
              />
            </div>
            <div className="text-xs text-slate-500">
              Formula: <span className="font-mono font-bold text-slate-800">Deposits − Wallet Spent = Live Balance</span>
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-auto pb-1">
            <table className="w-full text-left border-collapse min-w-[1440px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-4 text-center min-w-[64px] whitespace-nowrap border-r border-white/10">SL</th>
                  <th className="py-4 px-4 min-w-[260px] whitespace-nowrap border-r border-white/10">Company Name</th>
                  <th className="py-4 px-4 min-w-[145px] whitespace-nowrap border-r border-white/10">Account No</th>
                  <th className="py-4 px-4 text-right min-w-[155px] whitespace-nowrap border-r border-white/10">Pending Amount</th>
                  <th className="py-4 px-4 text-right min-w-[175px] whitespace-nowrap border-r border-white/10">Total Deposited (+)</th>
                  <th className="py-4 px-4 text-right min-w-[165px] whitespace-nowrap border-r border-white/10">Wallet Spent (−)</th>
                  <th className="py-4 px-4 text-right min-w-[145px] whitespace-nowrap border-r border-white/10">Refunded</th>
                  <th className="py-4 px-4 text-right min-w-[165px] whitespace-nowrap border-r border-white/10">Live Balance</th>
                  <th className="py-4 px-4 text-center min-w-[125px] whitespace-nowrap border-r border-white/10">Audit</th>
                  <th className="py-4 px-4 text-center min-w-[120px] whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {filteredCompanyBalances.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      No companies found.
                    </td>
                  </tr>
                ) : (
                  filteredCompanyBalances.map((row, idx) => (
                    <tr
                      key={row.company_id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-slate-100">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap border-r border-slate-100">
                        {row.company_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap border-r border-slate-100">
                        <span className="font-mono text-[11px] font-bold text-[#0b4da2] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {row.wallet_account_no}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap border-r border-slate-100">
                        {row.pending_amount > 0 ? (
                          <span className="font-bold text-amber-700">{formatCurrency(row.pending_amount)}</span>
                        ) : (
                          <span className="text-slate-400">RM 0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap border-r border-slate-100">
                        +{formatCurrency(row.success_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700 whitespace-nowrap border-r border-slate-100">
                        {row.spent_amount > 0 ? `-${formatCurrency(row.spent_amount)}` : 'RM 0.00'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-purple-700 whitespace-nowrap border-r border-slate-100">
                        {row.refund_amount > 0 ? formatCurrency(row.refund_amount) : 'RM 0.00'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-50/70 whitespace-nowrap border-r border-slate-100">
                        {formatCurrency(row.live_wallet_balance)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap border-r border-slate-100">
                        {row.is_balanced ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            Balanced
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                            title={`Expected ${formatCurrency(row.expected_balance)} vs Live ${formatCurrency(row.live_wallet_balance)}`}
                          >
                            <AlertTriangle size={11} />
                            Variance
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompanyId(row.company_id);
                            setActiveViewTab('ledger');
                            setMethodFilter('all');
                            setStatusFilter('all');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#0b4da2] bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Ledger</span>
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

      {/* Approve / Cancel / Refund Confirmation Modal */}
      {actionModal && (() => {
        const isRefund = actionModal.type === 'refund';
        const maxRefundable = Math.max(0, Math.min(actionModal.tx.amount, actionModal.tx.company_current_balance));
        const parsedRefundAmt = parseFloat(refundAmountInput) || 0;
        const alreadySpentFromDeposit = Math.max(0, actionModal.tx.amount - actionModal.tx.company_current_balance);
        const refundBlocked = isRefund && (maxRefundable <= 0 || parsedRefundAmt <= 0 || parsedRefundAmt > maxRefundable + 0.001);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div
                className={`px-5 py-4 flex items-center justify-between text-white ${
                  actionModal.type === 'approve'
                    ? 'bg-emerald-600'
                    : actionModal.type === 'cancel'
                    ? 'bg-rose-600'
                    : 'bg-purple-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {actionModal.type === 'approve' ? (
                    <CheckCircle2 size={20} />
                  ) : actionModal.type === 'cancel' ? (
                    <XCircle size={20} />
                  ) : (
                    <RotateCcw size={20} />
                  )}
                  <h3 className="text-base font-bold m-0">
                    {actionModal.type === 'approve'
                      ? 'Approve Wallet Deposit'
                      : actionModal.type === 'cancel'
                      ? 'Cancel Deposit Request'
                      : 'Refund Wallet Deposit'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmAction} className="p-5 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Company:</span>
                    <strong className="text-slate-900">{actionModal.tx.company_name}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Account No:</span>
                    <span className="font-mono font-bold text-[#0b4da2]">{actionModal.tx.wallet_account_no}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Reference:</span>
                    <span className="font-mono font-semibold text-slate-700">{actionModal.tx.reference}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                    <span className="text-slate-600 font-bold">Original Deposit:</span>
                    <span className="font-mono text-base font-black text-slate-900">
                      {formatCurrency(actionModal.tx.amount)}
                    </span>
                  </div>
                </div>

                {/* Duplicate Reference Fraud Alert in Approve Modal */}
                {actionModal.type === 'approve' && actionModal.tx.is_duplicate_ref && (
                  <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300 flex items-start gap-2.5 text-xs text-rose-900">
                    <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-extrabold">Duplicate Reference Detected!</strong>
                      <span>
                        Reference <strong className="font-mono">{actionModal.tx.reference}</strong> appears{' '}
                        <strong>{actionModal.tx.duplicate_ref_count} times</strong> in the wallet ledger. Please
                        verify the deposit slip carefully to avoid approving a duplicate claim.
                      </span>
                    </div>
                  </div>
                )}

                {actionModal.type === 'approve' && (
                  <div className="space-y-3">
                    <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      Approving will credit <strong>{formatCurrency(actionModal.tx.amount)}</strong> to{' '}
                      <strong>{actionModal.tx.company_name}</strong>&apos;s wallet balance (New Balance:{' '}
                      <strong className="font-mono">
                        {formatCurrency(actionModal.tx.company_current_balance + actionModal.tx.amount)}
                      </strong>
                      ).
                    </div>
                    {actionModal.tx.payment_slip && (
                      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 truncate">
                            Attached Slip: {actionModal.tx.payment_slip_name || 'Payment Slip'}
                          </span>
                          <a
                            href={actionModal.tx.payment_slip}
                            download={actionModal.tx.payment_slip_name || `wallet-slip-${actionModal.tx.id}`}
                            className="text-[#0b4da2] font-bold hover:underline no-underline shrink-0 ml-2"
                          >
                            Download
                          </a>
                        </div>
                        {actionModal.tx.payment_slip.startsWith('data:image') && (
                          <img
                            src={actionModal.tx.payment_slip}
                            alt="Payment Slip"
                            className="w-full max-h-40 object-contain rounded-lg border border-slate-200 bg-white"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Over-Refund Protection & Partial Refund Input */}
                {isRefund && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Available Balance</span>
                        <span className="font-mono font-black text-emerald-700 text-sm">
                          {formatCurrency(actionModal.tx.company_current_balance)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Max Refundable</span>
                        <span className="font-mono font-black text-purple-700 text-sm">
                          {formatCurrency(maxRefundable)}
                        </span>
                      </div>
                    </div>

                    {maxRefundable <= 0 ? (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2 text-xs text-rose-800">
                        <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Over-Refund Blocked!</strong>
                          <span>
                            Company has already spent this deposit (Available Balance: <strong>RM 0.00</strong>). Cannot refund spent funds.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {alreadySpentFromDeposit > 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                            Company has spent <strong>{formatCurrency(alreadySpentFromDeposit)}</strong> from their balance. Only a{' '}
                            <strong>Partial Refund</strong> up to <strong>{formatCurrency(maxRefundable)}</strong> is allowed.
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Refund Amount (RM) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={maxRefundable}
                            required
                            value={refundAmountInput}
                            onChange={(e) => setRefundAmountInput(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg text-purple-800 focus:outline-none focus:border-purple-600"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Remarks / Reason {actionModal.type !== 'approve' && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={3}
                    required={actionModal.type !== 'approve'}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder={
                      actionModal.type === 'approve'
                        ? 'Optional approval note...'
                        : actionModal.type === 'cancel'
                        ? 'Enter reason for cancelling this deposit request...'
                        : 'Enter reason for refunding this deposit...'
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActionModal(null)}
                    disabled={isProcessingAction}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingAction || refundBlocked}
                    className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                      actionModal.type === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : actionModal.type === 'cancel'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {isProcessingAction
                      ? 'Processing...'
                      : actionModal.type === 'approve'
                      ? 'Confirm & Approve'
                      : actionModal.type === 'cancel'
                      ? 'Confirm Cancellation'
                      : parsedRefundAmt < actionModal.tx.amount
                      ? `Partial Refund (${formatCurrency(parsedRefundAmt)})`
                      : `Confirm Full Refund (${formatCurrency(parsedRefundAmt)})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* View Transaction Details & Payment Slip Modal */}
      {viewingTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Wallet size={18} />
                <div>
                  <h3 className="text-sm font-bold m-0">Wallet Ledger &amp; Slip Details</h3>
                  <p className="text-[11px] text-slate-300 font-mono m-0">{viewingTx.reference || `REQ-${viewingTx.id}`}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingTx(null)}
                className="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {viewingTx.type === 'debit' ? 'Wallet Deduction Amount' : 'Deposit Amount'}
                  </span>
                  <span className={`text-2xl font-black font-mono ${viewingTx.type === 'debit' ? 'text-indigo-700' : 'text-slate-900'}`}>
                    {viewingTx.type === 'debit' ? '-' : '+'}
                    {formatCurrency(viewingTx.amount)}
                  </span>
                </div>
                <div>{getStatusBadge(viewingTx)}</div>
              </div>

              {/* Payment Slip Preview */}
              {viewingTx.payment_slip && (
                <div className="border-2 border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="text-[#0b4da2] shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-slate-900 block">
                          Uploaded Payment Slip / Receipt
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono truncate block">
                          {viewingTx.payment_slip_name || `wallet-slip-${viewingTx.id}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const win = window.open();
                          if (win && viewingTx.payment_slip) {
                            win.document.write(
                              viewingTx.payment_slip.startsWith('data:image')
                                ? `<html><head><title>${viewingTx.payment_slip_name || 'Payment Slip'}</title></head><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${viewingTx.payment_slip}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
                                : `<html><head><title>${viewingTx.payment_slip_name || 'Payment Slip'}</title></head><body style="margin:0;"><iframe src="${viewingTx.payment_slip}" style="width:100vw;height:100vh;border:0;"></iframe></body></html>`
                            );
                            win.document.close();
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-blue-50 text-[#0b4da2] border border-blue-200 cursor-pointer"
                      >
                        <ExternalLink size={12} />
                        <span>Full View</span>
                      </button>
                      <a
                        href={viewingTx.payment_slip}
                        download={viewingTx.payment_slip_name || `wallet-slip-${viewingTx.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#0b4da2] hover:bg-[#083a7c] text-white no-underline"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                  {viewingTx.payment_slip.startsWith('data:image') ? (
                    <img
                      src={viewingTx.payment_slip}
                      alt="Uploaded Payment Slip"
                      className="w-full max-h-80 object-contain rounded-lg border border-slate-200 bg-white shadow-2xs"
                    />
                  ) : viewingTx.payment_slip.startsWith('data:application/pdf') ? (
                    <iframe
                      src={viewingTx.payment_slip}
                      title="Payment Slip PDF"
                      className="w-full h-72 rounded-lg border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-slate-600">
                      Document attached — click Download or Full View above to inspect.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Company</span>
                  <span className="font-bold text-slate-900">{viewingTx.company_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Wallet Account No</span>
                  <span className="font-mono font-bold text-[#0b4da2]">{viewingTx.wallet_account_no}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Method</span>
                  <span className="font-semibold text-slate-800">{viewingTx.payment_method}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Requested By</span>
                  <span className="font-semibold text-slate-800">{viewingTx.requested_by || 'Master Admin'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance Before</span>
                  <span className="font-mono font-semibold text-slate-700">{formatCurrency(viewingTx.balance_before)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance After</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(viewingTx.balance_after)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Submitted At</span>
                  <span className="text-slate-700">{formatDateTime(viewingTx.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Processed At</span>
                  <span className="text-slate-700">{formatDateTime(viewingTx.processed_at)}</span>
                </div>
              </div>

              {(viewingTx.notes || viewingTx.admin_notes) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  {viewingTx.notes && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Transaction Notes</span>
                      <p className="text-slate-700 m-0 mt-0.5">{viewingTx.notes}</p>
                    </div>
                  )}
                  {viewingTx.admin_notes && (
                    <div className="pt-1.5 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Super Admin Remarks ({viewingTx.processed_by || 'Super Admin'})
                      </span>
                      <p className="text-slate-800 font-medium m-0 mt-0.5">{viewingTx.admin_notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {viewingTx.type !== 'debit' && viewingTx.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const target = viewingTx;
                          setViewingTx(null);
                          openActionModal('approve', target);
                        }}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer"
                      >
                        Approve Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const target = viewingTx;
                          setViewingTx(null);
                          openActionModal('cancel', target);
                        }}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {viewingTx.type !== 'debit' && viewingTx.status === 'success' && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingTx;
                        setViewingTx(null);
                        openActionModal('refund', target);
                      }}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer"
                    >
                      Refund Deposit
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingTx(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Direct Top-Up Modal */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gradient-to-r from-[#0b4da2] to-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Coins size={20} />
                <h3 className="text-base font-bold m-0">Direct Wallet Top-Up (Super Admin)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectModalOpen(false)}
                className="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDirectDepositSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Company <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={directCompanyId}
                  onChange={(e) => setDirectCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                >
                  <option value="">-- Choose Company --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Bal: {formatCurrency(Number(c.wallet_balance || 0))})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount (RM) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={directAmount}
                    onChange={(e) => setDirectAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#0b4da2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Method</label>
                  <select
                    value={directMethod}
                    onChange={(e) => setDirectMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                  >
                    <option value="Cash Payment">Cash Payment</option>
                    <option value="Online Payment (Bank Transfer)">Online / Bank Transfer</option>
                    <option value="Debit / Credit Card">Debit / Credit Card</option>
                    <option value="Direct Admin Credit">Direct Admin Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reference No</label>
                <input
                  type="text"
                  value={directRef}
                  onChange={(e) => setDirectRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={directNotes}
                  onChange={(e) => setDirectNotes(e.target.value)}
                  placeholder="e.g. Verified office cash deposit"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDirect}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083a7c] rounded-lg shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  {isSubmittingDirect ? 'Crediting...' : 'Credit Wallet Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
