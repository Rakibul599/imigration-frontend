'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
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
  PLAN_PACKAGES,
  PlanPackageKey,
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
          setDynamicPlans(res);
          if (!planParam) {
            const pop = res.find((p) => p.is_popular) || res[0];
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
  const [sector, setSector] = useState(SECTOR_OPTIONS[0]);
  const [companySectors, setCompanySectors] = useState<string[]>([SECTOR_OPTIONS[0]]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState<string>('');
  const [tag, setTag] = useState('Verified JIM');
  const [totalWorkers, setTotalWorkers] = useState<number>(0);
  const [description, setDescription] = useState('');

  // Section 3: Localization & Bank Account Details
  const [currency, setCurrency] = useState('MYR');
  const [language, setLanguage] = useState('English');
  const [bankName, setBankName] = useState('Maybank (Malayan Banking Berhad)');
  const [customBankName, setCustomBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');

  // Section 4: Managing Directors
  const [directors, setDirectors] = useState<ApplicationDirector[]>([createEmptyDirector(1)]);

  // Section 5: Master Admin Account Setup
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
  const fallbackPkg = PLAN_PACKAGES.find((p) => p.key === selectedPlan) || PLAN_PACKAGES[1];
  const currentPlanLabel = activeDynamic ? activeDynamic.name : fallbackPkg.label;
  const currentPlanPrice = activeDynamic
    ? `${activeDynamic.currency} ${activeDynamic.price}`
    : `${fallbackPkg.currency} ${fallbackPkg.price}`;

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

  const handleToggleSector = (sec: string) => {
    setCompanySectors((prev) => {
      if (prev.includes(sec)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((s) => s !== sec);
      } else {
        return [...prev, sec];
      }
    });
  };

  const handleAddDirector = () => {
    setDirectors((prev) => [...prev, createEmptyDirector(prev.length + 1)]);
  };

  const handleRemoveDirector = (index: number) => {
    if (directors.length <= 1) {
      alert('At least one Managing Director / Key Officer is required.');
      return;
    }
    setDirectors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDirectorChange = (index: number, field: keyof ApplicationDirector, value: any) => {
    setDirectors((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Auto sync applicant name if it's the primary director and applicant name is empty or matched previous
    if (index === 0 && field === 'name' && (!applicantName || applicantName === directors[0]?.name)) {
      setApplicantName(value);
    }
  };

  const handleCopyCredentials = () => {
    if (!submittedApp) return;
    const text = `Company: ${submittedApp.company_name}\nUsername: ${submittedApp.master_admin_username}\nTarget Plan: ${currentPlanLabel}\nTrial Period: 3 Days Free Trial\nStatus: Pending Super Admin Approval\nLogin URL: ${window.location.origin}/masteradmin/login`;
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

    const primaryDirectorName = directors[0]?.name?.trim();
    const finalApplicantName = applicantName.trim() || primaryDirectorName;
    if (!finalApplicantName) {
      setErrorMessage('Please enter the Managing Director / Applicant Name.');
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

    const resolvedBankName =
      bankName === 'Other Corporate Bank' && customBankName.trim()
        ? customBankName.trim()
        : bankName;

    setIsLoading(true);
    try {
      const res = await submitTrialApplication({
        company_name: companyName.trim(),
        roc: roc.trim() || undefined,
        sector: sector.trim() || undefined,
        sectors: companySectors.length > 0 ? companySectors : [sector],
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        logo: logo || undefined,
        currency: currency || 'MYR',
        language: language || 'English',
        bank_name: resolvedBankName || undefined,
        bank_account_name: bankAccountName.trim() || undefined,
        bank_account_no: bankAccountNo.trim() || undefined,
        tag: tag.trim() || 'Verified JIM',
        total_workers: Number(totalWorkers) || 0,
        description: description.trim() || undefined,
        directors: directors.filter((d) => d.name.trim()),
        plan_package: selectedPlan,
        applicant_name: finalApplicantName,
        master_admin_username: username.trim(),
        master_admin_password: password,
        notes: notes.trim() || undefined,
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
          <div className="flex items-center justify-between mb-5">
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
            <span className="hidden sm:inline-block text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              3 Days Free Guaranteed
            </span>
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
                            {pkg.badge && (
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs tracking-wider ${
                                  pkg.is_popular
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {pkg.badge}
                              </span>
                            )}
                            {pkg.is_popular && !pkg.badge && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs tracking-wider">
                                POPULAR
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
                        {pkg.savings_text && (
                          <span className="text-[#0b4da2] bg-blue-50 px-2 py-0.5 rounded font-extrabold text-[10px] truncate">
                            {pkg.savings_text}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              : PLAN_PACKAGES.map((pkg) => {
                  const isSelected = selectedPlan === pkg.key;
                  const durationDays = Number(pkg.durationDays || 30);
                  const isFreePrice = Number(pkg.price) === 0;

                  let durationText = '';
                  if (durationDays === 30) durationText = '1 Month';
                  else if (durationDays === 90) durationText = '3 Months';
                  else if (durationDays === 180) durationText = '6 Months';
                  else if (durationDays === 300) durationText = '10 Months';
                  else durationText = `${durationDays} Days`;

                  const trialText = '3 Days Free';

                  return (
                    <div
                      key={pkg.key}
                      onClick={() => setSelectedPlan(pkg.key)}
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
                            {pkg.badge && (
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs tracking-wider ${
                                  pkg.popular
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {pkg.badge}
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
                          {pkg.label && !pkg.label.toLowerCase().startsWith(durationText.toLowerCase()) && (
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                              {pkg.label}
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
                        <span className="text-slate-500 truncate">{pkg.durationDays} Days Access</span>
                        <span className="text-[#0b4da2] bg-blue-50 px-2 py-0.5 rounded font-extrabold text-[10px] truncate">
                          {pkg.savings}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                Company Profile &amp; Core Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official corporate details identical to the company master creation registry.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Section 2 of 5</span>
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
                  placeholder="e.g. Apex Global Industries Sdn Bhd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
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
                placeholder="e.g. 202401009876 (123456-X)"
                value={roc}
                onChange={(e) => setRoc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white font-mono"
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
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
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
                  placeholder="+60 12-345 6789 / +880 1712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            </div>

            {/* Total Workers */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Initial Total Workers <span className="text-slate-400 font-normal">(Count)</span>
              </label>
              <div className="relative">
                <Users size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={totalWorkers}
                  onChange={(e) => setTotalWorkers(parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            </div>

            {/* Primary Sector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Industry Sector
              </label>
              <select
                value={sector}
                onChange={(e) => {
                  setSector(e.target.value);
                  if (!companySectors.includes(e.target.value)) {
                    setCompanySectors([e.target.value, ...companySectors]);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              >
                {SECTOR_OPTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag / Category Badge */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Verification / Category Tag
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              >
                {TAG_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Working Sectors (Multiple Checkboxes) */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Working Sectors / Active Lines of Business
              </label>
              <div className="flex flex-wrap gap-2">
                {SECTOR_OPTIONS.map((sec) => {
                  const active = companySectors.includes(sec);
                  return (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => handleToggleSector(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                        active
                          ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {active ? `✓ ${sec}` : `+ ${sec}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Office Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Office / Business Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Level 12, Tower A, Business District, Kuala Lumpur"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
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
                placeholder="Brief summary of company operations, products, or services..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: LOCALIZATION & BANK ACCOUNT */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                  3
                </span>
                Localization &amp; Corporate Bank Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Currency, operational language, and official company banking details.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Section 3 of 5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Currency */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Operating Currency <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Coins size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary System Language <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Languages size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Corporate Bank Name
              </label>
              <div className="relative">
                <Wallet size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                >
                  {BANK_PRESETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Bank Name if "Other" */}
            {bankName === 'Other Corporate Bank' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specify Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank of China / Standard Chartered"
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            )}

            {/* Bank Account Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Account Name
              </label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Apex Global Industries Sdn Bhd"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
                />
              </div>
            </div>

            {/* Bank Account No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Account / IBAN Number
              </label>
              <input
                type="text"
                placeholder="e.g. 5140 1234 5678"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: MANAGING DIRECTORS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                  4
                </span>
                Managing Director / Board Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record details for company director(s), identity numbers, and vehicle schemes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddDirector}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0b4da2] hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer border border-blue-200"
            >
              <Plus size={14} />
              <span>Add Another Director</span>
            </button>
          </div>

          <div className="space-y-6">
            {directors.map((dir, idx) => (
              <div
                key={dir.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 relative"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-xs text-slate-900">
                      {idx === 0 ? 'Primary Managing Director / CEO' : `Director #${idx + 1}`}
                    </span>
                  </div>

                  {directors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDirector(idx)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Director Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Director Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={idx === 0}
                      placeholder="e.g. Dato' Sri Tan / Rakibul Alam"
                      value={dir.name}
                      onChange={(e) => handleDirectorChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white"
                    />
                  </div>

                  {/* NID */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      National ID (NID / MyKad)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 880101-14-5555"
                      value={dir.nidNo}
                      onChange={(e) => handleDirectorChange(idx, 'nidNo', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white font-mono"
                    />
                  </div>

                  {/* Passport */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Passport No. <span className="text-slate-400 font-normal">(If expat)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A12345678"
                      value={dir.passportNo}
                      onChange={(e) => handleDirectorChange(idx, 'passportNo', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white font-mono"
                    />
                  </div>

                  {/* Personal Phone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Personal Phone / Mobile
                    </label>
                    <input
                      type="text"
                      placeholder="+60 12-345 6789"
                      value={dir.phone}
                      onChange={(e) => handleDirectorChange(idx, 'phone', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white"
                    />
                  </div>

                  {/* Personal Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Personal / Direct Email
                    </label>
                    <input
                      type="email"
                      placeholder="director@company.com"
                      value={dir.email}
                      onChange={(e) => handleDirectorChange(idx, 'email', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white"
                    />
                  </div>

                  {/* SOCSO */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      SOCSO (PERKESO) No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SOC1234567"
                      value={dir.socsoNo}
                      onChange={(e) => handleDirectorChange(idx, 'socsoNo', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white font-mono"
                    />
                  </div>

                  {/* EPF */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      EPF (KWSP) No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EPF9876543"
                      value={dir.epfNo}
                      onChange={(e) => handleDirectorChange(idx, 'epfNo', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white font-mono"
                    />
                  </div>

                  {/* Basic Salary */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Basic Salary ({currency})
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 15000"
                      value={dir.basicSalary}
                      onChange={(e) => handleDirectorChange(idx, 'basicSalary', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white"
                    />
                  </div>

                  {/* Company Car Scheme Sub-Card */}
                  <div className="col-span-1 sm:col-span-2 lg:col-span-4 p-4 bg-white rounded-xl border border-slate-200 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-800 mb-3">
                      <Car size={14} className="text-[#0b4da2] shrink-0" />
                      <span>Executive Car Scheme</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="min-w-0">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 truncate" title="Scheme Type">
                          Scheme Type
                        </label>
                        <select
                          value={dir.carPurchaseType}
                          onChange={(e) =>
                            handleDirectorChange(idx, 'carPurchaseType', e.target.value as 'emi' | 'cash')
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                        >
                          <option value="emi">Installment (EMI)</option>
                          <option value="cash">Company Cash</option>
                        </select>
                      </div>

                      <div className="min-w-0">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 truncate" title="Car Plate No.">
                          Car Plate No.
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. WYY 8888"
                          value={dir.carPlateNo}
                          onChange={(e) => handleDirectorChange(idx, 'carPlateNo', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 uppercase font-mono focus:outline-none focus:border-[#0b4da2]"
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 truncate" title="Vehicle Total Value">
                          Vehicle Total Value
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 180000"
                          value={dir.carAmount}
                          onChange={(e) => handleDirectorChange(idx, 'carAmount', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 truncate" title="Total Paid / Downpayment">
                          Downpayment / Paid
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 36000"
                          value={dir.carTotalPayment}
                          onChange={(e) => handleDirectorChange(idx, 'carTotalPayment', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: MASTER ADMIN CREDENTIALS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                  5
                </span>
                Master Admin Account Setup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These credentials will be used to log in to your company&apos;s Master Admin Portal upon Super Admin approval.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Section 5 of 5</span>
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
                  placeholder="e.g. John Doe / Rakibul Alam"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
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
                  placeholder="e.g. apexadmin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white font-mono"
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
                  placeholder="Set Master Admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
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
                placeholder="Mention any custom integrations, number of branches, or requirements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
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
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-[#0b4da2] via-[#09428c] to-[#062d60] hover:from-[#09428c] hover:to-[#05234d] text-white font-extrabold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-blue-400/20"
          >
            {isLoading ? (
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
