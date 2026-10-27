'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileCheck,
  Plus,
  Receipt,
  Upload,
  Users,
  X,
} from 'lucide-react';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  CustomerRecord,
  getStoredCustomers,
  fetchCustomersFromBackend,
} from '@/lib/customerStorage';
import {
  getStoredCompanies,
  fetchCompaniesFromBackend,
} from '@/lib/companyStorage';
import { Company, resolveFileUrl } from '@/lib/companies';
import {
  CustomerDepositAmountRecord,
  getStoredCustomerDeposits,
  fetchCustomerDeposits,
  saveCustomerDeposit,
  getCustomerFinanceBalance,
  CustomerFinanceBalance,
  getStoredCustomerTargets,
  getStoredCustomerPendings,
  getFileUrl,
} from '@/lib/customerFinanceStorage';

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
  'Other / Cash CDM',
];

export default function SuperadminCustomerDepositAmountPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [records, setRecords] = useState<CustomerDepositAmountRecord[]>([]);
  // Selected customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState<number | ''>(1200);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formMethod, setFormMethod] = useState<typeof PAYMENT_METHODS[number]>('Bank Transfer');
  const [formBank, setFormBank] = useState(MALAYSIAN_BANKS[0]);
  const [formDepositedBy, setFormDepositedBy] = useState('');
  const [formReceiptNo, setFormReceiptNo] = useState('');
  const [formPurpose, setFormPurpose] = useState('Passport Copy & Clearance Document');
  const [formReceiptUrl, setFormReceiptUrl] = useState<string | null>(null);
  const [formReceiptFilename, setFormReceiptFilename] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Payment Success' | 'Payment Pending'>('Payment Success');
  const [formRemarks, setFormRemarks] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  useEffect(() => {
    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) setCustomers(list);
    }).catch(() => {});

    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((compList) => {
      if (Array.isArray(compList) && compList.length > 0) setCompanies(compList);
    }).catch(() => {});

    setRecords(getStoredCustomerDeposits());
    fetchCustomerDeposits().then((list) => {
      if (Array.isArray(list) && list.length > 0) setRecords(list);
    }).catch(() => {});

    const handler = () => {
      setRecords(getStoredCustomerDeposits());
    };
    window.addEventListener('customerDepositsUpdated', handler);
    window.addEventListener('customerTargetsUpdated', handler);
    window.addEventListener('customerPendingsUpdated', handler);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cid = params.get('customerId');
      const amt = params.get('amount');
      if (cid) setSelectedCustomerId(cid);
      if (amt && Number(amt) > 0) setFormAmount(Number(amt));
    }

    return () => {
      window.removeEventListener('customerDepositsUpdated', handler);
      window.removeEventListener('customerTargetsUpdated', handler);
      window.removeEventListener('customerPendingsUpdated', handler);
    };
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  // Find company of selected customer
  const companyInfo = useMemo(() => {
    if (!selectedCustomer) return null;
    const compId = selectedCustomer.company_id;
    if (!compId) return null;
    return companies.find((c) => String(c.id) === String(compId) || c.name.toLowerCase() === compId.toLowerCase()) || null;
  }, [companies, selectedCustomer]);

  // Auto-fill Reference with Agent Name & Deposited By with Customer Name
  useEffect(() => {
    if (selectedCustomer && !editingId) {
      const agentVal = selectedCustomer.agent_name || selectedCustomer.agent_id || '';
      setFormReceiptNo(agentVal);
      if (!formDepositedBy) {
        setFormDepositedBy(selectedCustomer.full_name);
      }
    }
  }, [selectedCustomer, editingId]);

  const customerOptions: Select2Option[] = useMemo(() => {
    return customers.map((c) => ({
      value: String(c.id),
      label: c.full_name,
      subLabel: `${c.passport_no || 'No Passport'} • ${c.company_id || 'Individual'}`,
      badge: c.working_sector || c.status,
    }));
  }, [customers]);

  // Customer Financial Balance calculation
  const customerBalance: CustomerFinanceBalance | null = useMemo(() => {
    if (!selectedCustomerId) return null;
    return getCustomerFinanceBalance(selectedCustomerId);
  }, [selectedCustomerId, records]);

  // Overall financial totals
  const overallTotals = useMemo(() => {
    const allTargets = getStoredCustomerTargets().reduce((acc, t) => acc + (Number(t.target_amount) || 0), 0);
    const allDeposits = records.reduce((acc, r) => acc + (Number(r.deposit_amount) || 0), 0);
    const allPendings = getStoredCustomerPendings().reduce((acc, p) => acc + (Number(p.pending_amount) || 0), 0);
    return {
      target: allTargets,
      deposited: allDeposits,
      balanced: allDeposits,
      remaining: allPendings > 0 ? allPendings : Math.max(0, allTargets - allDeposits),
    };
  }, [records]);

  // Top 4 KPI values (either for selected customer or all)
  const kpiData = useMemo(() => {
    if (customerBalance && selectedCustomer) {
      return {
        target: customerBalance.total_target,
        deposited: customerBalance.total_deposited,
        balanced: customerBalance.total_deposited,
        remaining: customerBalance.net_pending,
      };
    }
    return overallTotals;
  }, [customerBalance, selectedCustomer, overallTotals]);

  // Deposit calculation preview during typing
  const depositCalculationPreview = useMemo(() => {
    if (!customerBalance) return null;
    const inputAmount = Number(formAmount) || 0;
    const targetAmount = customerBalance.total_target;
    const editingRecord = editingId ? records.find((r) => r.id === editingId) : null;
    const oldAmount = editingRecord ? Number(editingRecord.deposit_amount) || 0 : 0;
    const baseDeposited = Math.max(0, customerBalance.total_deposited - oldAmount);
    const newTotalDeposited = baseDeposited + inputAmount;
    const remainingPending = Math.max(0, targetAmount - newTotalDeposited);

    return {
      targetAmount,
      baseDeposited,
      inputAmount,
      newTotalDeposited,
      remainingPending,
      hasTarget: targetAmount > 0,
    };
  }, [customerBalance, formAmount, editingId, records]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormReceiptFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFormReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedCustomer) {
      showToast('info', 'Please select a customer.');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      showToast('info', 'Please enter a valid deposit amount.');
      return;
    }
    if (!formBank.trim()) {
      showToast('info', 'Please enter a bank name.');
      return;
    }
    if (!formDepositedBy.trim()) {
      showToast('info', 'Please specify who deposited the payment.');
      return;
    }

    const targetSnapshot = depositCalculationPreview?.targetAmount || 0;
    const remainingPendingSnapshot = depositCalculationPreview?.remainingPending !== undefined
      ? depositCalculationPreview.remainingPending
      : Math.max(0, targetSnapshot - Number(formAmount));

    const newRecord: CustomerDepositAmountRecord = {
      id: editingId || `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.full_name,
      passport_no: selectedCustomer.passport_no,
      nid_no: selectedCustomer.nid_no,
      company_id: selectedCustomer.company_id,
      company_name: companyInfo?.name || selectedCustomer.company_id,
      deposit_amount: Number(formAmount),
      target_amount: targetSnapshot,
      remaining_pending: remainingPendingSnapshot,
      deposit_date: formDate,
      payment_method: formMethod,
      bank_name: formBank.trim(),
      receipt_no: formReceiptNo.trim(),
      deposited_by: formDepositedBy.trim(),
      purpose: formPurpose,
      receipt_url: formReceiptUrl || undefined,
      receipt_filename: formReceiptFilename || undefined,
      verification_status: formStatus,
      remarks: formRemarks.trim(),
      created_at: editingId
        ? records.find((r) => r.id === editingId)?.created_at || new Date().toISOString()
        : new Date().toISOString(),
    };

    await saveCustomerDeposit(newRecord);
    showToast(
      'success',
      editingId
        ? `Deposit record for "${selectedCustomer.full_name}" updated successfully.`
        : `Deposit of RM ${Number(formAmount).toLocaleString()} recorded successfully.`
    );

    setEditingId(null);
    setFormAmount(1200);
    setFormReceiptUrl(null);
    setFormReceiptFilename('');
    setFormRemarks('');
  };

  const customerSpecificHistoryCount = useMemo(() => {
    if (!selectedCustomerId) return records.length;
    return records.filter((r) => String(r.customer_id) === String(selectedCustomerId)).length;
  }, [records, selectedCustomerId]);

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 text-xs animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-3 text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. TOP CUSTOMER SELECTION & COMPANY/CUSTOMER IDENTITY BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="w-full md:w-96">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Users size={14} className="text-emerald-600" />
              <span>Select Customer <span className="text-red-500">*</span></span>
            </label>
            <Select2Search
              options={customerOptions}
              value={selectedCustomerId}
              onChange={(val) => {
                setSelectedCustomerId(val);
                const cust = customers.find((c) => String(c.id) === String(val));
                if (cust) {
                  setFormReceiptNo(cust.agent_name || cust.agent_id || '');
                  setFormDepositedBy(cust.full_name);
                }
              }}
              placeholder="Search by customer name, passport number, NID..."
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={selectedCustomerId ? `/superadmin/customers/deposit-amount/history?customerId=${selectedCustomerId}` : '/superadmin/customers/deposit-amount/history'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors no-underline"
            >
              <Receipt size={14} />
              <span>Previous Payment History ({customerSpecificHistoryCount})</span>
            </Link>

            <Link
              href="/superadmin/customers"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors no-underline"
            >
              <Users size={14} />
              <span>Customer List</span>
            </Link>
          </div>
        </div>

        {/* Left Side: Company Name & Logo | Right Side: Customer Pic & Name */}
        {selectedCustomer ? (
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-slate-50/90 via-white to-emerald-50/40 border border-slate-200/90 flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 shadow-2xs">
            {/* Left side: Company Logo on Top, Name Underneath */}
            <div className="flex flex-col items-center text-center max-w-[240px]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-2 overflow-hidden transition-all hover:shadow-xs">
                {companyInfo?.logo ? (
                  <img
                    src={resolveFileUrl(companyInfo.logo)}
                    alt={companyInfo.name || 'Company'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 size={32} className="text-indigo-600" />
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">
                Employer / Company
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 m-0 mt-0.5 leading-snug">
                {companyInfo?.name || selectedCustomer.company_id || selectedCustomer.other_company_name || 'Direct Employer'}
              </h3>
              <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full mt-1">
                {companyInfo?.sector || selectedCustomer.working_sector || 'Corporate'}
              </div>
            </div>

            {/* Divider in between on larger screens */}
            <div className="hidden sm:block h-16 w-px bg-slate-200" />

            {/* Right side: Customer Pic on Top, Name Underneath */}
            <div className="flex flex-col items-center text-center max-w-[240px]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border-2 border-emerald-500/30 shadow-2xs flex items-center justify-center p-0.5 overflow-hidden transition-all hover:shadow-xs">
                {selectedCustomer.profile_image || selectedCustomer.profile_pic ? (
                  <img
                    src={getFileUrl(selectedCustomer.profile_image || selectedCustomer.profile_pic)}
                    alt={selectedCustomer.full_name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-inner">
                    {selectedCustomer.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">
                Customer / Worker
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 m-0 mt-0.5 leading-snug">
                {selectedCustomer.full_name}
              </h3>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                <span>Passport: {selectedCustomer.passport_no || 'N/A'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
            Select a customer above to view company details and customer profile.
          </div>
        )}
      </div>

      {/* 2. TOP 4 KPI CARDS: Total Target, Total Deposit, Total Balanced, Total Remaining */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Target Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Target Amount
            </span>
            <div className="text-2xl font-black text-blue-900 mt-0.5 font-mono">
              RM {kpiData.target.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-blue-600 font-medium">Agreed target goal</div>
          </div>
        </div>

        {/* Card 2: Total Deposit Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Deposit Amount
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
              RM {kpiData.deposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Total received</div>
          </div>
        </div>

        {/* Card 3: Total Balanced Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <CreditCard size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Balanced Amount
            </span>
            <div className="text-2xl font-black text-indigo-900 mt-0.5 font-mono">
              RM {kpiData.balanced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium">Settled ledger balance</div>
          </div>
        </div>

        {/* Card 4: Total Remaining Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Remaining Amount
            </span>
            <div className="text-2xl font-black text-amber-800 mt-0.5 font-mono">
              RM {kpiData.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-amber-600 font-medium">Pending dues left</div>
          </div>
        </div>
      </div>

      {/* 3. PREVIOUS PAYMENT HISTORY CARD (Clicking opens dedicated history page) */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-white to-slate-50/70 border border-indigo-100 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Receipt size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 m-0">Previous Payment History</h3>
              {customerSpecificHistoryCount > 0 && (
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {customerSpecificHistoryCount} records
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              {selectedCustomer
                ? `Click to view all past payment receipts, ledger records, and statement archives for ${selectedCustomer.full_name}`
                : 'Click to open the separate payment history page with full search and multi-criteria filters'}
            </p>
          </div>
        </div>

        <Link
          href={selectedCustomerId ? `/superadmin/customers/deposit-amount/history?customerId=${selectedCustomerId}` : '/superadmin/customers/deposit-amount/history'}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 no-underline"
        >
          <Receipt size={14} />
          <span>View Payment History</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* 4. FORM: RECORD CUSTOMER DEPOSIT */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Plus size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  {editingId ? 'Edit Deposit Record' : 'Record Customer Deposit'}
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  Enter deposit amount, bank name, payment document purpose, and voucher slip.
                </p>
              </div>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormAmount(1200);
                  setFormRemarks('');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Grid 1: Amount, Date, Purpose, Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Deposit Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposit Amount (RM) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">RM</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1200.00"
                    className="w-full pl-10 pr-3 py-2 text-xs font-bold font-mono border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                  />
                </div>
              </div>

              {/* 2. Deposit Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposit Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-mono"
                />
              </div>

              {/* 3. Payment Purpose: Document Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Purpose (Document) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-medium"
                >
                  {selectedCustomer?.documents && selectedCustomer.documents.length > 0 && (
                    <optgroup label="Customer Profile Documents">
                      {selectedCustomer.documents.map((d, i) => (
                        <option key={i} value={d.name}>
                          {d.name} {d.service_name ? `[${d.service_name}]` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Standard Documents & Fees">
                    <option value="Passport Copy & Clearance Document">Passport Copy & Clearance Document</option>
                    <option value="Immigration Levi Quota Document">Immigration Levi Quota Document</option>
                    <option value="Calling Visa & Stamping Document">Calling Visa & Stamping Document</option>
                    <option value="FOMEMA Medical Examination Report">FOMEMA Medical Examination Report</option>
                    <option value="Foreign Worker Insurance & Bond">Foreign Worker Insurance & Bond</option>
                    <option value="Work Permit Renewal Document">Work Permit Renewal Document</option>
                    <option value="Airport Clearance & Logistics">Airport Clearance & Logistics</option>
                    <option value="General Account Balance Deposit">General Account Balance Deposit</option>
                  </optgroup>
                </select>
              </div>

              {/* 4. Payment Method - Positioned AFTER Payment Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-semibold"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 5. Deposit Bank Name - ONLY TEXT INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposit Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formBank}
                  onChange={(e) => setFormBank(e.target.value)}
                  placeholder="e.g. Maybank, CIMB Bank, Public Bank..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-medium text-slate-900"
                />
              </div>

              {/* 6. Deposited By (Name) - Positioned immediately after Bank Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposited By (Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formDepositedBy}
                  onChange={(e) => setFormDepositedBy(e.target.value)}
                  placeholder="e.g. Self, Sponsor, or Depositor Name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                />
              </div>

              {/* 7. Reference No (Auto Agent Name) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reference No (Agent Name)
                </label>
                <input
                  type="text"
                  value={formReceiptNo}
                  onChange={(e) => setFormReceiptNo(e.target.value)}
                  placeholder="Auto-filled with Agent Name or enter Ref"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                />
              </div>

              {/* 8. Status: 2 Options (Payment Success, Payment Pending) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-semibold"
                >
                  <option value="Payment Success">Payment Success</option>
                  <option value="Payment Pending">Payment Pending</option>
                </select>
              </div>
            </div>

            {/* Grid 2: Bank Slip Upload (span 2) & Remarks / Notes (span 2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Slip Upload */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Bank Slip / Voucher Upload
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer transition-colors shrink-0">
                    <Upload size={13} className="text-emerald-600" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {formReceiptFilename ? (
                    <span className="text-xs text-emerald-700 font-semibold truncate flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <FileCheck size={14} className="shrink-0 text-emerald-600" />
                      <span className="truncate">{formReceiptFilename}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No voucher attached (optional)</span>
                  )}
                </div>
              </div>

              {/* Remarks / Notes - Cohesive & Aligned */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. Transaction details, online transfer notes..."
                  className="w-full h-[38px] px-3 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {selectedCustomer && (
                  <span>
                    Customer: <strong className="text-slate-800">{selectedCustomer.full_name}</strong> |
                    Target: <strong className="text-blue-900 font-mono">RM {depositCalculationPreview?.targetAmount.toLocaleString()}</strong> |
                    Pending Left: <strong className="text-amber-800 font-mono">RM {depositCalculationPreview?.remainingPending.toLocaleString()}</strong>
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer border-0"
              >
                <CheckCircle2 size={15} />
                <span>{editingId ? 'Update Deposit Entry' : 'Record Customer Deposit'}</span>
              </button>
            </div>
          </form>
        </div>
    </div>
  );
}
