'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  FileCheck,
  FileText,
  Filter,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  CustomerRecord,
  getStoredCustomers,
  fetchCustomersFromBackend,
} from '@/lib/customerStorage';
import {
  CustomerDepositAmountRecord,
  getStoredCustomerDeposits,
  fetchCustomerDeposits,
  saveCustomerDeposit,
  deleteCustomerDeposit,
  getCustomerFinanceBalance,
  CustomerFinanceBalance,
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

const DEPOSIT_PURPOSES = [
  'Levi Quota Deposit',
  'Visa Processing Advance',
  'FOMEMA Medical Payment',
  'Work Permit Renewal Deposit',
  'Security Bond & Insurance',
  'Flight & Transportation Fee',
  'General Account Balance Deposit',
];

const MALAYSIAN_BANKS = [
  'Maybank (Malayan Banking Berhad)',
  'CIMB Bank',
  'Public Bank Berhad',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam',
  'Other / Direct Cash CDM',
];

export default function CustomerDepositAmountPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [records, setRecords] = useState<CustomerDepositAmountRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState<number | ''>(1200);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formMethod, setFormMethod] = useState<typeof PAYMENT_METHODS[number]>('Bank Transfer');
  const [formBank, setFormBank] = useState(MALAYSIAN_BANKS[0]);
  const [formReceiptNo, setFormReceiptNo] = useState(`REC-${Date.now().toString().slice(-6)}`);
  const [formDepositedBy, setFormDepositedBy] = useState('');
  const [formDepositorPhone, setFormDepositorPhone] = useState('');
  const [formPurpose, setFormPurpose] = useState(DEPOSIT_PURPOSES[0]);
  const [formReceiptUrl, setFormReceiptUrl] = useState<string | null>(null);
  const [formReceiptFilename, setFormReceiptFilename] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Verified' | 'Pending Verification' | 'Reconciled'>('Verified');
  const [formRemarks, setFormRemarks] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) setCustomers(list);
    }).catch(() => {});

    setRecords(getStoredCustomerDeposits());
    fetchCustomerDeposits().then((list) => {
      if (Array.isArray(list) && list.length > 0) setRecords(list);
    }).catch(() => {});

    const handler = () => setRecords(getStoredCustomerDeposits());
    window.addEventListener('customerDepositsUpdated', handler);
    window.addEventListener('customerTargetsUpdated', handler);
    window.addEventListener('customerPendingsUpdated', handler);
    // Read URL query params for pre-selected customer from pending-amount page
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cid = params.get('customerId');
      const amt = params.get('amount');
      if (cid) {
        setSelectedCustomerId(cid);
      }
      if (amt && Number(amt) > 0) {
        setFormAmount(Number(amt));
      }
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

  const customerOptions: Select2Option[] = useMemo(() => {
    return customers.map((c) => ({
      value: String(c.id),
      label: c.full_name,
      subLabel: `${c.passport_no || 'No Passport'} • ${c.company_id || 'Individual'}`,
      badge: c.working_sector || c.status,
    }));
  }, [customers]);

  // Customer Financial Balance & Dynamic Calculation Preview
  const customerBalance: CustomerFinanceBalance | null = useMemo(() => {
    if (!selectedCustomerId) return null;
    return getCustomerFinanceBalance(selectedCustomerId);
  }, [selectedCustomerId, records]);

  const depositCalculationPreview = useMemo(() => {
    if (!customerBalance) return null;
    const inputAmount = Number(formAmount) || 0;
    const targetAmount = customerBalance.total_target;
    const editingRecord = editingId ? records.find((r) => r.id === editingId) : null;
    const oldAmount = editingRecord ? Number(editingRecord.deposit_amount) || 0 : 0;
    const baseDeposited = Math.max(0, customerBalance.total_deposited - oldAmount);
    const newTotalDeposited = baseDeposited + inputAmount;
    const remainingPending = Math.max(0, targetAmount - newTotalDeposited);
    const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((newTotalDeposited / targetAmount) * 100)) : 0;

    return {
      targetAmount,
      baseDeposited,
      inputAmount,
      newTotalDeposited,
      remainingPending,
      progressPercent,
      isFullySettled: targetAmount > 0 && remainingPending === 0,
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
      company_name: selectedCustomer.company_id,
      deposit_amount: Number(formAmount),
      target_amount: targetSnapshot,
      remaining_pending: remainingPendingSnapshot,
      deposit_date: formDate,
      payment_method: formMethod,
      bank_name: formBank,
      receipt_no: formReceiptNo.trim(),
      deposited_by: formDepositedBy.trim() || selectedCustomer.full_name,
      depositor_phone: formDepositorPhone.trim() || selectedCustomer.phone || '',
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
        ? `Deposit record for "${selectedCustomer.full_name}" updated in database!`
        : `Deposit of RM ${Number(formAmount).toLocaleString()} saved to database & receipt stored successfully!`
    );

    // Reset
    setEditingId(null);
    setFormAmount(1200);
    setFormReceiptNo(`REC-${Date.now().toString().slice(-6)}`);
    setFormReceiptUrl(null);
    setFormReceiptFilename('');
    setFormRemarks('');
  };

  const handleEdit = (r: CustomerDepositAmountRecord) => {
    setEditingId(String(r.id));
    setSelectedCustomerId(String(r.customer_id));
    setFormAmount(r.deposit_amount);
    setFormDate(r.deposit_date);
    setFormMethod(r.payment_method);
    setFormBank(r.bank_name || MALAYSIAN_BANKS[0]);
    setFormReceiptNo(r.receipt_no || '');
    setFormDepositedBy(r.deposited_by || '');
    setFormDepositorPhone(r.depositor_phone || '');
    setFormPurpose(r.purpose);
    setFormReceiptUrl(r.receipt_url || null);
    setFormReceiptFilename(r.receipt_filename || '');
    setFormStatus(r.verification_status);
    setFormRemarks(r.remarks || '');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDelete = async (id: string | number) => {
    await deleteCustomerDeposit(id);
    setDeleteConfirmId(null);
    showToast('info', 'Deposit entry removed from database.');
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchTerm ||
        r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.passport_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receipt_no?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMethod = filterMethod === 'ALL' || r.payment_method === filterMethod;
      const matchStatus = filterStatus === 'ALL' || r.verification_status === filterStatus;
      return matchSearch && matchMethod && matchStatus;
    });
  }, [records, searchTerm, filterMethod, filterStatus]);

  const totalDeposits = records.reduce((acc, r) => acc + (r.deposit_amount || 0), 0);
  const verifiedCount = records.filter((r) => r.verification_status === 'Verified').length;
  const pendingCount = records.filter((r) => r.verification_status === 'Pending Verification').length;

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Toast */}
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

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
                <DollarSign size={12} className="text-emerald-600" />
                Customer Finance Hub
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">Deposit Ledger</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight m-0">
              Customer Deposit Amount Management
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed m-0">
              Record, reconcile, and verify inbound customer deposits, bank transfer slips, and cash vouchers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/superadmin/customers/target-amount"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-[#0b4da2] border border-blue-200 transition-colors no-underline"
            >
              <span>← Target Amount</span>
            </Link>
            <Link
              href="/superadmin/customers/pending-amount"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors no-underline"
            >
              <span>Pending Amount →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Deposits Received
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
              RM {totalDeposits.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">{records.length} deposits recorded</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Verified &amp; Cleared
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              {verifiedCount}
            </div>
            <div className="text-[10px] text-blue-600 font-medium">Bank slips authenticated</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Receipt size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Verification
            </span>
            <div className="text-2xl font-black text-amber-700 mt-0.5 font-mono">
              {pendingCount}
            </div>
            <div className="text-[10px] text-amber-600 font-medium">Awaiting bank statement match</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Average Deposit
            </span>
            <div className="text-2xl font-black text-purple-700 mt-0.5 font-mono">
              RM {records.length > 0 ? Math.round(totalDeposits / records.length).toLocaleString() : '0'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Per inbound payment</div>
          </div>
        </div>
      </div>

      {/* FORM: Record Deposit */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                {editingId ? 'Edit Deposit Record' : 'Record Inbound Customer Deposit'}
              </h2>
              <p className="text-xs text-slate-500 m-0">
                Enter payment amount, bank information, transaction slip, and purpose.
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Customer / Worker <span className="text-red-500">*</span>
              </label>
              <Select2Search
                options={customerOptions}
                value={selectedCustomerId}
                onChange={(val) => setSelectedCustomerId(val)}
                placeholder="Search by customer name, passport number, NID..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Customer &amp; Financial Ledger Balance
              </label>
              {selectedCustomer ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        {selectedCustomer.full_name}
                      </span>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5 font-mono">
                        <span>Passport: {selectedCustomer.passport_no || 'N/A'}</span>
                        <span>•</span>
                        <span>Company: {selectedCustomer.company_id || 'Direct'}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      customerBalance?.status === 'Settled'
                        ? 'bg-emerald-100 text-emerald-800'
                        : customerBalance?.status === 'Partially Paid'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {customerBalance?.status || selectedCustomer.status}
                    </span>
                  </div>

                  {/* Financial balance breakdown */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 font-mono text-center">
                    <div className="bg-blue-50/70 p-1.5 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-blue-700 block uppercase font-bold">Target</span>
                      <span className="font-black text-blue-900 text-xs">
                        RM {customerBalance ? customerBalance.total_target.toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 block uppercase font-bold">Deposited</span>
                      <span className="font-black text-emerald-900 text-xs">
                        RM {customerBalance ? customerBalance.total_deposited.toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-100">
                      <span className="text-[10px] text-amber-700 block uppercase font-bold">Pending Dues</span>
                      <span className="font-black text-amber-900 text-xs">
                        RM {customerBalance ? customerBalance.net_pending.toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                  Select a customer to view target, deposited, and remaining pending balances.
                </div>
              )}
            </div>
          </div>

          {/* Payment Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Deposit Amount (MYR) <span className="text-red-500">*</span>
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
                  className="w-full pl-10 pr-3 py-2 text-xs font-bold font-mono border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Deposit Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Method
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Deposit Destination Bank
              </label>
              <select
                value={formBank}
                onChange={(e) => setFormBank(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              >
                {MALAYSIAN_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference & Depositor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Receipt / Reference No.
              </label>
              <input
                type="text"
                value={formReceiptNo}
                onChange={(e) => setFormReceiptNo(e.target.value)}
                placeholder="e.g. REC-982341"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Purpose
              </label>
              <select
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              >
                {DEPOSIT_PURPOSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Deposited By (Name)
              </label>
              <input
                type="text"
                value={formDepositedBy}
                onChange={(e) => setFormDepositedBy(e.target.value)}
                placeholder="e.g. Self, Sponsor, or Agent"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Verification Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-semibold"
              >
                <option value="Verified">Verified &amp; Cleared</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Reconciled">Reconciled</option>
              </select>
            </div>
          </div>

          {/* DYNAMIC CALCULATION PREVIEW BANNER: Target - Deposit = Pending */}
          {depositCalculationPreview && selectedCustomer && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-indigo-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Live Balance Calculation: Target − Deposit = Pending
                  </span>
                </div>
                {depositCalculationPreview.hasTarget ? (
                  <span className="text-[11px] font-bold text-blue-700">
                    Payment Progress: {depositCalculationPreview.progressPercent}%
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    ⚠️ No Target set yet for this customer
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white/90 p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Target Amount</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-blue-900">
                    RM {depositCalculationPreview.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-white/90 p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">This Deposit (+)</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-700">
                    RM {depositCalculationPreview.inputAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-white/90 p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Deposited</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-900">
                    RM {depositCalculationPreview.newTotalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className={`p-2 rounded-lg border ${depositCalculationPreview.remainingPending === 0 && depositCalculationPreview.hasTarget ? 'bg-emerald-100 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
                  <span className="text-[10px] font-bold text-slate-600 block uppercase">Remaining Pending (−)</span>
                  <span className={`text-xs sm:text-sm font-black font-mono ${depositCalculationPreview.remainingPending === 0 && depositCalculationPreview.hasTarget ? 'text-emerald-700' : 'text-amber-800'}`}>
                    RM {depositCalculationPreview.remainingPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {depositCalculationPreview.isFullySettled && (
                <div className="mt-2 text-center text-xs font-bold text-emerald-800 bg-emerald-100/90 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>This deposit will fully settle all pending dues for {selectedCustomer.full_name}!</span>
                </div>
              )}
            </div>
          )}

          {/* Receipt Slip File Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Upload Bank Slip / Receipt Voucher
              </label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer transition-colors shrink-0">
                  <Upload size={14} />
                  <span>Choose Slip File</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {formReceiptFilename ? (
                  <span className="text-xs text-emerald-700 font-semibold truncate flex items-center gap-1.5">
                    <FileCheck size={14} />
                    {formReceiptFilename}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">No voucher attached yet</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Remarks / Internal Notes
              </label>
              <input
                type="text"
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="e.g. Paid via online FPX transfer to Maybank"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
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

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Customer Deposit Transactions ({filteredRecords.length})
            </h3>
            <p className="text-xs text-slate-500 m-0">
              Validated payment receipts, CDM vouchers, and bank transfer records.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer, receipt..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden w-48 sm:w-56"
              />
            </div>

            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">All Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="Verified">Verified</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Reconciled">Reconciled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date &amp; Ref</th>
                <th className="py-3 px-4">Method &amp; Bank</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4 text-right">Amount (MYR)</th>
                <th className="py-3 px-4 text-center">Receipt Voucher</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No customer deposits recorded yet.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {r.passport_no || 'No Passport'} • {r.company_id || 'Individual'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{r.deposit_date}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.receipt_no || 'NO-REF'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{r.payment_method}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{r.bank_name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {r.purpose}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-emerald-700 text-sm">
                        +RM {r.deposit_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      {r.target_amount !== undefined && r.target_amount > 0 ? (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>Target: RM {Number(r.target_amount).toLocaleString()}</span>
                          {r.remaining_pending !== undefined && (
                            <span className="block text-amber-700 font-semibold">
                              Pending Left: RM {Number(r.remaining_pending).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.receipt_url ? (
                        <a
                          href={getFileUrl(r.receipt_url)}
                          download={r.receipt_filename || 'deposit-receipt.png'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 no-underline"
                        >
                          <Download size={12} />
                          <span>Slip</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[10px] italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.verification_status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.verification_status === 'Reconciled'
                            ? 'bg-blue-100 text-[#0b4da2]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(r)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                          title="Edit deposit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(String(r.id))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer"
                          title="Delete deposit"
                        >
                          <Trash2 size={13} />
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <h3 className="text-base font-bold text-slate-900 m-0 mb-1">Delete Deposit Record?</h3>
            <p className="text-xs text-slate-500 mb-5">
              This action will remove the deposit entry from the ledger.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer border-0 shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
