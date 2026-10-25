'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import {
  PLAN_PACKAGES,
  PlanPackageKey,
  submitTrialApplication,
  CompanyTrialApplication,
} from '@/lib/companyTrialAndFinanceStorage';

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
  const [selectedPlan, setSelectedPlan] = useState<PlanPackageKey>(initialPackage);
  const [companyName, setCompanyName] = useState('');
  const [roc, setRoc] = useState('');
  const [sector, setSector] = useState('Trading & Services');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notes, setNotes] = useState('');

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#0b4da2] via-[#093c7d] to-[#12284c] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-yellow-300">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Company Free Trial & Subscription Application
                </h3>
                <span className="hidden sm:inline-block bg-emerald-500/90 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                  3-Days Free
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                Get instant 3-day full access upon Super Admin review. Pay later to activate your package!
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
        <div className="p-5 sm:p-7 max-h-[80vh] overflow-y-auto">
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PLAN_PACKAGES.map((pkg) => {
                    const isSelected = selectedPlan === pkg.key;
                    return (
                      <button
                        key={pkg.key}
                        type="button"
                        onClick={() => setSelectedPlan(pkg.key)}
                        className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
                          <div className="font-bold text-slate-900 text-xs">{pkg.label}</div>
                          <div className="text-[11px] text-[#0b4da2] font-extrabold mt-0.5">
                            {pkg.currency} {pkg.price}
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                          <span className="text-emerald-700 font-bold">3-Day Trial</span>
                          <span className="text-slate-500">{pkg.savings}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 italic mt-2">
                  💡 <strong>Trial Guarantee:</strong> You will enjoy full features free for 3 days immediately upon Super Admin approval. Payment is only required to extend past the 3-day trial.
                </p>
              </div>

              {/* Step 2: Company Details */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#0b4da2]" />
                  <span>2. Company Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
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
                      ROC / Business Registration No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 202601004567 (123456-X)"
                      value={roc}
                      onChange={(e) => setRoc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Business Sector / Industry
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-white"
                    >
                      <option value="Trading & Services">Trading & Services</option>
                      <option value="Manufacturing & Production">Manufacturing & Production</option>
                      <option value="Construction & Engineering">Construction & Engineering</option>
                      <option value="Information Technology & Software">Information Technology & Software</option>
                      <option value="Healthcare & Pharmaceutical">Healthcare & Pharmaceutical</option>
                      <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                      <option value="Food & Beverage / Hospitality">Food & Beverage / Hospitality</option>
                      <option value="Retail & E-commerce">Retail & E-commerce</option>
                      <option value="Other Commercial Business">Other Commercial Business</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Official Company Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="contact@yourcompany.com"
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

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Business Address
                    </label>
                    <input
                      type="text"
                      placeholder="City, State, Country"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Master Admin Account Setup */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#0b4da2]" />
                    <span>3. Master Admin Account (For Logging In)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Full control over your company workspace
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Applicant / Director Name <span className="text-rose-500">*</span>
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
                      placeholder="e.g. johndoe_admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
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
                    Additional Requirements or Special Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tell us any specific modules or services you need tailored..."
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
