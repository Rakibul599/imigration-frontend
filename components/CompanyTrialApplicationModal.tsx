'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
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
  Eye,
  EyeOff,
  Globe2,
  Image as ImageIcon,
  KeyRound,
  Languages,
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
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  PLAN_PACKAGES,
  PlanPackageKey,
  submitTrialApplication,
  CompanyTrialApplication,
} from '@/lib/companyTrialAndFinanceStorage';

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
  { code: 'MYR', name: 'Malaysian Ringgit (RM)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'BDT', name: 'Bangladeshi Taka (৳)' },
  { code: 'IDR', name: 'Indonesian Rupiah (Rp)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
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

export interface ModalDirector {
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

function createEmptyDirector(index = 1): ModalDirector {
  return {
    id: `dir-modal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

interface CompanyTrialApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackage?: PlanPackageKey;
}

export default function CompanyTrialApplicationModal({
  isOpen,
  onClose,
  initialPackage = '3_months',
}: CompanyTrialApplicationModalProps) {
  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<PlanPackageKey>(initialPackage);

  // Company core
  const [companyName, setCompanyName] = useState('');
  const [roc, setRoc] = useState('');
  const [sector, setSector] = useState(SECTOR_OPTIONS[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState<string>('');
  const [tag, setTag] = useState('Verified JIM');
  const [totalWorkers, setTotalWorkers] = useState<number>(0);
  const [description, setDescription] = useState('');

  // Localization & Banking
  const [currency, setCurrency] = useState('MYR');
  const [language, setLanguage] = useState('English');
  const [bankName, setBankName] = useState(BANK_PRESETS[0]);
  const [customBankName, setCustomBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');

  // Directors
  const [directors, setDirectors] = useState<ModalDirector[]>([createEmptyDirector(1)]);

  // Master admin setup
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

  if (!isOpen) return null;

  const currentPkg = PLAN_PACKAGES.find((p) => p.key === selectedPlan) || PLAN_PACKAGES[1];

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

  const handleAddDirector = () => {
    setDirectors((prev) => [...prev, createEmptyDirector(prev.length + 1)]);
  };

  const handleRemoveDirector = (index: number) => {
    if (directors.length <= 1) return;
    setDirectors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDirectorChange = (index: number, field: keyof ModalDirector, value: any) => {
    setDirectors((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (index === 0 && field === 'name' && (!applicantName || applicantName === directors[0]?.name)) {
      setApplicantName(value);
    }
  };

  const handleCopyCredentials = () => {
    if (!submittedApp) return;
    const text = `Master Admin Portal Login\nUsername: ${submittedApp.master_admin_username}\nCompany: ${submittedApp.company_name}\nTrial Access: 3 Days Free Trial\nStatus: Pending Super Admin Approval\nLogin URL: ${window.location.origin}/masteradmin/login`;
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
      setErrorMessage('Please enter a Phone/WhatsApp contact number.');
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
        sectors: [sector],
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#0b4da2] via-[#093c7d] to-[#12284c] text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-yellow-300">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Company Application &amp; Free Trial
                </h3>
                <span className="hidden sm:inline-block bg-emerald-500/90 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                  3-Days Free
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                Complete company registry with full banking, director, and admin details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer border-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1">
          {submittedApp ? (
            /* Success Screen */
            <div className="text-center py-4 px-2 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">Application Submitted Successfully!</h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
                  Your application for <strong className="text-slate-900">{submittedApp.company_name}</strong> has been routed to Super Admin for approval.
                </p>
              </div>

              {/* Status Notice Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left max-w-lg mx-auto">
                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Next Steps for Activation:</p>
                    <p>
                      1. <strong>Super Admin Approval:</strong> Once Super Admin verifies and clicks &ldquo;Approve&rdquo;, your Master Admin account is granted <strong>3 Days Full Free Trial</strong> access.
                    </p>
                    <p>
                      2. <strong>Package Subscription:</strong> When payment is arranged, your full <strong>{currentPkg.label} ({currentPkg.durationDays} Days)</strong> will be activated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Credentials Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left max-w-lg mx-auto space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Master Admin Credentials
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0b4da2] hover:underline cursor-pointer bg-transparent border-0"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Info'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Company Name</span>
                    <strong className="text-slate-800">{submittedApp.company_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Selected Package</span>
                    <strong className="text-slate-800">{currentPkg.label}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Username</span>
                    <code className="text-[#0b4da2] font-bold bg-blue-50 px-1 rounded">
                      {submittedApp.master_admin_username}
                    </code>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status</span>
                    <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending Approval
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/masteradmin/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all no-underline"
                >
                  <span>Go to Master Admin Sign In</span>
                  <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-300"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Application Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Step 1: Select Desired Package */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#0b4da2]" />
                    <span>1. Select Subscription Package (Includes 3-Days Free Trial)</span>
                  </label>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    ✓ Pay RM 0.00 today
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-stretch">
                  {PLAN_PACKAGES.map((pkg) => {
                    const isSelected = selectedPlan === pkg.key;
                    const isOneMonth = pkg.key === '1_month';
                    return (
                      <button
                        key={pkg.key}
                        type="button"
                        onClick={() => setSelectedPlan(pkg.key)}
                        className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-full min-w-0 ${
                          isSelected
                            ? 'border-[#0b4da2] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pkg.badge && (
                          <span
                            className={`absolute -top-2 right-2 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full shadow-2xs ${
                              pkg.popular
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {pkg.badge}
                          </span>
                        )}
                        <div>
                          <div className="font-black text-slate-900 text-xs flex items-center gap-1 flex-wrap">
                            <span>{pkg.label}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {isOneMonth ? '1-Mo Free' : '3 Days Free'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#0b4da2] font-black mt-1">
                            {pkg.currency} {pkg.price}
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1 text-[10px]">
                          <span className="text-slate-500 font-medium truncate">{pkg.durationDays} Days</span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded truncate">{pkg.savings}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Company Core Details */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#0b4da2]" />
                  <span>2. Company Information</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Company Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Global Engineering Sdn Bhd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ROC / Registration No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 202601004567 (123456-X)"
                      value={roc}
                      onChange={(e) => setRoc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Business Sector
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-white"
                    >
                      {SECTOR_OPTIONS.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Official Contact Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="contact@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Phone / WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+60 12-345 6789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Business Office Address
                    </label>
                    <input
                      type="text"
                      placeholder="Level 12, Tower A, Kuala Lumpur"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Initial Total Workers
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalWorkers}
                      onChange={(e) => setTotalWorkers(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Company Logo (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <div className="relative w-11 h-11 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          <img src={logo} alt="Company Logo" className="max-h-full max-w-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setLogo('')}
                            className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 cursor-pointer shadow"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold">
                        <UploadCloud size={13} className="text-[#0b4da2]" />
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
                </div>
              </div>

              {/* Step 3: Localization & Bank Account */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={14} className="text-[#0b4da2]" />
                  <span>3. Currency &amp; Bank Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Operating Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      System Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      {LANGUAGE_OPTIONS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bank Name
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      {BANK_PRESETS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bank Account Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Global Sdn Bhd"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bank Account / IBAN No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5140 1234 5678"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Managing Director(s) */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-[#0b4da2]" />
                    <span>4. Managing Director / Key Officer Details</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddDirector}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b4da2] hover:underline cursor-pointer bg-transparent border-0"
                  >
                    <Plus size={12} />
                    <span>Add Director</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {directors.map((dir, idx) => (
                    <div
                      key={dir.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="font-bold text-slate-800 text-[11px]">
                          {idx === 0 ? 'Primary Director / CEO' : `Director #${idx + 1}`}
                        </span>
                        {directors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDirector(idx)}
                            className="text-rose-500 hover:text-rose-700 text-[11px] font-semibold bg-transparent border-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Director Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required={idx === 0}
                            placeholder="e.g. Dato' Sri Tan / Rakibul Alam"
                            value={dir.name}
                            onChange={(e) => handleDirectorChange(idx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            NID / MyKad No.
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 880101-14-5555"
                            value={dir.nidNo}
                            onChange={(e) => handleDirectorChange(idx, 'nidNo', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Passport No.
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. A12345678"
                            value={dir.passportNo}
                            onChange={(e) => handleDirectorChange(idx, 'passportNo', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Personal Phone
                          </label>
                          <input
                            type="text"
                            placeholder="+60 12-345 6789"
                            value={dir.phone}
                            onChange={(e) => handleDirectorChange(idx, 'phone', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Monthly Salary ({currency})
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 15000"
                            value={dir.basicSalary}
                            onChange={(e) => handleDirectorChange(idx, 'basicSalary', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                          />
                        </div>

                        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-white rounded-lg border border-slate-200">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 mb-0.5">
                              Car Scheme
                            </label>
                            <select
                              value={dir.carPurchaseType}
                              onChange={(e) =>
                                handleDirectorChange(idx, 'carPurchaseType', e.target.value as 'emi' | 'cash')
                              }
                              className="w-full px-2 py-1 rounded border border-slate-300 text-[11px] bg-white"
                            >
                              <option value="emi">Installment (EMI)</option>
                              <option value="cash">Company Cash</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 mb-0.5">
                              Car Plate No.
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. WYY 8888"
                              value={dir.carPlateNo}
                              onChange={(e) => handleDirectorChange(idx, 'carPlateNo', e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-300 text-[11px] font-mono uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 mb-0.5">
                              Car Value / Amount
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 180000"
                              value={dir.carAmount}
                              onChange={(e) => handleDirectorChange(idx, 'carAmount', e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-300 text-[11px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 5: Master Admin Account Setup */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#0b4da2]" />
                    <span>5. Master Admin Login Setup</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Credentials for logging in to Master Admin
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Applicant / Contact Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Master Admin Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. apexadmin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="text-[10px] text-[#0b4da2] hover:underline cursor-pointer bg-transparent border-0 font-bold"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Min 4 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    Additional Notes / Requests (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tell us any specific requirements or modules you need..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#0b4da2] to-[#083877] hover:from-[#093c7d] hover:to-[#062c5e] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application (3-Days Free Trial)</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
