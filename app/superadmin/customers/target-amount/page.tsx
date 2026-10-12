'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Filter,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
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
  CustomerTargetAmountRecord,
  getStoredCustomerTargets,
  fetchCustomerTargets,
  saveCustomerTarget,
  deleteCustomerTarget,
  getCustomerFinanceBalance,
  CustomerFinanceBalance,
} from '@/lib/customerFinanceStorage';

const TARGET_CATEGORIES = [
  'Complete Migration Package',
  'Foreign Worker Permit (Calling Visa)',
  'Annual Levi Quota Fee',
  'FOMEMA Medical Clearance',
  'Insurance & Security Bond',
  'Work Permit Renewal',
  'Visa Extension & Stamping',
  'Custom Employer Package',
];

const PAYMENT_TERMS = [
  'Full Upfront Payment',
  '2 Installments (50% / 50%)',
  '3 Installments',
  'Monthly Salary Deduction',
  'Employer Sponsored',
];

export default function CustomerTargetAmountPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [records, setRecords] = useState<CustomerTargetAmountRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState<number | ''>(3500);
  const [formCategory, setFormCategory] = useState(TARGET_CATEGORIES[0]);
  const [formDate, setFormDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formQuota, setFormQuota] = useState<number>(1);
  const [formTerms, setFormTerms] = useState(PAYMENT_TERMS[0]);
  const [formStatus, setFormStatus] = useState<'In Progress' | 'Achieved' | 'On Hold' | 'Cancelled'>('In Progress');
  const [formRemarks, setFormRemarks] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) setCustomers(list);
    }).catch(() => {});

    setRecords(getStoredCustomerTargets());
    fetchCustomerTargets().then((list) => {
      if (Array.isArray(list) && list.length > 0) setRecords(list);
    }).catch(() => {});

    const handler = () => setRecords(getStoredCustomerTargets());
    window.addEventListener('customerTargetsUpdated', handler);
    window.addEventListener('customerDepositsUpdated', handler);
    window.addEventListener('customerPendingsUpdated', handler);
    return () => {
      window.removeEventListener('customerTargetsUpdated', handler);
      window.removeEventListener('customerDepositsUpdated', handler);
      window.removeEventListener('customerPendingsUpdated', handler);
    };
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  // Customer Financial Balance
  const customerBalance: CustomerFinanceBalance | null = useMemo(() => {
    if (!selectedCustomerId) return null;
    return getCustomerFinanceBalance(selectedCustomerId);
  }, [selectedCustomerId, records]);

  // Customer options for Select2
  const customerOptions: Select2Option[] = useMemo(() => {
    return customers.map((c) => ({
      value: String(c.id),
      label: c.full_name,
      subLabel: `${c.passport_no || 'No Passport'} • ${c.company_id || 'Individual'}`,
      badge: c.working_sector || c.status,
    }));
  }, [customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedCustomer) {
      showToast('info', 'Please select a customer first.');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      showToast('info', 'Please enter a valid target amount.');
      return;
    }

    const newRecord: CustomerTargetAmountRecord = {
      id: editingId || `target_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.full_name,
      passport_no: selectedCustomer.passport_no,
      nid_no: selectedCustomer.nid_no,
      company_id: selectedCustomer.company_id,
      company_name: selectedCustomer.company_id,
      target_amount: Number(formAmount),
      target_category: formCategory,
      target_date: formDate,
      quota_workers_count: Number(formQuota) || 1,
      payment_terms: formTerms,
      status: formStatus,
      remarks: formRemarks.trim(),
      created_at: editingId
        ? records.find((r) => r.id === editingId)?.created_at || new Date().toISOString()
        : new Date().toISOString(),
    };

    await saveCustomerTarget(newRecord);
    showToast(
      'success',
      editingId
        ? `Target amount for "${selectedCustomer.full_name}" updated in database!`
        : `New target quota allocated for "${selectedCustomer.full_name}" in database!`
    );

    // Reset form
    setEditingId(null);
    setFormAmount(3500);
    setFormRemarks('');
  };

  const handleEdit = (r: CustomerTargetAmountRecord) => {
    setEditingId(String(r.id));
    setSelectedCustomerId(String(r.customer_id));
    setFormAmount(r.target_amount);
    setFormCategory(r.target_category || TARGET_CATEGORIES[0]);
    setFormDate(r.target_date || '');
    setFormQuota(r.quota_workers_count || 1);
    setFormTerms(r.payment_terms || PAYMENT_TERMS[0]);
    setFormStatus(r.status);
    setFormRemarks(r.remarks || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDelete = async (id: string | number) => {
    await deleteCustomerTarget(id);
    setDeleteConfirmId(null);
    showToast('info', 'Target amount record removed from database.');
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchTerm ||
        r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.passport_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.company_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === 'ALL' || r.target_category === filterCategory;
      const matchStat = filterStatus === 'ALL' || r.status === filterStatus;
      return matchSearch && matchCat && matchStat;
    });
  }, [records, searchTerm, filterCategory, filterStatus]);

  // Summary Metrics
  const totalTargetVolume = records.reduce((acc, r) => acc + (r.target_amount || 0), 0);
  const inProgressCount = records.filter((r) => r.status === 'In Progress').length;
  const achievedCount = records.filter((r) => r.status === 'Achieved').length;

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

      {/* Header & Sub-Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 flex items-center gap-1.5">
                <Target size={12} className="text-[#0b4da2]" />
                Customer Finance Hub
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">Quota Target Module</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight m-0">
              Customer Target Amount Management
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed m-0">
              Set target budget quotas, visa allocation costs, and fee milestones per foreign worker. Integrated with Customer Directory.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/superadmin/customers"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors no-underline"
            >
              <Users size={14} />
              <span>Customer Directory</span>
            </Link>
            <Link
              href="/superadmin/customers/deposit-amount"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors no-underline"
            >
              <DollarSign size={14} />
              <span>Deposit Amount →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <Target size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Target Volume
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              RM {totalTargetVolume.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-600 font-semibold">{records.length} targets set</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              In-Progress Targets
            </span>
            <div className="text-2xl font-black text-amber-700 mt-0.5 font-mono">
              {inProgressCount}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Under active processing</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Achieved Targets
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
              {achievedCount}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">Successfully completed</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avg Target / Worker
            </span>
            <div className="text-2xl font-black text-indigo-700 mt-0.5 font-mono">
              RM {records.length > 0 ? Math.round(totalTargetVolume / records.length).toLocaleString() : '0'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Fee estimation</div>
          </div>
        </div>
      </div>

      {/* FORM: Create or Edit Target Amount */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center font-bold">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                {editingId ? 'Edit Target Amount Quota' : 'Allocate New Customer Target Amount'}
              </h2>
              <p className="text-xs text-slate-500 m-0">
                Select customer, specify target budget amount, terms, and deadline.
              </p>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormAmount(3500);
                setFormRemarks('');
              }}
              className="text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Customer Selection */}
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

            {/* Selected Customer Snapshot Info Card */}
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

          {/* 2. Target Amount Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Amount (MYR) <span className="text-red-500">*</span>
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
                  placeholder="3500.00"
                  className="w-full pl-10 pr-3 py-2 text-xs font-bold font-mono border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Category / Purpose
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              >
                {TARGET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Completion Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Terms
              </label>
              <select
                value={formTerms}
                onChange={(e) => setFormTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              >
                {PAYMENT_TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Status & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quota Count (Workers)
              </label>
              <input
                type="number"
                min="1"
                value={formQuota}
                onChange={(e) => setFormQuota(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Milestone Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-semibold"
              >
                <option value="In Progress">In Progress (Active)</option>
                <option value="Achieved">Achieved (Completed)</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Remarks / Notes
              </label>
              <input
                type="text"
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="e.g. Approved under Ministry Quota batch #1"
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
              <span>{editingId ? 'Update Target Amount' : 'Save Customer Target'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* DATA TABLE: Target Amount Records */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Allocated Customer Target Records ({filteredRecords.length})
            </h3>
            <p className="text-xs text-slate-500 m-0">
              Complete list of foreign worker target amounts, terms, and status.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer, passport..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden w-48 sm:w-56"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">All Categories</option>
              {TARGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Achieved">Achieved</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Category &amp; Terms</th>
                <th className="py-3 px-4 font-right text-right">Target Amount</th>
                <th className="py-3 px-4 text-center">Quota</th>
                <th className="py-3 px-4">Target Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No target amount records found. Allocate one above!
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {r.passport_no || 'No Passport'} • {r.company_id || 'Individual'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{r.target_category}</div>
                      <div className="text-[10px] text-slate-400">{r.payment_terms}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        RM {r.target_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      {(() => {
                        const bal = getCustomerFinanceBalance(r.customer_id);
                        return (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            <span className="text-emerald-700 font-semibold">
                              Dep: RM {bal.total_deposited.toLocaleString()}
                            </span>
                            {' • '}
                            <span className="text-amber-700 font-semibold">
                              Pending: RM {bal.net_pending.toLocaleString()}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                      {r.quota_workers_count || 1}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {r.target_date || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Achieved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'In Progress'
                            ? 'bg-blue-100 text-[#0b4da2]'
                            : r.status === 'On Hold'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(r)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                          title="Edit target"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(String(r.id))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer"
                          title="Delete target"
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
            <h3 className="text-base font-bold text-slate-900 m-0 mb-1">Delete Target Record?</h3>
            <p className="text-xs text-slate-500 mb-5">
              This action will remove the customer's target quota record.
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
