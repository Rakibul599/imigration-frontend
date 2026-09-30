'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  Sparkles,
  User,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { authenticateMasterAdmin } from '@/lib/auth';

export default function MasterAdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('masteradmin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const userParam = params.get('user') || params.get('username');
      if (userParam) {
        setUsername(userParam);
        setPassword('');
      }
    }
  }, []);

  const handleQuickFill = () => {
    setUsername('masteradmin');
    setPassword('password123');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await authenticateMasterAdmin(username, password);

      if (res.success) {
        setSuccessMsg('Authorization verified! Opening employer companies directory...');
        setTimeout(() => {
          router.push('/companies');
        }, 500);
      } else {
        setIsLoading(false);
        setErrorMsg(res.message || 'Invalid Master Admin credentials.');
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Connection error. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-[#f1f4f8] flex flex-col justify-between text-slate-900 font-sans">
      <Navbar />

      <div className="flex-1 py-8 sm:py-12 px-4 relative overflow-hidden flex flex-col items-center justify-center">
        {/* Background Gradients */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md mx-auto relative z-10">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white p-6 sm:p-8 text-center relative">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                <ShieldAlert size={28} className="text-yellow-400" />
              </div>
              <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                <span>Multi-Company Access</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0">
                Master Admin Portal
              </h1>
              <p className="text-xs text-blue-100/90 mt-1 max-w-xs mx-auto m-0">
                Log in to manage your assigned companies and authorized workers
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
              {/* Quick Fill Demo Helper */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs">
                <div className="text-slate-700">
                  <span className="font-bold text-[#0b4da2]">Demo Credentials:</span>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    User: <strong className="text-slate-800">masteradmin</strong> | Pass: <strong className="text-slate-800">password123</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b4da2] hover:text-[#072a6b] hover:underline bg-transparent border-0 cursor-pointer p-0"
                >
                  <Sparkles size={12} />
                  <span>Fill</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert size={14} className="shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Username or Email
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Master Admin username"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 bg-transparent border-0 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#0b4da2] hover:bg-[#072a6b] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter Master Admin Panel</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-slate-500 hover:text-[#0b4da2] inline-flex items-center gap-1 font-semibold no-underline"
                >
                  <ArrowLeft size={12} />
                  <span>Return to Public Employee Login</span>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
