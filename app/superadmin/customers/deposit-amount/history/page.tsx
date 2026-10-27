'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowDownCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  FileCheck,
  Filter,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  CustomerRecord,
  getStoredCustomers,
  fetchCustomersFromBackend,
} from '@/lib/customerStorage';
import {
  getStoredCompanies,
  fetchCompaniesFromBackend,
} from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import {
  CustomerDepositAmountRecord,
  getStoredCustomerDeposits,
  fetchCustomerDeposits,
  deleteCustomerDeposit,
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

function PaymentHistoryContent() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || 'ALL';

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [records, setRecords] = useState<CustomerDepositAmountRecord[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState(initialCustomerId);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterBank, setFilterBank] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

    const onStorage = () => {
      setCustomers(getStoredCustomers());
      setRecords(getStoredCustomerDeposits());
      setCompanies(getStoredCompanies());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Sync if query param changes
  useEffect(() => {
    const qCust = searchParams.get('customerId');
    if (qCust) {
      setFilterCustomer(qCust);
    }
  }, [searchParams]);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = async (id: string | number) => {
    await deleteCustomerDeposit(id);
    setDeleteConfirmId(null);
    showToast('info', 'Deposit entry removed.');
  };

  // Filter records based on all criteria
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchTerm ||
        r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.passport_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receipt_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.deposited_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.purpose?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCustomer =
        filterCustomer === 'ALL' || String(r.customer_id) === String(filterCustomer);

      const recordStatus =
        r.verification_status === 'Pending Verification'
          ? 'Payment Pending'
          : 'Payment Success';
      const matchStatus = filterStatus === 'ALL' || recordStatus === filterStatus;

      const matchMethod = filterMethod === 'ALL' || r.payment_method === filterMethod;
      const matchBank = filterBank === 'ALL' || r.bank_name === filterBank;

      const matchDateFrom = !filterDateFrom || r.deposit_date >= filterDateFrom;
      const matchDateTo = !filterDateTo || r.deposit_date <= filterDateTo;

      return (
        matchSearch &&
        matchCustomer &&
        matchStatus &&
        matchMethod &&
        matchBank &&
        matchDateFrom &&
        matchDateTo
      );
    });
  }, [
    records,
    searchTerm,
    filterCustomer,
    filterStatus,
    filterMethod,
    filterBank,
    filterDateFrom,
    filterDateTo,
  ]);

  // Statistics for the filtered records
  const totalAmountFiltered = filteredRecords.reduce(
    (acc, r) => acc + (Number(r.deposit_amount) || 0),
    0
  );
  const successCount = filteredRecords.filter(
    (r) =>
      r.verification_status === 'Payment Success' ||
      r.verification_status === 'Verified' ||
      r.verification_status === 'Reconciled'
  ).length;
  const pendingCount = filteredRecords.filter(
    (r) =>
      r.verification_status === 'Payment Pending' ||
      r.verification_status === 'Pending Verification'
  ).length;

  const activeCustomerObj = useMemo(() => {
    if (filterCustomer === 'ALL') return null;
    return customers.find((c) => String(c.id) === String(filterCustomer)) || null;
  }, [customers, filterCustomer]);

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
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1.5">
                <Receipt size={12} className="text-indigo-600" />
                Customer Finance Archive
              </span>
              {activeCustomerObj && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Filtered: {activeCustomerObj.full_name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight m-0">
              Previous Payment History
            </h1>
            <p className="text-xs text-slate-500 mt-1 m-0">
              Detailed archive of customer deposits, bank transfer slips, and payment verification records.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={filterCustomer !== 'ALL' ? `/superadmin/customers/deposit-amount?customerId=${filterCustomer}` : '/superadmin/customers/deposit-amount'}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors no-underline"
            >
              <Plus size={14} />
              <span>Record New Deposit</span>
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
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Filtered Amount
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
              RM {totalAmountFiltered.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">{filteredRecords.length} records</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <Receipt size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Transactions
            </span>
            <div className="text-2xl font-black text-blue-900 mt-0.5 font-mono">
              {filteredRecords.length}
            </div>
            <div className="text-[10px] text-blue-600 font-semibold">Matched filter count</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#22a34a] flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Payment Success
            </span>
            <div className="text-2xl font-black text-[#22a34a] mt-0.5 font-mono">
              {successCount}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">Cleared / verified</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Payment Pending
            </span>
            <div className="text-2xl font-black text-amber-600 mt-0.5 font-mono">
              {pendingCount}
            </div>
            <div className="text-[10px] text-amber-600 font-semibold">Awaiting verification</div>
          </div>
        </div>
      </div>

      {/* ALL FILTERS SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 m-0">Advanced Multi-Criteria Filters</h2>
            <span className="text-[11px] text-slate-500 font-medium">
              ({filteredRecords.length} records found)
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterCustomer('ALL');
              setFilterStatus('ALL');
              setFilterMethod('ALL');
              setFilterBank('ALL');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer bg-white"
          >
            <RotateCcw size={12} />
            <span>Reset All Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Search Text
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, passport, bank, ref..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Customer
            </label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.passport_no || 'No Pass'})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Payment Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="Payment Success">Payment Success</option>
              <option value="Payment Pending">Payment Pending</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Payment Method
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
            >
              <option value="ALL">All Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Bank */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Bank
            </label>
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
            >
              <option value="ALL">All Banks</option>
              {MALAYSIAN_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
            />
          </div>

          {/* Date To */}
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
            />
          </div>
        </div>
      </div>

      {/* TRANSACTION LEDGER TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-slate-600" />
            <span className="text-xs font-bold text-slate-800">
              Payment Records Ledger ({filteredRecords.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Click table slip icons to download or view bank vouchers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 whitespace-nowrap">Customer Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Passport</th>
                <th className="py-3 px-4 whitespace-nowrap">Company</th>
                <th className="py-3 px-4 whitespace-nowrap">Ref / Agent</th>
                <th className="py-3 px-4 whitespace-nowrap">Deposit Date</th>
                <th className="py-3 px-4 whitespace-nowrap">Bank Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Deposited By</th>
                <th className="py-3 px-4 whitespace-nowrap">Payment Purpose</th>
                <th className="py-3 px-4 whitespace-nowrap">Method</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Amount</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Slip</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Status</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-xs">No payment history records found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isSuccess =
                    r.verification_status === 'Payment Success' ||
                    r.verification_status === 'Verified' ||
                    r.verification_status === 'Reconciled';

                  return (
                    <tr key={r.id} className="hover:bg-emerald-50/20 transition-colors">
                      {/* Customer Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                        {r.customer_name}
                      </td>

                      {/* Passport No */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                        {r.passport_no || '—'}
                      </td>

                      {/* Company / Employer */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        {r.company_name || r.company_id || 'Individual'}
                      </td>

                      {/* Reference / Agent Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                        {r.receipt_no || '—'}
                      </td>

                      {/* Deposit Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                        {r.deposit_date}
                      </td>

                      {/* Bank Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        {r.bank_name || '—'}
                      </td>

                      {/* Deposited By */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        {r.deposited_by || r.customer_name}
                      </td>

                      {/* Purpose */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                        {r.purpose}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {r.payment_method}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono font-bold text-emerald-700 text-sm">
                        +RM {r.deposit_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Receipt Slip */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        {r.receipt_url ? (
                          <a
                            href={getFileUrl(r.receipt_url)}
                            download={r.receipt_filename || 'deposit-slip.pdf'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 no-underline"
                          >
                            <Download size={11} />
                            <span>Slip</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isSuccess ? 'Payment Success' : 'Payment Pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/superadmin/customers/deposit-amount?customerId=${r.customer_id}&amount=${r.deposit_amount}`}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 inline-flex items-center justify-center no-underline"
                            title="Edit / New Deposit for this customer"
                          >
                            <Edit2 size={13} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(String(r.id))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-400 hover:text-red-600 inline-flex items-center justify-center cursor-pointer bg-transparent"
                            title="Delete Record"
                          >
                            <Trash2 size={13} />
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <h3 className="text-base font-bold text-slate-900 m-0 mb-1">Delete Payment Record?</h3>
            <p className="text-xs text-slate-500 mb-5">
              This action will permanently remove this record from the database.
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

export default function SuperadminCustomerDepositPaymentHistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading payment history...</div>}>
      <PaymentHistoryContent />
    </Suspense>
  );
}
