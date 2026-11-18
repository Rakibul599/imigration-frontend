'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Layers,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Wallet,
  X,
} from 'lucide-react';

export type PaymentTabType = 'cash' | 'online' | 'card' | 'wallet';

export interface SubscriptionPlanOption {
  id: number;
  plan_key: string;
  name: string;
  duration_days: number;
  price: number;
  currency?: string;
  badge?: string | null;
  savings_text?: string | null;
  description?: string | null;
  is_popular?: boolean;
  is_active?: boolean;
}

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
    walletBalance?: number;
    walletAccountNo?: string;
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
    planKey?: string;
    planName?: string;
    packageDurationDays?: number;
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

  // Subscription Plans & Package Selector State
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlanOption[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanOption | null>(null);
  const [showPackageSelector, setShowPackageSelector] = useState<boolean>(false);
  const [hasManuallyChangedPlan, setHasManuallyChangedPlan] = useState<boolean>(false);

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

  // Tab 4: Wallet Payment State
  const [liveWalletBalance, setLiveWalletBalance] = useState<number>(0);
  const [liveWalletAccountNo, setLiveWalletAccountNo] = useState<string>('');
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);
  const [walletRef, setWalletRef] = useState<string>('');
  const [walletNotes, setWalletNotes] = useState<string>('');

  // Sync state & load subscription plans ONLY when modal opens or switches to a different company
  // (Do NOT depend on `data` object reference, because parent pages with 1s countdown timers recreate `data` every second!)
  const companyRecordId = data?.id;
  useEffect(() => {
    if (!data || !isOpen) return;

    const initialAmt = Number(data.amount) > 0 ? Number(data.amount) : 199;
    setAmount(initialAmt);
    setCashTendered(initialAmt);
    setReceiptNo(`RCP-${Date.now().toString().slice(-6)}`);
    setOnlineRef(`FPX-${Date.now().toString().slice(-6)}`);
    setCardAuthCode(`AUTH-${Date.now().toString().slice(-5)}`);
    setWalletRef(`WALPAY-${Date.now().toString().slice(-6)}`);
    setCardholderName(data.companyName || '');
    setCashNotes('');
    setOnlineNotes('');
    setCardNotes('');
    setWalletNotes('');
    setCashSlipFile(null);
    setCashSlipPreview(null);
    setCashSlipName('');
    setShowPackageSelector(false);
    setHasManuallyChangedPlan(false);
    setLiveWalletBalance(Number(data.walletBalance) || 0);
    setLiveWalletAccountNo(data.walletAccountNo || '');

    let cancelled = false;
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    setIsLoadingPlans(true);
    setIsLoadingWallet(true);

    // Fetch live wallet balance for this company
    fetch(`${apiBase}/companies/${encodeURIComponent(String(data.id))}/wallet/transactions`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((wData) => {
        if (cancelled || !wData) return;
        if (typeof wData.wallet_balance === 'number') {
          setLiveWalletBalance(wData.wallet_balance);
        }
        if (wData.wallet_account_no) {
          setLiveWalletAccountNo(String(wData.wallet_account_no));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingWallet(false);
      });

    fetch(`${apiBase}/subscription-plans`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((raw) => {
        if (cancelled) return;
        const list: SubscriptionPlanOption[] = (Array.isArray(raw) ? raw : [])
          .filter((p: any) => p && p.is_active !== false)
          .map((p: any) => ({
            id: Number(p.id),
            plan_key: String(p.plan_key || p.name || ''),
            name: String(p.name || p.plan_key || 'Subscription Plan'),
            duration_days: Number(p.duration_days) || 30,
            price: Number(p.price) || 0,
            currency: p.currency || 'RM',
            badge: p.badge || null,
            savings_text: p.savings_text || null,
            description: p.description || null,
            is_popular: Boolean(p.is_popular),
            is_active: p.is_active !== false,
          }));

        setAvailablePlans(list);

        if (list.length > 0) {
          const targetKey = (data.planPackage || '').toLowerCase().trim();
          const matched =
            list.find(
              (p) =>
                p.plan_key.toLowerCase() === targetKey ||
                p.name.toLowerCase() === targetKey
            ) ||
            list.find(
              (p) =>
                targetKey &&
                (p.plan_key.toLowerCase().includes(targetKey) ||
                  p.name.toLowerCase().includes(targetKey))
            ) ||
            list[0];

          setSelectedPlan(matched);
          // Sync amount with the matched plan price if no custom due amount or default 199
          if (matched && matched.price > 0 && (!data.amount || Number(data.amount) <= 0 || Number(data.amount) === 199)) {
            setAmount(matched.price);
            setCashTendered(matched.price);
          }
        } else {
          setSelectedPlan(null);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailablePlans([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPlans(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, companyRecordId]);

  const handleSelectPackage = (plan: SubscriptionPlanOption) => {
    setSelectedPlan(plan);
    setHasManuallyChangedPlan(true);
    if (plan.price > 0) {
      setAmount(plan.price);
      setCashTendered(plan.price);
    }
    setShowPackageSelector(false);
  };

  if (!isOpen || !data) return null;

  const activePlanName = selectedPlan?.name || data.planPackage || '1 Month Plan';
  const activePlanKey = selectedPlan?.plan_key || data.planPackage || '';
  const activeDurationDays = selectedPlan?.duration_days || data.packageDurationDays || 30;

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

    if (activeTab === 'online' || activeTab === 'card') {
      return;
    }

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
    } else if (activeTab === 'wallet') {
      if (liveWalletBalance < amount) {
        alert(
          `Insufficient wallet balance! Available: RM ${liveWalletBalance.toFixed(2)}, Required: RM ${amount.toFixed(2)}.`
        );
        return;
      }
      method = 'Wallet Payment';
      reference = walletRef.trim() || `WALPAY-${Date.now().toString().slice(-6)}`;
      resolvedBank = liveWalletAccountNo || 'Acco Wallet';
      finalNotes = [
        `Paid via Acco Wallet (${liveWalletAccountNo || 'Company Wallet'})`,
        walletNotes.trim(),
      ].filter(Boolean).join(' | ');
    }

    onSubmit({
      amount: amount > 0 ? amount : 199,
      method,
      reference,
      bankName: resolvedBank,
      notes: [
        `Package: ${activePlanName} (${activeDurationDays} Days)`,
        finalNotes,
      ]
        .filter(Boolean)
        .join(' | '),
      tab: activeTab,
      slipData: cashSlipPreview,
      slipName: cashSlipName,
      planKey: activePlanKey,
      planName: activePlanName,
      packageDurationDays: activeDurationDays,
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white m-0">
                  Receive Payment &amp; Activate Package
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {activePlanName}
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
          {/* Company & Selected Subscription Package Summary Banner */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0b4da2] font-black text-sm shrink-0 shadow-2xs">
                  <Building2 size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-extrabold text-slate-900 block truncate max-w-[260px] sm:max-w-[360px]">
                    {data.companyName}
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0b4da2] border border-blue-200">
                      <Layers size={11} />
                      <span>Paying For: {activePlanName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      <Clock size={11} className="text-emerald-600" />
                      <span>{activeDurationDays} Days Access</span>
                    </span>
                    {hasManuallyChangedPlan && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Package Changed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
                {availablePlans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPackageSelector((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                      showPackageSelector
                        ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                        : 'bg-white hover:bg-blue-50 text-[#0b4da2] border-blue-200 hover:border-[#0b4da2]'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>{showPackageSelector ? 'Hide Packages' : 'Change Package'}</span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${showPackageSelector ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}

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
            </div>

            {/* Expandable Interactive Subscription Package Switcher */}
            {showPackageSelector && (
              <div className="pt-3 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={13} className="text-[#0b4da2]" />
                    <span>Choose Subscription Package to Pay For</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Selecting a package automatically updates the payment amount &amp; validity
                  </span>
                </div>

                {isLoadingPlans ? (
                  <div className="py-4 text-center text-xs text-slate-400 font-medium">
                    Loading available subscription packages...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {availablePlans.map((plan) => {
                      const isSelected = selectedPlan?.id === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => handleSelectPackage(plan)}
                          className={`relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'border-[#0b4da2] bg-blue-50/90 shadow-sm ring-2 ring-blue-500/15'
                              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 truncate">
                                {plan.name}
                              </div>
                              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                {plan.duration_days} Days Validity
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 size={15} className="text-[#0b4da2] shrink-0" />
                            )}
                          </div>

                          <div className="flex items-end justify-between gap-1 pt-1.5 border-t border-slate-200/60">
                            <span className="text-sm font-black font-mono text-[#0b4da2]">
                              {plan.currency || 'RM'} {Number(plan.price).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {(plan.savings_text || plan.badge || plan.is_popular) && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 truncate max-w-[90px]">
                                {plan.badge || plan.savings_text || 'Popular'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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
                  <span className="text-xs font-black block truncate">Online Payment</span>
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
                  <span className="text-xs font-black block truncate">Debit / Credit Card</span>
                  <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock size={9} />
                    Coming Soon
                  </span>
                </div>
              </button>

              {/* Tab 4: Wallet Payment */}
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  activeTab === 'wallet'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/30'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeTab === 'wallet' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <Wallet size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black block truncate">Wallet Payment</span>
                  <span
                    className={`text-[10px] font-mono font-bold block truncate ${
                      liveWalletBalance >= amount ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {isLoadingWallet
                      ? 'Checking...'
                      : `Bal: RM ${liveWalletBalance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                {activeTab === 'wallet' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
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
                      FPX &amp; DuitNow gateway is being integrated. Please use <strong>Cash Payment</strong> or <strong>Wallet Payment</strong>.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('cash')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-[#083877] text-white text-[11px] font-bold cursor-pointer border-0 transition-colors"
                  >
                    <Banknote size={13} />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wallet')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer border-0 transition-colors"
                  >
                    <Wallet size={13} />
                    <span>Wallet</span>
                  </button>
                </div>
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
                      placeholder="e.g. FPX-98765432 or DUITNOW-1234"
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
                      placeholder="Verified against online banking portal..."
                      className="w-full px-3 py-2 text-xs text-slate-500 bg-slate-100 border border-slate-300 rounded-xl cursor-not-allowed"
                    />
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
                      Visa &amp; MasterCard gateway is currently under setup. Please use <strong>Cash Payment</strong> or <strong>Wallet Payment</strong>.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('cash')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-[#083877] text-white text-[11px] font-bold cursor-pointer border-0 transition-colors"
                  >
                    <Banknote size={13} />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wallet')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer border-0 transition-colors"
                  >
                    <Wallet size={13} />
                    <span>Wallet</span>
                  </button>
                </div>
              </div>

              {/* Disabled Full Card Terminal Design */}
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

          {/* TAB 4: WALLET PAYMENT FORM */}
          {activeTab === 'wallet' && (() => {
            const hasEnoughBalance = liveWalletBalance >= amount;
            const remainingAfterPay = liveWalletBalance - amount;
            const walletAccDisplay =
              liveWalletAccountNo ||
              data.walletAccountNo ||
              `WAL-${String(data.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;

            return (
              <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Wallet size={16} className="text-emerald-600" />
                    <span>Pay Using Acco Wallet Balance</span>
                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {walletAccDisplay}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      hasEnoughBalance
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-rose-700 bg-rose-50 border-rose-200'
                    }`}
                  >
                    {isLoadingWallet
                      ? 'Checking Balance...'
                      : hasEnoughBalance
                      ? 'Sufficient Balance • Instant Deduction'
                      : 'Insufficient Wallet Balance'}
                  </span>
                </div>

                {/* 3-Box Live Wallet Balance Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Available Wallet Balance
                    </span>
                    <div className="text-lg font-black font-mono text-emerald-700">
                      RM {liveWalletBalance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Account: <strong className="font-mono text-slate-700">{walletAccDisplay}</strong>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Package Deduction
                    </span>
                    <div className="text-lg font-black font-mono text-[#0b4da2]">
                      - RM {amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                      For: <strong className="text-slate-700">{activePlanName}</strong> ({activeDurationDays}d)
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border ${
                      hasEnoughBalance
                        ? 'bg-blue-50/60 border-blue-200'
                        : 'bg-rose-50/80 border-rose-200'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      {hasEnoughBalance ? 'Balance After Payment' : 'Shortfall Amount'}
                    </span>
                    <div
                      className={`text-lg font-black font-mono ${
                        hasEnoughBalance ? 'text-slate-900' : 'text-rose-600'
                      }`}
                    >
                      RM {Math.abs(remainingAfterPay).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span
                      className={`text-[10px] font-semibold block mt-0.5 ${
                        hasEnoughBalance ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {hasEnoughBalance ? 'Ready for instant settlement' : 'Top up wallet or switch method'}
                    </span>
                  </div>
                </div>

                {/* Insufficient Balance Warning */}
                {!isLoadingWallet && !hasEnoughBalance && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Insufficient Wallet Balance</strong>
                      <span>
                        Your current wallet balance is{' '}
                        <strong className="font-mono">RM {liveWalletBalance.toFixed(2)}</strong>, but{' '}
                        <strong>{activePlanName}</strong> requires{' '}
                        <strong className="font-mono">RM {amount.toFixed(2)}</strong>. Please top up at least{' '}
                        <strong className="font-mono">RM {Math.abs(remainingAfterPay).toFixed(2)}</strong> using{' '}
                        <strong>Add Wallet</strong> or choose <strong>Cash Payment</strong> above.
                      </span>
                    </div>
                  </div>
                )}

                {/* Wallet Reference & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Wallet Payment Reference
                    </label>
                    <input
                      type="text"
                      value={walletRef}
                      onChange={(e) => setWalletRef(e.target.value)}
                      placeholder="e.g. WALPAY-849201"
                      className="w-full px-3 py-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={walletNotes}
                      onChange={(e) => setWalletNotes(e.target.value)}
                      placeholder={`Auto-deduct for ${activePlanName}...`}
                      className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              {activeTab === 'online' || activeTab === 'card' ? (
                <>This payment channel is <strong>Coming Soon</strong>. Please choose <strong>Cash Payment</strong> or <strong>Wallet Payment</strong>.</>
              ) : (
                <>Activating <strong className="text-slate-900">{activePlanName}</strong> ({activeDurationDays} Days) &amp; recording official invoice.</>
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
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                amount <= 0 ||
                activeTab === 'online' ||
                activeTab === 'card' ||
                (activeTab === 'wallet' && (isLoadingWallet || liveWalletBalance < amount))
              }
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'wallet'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800'
                  : 'bg-gradient-to-r from-[#0b4da2] to-[#083877] hover:from-[#093e82] hover:to-[#062c5e]'
              }`}
            >
              {activeTab === 'online' || activeTab === 'card' ? (
                <>
                  <Clock size={14} />
                  <span>Coming Soon</span>
                </>
              ) : isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  {activeTab === 'wallet' ? <Wallet size={15} /> : <Check size={15} />}
                  <span>
                    {activeTab === 'wallet'
                      ? `Pay RM ${amount.toFixed(2)} from Wallet • ${activePlanName}`
                      : `Pay RM ${amount.toFixed(2)} • ${activePlanName}`}
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
