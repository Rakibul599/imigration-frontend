'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  RotateCcw,
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileCheck2,
  FileSpreadsheet,
  Plus,
  Receipt,
  Users,
  X,
  Printer,
  Eye,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  CustomerRecord,
  getStoredCustomers,
  fetchCustomersFromBackend,
  getFileUrl,
} from '@/lib/customerStorage';
import {
  getStoredCompanies,
  fetchCompaniesFromBackend,
} from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import {
  CustomerRefundAmountRecord,
  CustomerDepositAmountRecord,
  getStoredCustomerRefunds,
  fetchCustomerRefunds,
  getStoredCustomerDeposits,
  fetchCustomerDeposits,
  saveCustomerRefund,
  deleteCustomerRefund,
  getCustomerFinanceBalance,
  CustomerFinanceBalance,
  REFUND_PURPOSES,
} from '@/lib/customerFinanceStorage';
import { ProgramRecord, fetchPrograms, getStoredPrograms } from '@/lib/programStorage';
import { useDashboardCardDesign } from '@/lib/themeSettings';

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Cash',
  'CDM',
  'Cheque',
  'Online FPX',
  'Direct Debit',
] as const;

const MALAYSIAN_BANKS = [
  'Maybank (Malayan Banking Berhad)',
  'CIMB Bank',
  'Public Bank Berhad',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam',
  'Touch n Go eWallet / DuitNow',
  'Cash Counter',
  'Other / Direct CDM',
];

