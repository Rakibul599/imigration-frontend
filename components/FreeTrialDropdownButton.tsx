'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [verticalPosition, setVerticalPosition] = useState<'down' | 'up'>('down');
  const [horizontalPosition, setHorizontalPosition] = useState<'right' | 'left'>('right');
  const [popoverCoords, setPopoverCoords] = useState<{
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    maxHeight?: number | string;
  }>({
    left: 'calc(100% + 14px)',
    top: '0px',
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load plans from backend dynamically
  useEffect(() => {
    fetchSubscriptionPlans()
      .then((res) => {
        if (Array.isArray(res)) {
          setDynamicPlans(res);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const isDesktop = windowWidth >= 640;
    const modalHeight = 420;
    const modalWidth = 400;
    const padding = 16;

    const spaceBelow = windowHeight - rect.top;
    const spaceAbove = rect.bottom;
    const spaceRight = windowWidth - rect.right;
    const spaceLeft = rect.left;
    const effectiveMaxHeight = Math.min(modalHeight, windowHeight - padding * 2);

    if (isDesktop) {
      // Horizontal placement: right side by default unless right edge is too tight
      let leftStyle: string | undefined = 'calc(100% + 14px)';
      let rightStyle: string | undefined = 'auto';

      if (spaceRight < modalWidth + padding && spaceLeft > spaceRight) {
        setHorizontalPosition('left');
        leftStyle = 'auto';
        rightStyle = 'calc(100% + 14px)';
      } else {
        setHorizontalPosition('right');
        leftStyle = 'calc(100% + 14px)';
        rightStyle = 'auto';
      }

      // Vertical placement:
      // If modal would overflow the bottom of the viewport and there is more room above
      if (spaceBelow < modalHeight + padding && spaceAbove > spaceBelow) {
        // Auto rise UP!
        setVerticalPosition('up');

        // Align modal bottom with button bottom:
        let topOffset = rect.height - modalHeight;

        // Clamp so it never overflows viewport top or bottom
        const topInViewport = rect.top + topOffset;
        if (topInViewport < padding) {
          topOffset = padding - rect.top;
        } else if (rect.bottom > windowHeight - padding) {
          topOffset = windowHeight - padding - modalHeight - rect.top;
        }

        setPopoverCoords({
          left: leftStyle,
          right: rightStyle,
          top: `${topOffset}px`,
          bottom: 'auto',
          maxHeight: `${effectiveMaxHeight}px`,
        });
      } else {
        // Open DOWN!
        setVerticalPosition('down');

        // Align modal top with button top
        let topOffset = 0;
        if (rect.top + modalHeight > windowHeight - padding) {
          topOffset = Math.max(padding - rect.top, windowHeight - padding - modalHeight - rect.top);
        }

        setPopoverCoords({
          left: leftStyle,
          right: rightStyle,
          top: `${topOffset}px`,
          bottom: 'auto',
          maxHeight: `${effectiveMaxHeight}px`,
        });
      }
    } else {
      // Mobile: Below or Above the button
      if (spaceBelow < modalHeight + padding && spaceAbove > spaceBelow) {
        setVerticalPosition('up');
        setPopoverCoords({
          left: 0,
          right: 'auto',
          bottom: 'calc(100% + 8px)',
          top: 'auto',
          maxHeight: `${effectiveMaxHeight}px`,
        });
      } else {
        setVerticalPosition('down');
        setPopoverCoords({
          left: 0,
          right: 'auto',
          top: 'calc(100% + 8px)',
          bottom: 'auto',
          maxHeight: `${effectiveMaxHeight}px`,
        });
      }
    }
  }, []);

  // Recalculate position dynamically when open and during scroll/resize
  useEffect(() => {
    if (!dropdownOpen) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [dropdownOpen, updatePosition]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePosition();
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 250);
  };

  const defaultKey = dynamicPlans.length > 0 ? dynamicPlans[0].plan_key : '';

  const handleNavigate = (key?: string) => {
    setDropdownOpen(false);
    if (key) {
      router.push(`/free-trial?plan=${key}`);
    } else {
      router.push('/free-trial');
    }
  };

  return (
    <div
      ref={wrapperRef}
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
        {dynamicPlans.length > 0 && (
          <ChevronDown
            size={16}
            className={`text-emerald-400 transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'
            }`}
          />
        )}
      </button>

      {/* Floating Dropdown on Hover - Dynamically placed on right side, auto rising up or down based on screen space */}
      {dynamicPlans.length > 0 && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute w-[340px] sm:w-[400px] h-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 flex flex-col transition-all duration-200 ${
            verticalPosition === 'up'
              ? horizontalPosition === 'left'
                ? 'origin-bottom sm:origin-bottom-right'
                : 'origin-bottom sm:origin-bottom-left'
              : horizontalPosition === 'left'
              ? 'origin-top sm:origin-top-right'
              : 'origin-top sm:origin-top-left'
          } ${
            dropdownOpen
              ? 'opacity-100 visible scale-100 pointer-events-auto'
              : 'opacity-0 invisible scale-95 pointer-events-none'
          }`}
          style={{
            zIndex: 9999,
            ...popoverCoords,
          }}
        >
          {/* Transparent Hover Safety Bridge */}
          {/* Desktop: Horizontal bridge on both left and right sides */}
          <div className="hidden sm:block absolute -left-5 top-0 w-5 h-full pointer-events-auto" />
          <div className="hidden sm:block absolute -right-5 top-0 w-5 h-full pointer-events-auto" />
          {/* Mobile: Vertical bridge */}
          <div
            className={`block sm:hidden absolute left-0 w-full h-4 pointer-events-auto ${
              verticalPosition === 'up' ? '-bottom-4' : '-top-4'
            }`}
          />

          {/* Header banner */}
          <div className="shrink-0 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl border border-blue-100/70 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b4da2]">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <span>Includes 3-Days Full Free Trial</span>
            </div>
            <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
              No Risk
            </span>
          </div>

          {/* Dynamic Plan Packages List - Scrollable */}
          <div
            className="flex-1 overflow-y-auto space-y-2 pr-1.5"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#94a3b8 #f1f5f9',
            }}
          >
            {dynamicPlans.map((pkg) => {
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
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          <Sparkles size={10} className="text-amber-500" />
                          <span>
                            {pkg.trial_days === 30 || Number(pkg.trial_days) === 30
                              ? '1 Month Free Trial'
                              : `${pkg.trial_days || 3}-Day Free Trial`}
                          </span>
                          <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-1 rounded">FREE</span>
                        </span>
                        {pkg.savings_text && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-medium">{pkg.savings_text}</span>
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
            })}
          </div>

          {/* Footer note */}
          <div className="shrink-0 pt-2.5 mt-2 border-t border-slate-100 px-2 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
              <span>Super Admin review & approval</span>
            </span>
            <span className="font-semibold text-slate-700">Master Admin Access</span>
          </div>
        </div>
      )}
    </div>
  );
}
