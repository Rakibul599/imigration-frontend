'use client';

import { useState, useEffect } from 'react';
import {
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';

export type PaymentTabType = 'cash' | 'online' | 'card';

export interface CompanyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    id: number | string;
    companyName: string;
    roc?: string;
    email?: string;
    phone?: string;
    address?: string;
    planPackage?: string;
    packageDurationDays?: number;
    amount?: number | string;
  } | null;
  isSubmitting?: boolean;
  onSubmit: (paymentInfo: {
    amount: number;
    method: string;
    reference: string;
    bankName: string;
    notes: string;
    tab: PaymentTabType;
    slipData?: string | null;
    slipName?: string;
  }) => Promise<void> | void;
}

const MALAYSIAN_BANKS = [
  'Maybank (Malayan Banking)',
  'CIMB Bank',
  'Public Bank',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam Malaysia',
  'Affin Bank',
  'Standard Chartered',
  'HSBC Malaysia',
  'Other Bank',
];

export default function CompanyPaymentModal({
  isOpen,
  onClose,
  data,
  isSubmitting = false,
  onSubmit,
}: CompanyPaymentModalProps) {
  // Active Tab
  const [activeTab, setActiveTab] = useState<PaymentTabType>('cash');

  // Shared Base Amount
  const [amount, setAmount] = useState<number>(199);

  // Tab 1: Cash Payment State
  const [cashTendered, setCashTendered] = useState<number>(200);
  const [cashierName, setCashierName] = useState<string>('Accounts Desk');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [cashDate, setCashDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [cashNotes, setCashNotes] = useState<string>('');
  const [cashSlipFile, setCashSlipFile] = useState<File | null>(null);
  const [cashSlipPreview, setCashSlipPreview] = useState<string | null>(null);
  const [cashSlipName, setCashSlipName] = useState<string>('');

  const handleCashSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCashSlipFile(file);
      setCashSlipName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setCashSlipPreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setCashSlipPreview(null);
      }
    }
  };

  // Tab 2: Online Payment State
  const [onlineChannel, setOnlineChannel] = useState<string>('Online Banking (FPX)');
  const [bankName, setBankName] = useState<string>('Maybank (Malayan Banking)');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [onlineRef, setOnlineRef] = useState<string>('');
  const [onlineDate, setOnlineDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [onlineNotes, setOnlineNotes] = useState<string>('');

  // Tab 3: Debit / Credit Card State
  const [cardholderName, setCardholderName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardAuthCode, setCardAuthCode] = useState<string>('');
  const [cardNotes, setCardNotes] = useState<string>('');

  // Sync state on open
  useEffect(() => {
    if (data && isOpen) {
      const initialAmt = Number(data.amount) > 0 ? Number(data.amount) : 199;
      setAmount(initialAmt);
      setCashTendered(initialAmt);
      setReceiptNo(`RCP-${Date.now().toString().slice(-6)}`);
      setOnlineRef(`FPX-${Date.now().toString().slice(-6)}`);
      setCardAuthCode(`AUTH-${Date.now().toString().slice(-5)}`);
      setCardholderName(data.companyName || '');
      setCashNotes('');
      setOnlineNotes('');
      setCardNotes('');
      setCashSlipFile(null);
      setCashSlipPreview(null);
      setCashSlipName('');
    }
  }, [data, isOpen]);

  if (!isOpen || !data) return null;

  // Card helpers (matches free-trial design)
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'American Express';
    if (/^(6011|65|64[4-9])/.test(clean)) return 'Discover';
    if (/^35/.test(clean)) return 'JCB';
    return 'Credit / Debit Card';
  };

  const formatCardDisplay = (num: string) => {
    const digits = num.replace(/\D/g, '');
    if (!digits) return '•••• •••• •••• ••••';
    let formatted = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      if (i < digits.length) {
        formatted += digits[i];
      } else {
        formatted += '•';
      }
    }
    return formatted;
  };

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const handleCvvChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setCardCvv(digits);
  };

  // Change Calculation for Cash
  const changeDue = Math.max(0, cashTendered - amount);
  const isShortage = cashTendered < amount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let method = 'Cash';
    let reference = '';
    let resolvedBank = '';
    let finalNotes = '';

    if (activeTab === 'cash') {
      method = 'Cash Payment';
      reference = receiptNo || `RCP-${Date.now().toString().slice(-6)}`;
      resolvedBank = 'Cash In Hand';
      const changeStr = changeDue > 0 ? ` (Tendered: RM ${cashTendered.toFixed(2)}, Change: RM ${changeDue.toFixed(2)})` : '';
      const slipStr = cashSlipName ? ` [Slip: ${cashSlipName}]` : '';
      finalNotes = [
        `Cash Received by ${cashierName || 'Cashier'}${changeStr}${slipStr}`,
        cashNotes.trim(),
      ].filter(Boolean).join(' | ');
    } else if (activeTab === 'online') {
      method = onlineChannel || 'Online Banking (FPX)';
      reference = onlineRef || `TXN-${Date.now().toString().slice(-6)}`;
      resolvedBank = bankName === 'Other Bank' ? (customBankName.trim() || 'Other Bank') : bankName;
      finalNotes = [
        `Channel: ${onlineChannel}`,
        `Bank: ${resolvedBank}`,
        onlineNotes.trim(),
      ].filter(Boolean).join(' | ');
    } else if (activeTab === 'card') {
      const brand = getCardBrand(cardNumber);
      const maskedCardNo = cardNumber.replace(/\s+/g, '').slice(-4);
      method = `Credit / Debit Card (${brand})`;
      reference = cardAuthCode || (maskedCardNo ? `CARD-••••-${maskedCardNo}` : `CARD-${Date.now().toString().slice(-6)}`);
      resolvedBank = brand;
      finalNotes = [
        `Card: ${brand} ending in ${maskedCardNo || '••••'}`,
        cardholderName ? `Cardholder: ${cardholderName.trim()}` : null,
        cardExpiry ? `Exp: ${cardExpiry.trim()}` : null,
        cardNotes.trim(),
      ].filter(Boolean).join(' | ');
    }

    onSubmit({
      amount: amount > 0 ? amount : 199,
      method,
      reference,
      bankName: resolvedBank,
      notes: finalNotes,
      tab: activeTab,
      slipData: cashSlipPreview,
      slipName: cashSlipName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
              <DollarSign size={22} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white m-0">
                  Receive Payment &amp; Activate Package
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Official Receipt
                </span>
              </div>
              <p className="text-xs text-slate-300 m-0 mt-0.5">
                Record inbound payment for <strong className="text-white">{data.companyName}</strong> {data.roc ? `(${data.roc})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Company & Subscription Summary Banner */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0b4da2] font-black text-sm shrink-0 shadow-2xs">
                <Building2 size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block truncate max-w-[260px] sm:max-w-[340px]">
                  {data.companyName}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Package: <strong className="text-slate-800">{data.planPackage || 'Full Subscription'}</strong>
                  {data.packageDurationDays ? ` • ${data.packageDurationDays} Days Access` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Payment Amount
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-600">RM</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 font-mono font-black text-base text-[#0b4da2] bg-transparent border-0 border-b border-blue-200 focus:border-[#0b4da2] focus:outline-none text-right px-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Tab 1: Cash */}
              <button
                type="button"
                onClick={() => setActiveTab('cash')}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  activeTab === 'cash'
                    ? 'border-[#0b4da2] bg-blue-50/80 text-[#0b4da2] shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeTab === 'cash' ? 'bg-[#0b4da2] text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Banknote size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black block truncate">Cash Payment</span>
                  <span className="text-[10px] text-slate-500 block truncate">Cash / CDM / Counter</span>
                </div>
                {activeTab === 'cash' && <CheckCircle2 size={16} className="text-[#0b4da2] shrink-0" />}
              </button>

              {/* Tab 2: Online Payment */}
              <button
                type="button"
                onClick={() => setActiveTab('online')}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  activeTab === 'online'
                    ? 'border-[#0b4da2] bg-blue-50/80 text-[#0b4da2] shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeTab === 'online' ? 'bg-[#0b4da2] text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Globe size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black block truncate">Online Payment</span>
                  <span className="text-[10px] text-slate-500 block truncate">FPX / DuitNow / Transfer</span>
                </div>
                {activeTab === 'online' && <CheckCircle2 size={16} className="text-[#0b4da2] shrink-0" />}
              </button>

              {/* Tab 3: Debit / Credit Card */}
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  activeTab === 'card'
                    ? 'border-[#0b4da2] bg-blue-50/80 text-[#0b4da2] shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeTab === 'card' ? 'bg-[#0b4da2] text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <CreditCard size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black block truncate">Debit / Credit Card</span>
                  <span className="text-[10px] text-slate-500 block truncate">Visa / MasterCard</span>
                </div>
                {activeTab === 'card' && <CheckCircle2 size={16} className="text-[#0b4da2] shrink-0" />}
              </button>
            </div>
          </div>

          {/* TAB 1: CASH PAYMENT FORM */}
          {activeTab === 'cash' && (
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Banknote size={16} className="text-emerald-600" />
                  <span>Cash Payment &amp; Counter Receipt</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Instant Settlement
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Cash Tendered */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cash Tendered / Received (RM) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cashTendered}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] font-mono"
                    />
                  </div>
                </div>

                {/* Change Due Calculator */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Change Due (RM)
                  </label>
                  <div
                    className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-between font-mono ${
                      isShortage
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <span>{isShortage ? 'Shortage:' : 'Change:'}</span>
                    <span>RM {Math.abs(cashTendered - amount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Receipt Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receipt / Voucher No.
                  </label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="e.g. RCP-2026-001"
                    className="w-full px-3 py-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                {/* Cashier / Collector Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Received By (Cashier / Officer)
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={cashierName}
                      onChange={(e) => setCashierName(e.target.value)}
                      placeholder="e.g. Finance Officer"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Date
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="date"
                      value={cashDate}
                      onChange={(e) => setCashDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cash Deposit Notes
                  </label>
                  <input
                    type="text"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    placeholder="Handed directly to accounts dept..."
                    className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                {/* Cash Deposit Slip Upload */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Cash / CDM Deposit Slip <span className="text-slate-400 font-normal">(Receipt / Photo / PDF)</span>
                  </label>
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 text-center transition-all bg-slate-50/50 hover:bg-emerald-50/20">
                    {cashSlipPreview ? (
                      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={cashSlipPreview} alt="Deposit Slip" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-2xs" />
                          <div className="text-left min-w-0">
                            <span className="text-xs font-bold font-mono text-slate-800 truncate block">{cashSlipName}</span>
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={11} /> Slip attached
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCashSlipFile(null); setCashSlipPreview(null); setCashSlipName(''); }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer border border-rose-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : cashSlipName ? (
                      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                            <FileText size={20} />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="text-xs font-bold font-mono text-slate-800 truncate block">{cashSlipName}</span>
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={11} /> Document attached
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCashSlipFile(null); setCashSlipPreview(null); setCashSlipName(''); }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer border border-rose-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex items-center justify-center gap-2 py-2">
                        <Upload size={16} className="text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700">
                          Click to upload Deposit Slip / Receipt (PNG, JPG, PDF)
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleCashSlipUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ONLINE PAYMENT FORM */}
          {activeTab === 'online' && (
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Globe size={16} className="text-[#0b4da2]" />
                  <span>Online Banking, FPX &amp; DuitNow QR</span>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Electronic Transfer
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Transfer Channel */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transfer Channel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={onlineChannel}
                    onChange={(e) => setOnlineChannel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] cursor-pointer"
                  >
                    <option value="Online Banking (FPX)">Online Banking (FPX)</option>
                    <option value="DuitNow QR Payment">DuitNow QR Payment</option>
                    <option value="Instant Bank Transfer">Instant Bank Transfer (IBG)</option>
                    <option value="CDM Cash Deposit Machine">CDM Cash Deposit Machine</option>
                    <option value="Cheque Deposit">Cheque Deposit</option>
                  </select>
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] cursor-pointer"
                  >
                    {MALAYSIAN_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* If Other Bank, custom input */}
                {bankName === 'Other Bank' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Specify Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      placeholder="e.g. Bank Muamalat, OCBC..."
                      className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>
                )}

                {/* Transaction Reference / DuitNow Reference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transaction Ref / DuitNow ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={onlineRef}
                    onChange={(e) => setOnlineRef(e.target.value)}
                    placeholder="e.g. FPX-98765432 or DUITNOW-1234"
                    className="w-full px-3 py-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transfer Date
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="date"
                      value={onlineDate}
                      onChange={(e) => setOnlineDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Verification Notes
                  </label>
                  <input
                    type="text"
                    value={onlineNotes}
                    onChange={(e) => setOnlineNotes(e.target.value)}
                    placeholder="Verified against online banking portal..."
                    className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEBIT / CREDIT CARD (FOLLOWS EXACT FREE-TRIAL CARD DESIGN) */}
          {activeTab === 'card' && (
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CreditCard size={16} className="text-[#0b4da2]" />
                  <span>Debit / Credit Card Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-700 italic px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200">
                    VISA
                  </span>
                  <span className="text-[10px] font-black text-amber-700 px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200">
                    MasterCard
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left Column: Virtual Credit Card Mockup (Exact replica of free-trial page) */}
                <div className="lg:col-span-5 flex justify-center">
                  <div className="w-full max-w-[340px] aspect-[1.586] rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white shadow-xl border border-slate-700/80 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
                    <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

                    {/* Top Row: Chip & Brand */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 p-0.5 shadow-sm border border-yellow-300/60 flex items-center justify-center">
                          <div className="w-full h-full border border-amber-600/40 rounded-[2px] grid grid-cols-2 gap-0.5 p-0.5 opacity-80">
                            <div className="border border-amber-700/30" />
                            <div className="border border-amber-700/30" />
                            <div className="border border-amber-700/30" />
                            <div className="border border-amber-700/30" />
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                          <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                        </svg>
                      </div>

                      <div className="text-right">
                        {getCardBrand(cardNumber) === 'Visa' ? (
                          <span className="text-xl font-black italic tracking-widest text-white drop-shadow">VISA</span>
                        ) : getCardBrand(cardNumber) === 'Mastercard' ? (
                          <div className="flex items-center -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-red-500 opacity-90 shadow-sm" />
                            <div className="w-6 h-6 rounded-full bg-amber-400 opacity-90 shadow-sm" />
                          </div>
                        ) : getCardBrand(cardNumber) === 'American Express' ? (
                          <span className="text-xs font-black tracking-widest text-sky-300 uppercase px-1.5 py-0.5 border border-sky-400/40 rounded">
                            AMEX
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded">
                            <CreditCard size={12} />
                            <span>Card</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Number display */}
                    <div className="relative z-10 py-1">
                      <div className="font-mono text-base sm:text-lg tracking-[0.2em] text-white drop-shadow-sm font-semibold select-none">
                        {formatCardDisplay(cardNumber)}
                      </div>
                    </div>

                    {/* Bottom Row: Cardholder & Expiry */}
                    <div className="flex items-end justify-between relative z-10 text-[10px] tracking-wider uppercase text-slate-300">
                      <div className="max-w-[65%]">
                        <span className="text-[8px] text-slate-400 block mb-0.5">Cardholder</span>
                        <span className="font-bold text-white tracking-wide truncate block text-xs font-mono">
                          {cardholderName.trim() || 'CARDHOLDER NAME'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-slate-400 block mb-0.5">Expires</span>
                        <span className="font-mono font-bold text-white text-xs">
                          {cardExpiry.trim() || 'MM/YY'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Card Inputs */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Cardholder Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cardholder Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder="NAME ON CARD"
                        className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] uppercase"
                      />
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Card Number (Visa / MasterCard) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                      />
                    </div>
                  </div>

                  {/* Expiration Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Expires (MM/YY) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>

                  {/* CVV */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CVV / Security Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => handleCvvChange(e.target.value)}
                      placeholder="•••"
                      className="w-full px-3 py-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>

                  {/* Authorization / POS Terminal Code */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      POS Terminal / Authorization Code
                    </label>
                    <input
                      type="text"
                      value={cardAuthCode}
                      onChange={(e) => setCardAuthCode(e.target.value)}
                      placeholder="e.g. AUTH-84920"
                      className="w-full px-3 py-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              Recorded into official Laravel database invoices &amp; activates full company subscription.
            </span>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || amount <= 0}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-[#0b4da2] to-[#083877] hover:from-[#093e82] hover:to-[#062c5e] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border-0 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Confirm Payment &amp; Activate (RM {amount.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
