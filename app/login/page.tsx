'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Globe2,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { companies, Company } from '@/lib/companies';
import { services, Service } from '@/lib/services';

// Default Credentials for Demo
const DEFAULT_USER_ID = 'DEMO2026';
const DEFAULT_PASSWORD = 'password123';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');
  const serviceParam = searchParams.get('service');

  const isServiceLogin = Boolean(serviceParam);

  const matchedService =
    services.find(
      (s) =>
        s.id.toLowerCase() === (serviceParam || '').toLowerCase() ||
        s.title.toLowerCase() === (serviceParam || '').toLowerCase()
    ) || services[0];

  const matchedCompany =
    companies.find(
      (c) =>
        c.id.toLowerCase() === (companyParam || '').toLowerCase() ||
        c.name.toLowerCase().includes((companyParam || '').toLowerCase())
    ) || companies[0];

  const [selectedService, setSelectedService] = useState<Service>(matchedService);
  const [selectedCompany, setSelectedCompany] = useState<Company>(matchedCompany);
  const [role, setRole] = useState<'Admin' | 'Employee'>('Employee');
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (serviceParam) {
      const found = services.find(
        (s) =>
          s.id.toLowerCase() === serviceParam.toLowerCase() ||
          s.title.toLowerCase() === serviceParam.toLowerCase()
      );
      if (found) {
        setSelectedService(found);
      }
    }
  }, [serviceParam]);

  useEffect(() => {
    if (companyParam) {
      const found = companies.find(
        (c) =>
          c.id.toLowerCase() === companyParam.toLowerCase() ||
          c.name.toLowerCase().includes(companyParam.toLowerCase())
      );
      if (found) {
        setSelectedCompany(found);
      }
    }
  }, [companyParam]);

  const handleQuickFill = () => {
    setUserId(DEFAULT_USER_ID);
    setPassword(DEFAULT_PASSWORD);
    setFeedback({
      type: 'info',
      message: 'Demo credentials loaded! Click LOGIN to authenticate.',
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    // Store active session in localStorage
    try {
      localStorage.setItem('activeCompany', JSON.stringify(selectedCompany));
      if (isServiceLogin) {
        localStorage.setItem('activeService', JSON.stringify(selectedService));
      }
      localStorage.setItem('isLoggedIn', 'true');
    } catch {}

    setTimeout(() => {
      setIsLoading(false);
      if (isServiceLogin) {
        // If last card (work-information), redirect to the new MYPASS@JIM demo page!
        const isLastCard =
          selectedService.id === 'work-information' ||
          selectedService.id === services[services.length - 1].id;

        if (isLastCard) {
          setFeedback({
            type: 'success',
            message: `Authentication verified for ${selectedService.title} (${selectedCompany.name})! Opening MYPASS@JIM Portal...`,
          });
          setTimeout(() => {
            router.push(`/mypass?company=${encodeURIComponent(selectedCompany.id)}`);
          }, 600);
          return;
        }

        setFeedback({
          type: 'success',
          message: `Authentication verified for ${selectedService.title} (${selectedCompany.name})! Opening authorized portal...`,
        });
        setTimeout(() => {
          router.push(
            `/services?company=${encodeURIComponent(selectedCompany.id)}&verifiedService=${encodeURIComponent(selectedService.id)}`
          );
        }, 600);
      } else if (companyParam) {
        setFeedback({
          type: 'success',
          message: `Authentication verified for ${selectedCompany.name}! Loading digital service cards...`,
        });
        setTimeout(() => {
          router.push(`/services?company=${encodeURIComponent(selectedCompany.id)}`);
        }, 500);
      } else {
        setFeedback({
          type: 'success',
          message: `Authentication verified as ${role}! Loading company directory...`,
        });
        setTimeout(() => {
          router.push('/companies');
        }, 500);
      }
    }, 600);
  };

  const handleForgotPassword = () => {
    setFeedback({
      type: 'info',
      message:
        'Password reset request logged. For demo access, use default credentials: User ID: DEMO2026 | Password: password123',
    });
  };

  return (
    <div className="w-full max-w-[540px] mx-auto">
      {/* Breadcrumb */}
      <div className="w-full mx-auto mb-3.5 flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Home
        </Link>
        <ChevronRight size={13} />
        <Link href="/companies" className="hover:text-blue-600 transition-colors">
          Employers
        </Link>
        <ChevronRight size={13} />
        {isServiceLogin ? (
          <>
            <Link
              href={`/services?company=${encodeURIComponent(selectedCompany.id)}`}
              className="hover:text-blue-600 transition-colors truncate max-w-[130px]"
            >
              {selectedCompany.name}
            </Link>
            <ChevronRight size={13} />
            <span className="text-slate-800 font-semibold">{selectedService.title} Login</span>
          </>
        ) : (
          <span className="text-slate-800 font-semibold">Authentication Portal</span>
        )}
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-3xl shadow-[0_20px_50px_-15px_rgba(7,42,107,0.18)] border border-slate-200/90 overflow-hidden">
        {/* Card Header with official Malaysian navy gradient */}
        <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white p-6 sm:p-7 relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            {isServiceLogin ? (
              <>
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1 text-[11px] font-semibold text-yellow-300">
                  <img
                    src={selectedService.image}
                    alt=""
                    className="w-4 h-4 object-contain rounded bg-white/90 p-0.5"
                  />
                  <span className="truncate max-w-[180px]">{selectedService.title}</span>
                </div>
                <select
                  value={selectedService.id}
                  onChange={(e) => {
                    const s = services.find((srv) => srv.id === e.target.value);
                    if (s) setSelectedService(s);
                  }}
                  className="text-[11px] bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg px-2 py-1 font-medium outline-none cursor-pointer"
                  aria-label="Change target service"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id} className="text-slate-800 bg-white">
                      {s.title}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1 text-[11px] font-semibold text-yellow-300">
                  <img
                    src={selectedCompany.logo}
                    alt=""
                    className="w-4 h-4 object-contain rounded-full bg-white p-0.5"
                  />
                  <span className="truncate max-w-[180px]">{selectedCompany.name}</span>
                </div>
                <select
                  value={selectedCompany.id}
                  onChange={(e) => {
                    const c = companies.find((comp) => comp.id === e.target.value);
                    if (c) setSelectedCompany(c);
                  }}
                  className="text-[11px] bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg px-2 py-1 font-medium outline-none cursor-pointer"
                  aria-label="Change target company"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-800 bg-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0 leading-snug">
            Please Log In To Enter The System
          </h1>
          <p className="text-xs text-blue-100/90 tracking-wide mt-1.5 font-medium">
            Malaysian Immigration Department • Foreign Workers Division
          </p>

          {isServiceLogin && (
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/15 text-[11px] text-blue-100/90 font-medium">
              <div className="flex items-center gap-2">
                <Building2 size={13} className="text-yellow-300 shrink-0" />
                <span>
                  Employer: <strong className="text-white font-semibold">{selectedCompany.name}</strong>
                </span>
              </div>
              <span className="font-mono text-[10px] text-blue-200/90 bg-white/10 px-2 py-0.5 rounded">
                {selectedCompany.roc}
              </span>
            </div>
          )}
        </div>

        {/* Demo Fast-Login Helper Callout */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Default Demo:</strong> User ID: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-950 font-bold">{DEFAULT_USER_ID}</code> • Pass: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-950 font-bold">{DEFAULT_PASSWORD}</code>
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickFill}
            className="text-[11px] bg-amber-200 hover:bg-amber-300 text-amber-950 px-2.5 py-1 rounded-md font-bold transition-colors shrink-0 cursor-pointer border-0"
          >
            Auto Fill
          </button>
        </div>

        {/* Card Form */}
        <form onSubmit={handleLogin} className="p-6 sm:p-7 flex flex-col gap-4 sm:gap-5">
          {/* Status Message */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Info size={17} className="text-blue-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* Role: Admin / Employee Login */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3.5 flex-wrap py-0.5">
              <label className="text-[13.5px] font-bold text-slate-900 shrink-0">
                Login As:
              </label>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Login Role">
                <label
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold cursor-pointer border transition-all ${
                    role === 'Admin'
                      ? 'border-[#0b4da2] bg-blue-50/90 text-[#0b4da2] shadow-sm ring-1 ring-[#0b4da2]/30'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="loginRole"
                    value="Admin"
                    className="sr-only"
                    checked={role === 'Admin'}
                    onChange={() => setRole('Admin')}
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      role === 'Admin' ? 'border-[#0b4da2]' : 'border-slate-400'
                    }`}
                  >
                    {role === 'Admin' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0b4da2]" />
                    )}
                  </span>
                  <span>Admin</span>
                </label>

                <label
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold cursor-pointer border transition-all ${
                    role === 'Employee'
                      ? 'border-[#0b4da2] bg-blue-50/90 text-[#0b4da2] shadow-sm ring-1 ring-[#0b4da2]/30'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="loginRole"
                    value="Employee"
                    className="sr-only"
                    checked={role === 'Employee'}
                    onChange={() => setRole('Employee')}
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      role === 'Employee' ? 'border-[#0b4da2]' : 'border-slate-400'
                    }`}
                  >
                    {role === 'Employee' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0b4da2]" />
                    )}
                  </span>
                  <span>Employee</span>
                </label>
              </div>
            </div>
          </div>

          {/* User ID Field */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center text-[13px] font-bold text-slate-900" htmlFor="user-id">
              <span className="text-red-600 font-extrabold mr-1 text-base leading-none">*</span>
              <span>User ID :</span>
            </label>
            <div className="relative flex items-center">
              <User size={17} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                id="user-id"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your User ID"
                required
                autoFocus
                className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0b4da2] focus:ring-2 focus:ring-[#0b4da2]/20 transition-all shadow-sm font-medium"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center text-[13px] font-bold text-slate-900" htmlFor="password">
              <span className="text-red-600 font-extrabold mr-1 text-base leading-none">*</span>
              <span>Password :</span>
            </label>
            <div className="relative flex items-center">
              <Lock size={17} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full h-11 pl-10 pr-10 bg-white border border-slate-200 rounded-xl text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0b4da2] focus:ring-2 focus:ring-[#0b4da2]/20 transition-all shadow-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 text-slate-400 hover:text-[#0b4da2] p-1 rounded-md transition-colors border-0 bg-transparent cursor-pointer"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Action Buttons: LOGIN / FORGOT PASSWORD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#0b4da2] hover:bg-[#083c80] text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border-0"
            >
              {isLoading ? (
                'AUTHENTICATING...'
              ) : (
                <>
                  <span>LOGIN</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-[#0b4da2] border border-slate-200 font-bold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center cursor-pointer"
            >
              FORGOT PASSWORD
            </button>
          </div>

          {/* Official Advisory Notice */}
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-blue-900 leading-relaxed mt-1">
            <Info size={19} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="m-0 text-blue-900 font-normal">
              Employers who do not receive User ID notifications, please refer to the{' '}
              <strong className="text-blue-950 font-bold">
                Foreign Workers Division Counter (Malaysian Immigration Department)
              </strong>{' '}
              according to the address of the work location.
            </p>
          </div>
        </form>

        {/* Card Footer Back Link */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          {isServiceLogin ? (
            <Link
              href={`/services?company=${encodeURIComponent(selectedCompany.id)}`}
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Return to {selectedCompany.name} Services</span>
            </Link>
          ) : (
            <Link
              href="/companies"
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Return to Companies</span>
            </Link>
          )}
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>256-bit SSL Protected</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f1f4f8] flex flex-col justify-between text-slate-900">
      <Navbar />

      {/* Main Authentication Area */}
      <div className="flex-1 py-6 sm:py-10 px-4 relative overflow-hidden flex flex-col items-center justify-center">
        {/* Decorative background grid and glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:28px_28px]"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-200/35 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-200/35 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <Suspense
          fallback={
            <div className="w-full max-w-[540px] mx-auto bg-white rounded-3xl p-10 text-center text-slate-500 shadow-md">
              Loading authentication form...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      <Footer />
    </main>
  );
}
