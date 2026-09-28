'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function RestrictedCreateCustomerPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] flex flex-col justify-between text-slate-900 font-sans">
      <Navbar />

      <div className="flex-1 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
            <Lock size={32} />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            <ShieldAlert size={12} className="text-amber-600" />
            <span>Administrative Access Required</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 m-0">
            Customer Registration Restricted
          </h1>

          <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
            Public customer creation is disabled. Customer and worker profiles can only be registered and managed through the <strong>Super Administrator</strong> or <strong>Master Administrator</strong> portals.
          </p>

          <div className="mt-6 space-y-2.5">
            <Link
              href="/superadmin/customers"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-xs no-underline"
            >
              <ShieldCheck size={14} />
              <span>Super Admin Customer Management</span>
            </Link>

            <Link
              href="/masteradmin/customers"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#072a6b] hover:bg-[#051f50] text-white text-xs font-bold transition-all shadow-xs no-underline"
            >
              <Building2 size={14} />
              <span>Master Admin Customer Portal</span>
            </Link>

            <Link
              href="/customers"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors no-underline"
            >
              <ArrowLeft size={14} />
              <span>Return to Public Directory</span>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
