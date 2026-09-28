'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Coins,
  ExternalLink,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Company,
  resolveFileUrl,
  getCompanyIncomeWallet,
  getCompanyCostWallet,
  getCompanyProfitWallet,
} from '@/lib/companies';
import {
  fetchCompaniesFromBackend,
  getStoredCompanies,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';
import { getMasterAdminUser } from '@/lib/auth';

export default function MasterAdminDashboard() {
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const currentUser = getMasterAdminUser();

  const assignedList = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  useEffect(() => {
    setAllCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setAllCompanies(list);
    }).catch(() => {});

    const unsub = subscribeToCompanyChanges(() => {
      setAllCompanies(getStoredCompanies());
    });
    return unsub;
  }, []);

  // Permitted companies only
  const permittedCompanies = useMemo(() => {
    if (assignedList.length === 0) return [];
    return allCompanies.filter((c) =>
      assignedList.some((id) => id.toLowerCase() === c.id.toLowerCase())
    );
  }, [allCompanies, assignedList]);

  const totalWorkers = permittedCompanies.reduce((acc, c) => acc + (c.totalWorkers || 0), 0);
  const totalIncome = permittedCompanies.reduce((acc, c) => acc + getCompanyIncomeWallet(c), 0);
  const totalProfit = permittedCompanies.reduce((acc, c) => acc + getCompanyProfitWallet(c), 0);
  const sectors = Array.from(new Set(permittedCompanies.map((c) => c.sector)));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-3">
            <ShieldAlert size={12} className="text-yellow-400" />
            <span>Master Administrator Scope Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0 mb-2">
            Welcome, {currentUser?.name || 'Master Administrator'}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed m-0 mb-6">
            Authorized management panel for your assigned companies. Manage foreign worker quotas, corporate directors, company profiles, and financial ledger wallets.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/masteradmin/companies"
              className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all no-underline"
            >
              <Building2 size={15} />
              <span>Manage Permitted Companies ({permittedCompanies.length})</span>
              <ArrowRight size={13} />
            </Link>

            <Link
              href="/masteradmin/change-password"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all no-underline"
            >
              <KeyRound size={13} />
              <span>Change My Password</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Assigned Companies
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {permittedCompanies.length}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp size={12} />
            <span>Permitted employers in scope</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Total Workers
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            {totalWorkers.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Permitted quota capacity
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Industry Sectors
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700 tracking-tight">
            {sectors.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Distinct operational sectors
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Wallets Net Profit
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 tracking-tight">
            RM {totalProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Across permitted employers
          </div>
        </div>
      </div>

      {/* Assigned Companies Grid Cards */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              Your Permitted Companies
            </h2>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Click on any company to review documents, workers, or edit details
            </p>
          </div>
          <Link
            href="/masteradmin/companies"
            className="text-xs font-semibold text-[#0b4da2] hover:underline"
          >
            View Full Table →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {permittedCompanies.map((comp) => (
            <div
              key={comp.id}
              className="border border-slate-200 rounded-xl p-4 hover:border-[#0b4da2] hover:shadow-md transition-all bg-white group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center">
                    {comp.logo ? (
                      <img
                        src={resolveFileUrl(comp.logo)}
                        alt={comp.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Building2 size={22} className="text-slate-400" />
                    )}
                  </div>
                  {comp.tag && (
                    <span className="text-[10px] bg-blue-50 text-[#0b4da2] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      {comp.tag}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0b4da2] transition-colors m-0">
                  {comp.name}
                </h3>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {comp.roc || 'ROC-PENDING'}
                </div>
                <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                  {comp.sector}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  <strong>{(comp.totalWorkers || 0).toLocaleString()}</strong> workers
                </span>
                <Link
                  href={`/superadmin/companies/${comp.id}`}
                  className="font-bold text-[#0b4da2] hover:underline flex items-center gap-1 text-xs no-underline"
                >
                  <span>Manage</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
