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
  X,
} from 'lucide-react';
import {
  CompanyQuotation,
  fetchQuotations,
  convertQuotationToInvoice,
  deleteQuotation,
} from '@/lib/companyTrialAndFinanceStorage';
import PrintableQuotationModal from '@/components/PrintableQuotationModal';

export default function QuotationsListPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<CompanyQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewQuotation, setPreviewQuotation] = useState<CompanyQuotation | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchQuotations();
      setQuotations(data);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fetch quotations' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((quo) => {
      if (statusFilter !== 'all' && quo.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesNo = quo.quotation_no?.toLowerCase().includes(s);
        const matchesCompany = quo.company_name?.toLowerCase().includes(s);
        const matchesCustomer = quo.customer_name?.toLowerCase().includes(s);
        const matchesEmail = quo.customer_email?.toLowerCase().includes(s);
        if (!matchesNo && !matchesCompany && !matchesCustomer && !matchesEmail) return false;
      }
      return true;
    });
  }, [quotations, statusFilter, searchTerm]);

  const totalCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === 'Draft').length;
  const sentCount = quotations.filter((q) => q.status === 'Sent' || q.status === 'Accepted').length;
  const convertedCount = quotations.filter((q) => q.status === 'Converted').length;

  const handleConvertToInvoice = async (quo: CompanyQuotation) => {
    if (!confirm(`Convert Quotation #${quo.quotation_no} directly into a Customer Payment Invoice?`)) return;

    try {
      const res = await convertQuotationToInvoice(quo.id);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Quotation #${quo.quotation_no} successfully converted to Invoice #${res.invoice?.invoice_no}!`,
        });
        loadData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to convert quotation' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    try {
      await deleteQuotation(id);
      setNotification({ type: 'info', message: 'Quotation deleted successfully.' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete quotation' });
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
            <span className="text-slate-800 font-semibold">Customer Quotations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="text-[#0b4da2]" size={24} />
            <span>Customer Quotation Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Issue official commercial quotes, manage proposal statuses, and seamlessly convert accepted quotations into customer payment invoices.
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
            href="/companies/quotations/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold shadow-sm hover:shadow transition-all no-underline"
          >
            <Plus size={14} />
            <span>Create Customer Quotation</span>
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Quotes</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
              <FileSpreadsheet size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">All issued quotations</div>
        </div>

        <div
          onClick={() => setStatusFilter('Draft')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'Draft' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Drafts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">{draftCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Pending finalization</div>
        </div>

        <div
          onClick={() => setStatusFilter('Sent')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'Sent' ? 'border-blue-400 ring-2 ring-blue-400/20' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Sent / Active</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0b4da2] mt-2">{sentCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Sent for client approval</div>
        </div>

        <div
          onClick={() => setStatusFilter('Converted')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'Converted' ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Converted to Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{convertedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Converted into billing invoices</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quotation no, company name, customer name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['all', 'Draft', 'Sent', 'Accepted', 'Converted', 'Declined'].map((st) => (
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

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Quotation No. &amp; Date</th>
                <th className="py-3.5 px-4">Company &amp; Client</th>
                <th className="py-3.5 px-4">Valid Until</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
                      <span>Loading quotations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileSpreadsheet size={36} className="mx-auto text-slate-300 mb-2" />
                    <div className="font-semibold text-slate-700 text-sm">No quotations found</div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click &ldquo;Create Customer Quotation&rdquo; to draft a new quote.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quo) => {
                  return (
                    <tr key={quo.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-[#0b4da2] text-sm font-mono">{quo.quotation_no}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{quo.quotation_date}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-slate-900">{quo.company_name || 'General Customer'}</div>
                        <div className="text-slate-600 mt-0.5 font-medium">{quo.customer_name}</div>
                        {quo.customer_email && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{quo.customer_email}</div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top text-slate-600">
                        {quo.valid_until ? (
                          <div className="flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            <span>{quo.valid_until}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Open</span>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {quo.currency || 'MYR'} {Number(quo.total_amount).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {Array.isArray(quo.items) ? quo.items.length : 0} line item(s)
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            quo.status === 'Converted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : quo.status === 'Sent' || quo.status === 'Accepted'
                              ? 'bg-blue-100 text-blue-800'
                              : quo.status === 'Declined'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {quo.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-top text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPreviewQuotation(quo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
                          title="View / Print Quotation"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>

                        {quo.status !== 'Converted' && (
                          <button
                            type="button"
                            onClick={() => handleConvertToInvoice(quo)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer border-0"
                            title="Convert to Customer Payment Invoice"
                          >
                            <DollarSign size={12} />
                            <span>Convert to Invoice</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(quo.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                          title="Delete"
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

      {/* Professional A4 Printable Quotation Modal */}
      {previewQuotation && (
        <PrintableQuotationModal
          quotation={previewQuotation}
          onClose={() => setPreviewQuotation(null)}
          onConvertToInvoice={handleConvertToInvoice}
        />
      )}
    </div>
  );
}
