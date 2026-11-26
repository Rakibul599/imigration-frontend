'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Wallet,
  ArrowDownLeft,
  RotateCcw,
  Target,
  TrendingUp,
  Clock,
  Printer,
  Download,
  Eye,
  X,
  ArrowLeft,
  Search,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Filter,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  CustomerRecord,
  getStoredCustomers,
  fetchCustomersFromBackend,
  getFileUrl,
} from '@/lib/customerStorage';
import { Company } from '@/lib/companies';
import {
  getStoredCompanies,
  fetchCompaniesFromBackend,
} from '@/lib/companyStorage';
import {
  CustomerTargetAmountRecord,
  CustomerDepositAmountRecord,
  CustomerRefundAmountRecord,
  CustomerCompanyCostRecord,
  fetchCustomerTargets,
  getStoredCustomerTargets,
  fetchCustomerDeposits,
  getStoredCustomerDeposits,
  fetchCustomerRefunds,
  getStoredCustomerRefunds,
  fetchCustomerCompanyCosts,
  getStoredCompanyCosts,
} from '@/lib/customerFinanceStorage';
import { useDashboardCardDesign } from '@/lib/themeSettings';

export interface CustomerFinancialLedgerPageProps {
  portalType?: 'superadmin' | 'masteradmin';
  backUrl?: string;
}

interface UnifiedTransactionItem {
  id: string | number;
  date: string;
  type: 'deposit' | 'refund' | 'target' | 'cost';
  voucher_no: string;
  purpose: string;
  payment_method: string;
  bank_name?: string;
  amount: number;
  status: string;
  receipt_url?: string;
  receipt_filename?: string;
  remarks?: string;
}

