'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Palette,
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  Layers,
  Flame,
  SunMedium,
  SquareDashedBottomCode,
  Calendar,
  CalendarClock,
  CalendarDays,
  Clock,
  RotateCw,
  Plus,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import {
  DashboardCardDesignType,
  GlassThemeColors,
  GlassScheduleSettings,
  GlassScheduleMode,
  GlassRotationStep,
  DEFAULT_GLASS_THEME_COLORS,
  DEFAULT_GLASS_SCHEDULE,
  GLASS_COLOR_PRESETS,
  getActiveScheduledGlassPreset,
  resolveEffectiveGlassColors,
  applyGlassThemeColors,
  getGlassThemeCssVars,
} from '@/lib/themeSettings';

interface CardDesignThemeSectionProps {
  selectedCardDesign: DashboardCardDesignType;
  onSelectDesign: (design: DashboardCardDesignType) => void;
  glassColors?: GlassThemeColors;
  onSaveGlassColors?: (colors: GlassThemeColors) => Promise<void> | void;
  saving?: boolean;
}

const WEEKDAYS = [
  { index: 0, name: 'Sunday' },
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
];

export default function CardDesignThemeSection({
  selectedCardDesign,
  onSelectDesign,
  glassColors,
  onSaveGlassColors,
  saving = false,
}: CardDesignThemeSectionProps) {
  // Local state for glass colors
  const [colors, setColors] = useState<GlassThemeColors>(() => {
    return glassColors || DEFAULT_GLASS_THEME_COLORS;
  });

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [localSaving, setLocalSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'optics' | 'schedule'>('presets');

  // Date simulator for testing future scheduled themes
  const [simulatedDayOffset, setSimulatedDayOffset] = useState<number>(0);

  // Sync when glassColors prop changes from backend
  useEffect(() => {
    if (glassColors) {
      setColors(glassColors);
      setIsDirty(false);
    }
  }, [glassColors]);

  // Compute simulated date
  const simulatedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + simulatedDayOffset);
    return d;
  }, [simulatedDayOffset]);

  // Compute active scheduled preset info
  const scheduledInfo = useMemo(() => {
    return getActiveScheduledGlassPreset(colors.schedule, simulatedDate);
  }, [colors.schedule, simulatedDate]);

  // Effective colors currently displayed
  const effectiveColors = useMemo(() => {
    return resolveEffectiveGlassColors(colors, simulatedDate);
  }, [colors, simulatedDate]);

  // Compute CSS custom properties for live inline preview
  const liveCssVars = useMemo(() => {
    return getGlassThemeCssVars(colors, simulatedDate) as React.CSSProperties;
  }, [colors, simulatedDate]);

  const activePreset = useMemo(() => {
    if (colors.schedule?.enabled) {
      return GLASS_COLOR_PRESETS.find((p) => p.id === scheduledInfo.presetId) || GLASS_COLOR_PRESETS[0];
    }
    return GLASS_COLOR_PRESETS.find((p) => p.id === colors.preset) || GLASS_COLOR_PRESETS[0];
  }, [colors.schedule?.enabled, scheduledInfo.presetId, colors.preset]);

  // Handle color change live
  const updateColorField = (field: keyof GlassThemeColors, value: any) => {
    const updated: GlassThemeColors = {
      ...colors,
      [field]: value,
      preset: field === 'preset' ? value : 'custom',
    };
    setColors(updated);
    setIsDirty(true);
    applyGlassThemeColors(updated);
  };

  // Handle schedule changes
  const updateScheduleField = (field: keyof GlassScheduleSettings, value: any) => {
    const currentSched = colors.schedule || DEFAULT_GLASS_SCHEDULE;
    const updatedSched: GlassScheduleSettings = {
      ...currentSched,
      [field]: value,
    };
    const updatedColors: GlassThemeColors = {
      ...colors,
      schedule: updatedSched,
    };
    setColors(updatedColors);
    setIsDirty(true);
    applyGlassThemeColors(updatedColors);
  };

  const updateDayMapping = (dayIndex: number, presetId: string) => {
    const currentSched = colors.schedule || DEFAULT_GLASS_SCHEDULE;
    const updatedSched: GlassScheduleSettings = {
      ...currentSched,
      day_mapping: {
        ...currentSched.day_mapping,
        [dayIndex]: presetId,
      },
    };
    const updatedColors: GlassThemeColors = {
      ...colors,
      schedule: updatedSched,
    };
    setColors(updatedColors);
    setIsDirty(true);
    applyGlassThemeColors(updatedColors);
  };

  const toggleIntervalPreset = (presetId: string) => {
    const currentSched = colors.schedule || DEFAULT_GLASS_SCHEDULE;
    const list = currentSched.interval_presets || [];
    let updatedList: string[];
    if (list.includes(presetId)) {
      if (list.length <= 1) return; // Keep at least one
      updatedList = list.filter((p) => p !== presetId);
    } else {
      updatedList = [...list, presetId];
    }
    updateScheduleField('interval_presets', updatedList);
  };

  const addRotationStep = () => {
    const currentSched = colors.schedule || DEFAULT_GLASS_SCHEDULE;
    const steps = currentSched.rotation_steps || [];
    const nextPreset = GLASS_COLOR_PRESETS[(steps.length + 1) % GLASS_COLOR_PRESETS.length].id;
    const newStep: GlassRotationStep = {
      id: `step-${Date.now()}`,
      preset_id: nextPreset,
      duration_days: 2,
      label: `Stage ${steps.length + 1} (2 Days)`,
    };
    updateScheduleField('rotation_steps', [...steps, newStep]);
  };

  const removeRotationStep = (stepId: string) => {
    const currentSched = colors.schedule || DEFAULT_GLASS_SCHEDULE;
    const steps = (currentSched.rotation_steps || []).filter((s) => s.id !== stepId);
    if (steps.length < 2) return; // Keep at least two steps
    updateScheduleField('rotation_steps', steps);
  };

  const updateRotationStep = (stepId: string, updates: Partial<GlassRotationStep>) => {
    const currentSched = colors.schedule || DEFAULT_GLASS_SCHEDULE;
    const steps = (currentSched.rotation_steps || []).map((s) => {
      if (s.id === stepId) {
        return { ...s, ...updates };
      }
      return s;
    });
    updateScheduleField('rotation_steps', steps);
  };

  // Handle selecting a preset
  const handleSelectPreset = (presetId: string) => {
    const found = GLASS_COLOR_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    const updated: GlassThemeColors = {
      ...found.colors,
      preset: presetId,
      schedule: colors.schedule,
    };
    setColors(updated);
    setIsDirty(true);
    applyGlassThemeColors(updated);
  };

  // Save changes
  const handleSave = async () => {
    if (!onSaveGlassColors) return;
    try {
      setLocalSaving(true);
      await onSaveGlassColors(colors);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save glass colors:', err);
    } finally {
      setLocalSaving(false);
    }
  };

  // Reset to default Akashi
  const handleReset = () => {
    setColors(DEFAULT_GLASS_THEME_COLORS);
    setIsDirty(true);
    applyGlassThemeColors(DEFAULT_GLASS_THEME_COLORS);
  };

  const currentSchedule = colors.schedule || DEFAULT_GLASS_SCHEDULE;
  const currentDayOfWeek = new Date().getDay();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ==================================================================== */}
      {/* 1. MAIN DESIGN SELECTOR: Classic vs Frosted Glassmorphism            */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
              <CreditCard size={20} className="text-[#0b4da2]" />
              <span>Admin Dashboard Card Design Theme</span>
            </h2>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Select the appearance and hover animation for cards across Central Management, Master Admin, and Company Directory.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0b4da2] animate-pulse" />
              <span>
                Active: {selectedCardDesign === 'glassmorphism'
                  ? colors.schedule?.enabled
                    ? `Frosted Glass (Auto: ${activePreset?.name || 'Scheduled'})`
                    : `Frosted Glass (${activePreset ? activePreset.name : 'Custom Glow'})`
                  : 'Classic White Clean'}
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

          {/* OPTION 2: Frosted Glassmorphism */}
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
                  <div
                    className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold shadow-xs"
                    style={{
                      background: `linear-gradient(135deg, ${effectiveColors.primary_glow}, ${effectiveColors.secondary_glow})`,
                    }}
                  >
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-1.5">
                      <span>Frosted Glassmorphism</span>
                      <span
                        className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase text-white shadow-2xs"
                        style={{ backgroundColor: effectiveColors.primary_glow }}
                      >
                        {activePreset ? activePreset.name : 'Custom Glow'}
                      </span>
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {colors.schedule?.enabled ? 'Auto-Scheduled Rotation Active' : 'Fully Customizable Crystal Glass'}
                    </span>
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
                Frosted crystalline glass panel with specular lens glare &amp; customizable glow aura. Full color palette, borders, opacity, and auto-scheduling can be configured below!
              </p>

              {/* Interactive Demo Card with Live Theme CSS Vars */}
              <div
                className="mb-4 p-4 rounded-xl bg-gradient-to-br from-slate-100 via-sky-50/60 to-slate-100 border border-slate-200/90 relative overflow-hidden"
                style={liveCssVars}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 flex items-center gap-1">
                  <Sparkles size={11} style={{ color: effectiveColors.primary_glow }} />
                  <span>Interactive Live Preview (Hover to test current colors):</span>
                </span>
                <div className="dashboard-card-glass rounded-2xl p-4 flex flex-col justify-between group min-h-[105px] cursor-pointer">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className="text-xs text-slate-600 font-bold uppercase tracking-wide transition-colors"
                      style={{ color: effectiveColors.text_accent }}
                    >
                      Total Foreign Workers
                    </span>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: `${effectiveColors.primary_glow}25`,
                        color: effectiveColors.primary_glow,
                      }}
                    >
                      <Users size={14} />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">1,480</div>
                  <div
                    className="text-[11px] flex items-center gap-1 font-medium transition-colors"
                    style={{ color: effectiveColors.text_accent }}
                  >
                    <TrendingUp size={11} />
                    <span>Permits active • Live glass colors applied</span>
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
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-0 text-white shadow-sm ${
                selectedCardDesign === 'glassmorphism'
                  ? 'bg-[#22a34a] hover:bg-[#1b843c]'
                  : 'bg-sky-600 hover:bg-sky-700'
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

      {/* ==================================================================== */}
      {/* 2. GLASS THEME COLOR & OPTICS STUDIO                                 */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        {/* Studio Header & Save Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
                style={{
                  background: `linear-gradient(135deg, ${effectiveColors.primary_glow}, ${effectiveColors.secondary_glow})`,
                }}
              >
                <Palette size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Glass Theme Color &amp; Optics Studio
              </h3>
              {isDirty && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Customize colors, specular flares, backdrop blur, and set up automatic day-wise or interval theme rotation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer border-0"
              title="Reset all glass colors to default Akashi Sky Blue"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              disabled={localSaving || saving}
              onClick={handleSave}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-0 shadow-xs ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : isDirty
                  ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-300'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Settings Saved!</span>
                </>
              ) : localSaving || saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Glass Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-0 ${
              activeTab === 'presets'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles size={13} />
            <span>1-Click Presets ({GLASS_COLOR_PRESETS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-0 ${
              activeTab === 'custom'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Palette size={13} />
            <span>Individual Color Pickers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('optics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-0 ${
              activeTab === 'optics'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders size={13} />
            <span>Opacity, Blur &amp; Borders</span>
          </button>

          {/* TAB 4: AUTO COLOR SCHEDULER */}
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-0 ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white shadow-xs'
                : currentSchedule.enabled
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarClock size={14} />
            <span>Auto Schedule &amp; Rotation</span>
            {currentSchedule.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 1: 1-Click Glass Color Presets Grid                         */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'presets' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Choose a pre-tuned designer palette (Click to apply immediately):
              </span>
              <span className="text-[11px] text-slate-400">
                You can fine-tune any preset in the Color Pickers tab
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {GLASS_COLOR_PRESETS.map((preset) => {
                const isSelected = colors.preset === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`group relative rounded-xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/20 shadow-sm ring-1 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-2xs'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Gradient Swatch & Name */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-md shadow-2xs border border-white/60 shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${preset.colors.primary_glow}, ${preset.colors.secondary_glow})`,
                            }}
                          />
                          <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {preset.name}
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-0.5 shadow-2xs">
                            <Check size={10} strokeWidth={3} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 group-hover:text-slate-600">
                            Apply
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 m-0 mb-3 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    {/* Color Swatch Dots Preview */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.colors.primary_glow }}
                          title={`Primary Glow: ${preset.colors.primary_glow}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.colors.secondary_glow }}
                          title={`Secondary Glow: ${preset.colors.secondary_glow}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.colors.border_color }}
                          title={`Border: ${preset.colors.border_color}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.colors.flare_color }}
                          title={`Flare: ${preset.colors.flare_color}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.colors.text_accent }}
                          title={`Accent: ${preset.colors.text_accent}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {preset.colors.primary_glow}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 2: Granular Color Pickers                                    */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'custom' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Fine-Tune Every Component Color:
                </span>
                <span className="text-[11px] text-slate-500">
                  Click any color swatch or type a custom HEX code to test instantly.
                </span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Mode: {colors.preset === 'custom' ? 'Custom Studio' : `${activePreset?.name || 'Preset'}`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Primary Glow Aura */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <Flame size={14} className="text-sky-500" />
                    <span>Primary Glow Aura</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                    {colors.primary_glow}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 m-0">
                  Luminous outer aura and top gradient highlight when hovering over cards.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors.primary_glow}
                    onChange={(e) => updateColorField('primary_glow', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={colors.primary_glow}
                    onChange={(e) => updateColorField('primary_glow', e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="#38bdf8"
                  />
                </div>
              </div>

              {/* 2. Secondary Glow Hue */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <Layers size={14} className="text-blue-600" />
                    <span>Secondary Deep Glow</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                    {colors.secondary_glow}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 m-0">
                  Deeper complementary gradient color blended into the middle of the glass.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors.secondary_glow}
                    onChange={(e) => updateColorField('secondary_glow', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={colors.secondary_glow}
                    onChange={(e) => updateColorField('secondary_glow', e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="#0ea5e9"
                  />
                </div>
              </div>

              {/* 3. Resting Border & Rim */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <SquareDashedBottomCode size={14} className="text-indigo-500" />
                    <span>Resting Border Rim</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                    {colors.border_color}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 m-0">
                  Delicate outer frame and inner bevel visible when cards are resting.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors.border_color}
                    onChange={(e) => updateColorField('border_color', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={colors.border_color}
                    onChange={(e) => updateColorField('border_color', e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="#bae6fd"
                  />
                </div>
              </div>

              {/* 4. Hover Edge Border */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <Sparkles size={14} className="text-sky-500" />
                    <span>Hover Active Border</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                    {colors.hover_border_color}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 m-0">
                  Border illumination accent when the user hovers over a dashboard card.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors.hover_border_color}
                    onChange={(e) => updateColorField('hover_border_color', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={colors.hover_border_color}
                    onChange={(e) => updateColorField('hover_border_color', e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="#38bdf8"
                  />
                </div>
              </div>

              {/* 5. Specular Flare Shimmer */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <SunMedium size={14} className="text-amber-500" />
                    <span>Specular Flare Shimmer</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                    {colors.flare_color}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 m-0">
                  Horizontal specular crystal reflections positioned at top &amp; bottom edges.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors.flare_color}
                    onChange={(e) => updateColorField('flare_color', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={colors.flare_color}
                    onChange={(e) => updateColorField('flare_color', e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="#38bdf8"
                  />
                </div>
              </div>

              {/* 6. Base Glass Background Tint */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <Layers size={14} className="text-teal-500" />
                    <span>Base Glass Tint</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                    {colors.base_tint}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 m-0">
                  Subtle background wash color of the glass sheet in resting state.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors.base_tint}
                    onChange={(e) => updateColorField('base_tint', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={colors.base_tint}
                    onChange={(e) => updateColorField('base_tint', e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="#f0f9ff"
                  />
                </div>
              </div>

              {/* 7. Text & Icon Hover Accent */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <Sparkles size={14} className="text-emerald-500" />
                    <span>Text &amp; Icon Accent</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                    {colors.text_accent}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 m-0">
                  Accent color for card titles, indicators, and icon badges when card is hovered.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors.text_accent}
                    onChange={(e) => updateColorField('text_accent', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                  />
                  <input
                    type="text"
                    value={colors.text_accent}
                    onChange={(e) => updateColorField('text_accent', e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="#0284c7"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 3: Opacity, Blur & Border Thickness Sliders                 */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'optics' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Physical Optics &amp; Glass Thickness Controls:
              </span>
              <span className="text-[11px] text-slate-400">
                Adjust transparency, backdrop blur strength, and edge borders
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Slider 1: Base Opacity */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <span>Base Glass Opacity</span>
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-blue-700">
                    {Math.round(colors.base_opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.20"
                  max="0.98"
                  step="0.02"
                  value={colors.base_opacity}
                  onChange={(e) => updateColorField('base_opacity', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 m-0">
                  Controls resting transparency of the frosted glass plate. Lower is more see-through.
                </p>
              </div>

              {/* Slider 2: Hover Glow Opacity */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <span>Hover Glow Radiance</span>
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-blue-700">
                    {Math.round(colors.hover_opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.65"
                  step="0.02"
                  value={colors.hover_opacity}
                  onChange={(e) => updateColorField('hover_opacity', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 m-0">
                  Intensity of the glowing color wash flood that fills the card when hovering.
                </p>
              </div>

              {/* Slider 3: Backdrop Blur Radius */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <span>Backdrop Blur Radius</span>
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-blue-700">
                    {colors.blur_radius}px
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="36"
                  step="1"
                  value={colors.blur_radius}
                  onChange={(e) => updateColorField('blur_radius', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 m-0">
                  Frosted glass blur filter density. Higher values produce deeply diffused frosted glass.
                </p>
              </div>

              {/* Slider 4: Border Width */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 m-0">
                    <span>Edge Border Width</span>
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-blue-700">
                    {colors.border_width}px
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3.5"
                  step="0.5"
                  value={colors.border_width}
                  onChange={(e) => updateColorField('border_width', parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 m-0">
                  Perimeter glass bevel edge thickness. (1px is recommended for crisp modern look).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 4: AUTO COLOR SCHEDULER (Day-Wise & Interval Rotation)       */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Master Toggle Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <CalendarClock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                    <span>Automatic Glass Theme Scheduler</span>
                    {currentSchedule.enabled && (
                      <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                        SCHEDULE ACTIVE
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-600 m-0 mt-1 leading-relaxed">
                    Automatically rotate frosted glass card colors based on the day of the week (Sunday to Saturday) or custom multi-day intervals (e.g. every 2 or 3 days).
                  </p>
                </div>
              </div>

              {/* Master Switch */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="text-xs font-bold text-slate-700">
                  {currentSchedule.enabled ? 'Schedule Enabled' : 'Schedule Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => updateScheduleField('enabled', !currentSchedule.enabled)}
                  className={`w-13 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-0 ${
                    currentSchedule.enabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  aria-pressed={currentSchedule.enabled}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      currentSchedule.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* If Scheduler is Enabled, Show Details & Modes */}
            {currentSchedule.enabled ? (
              <div className="space-y-6">
                {/* Active Live Status & Future Simulator */}
                <div className="p-4 rounded-xl bg-slate-900 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white/50 shadow-xs"
                        style={{ backgroundColor: effectiveColors.primary_glow }}
                      />
                      <span className="text-xs font-bold tracking-wide uppercase text-blue-400">
                        Active Scheduled Theme:
                      </span>
                      <span className="text-xs font-bold text-white">
                        {activePreset?.name || 'Scheduled Theme'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 m-0">
                      {scheduledInfo.description}
                    </p>
                  </div>

                  {/* Date Preview Simulator */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">
                      Test Future Days:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSimulatedDayOffset(0)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border-0 ${
                        simulatedDayOffset === 0
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedDayOffset(1)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border-0 ${
                        simulatedDayOffset === 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Tomorrow (+1d)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedDayOffset(2)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border-0 ${
                        simulatedDayOffset === 2
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      +2 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedDayOffset(3)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border-0 ${
                        simulatedDayOffset === 3
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedDayOffset(5)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border-0 ${
                        simulatedDayOffset === 5
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      +5 Days
                    </button>
                  </div>
                </div>

                {/* 3 Rotation Mode Selector Cards */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-3">
                    Select Rotation Strategy:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* MODE 1: Day of Week */}
                    <div
                      onClick={() => updateScheduleField('mode', 'day_of_week')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        currentSchedule.mode === 'day_of_week'
                          ? 'border-blue-600 bg-blue-50/30 shadow-xs ring-1 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <CalendarDays size={15} className="text-blue-600" />
                            <span>1. Day of Week</span>
                          </span>
                          {currentSchedule.mode === 'day_of_week' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
                          Assign a dedicated glass color theme for each day from Sunday to Saturday.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 mt-2 block">
                        Configure 7-Day Schedule &rarr;
                      </span>
                    </div>

                    {/* MODE 2: Fixed Interval */}
                    <div
                      onClick={() => updateScheduleField('mode', 'interval')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        currentSchedule.mode === 'interval'
                          ? 'border-blue-600 bg-blue-50/30 shadow-xs ring-1 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Clock size={15} className="text-indigo-600" />
                            <span>2. Fixed Interval</span>
                          </span>
                          {currentSchedule.mode === 'interval' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
                          Automatically advance to the next theme color every N days (e.g. every 2 or 3 days).
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 mt-2 block">
                        Rotate Every N Days &rarr;
                      </span>
                    </div>

                    {/* MODE 3: Step Rotation */}
                    <div
                      onClick={() => updateScheduleField('mode', 'step_rotation')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        currentSchedule.mode === 'step_rotation'
                          ? 'border-blue-600 bg-blue-50/30 shadow-xs ring-1 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <RotateCw size={15} className="text-emerald-600" />
                            <span>3. Custom Stage Sequence</span>
                          </span>
                          {currentSchedule.mode === 'step_rotation' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
                          Custom multi-day sequence: Stage 1 for 2 days, Stage 2 for 3 days, and continuously loop.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 mt-2 block">
                        Custom Multi-Day Sequence &rarr;
                      </span>
                    </div>
                  </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* MODE PANEL 1: Day of the Week Mapping                      */}
                {/* ---------------------------------------------------------- */}
                {currentSchedule.mode === 'day_of_week' && (
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide m-0">
                          Configure Day of the Week Palette:
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Cards will automatically display the assigned theme for today's calendar day.
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        Today: {WEEKDAYS[currentDayOfWeek].name}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      {WEEKDAYS.map((day) => {
                        const isToday = currentDayOfWeek === day.index;
                        const assignedPresetId = currentSchedule.day_mapping?.[day.index] || 'akashi';
                        const presetObj = GLASS_COLOR_PRESETS.find((p) => p.id === assignedPresetId);

                        return (
                          <div
                            key={day.index}
                            className={`p-3.5 rounded-xl border bg-white space-y-2.5 transition-all ${
                              isToday
                                ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">
                                {day.name}
                              </span>
                              {isToday && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase animate-pulse">
                                  Today
                                </span>
                              )}
                            </div>

                            {/* Preset Dropdown with Color Swatch */}
                            <div className="flex items-center gap-2">
                              <span
                                className="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-2xs"
                                style={{
                                  background: presetObj
                                    ? `linear-gradient(135deg, ${presetObj.colors.primary_glow}, ${presetObj.colors.secondary_glow})`
                                    : '#38bdf8',
                                }}
                              />
                              <select
                                value={assignedPresetId}
                                onChange={(e) => updateDayMapping(day.index, e.target.value)}
                                className="w-full text-xs font-semibold py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500"
                              >
                                {GLASS_COLOR_PRESETS.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* MODE PANEL 2: Fixed Interval                               */}
                {/* ---------------------------------------------------------- */}
                {currentSchedule.mode === 'interval' && (
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide m-0">
                          Fixed Interval Settings:
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          The theme automatically advances to the next color in the cycle after the specified number of days.
                        </span>
                      </div>

                      {/* Quick Day Chips */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-medium">Quick Set:</span>
                        {[2, 3, 5, 7].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => updateScheduleField('interval_days', num)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all border-0 ${
                              currentSchedule.interval_days === num
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {num} Days
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Interval Days Input */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                        <label className="text-xs font-bold text-slate-800 flex items-center justify-between m-0">
                          <span>Rotation Interval (Days)</span>
                          <span className="font-mono text-blue-600 font-extrabold text-sm">
                            Every {currentSchedule.interval_days || 2} Days
                          </span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={currentSchedule.interval_days || 2}
                          onChange={(e) => updateScheduleField('interval_days', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[11px] text-slate-400 m-0">
                          Example: Enter 2 to rotate every 2 days, or 3 to rotate every 3 days.
                        </p>
                      </div>

                      {/* Start Reference Date */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                        <label className="text-xs font-bold text-slate-800 flex items-center justify-between m-0">
                          <span>Reference Start Date</span>
                          <span className="font-mono text-slate-500 text-xs">
                            {currentSchedule.start_date || 'Today'}
                          </span>
                        </label>
                        <input
                          type="date"
                          value={currentSchedule.start_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => updateScheduleField('start_date', e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[11px] text-slate-400 m-0">
                          Cycle days are calculated starting from this anchor date.
                        </p>
                      </div>
                    </div>

                    {/* Presets in this Cycle */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                        Included Themes in Interval Rotation:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                        {GLASS_COLOR_PRESETS.map((p) => {
                          const isIncluded = (currentSchedule.interval_presets || []).includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => toggleIntervalPreset(p.id)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${
                                isIncluded
                                  ? 'border-blue-500 bg-blue-50/40 shadow-2xs font-bold text-slate-900'
                                  : 'border-slate-200 bg-white opacity-50 hover:opacity-100 text-slate-500'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: p.colors.primary_glow }}
                              />
                              <span className="text-xs truncate">{p.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* MODE PANEL 3: Step Rotation                                */}
                {/* ---------------------------------------------------------- */}
                {currentSchedule.mode === 'step_rotation' && (
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide m-0">
                          Custom Multi-Day Stages (Stage Sequence):
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Define custom durations and colors for each stage in the rotation sequence.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={addRotationStep}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-200 transition-all flex items-center gap-1.5 cursor-pointer border-0 shrink-0"
                      >
                        <Plus size={14} />
                        <span>Add Stage</span>
                      </button>
                    </div>

                    {/* Step Cards List */}
                    <div className="space-y-3">
                      {(currentSchedule.rotation_steps || []).map((step, idx) => {
                        const presetObj = GLASS_COLOR_PRESETS.find((p) => p.id === step.preset_id);
                        return (
                          <div
                            key={step.id}
                            className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>

                              {/* Swatch & Preset Select */}
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-2xs"
                                  style={{
                                    background: presetObj
                                      ? `linear-gradient(135deg, ${presetObj.colors.primary_glow}, ${presetObj.colors.secondary_glow})`
                                      : '#38bdf8',
                                  }}
                                />
                                <select
                                  value={step.preset_id}
                                  onChange={(e) => updateRotationStep(step.id, { preset_id: e.target.value })}
                                  className="text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500"
                                >
                                  {GLASS_COLOR_PRESETS.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Duration & Actions */}
                            <div className="flex items-center gap-3 self-end md:self-center">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500">Duration:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="30"
                                  value={step.duration_days}
                                  onChange={(e) =>
                                    updateRotationStep(step.id, {
                                      duration_days: Math.max(1, parseInt(e.target.value, 10) || 1),
                                    })
                                  }
                                  className="w-16 text-xs font-mono font-bold text-center py-1 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-xs font-bold text-slate-700">Days</span>
                              </div>

                              {(currentSchedule.rotation_steps || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeRotationStep(step.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors border-0 cursor-pointer"
                                  title="Delete stage"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Visual Cycle Flow Banner */}
                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs text-blue-900 font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold">Rotation Cycle:</span>
                        {(currentSchedule.rotation_steps || []).map((s, i) => (
                          <React.Fragment key={s.id}>
                            <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800 font-semibold">
                              {GLASS_COLOR_PRESETS.find((p) => p.id === s.preset_id)?.name || s.preset_id} ({s.duration_days}d)
                            </span>
                            {i < (currentSchedule.rotation_steps || []).length - 1 && (
                              <ArrowRight size={13} className="text-blue-400" />
                            )}
                          </React.Fragment>
                        ))}
                        <span className="text-blue-500 font-bold ml-1">↺ Loop</span>
                      </div>

                      <span className="font-bold shrink-0">
                        Total Cycle: {(currentSchedule.rotation_steps || []).reduce((acc, s) => acc + s.duration_days, 0)} Days
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <Calendar size={32} className="mx-auto text-slate-400" />
                <h4 className="text-sm font-bold text-slate-800 m-0">
                  Automatic Theme Scheduler is Currently Turned Off
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                  Turn on the switch above to enable automatic daily color shifts or multi-day interval rotations (e.g. every 2 or 3 days).
                </p>
                <button
                  type="button"
                  onClick={() => updateScheduleField('enabled', true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer border-0 shadow-xs"
                >
                  Enable Scheduler Now
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 3. FULL LIVE DASHBOARD PREVIEW SHOWCASE                              */}
      {/* ==================================================================== */}
      <div
        className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5"
        style={liveCssVars}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
              <Monitor size={17} className="text-[#0b4da2]" />
              <span>
                Live Dashboard Cards Showcase (
                {selectedCardDesign === 'glassmorphism'
                  ? colors.schedule?.enabled
                    ? `Frosted Glassmorphism • Auto: ${activePreset?.name || 'Scheduled'} (${scheduledInfo.currentStepLabel || 'Today'})`
                    : `Frosted Glassmorphism • ${activePreset ? activePreset.name : 'Custom Glow'}`
                  : 'Classic White Clean'}
                )
              </span>
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Live representation of how cards render across Central Management, Master Admin, and Company Directory.
            </p>
          </div>
          <div
            className="text-[11px] px-3 py-1 rounded-full font-medium flex items-center gap-1.5 border shadow-2xs"
            style={{
              backgroundColor: `${effectiveColors.primary_glow}15`,
              borderColor: `${effectiveColors.primary_glow}40`,
              color: effectiveColors.text_accent,
            }}
          >
            <Sparkles size={12} style={{ color: effectiveColors.primary_glow }} />
            <span>
              {colors.schedule?.enabled
                ? `✨ Auto-Schedule: Showing ${activePreset?.name || 'Active Theme'} (Hover to test glow)`
                : '✨ Hover on any card below to experience the live glowing aura!'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-100/90 via-sky-50/40 to-slate-100/90 border border-slate-200/90">
          {/* Card 1 */}
          <div
            className={
              selectedCardDesign === 'glassmorphism'
                ? 'dashboard-card-glass rounded-2xl p-5 flex flex-col justify-between group min-h-[120px] cursor-pointer'
                : 'no-glass bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px] cursor-pointer'
            }
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-blue-700 transition-colors leading-tight">
                Registered Companies
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                style={{
                  backgroundColor: selectedCardDesign === 'glassmorphism' ? `${effectiveColors.primary_glow}20` : undefined,
                  color: selectedCardDesign === 'glassmorphism' ? effectiveColors.primary_glow : undefined,
                }}
              >
                <Building2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
              18
            </div>
            <div
              className="text-[11px] mt-1 flex items-center gap-1 font-medium truncate"
              style={{
                color: selectedCardDesign === 'glassmorphism' ? effectiveColors.text_accent : '#059669',
              }}
            >
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
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide transition-colors leading-tight">
                Total Foreign Workers
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                style={{
                  backgroundColor: selectedCardDesign === 'glassmorphism' ? `${effectiveColors.primary_glow}20` : undefined,
                  color: selectedCardDesign === 'glassmorphism' ? effectiveColors.primary_glow : undefined,
                }}
              >
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
              1,480
            </div>
            <div
              className="text-[11px] mt-1 truncate font-medium"
              style={{
                color: selectedCardDesign === 'glassmorphism' ? effectiveColors.text_accent : '#64748b',
              }}
            >
              Foreign worker permits allocated
            </div>
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
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide transition-colors leading-tight">
                Active Sectors
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                style={{
                  backgroundColor: selectedCardDesign === 'glassmorphism' ? `${effectiveColors.primary_glow}20` : undefined,
                  color: selectedCardDesign === 'glassmorphism' ? effectiveColors.primary_glow : undefined,
                }}
              >
                <Briefcase size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
              6
            </div>
            <div
              className="text-[11px] mt-1 truncate font-medium"
              style={{
                color: selectedCardDesign === 'glassmorphism' ? effectiveColors.text_accent : '#64748b',
              }}
            >
              Approved economic sectors
            </div>
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
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide transition-colors leading-tight">
                System Health
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                style={{
                  backgroundColor: selectedCardDesign === 'glassmorphism' ? `${effectiveColors.primary_glow}20` : undefined,
                  color: selectedCardDesign === 'glassmorphism' ? effectiveColors.primary_glow : undefined,
                }}
              >
                <ShieldCheck size={16} />
              </div>
            </div>
            <div
              className="text-2xl font-bold tracking-tight flex items-center gap-1.5 my-0.5"
              style={{
                color: selectedCardDesign === 'glassmorphism' ? effectiveColors.text_accent : '#047857',
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: selectedCardDesign === 'glassmorphism' ? effectiveColors.primary_glow : '#10b981',
                }}
              />
              <span>Online</span>
            </div>
            <div
              className="text-[11px] mt-1 truncate font-medium"
              style={{
                color: selectedCardDesign === 'glassmorphism' ? effectiveColors.text_accent : '#64748b',
              }}
            >
              Laravel 11 REST API operational
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
