'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  Check,
  RefreshCw,
  Upload,
  FileText,
  Wallet,
  Clock,
} from 'lucide-react';
import { Company } from '@/lib/companies';

export type WalletPayTabType = 'cash' | 'online' | 'card';

export interface AddWalletSubmitPayload {
  amount: number;
  payment_method: string;
  reference: string;
  notes: string;
  tab: WalletPayTabType;
  payment_slip: string | null;
  payment_slip_name: string | null;
}

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  defaultDepositorName?: string;
  isSubmitting?: boolean;
  onSubmit: (payload: AddWalletSubmitPayload) => Promise<void> | void;
}

const MALAYSIAN_BANKS = [
  'Maybank (Malayan Banking)',
  'CIMB Bank',
  'Public Bank',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam Malaysia',
  'Bank Rakyat',
  'Alliance Bank',
  'Affin Bank',
  'OCBC Bank',
  'HSBC Bank Malaysia',
  'Standard Chartered',
  'UOB Malaysia',
  'BSN (Bank Simpanan Nasional)',
  'Other Bank',
];

const QUICK_PRESETS = [100, 500, 1000, 5000, 10000];

export default function AddWalletModal({
  isOpen,
  onClose,
  company,
  defaultDepositorName = 'Master Admin',
  isSubmitting = false,
  onSubmit,
}: AddWalletModalProps) {
  const [activeTab, setActiveTab] = useState<WalletPayTabType>('cash');
  const [amountInput, setAmountInput] = useState<string>('');

  // Tab 1: Cash Payment States
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [depositorName, setDepositorName] = useState<string>(defaultDepositorName);
  const [cashDate, setCashDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [cashNotes, setCashNotes] = useState<string>('');
  const [slipData, setSlipData] = useState<string | null>(null);
  const [slipName, setSlipName] = useState<string>('');

  // Tab 2: Online Payment States
  const [onlineChannel, setOnlineChannel] = useState<string>('Online Banking (FPX)');
  const [bankName, setBankName] = useState<string>('Maybank (Malayan Banking)');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [onlineRef, setOnlineRef] = useState<string>('');
  const [onlineDate, setOnlineDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [onlineNotes, setOnlineNotes] = useState<string>('');

  // Tab 3: Debit / Credit Card States
  const [cardholderName, setCardholderName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardAuthCode, setCardAuthCode] = useState<string>('');

  // Reset form ONLY when modal opens for a company
  const targetCompanyId = company?.id;
  useEffect(() => {
    if (isOpen && company) {
      setActiveTab('cash');
      setAmountInput('');
      setReceiptNo(`TOPUP-${Date.now().toString().slice(-6)}`);
      setDepositorName(defaultDepositorName || 'Master Admin');
      setCashDate(new Date().toISOString().split('T')[0]);
      setCashNotes(`Wallet top-up for ${company.name}`);
      setSlipData(null);
      setSlipName('');

      setOnlineChannel('Online Banking (FPX)');
      setBankName('Maybank (Malayan Banking)');
      setCustomBankName('');
      setOnlineRef(`FPX-${Date.now().toString().slice(-6)}`);
      setOnlineDate(new Date().toISOString().split('T')[0]);
      setOnlineNotes(`Wallet top-up for ${company.name}`);

      setCardholderName((company.name || '').toUpperCase().slice(0, 32));
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardAuthCode(`AUTH-${Date.now().toString().slice(-5)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetCompanyId]);

  if (!isOpen || !company) return null;

  const parsedAmount = parseFloat(amountInput) || 0;
  const currentBalance = Number(company.wallet_balance) || 0;
  const accountDisplay =
    company.wallet_account_no ||
    company.bankAccountNo ||
    `WAL-${String(company.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;

  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Deposit slip file size must be under 5MB.');
      return;
    }
    setSlipName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSlipData(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const handleCvvChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    setCardCvv(raw);
  };

  const getCardBrand = (num: string): string => {
    const raw = num.replace(/\D/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(raw) || /^2[2-7]/.test(raw)) return 'Mastercard';
    if (/^3[47]/.test(raw)) return 'American Express';
    return 'Card';
  };

  const formatCardDisplay = (num: string): string => {
    const raw = num.replace(/\D/g, '');
    if (!raw) return '•••• •••• •••• ••••';
    const padded = raw.padEnd(16, '•');
    return `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)} ${padded.slice(12, 16)}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (activeTab === 'online' || activeTab === 'card') {
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      alert('Please enter a valid positive top-up amount in RM.');
      return;
    }

    const method = 'Cash Payment';
    const reference = receiptNo.trim() || `TOPUP-${Date.now().toString().slice(-6)}`;
    const slipStr = slipName ? ` [Slip: ${slipName}]` : '';
    const finalNotes = [
      `Cash Deposited by ${depositorName.trim() || 'Master Admin'} on ${cashDate}${slipStr}`,
      cashNotes.trim(),
    ]
      .filter(Boolean)
      .join(' | ');

    await onSubmit({
      amount: parsedAmount,
      payment_method: method,
      reference,
      notes: finalNotes,
      tab: activeTab,
      payment_slip: slipData,
      payment_slip_name: slipName || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header (Exact Payment Modal Design) */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
              <Wallet size={22} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white m-0">
                  Add Wallet Balance &amp; Top Up
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Acco Wallet Recharge
                </span>
              </div>
              <p className="text-xs text-slate-300 m-0 mt-0.5">
                Submit wallet top-up for <strong className="text-white">{company.name}</strong> •{' '}
                <span className="font-mono text-emerald-300">{accountDisplay}</span>
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Account & Live Balance Overview Card (Left: Balance, Right: Company Name & Account No) */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-slate-50 to-blue-50/50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            {/* Left Side: Live Balance */}
            <div className="shrink-0 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Balance
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 block leading-none tracking-tight">
                RM {currentBalance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Right Side: Company Name & Account No */}
            <div className="min-w-0 flex-1 sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Company Name
              </span>
              <div className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight" title={company.name}>
                {company.name}
              </div>
              <div className="text-xs text-slate-600 font-medium mt-1.5 flex items-center sm:justify-end gap-1.5 flex-wrap">
                <span className="text-slate-400">Account No:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                  {accountDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector Tabs (Exact Payment Modal Design) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Tab 1: Cash Payment */}
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
                  <span className="text-[10px] text-slate-500 block truncate">Cash / CDM / Upload Slip</span>
                </div>
                {activeTab === 'cash' && <CheckCircle2 size={16} className="text-[#0b4da2] shrink-0" />}
              </button>

              {/* Tab 2: Online Payment (Coming Soon) */}
              <button
                type="button"
                onClick={() => setActiveTab('online')}
                className={`relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  activeTab === 'online'
                    ? 'border-amber-400 bg-amber-50/70 text-slate-800 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeTab === 'online' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-200/70 text-slate-500'
                  }`}
                >
                  <Globe size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black truncate">Online Payment</span>
                  </div>
                  <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock size={9} />
                    Coming Soon
                  </span>
                </div>
              </button>

              {/* Tab 3: Debit / Credit Card (Coming Soon) */}
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  activeTab === 'card'
                    ? 'border-amber-400 bg-amber-50/70 text-slate-800 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeTab === 'card' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-200/70 text-slate-500'
                  }`}
                >
                  <CreditCard size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black truncate">Debit / Credit Card</span>
                  </div>
                  <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock size={9} />
                    Coming Soon
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Dedicated Top-Up Amount Input Card (Shown for Active Cash Tab) */}
          {activeTab === 'cash' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Top-Up Amount (RM)</span>
                <span className="text-rose-500">*</span>
              </label>
              {parsedAmount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  After Approval: RM {(currentBalance + parsedAmount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  Enter custom amount or pick a preset below
                </span>
              )}
            </div>

            {/* Styled Full-Width Currency Input */}
            <div className="relative flex items-center rounded-xl border-2 border-slate-200 focus-within:border-[#0b4da2] focus-within:ring-4 focus-within:ring-blue-500/10 bg-slate-50/50 focus-within:bg-white transition-all overflow-hidden">
              <div className="px-4 py-3 bg-blue-50/80 border-r border-slate-200 text-sm font-black font-mono text-[#0b4da2] select-none shrink-0">
                RM
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 font-mono font-black text-xl sm:text-2xl text-slate-900 placeholder:text-slate-300 bg-transparent border-0 focus:outline-none"
              />
              {parsedAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountInput('')}
                  title="Clear amount"
                  className="mr-3 w-7 h-7 rounded-full bg-slate-200/80 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer border-0 shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Preset Amount Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Add:</span>
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const currentVal = parseFloat(amountInput) || 0;
                    setAmountInput(String(currentVal + preset));
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#0b4da2] text-slate-700 hover:text-white border border-slate-200 hover:border-[#0b4da2] cursor-pointer transition-all shadow-2xs active:scale-95"
                >
                  +RM {preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* TAB 1: CASH PAYMENT FORM */}
          {activeTab === 'cash' && (
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Banknote size={16} className="text-emerald-600" />
                  <span>Cash Payment &amp; Deposit Slip</span>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Super Admin Verification
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Receipt Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receipt / Voucher No.
                  </label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="e.g. TOPUP-2026-001"
                    className="w-full px-3 py-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                {/* Depositor / Officer Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposited By (Master Admin / Staff)
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={depositorName}
                      onChange={(e) => setDepositorName(e.target.value)}
                      placeholder="e.g. Finance Officer"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposit Date
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
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cash Deposit Notes
                  </label>
                  <input
                    type="text"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    placeholder="Handed directly to accounts dept / CDM deposit..."
                    className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                {/* Cash Deposit Slip Upload */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Cash / CDM Deposit Slip <span className="text-slate-400 font-normal">(Receipt / Photo / PDF — Visible in Super Admin Acco Wallet)</span>
                  </label>
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 text-center transition-all bg-slate-50/50 hover:bg-emerald-50/20">
                    {slipData && slipData.startsWith('data:image') ? (
                      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={slipData}
                            alt="Deposit Slip"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0"
                          />
                          <div className="text-left min-w-0">
                            <span className="text-xs font-bold font-mono text-slate-800 truncate block">{slipName}</span>
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={11} /> Slip attached &amp; ready for Super Admin review
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlipData(null);
                            setSlipName('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer border border-rose-200 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : slipName ? (
                      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                            <FileText size={20} />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="text-xs font-bold font-mono text-slate-800 truncate block">{slipName}</span>
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={11} /> Document attached &amp; ready for Super Admin review
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlipData(null);
                            setSlipName('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer border border-rose-200 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex items-center justify-center gap-2 py-2.5">
                        <Upload size={16} className="text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700">
                          Click to upload Deposit Slip / Receipt (PNG, JPG, PDF)
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleSlipUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ONLINE PAYMENT — FULL DESIGN PRESERVED IN DISABLED / COMING SOON STATE */}
          {activeTab === 'online' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Coming Soon Banner */}
              <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 text-xs text-amber-900">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="font-extrabold block">Online Payment — Coming Soon (Currently Disabled)</span>
                    <span className="text-[11px] text-amber-800">
                      FPX &amp; DuitNow gateway is being integrated. Please use <strong>Cash Payment</strong> to top up now.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('cash')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-[#083877] text-white text-[11px] font-bold cursor-pointer border-0 shrink-0 transition-colors"
                >
                  <Banknote size={13} />
                  <span>Use Cash Payment</span>
                </button>
              </div>

              {/* Disabled Online Payment Form Design */}
              <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4 opacity-55 pointer-events-none select-none grayscale-[20%]" aria-disabled="true">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Globe size={16} className="text-[#0b4da2]" />
                    <span>Online Banking, FPX &amp; DuitNow QR</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Coming Soon
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Transfer Channel <span className="text-rose-500">*</span>
                    </label>
                    <select
                      disabled
                      value={onlineChannel}
                      onChange={(e) => setOnlineChannel(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                    >
                      <option value="Online Banking (FPX)">Online Banking (FPX)</option>
                      <option value="DuitNow QR Payment">DuitNow QR Payment</option>
                      <option value="Instant Bank Transfer">Instant Bank Transfer (IBG)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <select
                      disabled
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                    >
                      {MALAYSIAN_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Transaction Ref / DuitNow ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={onlineRef}
                      onChange={(e) => setOnlineRef(e.target.value)}
                      placeholder="e.g. FPX-98765432"
                      className="w-full px-3 py-2 text-xs font-mono text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Date</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="date"
                        disabled
                        value={onlineDate}
                        onChange={(e) => setOnlineDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Verification Notes</label>
                    <input
                      type="text"
                      disabled
                      value={onlineNotes}
                      onChange={(e) => setOnlineNotes(e.target.value)}
                      placeholder="Online banking transfer remarks..."
                      className="w-full px-3 py-2 text-xs text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Upload Online Transfer Receipt <span className="text-slate-400 font-normal">(Optional Screenshot / PDF)</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-2.5 text-center bg-slate-100/70">
                      <div className="flex items-center justify-center gap-2 py-1.5">
                        <Upload size={15} className="text-[#0b4da2]" />
                        <span className="text-xs font-bold text-slate-600">
                          Attach Transfer Screenshot / Receipt (PNG, JPG, PDF)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEBIT / CREDIT CARD — FULL DESIGN PRESERVED IN DISABLED / COMING SOON STATE */}
          {activeTab === 'card' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Coming Soon Banner */}
              <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 text-xs text-amber-900">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="font-extrabold block">Debit / Credit Card — Coming Soon (Currently Disabled)</span>
                    <span className="text-[11px] text-amber-800">
                      Visa &amp; MasterCard gateway is currently under setup. Please use <strong>Cash Payment</strong> to top up now.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('cash')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-[#083877] text-white text-[11px] font-bold cursor-pointer border-0 shrink-0 transition-colors"
                >
                  <Banknote size={13} />
                  <span>Use Cash Payment</span>
                </button>
              </div>

              {/* Disabled Card Terminal Design */}
              <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-5 opacity-55 pointer-events-none select-none grayscale-[20%]" aria-disabled="true">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <CreditCard size={16} className="text-[#0b4da2]" />
                    <span>Debit / Credit Card Terminal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-700 italic px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200">VISA</span>
                    <span className="text-[10px] font-black text-amber-700 px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200">MasterCard</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Virtual Credit Card Mockup */}
                  <div className="lg:col-span-5 flex justify-center">
                    <div className="w-full max-w-[340px] aspect-[1.586] rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white shadow-xl border border-slate-700/80 relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
                      <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
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
                        </div>
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded">
                          <CreditCard size={12} />
                          <span>Card</span>
                        </div>
                      </div>
                      <div className="relative z-10 py-1">
                        <div className="font-mono text-base sm:text-lg tracking-[0.2em] text-white drop-shadow-sm font-semibold">
                          {formatCardDisplay(cardNumber)}
                        </div>
                      </div>
                      <div className="flex items-end justify-between relative z-10 text-[10px] tracking-wider uppercase text-slate-300">
                        <div className="max-w-[65%]">
                          <span className="text-[8px] text-slate-400 block mb-0.5">Cardholder</span>
                          <span className="font-bold text-white tracking-wide truncate block text-xs font-mono">
                            {cardholderName.trim() || 'CARDHOLDER NAME'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-slate-400 block mb-0.5">Expires</span>
                          <span className="font-mono font-bold text-white text-xs">{cardExpiry.trim() || 'MM/YY'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Disabled Card Inputs */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cardholder Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          disabled
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                          placeholder="NAME ON CARD"
                          className="w-full pl-9 pr-3 py-2 text-xs text-slate-500 bg-slate-100 border border-slate-300 rounded-xl uppercase cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Card Number (Visa / MasterCard) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <CreditCard size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          disabled
                          value={cardNumber}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          placeholder="•••• •••• •••• ••••"
                          className="w-full pl-9 pr-3 py-2 text-xs font-mono text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Expires (MM/YY) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={cardExpiry}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 text-xs font-mono text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        CVV / Security Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        disabled
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => handleCvvChange(e.target.value)}
                        placeholder="•••"
                        className="w-full px-3 py-2 text-xs font-mono text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer / Action Buttons (Exact Payment Modal Design) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              {activeTab === 'online' || activeTab === 'card' ? (
                <>This payment channel is <strong>Coming Soon</strong>. Please select <strong>Cash Payment</strong> to continue.</>
              ) : (
                <>Top-up request will be sent to <strong>Super Admin Acco Wallet</strong> &amp; credited upon approval.</>
              )}
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
              onClick={() => handleSubmit()}
              disabled={isSubmitting || parsedAmount <= 0 || activeTab === 'online' || activeTab === 'card'}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-[#0b4da2] to-[#083877] hover:from-[#093e82] hover:to-[#062c5e] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activeTab === 'online' || activeTab === 'card' ? (
                <>
                  <Clock size={14} />
                  <span>Coming Soon</span>
                </>
              ) : isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>
                    Confirm &amp; Submit Top-Up (RM {parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

