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
  Clock,
  Coins,
  CreditCard,
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
  Wallet,
  X,
} from 'lucide-react';
import {
  CompanyInvoice,
  InvoiceItem,
  PLAN_PACKAGES,
  createInvoice,
} from '@/lib/companyTrialAndFinanceStorage';
import { Company } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import PrintableInvoiceModal from '@/components/PrintableInvoiceModal';

function CreateInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState<string>('MYR');
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);

  // Payment fields
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid' | 'Partial'>('Paid');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState<string>(() => `REF-${Date.now().toString().slice(-6)}`);
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [bankName, setBankName] = useState<string>('Maybank');
  const [bankAccountNo, setBankAccountNo] = useState<string>('5140 1234 5678');
  const [notes, setNotes] = useState<string>('Official Tax Invoice & Payment Receipt. Thank you for your business.');

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: 'AutoCount Cloud Accounting & Payroll Management Enterprise License',
      qty: 1,
      unit_price: 499,
      total: 499,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedInvoice, setSavedInvoice] = useState<CompanyInvoice | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Pre-fill from query params if passed
  useEffect(() => {
    const cName = searchParams.get('company_name');
    const custName = searchParams.get('customer_name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const pkg = searchParams.get('package');

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
      const comp = companies.find((c) => c.id === cId);
      if (comp) {
        setCompanyName(comp.name);
        if (comp.email && !customerEmail) setCustomerEmail(comp.email);
        if (comp.phone && !customerPhone) setCustomerPhone(comp.phone);
        if (comp.address && !customerAddress) setCustomerAddress(comp.address);
        if (comp.bankName) setBankName(comp.bankName);
        if (comp.bankAccountNo) setBankAccountNo(comp.bankAccountNo);
        if (comp.directors?.[0]?.name && !customerName) {
          setCustomerName(comp.directors[0].name);
        }
      }
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
        setAmountPaid(pkg.price);
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
        company_name: companyName.trim() || undefined,
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
        bank_name: bankName || undefined,
        bank_account_no: bankAccountNo || undefined,
        notes,
      });

      setSavedInvoice(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create invoice');
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
            href="/companies/invoices"
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
              Generate official tax invoices and payment receipts for subscriptions, packages, and custom client services.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/companies/invoices"
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

      {/* Main Invoice Paper Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Paper Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">TAX INVOICE &amp; PAYMENT RECEIPT</div>
            <p className="text-xs text-slate-500 mt-0.5">Official Commercial Billing &amp; Electronic Document</p>
            <div className="mt-3 text-xs text-slate-600 space-y-0.5">
              <div className="font-semibold text-slate-800">Agency Operating Management Center</div>
              <div>Financial &amp; Enterprise Services Division</div>
              <div>billing@agencyportal.com | +60 3-8888 9999</div>
            </div>
          </div>

          {/* Invoice Metadata Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full sm:w-72 space-y-2.5 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Invoice No.
              </label>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {savedInvoice?.invoice_no || 'AUTO-GENERATED ON SAVE'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
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

        {/* Company & Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200 text-xs">
          {/* Company Selection */}
          <div className="space-y-3">
            <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Building2 size={14} className="text-[#0b4da2]" />
              <span>Billed Company</span>
            </label>
            <select
              value={selectedCompanyId}
              onChange={handleCompanySelect}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
            >
              <option value="">-- Manual Client Entry / Custom Company --</option>
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
                placeholder="e.g. Apex Global Industries Sdn Bhd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>

            {/* Quick Package Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fast Package Preset (Auto-fills items &amp; price)
              </label>
              <select
                onChange={(e) => handlePackageSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-blue-200 text-xs bg-blue-50/50 text-[#0b4da2] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

          {/* Customer / Billed To Recipient */}
          <div className="space-y-3">
            <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>Billed To (Client / Customer)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Attn Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Tan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
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
                placeholder="accounts@clientcompany.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
              <input
                type="text"
                placeholder="Business address, city, postcode..."
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
              Invoice Line Items
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
                        placeholder="Service or package description..."
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

        {/* Payment Details Section */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <CreditCard size={15} className="text-[#0b4da2]" />
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
                placeholder="e.g. Maybank 514012345678"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* Pricing Totals & Notes */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pt-4 border-t border-slate-200 text-xs">
          <div className="w-full sm:flex-1 space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes / Terms</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
              />
            </div>
          </div>

          {/* Pricing Totals Box */}
          <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
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
              <span>Total Invoice Amount:</span>
              <span className="text-base text-[#0b4da2]">{currency} {totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
              <span>Amount Paid:</span>
              <span>{currency} {amountPaid.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1 border-t border-slate-200">
              <span>Balance Due:</span>
              <span className={balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                {currency} {balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {savedInvoice ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check size={14} /> Invoice #{savedInvoice.invoice_no} Saved Successfully
              </span>
            ) : (
              <span>New invoice</span>
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
            invoice_no: savedInvoice?.invoice_no || 'INV-PREVIEW-DRAFT',
            company_id: selectedCompanyId || undefined,
            company_name: companyName || 'Company Name',
            customer_name: customerName || 'Valued Customer',
            customer_email: customerEmail || 'customer@example.com',
            customer_phone: customerPhone || undefined,
            customer_address: customerAddress || undefined,
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
            bank_name: bankName || 'Maybank',
            bank_account_no: bankAccountNo || '5140 1234 5678',
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
