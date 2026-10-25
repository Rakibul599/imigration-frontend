'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  CompanyQuotation,
  QuotationItem,
  createQuotation,
} from '@/lib/companyTrialAndFinanceStorage';
import { Company } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import PrintableQuotationModal from '@/components/PrintableQuotationModal';

function CreateQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [quotationDate, setQuotationDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState<string>('MYR');
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Accepted'>('Draft');
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [terms, setTerms] = useState<string>(
    '1. This quotation is valid for 30 days from the date of issue.\n2. Payment terms: 50% advance upon confirmation, balance upon completion.\n3. Goods/Services delivered remain property of the company until full payment.'
  );
  const [notes, setNotes] = useState<string>('Thank you for considering our services. Feel free to contact us with any questions.');

  const [items, setItems] = useState<QuotationItem[]>([
    {
      description: 'Cloud Accounting & Enterprise HR Management System Setup',
      qty: 1,
      unit_price: 1200,
      total: 1200,
    },
    {
      description: 'Master Admin & Employee User Onboarding Training (3 Sessions)',
      qty: 1,
      unit_price: 450,
      total: 450,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedQuotation, setSavedQuotation] = useState<CompanyQuotation | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Pre-fill from query params if passed
  useEffect(() => {
    const cName = searchParams.get('company_name');
    const custName = searchParams.get('customer_name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    if (cName) setCompanyName(cName);
    if (custName) setCustomerName(custName);
    if (email) setCustomerEmail(email);
    if (phone) setCustomerPhone(phone);
  }, [searchParams]);

  useEffect(() => {
    const list = getStoredCompanies();
    setCompanies(list);
    fetchCompaniesFromBackend().then((res) => {
      if (Array.isArray(res) && res.length > 0) setCompanies(res);
    }).catch(() => {});
  }, []);

  const handleCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = e.target.value;
    setSelectedCompanyId(cId);
    if (cId) {
      const comp = companies.find((c) => c.id === cId || (c as any).company_id === cId);
      if (comp) {
        setCompanyName(comp.name);
        if (comp.email && !customerEmail) setCustomerEmail(comp.email);
        if (comp.phone && !customerPhone) setCustomerPhone(comp.phone);
        if (comp.address && !customerAddress) setCustomerAddress(comp.address);
        if (comp.directors?.[0]?.name && !customerName) {
          setCustomerName(comp.directors[0].name);
        }
      }
    }
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index] };
    if (field === 'qty') {
      current.qty = parseFloat(value) || 0;
      current.total = round2(current.qty * current.unit_price);
    } else if (field === 'unit_price') {
      current.unit_price = parseFloat(value) || 0;
      current.total = round2(current.qty * current.unit_price);
    } else if (field === 'description') {
      current.description = value;
    }
    updated[index] = current;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: 'Professional Consulting / Custom Workflow Support',
        qty: 1,
        unit_price: 300,
        total: 300,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const subtotal = round2(items.reduce((acc, it) => acc + (it.total || 0), 0));
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = round2(taxable * (taxPercentage / 100));
  const totalAmount = round2(taxable + taxAmount);

  const handleSubmit = async (targetStatus: 'Draft' | 'Sent') => {
    setErrorMessage(null);
    if (!customerName.trim()) {
      setErrorMessage('Please enter Customer / Contact Person Name.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one line item.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await createQuotation({
        company_id: selectedCompanyId || undefined,
        company_name: companyName.trim() || undefined,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
        quotation_date: quotationDate,
        valid_until: validUntil || undefined,
        items,
        discount,
        tax_percentage: taxPercentage,
        currency,
        status: targetStatus,
        terms,
        notes,
      });

      setSavedQuotation(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save quotation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto min-h-screen">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/companies/quotations"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors no-underline"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="text-[#0b4da2]" size={22} />
              <span>Create Customer Quotation</span>
            </h1>
            <p className="text-xs text-slate-500">
              Prepare formal pricing estimates and service proposals for companies and clients.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/companies/quotations"
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold no-underline"
          >
            Quotation List
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Quotation Paper Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Paper Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <div className="text-2xl font-black text-[#0b4da2] tracking-tight">OFFICIAL QUOTATION</div>
            <p className="text-xs text-slate-500 mt-0.5">Enterprise Management Console &amp; Commercial Solutions</p>
            <div className="mt-3 text-xs text-slate-600 space-y-0.5">
              <div className="font-semibold text-slate-800">Agency Operating Portal</div>
              <div>Kuala Lumpur, Malaysia</div>
              <div>support@agencyportal.com | +60 3-8888 9999</div>
            </div>
          </div>

          {/* Quotation Metadata Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full sm:w-72 space-y-2.5 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Quotation No.
              </label>
              <span className="font-mono font-bold text-[#0b4da2] text-sm">
                {savedQuotation?.quotation_no || 'AUTO-GENERATED ON SAVE'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Date
                </label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white font-semibold"
              >
                <option value="MYR">MYR (Malaysian Ringgit)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="SGD">SGD (Singapore Dollar)</option>
                <option value="BDT">BDT (Bangladeshi Taka)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer / Company Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200 text-xs">
          {/* Select Registered Company */}
          <div className="space-y-3">
            <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Building2 size={14} className="text-[#0b4da2]" />
              <span>Link Registered Company (Optional)</span>
            </label>
            <select
              value={selectedCompanyId}
              onChange={handleCompanySelect}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
            >
              <option value="">-- Manual Customer Entry / Custom Company --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Organization Name</label>
              <input
                type="text"
                placeholder="e.g. Apex Global Industries"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
          </div>

          {/* Quotation Recipient Details */}
          <div className="space-y-3">
            <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>Customer / Recipient Details</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Contact Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. David Wong"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+60 12-345 6789"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="client@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Address / Billing Location</label>
              <input
                type="text"
                placeholder="Office suite, building, street, city..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
              Quotation Line Items
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0b4da2] hover:text-[#083877] cursor-pointer bg-transparent border-0"
            >
              <Plus size={14} />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-32 text-right">Unit Price ({currency})</th>
                  <th className="py-2.5 px-3 w-32 text-right">Total ({currency})</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Service / Product Description..."
                        className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:border-[#0b4da2]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0.01"
                        step="1"
                        value={it.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        className="w-16 px-1.5 py-1.5 rounded border border-slate-200 text-xs text-center focus:outline-none focus:border-[#0b4da2]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        className="w-28 px-1.5 py-1.5 rounded border border-slate-200 text-xs text-right focus:outline-none focus:border-[#0b4da2]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {it.total.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 bg-transparent border-0 cursor-pointer p-1"
                        title="Delete item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pt-4 border-t border-slate-200 text-xs">
          {/* Terms & Notes */}
          <div className="w-full sm:flex-1 space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Terms &amp; Conditions</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
          </div>

          {/* Pricing Totals Box */}
          <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Discount ({currency}):</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 rounded border border-slate-300 text-xs text-right bg-white"
              />
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Tax / SST (%):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 rounded border border-slate-300 text-xs text-right bg-white"
                />
                <span className="font-semibold text-slate-700">({currency} {taxAmount.toFixed(2)})</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
              <span>Total Amount:</span>
              <span className="text-base text-[#0b4da2]">{currency} {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {savedQuotation ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check size={14} /> Saved as #{savedQuotation.quotation_no}
              </span>
            ) : (
              <span>Not saved yet</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Printer size={14} />
              <span>Print Preview</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSubmit('Draft')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Save size={14} />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSubmit('Sent')}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold cursor-pointer shadow-md hover:shadow transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileCheck size={14} />
              )}
              <span>Finalize &amp; Issue Quotation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Printable Quotation Modal */}
      {showPreviewModal && (
        <PrintableQuotationModal
          quotation={{
            id: savedQuotation?.id || 0,
            quotation_no: savedQuotation?.quotation_no || 'QTN-DRAFT-PREVIEW',
            company_id: selectedCompanyId || undefined,
            company_name: companyName || 'Company Name',
            customer_name: customerName || 'Valued Customer',
            customer_email: customerEmail || 'customer@example.com',
            customer_phone: customerPhone || undefined,
            customer_address: customerAddress || undefined,
            quotation_date: quotationDate,
            valid_until: validUntil,
            currency,
            items,
            subtotal,
            discount,
            tax_percentage: taxPercentage,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: savedQuotation?.status || status,
            notes,
            terms,
            created_at: savedQuotation?.created_at || new Date().toISOString(),
            updated_at: savedQuotation?.updated_at || new Date().toISOString(),
          }}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
}

export default function CreateQuotationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Quotation Builder...</div>}>
      <CreateQuotationContent />
    </Suspense>
  );
}
