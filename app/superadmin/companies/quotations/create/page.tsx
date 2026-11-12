'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  FileCheck,
  FileSpreadsheet,
  Plus,
  Printer,
  Save,
  Trash2,
} from 'lucide-react';
import {
  CompanyQuotation,
  QuotationItem,
  createQuotation,
} from '@/lib/companyTrialAndFinanceStorage';
import { Company, resolveFileUrl } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import PrintableQuotationModal, { formatCorporateDate } from '@/components/PrintableQuotationModal';
import { getMasterAdminUser } from '@/lib/auth';

function CreateQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const rootPath = pathname.startsWith('/masteradmin') ? '/masteradmin' : '/superadmin';

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
  const [currency, setCurrency] = useState<string>('RM');
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Accepted'>('Draft');
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(6);
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
    const cId = searchParams.get('company_id');
    const cName = searchParams.get('company_name');
    const custName = searchParams.get('customer_name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    if (cId) setSelectedCompanyId(cId);
    if (cName) setCompanyName(cName);
    if (custName) setCustomerName(custName);
    if (email) setCustomerEmail(email);
    if (phone) setCustomerPhone(phone);
  }, [searchParams]);

  useEffect(() => {
    const filterByScope = (rawList: Company[]) => {
      if (rootPath !== '/masteradmin') return rawList;
      const user = getMasterAdminUser();
      const scope = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
      if (scope.length === 0) return [];
      if (scope.includes('*')) return rawList;
      return rawList.filter((c) => scope.some((sId) => sId.toLowerCase() === c.id.toLowerCase()));
    };

    const list = filterByScope(getStoredCompanies());
    setCompanies(list);
    if (list.length === 1 && !selectedCompanyId) {
      setSelectedCompanyId(list[0].id);
      applyCompanyToBilling(list[0]);
    }

    fetchCompaniesFromBackend().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        const filtered = filterByScope(res);
        setCompanies(filtered);
        if (filtered.length === 1 && !selectedCompanyId) {
          setSelectedCompanyId(filtered[0].id);
          applyCompanyToBilling(filtered[0]);
        }
      }
    }).catch(() => {});
  }, [rootPath]);

  const applyCompanyToBilling = (comp: Company) => {
    setCompanyName(comp.name);
    // Custom/client name auto fills with company name (+ ROC if present)
    const formattedClientName = comp.roc ? `${comp.name} (${comp.roc})` : comp.name;
    setCustomerName(formattedClientName);
    setCustomerAddress(comp.address || '');
    setCustomerPhone(comp.phone || '');
    setCustomerEmail(comp.email || '');
  };

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId || (c as any).company_id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  // Auto-fill on initial load or when company list finishes loading
  useEffect(() => {
    if (selectedCompanyId && companies.length > 0 && !customerName) {
      const comp = companies.find((c) => c.id === selectedCompanyId || (c as any).company_id === selectedCompanyId);
      if (comp) {
        applyCompanyToBilling(comp);
      }
    }
  }, [selectedCompanyId, companies, customerName]);

  const handleCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = e.target.value;
    setSelectedCompanyId(cId);
    if (cId) {
      const comp = companies.find((c) => c.id === cId || (c as any).company_id === cId);
      if (comp) {
        applyCompanyToBilling(comp);
      }
    } else {
      setCompanyName('');
      setCustomerName('');
      setCustomerAddress('');
      setCustomerPhone('');
      setCustomerEmail('');
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
        company_name: selectedCompany?.name || companyName.trim() || undefined,
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
      setShowPreviewModal(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save quotation');
    } finally {
      setIsLoading(false);
    }
  };

  const logoUrl = selectedCompany?.logo ? resolveFileUrl(selectedCompany.logo) : '';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto min-h-screen">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`${rootPath}/companies/quotations`}
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
              Prepare formal pricing estimates and service proposals matching official corporate invoicing standard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`${rootPath}/companies/quotations`}
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

      {/* Prominent Issuing Company Selection Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] border border-blue-200 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-900 block">
              Select Issuing Company / Employer <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 m-0">
              When selected, the company logo and heading automatically update in the quotation header and printout.
            </p>
          </div>
        </div>

        <select
          value={selectedCompanyId}
          onChange={handleCompanySelect}
          className="w-full sm:w-80 px-3 py-2.5 rounded-xl border border-blue-300 text-xs bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
        >
          <option value="">-- Choose Company (e.g. Lotus&apos;s, Gamuda, etc.) --</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.roc || c.id})
            </option>
          ))}
        </select>
      </div>

      {/* Main Quotation Paper Form (Live representation matching user screenshot) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        {/* 1. Paper Header Strip: Dynamic Company Logo & Official Heading */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
          {/* Left: Company Logo (if available) + Company Name & Official Details */}
          <div className="flex items-start gap-5 flex-1">
            {logoUrl ? (
              <div className="shrink-0 w-36 max-w-[150px] pt-1">
                <img
                  src={logoUrl}
                  alt={selectedCompany?.name || companyName}
                  className="h-14 sm:h-16 max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}

            {/* Company Details (Always bold uppercase name; no logo needed if unavailable) */}
            <div className="space-y-0.5 text-slate-800 text-[11px] leading-tight flex-1">
              <div className="font-extrabold text-sm sm:text-base text-black uppercase tracking-tight">
                {selectedCompany?.name || companyName || 'LOTUSS STORES (MALAYSIA) SDN BHD'}
              </div>
              <div className="font-bold text-xs text-black">
                (Registration No. {selectedCompany?.roc || '200001018812 (521419-K)'})
              </div>
              <div className="text-slate-700 text-[10.5px] whitespace-pre-line leading-relaxed pt-0.5">
                {selectedCompany?.address || 'Head Office, Level 3, No. 3, Jalan 7A/62A,\nBandar Menjalara, 52200 Kuala Lumpur.'}
              </div>
              <div className="text-slate-700 text-[10.5px]">
                General Line: {selectedCompany?.phone || '(603) 6287 6000'}
              </div>
              <div className="text-slate-700 text-[10.5px]">
                ST ID: {selectedCompany?.roc ? `B16-1811-${selectedCompany.roc.replace(/\D/g, '').slice(-8) || '32000038'}` : 'B16-1811-32000038'}
              </div>
            </div>
          </div>

          {/* Quotation Metadata Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full sm:w-72 space-y-2 text-xs shrink-0">
            <div className="font-black text-sm text-black uppercase tracking-wider mb-2">
              QUOTATION
            </div>
            <div className="grid grid-cols-[80px_10px_1fr] text-[11px] items-center">
              <span className="font-bold text-slate-700 uppercase">NUMBER</span>
              <span className="font-bold">:</span>
              <span className="font-mono font-bold text-[#0b4da2]">
                {savedQuotation?.quotation_no || 'AUTO-GENERATED'}
              </span>
            </div>
            <div className="grid grid-cols-[80px_10px_1fr] text-[11px] items-center">
              <span className="font-bold text-slate-700 uppercase">DATE</span>
              <span className="font-bold">:</span>
              <input
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300 text-[11px] bg-white font-bold"
              />
            </div>
            <div className="grid grid-cols-[80px_10px_1fr] text-[11px] items-center pt-1.5 border-t border-slate-200">
              <span className="font-bold text-slate-700 uppercase">CURRENCY</span>
              <span className="font-bold">:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300 text-[11px] bg-white font-bold"
              >
                <option value="RM">RM (MYR)</option>
                <option value="MYR">MYR</option>
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Middle Section: BILL TO Customer Form */}
        <div className="space-y-3 pb-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="font-black text-xs text-black uppercase tracking-wider flex items-center gap-2">
              <span>BILL TO:</span>
              {selectedCompany && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  ✓ Auto-filled from company details
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[11px] font-medium">Auto-fill from:</span>
              <select
                onChange={(e) => {
                  const comp = companies.find((c) => c.id === e.target.value || (c as any).company_id === e.target.value);
                  if (comp) applyCompanyToBilling(comp);
                }}
                className="px-2 py-1 rounded-lg border border-slate-300 text-[11px] bg-white text-slate-800 font-semibold cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>-- Select Company to Fill --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.roc ? `(${c.roc})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Client Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DIDI SMART TRADING (8000000816)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+60 12-345 6789"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address</label>
              <textarea
                rows={2}
                placeholder="150 MALL Lotus's Mergong&#10;No 68, Jalan KLC 3, Kulim Kedah"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="client@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
          </div>
        </div>

        {/* 3. Line Items Table: Dark gray bar header matching screenshot */}
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

          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#6b7280] text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3">Description</th>
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
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
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

        {/* 4. Calculation Summary: Totals with Gray Highlight Band */}
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
          <div className="w-full sm:w-80 space-y-2">
            <div className="grid grid-cols-[100px_10px_1fr] py-0.5 px-2 text-xs">
              <span className="font-bold text-slate-800">Subtotal</span>
              <span className="font-bold">:</span>
              <span className="text-right font-mono font-bold text-slate-900">
                {subtotal.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-[100px_10px_1fr] items-center py-0.5 px-2 text-xs">
              <div className="flex items-center gap-1 font-bold text-slate-800">
                <span>Tax</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className="w-12 px-1 py-0.5 rounded border border-slate-300 text-[10px] text-center bg-white"
                />
                <span>%</span>
              </div>
              <span className="font-bold">:</span>
              <span className="text-right font-mono font-bold text-slate-900">
                {taxAmount.toFixed(2)}
              </span>
            </div>

            {/* Total Row with Gray Band matching screenshot */}
            <div className="grid grid-cols-[100px_10px_1fr] bg-[#9ca3af] text-slate-900 font-extrabold py-1.5 px-3 rounded-xs shadow-xs">
              <span className="font-black text-xs uppercase">Total</span>
              <span className="font-black text-xs">:</span>
              <span className="text-right font-mono font-black text-sm">
                {currency} {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Action Controls */}
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
              <span>Preview &amp; Print</span>
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
            company_name: selectedCompany?.name || companyName || 'LOTUSS STORES (MALAYSIA) SDN BHD',
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
