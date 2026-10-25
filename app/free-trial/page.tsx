'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
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

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [roc, setRoc] = useState('');
  const [sector, setSector] = useState('Information Technology');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
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
  const currentPlanPrice = activeDynamic ? `${activeDynamic.currency} ${activeDynamic.price}` : `${fallbackPkg.currency} ${fallbackPkg.price}`;

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
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
    if (!applicantName.trim()) {
      setErrorMessage('Please enter the Applicant / Managing Director Name.');
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
      const res = await submitTrialApplication({
        company_name: companyName.trim(),
        roc: roc.trim() || undefined,
        sector: sector.trim() || undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        plan_package: selectedPlan,
        applicant_name: applicantName.trim(),
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
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 sm:p-10 text-center relative overflow-hidden">
          {/* Decorative backdrop */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />

          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 size={36} />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider mb-3">
            <Sparkles size={13} className="text-emerald-500" />
            Application Submitted
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Free Trial Request Received!
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-8">
            Your application for <span className="font-bold text-slate-900">{submittedApp.company_name}</span> has
            been sent to the Super Admin. Upon approval, you will enjoy{' '}
            <strong className="text-emerald-700">3 Days of completely free Master Admin access</strong>.
          </p>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 text-left mb-8 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Application ID</span>
              <span className="font-mono font-bold text-slate-900">#APP-{submittedApp.id}</span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Target Subscription</span>
              <span className="font-bold text-[#0b4da2]">
                {currentPlanLabel} ({currentPlanPrice})
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Free Trial Duration</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                3 Days Free Trial (Zero Cost)
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Master Admin Username</span>
              <span className="font-mono font-bold text-slate-900">{submittedApp.master_admin_username}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Current Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <Clock size={12} /> Pending Super Admin Review
              </span>
            </div>
          </div>

          {/* Next Steps Guide */}
          <div className="bg-blue-50/60 rounded-2xl p-5 border border-blue-100/80 text-left mb-8">
            <h4 className="text-xs font-bold text-[#0b4da2] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              What Happens Next?
            </h4>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Super Admin will verify your company details and approve your 3-day trial.</li>
              <li>Once approved, you can log in to Master Admin using your chosen credentials.</li>
              <li>You can test attendance, employees, requests, face matching, and billing.</li>
              <li>After 3 days, simply complete payment to activate your full {currentPlanLabel} package.</li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Credentials Copied!' : 'Copy Info'}</span>
            </button>

            <Link
              href="/masteradmin/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer no-underline"
            >
              <span>Master Admin Login</span>
              <ExternalLink size={14} />
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer no-underline"
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // APPLICATION FORM VIEW
  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#0b4da2] transition-colors no-underline group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Homepage</span>
        </Link>

        <span className="text-xs font-semibold text-slate-400">
          Step 1 of 1 • Instant Application
        </span>
      </div>

      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-extrabold uppercase tracking-wider mb-4 shadow-2xs">
          <Sparkles size={14} className="text-amber-500" />
          <span>3-Days Free Trial • Zero Risk</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          Start Your <span className="text-[#0b4da2]">3-Day Free Trial</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Select your target subscription package and register your company. Get{' '}
          <strong className="text-slate-900 font-bold">3 days of full Master Admin access</strong> upon Super Admin
          approval. No credit card or advance payment required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between animate-shake">
            <span>{errorMessage}</span>
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
                All plans include a 3-Day Free Trial first. You only pay if you decide to continue.
              </p>
            </div>
            <span className="hidden sm:inline-block text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              3 Days Free Guaranteed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {dynamicPlans.length > 0
              ? dynamicPlans.map((pkg) => {
                  const isSelected = selectedPlan === pkg.plan_key;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPlan(pkg.plan_key)}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#0b4da2] bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      {pkg.badge && (
                        <div className="absolute -top-2.5 right-3">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-2xs ${
                              pkg.is_popular ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {pkg.badge}
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-extrabold text-slate-900">{pkg.name}</div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                              isSelected
                                ? 'bg-[#0b4da2] border-[#0b4da2] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        <div className="mb-2">
                          <span className="text-xs font-bold text-slate-500">{pkg.currency} </span>
                          <span className="text-xl font-black text-slate-900">{pkg.price}</span>
                        </div>

                        <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                          <Sparkles size={11} className="text-amber-500" />
                          <span>{pkg.trial_days || 3} Days Free Trial</span>
                        </div>

                        {pkg.description && (
                          <p className="text-[11px] text-slate-500 leading-tight mb-2">{pkg.description}</p>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/80 text-[10px] font-bold text-slate-600 flex items-center justify-between">
                        <span>{pkg.duration_days} Days Sub</span>
                        {pkg.savings_text && <span className="text-[#0b4da2]">{pkg.savings_text}</span>}
                      </div>
                    </div>
                  );
                })
              : PLAN_PACKAGES.map((pkg) => {
                  const isSelected = selectedPlan === pkg.key;
                  return (
                    <div
                      key={pkg.key}
                      onClick={() => setSelectedPlan(pkg.key)}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#0b4da2] bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      {pkg.badge && (
                        <div className="absolute -top-2.5 right-3">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-2xs ${
                              pkg.popular ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {pkg.badge}
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-extrabold text-slate-900">{pkg.label}</div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                              isSelected
                                ? 'bg-[#0b4da2] border-[#0b4da2] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        <div className="mb-2">
                          <span className="text-xs font-bold text-slate-500">{pkg.currency} </span>
                          <span className="text-xl font-black text-slate-900">{pkg.price}</span>
                        </div>

                        <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                          <Sparkles size={11} className="text-amber-500" />
                          <span>3 Days Free Trial</span>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-tight">{pkg.description}</p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/80 text-[10px] font-bold text-slate-600 flex items-center justify-between">
                        <span>{pkg.durationDays} Days Sub</span>
                        <span className="text-[#0b4da2]">{pkg.savings}</span>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* SECTION 2: COMPANY INFORMATION */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-5">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                2
              </span>
              Company Information
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your official business information for company registration in the agency system.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registration / ROC No. <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 202401009876 (123456-X)"
                value={roc}
                onChange={(e) => setRoc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Industry Sector
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              >
                <option value="Information Technology">Information Technology / Software</option>
                <option value="Trading & Services">Trading & General Services</option>
                <option value="Manufacturing">Manufacturing & Production</option>
                <option value="Construction & Engineering">Construction & Engineering</option>
                <option value="Healthcare & Medical">Healthcare & Medical</option>
                <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                <option value="Education & Training">Education & Training</option>
                <option value="Financial & Accounting">Financial & Accounting</option>
                <option value="Other">Other Enterprise</option>
              </select>
            </div>

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

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Office / Business Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Level 12, Tower A, Business District"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: MASTER ADMIN CREDENTIALS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-5">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b4da2] text-xs font-black flex items-center justify-center">
                3
              </span>
              Master Admin Account Setup
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These credentials will be used to log in to your company&apos;s Master Admin Portal upon Super Admin approval.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Applicant / Managing Director Full Name <span className="text-rose-500">*</span>
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

        {/* SECTION 4: TRUST & TERMS SUMMARY */}
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
                <span>Submitting Trial Application...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} className="text-yellow-300" />
                <span>Submit Application & Get 3-Days Free Trial</span>
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
