'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  CompanyInvoice,
  fetchInvoices,
  markInvoicePaid,
  deleteInvoice,
} from '@/lib/companyTrialAndFinanceStorage';
import PrintableInvoiceModal from '@/components/PrintableInvoiceModal';

export default function InvoicesListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<CompanyInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewInvoice, setPreviewInvoice] = useState<CompanyInvoice | null>(null);

  // Mark Paid Modal
  const [settlingInvoice, setSettlingInvoice] = useState<CompanyInvoice | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<string>('Bank Transfer');
  const [settleRef, setSettleRef] = useState<string>('');
  const [settleBank, setSettleBank] = useState<string>('Maybank');
  const [isSettling, setIsSettling] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fetch invoices' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.payment_status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesNo = inv.invoice_no?.toLowerCase().includes(s);
        const matchesCompany = inv.company_name?.toLowerCase().includes(s);
        const matchesCustomer = inv.customer_name?.toLowerCase().includes(s);
        const matchesEmail = inv.customer_email?.toLowerCase().includes(s);
        const matchesRef = inv.payment_reference?.toLowerCase().includes(s);
        if (!matchesNo && !matchesCompany && !matchesCustomer && !matchesEmail && !matchesRef) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, searchTerm]);

  const totalCount = invoices.length;
  const paidCount = invoices.filter((i) => i.payment_status === 'Paid').length;
  const pendingCount = invoices.filter((i) => i.payment_status === 'Pending' || i.payment_status === 'Partial').length;

  const totalCollected = invoices.reduce((acc, i) => acc + (Number(i.amount_paid) || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (Number(i.balance_due) || 0), 0);

  const handleOpenSettleModal = (inv: CompanyInvoice) => {
    setSettlingInvoice(inv);
    setSettleAmount(inv.balance_due > 0 ? inv.balance_due : inv.total_amount);
    setSettleMethod('Bank Transfer');
    setSettleRef(`PAY-${Date.now().toString().slice(-6)}`);
    setSettleBank('Maybank');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingInvoice) return;

    setIsSettling(true);
    try {
      const res = await markInvoicePaid(settlingInvoice.id, {
        payment_method: settleMethod,
        payment_reference: settleRef,
        amount_paid: settleAmount,
        bank_name: settleBank,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Payment of RM ${settleAmount.toFixed(2)} recorded for Invoice #${settlingInvoice.invoice_no}!`,
        });
        setSettlingInvoice(null);
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Payment settlement failed' });
    } finally {
      setIsSettling(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteInvoice(id);
      setNotification({ type: 'info', message: 'Invoice deleted successfully.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete invoice' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/companies" className="hover:text-[#0b4da2] no-underline">
              Company Management
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Customer Invoices</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <DollarSign className="text-emerald-600" size={24} />
            <span>Customer Payment Invoice Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Track official billing statements, subscription renewals, payments received, and print verified tax receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            href="/companies/invoices/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all no-underline"
          >
            <Plus size={14} />
            <span>Create Customer Invoice</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Recorded invoices</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            RM {totalCollected.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{paidCount} Paid Settlements</div>
        </div>

        <div
          onClick={() => setStatusFilter('Pending')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'Pending' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Settlement</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Invoices awaiting payment</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Balance Due</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-800 mt-2">
            RM {totalOutstanding.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total uncollected balance</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice no, company name, client name, ref no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['all', 'Paid', 'Pending', 'Partial', 'Overdue'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                  statusFilter === st
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Invoice No. &amp; Date</th>
                <th className="py-3.5 px-4">Billed Company &amp; Client</th>
                <th className="py-3.5 px-4">Package / Service</th>
                <th className="py-3.5 px-4 text-right">Total / Paid</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                    <div className="font-semibold text-slate-700 text-sm">No invoices found</div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click &ldquo;Create Customer Invoice&rdquo; to issue a new invoice.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = inv.payment_status === 'Paid';
                  const isPending = inv.payment_status === 'Pending';
                  const isPartial = inv.payment_status === 'Partial';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-slate-900 text-sm font-mono">{inv.invoice_no}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{inv.invoice_date}</span>
                        </div>
                        {inv.payment_reference && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Ref: {inv.payment_reference}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-slate-900">{inv.company_name || 'General Client'}</div>
                        <div className="text-slate-600 mt-0.5 font-medium">{inv.customer_name}</div>
                        {inv.customer_email && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{inv.customer_email}</div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-slate-800">
                          {inv.package_name || (inv.items?.[0]?.description ? inv.items[0].description.slice(0, 45) + '...' : 'Commercial Service')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Method: {inv.payment_method || 'Bank Transfer'}
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {inv.currency || 'MYR'} {Number(inv.total_amount).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                          Paid: {inv.currency || 'MYR'} {Number(inv.amount_paid).toFixed(2)}
                        </div>
                        {Number(inv.balance_due) > 0 && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            Due: {inv.currency || 'MYR'} {Number(inv.balance_due).toFixed(2)}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : isPartial
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPaid ? <CheckCircle2 size={11} /> : null}
                          {inv.payment_status}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-top text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
                          title="View / Print Tax Receipt"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>

                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => handleOpenSettleModal(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer border-0"
                            title="Register payment settlement"
                          >
                            <DollarSign size={12} />
                            <span>Mark Paid</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                          title="Delete invoice"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview & Printable Receipt Modal */}
      {previewInvoice && (
        <PrintableInvoiceModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onOpenSettleModal={handleOpenSettleModal}
        />
      )}

      {/* Settle / Mark Paid Modal */}
      {settlingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                <DollarSign size={20} />
                <span>Record Invoice Payment</span>
              </div>
              <button
                type="button"
                onClick={() => setSettlingInvoice(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Record settlement for Invoice <strong className="text-slate-900">#{settlingInvoice.invoice_no}</strong> (Client: {settlingInvoice.customer_name}).
            </p>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Settlement Amount ({settlingInvoice.currency || 'MYR'}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="Bank Transfer">Bank Transfer (IBG/DuitNow)</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Cash / Cheque">Cash / Cheque</option>
                  <option value="Online Payment Gateway">Online Gateway</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Reference / Transaction ID</label>
                <input
                  type="text"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  placeholder="e.g. TR-20261025-01"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={settleBank}
                  onChange={(e) => setSettleBank(e.target.value)}
                  placeholder="Maybank, CIMB, Public Bank..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettlingInvoice(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSettling ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Save Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