function CustomerFinancialLedgerContent({
  portalType = 'superadmin',
  backUrl,
}: CustomerFinancialLedgerPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';

  const defaultBackUrl =
    backUrl || (portalType === 'masteradmin' ? '/masteradmin/customers' : '/customers');

  // Data states
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [targets, setTargets] = useState<CustomerTargetAmountRecord[]>([]);
  const [deposits, setDeposits] = useState<CustomerDepositAmountRecord[]>([]);
  const [refunds, setRefunds] = useState<CustomerRefundAmountRecord[]>([]);
  const [costs, setCosts] = useState<CustomerCompanyCostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Table filters
  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'refunds' | 'targets' | 'costs'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Document preview modal
  const [previewDocument, setPreviewDocument] = useState<{ url: string; title: string; filename?: string } | null>(null);

  // Load data from Backend APIs with localStorage fallback
  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, compList, tgtList, depList, refList, costList] = await Promise.all([
        fetchCustomersFromBackend().catch(() => getStoredCustomers()),
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
        fetchCustomerTargets().catch(() => getStoredCustomerTargets()),
        fetchCustomerDeposits().catch(() => getStoredCustomerDeposits()),
        fetchCustomerRefunds().catch(() => getStoredCustomerRefunds()),
        fetchCustomerCompanyCosts().catch(() => getStoredCompanyCosts()),
      ]);

      setCustomers(custList || []);
      setCompanies(compList || []);
      setTargets(tgtList || []);
      setDeposits(depList || []);
      setRefunds(refList || []);
      setCosts(costList || []);

      // Auto select customer from query param (?id=... or ?passport=...)
      const paramId = searchParams.get('id');
      const paramPassport = searchParams.get('passport');
      if (paramId && custList) {
        const found = custList.find((c) => String(c.id) === String(paramId));
        if (found) setSelectedCustomerId(String(found.id));
      } else if (paramPassport && custList) {
        const found = custList.find((c) => c.passport_no?.toLowerCase() === paramPassport.toLowerCase());
        if (found) setSelectedCustomerId(String(found.id));
      } else if (custList && custList.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(String(custList[0].id));
      }
    } catch (err) {
      console.error('Failed to load customer financial ledger data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleTargetsUpdate = () => setTargets(getStoredCustomerTargets());
    const handleDepositsUpdate = () => setDeposits(getStoredCustomerDeposits());
    const handleRefundsUpdate = () => setRefunds(getStoredCustomerRefunds());
    const handleCostsUpdate = () => setCosts(getStoredCompanyCosts());

    window.addEventListener('customerTargetsUpdated', handleTargetsUpdate);
    window.addEventListener('customerDepositsUpdated', handleDepositsUpdate);
    window.addEventListener('customerRefundsUpdated', handleRefundsUpdate);
    window.addEventListener('companyCostsUpdated', handleCostsUpdate);

    return () => {
      window.removeEventListener('customerTargetsUpdated', handleTargetsUpdate);
      window.removeEventListener('customerDepositsUpdated', handleDepositsUpdate);
      window.removeEventListener('customerRefundsUpdated', handleRefundsUpdate);
      window.removeEventListener('companyCostsUpdated', handleCostsUpdate);
    };
  }, []);

  // Update selected customer if URL query param changes
  useEffect(() => {
    const paramId = searchParams.get('id');
    if (paramId && paramId !== selectedCustomerId) {
      setSelectedCustomerId(paramId);
    }
  }, [searchParams]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  // Employer company of selected customer
  const selectedCustomerCompany = useMemo(() => {
    if (!selectedCustomer) return null;
    return companies.find((comp) => comp.id.toLowerCase() === selectedCustomer.company_id?.toLowerCase()) || null;
  }, [companies, selectedCustomer]);

  // Customer specific financial data
  const { customerTargets, customerDeposits, customerRefunds, customerCosts } = useMemo(() => {
    if (!selectedCustomerId) {
      return { customerTargets: [], customerDeposits: [], customerRefunds: [], customerCosts: [] };
    }
    const cIdStr = String(selectedCustomerId);
    return {
      customerTargets: targets.filter((t) => String(t.customer_id) === cIdStr),
      customerDeposits: deposits.filter((d) => String(d.customer_id) === cIdStr),
      customerRefunds: refunds.filter((r) => String(r.customer_id) === cIdStr),
      customerCosts: costs.filter((c) => String(c.customer_id) === cIdStr),
    };
  }, [selectedCustomerId, targets, deposits, refunds, costs]);

  // Wallet Calculations
  // Clean Database Guarantee: If records are cleared, all values strictly fall back to 0.00!
  const { totalTarget, totalDeposited, pendingBalance, totalRefunded, totalProfit } = useMemo(() => {
    const tgt = customerTargets.reduce((sum, t) => sum + (Number(t.target_amount) || 0), 0);
    const dep = customerDeposits.reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);
    const ref = customerRefunds.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);
    const cst = customerCosts.reduce((sum, c) => sum + (Number(c.total_cost_amount) || 0), 0);

    const pending = Math.max(0, tgt - dep);
    const profit = Math.max(0, dep - ref - cst);

    return {
      totalTarget: tgt,
      totalDeposited: dep,
      pendingBalance: pending,
      totalRefunded: ref,
      totalProfit: profit,
    };
  }, [customerTargets, customerDeposits, customerRefunds, customerCosts]);

  // Unified Transactions List for selected customer
  const customerTransactions: UnifiedTransactionItem[] = useMemo(() => {
    if (!selectedCustomerId) return [];

    const depItems: UnifiedTransactionItem[] = customerDeposits.map((d) => ({
      id: `dep_${d.id}`,
      date: d.deposit_date || (d.created_at ? d.created_at.split('T')[0] : '—'),
      type: 'deposit',
      voucher_no: d.receipt_no || `DEP-${String(d.id).slice(-5)}`,
      purpose: d.purpose || 'Deposit Payment',
      payment_method: d.payment_method || 'Bank Transfer',
      bank_name: d.bank_name,
      amount: Number(d.deposit_amount) || 0,
      status: d.verification_status || 'Verified',
      receipt_url: d.receipt_url,
      receipt_filename: d.receipt_filename,
      remarks: d.remarks,
    }));

    const refItems: UnifiedTransactionItem[] = customerRefunds.map((r) => ({
      id: `ref_${r.id}`,
      date: r.refund_date || (r.created_at ? r.created_at.split('T')[0] : '—'),
      type: 'refund',
      voucher_no: r.receipt_no || `REF-${String(r.id).slice(-5)}`,
      purpose: r.purpose || 'Refund Disbursement',
      payment_method: r.payment_method || 'Bank Transfer',
      bank_name: r.bank_name,
      amount: Number(r.refund_amount) || 0,
      status: r.status || 'Completed',
      receipt_url: r.receipt_url,
      receipt_filename: r.receipt_filename,
      remarks: r.remarks,
    }));

    const tgtItems: UnifiedTransactionItem[] = customerTargets.map((t) => ({
      id: `tgt_${t.id}`,
      date: t.target_date || (t.created_at ? t.created_at.split('T')[0] : '—'),
      type: 'target',
      voucher_no: `TGT-${String(t.id).slice(-5)}`,
      purpose: t.target_category || 'Target Package Fee',
      payment_method: t.payment_terms || 'Full Terms',
      bank_name: t.target_year ? `Year ${t.target_year}` : undefined,
      amount: Number(t.target_amount) || 0,
      status: t.status || 'In Progress',
      remarks: t.remarks,
    }));

    const cstItems: UnifiedTransactionItem[] = customerCosts.map((c) => ({
      id: `cst_${c.id}`,
      date: c.expense_date || (c.created_at ? c.created_at.split('T')[0] : '—'),
      type: 'cost',
      voucher_no: c.reference_no || `CST-${String(c.id).slice(-5)}`,
      purpose: c.expense_category || 'Operational Cost',
      payment_method: c.payment_method || c.payment_source || 'Expense Outflow',
      bank_name: c.payment_source,
      amount: Number(c.total_cost_amount) || 0,
      status: c.status || 'Incurred',
      remarks: c.remarks,
    }));

    return [...depItems, ...refItems, ...tgtItems, ...cstItems].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [selectedCustomerId, customerDeposits, customerRefunds, customerTargets, customerCosts]);

  // Filtered transactions based on activeTab, search, and date range
  const filteredTransactions = useMemo(() => {
    return customerTransactions.filter((item) => {
      if (activeTab === 'deposits' && item.type !== 'deposit') return false;
      if (activeTab === 'refunds' && item.type !== 'refund') return false;
      if (activeTab === 'targets' && item.type !== 'target') return false;
      if (activeTab === 'costs' && item.type !== 'cost') return false;

      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchVoucher = item.voucher_no.toLowerCase().includes(term);
        const matchPurpose = item.purpose.toLowerCase().includes(term);
        const matchMethod = item.payment_method.toLowerCase().includes(term);
        const matchBank = item.bank_name ? item.bank_name.toLowerCase().includes(term) : false;
        const matchRemarks = item.remarks ? item.remarks.toLowerCase().includes(term) : false;
        if (!matchVoucher && !matchPurpose && !matchMethod && !matchBank && !matchRemarks) return false;
      }

      return true;
    });
  }, [customerTransactions, activeTab, searchTerm, dateFrom, dateTo]);

  // Select2 Options for customer switcher
  const customerSelectOptions: Select2Option[] = useMemo(() => {
    return customers.map((c) => {
      const comp = companies.find((comp) => comp.id.toLowerCase() === c.company_id?.toLowerCase());
      const compName = comp?.name || c.other_company_name || 'Individual Worker';
      return {
        value: String(c.id),
        label: c.full_name,
        subLabel: `Passport: ${c.passport_no || '—'} • ${compName}`,
        badge: c.status,
      };
    });
  }, [customers, companies]);

  // Print Official Customer A4 Statement
  const handlePrintStatement = () => {
    if (!selectedCustomer) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = customerTransactions
      .map(
        (t, idx) => `
        <tr>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${t.date}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <span style="font-weight: 700; color: ${
              t.type === 'deposit'
                ? '#047857'
                : t.type === 'refund'
                ? '#be123c'
                : t.type === 'target'
                ? '#6b21a8'
                : '#334155'
            };">
              ${t.type === 'deposit' ? '+ DEPOSIT' : t.type === 'refund' ? '- REFUND' : t.type.toUpperCase()}
            </span>
          </td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-family: monospace;">${t.voucher_no}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${t.purpose}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${t.payment_method}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700; font-family: monospace; color: ${
            t.type === 'deposit' ? '#047857' : t.type === 'refund' ? '#be123c' : '#0f172a'
          };">
            ${t.type === 'deposit' ? '+' : t.type === 'refund' ? '-' : ''} RM ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Financial Statement - ${selectedCustomer.full_name}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
            .header { border-bottom: 3px solid #0b4da2; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 20px; font-weight: 800; color: #0b4da2; margin: 0; text-transform: uppercase; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
            .cust-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; }
            .balances-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
            .bal-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; text-align: center; }
            .bal-title { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .bal-amount { font-size: 14px; font-weight: 800; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .footer { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Official Customer Financial Ledger Statement</h1>
              <div class="subtitle">Agency Workforce Treasury &amp; Digital Ledger System</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div><strong>Generated by:</strong> Management Administrative Portal</div>
            </div>
          </div>

          <div class="cust-card">
            <table style="width: 100%; border: none; margin: 0;">
              <tr>
                <td style="width: 50%; vertical-align: top; font-size: 12px; line-height: 1.6;">
                  <div><strong>Customer Name:</strong> ${selectedCustomer.full_name}</div>
                  <div><strong>Passport Number:</strong> <span style="font-family: monospace; font-weight: 700;">${selectedCustomer.passport_no || '—'}</span></div>
                  <div><strong>National ID (NID):</strong> <span style="font-family: monospace;">${selectedCustomer.nid_no || '—'}</span></div>
                </td>
                <td style="width: 50%; vertical-align: top; font-size: 12px; line-height: 1.6; text-align: right;">
                  <div><strong>Employer Company:</strong> ${selectedCustomerCompany?.name || selectedCustomer.other_company_name || 'Individual Worker'}</div>
                  <div><strong>Working Sector:</strong> ${selectedCustomer.working_sector || 'General'}</div>
                  <div><strong>Status:</strong> <span style="text-transform: uppercase; font-weight: 700; color: #047857;">${selectedCustomer.status || 'Active'}</span></div>
                </td>
              </tr>
            </table>
          </div>

          <div class="balances-grid">
            <div class="bal-card" style="border-top: 3px solid #8b5cf6;">
              <div class="bal-title">Total Target Wallet</div>
              <div class="bal-amount" style="color: #6b21a8;">RM ${totalTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="bal-card" style="border-top: 3px solid #10b981;">
              <div class="bal-title">Total Deposit Wallet</div>
              <div class="bal-amount" style="color: #047857;">RM ${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="bal-card" style="border-top: 3px solid #f59e0b;">
              <div class="bal-title">Pending Balance Wallet</div>
              <div class="bal-amount" style="color: #b45309;">RM ${pendingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="bal-card" style="border-top: 3px solid #f43f5e;">
              <div class="bal-title">Refund Wallet</div>
              <div class="bal-amount" style="color: #be123c;">RM ${totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="bal-card" style="border-top: 3px solid #0b4da2;">
              <div class="bal-title">Total Profit Wallet</div>
              <div class="bal-amount" style="color: #0b4da2;">RM ${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 16px 0 6px 0; color: #0f172a;">Itemized Transaction Ledger</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 14%;">Date</th>
                <th style="width: 13%;">Type</th>
                <th style="width: 16%;">Voucher No</th>
                <th style="width: 24%;">Purpose / Category</th>
                <th style="width: 14%;">Method</th>
                <th style="width: 14%; text-align: right;">Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No transaction records available.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <span>This is an official system generated statement and does not require a physical signature.</span>
            <span>Foreign Workforce Ledger Portal • Confidential</span>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!selectedCustomer) return;
    if (customerTransactions.length === 0) {
      alert('No transaction records to export.');
      return;
    }

    const summaryRows = [
      ['CUSTOMER FINANCIAL WALLET STATEMENT'],
      ['Customer Name', selectedCustomer.full_name],
      ['Passport No', selectedCustomer.passport_no || '—'],
      ['Employer Company', selectedCustomerCompany?.name || selectedCustomer.other_company_name || 'Individual Worker'],
      ['Statement Date', new Date().toISOString().split('T')[0]],
      [''],
      ['WALLET SUMMARY'],
      ['Total Target Wallet (RM)', totalTarget],
      ['Total Deposit Wallet (RM)', totalDeposited],
      ['Pending Balance Wallet (RM)', pendingBalance],
      ['Refund Wallet (RM)', totalRefunded],
      ['Total Profit Wallet (RM)', totalProfit],
      [''],
      ['ITEMIZED TRANSACTIONS'],
      ['#', 'Date', 'Type', 'Voucher / Ref', 'Purpose / Category', 'Payment Method', 'Bank / Source', 'Amount (RM)', 'Status', 'Remarks'],
    ];

    const transactionRows = filteredTransactions.map((t, idx) => [
      idx + 1,
      t.date,
      t.type.toUpperCase(),
      t.voucher_no,
      t.purpose,
      t.payment_method,
      t.bank_name || '—',
      t.amount,
      t.status,
      t.remarks || '',
    ]);

    const fullExportData = [...summaryRows, ...transactionRows];
    const ws = XLSX.utils.aoa_to_sheet(fullExportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Wallet_Statement');
    XLSX.writeFile(
      wb,
      `wallet_statement_${selectedCustomer.passport_no || selectedCustomer.id}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Strip Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={defaultBackUrl}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors no-underline border border-slate-200 bg-white"
            title="Back to Customer List"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Link href={defaultBackUrl} className="hover:text-blue-600 transition-colors no-underline text-inherit">
                Foreign Customers
              </Link>
              <ChevronRight size={12} />
              <span>Customer Financial Wallet</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight m-0 truncate">
              Foreign Customer Financial Wallets &amp; Ledger
            </h1>
          </div>
        </div>

        {/* Top Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrintStatement}
            disabled={!selectedCustomer}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Print A4 Statement</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!selectedCustomer}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Customer Profile Banner & Quick Switcher */}
        <div className={`${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-2xl'} p-5 sm:p-6 shadow-xs relative z-30 !overflow-visible`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center font-bold text-xs shrink-0">
                  <Wallet size={18} />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight m-0">
                  Customer Financial Wallets Overview
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0b4da2]">
                  Target • Deposit • Pending • Refund • Profit
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0">
                Individual ledger record, verified deposit wallet, refund claims, and net retained margin balance.
              </p>
            </div>

            {/* Customer Switcher Select2 */}
            <div className="w-full sm:w-80 lg:w-96 shrink-0 relative z-40">
              <Select2Search
                options={customerSelectOptions}
                value={selectedCustomerId}
                onChange={(val) => {
                  setSelectedCustomerId(val);
                  router.replace(`?id=${val}`);
                }}
                placeholder="Search / Switch Customer..."
                searchPlaceholder="Search by name, passport, or company..."
                icon={<User size={15} className="text-[#0b4da2]" />}
                dropdownAlign="right"
              />
            </div>
          </div>

          {/* Selected Customer Profile Strip */}
          {selectedCustomer && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0b4da2]/10 text-[#0b4da2] flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
                  {selectedCustomer.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{selectedCustomer.full_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                      {selectedCustomer.status || 'Active'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span>
                      Passport: <strong className="font-mono text-slate-700">{selectedCustomer.passport_no || '—'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      NID: <strong className="font-mono text-slate-700">{selectedCustomer.nid_no || '—'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Employer:{' '}
                      <strong className="text-slate-700">
                        {selectedCustomerCompany?.name || selectedCustomer.other_company_name || 'Individual Worker'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  Sector: <strong>{selectedCustomer.working_sector || 'General'}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* THE 5 REQUIRED WALLET CARDS */}
        {/* 1. Total Target wallet */}
        {/* 2. Total deposit wallet */}
        {/* 3. Pending balance wallet */}
        {/* 4. refund wallet */}
        {/* 5. total profit wallet */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Target wallet */}
          <div
            onClick={() => setActiveTab('targets')}
            className={`admin-stat-card rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs ${
              isGlass
                ? `dashboard-card-glass ${activeTab === 'targets' ? 'ring-2 ring-purple-500' : ''}`
                : activeTab === 'targets'
                ? 'ring-2 ring-purple-500 bg-purple-50/50 border-purple-300'
                : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Target Wallet
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Target size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-700 font-mono tracking-tight">
              RM {totalTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{customerTargets.length} Packages</span>
              <span className="font-bold text-purple-700">Filter</span>
            </div>
          </div>

          {/* Card 2: Total deposit wallet */}
          <div
            onClick={() => setActiveTab('deposits')}
            className={`admin-stat-card rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs ${
              isGlass
                ? `dashboard-card-glass ${activeTab === 'deposits' ? 'ring-2 ring-emerald-500' : ''}`
                : activeTab === 'deposits'
                ? 'ring-2 ring-emerald-500 bg-emerald-50/50 border-emerald-300'
                : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Deposit Wallet
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ArrowDownLeft size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tracking-tight">
              RM {totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{customerDeposits.length} Deposits</span>
              <span className="font-bold text-emerald-700">Filter</span>
            </div>
          </div>

          {/* Card 3: Pending balance wallet */}
          <div
            onClick={() => setActiveTab('all')}
            className={`admin-stat-card rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs ${
              isGlass
                ? `dashboard-card-glass ${activeTab === 'all' ? 'ring-2 ring-amber-500' : ''}`
                : activeTab === 'all'
                ? 'ring-2 ring-amber-500 bg-amber-50/50 border-amber-300'
                : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Pending Balance Wallet
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono tracking-tight">
              RM {pendingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{totalTarget > totalDeposited ? 'Remaining Due' : 'Fully Paid'}</span>
              <span className="font-bold text-amber-700">All</span>
            </div>
          </div>

          {/* Card 4: refund wallet */}
          <div
            onClick={() => setActiveTab('refunds')}
            className={`admin-stat-card rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs ${
              isGlass
                ? `dashboard-card-glass ${activeTab === 'refunds' ? 'ring-2 ring-rose-500' : ''}`
                : activeTab === 'refunds'
                ? 'ring-2 ring-rose-500 bg-rose-50/50 border-rose-300'
                : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Refund Wallet
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono tracking-tight">
              RM {totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{customerRefunds.length} Refunds</span>
              <span className="font-bold text-rose-600">Filter</span>
            </div>
          </div>

          {/* Card 5: total profit wallet (NO "company profit" in card title as requested) */}
          <div
            onClick={() => setActiveTab('all')}
            className={`admin-stat-card rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs ${
              isGlass
                ? 'dashboard-card-glass hover:ring-2 hover:ring-blue-500'
                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Profit Wallet
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#0b4da2] font-mono tracking-tight">
              RM {totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Net Retained Margin</span>
              <span className="font-bold text-[#0b4da2]">Summary</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TRANSACTION LEDGER TABLE WITH FILTERS */}
        {/* ========================================================================= */}
        <div className={`${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-2xl'} shadow-xs overflow-hidden`}>
          {/* Table Header Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border-0 ${
                  activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({customerTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('deposits')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border-0 ${
                  activeTab === 'deposits' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deposits ({customerDeposits.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('refunds')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border-0 ${
                  activeTab === 'refunds' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Refunds ({customerRefunds.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('targets')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border-0 ${
                  activeTab === 'targets' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Targets ({customerTargets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('costs')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border-0 ${
                  activeTab === 'costs' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Costs ({customerCosts.length})
              </button>
            </div>

            {/* Search and Date Range Filter */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search voucher, purpose, bank..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-500">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none"
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none"
                />
              </div>

              {(searchTerm || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer border-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Voucher / Ref No</th>
                  <th className="py-3 px-4">Purpose / Category</th>
                  <th className="py-3 px-4">Payment Method / Bank</th>
                  <th className="py-3 px-4 text-right">Amount (RM)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      {loading
                        ? 'Loading financial ledger data...'
                        : 'No financial transaction records found for this customer.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => {
                    const isDep = tx.type === 'deposit';
                    const isRef = tx.type === 'refund';
                    const isTgt = tx.type === 'target';
                    const isCst = tx.type === 'cost';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{tx.date}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isDep
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRef
                                ? 'bg-rose-100 text-rose-800'
                                : isTgt
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isDep
                              ? '+ DEPOSIT'
                              : isRef
                              ? '- REFUND'
                              : isTgt
                              ? 'TARGET'
                              : 'EXPENSE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{tx.voucher_no}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{tx.purpose}</div>
                          {tx.remarks && <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">{tx.remarks}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{tx.payment_method}</div>
                          {tx.bank_name && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">{tx.bank_name}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-sm">
                          <span
                            className={
                              isDep
                                ? 'text-emerald-700'
                                : isRef
                                ? 'text-rose-600'
                                : isTgt
                                ? 'text-purple-700'
                                : 'text-slate-700'
                            }
                          >
                            {isDep ? '+' : isRef ? '-' : ''} RM {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {tx.receipt_url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDocument({
                                  url: tx.receipt_url!,
                                  title: `Voucher Document - ${tx.voucher_no}`,
                                  filename: tx.receipt_filename,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0b4da2] font-semibold text-[11px] transition-colors cursor-pointer border border-blue-200"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300 font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Slip Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="text-xs font-bold truncate max-w-md">{previewDocument.title}</span>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-0"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center bg-slate-50 min-h-[300px]">
              {previewDocument.url.startsWith('data:application/pdf') || previewDocument.url.endsWith('.pdf') ? (
                <iframe
                  src={previewDocument.url}
                  className="w-full h-[500px] border-0 rounded-lg shadow-xs"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={getFileUrl(previewDocument.url)}
                  alt="Receipt Document"
                  className="max-w-full max-h-[550px] object-contain rounded-lg shadow-sm border border-slate-200"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerFinancialLedgerPage(props: CustomerFinancialLedgerPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 font-semibold text-sm">
          Loading Customer Financial Wallets &amp; Ledger...
        </div>
      }
    >
      <CustomerFinancialLedgerContent {...props} />
    </Suspense>
  );
}
