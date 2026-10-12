'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
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
  CustomerPendingAmountRecord,
  getStoredCustomerPendings,
  fetchCustomerPendings,
  saveCustomerPending,
  deleteCustomerPending,
  getCustomerFinanceBalance,
  CustomerFinanceBalance,
  syncAllCustomerPendings,
} from '@/lib/customerFinanceStorage';

const PRIORITIES = ['Normal', 'Medium', 'Urgent', 'Critical Overdue'] as const;

export default function CustomerPendingAmountPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [records, setRecords] = useState<CustomerPendingAmountRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setCustomers(list);
        syncAllCustomerPendings(list);
      }
    }).catch(() => {});

    syncAllCustomerPendings();
    setRecords(getStoredCustomerPendings());
    fetchCustomerPendings().then((list) => {
      if (Array.isArray(list) && list.length > 0) setRecords(list);
    }).catch(() => {});

    const handler = () => setRecords(getStoredCustomerPendings());
    window.addEventListener('customerPendingsUpdated', handler);
    window.addEventListener('customerTargetsUpdated', handler);
    window.addEventListener('customerDepositsUpdated', handler);
    return () => {
      window.removeEventListener('customerPendingsUpdated', handler);
      window.removeEventListener('customerTargetsUpdated', handler);
      window.removeEventListener('customerDepositsUpdated', handler);
    };
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Selected customer object (null if ALL)
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'ALL') return null;
    return customers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  // Customer options for Select2 (Includes "ALL" option at the top)
  const customerOptions: Select2Option[] = useMemo(() => {
    const list: Select2Option[] = [
      {
        value: 'ALL',
        label: 'All Customers / Workers (Overview)',
        subLabel: `View overview & all pending accounts (${customers.length} workers)`,
        badge: 'ALL',
      },
      ...customers.map((c) => ({
        value: String(c.id),
        label: c.full_name,
        subLabel: `${c.passport_no || 'No Passport'} • ${c.company_id || 'Individual'}`,
        badge: c.working_sector || c.status,
      })),
    ];
    return list;
  }, [customers]);

  // Customer Financial Balance for the specifically selected customer
  const customerBalance: CustomerFinanceBalance | null = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'ALL') return null;
    return getCustomerFinanceBalance(selectedCustomerId);
  }, [selectedCustomerId, records]);

  // Filtered records for table display
  const displayedRecords = useMemo(() => {
    let base = records;
    if (selectedCustomerId && selectedCustomerId !== 'ALL') {
      base = base.filter((r) => String(r.customer_id) === String(selectedCustomerId));
      if (base.length === 0 && selectedCustomer && customerBalance) {
        return [
          {
            id: `ledger_${selectedCustomer.id}`,
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.full_name,
            passport_no: selectedCustomer.passport_no,
            company_id: selectedCustomer.company_id,
            company_name: selectedCustomer.company_id,
            target_amount: customerBalance.total_target,
            total_deposited: customerBalance.total_deposited,
            pending_amount: customerBalance.net_pending,
            due_date: new Date().toISOString().split('T')[0],
            invoice_no: `LEDGER-${String(selectedCustomer.id).slice(-4)}`,
            category: 'Auto Calculated Balance Due',
            priority: customerBalance.net_pending > 0 ? 'Urgent' : 'Normal',
            collection_status: customerBalance.status,
            assigned_officer: 'Super Admin Desk',
            created_at: new Date().toISOString(),
          } as CustomerPendingAmountRecord,
        ];
      }
    }

    return base.filter((rec) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        rec.customer_name?.toLowerCase().includes(term) ||
        rec.passport_no?.toLowerCase().includes(term) ||
        rec.invoice_no?.toLowerCase().includes(term) ||
        rec.company_name?.toLowerCase().includes(term) ||
        rec.category?.toLowerCase().includes(term);

      const matchPriority = filterPriority === 'ALL' || rec.priority === filterPriority;
      const matchStatus = filterStatus === 'ALL' || rec.collection_status === filterStatus;

      return matchSearch && matchPriority && matchStatus;
    });
  }, [records, selectedCustomerId, selectedCustomer, customerBalance, searchTerm, filterPriority, filterStatus]);

  // KPI Calculations across records
  const totalOutstandingDues = useMemo(() => {
    return records
      .filter((r) => r.collection_status !== 'Settled')
      .reduce((sum, r) => sum + (Number(r.pending_amount) || 0), 0);
  }, [records]);

  const totalTargetsSum = useMemo(() => {
    return records.reduce((sum, r) => sum + (Number(r.target_amount) || 0), 0);
  }, [records]);

  const totalDepositsSum = useMemo(() => {
    return records.reduce((sum, r) => sum + (Number(r.total_deposited) || 0), 0);
  }, [records]);

  const settledCount = useMemo(() => {
    return records.filter((r) => r.collection_status === 'Settled' || Number(r.pending_amount) === 0).length;
  }, [records]);

  const handleDelete = async (id: string | number) => {
    await deleteCustomerPending(id);
    setDeleteConfirmId(null);
    showToast('info', 'Customer pending dues record removed from database.');
  };

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
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-[#0b4da2] shrink-0" />
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Pending Dues Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this pending amount entry? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
            Customer Pending Amount Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1 m-0">
            Automated pending balance calculation (Target Amount − Total Deposited).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link
            href="/superadmin/customers/deposit-amount"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors no-underline"
          >
            <DollarSign size={15} />
            <span>Go to Deposit Amount →</span>
          </Link>
          <Link
            href="/superadmin/customers/company-cost"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors no-underline"
          >
            <span>Company Cost Amount →</span>
          </Link>
        </div>
      </div>

      {/* CUSTOMER SELECT2 SELECTOR CARD (All or Individual) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Select Customer / Worker to View Pending Dues
            </label>
            <Select2Search
              options={customerOptions}
              value={selectedCustomerId}
              onChange={(val) => setSelectedCustomerId(val || 'ALL')}
              placeholder="Search worker by name, passport, company or select All..."
            />
            <p className="text-[11px] text-slate-500 mt-1.5 m-0">
              Select <span className="font-semibold text-slate-700">"All Customers"</span> to see total company-wide pending dues, or pick an individual worker to inspect their target, deposit &amp; remaining dues.
            </p>
          </div>

          {selectedCustomer && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCustomerId('ALL')}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Reset to All Customers
              </button>
              <Link
                href={`/superadmin/customers/deposit-amount?customerId=${selectedCustomer.id}&amount=${customerBalance?.net_pending && customerBalance.net_pending > 0 ? customerBalance.net_pending : ''}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors no-underline"
              >
                <DollarSign size={15} />
                <span>Deposit Dues Now →</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CONDITIONAL CARD: Individual Customer Financial Ledger Card VS All Customers KPI Cards */}
      {selectedCustomer && customerBalance ? (
        /* INDIVIDUAL CUSTOMER FINANCIAL LEDGER CARD */
        <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Individual Worker Financial Ledger
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1 m-0">
                {selectedCustomer.full_name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                <span>Passport: <strong className="text-slate-700">{selectedCustomer.passport_no || 'N/A'}</strong></span>
                <span>•</span>
                <span>Company: <strong className="text-slate-700">{selectedCustomer.company_id || 'Individual'}</strong></span>
                <span>•</span>
                <span>Sector: <strong className="text-slate-700">{selectedCustomer.working_sector || 'General'}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                customerBalance.status === 'Settled'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : customerBalance.status === 'Partially Paid'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {customerBalance.status}
              </span>

              <Link
                href={`/superadmin/customers/deposit-amount?customerId=${selectedCustomer.id}&amount=${customerBalance.net_pending > 0 ? customerBalance.net_pending : ''}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-all no-underline"
              >
                <DollarSign size={15} />
                <span>Make Deposit for this Worker →</span>
              </Link>
            </div>
          </div>

          {/* 3 Ledger Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-center">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                1. Target Amount
              </span>
              <div className="text-2xl font-black font-mono text-blue-950 mt-1">
                RM {customerBalance.total_target.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-blue-600 mt-1 font-medium">Total fee target allocated</div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 text-center">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                2. Total Deposited (−)
              </span>
              <div className="text-2xl font-black font-mono text-emerald-950 mt-1">
                RM {customerBalance.total_deposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-medium">Inbound paid deposit slips</div>
            </div>

            <div className={`border-2 rounded-xl p-4 text-center ${
              customerBalance.net_pending === 0 && customerBalance.total_target > 0
                ? 'bg-emerald-100/70 border-emerald-400'
                : 'bg-amber-100/80 border-amber-400'
            }`}>
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                3. Net Pending Due (=)
              </span>
              <div className="text-2xl font-black font-mono text-amber-950 mt-1">
                RM {customerBalance.net_pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-amber-800 mt-1 font-semibold">
                {customerBalance.net_pending === 0 && customerBalance.total_target > 0
                  ? 'All dues completely cleared'
                  : 'Remaining balance to be deposited'}
              </div>
            </div>
          </div>

          {/* Recovery rate progress bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-600">
                Payment Recovery Progress: <strong className="text-slate-900">{customerBalance.deposit_percentage}%</strong>
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                RM {customerBalance.total_deposited.toLocaleString()} / RM {customerBalance.total_target.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  customerBalance.deposit_percentage >= 100
                    ? 'bg-emerald-500'
                    : customerBalance.deposit_percentage > 50
                    ? 'bg-blue-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, customerBalance.deposit_percentage)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* ALL CUSTOMERS GENERAL KPI CARDS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Clock size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Net Outstanding Dues
              </span>
              <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
                RM {totalOutstandingDues.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-600 font-semibold">Target − Deposits balance</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
              <TrendingUp size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Target Amount
              </span>
              <div className="text-2xl font-black text-blue-900 mt-0.5 font-mono">
                RM {totalTargetsSum.toLocaleString()}
              </div>
              <div className="text-[10px] text-blue-600 font-medium">Customer fee targets</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Deposited Collections
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
                RM {totalDepositsSum.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium">Inbound paid receipts</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
              <Wallet size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Settled Accounts
              </span>
              <div className="text-2xl font-black text-purple-900 mt-0.5 font-mono">
                {settledCount}
              </div>
              <div className="text-[10px] text-purple-600 font-medium">{records.length} total logged claims</div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by worker, invoice, company..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
            >
              <option value="ALL">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Settled">Settled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Customer / Worker</th>
                <th className="py-3 px-4">Invoice &amp; Due Date</th>
                <th className="py-3 px-4 text-right">Target Amount</th>
                <th className="py-3 px-4 text-right">Deposited</th>
                <th className="py-3 px-4 text-right">
                  <span className="text-amber-800">Net Pending Due (Click to Deposit)</span>
                </th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Deposit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Clock size={32} className="mx-auto mb-2 opacity-30" />
                    <div>No pending dues records found.</div>
                  </td>
                </tr>
              ) : (
                displayedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{rec.customer_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {rec.passport_no || 'No Passport'} • {rec.company_name || rec.company_id || 'Individual'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-[#0b4da2]">{rec.invoice_no || 'NO-REF'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Due: {rec.due_date}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold font-mono text-blue-900 text-xs">
                      RM {Number(rec.target_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold font-mono text-emerald-700 text-xs">
                        RM {Number(rec.total_deposited || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      {Number(rec.target_amount || 0) > 0 && (
                        <div
                          className="w-20 ml-auto bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden"
                          title={`${Math.min(100, Math.round(((Number(rec.total_deposited) || 0) / Number(rec.target_amount)) * 100))}% Paid`}
                        >
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round(((Number(rec.total_deposited) || 0) / Number(rec.target_amount)) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>

                    {/* CLICKABLE PENDING DUE LINK TO DEPOSIT PAGE */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/superadmin/customers/deposit-amount?customerId=${rec.customer_id}&amount=${Number(rec.pending_amount) > 0 ? rec.pending_amount : ''}`}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-emerald-50 border border-amber-200 hover:border-emerald-300 transition-all no-underline"
                        title="Click to make a deposit for this pending due"
                      >
                        <span className="font-black font-mono text-amber-800 group-hover:text-emerald-700 text-sm">
                          RM {Number(rec.pending_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <ArrowRight size={13} className="text-amber-600 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          rec.priority === 'Critical Overdue'
                            ? 'bg-red-100 text-red-800'
                            : rec.priority === 'Urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : rec.priority === 'Medium'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          rec.collection_status === 'Settled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.collection_status === 'Partially Paid'
                            ? 'bg-purple-100 text-purple-800'
                            : rec.collection_status === 'Overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.collection_status}
                      </span>
                    </td>

                    {/* DIRECT DEPOSIT BUTTON IN ACTIONS */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/superadmin/customers/deposit-amount?customerId=${rec.customer_id}&amount=${Number(rec.pending_amount) > 0 ? rec.pending_amount : ''}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors no-underline cursor-pointer"
                          title="Open deposit form for this customer"
                        >
                          <DollarSign size={13} />
                          <span>Deposit</span>
                        </Link>

                        {deleteConfirmId === rec.id ? (
                          <div className="inline-flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                            <button
                              type="button"
                              onClick={() => handleDelete(rec.id)}
                              className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer border-0"
                            >
                              Del
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-[10px] bg-slate-200 text-slate-700 px-1 py-0.5 rounded cursor-pointer border-0"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(String(rec.id))}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer border-0"
                            title="Delete record"
                          >
                            <Trash2 size={13} />
                          </button>
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
    </div>
  );
}