export default function CustomerRefundAmountPage() {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [records, setRecords] = useState<CustomerRefundAmountRecord[]>([]);
  const [deposits, setDeposits] = useState<CustomerDepositAmountRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
  const [voucherToPrint, setVoucherToPrint] = useState<CustomerRefundAmountRecord | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formMethod, setFormMethod] = useState<string>('Bank Transfer');
  const [formBank, setFormBank] = useState<string>('Maybank (Malayan Banking Berhad)');
  const [formAccountNo, setFormAccountNo] = useState<string>('');
  const [formReceiptNo, setFormReceiptNo] = useState<string>(() => `REF-${Date.now().toString().slice(-6)}`);
  const [formPurpose, setFormPurpose] = useState<string>('Visa Application Rejected');
  const [formCustomPurpose, setFormCustomPurpose] = useState<string>('');
  const [formReceiptUrl, setFormReceiptUrl] = useState<string | null>(null);
  const [formReceiptFilename, setFormReceiptFilename] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('Completed');
  const [formRemarks, setFormRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterCustomer, setFilterCustomer] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, compList, progList, refList, depList] = await Promise.all([
        fetchCustomersFromBackend().catch(() => getStoredCustomers()),
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
        fetchPrograms().catch(() => getStoredPrograms()),
        fetchCustomerRefunds().catch(() => getStoredCustomerRefunds()),
        fetchCustomerDeposits().catch(() => getStoredCustomerDeposits()),
      ]);
      setCustomers(custList || []);
      setCompanies(compList || []);
      setPrograms(progList || []);
      setRecords(refList || []);
      setDeposits(depList || []);
    } catch (err) {
      console.error('Failed to load refund page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      setRecords(getStoredCustomerRefunds());
      setDeposits(getStoredCustomerDeposits());
    };
    window.addEventListener('customerRefundsUpdated', handleUpdate);
    window.addEventListener('customerDepositsUpdated', handleUpdate);
    return () => {
      window.removeEventListener('customerRefundsUpdated', handleUpdate);
      window.removeEventListener('customerDepositsUpdated', handleUpdate);
    };
  }, []);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  const customerBalance: CustomerFinanceBalance | null = useMemo(() => {
    if (!selectedCustomerId) return null;
    return getCustomerFinanceBalance(selectedCustomerId);
  }, [selectedCustomerId, records, deposits]);

  // Select2 Options for Customer selection inside Form Modal
  const customerFormSelectOptions: Select2Option[] = useMemo(() => {
    return [
      { value: '', label: 'Select Customer...', subLabel: 'Search by worker name, passport, or company' },
      ...customers.map((c) => {
        const comp = companies.find((comp) => comp.id.toLowerCase() === c.company_id?.toLowerCase());
        const compName = comp?.name || c.other_company_name || 'Individual Worker';
        return {
          value: String(c.id),
          label: c.full_name,
          subLabel: `Passport: ${c.passport_no || '—'} • ${compName}`,
          badge: c.status,
        };
      }),
    ];
  }, [customers, companies]);

  // Select2 Options for Company Filtering in the table
  const companyFilterOptions: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Companies', subLabel: `${companies.length} Registered Companies` },
      ...companies.map((comp) => {
        const count = records.filter((r) => r.company_id?.toLowerCase() === comp.id.toLowerCase()).length;
        return {
          value: comp.id,
          label: comp.name,
          subLabel: `${count} Refund Vouchers`,
        };
      }),
    ];
  }, [companies, records]);

  // Select2 Options for Customer Filtering in the table
  const customerFilterOptions: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Customers', subLabel: `${customers.length} Workers` },
      ...customers.map((c) => {
        const comp = companies.find((comp) => comp.id.toLowerCase() === c.company_id?.toLowerCase());
        const compName = comp?.name || c.other_company_name || 'Individual';
        return {
          value: String(c.id),
          label: c.full_name,
          subLabel: `Passport: ${c.passport_no || '—'} • ${compName}`,
        };
      }),
    ];
  }, [customers, companies]);

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setSelectedCustomerId('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMethod('Bank Transfer');
    setFormBank('Maybank (Malayan Banking Berhad)');
    setFormAccountNo('');
    setFormReceiptNo(`REF-${Date.now().toString().slice(-6)}`);
    setFormPurpose('Visa Application Rejected');
    setFormCustomPurpose('');
    setFormReceiptUrl(null);
    setFormReceiptFilename('');
    setFormStatus('Completed');
    setFormRemarks('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File size exceeds 5MB limit.');
      return;
    }

    setFormReceiptFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormReceiptUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      showToast('error', 'Please select a customer.');
      return;
    }

    const amt = Number(formAmount);
    if (!amt || amt <= 0) {
      showToast('error', 'Please enter a valid refund amount.');
      return;
    }

    const cust = customers.find((c) => String(c.id) === String(selectedCustomerId));
    if (!cust) {
      showToast('error', 'Customer not found.');
      return;
    }

    const comp = companies.find((c) => c.id.toLowerCase() === cust.company_id?.toLowerCase());
    const finalPurpose = formPurpose === 'Other' ? (formCustomPurpose.trim() || 'Other Adjustment') : formPurpose;

    setIsSubmitting(true);
    try {
      const recordToSave: CustomerRefundAmountRecord = {
        id: editingId || `ref_${Date.now()}`,
        customer_id: cust.id,
        customer_name: cust.full_name,
        passport_no: cust.passport_no || undefined,
        nid_no: cust.nid_no || undefined,
        company_id: cust.company_id || undefined,
        company_name: comp?.name || cust.other_company_name || 'Individual Worker',
        program_id: cust.program_id ? String(cust.program_id) : undefined,
        working_sector: cust.working_sector || undefined,
        refund_amount: amt,
        refund_date: formDate,
        payment_method: formMethod,
        bank_name: formBank,
        bank_account_no: formAccountNo.trim() || undefined,
        receipt_no: formReceiptNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
        purpose: finalPurpose,
        refunded_by: 'Super Administrator',
        receipt_url: formReceiptUrl || undefined,
        receipt_filename: formReceiptFilename || undefined,
        status: formStatus,
        remarks: formRemarks.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      const updated = await saveCustomerRefund(recordToSave);
      setRecords(updated);
      showToast('success', editingId ? 'Refund record updated successfully.' : 'Refund voucher issued successfully.');
      setIsFormModalOpen(false);
      resetForm();

      setVoucherToPrint(recordToSave);
    } catch (err) {
      console.error('Error saving customer refund:', err);
      showToast('error', 'Failed to save customer refund voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (r: CustomerRefundAmountRecord) => {
    setEditingId(r.id);
    setSelectedCustomerId(String(r.customer_id));
    setFormAmount(r.refund_amount);
    setFormDate(r.refund_date);
    setFormMethod(r.payment_method);
    setFormBank(r.bank_name || 'Maybank (Malayan Banking Berhad)');
    setFormAccountNo(r.bank_account_no || '');
    setFormReceiptNo(r.receipt_no || '');
    if (REFUND_PURPOSES.includes(r.purpose as any)) {
      setFormPurpose(r.purpose);
      setFormCustomPurpose('');
    } else {
      setFormPurpose('Other');
      setFormCustomPurpose(r.purpose);
    }
    setFormReceiptUrl(r.receipt_url || null);
    setFormReceiptFilename(r.receipt_filename || '');
    setFormStatus(r.status);
    setFormRemarks(r.remarks || '');
    setIsFormModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const updated = await deleteCustomerRefund(deleteConfirmId);
      setRecords(updated);
      showToast('info', 'Customer refund record deleted.');
    } catch {
      showToast('error', 'Failed to delete record.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handlePrintVoucher = (r: CustomerRefundAmountRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Refund Voucher - ${r.receipt_no}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; margin: 0; }
            .header { border-bottom: 3px solid #0b4da2; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 24px; font-weight: 800; color: #0b4da2; margin: 0; text-transform: uppercase; }
            .amount-box { background: #fff1f2; border: 2px solid #fecdd3; border-radius: 10px; padding: 18px; margin: 20px 0; text-align: center; }
            .amount-val { font-size: 32px; font-weight: 800; color: #e11d48; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #0b4da2; color: white; padding: 10px; text-align: left; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .signatures { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-line { border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Customer Refund Voucher</h1>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Disbursement Receipt</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <div>Voucher No: <strong style="color: #0f172a;">${r.receipt_no}</strong></div>
              <div>Date: <strong style="color: #0f172a;">${r.refund_date}</strong></div>
            </div>
          </div>
          <div class="amount-box">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #9f1239;">Refund Amount</div>
            <div class="amount-val">RM ${(Number(r.refund_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer / Worker</th>
                <th>Passport No</th>
                <th>Purpose</th>
                <th>Payment Method</th>
                <th style="text-align: right;">Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${r.customer_name}</strong><div style="font-size: 11px; color: #64748b;">${r.company_name || 'Individual Worker'}</div></td>
                <td style="font-family: monospace;">${r.passport_no || '—'}</td>
                <td>${r.purpose}${r.remarks ? `<div style="font-size: 11px; color: #64748b;">Note: ${r.remarks}</div>` : ''}</td>
                <td>${r.payment_method}${r.bank_name ? ` (${r.bank_name})` : ''}</td>
                <td style="text-align: right; font-weight: 700; font-family: monospace;">RM ${(Number(r.refund_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          <div class="signatures">
            <div><div style="height: 50px;"></div><div class="sig-line">Authorized Officer</div></div>
            <div><div style="height: 50px;"></div><div class="sig-line">Recipient Signature</div></div>
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

  // Filtered Records calculation
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterCompany !== 'ALL' && r.company_id && r.company_id.toLowerCase() !== filterCompany.toLowerCase()) {
        return false;
      }
      if (filterCustomer !== 'ALL' && String(r.customer_id) !== String(filterCustomer)) {
        return false;
      }
      if (filterDateFrom && r.refund_date < filterDateFrom) {
        return false;
      }
      if (filterDateTo && r.refund_date > filterDateTo) {
        return false;
      }
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase().trim();
        const mName = r.customer_name?.toLowerCase().includes(s);
        const mPass = r.passport_no ? r.passport_no.toLowerCase().includes(s) : false;
        const mRef = r.receipt_no ? r.receipt_no.toLowerCase().includes(s) : false;
        const mPur = r.purpose?.toLowerCase().includes(s);
        const mBank = r.bank_name ? r.bank_name.toLowerCase().includes(s) : false;
        const mComp = r.company_name ? r.company_name.toLowerCase().includes(s) : false;
        if (!mName && !mPass && !mRef && !mPur && !mBank && !mComp) return false;
      }
      return true;
    });
  }, [records, filterCompany, filterCustomer, filterDateFrom, filterDateTo, searchTerm]);

  // Financial summary metrics
  const totalDepositAmount = useMemo(() => {
    return deposits
      .filter((d) => {
        if (filterCompany !== 'ALL' && d.company_id && d.company_id.toLowerCase() !== filterCompany.toLowerCase()) return false;
        if (filterCustomer !== 'ALL' && String(d.customer_id) !== String(filterCustomer)) return false;
        return true;
      })
      .reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);
  }, [deposits, filterCompany, filterCustomer]);

  const totalRefundAmount = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);
  }, [filteredRecords]);

  const totalBalanceAmount = useMemo(() => {
    return Math.max(0, totalDepositAmount - totalRefundAmount);
  }, [totalDepositAmount, totalRefundAmount]);

  const hasActiveFilters = Boolean(
    searchTerm || filterCompany !== 'ALL' || filterCustomer !== 'ALL' || filterDateFrom || filterDateTo
  );

  const resetAllFilters = () => {
    setSearchTerm('');
    setFilterCompany('ALL');
    setFilterCustomer('ALL');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      showToast('info', 'No records to export.');
      return;
    }

    const exportRows = filteredRecords.map((r, i) => ({
      '#': i + 1,
      'Voucher No': r.receipt_no || '',
      'Date': r.refund_date,
      'Customer Name': r.customer_name,
      'Passport No': r.passport_no || '—',
      'Company': r.company_name || 'Individual Worker',
      'Purpose': r.purpose,
      'Payment Method': r.payment_method,
      'Bank Name': r.bank_name || '',
      'Account No': r.bank_account_no || '',
      'Amount (RM)': Number(r.refund_amount) || 0,
      'Status': r.status,
      'Remarks': r.remarks || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer_Refunds');
    XLSX.writeFile(wb, `customer_refunds_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('success', 'Excel file exported.');
  };

  return (
    <div className="space-y-5 max-w-full min-w-0">
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

      {/* 1. Header Bar: Single Row, No Wrapping */}
      <div className={`${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-xl'} p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
            <RotateCcw size={18} />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight m-0 truncate">
            Customer Refund Amount
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/superadmin/customers/panel"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer no-underline whitespace-nowrap"
          >
            <Wallet size={14} />
            <span>Worker Panel</span>
          </Link>
          <Link
            href="/superadmin/customers/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer no-underline whitespace-nowrap"
          >
            <ArrowRight size={14} className="rotate-180" />
            <span>Customer Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer border-0 whitespace-nowrap"
          >
            <Plus size={15} />
            <span>Issue Customer Refund</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards: Deposit followed directly by Refund */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Customer Deposit Amount */}
        <div className={`admin-stat-card ${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-xl'} p-5 shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Customer Deposit Amount
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="font-bold tracking-tight font-mono text-2xl text-emerald-600 my-1">
            RM {totalDepositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 2: Customer Refund Amount (Directly after Deposit) */}
        <div className={`admin-stat-card ${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-xl'} p-5 shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Customer Refund Amount
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
              <RotateCcw size={18} />
            </div>
          </div>
          <div className="font-bold tracking-tight font-mono text-2xl text-rose-600 my-1">
            RM {totalRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 3: Customer Balance Amount */}
        <div className={`admin-stat-card ${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-xl'} p-5 shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Customer Balance Amount
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Wallet size={18} />
            </div>
          </div>
          <div className="font-bold tracking-tight font-mono text-2xl text-[#0b4da2] my-1">
            RM {totalBalanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Card 4: Total Refund Vouchers */}
        <div className={`admin-stat-card ${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-xl'} p-5 shadow-xs flex flex-col justify-between`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Total Refund Vouchers
            </span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Receipt size={18} />
            </div>
          </div>
          <div className="font-bold tracking-tight font-mono text-2xl text-slate-800 my-1">
            {filteredRecords.length}
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className={`${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-xl'} p-4 sm:p-5 shadow-xs space-y-3`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Company Filter (Select2) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Company
            </label>
            <Select2Search
              options={companyFilterOptions}
              value={filterCompany}
              onChange={(val) => setFilterCompany(val)}
              placeholder="All Companies"
              searchPlaceholder="Search company..."
              icon={<Building2 size={13} className="text-[#0b4da2]" />}
            />
          </div>

          {/* Customer Filter (Select2) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Customer
            </label>
            <Select2Search
              options={customerFilterOptions}
              value={filterCustomer}
              onChange={(val) => setFilterCustomer(val)}
              placeholder="All Customers"
              searchPlaceholder="Search customer..."
              icon={<Users size={13} className="text-[#0b4da2]" />}
            />
          </div>

          {/* Date Range: From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date Range: To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, passport number, voucher REF, or bank..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Refund List Table */}
      <div className={`${isGlass ? 'dashboard-card-glass rounded-2xl' : 'bg-white border border-slate-200 rounded-xl'} shadow-xs overflow-hidden`}>
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Customer Refund List ({filteredRecords.length})
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0b4da2] text-white text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Passport No</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-center">Slip</th>
                <th className="py-3 px-4 text-right">Amount (RM)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <RotateCcw size={22} />
                      </div>
                      <div className="text-sm font-bold text-slate-700">No Refund Records</div>
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0b4da2] text-white hover:bg-blue-700 transition-colors cursor-pointer border-0"
                      >
                        <Plus size={14} />
                        <span>Issue Refund</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {r.refund_date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.customer_name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {r.passport_no || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {r.company_name || 'Individual Worker'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-[#0b4da2] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {r.receipt_no || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{r.purpose}</div>
                      {r.remarks && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {r.remarks}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{r.payment_method}</div>
                      {r.bank_name && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {r.bank_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {r.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ url: r.receipt_url!, title: `${r.receipt_no} - ${r.customer_name}` })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-[#0b4da2] hover:bg-blue-50 border border-blue-200 bg-transparent cursor-pointer transition-colors"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap text-sm">
                      RM {Number(r.refund_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {r.status || 'Completed'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintVoucher(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors cursor-pointer border-0 bg-transparent"
                          title="Print Voucher"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer border-0 bg-transparent"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(r.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                          title="Delete"
                        >
                          <Trash2 size={15} />
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

      {/* 5. REFUND FORM MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <RotateCcw size={18} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight m-0">
                  {editingId ? 'Edit Customer Refund' : 'Issue Customer Refund'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <form id="refund-modal-form" onSubmit={handleSave} className="space-y-4">
                {/* Customer Selection with Select2Search */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  <Select2Search
                    options={customerFormSelectOptions}
                    value={selectedCustomerId}
                    onChange={(val) => setSelectedCustomerId(val)}
                    placeholder="Select Customer..."
                    searchPlaceholder="Type name or passport..."
                    icon={<Users size={14} className="text-[#0b4da2]" />}
                  />
                </div>

                {/* Customer Financial Balance Card */}
                {selectedCustomer && customerBalance && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Customer Balance:</span>
                      <span className="font-mono text-slate-500">
                        Passport: {selectedCustomer.passport_no || '—'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Deposited</div>
                        <div className="text-xs font-bold text-emerald-600 font-mono mt-0.5">
                          RM {customerBalance.total_deposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Refunded</div>
                        <div className="text-xs font-bold text-rose-600 font-mono mt-0.5">
                          RM {(customerBalance.total_refunded || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="bg-white border border-emerald-300 rounded-lg p-2.5 text-center bg-emerald-50/50">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase">Available</div>
                        <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                          RM {(customerBalance.net_balance !== undefined ? customerBalance.net_balance : customerBalance.total_deposited).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    {(customerBalance.net_balance ?? customerBalance.total_deposited) > 0 && (
                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const avail = customerBalance.net_balance ?? customerBalance.total_deposited;
                            if (avail > 0) setFormAmount(avail);
                          }}
                          className="text-[11px] font-bold text-[#0b4da2] hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-0 p-0"
                        >
                          + Use Full Balance (RM {(customerBalance.net_balance ?? customerBalance.total_deposited).toLocaleString()})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount and Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Refund Amount (RM) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-slate-400">
                        RM
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Purpose / Reason <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {REFUND_PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="Other">Other Adjustment / Custom Reason</option>
                  </select>

                  {formPurpose === 'Other' && (
                    <input
                      type="text"
                      value={formCustomPurpose}
                      onChange={(e) => setFormCustomPurpose(e.target.value)}
                      placeholder="Specify reason..."
                      className="mt-2 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>

                {/* Payment Method & Bank Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formMethod}
                      onChange={(e) => setFormMethod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Bank Name
                    </label>
                    <select
                      value={formBank}
                      onChange={(e) => setFormBank(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {MALAYSIAN_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bank Account No & Voucher Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Account No / Ref
                    </label>
                    <input
                      type="text"
                      value={formAccountNo}
                      onChange={(e) => setFormAccountNo(e.target.value)}
                      placeholder="Account or transaction reference..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Voucher Reference No
                    </label>
                    <input
                      type="text"
                      value={formReceiptNo}
                      onChange={(e) => setFormReceiptNo(e.target.value)}
                      placeholder="REF-XXXXXX"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Attach Slip */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Attach Slip / Receipt
                  </label>
                  <div className="relative border border-dashed border-slate-300 rounded-lg p-3 flex items-center justify-between gap-2 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Upload slip"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 size={18} className="text-[#0b4da2] shrink-0" />
                      <span className="text-xs text-slate-600 truncate">
                        {formReceiptFilename || 'Upload slip / receipt...'}
                      </span>
                    </div>
                    {formReceiptUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormReceiptUrl(null);
                          setFormReceiptFilename('');
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold p-1 z-10 cursor-pointer bg-transparent border-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="Notes..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="refund-modal-form"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0b4da2] hover:bg-blue-700 transition-colors shadow-xs cursor-pointer border-0 disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                <span>{editingId ? 'Update Refund' : 'Save Refund'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="text-xs font-bold truncate max-w-md">{previewDoc.title}</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-0"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center bg-slate-50 min-h-[300px]">
              {previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.endsWith('.pdf') ? (
                <iframe src={previewDoc.url} className="w-full h-[500px] border-0 rounded-lg" title="PDF Preview" />
              ) : (
                <img
                  src={getFileUrl(previewDoc.url)}
                  alt="Slip Preview"
                  className="max-w-full max-h-[550px] object-contain rounded-lg shadow-sm border border-slate-200"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Print Voucher Prompt Modal */}
      {voucherToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Voucher Issued</h3>
              <p className="text-xs text-slate-500 mt-1 m-0">
                Voucher <strong className="font-mono text-slate-800">{voucherToPrint.receipt_no}</strong> for{' '}
                <strong className="text-rose-600 font-mono">
                  RM {(Number(voucherToPrint.refund_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>{' '}
                has been processed for <strong>{voucherToPrint.customer_name}</strong>.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoucherToPrint(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-0"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = voucherToPrint;
                  setVoucherToPrint(null);
                  handlePrintVoucher(v);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0b4da2] hover:bg-blue-700 transition-colors cursor-pointer border-0 shadow-xs"
              >
                <Printer size={14} />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Delete Refund Voucher?</h3>
              <p className="text-xs text-slate-500 mt-1 m-0">
                Are you sure you want to delete this refund voucher?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer border-0 shadow-xs"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
