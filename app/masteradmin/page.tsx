'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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
import MasterAdminCompaniesPage from './companies/page';

export type DashboardTabId = 'overview' | 'companies' | string;

export interface DashboardTabItem {
  id: DashboardTabId;
  label: string;
  icon: any;
  badge?: string | number;
  description?: string;
}

export default function MasterAdminDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTabId>('companies');
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

  // Permitted companies only based on Master Admin scope
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

  // Extensible Tab List - more tabs can easily be added to this array in the future
  const dashboardTabs: DashboardTabItem[] = useMemo(() => [
    {
      id: 'companies',
      label: 'Company Management',
      icon: Building2,
      badge: permittedCompanies.length > 0 ? `${permittedCompanies.length}` : undefined,
      description: 'Assigned Companies & Permitted Ledgers',
    },
    // Future tabs (e.g. Dashboard Overview, Employees, etc.) can be enabled here:
    // {
    //   id: 'overview',
    //   label: 'Dashboard Overview',
    //   icon: LayoutDashboard,
    //   badge: 'Live',
    //   description: 'Scope Hub & High-Level KPIs',
    // },
  ], [permittedCompanies.length]);

  const isTrialActive = currentUser?.trial_status === 'trial_active';
  const isPaidActive = currentUser?.trial_status === 'paid_active';
  const isExpired = currentUser?.trial_status === 'expired';

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Trial / Subscription Status Banner */}
      {isTrialActive && (
        <div className="bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-yellow-300">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight">3-Day Free Trial Active</span>
                <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-0.2 rounded-full uppercase">
                  Full Access
                </span>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                Enjoy full Master Administrator access. Your 3-day trial expires on{' '}
                <strong>
                  {currentUser?.trial_ends_at
                    ? new Date(currentUser.trial_ends_at).toLocaleDateString()
                    : 'in 3 days'}
                </strong>
                . To unlock your full{' '}
                <strong>{currentUser?.subscription_package ? currentUser.subscription_package.replace('_', ' ') : 'package'}</strong>, please arrange payment with Super Admin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold bg-white text-emerald-800 px-3 py-1.5 rounded-xl shadow-xs">
              3 Days Free
            </span>
          </div>
        </div>
      )}

      {isPaidActive && (
        <div className="bg-gradient-to-r from-[#0b4da2] via-[#093a8e] to-[#072a6b] text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-yellow-300">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="font-bold text-sm">
                Subscription Active — {currentUser?.subscription_package ? currentUser.subscription_package.replace('_', ' ').toUpperCase() : 'ENTERPRISE PLAN'}
              </div>
              <p className="text-xs text-blue-100">
                Full commercial license verified. Valid until{' '}
                <strong>
                  {currentUser?.subscription_ends_at
                    ? new Date(currentUser.subscription_ends_at).toLocaleDateString()
                    : 'active'}
                </strong>
                .
              </p>
            </div>
          </div>
          <span className="bg-emerald-500/90 text-white text-[11px] font-extrabold px-3 py-1 rounded-xl">
            Verified Active
          </span>
        </div>
      )}

      {isExpired && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <div>
              <div className="font-bold text-xs">Your 3-Day Free Trial Has Expired</div>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Please contact Super Admin to activate your selected package and continue managing your company ledgers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP TAB SYSTEM (Extensible for adding more tabs in the future) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5">
            {dashboardTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`masteradmin-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white border-transparent shadow-sm shadow-blue-900/15'
                      : 'bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <Icon
                    size={16}
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                    }`}
                  />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white border border-white/20'
                          : 'bg-blue-50 text-[#0b4da2] border border-blue-200/70'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Indicator that more tabs can be added */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-dashed border-slate-200">
              + Expandable Tabs
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY MANAGEMENT DASHBOARD (Permitted Scope) */}
      {/* ========================================================================= */}
      {activeTab === 'companies' && (
        <div className="animate-in fade-in duration-200">
          <MasterAdminCompaniesPage />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MASTER ADMIN DASHBOARD OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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
                <button
                  type="button"
                  onClick={() => setActiveTab('companies')}
                  className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer border-0"
                >
                  <Building2 size={15} />
                  <span>Open Company Management Tab ({permittedCompanies.length})</span>
                  <ArrowRight size={13} />
                </button>

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
            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all text-left cursor-pointer"
            >
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
            </button>

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
              <button
                type="button"
                onClick={() => setActiveTab('companies')}
                className="text-xs font-semibold text-[#0b4da2] hover:underline bg-transparent border-0 cursor-pointer p-0"
              >
                View in Management Table →
              </button>
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
                    <button
                      type="button"
                      onClick={() => setActiveTab('companies')}
                      className="font-bold text-[#0b4da2] hover:underline flex items-center gap-1 text-xs bg-transparent border-0 cursor-pointer p-0"
                    >
                      <span>Manage</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
