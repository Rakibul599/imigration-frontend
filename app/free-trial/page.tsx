'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Globe2,
  HelpCircle,
  Image as ImageIcon,
  KeyRound,
  Languages,
  Layers,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UploadCloud,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  SubscriptionPlan,
  fetchSubscriptionPlans,
  submitTrialApplication,
  CompanyTrialApplication,
} from '@/lib/companyTrialAndFinanceStorage';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const SECTOR_OPTIONS = [
  'Civil & Building Construction',
  'Agriculture & Plantation',
  'Manufacturing & Healthcare',
  'Hospitality & Services',
  'Agri-Commodity & Processing',
  'Engineering & Development',
  'Logistics & Supply Chain',
  'General Commercial & Services',
  'Information Technology & Telecom',
  'Finance & Corporate Services',
];

const CURRENCY_OPTIONS = [
  { code: 'MYR', name: 'Malaysian Ringgit (RM)', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' },
  { code: 'EUR', name: 'Euro (€)', symbol: '€' },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'BDT', name: 'Bangladeshi Taka (৳)', symbol: '৳' },
  { code: 'IDR', name: 'Indonesian Rupiah (Rp)', symbol: 'Rp' },
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
];

const LANGUAGE_OPTIONS = [
  'English (Default)',
  'Bahasa Melayu (Malay)',
  'Chinese (Mandarin)',
  'Tamil',
  'Bengali',
  'Arabic',
];

const BANK_PRESETS = [
  'Maybank (Malayan Banking Berhad)',
  'CIMB Bank Berhad',
  'Public Bank Berhad',
  'RHB Bank Berhad',
  'Hong Leong Bank Berhad',
  'AmBank Group',
  'Standard Chartered Bank Malaysia',
  'HSBC Bank Malaysia',
  'United Overseas Bank (UOB)',
  'Other Corporate Bank',
];

const TAG_OPTIONS = ['Verified JIM', 'Active', 'VIP Client', 'Pending Verification', 'Corporate'];

export interface ApplicationDirector {
  id: string;
  name: string;
  nidNo: string;
  passportNo: string;
  phone: string;
  email: string;
  socsoNo: string;
  epfNo: string;
  carPlateNo: string;
  carPurchaseType: 'emi' | 'cash';
  carAmount: string;
  carTotalPayment: string;
  basicSalary: string;
}

function createEmptyDirector(index = 1): ApplicationDirector {
  return {
    id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: '',
    nidNo: '',
    passportNo: '',
    phone: '',
    email: '',
    socsoNo: '',
    epfNo: '',
    carPlateNo: '',
    carPurchaseType: 'emi',
    carAmount: '',
    carTotalPayment: '',
    basicSalary: '',
  };
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
  'Alliance Bank',
  'OCBC Bank Malaysia',
  'UOB Malaysia',
  'Touch n Go eWallet / DuitNow QR',
  'Other Bank / FPX',
];

type PaymentMode = 'pay_later' | 'cash' | 'card' | 'online';

function FreeTrialForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial plan from URL or default to '3_months'
  const planParam = searchParams.get('plan');
  const [dynamicPlans, setDynamicPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>(planParam || '3_months');

  useEffect(() => {
    fetchSubscriptionPlans()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          const publicPlans = res.filter((p) => !p.is_free_plan);
          setDynamicPlans(publicPlans);
          if (!planParam && publicPlans.length > 0) {
            const pop = publicPlans.find((p) => p.is_popular) || publicPlans[0];
            setSelectedPlan(pop.plan_key);
          }
        }
      })
      .catch(() => {});
  }, [planParam]);

  useEffect(() => {
    if (planParam) {
      setSelectedPlan(planParam);
    }
  }, [planParam]);

  // Section 2: Company Core Information
  const [companyName, setCompanyName] = useState('');
  const [roc, setRoc] = useState('');
  const [sector, setSector] = useState('');
  const [companySectors, setCompanySectors] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState<string>('');
  const [description, setDescription] = useState('');

  // Section 3: Payment Setup (Pay Later, Cash Payment, Card Payment, Online Payment)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('pay_later');

  // Card Payment Fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Cash Payment Fields & Slip Upload
  const [cashAmount, setCashAmount] = useState('');
  const [cashReference, setCashReference] = useState('');
  const [cashDepositorName, setCashDepositorName] = useState('');
  const [cashSlipFile, setCashSlipFile] = useState<File | null>(null);
  const [cashSlipPreview, setCashSlipPreview] = useState<string | null>(null);
  const [cashSlipName, setCashSlipName] = useState('');

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

  // Online Payment Fields
  const [onlineBank, setOnlineBank] = useState('Maybank (Malayan Banking)');
  const [onlineReference, setOnlineReference] = useState('');
  const [onlineAccountName, setOnlineAccountName] = useState('');
  const [onlineSlipFile, setOnlineSlipFile] = useState<File | null>(null);
  const [onlineSlipPreview, setOnlineSlipPreview] = useState<string | null>(null);
  const [onlineSlipName, setOnlineSlipName] = useState('');

  const handleOnlineSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOnlineSlipFile(file);
      setOnlineSlipName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setOnlineSlipPreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setOnlineSlipPreview(null);
      }
    }
  };

  // Section 4: Master Admin Account Setup
  const [applicantName, setApplicantName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notes, setNotes] = useState('');

  // Submission state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<CompanyTrialApplication | null>(null);
  const [copied, setCopied] = useState(false);

  const activeDynamic = dynamicPlans.find((p) => p.plan_key === selectedPlan);
  const fallbackPkg = dynamicPlans[0] || null;
  const currentPlanLabel = activeDynamic ? activeDynamic.name : (fallbackPkg ? fallbackPkg.name : (selectedPlan || 'Subscription'));
  const currentPlanPrice = activeDynamic
    ? `${activeDynamic.currency} ${activeDynamic.price}`
    : (fallbackPkg ? `${fallbackPkg.currency} ${fallbackPkg.price}` : '-');
  const trialDays = Number(activeDynamic?.trial_days ?? 3);
  const trialDaysFormatted = trialDays === 30 ? '1 Month' : `${trialDays} Days`;

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

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Logo file size should be less than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo((event.target?.result as string) || '');
    };
    reader.readAsDataURL(file);
  };

  const handleCopyCredentials = () => {
    if (!submittedApp) return;
    const text = `Company: ${submittedApp.company_name}\nUsername: ${submittedApp.master_admin_username}\nTarget Plan: ${currentPlanLabel}\nTrial Period: ${trialDaysFormatted} Free Trial\nStatus: Pending Super Admin Approval\nLogin URL: ${window.location.origin}/masteradmin/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyName.trim()) {
      setErrorMessage('Please enter your Company Name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter an official contact Email.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter a Phone / WhatsApp contact number.');
      return;
    }

    if (paymentMode === 'online' || paymentMode === 'card') {
      setErrorMessage('Online Payment and Card Payment are Coming Soon. Please select Pay Later or Cash Payment to submit.');
      return;
    }

    const finalApplicantName = applicantName.trim();
    if (!finalApplicantName) {
      setErrorMessage('Please enter the Applicant / Contact Person Name.');
      return;
    }

    if (!username.trim()) {
      setErrorMessage('Please provide a Master Admin Username for login.');
      return;
    }
    if (!password.trim() || password.length < 4) {
      setErrorMessage('Please set a Master Admin Password of at least 4 characters.');
      return;
    }

    setIsLoading(true);
    try {
      let postTrialPaymentNote = '[Payment Option: Pay Later manually after free trial]';
      let bankNameResolved: string | undefined = undefined;
      let bankAccountNameResolved: string | undefined = undefined;
      let bankAccountNoResolved: string | undefined = undefined;

      if (paymentMode === 'cash') {
        const slipInfo = cashSlipName ? `, Deposit Slip Attached: ${cashSlipName}` : '';
        const refInfo = cashReference.trim() ? `, Ref: ${cashReference.trim()}` : '';
        const amtInfo = cashAmount.trim() ? `, Amount: RM ${cashAmount.trim()}` : `, Plan Price: ${currentPlanPrice}`;
        postTrialPaymentNote = `[Payment Option: Cash Payment / CDM Deposit${amtInfo}${refInfo}${slipInfo}]`;
        bankNameResolved = 'Cash CDM Deposit';
        bankAccountNameResolved = cashDepositorName.trim() || companyName.trim();
        bankAccountNoResolved = cashReference.trim() || 'CASH-COUNTER';
      }

      const combinedNotes = [notes.trim(), postTrialPaymentNote]
        .filter(Boolean)
        .join('\n\n');

      const res = await submitTrialApplication({
        company_name: companyName.trim(),
        roc: roc.trim() || undefined,
        sector: sector.trim() || undefined,
        sectors: sector.trim() ? [sector.trim()] : undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        logo: logo || undefined,
        currency: 'MYR',
        language: 'English',
        bank_name: bankNameResolved,
        bank_account_name: bankAccountNameResolved,
        bank_account_no: bankAccountNoResolved,
        tag: 'Verified JIM',
        total_workers: 0,
        description: description.trim() || undefined,
        directors: [],
        plan_package: selectedPlan,
        applicant_name: finalApplicantName,
        master_admin_username: username.trim(),
        master_admin_password: password,
        notes: combinedNotes || undefined,
      });

      if (res.success && res.application) {
        setSubmittedApp(res.application);
      } else {
        setErrorMessage(res.message || 'Submission failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your application.');
    } finally {
      setIsLoading(false);
    }
  };

  // SUCCESS VIEW
  if (submittedApp) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 sm:p-10 text-center relative overflow-hidden">
          {/* Decorative backdrop */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />

          {submittedApp.logo ? (
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 border border-slate-200 bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden">
              <img
                src={submittedApp.logo}
                alt={submittedApp.company_name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
              <CheckCircle2 size={36} />
            </div>
          )}

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider mb-3">
            <Sparkles size={13} className="text-emerald-500" />
            Full Application Submitted
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Company Application Received!
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-8">
            Your comprehensive application for <span className="font-bold text-slate-900">{submittedApp.company_name}</span> has
            been received with full company details, banking info, and director profiles. Upon Super Admin approval, you will enjoy{' '}
            <strong className="text-emerald-700">3 Days of completely free Master Admin access</strong>.
          </p>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 text-left mb-8 space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Application ID</span>
              <span className="font-mono font-bold text-slate-900">#APP-{submittedApp.id}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Company Name</span>
              <span className="font-bold text-slate-900">{submittedApp.company_name}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Target Subscription</span>
              <span className="font-bold text-[#0b4da2]">
                {currentPlanLabel} ({currentPlanPrice})
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Free Trial Duration</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                3 Days Free Trial (Zero Cost)
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Managing Director / Applicant</span>
              <span className="font-bold text-slate-900">{submittedApp.applicant_name}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Master Admin Username</span>
              <span className="font-mono font-bold text-slate-900">{submittedApp.master_admin_username}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Currency & Language</span>
              <span className="font-semibold text-slate-800">
                {submittedApp.currency || 'MYR'} • {submittedApp.language || 'English'}
              </span>
            </div>

            {submittedApp.bank_name && (
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Bank Information</span>
                <span className="font-medium text-slate-800 text-right">
                  {submittedApp.bank_name} ({submittedApp.bank_account_no || 'Pending'})
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Current Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                <Clock size={12} /> Pending Super Admin Review
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Application Info!' : 'Copy Application Info'}</span>
            </button>

            <Link
              href="/masteradmin/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white font-bold text-xs transition-colors no-underline"
            >
              <span>Go to Master Admin Portal</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-[#0b4da2] text-xs font-bold border border-blue-200/60 mb-3 shadow-2xs">
          <Sparkles size={14} className="text-amber-500" />
          <span>Full Company Onboarding &amp; Free Trial</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
          Company Registration &amp; Free Trial Application
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Fill in your complete company profile, banking, and director details to register your enterprise.
          Get <strong className="text-slate-900 font-bold">3 days of full Master Admin access</strong> upon Super Admin
          approval.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between animate-shake">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* SECTION 1: PLAN SELECTOR */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                  1
                </span>
                Choose Target Subscription Package
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All plans include a 3-Day Free Trial first. You only pay after testing the system.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                3 Days Free Guaranteed
              </span>
              <span className="text-xs font-semibold text-slate-400">Section 1 of 4</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
            {dynamicPlans.length > 0
              ? dynamicPlans.map((pkg) => {
                  const isSelected = selectedPlan === pkg.plan_key;
                  const durationDays = Number(pkg.duration_days || 30);
                  const trialDays = Number(pkg.trial_days ?? 3);
                  const isFreePrice = Number(pkg.price) === 0;

                  // Format Duration label (e.g. 1 Month, 3 Months, 6 Months, 10 Months, 1 Year)
                  let durationText = '';
                  if (durationDays === 30) durationText = '1 Month';
                  else if (durationDays === 90) durationText = '3 Months';
                  else if (durationDays === 180) durationText = '6 Months';
                  else if (durationDays === 300) durationText = '10 Months';
                  else if (durationDays === 365) durationText = '1 Year';
                  else if (durationDays > 0 && durationDays % 30 === 0) durationText = `${durationDays / 30} Months`;
                  else if (durationDays > 0) durationText = `${durationDays} Days`;
                  else durationText = pkg.name || 'Subscription';

                  // Format Free Trial label (e.g. 3 Days Free, 1 Month Free)
                  let trialText = '';
                  if (trialDays === 30) trialText = '1 Month Free';
                  else if (trialDays > 0) trialText = `${trialDays} Days Free`;
                  else if (isFreePrice) trialText = 'Free';
                  else trialText = '3 Days Free';

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPlan(pkg.plan_key)}
                      className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between h-full min-w-0 overflow-hidden ${
                        isSelected
                          ? 'border-[#0b4da2] bg-blue-50/60 shadow-lg ring-2 ring-blue-500/25 -translate-y-0.5'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        {/* Top Row: Badges & Radio Check */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {pkg.is_popular && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs tracking-wider">
                                POPULAR
                              </span>
                            )}
                            {pkg.badge && (
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs tracking-wider ${
                                  pkg.is_popular
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {pkg.badge}
                              </span>
                            )}
                            {pkg.savings_text && (
                              <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs tracking-wider">
                                {pkg.savings_text}
                              </span>
                            )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                              isSelected
                                ? 'bg-[#0b4da2] border-[#0b4da2] text-white shadow-xs'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        {/* Heading: e.g. 6 Months / 3 Days Free */}
                        <div className="mb-2.5">
                          <h3 className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                              {durationText}
                            </span>
                            <span className="text-slate-300 font-bold text-sm">/</span>
                            <span className="text-xs sm:text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                              {trialText}
                            </span>
                          </h3>
                          {pkg.name && !pkg.name.toLowerCase().startsWith(durationText.toLowerCase()) && (
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                              {pkg.name}
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        <div className="mb-3">
                          {isFreePrice ? (
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-2xl font-black text-emerald-600 tracking-tight">FREE</span>
                              <span className="text-xs font-bold text-slate-400">({pkg.currency} 0.00)</span>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-1 flex-wrap">
                              <span className="text-xs font-bold text-slate-500">{pkg.currency}</span>
                              <span className="text-2xl font-black text-slate-900 tracking-tight">{pkg.price}</span>
                              <span className="text-xs text-slate-400 font-medium ml-0.5">/ {durationText}</span>
                            </div>
                          )}
                          <div className="text-[11px] font-bold text-emerald-700 mt-1 flex items-center gap-1 flex-wrap min-w-0">
                            <Sparkles size={11} className="text-amber-500 shrink-0" />
                            <span className="break-words">{pkg.currency || 'RM'} 0.00 due today ({trialText})</span>
                          </div>
                        </div>

                        {/* Description */}
                        {pkg.description && (
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 break-words">
                            {pkg.description}
                          </p>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="pt-2.5 mt-auto border-t border-slate-100 text-[11px] font-bold text-slate-600 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-slate-500 truncate">{pkg.duration_days} Days Access</span>
                      </div>
                    </div>
                  );
                })
              : (
                <div className="col-span-full py-12 px-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Calendar size={32} className="mx-auto text-slate-400 mb-2.5" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Subscription Plans Configured</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    There are currently no subscription packages available. Packages can be added anytime from the Super Admin portal.
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* SECTION 2: COMPANY INFORMATION */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                  2
                </span>
                Company Profile Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official corporate details identical to the company master creation registry.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Section 2 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Company Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            </div>

            {/* ROC */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registration / ROC No. <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={roc}
                onChange={(e) => setRoc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white font-mono"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Contact Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone / WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            </div>

            {/* Working Sector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Working sector
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => {
                  setSector(e.target.value);
                  setCompanySectors(e.target.value ? [e.target.value] : []);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              />
            </div>

            {/* Office Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Office Address
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            </div>

            {/* Company Logo Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Logo <span className="text-slate-400 font-normal">(PNG, JPG, SVG)</span>
              </label>
              <div className="flex items-center gap-3">
                {logo ? (
                  <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    <img src={logo} alt="Company Logo" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 cursor-pointer shadow"
                      title="Remove Logo"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon size={20} />
                  </div>
                )}
                <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors">
                  <UploadCloud size={14} className="text-[#0b4da2]" />
                  <span>{logo ? 'Change Logo' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Overview / Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: POST-TRIAL PAYMENT SETUP */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                  3
                </span>
                Payment Authorization After {trialDaysFormatted} Free Trial
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose whether you want to set up automatic payment for your subscription after your {trialDaysFormatted} free trial period ends. Zero charges will be billed today.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Section 3 of 4</span>
          </div>

          {/* Payment Method Selector: 1. Pay Later, 2. Cash Payment, 3. Online Payment (Coming Soon), 4. Card Payment (Coming Soon) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {/* 1. Pay Later */}
            <label
              className={`relative flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMode === 'pay_later'
                  ? 'border-[#0b4da2] bg-blue-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                value="pay_later"
                checked={paymentMode === 'pay_later'}
                onChange={() => setPaymentMode('pay_later')}
                className="h-4 w-4 text-[#0b4da2] focus:ring-blue-500 border-slate-300 shrink-0"
              />
              <Clock size={16} className="text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                  Pay Later
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {trialDaysFormatted} free without upfront details
                </span>
              </div>
            </label>

            {/* 2. Cash Payment */}
            <label
              className={`relative flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMode === 'cash'
                  ? 'border-[#0b4da2] bg-blue-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                value="cash"
                checked={paymentMode === 'cash'}
                onChange={() => setPaymentMode('cash')}
                className="h-4 w-4 text-[#0b4da2] focus:ring-blue-500 border-slate-300 shrink-0"
              />
              <Banknote size={16} className="text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                  Cash Payment
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  CDM / Counter Deposit Slip
                </span>
              </div>
            </label>

            {/* 3. Online Payment (After Cash Payment — Coming Soon / Disabled) */}
            <label
              className={`relative flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMode === 'online'
                  ? 'border-amber-400 bg-amber-50/70 shadow-xs'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50 opacity-85'
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                value="online"
                checked={paymentMode === 'online'}
                onChange={() => setPaymentMode('online')}
                className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-300 shrink-0"
              />
              <Globe size={16} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-700 block truncate">
                  Online Payment
                </span>
                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock size={9} />
                  Coming Soon
                </span>
              </div>
            </label>

            {/* 4. Card Payment (Coming Soon / Disabled) */}
            <label
              className={`relative flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMode === 'card'
                  ? 'border-amber-400 bg-amber-50/70 shadow-xs'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50 opacity-85'
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                value="card"
                checked={paymentMode === 'card'}
                onChange={() => setPaymentMode('card')}
                className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-300 shrink-0"
              />
              <CreditCard size={16} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-700 block truncate">
                  Debit / Credit Card
                </span>
                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock size={9} />
                  Coming Soon
                </span>
              </div>
            </label>
          </div>

          {/* Pay Later Information */}
          {paymentMode === 'pay_later' && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center gap-3 animate-in fade-in duration-150">
              <Clock size={20} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block">Free Trial Access Granted with Pay Later</span>
                <span className="text-[11px] text-amber-800">
                  You can explore your {trialDaysFormatted} free trial period with full system access. No advance payment or card is required today. You can settle your subscription anytime later.
                </span>
              </div>
            </div>
          )}

          {/* Cash Payment Form with Slip Upload */}
          {paymentMode === 'cash' && (
            <div className="pt-6 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Banknote size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Cash / CDM Counter Deposit</span>
                    <span className="text-[11px] text-emerald-800">Direct cash deposit or CDM machine slip upload</span>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Package Price</span>
                  <span className="text-sm font-extrabold font-mono text-emerald-800">{currentPlanPrice}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deposit Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposit Amount (RM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Enter deposit amount or leave empty for plan price"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white font-mono"
                  />
                </div>

                {/* Receipt / Ref No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposit Receipt / Slip / CDM Reference No.
                  </label>
                  <input
                    type="text"
                    value={cashReference}
                    onChange={(e) => setCashReference(e.target.value)}
                    placeholder="e.g. CDM-849201 or RCP-1029"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white font-mono"
                  />
                </div>

                {/* Depositor Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Depositor / Payer Name
                  </label>
                  <input
                    type="text"
                    value={cashDepositorName}
                    onChange={(e) => setCashDepositorName(e.target.value)}
                    placeholder="e.g. Officer / Representative Name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white"
                  />
                </div>

                {/* Cash Deposit Slip Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Cash / CDM Deposit Slip <span className="text-slate-400 font-normal">(Receipt / Photo / PDF)</span>
                  </label>
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center transition-all bg-slate-50/50 hover:bg-emerald-50/20">
                    {cashSlipPreview ? (
                      <div className="flex flex-col items-center gap-2.5">
                        <img
                          src={cashSlipPreview}
                          alt="Deposit Slip Preview"
                          className="max-h-48 rounded-xl shadow-sm border border-slate-200 object-contain"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-800 truncate max-w-xs">{cashSlipName}</span>
                          <button
                            type="button"
                            onClick={() => { setCashSlipFile(null); setCashSlipPreview(null); setCashSlipName(''); }}
                            className="text-xs text-rose-600 hover:text-rose-700 font-bold underline bg-transparent border-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : cashSlipName ? (
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2">
                          <FileText size={20} className="text-emerald-600" />
                          <span className="text-xs font-mono font-bold text-slate-800">{cashSlipName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCashSlipFile(null); setCashSlipPreview(null); setCashSlipName(''); }}
                          className="text-xs text-rose-600 hover:text-rose-700 font-bold bg-transparent border-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Upload size={18} />
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          Click to upload or drag &amp; drop Cash / CDM Slip
                        </div>
                        <div className="text-[11px] text-slate-400">
                          JPG, PNG, WEBP or PDF (Max 10MB)
                        </div>
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

          {/* Online Payment Form (Full Design Preserved — Disabled / Coming Soon State) */}
          {paymentMode === 'online' && (
            <div className="pt-6 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
              {/* Coming Soon Banner */}
              <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 text-xs text-amber-900">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="font-extrabold block">Online Payment — Coming Soon (Currently Disabled)</span>
                    <span className="text-[11px] text-amber-800">
                      Preview of FPX &amp; Online Bank Transfer layout. Please select <strong>Pay Later</strong> or <strong>Cash Payment</strong> to submit.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('pay_later')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Use Pay Later
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className="px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-[#083877] text-white text-[11px] font-bold cursor-pointer border-0 transition-colors"
                  >
                    Use Cash Payment
                  </button>
                </div>
              </div>

              {/* Disabled Form Design */}
              <div className="relative space-y-4 opacity-55 pointer-events-none select-none grayscale-[20%]" aria-disabled="true">
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Globe size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Online Banking, FPX &amp; Bank Transfer</span>
                      <span className="text-[11px] text-indigo-800">Transfer directly via online bank or DuitNow QR</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Package Price</span>
                    <span className="text-sm font-extrabold font-mono text-indigo-900">{currentPlanPrice}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bank Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Bank / Payment Channel <span className="text-rose-500">*</span>
                    </label>
                    <select
                      disabled
                      value={onlineBank}
                      onChange={(e) => setOnlineBank(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-500 bg-slate-100 cursor-not-allowed"
                    >
                      {MALAYSIAN_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Online Transaction Ref */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Transaction Ref / DuitNow Reference
                    </label>
                    <input
                      type="text"
                      disabled
                      value={onlineReference}
                      onChange={(e) => setOnlineReference(e.target.value)}
                      placeholder="e.g. FPX-9823410 or DUITNOW-7261"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-500 bg-slate-100 font-mono cursor-not-allowed"
                    />
                  </div>

                  {/* Account Holder Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payer Account Holder Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value={onlineAccountName}
                      onChange={(e) => setOnlineAccountName(e.target.value)}
                      placeholder="e.g. Company Bank Account Name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-500 bg-slate-100 cursor-not-allowed"
                    />
                  </div>

                  {/* Online Slip Upload */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Upload Online Transfer Slip / Receipt <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-100/70">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <Upload size={18} />
                        </div>
                        <div className="text-xs font-bold text-slate-700">
                          Click to upload Online Transfer Receipt
                        </div>
                        <div className="text-[11px] text-slate-400">
                          JPG, PNG, WEBP or PDF (Max 10MB)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card Payment Form (Full Design Preserved — Disabled / Coming Soon State) */}
          {paymentMode === 'card' && (
            <div className="pt-6 border-t border-slate-200 space-y-5 animate-in fade-in duration-150">
              {/* Coming Soon Banner */}
              <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 text-xs text-amber-900">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="font-extrabold block">Debit / Credit Card — Coming Soon (Currently Disabled)</span>
                    <span className="text-[11px] text-amber-800">
                      Preview of Visa &amp; MasterCard payment terminal. Please select <strong>Pay Later</strong> or <strong>Cash Payment</strong> to submit.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('pay_later')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Use Pay Later
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className="px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-[#083877] text-white text-[11px] font-bold cursor-pointer border-0 transition-colors"
                  >
                    Use Cash Payment
                  </button>
                </div>
              </div>

              {/* Disabled Full Card Design */}
              <div className="space-y-6 opacity-55 pointer-events-none select-none grayscale-[20%]" aria-disabled="true">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left Column: Virtual Credit Card Mockup */}
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
                          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded">
                            <CreditCard size={12} />
                            <span>Card</span>
                          </div>
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

                  {/* Right Column: Disabled Input Fields */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Cardholder Full Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cardholder Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          disabled
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                          placeholder="NAME ON CARD"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-500 bg-slate-100 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Card Number */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Card Number (Visa / MasterCard) <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-blue-700 italic">VISA</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-amber-600">MasterCard</span>
                        </div>
                      </div>
                      <div className="relative">
                        <CreditCard size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          disabled
                          value={cardNumber}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          placeholder="•••• •••• •••• ••••"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-500 bg-slate-100 font-mono tracking-wider cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Expiration Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Expiration Date (MM / YY) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          disabled
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-500 bg-slate-100 font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Security Code / CVV */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          CVV / CVC <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400">3 or 4 digits</span>
                      </div>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="password"
                          disabled
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => handleCvvChange(e.target.value)}
                          placeholder="•••"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-500 bg-slate-100 font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zero-Charge Guarantee Callout */}
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2.5 text-xs text-slate-600">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    <strong className="text-slate-800">Zero Charge Today (RM 0.00):</strong> Billing begins automatically only after {trialDaysFormatted} trial. Cancel anytime before trial ends.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: MASTER ADMIN CREDENTIALS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                  4
                </span>
                Master Admin Account Setup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These credentials will be used to log in to your company&apos;s Master Admin Portal upon Super Admin approval.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Section 4 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Applicant / Contact Person Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Master Admin Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Lowercase letters, numbers, without spaces.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[11px] text-[#0b4da2] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={11} /> Auto-Generate
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Minimum 4 characters (include numbers & symbols for security).
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Special Inquiries / Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: TRUST & TERMS SUMMARY */}
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/60 rounded-3xl p-6 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white text-[#0b4da2] shadow-2xs flex items-center justify-center shrink-0 border border-blue-100">
              <ShieldCheck size={22} className="text-emerald-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Free Trial Guarantee</span>
                <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded uppercase">
                  100% Free
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Super Admin will approve your 3-day full access. You can test all features before any payment commitment.
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Selected Target Plan
            </span>
            <span className="text-sm font-extrabold text-[#0b4da2]">
              {currentPlanLabel} ({currentPlanPrice})
            </span>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="text-center pt-2">
          <button
            type="submit"
            disabled={isLoading || paymentMode === 'online' || paymentMode === 'card'}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-[#0b4da2] via-[#09428c] to-[#062d60] hover:from-[#09428c] hover:to-[#05234d] text-white font-extrabold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 border border-blue-400/20"
          >
            {paymentMode === 'online' || paymentMode === 'card' ? (
              <>
                <Clock size={18} className="text-amber-300" />
                <span>Coming Soon — Select Pay Later or Cash Payment</span>
              </>
            ) : isLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Submitting Complete Application...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} className="text-yellow-300" />
                <span>Submit Application &amp; Get 3-Days Free Trial</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 mt-3">
            By submitting, your application is forwarded to Super Admin for verification.
          </p>
        </div>
      </form>
    </div>
  );
}

export default function FreeTrialPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col justify-between text-slate-800">
      <Navbar />

      <div className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-4xl mx-auto py-24 text-center">
              <RefreshCw size={28} className="animate-spin text-[#0b4da2] mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500">Loading Free Trial Application...</p>
            </div>
          }
        >
          <FreeTrialForm />
        </Suspense>
      </div>

      <Footer />
    </main>
  );
}
