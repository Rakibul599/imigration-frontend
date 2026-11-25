'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Wallet,
  DollarSign,
  RotateCcw,
  Printer,
  FileCheck2,
  FileText,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  User,
  ShieldCheck,
  Eye,
  X,
  Plus,
  RefreshCw,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
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
  CustomerDepositAmountRecord,
  CustomerRefundAmountRecord,
  getStoredCustomerDeposits,
  fetchCustomerDeposits,
  getStoredCustomerRefunds,
  fetchCustomerRefunds,
  REFUND_PURPOSES,
  getCustomerFinanceBalance,
} from '@/lib/customerFinanceStorage';
import { useDashboardCardDesign } from '@/lib/themeSettings';

interface LedgerTransactionItem {
  id: string | number;
  date: string;
  type: 'deposit' | 'refund';
  receipt_no: string;
  purpose: string;
  payment_method: string;
  bank_name?: string;
  bank_account_no?: string;
  amount: number;
  status: string;
  receipt_url?: string;
  receipt_filename?: string;
  remarks?: string;
}

function CustomerPanelContent() {
  const searchParams = useSearchParams();
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';

  // Data states
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deposits, setDeposits] = useState<CustomerDepositAmountRecord[]>([]);
  const [refunds, setRefunds] = useState<CustomerRefundAmountRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Table filter and active tab
  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'refunds'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Document preview modal
  const [previewDocument, setPreviewDocument] = useState<{ url: string; title: string; filename?: string } | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3800);
  };

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, compList, depList, refList] = await Promise.all([
        fetchCustomersFromBackend().catch(() => getStoredCustomers()),
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
        fetchCustomerDeposits().catch(() => getStoredCustomerDeposits()),
        fetchCustomerRefunds().catch(() => getStoredCustomerRefunds()),
      ]);

      setCustomers(custList || []);
      setCompanies(compList || []);
      setDeposits(depList || []);
      setRefunds(refList || []);

      // If URL param specified customer passport, id, or company, auto select
      const paramPassport = searchParams.get('passport');
      const paramId = searchParams.get('id');
      const paramCompany = searchParams.get('company');

      if (paramPassport && custList) {
        const found = custList.find((c) => c.passport_no?.toLowerCase() === paramPassport.toLowerCase());
        if (found) setSelectedCustomerId(String(found.id));
      } else if (paramId && custList) {
        const found = custList.find((c) => String(c.id) === String(paramId));
        if (found) setSelectedCustomerId(String(found.id));
      } else if (paramCompany && custList) {
        const compWorkers = custList.filter(
          (c) =>
            c.company_id?.toLowerCase() === paramCompany.toLowerCase() ||
            c.other_company_name?.toLowerCase() === paramCompany.toLowerCase()
        );
        if (compWorkers.length > 0) {
          setSelectedCustomerId(String(compWorkers[0].id));
        } else if (custList.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(String(custList[0].id));
        }
      } else if (custList && custList.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(String(custList[0].id));
      }
    } catch (err) {
      console.error('Failed to load customer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDepositsUpdate = () => {
      setDeposits(getStoredCustomerDeposits());
    };
    const handleRefundsUpdate = () => {
      setRefunds(getStoredCustomerRefunds());
    };

    window.addEventListener('customerDepositsUpdated', handleDepositsUpdate);
    window.addEventListener('customerRefundsUpdated', handleRefundsUpdate);
    return () => {
      window.removeEventListener('customerDepositsUpdated', handleDepositsUpdate);
      window.removeEventListener('customerRefundsUpdated', handleRefundsUpdate);
    };
  }, []);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  // Employer company of selected customer
  const selectedCustomerCompany = useMemo(() => {
    if (!selectedCustomer) return null;
    return companies.find((c) => c.id.toLowerCase() === selectedCustomer.company_id?.toLowerCase()) || null;
  }, [companies, selectedCustomer]);

  // Financial balance for selected customer
  const customerBalance = useMemo(() => {
    if (!selectedCustomerId) {
      return { total_deposited: 0, total_refunded: 0, net_balance: 0, deposits_count: 0, refunds_count: 0 };
    }
    const cIdStr = String(selectedCustomerId);
    const custDeposits = deposits.filter((d) => String(d.customer_id) === cIdStr);
    const custRefunds = refunds.filter((r) => String(r.customer_id) === cIdStr);

    const total_deposited = custDeposits.reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);
    const total_refunded = custRefunds.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);
    const net_balance = total_deposited - total_refunded;

    return {
      total_deposited,
      total_refunded,
      net_balance,
      deposits_count: custDeposits.length,
      refunds_count: custRefunds.length,
    };
  }, [selectedCustomerId, deposits, refunds]);

  // Combined ledger transactions for selected customer
  const customerTransactions: LedgerTransactionItem[] = useMemo(() => {
    if (!selectedCustomerId) return [];
    const cIdStr = String(selectedCustomerId);

    const depItems: LedgerTransactionItem[] = deposits
      .filter((d) => String(d.customer_id) === cIdStr)
      .map((d) => ({
        id: `dep_${d.id}`,
        date: d.deposit_date || (d.created_at ? d.created_at.split('T')[0] : '—'),
        type: 'deposit',
        receipt_no: d.receipt_no || `DEP-${String(d.id).slice(-5)}`,
        purpose: d.purpose || 'Deposit Payment',
        payment_method: d.payment_method || 'Bank Transfer',
        bank_name: d.bank_name,
        bank_account_no: undefined,
        amount: Number(d.deposit_amount) || 0,
        status: d.verification_status || 'Verified',
        receipt_url: d.receipt_url,
        receipt_filename: d.receipt_filename,
        remarks: d.remarks,
      }));

    const refItems: LedgerTransactionItem[] = refunds
      .filter((r) => String(r.customer_id) === cIdStr)
      .map((r) => ({
        id: `ref_${r.id}`,
        date: r.refund_date || (r.created_at ? r.created_at.split('T')[0] : '—'),
        type: 'refund',
        receipt_no: r.receipt_no || `REF-${String(r.id).slice(-5)}`,
        purpose: r.purpose || 'Refund Disbursement',
        payment_method: r.payment_method || 'Bank Transfer',
        bank_name: r.bank_name,
        bank_account_no: r.bank_account_no,
        amount: Number(r.refund_amount) || 0,
        status: r.status || 'Completed',
        receipt_url: r.receipt_url,
        receipt_filename: r.receipt_filename,
        remarks: r.remarks,
      }));

    return [...depItems, ...refItems].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [selectedCustomerId, deposits, refunds]);

  // Filtered transactions based on tab and filters
  const filteredTransactions = useMemo(() => {
    return customerTransactions.filter((item) => {
      if (activeTab === 'deposits' && item.type !== 'deposit') return false;
      if (activeTab === 'refunds' && item.type !== 'refund') return false;

      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchRef = item.receipt_no.toLowerCase().includes(term);
        const matchPurpose = item.purpose.toLowerCase().includes(term);
        const matchMethod = item.payment_method.toLowerCase().includes(term);
        const matchBank = item.bank_name ? item.bank_name.toLowerCase().includes(term) : false;
        if (!matchRef && !matchPurpose && !matchMethod && !matchBank) return false;
      }

      return true;
    });
  }, [customerTransactions, activeTab, searchTerm, dateFrom, dateTo]);

  // Select2 Options for customer lookup
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

  // Print Official Customer Statement
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
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${t.date}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <span style="font-weight: 700; color: ${t.type === 'deposit' ? '#047857' : '#be123c'};">
              ${t.type === 'deposit' ? '+ DEPOSIT' : '- REFUND'}
            </span>
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-family: monospace;">${t.receipt_no}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${t.purpose}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${t.payment_method}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700; font-family: monospace; color: ${t.type === 'deposit' ? '#047857' : '#be123c'};">
            ${t.type === 'deposit' ? '+' : '-'} RM ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            @page { size: A4; margin: 18mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
            .header { border-bottom: 3px solid #0b4da2; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 22px; font-weight: 800; color: #0b4da2; margin: 0; text-transform: uppercase; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 3px; }
            .cust-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
            .balances-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 24px; }
            .bal-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; text-align: center; }
            .bal-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
            .bal-val { font-size: 20px; font-weight: 800; font-family: monospace; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #0b4da2; color: white; padding: 8px 10px; font-size: 11px; text-align: left; text-transform: uppercase; }
            .footer-sig { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-line { border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; font-size: 11px; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Official Customer Financial Statement</h1>
              <div class="subtitle">Agency Worker Treasury &amp; Biometric Ledger Record</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div>Date Generated: <strong>${new Date().toLocaleDateString()}</strong></div>
              <div>Passport: <strong>${selectedCustomer.passport_no || '—'}</strong></div>
            </div>
          </div>

          <div class="cust-card">
            <div style="font-size: 16px; font-weight: 800; color: #1e293b;">${selectedCustomer.full_name}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
              Passport No: <strong>${selectedCustomer.passport_no || '—'}</strong> • NID: <strong>${selectedCustomer.nid_no || '—'}</strong>
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              Employer: <strong>${selectedCustomerCompany?.name || selectedCustomer.other_company_name || 'Individual Worker'}</strong> • Sector: <strong>${selectedCustomer.working_sector || 'General'}</strong>
            </div>
          </div>

          <div class="balances-grid">
            <div class="bal-card" style="background: #f0fdf4; border-color: #bbf7d0;">
              <div class="bal-label" style="color: #166534;">Total Deposits</div>
              <div class="bal-val" style="color: #15803d;">RM ${customerBalance.total_deposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="bal-card" style="background: #fff1f2; border-color: #fecdd3;">
              <div class="bal-label" style="color: #9f1239;">Total Refunds</div>
              <div class="bal-val" style="color: #be123c;">RM ${customerBalance.total_refunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="bal-card" style="background: #eff6ff; border-color: #bfdbfe;">
              <div class="bal-label" style="color: #1e40af;">Net Active Balance</div>
              <div class="bal-val" style="color: #1d4ed8;">RM ${customerBalance.net_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0b4da2; margin-bottom: 6px;">
            Transaction Ledger History (${customerTransactions.length} Records)
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Purpose</th>
                <th>Payment Mode</th>
                <th style="text-align: right;">Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-sig">
            <div>
              <div style="height: 50px;"></div>
              <div class="sig-line">Prepared By (Agency Accounts Officer)</div>
            </div>
            <div>
              <div style="height: 50px;"></div>
              <div class="sig-line">Acknowledged By (Customer / Beneficiary)</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!selectedCustomer || filteredTransactions.length === 0) {
      showToast('info', 'No transaction records to export.');
      return;
    }
    const exportRows = filteredTransactions.map((t, i) => ({
      '#': i + 1,
      'Date': t.date,
      'Type': t.type === 'deposit' ? 'DEPOSIT' : 'REFUND',
      'Voucher / Receipt': t.receipt_no,
      'Customer Name': selectedCustomer.full_name,
      'Passport No': selectedCustomer.passport_no || '—',
      'Purpose': t.purpose,
      'Payment Mode': t.payment_method,
      'Bank': t.bank_name || '—',
      'Account No': t.bank_account_no || '—',
      'Amount (RM)': t.amount,
      'Status': t.status,
      'Remarks': t.remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Worker_Transactions');
    XLSX.writeFile(
      wb,
      `worker_statement_${selectedCustomer.passport_no || selectedCustomer.id}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('success', 'Excel statement exported successfully.');
  };

  const companyQueryParam = searchParams.get('company');

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans overflow-x-hidden">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 1. Official Portal Top Strip */}
      <div className="top-strip z-50">
        <span>Official Worker &amp; Customer Financial Portal • Foreign Workforce Digital Ledger</span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Portal Version: 2.4.0 (Connected)</span>
          {companyQueryParam && (
            <Link
              href={`/services?company=${encodeURIComponent(companyQueryParam)}`}
              className="inline-flex items-center gap-1 text-amber-300 hover:text-white font-bold transition-colors no-underline text-xs"
            >
              <ArrowLeft size={12} />
              <span>Back to Employer Services</span>
            </Link>
          )}
          <Link
            href="/companies"
            className="inline-flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors no-underline text-xs"
          >
            <Building2 size={12} />
            <span>Switch Company</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors no-underline text-xs"
          >
            <span>Home</span>
          </Link>
        </div>
      </div>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header with Quick Action Controls */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Link href="/" className="hover:text-blue-600 transition-colors no-underline text-inherit">
                  Home
                </Link>
                <ChevronRight size={12} />
                <span>Worker Financial Portal</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight m-0 truncate">
                Customer &amp; Worker Financial Portal
              </h1>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {companyQueryParam && (
              <Link
                href={`/services?company=${encodeURIComponent(companyQueryParam)}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors no-underline whitespace-nowrap"
              >
                <ArrowLeft size={13} />
                <span>Employer Services</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handlePrintStatement}
              disabled={!selectedCustomer}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Printer size={13} />
              <span>Print Statement</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!selectedCustomer}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Main Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Header Banner & Customer Selector */}
            <div className={`${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-2xl'} p-5 sm:p-6 shadow-xs`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center font-bold text-xs shrink-0">
                      <Wallet size={18} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight m-0">
                      Customer Financial Portal
                    </h2>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0b4da2]">
                      Deposit &amp; Refund Ledger
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 m-0">
                    Real-time deposit and refund balances, ledger statements, and refund voucher submissions.
                  </p>
                </div>

                {/* Worker Quick Select2 Searcher */}
                <div className="w-full sm:w-80 lg:w-96 shrink-0">
                  <Select2Search
                    options={customerSelectOptions}
                    value={selectedCustomerId}
                    onChange={(val) => setSelectedCustomerId(val)}
                    placeholder="Search / Switch Worker..."
                    searchPlaceholder="Search by name, passport, or company..."
                    icon={<User size={15} className="text-[#0b4da2]" />}
                  />
                </div>
              </div>

              {/* Selected Customer Profile Summary Strip */}
              {selectedCustomer && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0b4da2]/10 text-[#0b4da2] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
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

            {/* Top 3 Financial Stat Cards (Interactive: Clicking switches ledger tabs) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Total Customer Deposit */}
              <div
                onClick={() => setActiveTab('deposits')}
                className={`admin-stat-card rounded-2xl p-5 border transition-all cursor-pointer shadow-xs ${
                  isGlass
                    ? `dashboard-card-glass ${activeTab === 'deposits' ? 'ring-2 ring-emerald-500' : ''}`
                    : activeTab === 'deposits'
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/50 border-emerald-300'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Customer Deposit
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                  RM {customerBalance.total_deposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{customerBalance.deposits_count} Verified Deposits</span>
                  <span className="font-bold text-emerald-700">Click to filter</span>
                </div>
              </div>

              {/* Card 2: Customer Refund Amount */}
              <div
                onClick={() => setActiveTab('refunds')}
                className={`admin-stat-card rounded-2xl p-5 border transition-all cursor-pointer shadow-xs ${
                  isGlass
                    ? `dashboard-card-glass ${activeTab === 'refunds' ? 'ring-2 ring-rose-500' : ''}`
                    : activeTab === 'refunds'
                    ? 'ring-2 ring-rose-500 bg-rose-50/50 border-rose-300'
                    : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Customer Refund Amount
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                    <RotateCcw size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-600 font-mono tracking-tight">
                  RM {customerBalance.total_refunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{customerBalance.refunds_count} Refund Claims</span>
                  <span className="font-bold text-rose-600">Click to filter</span>
                </div>
              </div>

              {/* Card 3: Net Active Balance */}
              <div
                onClick={() => setActiveTab('all')}
                className={`admin-stat-card rounded-2xl p-5 border transition-all cursor-pointer shadow-xs ${
                  isGlass
                    ? `dashboard-card-glass ${activeTab === 'all' ? 'ring-2 ring-blue-500' : ''}`
                    : activeTab === 'all'
                    ? 'ring-2 ring-blue-500 bg-blue-50/50 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Net Active Balance
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#0b4da2] font-mono tracking-tight">
                  RM {customerBalance.net_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Total Available Balance</span>
                  <span className="font-bold text-[#0b4da2]">All Records</span>
                </div>
              </div>
            </div>

            {/* Transaction Ledger Table Section */}
            <div className={`${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-2xl'} shadow-xs overflow-hidden`}>
              {/* Ledger Tab Navigation & Filters */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs shrink-0">
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
                    Deposits ({customerBalance.deposits_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('refunds')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border-0 ${
                      activeTab === 'refunds' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Refunds ({customerBalance.refunds_count})
                  </button>
                </div>

                {/* Search & Date Filter Controls */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="relative flex-1 sm:w-56">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search voucher, purpose..."
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

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Voucher No</th>
                      <th className="py-3 px-4">Purpose / Category</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount (RM)</th>
                      <th className="py-3 px-4 text-center">Slip Document</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                          No transactions found for the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx, idx) => {
                        const isDep = tx.type === 'deposit';
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-4 font-semibold text-slate-700">{tx.date}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDep ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isDep ? '+ DEPOSIT' : '- REFUND'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">{tx.receipt_no}</td>
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
                              <span className={isDep ? 'text-emerald-700' : 'text-rose-600'}>
                                {isDep ? '+' : '-'} RM {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {tx.receipt_url ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewDocument({
                                      url: tx.receipt_url!,
                                      title: `Slip Voucher ${tx.receipt_no}`,
                                      filename: tx.receipt_filename,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0b4da2] font-semibold text-[11px] transition-colors cursor-pointer border border-blue-200"
                                >
                                  <Eye size={12} />
                                  <span>View Slip</span>
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
        </div>

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

export default function CustomerPanelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c1a30] flex items-center justify-center text-white font-semibold">
          Loading Worker Financial Portal...
        </div>
      }
    >
      <CustomerPanelContent />
    </Suspense>
  );
}
