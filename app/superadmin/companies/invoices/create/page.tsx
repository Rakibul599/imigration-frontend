'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import {
  CompanyInvoice,
  InvoiceItem,
  PLAN_PACKAGES,
  createInvoice,
} from '@/lib/companyTrialAndFinanceStorage';
import { Company, resolveFileUrl } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import PrintableInvoiceModal from '@/components/PrintableInvoiceModal';
import { getMasterAdminUser } from '@/lib/auth';

function CreateInvoiceContent() {
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
  const [packageName, setPackageName] = useState<string>('');

  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState<string>('RM');
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(6);

  // Payment fields
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid' | 'Partial'>('Paid');
  const [amountPaid, setAmountPaid] = useState<number>(5175.45);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState<string>(() => `REF-${Date.now().toString().slice(-6)}`);
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [bankName, setBankName] = useState<string>('SCB');
  const [bankAccountNo, setBankAccountNo] = useState<string>('770578000000816');
  const [notes, setNotes] = useState<string>('This invoice is computer generated and does not require any signature.');

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: 'F9-Rental for August 2026',
      qty: 1,
      unit_price: 4882.50,
      total: 4882.50,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedInvoice, setSavedInvoice] = useState<CompanyInvoice | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Pre-fill from query params if passed
  useEffect(() => {
    const cId = searchParams.get('company_id');
    const cName = searchParams.get('company_name');
    const custName = searchParams.get('customer_name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const pkg = searchParams.get('package');

    if (cId) setSelectedCompanyId(cId);
    if (cName) setCompanyName(cName);
    if (custName) setCustomerName(custName);
    if (email) setCustomerEmail(email);
    if (phone) setCustomerPhone(phone);
    if (pkg) {
      setPackageName(pkg);
      const foundPkg = PLAN_PACKAGES.find((p) => p.label.toLowerCase().includes(pkg.toLowerCase()));
      if (foundPkg) {
        setItems([
          {
            description: `AutoCount Enterprise Subscription: ${foundPkg.label} (${foundPkg.durationDays} Days)`,
            qty: 1,
            unit_price: foundPkg.price,
            total: foundPkg.price,
          },
        ]);
        setAmountPaid(foundPkg.price);
      }
    }
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

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId || (c as any).company_id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  const applyCompanyToBilling = (comp: Company) => {
    setCompanyName(comp.name);
    // Custom/client name auto fills with company name (+ ROC if present)
    const formattedClientName = comp.roc ? `${comp.name} (${comp.roc})` : comp.name;
    setCustomerName(formattedClientName);
    setCustomerAddress(comp.address || '');
    setCustomerPhone(comp.phone || '');
    setCustomerEmail(comp.email || '');

    // Auto-fill bank details from company
    if (comp.bankName) setBankName(comp.bankName);
    if (comp.bankAccountNo) setBankAccountNo(comp.bankAccountNo);
  };

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

  const handlePackageSelect = (pkgKey: string) => {
    if (!pkgKey) return;
    const pkg = PLAN_PACKAGES.find((p) => p.key === pkgKey);
    if (pkg) {
      setPackageName(pkg.label);
      setItems([
        {
          description: `Cloud ERP System License: ${pkg.label} (${pkg.durationDays} Days)`,
          qty: 1,
          unit_price: pkg.price,
          total: pkg.price,
        },
      ]);
      if (paymentStatus === 'Paid') {
        const taxable = Math.max(0, pkg.price - discount);
        const tax = round2(taxable * (taxPercentage / 100));
        setAmountPaid(round2(taxable + tax));
      }
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
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
        description: 'Implementation, Setup & Dedicated Support',
        qty: 1,
        unit_price: 250,
        total: 250,
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
  const balanceDue = Math.max(0, round2(totalAmount - amountPaid));

  const handlePaymentStatusChange = (status: 'Pending' | 'Paid' | 'Partial') => {
    setPaymentStatus(status);
    if (status === 'Paid') {
      setAmountPaid(totalAmount);
    } else if (status === 'Pending') {
      setAmountPaid(0);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!customerName.trim()) {
      setErrorMessage('Please enter Customer / Billed To Name.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one line item.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await createInvoice({
        company_id: selectedCompanyId || undefined,
        company_name: selectedCompany?.name || companyName.trim() || undefined,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
        package_name: packageName || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        items,
        discount,
        tax_percentage: taxPercentage,
        amount_paid: amountPaid,
        currency,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        payment_reference: paymentRef || undefined,
        payment_date: paymentStatus === 'Paid' ? paymentDate : undefined,
        bank_name: bankName || selectedCompany?.bankName || undefined,
        bank_account_no: bankAccountNo || selectedCompany?.bankAccountNo || undefined,
        notes,
      });

      setSavedInvoice(res);
      setShowPreviewModal(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create invoice');
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
            href={`${rootPath}/companies/invoices`}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors no-underline"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="text-emerald-600" size={24} />
              <span>Create Customer Payment Invoice</span>
            </h1>
            <p className="text-xs text-slate-500">
              Generate official tax invoices and payment receipts matching Malaysian corporate invoicing standards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`${rootPath}/companies/invoices`}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold no-underline"
          >
            Invoice List
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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-900 block">
              Select Issuing Company / Employer <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 m-0">
              When selected, the company logo and heading automatically update in the invoice header and printout.
            </p>
          </div>
        </div>

        <select
          value={selectedCompanyId}
          onChange={handleCompanySelect}
          className="w-full sm:w-80 px-3 py-2.5 rounded-xl border border-emerald-300 text-xs bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
        >
          <option value="">-- Choose Company (e.g. Lotus&apos;s, Gamuda, etc.) --</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.roc || c.id})
            </option>
          ))}
        </select>
      </div>

      {/* Main Invoice Paper Form (Live representation matching user screenshot) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        {/* 1. Paper Header: Dynamic Company Logo & Official Heading */}
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

          {/* Invoice Metadata Box (Matches screenshot) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full sm:w-72 space-y-2 text-xs shrink-0">
            <div className="font-black text-sm text-black uppercase tracking-wider mb-2">
              TAX INVOICE
            </div>
            <div className="grid grid-cols-[80px_10px_1fr] text-[11px] items-center">
              <span className="font-bold text-slate-700 uppercase">NUMBER</span>
              <span className="font-bold">:</span>
              <span className="font-mono font-bold text-emerald-700">
                {savedInvoice?.invoice_no || '102302855 (AUTO)'}
              </span>
            </div>
            <div className="grid grid-cols-[80px_10px_1fr] text-[11px] items-center">
              <span className="font-bold text-slate-700 uppercase">DATE</span>
              <span className="font-bold">:</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+60 12-345 6789"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address</label>
              <textarea
                rows={2}
                placeholder="150 MALL Lotus's Mergong&#10;No 68, Jalan KLC 3, Kulim Landmak Central, 9000 Kulim Kedah"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="accounts@didismart.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Fast Package Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fast Package Preset (Optional)
                </label>
                <select
                  onChange={(e) => handlePackageSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs bg-emerald-50/50 text-emerald-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Custom Items (No Preset) --</option>
                  {PLAN_PACKAGES.map((pkg) => (
                    <option key={pkg.key} value={pkg.key}>
                      {pkg.label} ({pkg.currency} {pkg.price}) - {pkg.durationDays} Days Subscription
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Line Items Table (Matches Screenshot: Dark Gray Header, Clean Columns) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
              Itemized Charges &amp; Services
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer bg-transparent border-0"
            >
              <Plus size={14} />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#6b7280] text-white font-bold text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-3 w-28 text-right">Gross</th>
                  <th className="py-2.5 px-3 w-28 text-right">Tax</th>
                  <th className="py-2.5 px-4 w-32 text-right">{currency}</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {/* SST sub-header matching user screenshot */}
                <tr className="bg-slate-50/40">
                  <td colSpan={5} className="py-1 px-4 text-[11px] italic text-slate-600 underline">
                    Subject to {taxPercentage}% SST
                  </td>
                </tr>

                {items.map((it, idx) => {
                  const itemGross = it.qty * it.unit_price;
                  const itemTax = round2(itemGross * (taxPercentage / 100));
                  const itemTotal = round2(itemGross + itemTax);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="e.g. F9-Rental for August 2026"
                          className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="w-24 px-2 py-1.5 rounded border border-slate-200 text-xs text-right focus:outline-none focus:border-emerald-600 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {itemTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900 font-mono">
                        {itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-center">
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Totals Block (Matching exact Malaysian Corporate invoice layout) */}
        <div className="flex flex-col sm:flex-row items-start justify-end gap-6 pt-2">
          <div className="w-full sm:w-80 space-y-1 text-xs">
            {/* Subtotal row */}
            <div className="grid grid-cols-[100px_20px_1fr] py-1 px-3 items-center">
              <span className="font-black text-black">Subtotal</span>
              <span className="font-bold text-center">:</span>
              <span className="text-right font-mono font-bold text-black">
                {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Tax row */}
            <div className="grid grid-cols-[100px_20px_1fr] py-1 px-3 items-center">
              <span className="font-black text-black">Tax ({taxPercentage}%)</span>
              <span className="font-bold text-center">:</span>
              <span className="text-right font-mono font-bold text-black">
                {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total Row with Solid Gray Band matching screenshot */}
            <div className="grid grid-cols-[100px_20px_1fr] py-1.5 px-3 bg-[#9ca3af] text-black font-black items-center rounded-xs">
              <span className="font-black text-black">Total</span>
              <span className="font-black text-center">:</span>
              <span className="text-right font-mono font-black text-black">
                {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Tax % and Discount tuning controls */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center justify-between">
                <span>Tax Rate (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 rounded border border-slate-300 text-right bg-white text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Discount ({currency}):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-20 px-1.5 py-0.5 rounded border border-slate-300 text-right bg-white text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Payment Details Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <CreditCard size={15} className="text-emerald-700" />
              <span>Payment Details &amp; Settlement Status</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Status:</span>
              {(['Paid', 'Pending', 'Partial'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handlePaymentStatusChange(st)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer border transition-all ${
                    paymentStatus === st
                      ? st === 'Paid'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : st === 'Pending'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount Paid ({currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
              >
                <option value="Bank Transfer">Bank Transfer (IBG/DuitNow)</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Cash / Cheque">Cash / Cheque</option>
                <option value="Online Payment Gateway">Online Gateway</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Ref / Receipt No.</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Name &amp; Account</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. SCB 770578000000816"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
              />
            </div>
          </div>
        </div>

        {/* 6. Footer Terms & Malaysian Corporate Notices (matching screenshot) */}
        <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-700 space-y-2">
          <p className="m-0 italic text-slate-600">
            This invoice is computer generated and does not require any signature.
          </p>
          <div className="space-y-0.5 text-slate-800 pt-1">
            <p className="m-0">
              Please make payment payable to <span className="font-bold text-black uppercase">{selectedCompany?.name || companyName || 'LOTUSS STORES (MALAYSIA) SDN BHD'}</span>
            </p>
            <p className="m-0">
              Electronic Payments: <span className="font-bold text-black">{bankName || selectedCompany?.bankName || 'SCB'}</span>, Account No. : <span className="font-bold text-black font-mono">{bankAccountNo || selectedCompany?.bankAccountNo || '770578000000816'}</span>
            </p>
            <p className="m-0 text-slate-600">
              Interest at 2% per month shall be levied on overdue accounts.
            </p>
          </div>
        </div>

        {/* 7. Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {savedInvoice ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check size={14} /> Invoice #{savedInvoice.invoice_no} Saved Successfully
              </span>
            ) : (
              <span>Fill details and preview or save invoice.</span>
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
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold cursor-pointer shadow-md hover:shadow transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Save &amp; Issue Customer Payment Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Printable Invoice Modal */}
      {showPreviewModal && (
        <PrintableInvoiceModal
          invoice={{
            id: savedInvoice?.id || 0,
            invoice_no: savedInvoice?.invoice_no || '102302855',
            company_id: selectedCompanyId || undefined,
            company_name: selectedCompany?.name || companyName || 'LOTUSS STORES (MALAYSIA) SDN BHD',
            customer_name: customerName || 'DIDI SMART TRADING (8000000816)',
            customer_email: customerEmail || 'accounts@didismart.com',
            customer_phone: customerPhone || undefined,
            customer_address: customerAddress || '150 MALL Lotus\'s Mergong\nNo 68, Jalan KLC 3,\nKulim Landmak Central,\n9000\nKulim Kedah',
            package_name: packageName || undefined,
            invoice_date: invoiceDate,
            due_date: dueDate || undefined,
            items,
            subtotal,
            discount,
            tax_percentage: taxPercentage,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            amount_paid: amountPaid,
            balance_due: balanceDue,
            currency,
            payment_status: paymentStatus,
            payment_method: paymentMethod || 'Bank Transfer',
            payment_reference: paymentRef || undefined,
            payment_date: paymentStatus === 'Paid' ? paymentDate : undefined,
            bank_name: bankName || selectedCompany?.bankName || 'SCB',
            bank_account_no: bankAccountNo || selectedCompany?.bankAccountNo || '770578000000816',
            notes,
            created_at: savedInvoice?.created_at || new Date().toISOString(),
            updated_at: savedInvoice?.updated_at || new Date().toISOString(),
          }}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Invoice Builder...</div>}>
      <CreateInvoiceContent />
    </Suspense>
  );
}
