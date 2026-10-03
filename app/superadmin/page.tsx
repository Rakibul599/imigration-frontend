'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Company, resolveFileUrl } from '@/lib/companies';
import {
  fetchCompaniesFromBackend,
  getStoredCompanies,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';
import CardPriorityModal from '@/components/CardPriorityModal';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import {
  PageStatCardConfig,
  getStoredPageCards,
  saveStoredPageCards,
  resetStoredPageCards,
} from '@/lib/pageCardStorage';

const DEFAULT_DASHBOARD_CARDS: PageStatCardConfig[] = [
  { id: 'reg_companies', title: 'Registered Companies', subtitle: 'Active registered employers • View Directory →', icon: 'Building2', order_num: 1 },
  { id: 'total_workers', title: 'Total Foreign Workers', subtitle: 'Foreign worker permits allocated', icon: 'Users', order_num: 2 },
  { id: 'active_sectors', title: 'Active Sectors', subtitle: 'Approved economic sectors', icon: 'Briefcase', order_num: 3 },
  { id: 'system_health', title: 'System Health', subtitle: 'Laravel 11 REST API operational', icon: 'ShieldCheck', order_num: 4 },
];

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cards, setCards] = useState<PageStatCardConfig[]>(DEFAULT_DASHBOARD_CARDS);

  useEffect(() => {
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setCompanies(list);
    }).catch(() => {});

    setCards(getStoredPageCards('dashboard', DEFAULT_DASHBOARD_CARDS));
    const handleUpdate = (e: any) => {
      setCards(e.detail || getStoredPageCards('dashboard', DEFAULT_DASHBOARD_CARDS));
    };
    window.addEventListener('superadmin_cards_update_dashboard', handleUpdate);

    const unsub = subscribeToCompanyChanges(() => {
      setCompanies(getStoredCompanies());
    });
    return () => {
      unsub();
      window.removeEventListener('superadmin_cards_update_dashboard', handleUpdate);
    };
  }, []);

  const handleSaveCards = (updated: PageStatCardConfig[]) => {
    const saved = saveStoredPageCards('dashboard', updated);
    setCards(saved);
  };

  const handleResetCards = () => {
    const reset = resetStoredPageCards('dashboard', DEFAULT_DASHBOARD_CARDS);
    setCards(reset);
  };

  const totalWorkers = companies.reduce((acc, c) => acc + (c.totalWorkers || 0), 0);
  const sectors = Array.from(new Set(companies.map((c) => c.sector)));

  return (
    <div className="space-y-6">
      {/* Welcome Banner matching frontend gradient */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Super Administrator Control Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white m-0 mb-2">
            Central Management Panel
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed m-0 mb-6">
            Authorized administrative gateway for managing employer records, foreign worker permits, and verified company directory. Integrated with Laravel 11 Backend &amp; MySQL.
          </p>
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <Link
              href="/superadmin/companies"
              className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all no-underline whitespace-nowrap"
            >
              <Building2 size={15} />
              <span>Manage Company Directory</span>
              <ArrowRight size={13} />
            </Link>

            <button
              type="button"
              onClick={() => setIsCardModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal size={14} />
              <span>Manage Cards &amp; Priority</span>
            </button>

            <Link
              href="/companies"
              target="_blank"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all no-underline whitespace-nowrap"
            >
              <span>View Public Portal</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards (Exact Dashboard Card Design, Dynamic from Card Priority Config) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          if (card.id === 'reg_companies') {
            return (
              <Link
                key={card.id}
                href="/superadmin/companies/registered"
                title="Open Registered Companies Directory"
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px] no-underline text-inherit cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight truncate">
                    {card.title}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] group-hover:bg-[#0b4da2] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    <DynamicCardIcon icon={card.icon} size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
                  {companies.length}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium truncate">
                  <TrendingUp size={12} />
                  <span>{card.subtitle}</span>
                </div>
              </Link>
            );
          }

          if (card.id === 'total_workers') {
            return (
              <div
                key={card.id}
                className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-emerald-700 transition-colors leading-tight truncate">
                    {card.title}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <DynamicCardIcon icon={card.icon} size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
                  {totalWorkers.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{card.subtitle}</div>
              </div>
            );
          }

          if (card.id === 'active_sectors') {
            return (
              <div
                key={card.id}
                className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-indigo-700 transition-colors leading-tight truncate">
                    {card.title}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <DynamicCardIcon icon={card.icon} size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
                  {sectors.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{card.subtitle}</div>
              </div>
            );
          }

          return (
            <div
              key={card.id}
              className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-amber-700 transition-colors leading-tight truncate">
                  {card.title}
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <DynamicCardIcon icon={card.icon} size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-700 tracking-tight flex items-center gap-1.5 my-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">{card.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Companies Section (White Card) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">Recent Companies in Directory</h2>
            <p className="text-xs text-slate-500 m-0">
              Latest employer entities synchronized from Laravel MySQL database.
            </p>
          </div>
          <Link
            href="/superadmin/companies"
            className="text-xs font-semibold text-[#0b4da2] hover:text-[#083c80] flex items-center gap-1 no-underline"
          >
            <span>View all ({companies.length})</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="space-y-3">
          {companies.slice(0, 5).map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50/40 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                  <img
                    src={resolveFileUrl(company.logo) || '/images/companies/gamuda.svg'}
                    alt={company.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <Link
                    href="/superadmin/companies"
                    className="text-xs font-bold text-slate-900 hover:text-[#0b4da2] hover:underline m-0 block"
                  >
                    {company.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500 font-mono">{company.roc}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-600">{company.sector}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  {company.tag || 'Verified JIM'}
                </span>
                <Link
                  href="/superadmin/companies"
                  className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-[#0b4da2] hover:bg-slate-50 shadow-2xs"
                  title="View Company in Management Panel"
                >
                  <Building2 size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Priority & Customization Modal */}
      <CardPriorityModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cards={cards}
        onSave={handleSaveCards}
        onReset={handleResetCards}
        pageTitle="Super Administrator Dashboard"
      />
    </div>
  );
}
