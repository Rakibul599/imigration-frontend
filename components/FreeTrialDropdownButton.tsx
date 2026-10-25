'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  PLAN_PACKAGES,
  PlanPackageKey,
  SubscriptionPlan,
  fetchSubscriptionPlans,
} from '@/lib/companyTrialAndFinanceStorage';

interface FreeTrialDropdownButtonProps {
  buttonText?: string;
  className?: string;
}

export default function FreeTrialDropdownButton({
  buttonText = 'Get Free Trial',
  className,
}: FreeTrialDropdownButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState<SubscriptionPlan[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Load plans from backend dynamically
  useEffect(() => {
    fetchSubscriptionPlans()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDynamicPlans(res);
        }
      })
      .catch(() => {});
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 250);
  };

  const defaultKey = dynamicPlans.length > 0 ? dynamicPlans[0].plan_key : '3_months';

  const handleNavigate = (key: string) => {
    setDropdownOpen(false);
    router.push(`/free-trial?plan=${key}`);
  };

  return (
    <div
      className="relative inline-block text-left"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main CTA Trigger Button (Navigates to /free-trial) */}
      <button
        type="button"
        onClick={() => handleNavigate(defaultKey)}
        className={
          className ||
          'group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#202731] via-[#272f3a] to-[#1a202c] hover:from-[#111827] hover:to-[#1e2633] text-white text-base font-bold shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-slate-700/60'
        }
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="tracking-tight">{buttonText}</span>
        <ChevronDown
          size={16}
          className={`text-emerald-400 transition-transform duration-200 ${
            dropdownOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'
          }`}
        />
      </button>

      {/* Floating Dropdown on Hover - strictly left-aligned to button, opens towards the right */}
      <div
        className={`absolute mt-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 transition-all duration-200 origin-top-left ${
          dropdownOpen
            ? 'opacity-100 visible translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 invisible -translate-y-2 scale-95 pointer-events-none'
        }`}
        style={{ left: 0, right: 'auto', zIndex: 9999 }}
      >
        {/* Transparent Hover Safety Bridge */}
        <div className="absolute -top-3 left-0 w-full h-3" />

        {/* Header banner */}
        <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl border border-blue-100/70 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b4da2]">
            <Sparkles size={14} className="text-amber-500" />
            <span>Includes 3-Days Full Free Trial</span>
          </div>
          <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
            No Risk
          </span>
        </div>

        {/* Dynamic Plan Packages List */}
        <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
          {dynamicPlans.length > 0
            ? dynamicPlans.map((pkg) => {
                const isPopular = pkg.is_popular;
                return (
                  <Link
                    key={pkg.id}
                    href={`/free-trial?plan=${pkg.plan_key}`}
                    onClick={() => setDropdownOpen(false)}
                    className={`w-full group/item text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between no-underline block ${
                      isPopular
                        ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-[#0b4da2]'
                        : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isPopular
                            ? 'bg-[#0b4da2] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 group-hover/item:bg-blue-100 group-hover/item:text-[#0b4da2]'
                        }`}
                      >
                        <Calendar size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 group-hover/item:text-[#0b4da2] transition-colors">
                            {pkg.name}
                          </span>
                          {pkg.badge && (
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                                isPopular
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="text-emerald-600 font-bold">
                            {pkg.trial_days || 3}-Day Free Trial
                          </span>
                          {pkg.savings_text && (
                            <>
                              <span>•</span>
                              <span>{pkg.savings_text}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-[#0b4da2]">
                        {pkg.currency} {pkg.price}
                      </div>
                      <div className="text-[10px] text-slate-400 group-hover/item:text-[#0b4da2] flex items-center justify-end gap-0.5 mt-0.5 font-semibold">
                        <span>Apply</span>
                        <ArrowRight size={10} className="group-hover/item:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })
            : PLAN_PACKAGES.map((pkg) => {
                const isPopular = pkg.popular;
                return (
                  <Link
                    key={pkg.key}
                    href={`/free-trial?plan=${pkg.key}`}
                    onClick={() => setDropdownOpen(false)}
                    className={`w-full group/item text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between no-underline block ${
                      isPopular
                        ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-[#0b4da2]'
                        : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isPopular
                            ? 'bg-[#0b4da2] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 group-hover/item:bg-blue-100 group-hover/item:text-[#0b4da2]'
                        }`}
                      >
                        <Calendar size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 group-hover/item:text-[#0b4da2] transition-colors">
                            {pkg.label}
                          </span>
                          {pkg.badge && (
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                                pkg.popular
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="text-emerald-600 font-bold">3-Day Free Trial</span>
                          <span>•</span>
                          <span>{pkg.savings}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-[#0b4da2]">
                        {pkg.currency} {pkg.price}
                      </div>
                      <div className="text-[10px] text-slate-400 group-hover/item:text-[#0b4da2] flex items-center justify-end gap-0.5 mt-0.5 font-semibold">
                        <span>Apply</span>
                        <ArrowRight size={10} className="group-hover/item:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>

        {/* Footer note */}
        <div className="pt-2.5 mt-2 border-t border-slate-100 px-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Super Admin review & approval</span>
          </span>
          <span className="font-semibold text-slate-700">Master Admin Access</span>
        </div>
      </div>
    </div>
  );
}
