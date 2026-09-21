'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Globe2,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { services, Service } from '@/lib/services';
import { companies, Company } from '@/lib/companies';

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');
  const verifiedServiceParam = searchParams.get('verifiedService');

  const activeCompany =
    companies.find(
      (c) =>
        c.id.toLowerCase() === (companyParam || '').toLowerCase() ||
        c.name.toLowerCase().includes((companyParam || '').toLowerCase())
    ) || companies[0];

  const verifiedService = services.find(
    (s) => s.id.toLowerCase() === (verifiedServiceParam || '').toLowerCase()
  );

  const [query, setQuery] = useState('');

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(query.toLowerCase()) ||
    service.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="w-full">
      {/* Active Employer Banner Bar */}
      <section className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white py-8 sm:py-10 shadow-md">
        <div className="w-full max-w-[1180px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-lg border border-white/20">
                <img
                  src={activeCompany.logo}
                  alt={activeCompany.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Authenticated Employer
                  </span>
                  <span className="text-blue-200 text-xs font-mono">
                    {activeCompany.roc}
                  </span>
                </div>
                <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
                  {activeCompany.name}
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-1 font-medium">
                  Sector: {activeCompany.sector} • Active Registered Foreign Workers: {activeCompany.totalWorkers.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/companies"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/25 transition-all cursor-pointer"
              >
                <Building2 size={15} />
                <span>Switch Company</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-red-400/30 transition-all cursor-pointer"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className="bg-[#f7f9fb] py-12 sm:py-16" id="services">
        <div className="w-full max-w-[1180px] mx-auto px-6">
          {/* Authenticated Service Alert Callout if returning from service login */}
          {verifiedService && (
            <div className="mb-8 bg-emerald-50/95 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-emerald-950 shadow-xs animate-in fade-in slide-in-from-top-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold m-0 text-emerald-950 flex items-center gap-2">
                    <span>Authenticated Session Active: {verifiedService.title}</span>
                    <span className="text-[10px] font-mono bg-emerald-200/90 text-emerald-950 px-2 py-0.5 rounded-full uppercase font-bold">
                      Connected
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-800 m-0 mt-0.5">
                    Full digital quota and worker records synchronized for {activeCompany.name} ({activeCompany.roc}).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/services?company=${encodeURIComponent(activeCompany.id)}`}
                  className="text-xs bg-emerald-200/70 hover:bg-emerald-200 text-emerald-950 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  Dismiss Banner
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <Link href="/" className="hover:text-blue-600 transition-colors">
                  Home
                </Link>
                <ChevronRight size={13} />
                <Link href="/#companies" className="hover:text-blue-600 transition-colors">
                  Employers
                </Link>
                <ChevronRight size={13} />
                <span className="text-[#2b74c9] font-bold uppercase tracking-wider">
                  {activeCompany.name} Services
                </span>
              </div>
              <h2 className="text-[#1a283c] text-3xl md:text-4xl font-extrabold tracking-tight m-0">
                Digital Immigration Services (10)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Click any service below to open the official login portal and manage foreign worker records for {activeCompany.name}.
              </p>
            </div>
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 w-full sm:w-72 text-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services"
                aria-label="Search services"
                className="border-0 bg-transparent text-slate-800 text-xs outline-none w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 3-Column Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {filteredServices.map((service, index) => {
              const isCardVerified = verifiedServiceParam === service.id;
              return (
                <Link
                  href={`/login?service=${encodeURIComponent(service.id)}&company=${encodeURIComponent(activeCompany.id)}`}
                  id={`service-card-${index}`}
                  key={service.title}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`group relative flex flex-col items-center text-center bg-white border rounded-[20px] p-8 md:p-9 shadow-[0_4px_20px_rgba(18,38,70,0.05)] hover:shadow-[0_16px_36px_rgba(18,55,110,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer min-h-[300px] outline-none focus-visible:ring-2 focus-visible:ring-blue-600 font-inherit no-underline ${
                    isCardVerified
                      ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                      : 'border-slate-200/90 hover:border-blue-400'
                  }`}
                >
                  {/* Service Image */}
                  <div className="flex items-center justify-center h-[120px] w-full mb-4 pointer-events-none">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="max-h-[110px] max-w-[170px] w-auto h-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      loading="lazy"
                    />
                  </div>

                  {/* Service Info */}
                  <div className="flex flex-col items-center flex-1 justify-start w-full pointer-events-none">
                    <div className="flex flex-col items-center gap-1.5 justify-center pointer-events-none">
                      <h3 className="text-[17px] font-bold text-slate-900 leading-snug m-0 pointer-events-none group-hover:text-[#0b4da2] transition-colors">
                        {service.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                        {service.tag && (
                          <span className="inline-block bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase pointer-events-none">
                            {service.tag}
                          </span>
                        )}
                        {isCardVerified && (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase pointer-events-none">
                            <CheckCircle2 size={10} className="text-emerald-600" /> Authenticated
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[13px] text-slate-500 leading-relaxed mt-2.5 max-w-[280px] pointer-events-none">
                      {service.description}
                    </p>
                  </div>

                  {/* Card Action Link */}
                  <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-xs text-slate-500 pointer-events-none">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Official Portal
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0b4da2] group-hover:translate-x-1 transition-transform">
                      {isCardVerified ? 'Re-login Portal' : 'Login Portal'} <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredServices.length === 0 && (
            <div className="text-slate-500 py-12 text-center text-sm w-full">
              No service found matching your search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#f1f4f8] flex flex-col justify-between text-slate-900">
      <Navbar />

      <Suspense
        fallback={
          <div className="w-full max-w-[1180px] mx-auto py-20 text-center text-slate-500 font-medium">
            Loading employer services...
          </div>
        }
      >
        <ServicesContent />
      </Suspense>

      <Footer />
    </main>
  );
}
