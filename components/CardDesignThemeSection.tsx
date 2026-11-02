'use client';

import React from 'react';
import {
  CreditCard,
  Sparkles,
  Monitor,
  Check,
  TrendingUp,
  Building2,
  Users,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { DashboardCardDesignType } from '@/lib/themeSettings';

interface CardDesignThemeSectionProps {
  selectedCardDesign: DashboardCardDesignType;
  onSelectDesign: (design: DashboardCardDesignType) => void;
  saving?: boolean;
}

export default function CardDesignThemeSection({
  selectedCardDesign,
  onSelectDesign,
  saving = false,
}: CardDesignThemeSectionProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header & Options Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
              <CreditCard size={20} className="text-[#0b4da2]" />
              <span>Admin Dashboard Card Design Theme</span>
            </h2>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Select the appearance and hover animation for cards across Central Management and Company Directory.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0b4da2] animate-pulse" />
              <span>
                Active: {selectedCardDesign === 'glassmorphism' ? 'Frosted Glassmorphism (Akashi Glow)' : 'Classic White Clean'}
              </span>
            </span>
          </div>
        </div>

        {/* 2 Selectable Design Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* OPTION 1: Classic White Clean */}
          <div
            onClick={() => onSelectDesign('default')}
            className={`relative rounded-2xl p-6 transition-all cursor-pointer border-2 text-left flex flex-col justify-between ${
              selectedCardDesign === 'default'
                ? 'border-[#0b4da2] bg-blue-50/20 shadow-md ring-2 ring-blue-100'
                : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 m-0">Classic White Clean</h3>
                    <span className="text-[11px] text-slate-500">Default Card Style</span>
                  </div>
                </div>
                {selectedCardDesign === 'default' ? (
                  <span className="inline-flex items-center gap-1 bg-[#22a34a] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-2xs">
                    <Check size={12} strokeWidth={3} />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Click to activate
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Solid crisp white background with clean slate border. Standard high-contrast corporate aesthetic with subtle elevation on hover.
              </p>

              {/* Interactive Demo Card */}
              <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Interactive Live Preview (Hover to test):
                </span>
                <div className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between group min-h-[105px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors">
                      Registered Companies
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                      <Building2 size={14} />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">24</div>
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                    <TrendingUp size={11} />
                    <span>Active registered employers</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDesign('default');
              }}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-0 ${
                selectedCardDesign === 'default'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-[#0b4da2] hover:text-white text-slate-700'
              }`}
            >
              {selectedCardDesign === 'default' ? (
                <>
                  <Check size={14} strokeWidth={3} />
                  <span>Active Theme</span>
                </>
              ) : (
                <span>Activate Classic White Design</span>
              )}
            </button>
          </div>

          {/* OPTION 2: Frosted Glassmorphism (Uploaded Design) */}
          <div
            onClick={() => onSelectDesign('glassmorphism')}
            className={`relative rounded-2xl p-6 transition-all cursor-pointer border-2 text-left flex flex-col justify-between ${
              selectedCardDesign === 'glassmorphism'
                ? 'border-sky-400 bg-sky-50/25 shadow-md ring-2 ring-sky-200'
                : 'border-slate-200 hover:border-sky-300 bg-white hover:shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-1.5">
                      <span>Frosted Glassmorphism</span>
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-extrabold px-1.5 py-0.5 rounded uppercase">
                        Akashi Glow
                      </span>
                    </h3>
                    <span className="text-[11px] text-slate-500">Uploaded Custom Glass Design</span>
                  </div>
                </div>
                {selectedCardDesign === 'glassmorphism' ? (
                  <span className="inline-flex items-center gap-1 bg-[#22a34a] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-2xs">
                    <Check size={12} strokeWidth={3} />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Click to activate
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Frosted crystalline glass panel with visible subtle edge border &amp; specular glare. Hovering over the card transforms it into an immersive glowing <strong>Akashi (Sky Blue)</strong> glass aura!
              </p>

              {/* Interactive Demo Card with Akashi Hover */}
              <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-slate-100 via-sky-50/60 to-slate-100 border border-slate-200/90 relative overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block mb-2 flex items-center gap-1">
                  <Sparkles size={11} className="text-sky-500" />
                  <span>Interactive Live Preview (Hover to see Full Glass Color):</span>
                </span>
                <div className="dashboard-card-glass rounded-2xl p-4 flex flex-col justify-between group min-h-[105px] cursor-pointer">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-600 font-bold uppercase tracking-wide group-hover:text-sky-600 transition-colors">
                      Total Foreign Workers
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center transition-colors">
                      <Users size={14} />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">1,480</div>
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium group-hover:text-sky-700 transition-colors">
                    <TrendingUp size={11} />
                    <span>Foreign worker permits allocated</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDesign('glassmorphism');
              }}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-0 ${
                selectedCardDesign === 'glassmorphism'
                  ? 'bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-sm'
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}
            >
              {selectedCardDesign === 'glassmorphism' ? (
                <>
                  <Check size={14} strokeWidth={3} />
                  <span>Active Theme</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Activate Frosted Glass Design</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Full Live Dashboard Preview Showcase */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
              <Monitor size={17} className="text-[#0b4da2]" />
              <span>
                Live Dashboard Cards Showcase ({selectedCardDesign === 'glassmorphism' ? 'Frosted Glassmorphism' : 'Classic White Clean'})
              </span>
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Live representation of how cards render across Central Management and Company Directory.
            </p>
          </div>
          <div className="text-[11px] text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full font-medium flex items-center gap-1">
            <span>✨ Hover on any card below to experience the Full Glass Color glow!</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-100/90 via-sky-50/50 to-slate-100/90 border border-slate-200/90">
          {/* Card 1 */}
          <div
            className={
              selectedCardDesign === 'glassmorphism'
                ? 'dashboard-card-glass rounded-2xl p-5 flex flex-col justify-between group min-h-[120px] cursor-pointer'
                : 'no-glass bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px] cursor-pointer'
            }
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight">
                Registered Companies
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] group-hover:bg-[#0b4da2] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <Building2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
              18
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium truncate">
              <TrendingUp size={12} />
              <span>Active registered employers</span>
            </div>
          </div>

          {/* Card 2 */}
          <div
            className={
              selectedCardDesign === 'glassmorphism'
                ? 'dashboard-card-glass rounded-2xl p-5 flex flex-col justify-between group min-h-[120px] cursor-pointer'
                : 'no-glass bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px] cursor-pointer'
            }
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-emerald-700 transition-colors leading-tight">
                Total Foreign Workers
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
              1,480
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">Foreign worker permits allocated</div>
          </div>

          {/* Card 3 */}
          <div
            className={
              selectedCardDesign === 'glassmorphism'
                ? 'dashboard-card-glass rounded-2xl p-5 flex flex-col justify-between group min-h-[120px] cursor-pointer'
                : 'no-glass bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px] cursor-pointer'
            }
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-indigo-700 transition-colors leading-tight">
                Active Sectors
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <Briefcase size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
              6
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">Approved economic sectors</div>
          </div>

          {/* Card 4 */}
          <div
            className={
              selectedCardDesign === 'glassmorphism'
                ? 'dashboard-card-glass rounded-2xl p-5 flex flex-col justify-between group min-h-[120px] cursor-pointer'
                : 'no-glass bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px] cursor-pointer'
            }
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-amber-700 transition-colors leading-tight">
                System Health
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight flex items-center gap-1.5 my-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Online</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">Laravel 11 REST API operational</div>
          </div>
        </div>
      </div>
    </div>
  );
}
