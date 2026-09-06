'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
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
  User,
} from 'lucide-react';
import { services, Service } from '@/lib/services';

function Crest() {
  return (
    <div className="crest" aria-label="Malaysian Immigration Department crest">
      <div className="crest-star">✦</div>
      <div className="crest-shield"><span>MY</span></div>
      <div className="crest-wings"><i /><i /><i /></div>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get('service');

  const matchedService = services.find(
    (s) =>
      s.id.toLowerCase() === (serviceParam || '').toLowerCase() ||
      s.title.toLowerCase() === (serviceParam || '').toLowerCase()
  ) || services[0];

  const [selectedService, setSelectedService] = useState<Service>(matchedService);
  const [sector, setSector] = useState<'Housekeeper' | 'Other Sectors'>('Other Sectors');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    setTimeout(() => {
      setIsLoading(false);
      setFeedback({
        type: 'success',
        message: `Authentication verified for ${selectedService.title}. Redirecting to system...`,
      });
    }, 1000);
  };

  const handleForgotPassword = () => {
    setFeedback({
      type: 'info',
      message:
        'Password reset request received. Please consult the Foreign Workers Division Counter with your registered company credentials.',
    });
  };

  return (
    <div className="w-full max-w-[540px] mx-auto">
      {/* Main Login Card */}
      <div className="bg-white rounded-3xl shadow-[0_20px_50px_-15px_rgba(7,42,107,0.18)] border border-slate-200/90 overflow-hidden">
        {/* Card Header with official Malaysian navy gradient */}
        <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white p-6 sm:p-7 relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1 text-[11px] font-semibold text-yellow-300">
              <img src={selectedService.image} alt="" className="w-4 h-4 object-contain" />
              <span>{selectedService.title}</span>
            </div>
            <select
              value={selectedService.id}
              onChange={(e) => {
                const s = services.find((srv) => srv.id === e.target.value);
                if (s) setSelectedService(s);
              }}
              className="text-[11px] bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg px-2.5 py-1 font-medium outline-none cursor-pointer"
              aria-label="Change target service"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id} className="text-slate-800 bg-white">
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0 leading-snug">
            Please Log In To Enter The System
          </h1>
          <p className="text-xs text-blue-100/90 tracking-wide mt-1.5 font-medium">
            Malaysian Immigration Department • Foreign Workers Division
          </p>
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

          {/* Continued: Housekeeper / Other Sectors */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3.5 flex-wrap py-0.5">
              <label className="text-[13.5px] font-bold text-slate-900 shrink-0">
                Continued:
              </label>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Sector continuation">
                <label
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold cursor-pointer border transition-all ${
                    sector === 'Housekeeper'
                      ? 'border-[#0b4da2] bg-blue-50/90 text-[#0b4da2] shadow-sm ring-1 ring-[#0b4da2]/30'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="sector"
                    value="Housekeeper"
                    className="sr-only"
                    checked={sector === 'Housekeeper'}
                    onChange={() => setSector('Housekeeper')}
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      sector === 'Housekeeper' ? 'border-[#0b4da2]' : 'border-slate-400'
                    }`}
                  >
                    {sector === 'Housekeeper' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0b4da2]" />
                    )}
                  </span>
                  <span>Housekeeper</span>
                </label>

                <label
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold cursor-pointer border transition-all ${
                    sector === 'Other Sectors'
                      ? 'border-[#0b4da2] bg-blue-50/90 text-[#0b4da2] shadow-sm ring-1 ring-[#0b4da2]/30'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="sector"
                    value="Other Sectors"
                    className="sr-only"
                    checked={sector === 'Other Sectors'}
                    onChange={() => setSector('Other Sectors')}
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      sector === 'Other Sectors' ? 'border-[#0b4da2]' : 'border-slate-400'
                    }`}
                  >
                    {sector === 'Other Sectors' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0b4da2]" />
                    )}
                  </span>
                  <span>Other Sectors</span>
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
                className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0b4da2] focus:ring-2 focus:ring-[#0b4da2]/20 transition-all shadow-sm"
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
                className="w-full h-11 pl-10 pr-10 bg-white border border-slate-200 rounded-xl text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0b4da2] focus:ring-2 focus:ring-[#0b4da2]/20 transition-all shadow-sm"
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
              {isLoading ? 'VERIFYING...' : 'LOGIN'}
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
          <Link
            href="/#services"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Services</span>
          </Link>
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
      {/* Top Strip */}
      <div className="bg-[#061d4d] text-[#b8c9e6] text-[11px] py-2 px-6 flex justify-between items-center tracking-wide">
        <span>Official portal of the Malaysian Immigration Department</span>
        <span className="hidden sm:inline">Last updated: 06 September 2026</span>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-xs">
        <div className="w-full max-w-[1180px] mx-auto px-6 h-18 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="Immigration Department Home">
            <Crest />
            <div className="flex flex-col">
              <strong className="text-[#06245d] text-xs tracking-wider">
                JABATAN IMIGRESEN MALAYSIA
              </strong>
              <small className="text-slate-400 text-[9px] tracking-widest uppercase">
                IMMIGRATION DEPARTMENT OF MALAYSIA
              </small>
            </div>
          </Link>

          <nav className="flex items-center gap-6" aria-label="Quick navigation">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-[#0b4da2] transition-colors hidden sm:inline-block"
            >
              Home
            </Link>
            <Link
              href="/#services"
              className="text-xs font-semibold text-slate-600 hover:text-[#0b4da2] transition-colors"
            >
              All Services
            </Link>
            <button
              className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-700 font-medium cursor-pointer"
              type="button"
            >
              <Globe2 size={13} /> EN <ChevronDown size={11} />
            </button>
          </nav>
        </div>
      </header>

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

        {/* Breadcrumb */}
        <div className="w-full max-w-[540px] mx-auto mb-3.5 flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <ChevronRight size={13} />
          <Link href="/#services" className="hover:text-blue-600 transition-colors">
            Services
          </Link>
          <ChevronRight size={13} />
          <span className="text-slate-800 font-semibold">User Authentication</span>
        </div>

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

      {/* Footer */}
      <footer className="bg-[#071d49] text-white py-4 px-6">
        <div className="w-full max-w-[1180px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <Crest />
            <div>
              <p className="m-0 font-bold text-white text-xs">JABATAN IMIGRESEN MALAYSIA</p>
              <p className="m-0 text-[10px] text-slate-400">Official Portal Immigration Department of Malaysia</p>
            </div>
          </div>
          <div className="text-center sm:text-right text-[11px]">
            <p className="m-0">© 2026 Immigration Department of Malaysia. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
