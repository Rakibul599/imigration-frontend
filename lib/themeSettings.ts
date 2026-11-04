'use client';

import React, { useState, useEffect } from 'react';

export interface Theme1Data {
  eyebrow: string;
  title_line1: string;
  title_line2: string;
  subtitle: string;
  primary_btn_text: string;
  primary_btn_link: string;
  secondary_btn_text: string;
  secondary_btn_link: string;
  laptop_badge_text: string;
  metric_percentage: string;
  metric_label: string;
}

export interface Theme2Data {
  title_line1: string;
  title_line2: string;
  subtitle: string;
  price_prefix: string;
  price_amount: string;
  price_suffix: string;
  disclaimer: string;
  btn_text: string;
  btn_link: string;
  badge1_text: string;
  badge2_text: string;
  badge3_text: string;
}

export type ServiceCardsAnimationType =
  | 'from-left'
  | 'from-right'
  | 'from-bottom'
  | 'from-top'
  | 'random';

export type DashboardCardDesignType = 'default' | 'glassmorphism';

export type GlassScheduleMode = 'day_of_week' | 'interval' | 'step_rotation';

export interface GlassRotationStep {
  id: string;
  preset_id: string;
  duration_days: number;
  label?: string;
}

export interface GlassScheduleSettings {
  enabled: boolean; // Auto schedule active
  mode: GlassScheduleMode;
  // Mode 1: Day of week mapping (0 = Sun, 1 = Mon, ..., 6 = Sat)
  day_mapping: Record<number, string>;
  // Mode 2: Fixed interval rotation (e.g. every 2 days, every 3 days)
  interval_days: number;
  interval_presets: string[];
  // Mode 3: Multi-day custom steps (e.g. 2 days Theme A, 3 days Theme B)
  rotation_steps: GlassRotationStep[];
  // Reference anchor date YYYY-MM-DD
  start_date: string;
}

export const DEFAULT_GLASS_SCHEDULE: GlassScheduleSettings = {
  enabled: false,
  mode: 'day_of_week',
  day_mapping: {
    0: 'akashi',    // Sunday: Akashi Sky Blue
    1: 'emerald',   // Monday: Emerald Jade
    2: 'sapphire',  // Tuesday: Royal Sapphire
    3: 'violet',    // Wednesday: Electric Violet
    4: 'amber',     // Thursday: Sunset Amber Gold
    5: 'rose',      // Friday: Crimson Ruby
    6: 'cyberpunk', // Saturday: Cyberpunk Neon
  },
  interval_days: 2,
  interval_presets: ['akashi', 'emerald', 'sapphire', 'violet', 'amber'],
  rotation_steps: [
    { id: 'step-1', preset_id: 'akashi', duration_days: 2, label: 'Stage 1: Akashi Sky Blue (2 Days)' },
    { id: 'step-2', preset_id: 'emerald', duration_days: 3, label: 'Stage 2: Emerald Jade (3 Days)' },
    { id: 'step-3', preset_id: 'amber', duration_days: 2, label: 'Stage 3: Sunset Amber (2 Days)' },
  ],
  start_date: '2026-11-04',
};

export interface GlassThemeColors {
  preset?: string; // 'akashi' | 'emerald' | 'sapphire' | 'violet' | 'amber' | 'rose' | 'cyberpunk' | 'dark_onyx' | 'crystal' | 'custom'
  primary_glow: string; // Primary glow & hover aura color (e.g. #38bdf8)
  secondary_glow: string; // Deep gradient glow color (e.g. #0ea5e9)
  border_color: string; // Resting border & highlight rim color (e.g. #bae6fd)
  hover_border_color: string; // Hover border color (e.g. #38bdf8)
  flare_color: string; // Specular edge shimmer flare (e.g. #38bdf8)
  base_tint: string; // Normal subtle glass background tint (e.g. #f0f9ff)
  base_opacity: number; // Normal glass opacity (0.2 to 1.0)
  hover_opacity: number; // Hover glow opacity (0.1 to 0.8)
  text_accent: string; // Text & icon hover accent (e.g. #0284c7)
  glow_intensity: number; // Hover glow shadow spread in px (10 to 50)
  blur_radius: number; // Backdrop blur in px (8 to 40)
  border_width: number; // Border thickness in px (1 to 4)
  schedule?: GlassScheduleSettings;
}

export const DEFAULT_GLASS_THEME_COLORS: GlassThemeColors = {
  preset: 'akashi',
  primary_glow: '#38bdf8',
  secondary_glow: '#0ea5e9',
  border_color: '#bae6fd',
  hover_border_color: '#38bdf8',
  flare_color: '#38bdf8',
  base_tint: '#f0f9ff',
  base_opacity: 0.82,
  hover_opacity: 0.28,
  text_accent: '#0284c7',
  glow_intensity: 24,
  blur_radius: 20,
  border_width: 1,
  schedule: DEFAULT_GLASS_SCHEDULE,
};

export interface GlassColorPreset {
  id: string;
  name: string;
  description: string;
  previewGradient: string;
  colors: GlassThemeColors;
}

export const GLASS_COLOR_PRESETS: GlassColorPreset[] = [
  {
    id: 'akashi',
    name: 'Akashi Sky Blue',
    description: 'Original luminous cyan-sky crystal frosted glass',
    previewGradient: 'from-sky-400 to-blue-600',
    colors: {
      preset: 'akashi',
      primary_glow: '#38bdf8',
      secondary_glow: '#0ea5e9',
      border_color: '#bae6fd',
      hover_border_color: '#38bdf8',
      flare_color: '#38bdf8',
      base_tint: '#f0f9ff',
      base_opacity: 0.82,
      hover_opacity: 0.28,
      text_accent: '#0284c7',
      glow_intensity: 24,
      blur_radius: 20,
      border_width: 1,
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Jade',
    description: 'Fresh luxury jade & mint crystalline glow',
    previewGradient: 'from-emerald-400 to-teal-600',
    colors: {
      preset: 'emerald',
      primary_glow: '#34d399',
      secondary_glow: '#059669',
      border_color: '#a7f3d0',
      hover_border_color: '#10b981',
      flare_color: '#34d399',
      base_tint: '#f0fdf4',
      base_opacity: 0.82,
      hover_opacity: 0.28,
      text_accent: '#047857',
      glow_intensity: 24,
      blur_radius: 20,
      border_width: 1,
    },
  },
  {
    id: 'sapphire',
    name: 'Royal Sapphire',
    description: 'Deep royal blue with crisp electric highlights',
    previewGradient: 'from-blue-500 to-indigo-700',
    colors: {
      preset: 'sapphire',
      primary_glow: '#60a5fa',
      secondary_glow: '#2563eb',
      border_color: '#bfdbfe',
      hover_border_color: '#3b82f6',
      flare_color: '#60a5fa',
      base_tint: '#eff6ff',
      base_opacity: 0.82,
      hover_opacity: 0.28,
      text_accent: '#1d4ed8',
      glow_intensity: 24,
      blur_radius: 20,
      border_width: 1,
    },
  },
  {
    id: 'violet',
    name: 'Electric Violet',
    description: 'Vibrant cyberpunk neon purple crystal panel',
    previewGradient: 'from-purple-400 to-indigo-600',
    colors: {
      preset: 'violet',
      primary_glow: '#a78bfa',
      secondary_glow: '#7c3aed',
      border_color: '#ddd6fe',
      hover_border_color: '#8b5cf6',
      flare_color: '#a78bfa',
      base_tint: '#faf5ff',
      base_opacity: 0.82,
      hover_opacity: 0.28,
      text_accent: '#6d28d9',
      glow_intensity: 24,
      blur_radius: 20,
      border_width: 1,
    },
  },
  {
    id: 'amber',
    name: 'Sunset Amber Gold',
    description: 'Warm golden topaz with radiant amber reflections',
    previewGradient: 'from-amber-400 to-orange-600',
    colors: {
      preset: 'amber',
      primary_glow: '#fbbf24',
      secondary_glow: '#d97706',
      border_color: '#fde68a',
      hover_border_color: '#f59e0b',
      flare_color: '#fbbf24',
      base_tint: '#fffbeb',
      base_opacity: 0.82,
      hover_opacity: 0.28,
      text_accent: '#b45309',
      glow_intensity: 24,
      blur_radius: 20,
      border_width: 1,
    },
  },
  {
    id: 'rose',
    name: 'Crimson Ruby',
    description: 'Chic frosted ruby rose with luminous pink shimmer',
    previewGradient: 'from-rose-400 to-red-600',
    colors: {
      preset: 'rose',
      primary_glow: '#fb7185',
      secondary_glow: '#e11d48',
      border_color: '#fecdd3',
      hover_border_color: '#f43f5e',
      flare_color: '#fb7185',
      base_tint: '#fff1f2',
      base_opacity: 0.82,
      hover_opacity: 0.28,
      text_accent: '#be123c',
      glow_intensity: 24,
      blur_radius: 20,
      border_width: 1,
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'High-tech cyan-magenta dual neon aura',
    previewGradient: 'from-cyan-400 via-fuchsia-500 to-pink-600',
    colors: {
      preset: 'cyberpunk',
      primary_glow: '#22d3ee',
      secondary_glow: '#d946ef',
      border_color: '#a5f3fc',
      hover_border_color: '#06b6d4',
      flare_color: '#22d3ee',
      base_tint: '#ecfeff',
      base_opacity: 0.82,
      hover_opacity: 0.32,
      text_accent: '#0891b2',
      glow_intensity: 28,
      blur_radius: 22,
      border_width: 1.5,
    },
  },
  {
    id: 'dark_onyx',
    name: 'Onyx Midnight',
    description: 'Deep smoked black glass with crisp arctic cyan bevels',
    previewGradient: 'from-slate-700 via-slate-800 to-cyan-700',
    colors: {
      preset: 'dark_onyx',
      primary_glow: '#38bdf8',
      secondary_glow: '#1e293b',
      border_color: '#475569',
      hover_border_color: '#64748b',
      flare_color: '#38bdf8',
      base_tint: '#0f172a',
      base_opacity: 0.85,
      hover_opacity: 0.35,
      text_accent: '#38bdf8',
      glow_intensity: 26,
      blur_radius: 22,
      border_width: 1,
    },
  },
  {
    id: 'crystal',
    name: 'Ice Crystal Silver',
    description: 'Ultra-pure white diamond frost with silver sheen',
    previewGradient: 'from-slate-200 via-white to-slate-400',
    colors: {
      preset: 'crystal',
      primary_glow: '#94a3b8',
      secondary_glow: '#475569',
      border_color: '#e2e8f0',
      hover_border_color: '#94a3b8',
      flare_color: '#ffffff',
      base_tint: '#ffffff',
      base_opacity: 0.88,
      hover_opacity: 0.22,
      text_accent: '#334155',
      glow_intensity: 20,
      blur_radius: 18,
      border_width: 1,
    },
  },
];

export interface ThemeSettings {
  id?: number;
  active_theme: 'theme1' | 'theme2';
  service_cards_animation: ServiceCardsAnimationType;
  service_cards_duration: number; // in milliseconds (e.g. 1000)
  service_cards_stagger: number; // in milliseconds per card (e.g. 120)
  dashboard_card_design: DashboardCardDesignType;
  glass_theme_colors?: GlassThemeColors;
  theme1_data: Theme1Data;
  theme2_data: Theme2Data;
  updated_at?: string;
}

export const DEFAULT_THEME1_DATA: Theme1Data = {
  eyebrow: 'SMART FINANCIAL & CORPORATE ACCOUNTING SUITE',
  title_line1: 'Corporate Accounting &',
  title_line2: 'Financial Ledger',
  subtitle: 'Real-time ledger reconciliation, multi-entity bookkeeping, audit compliance, and revenue analytics in one unified portal.',
  primary_btn_text: 'Explore Accounts',
  primary_btn_link: '/login',
  secondary_btn_text: 'Financial Reports',
  secondary_btn_link: '#information',
  laptop_badge_text: 'Live Financial Core',
  metric_percentage: '+32.5%',
  metric_label: 'Profit Increase',
};

export const DEFAULT_THEME2_DATA: Theme2Data = {
  title_line1: 'Save 60% on',
  title_line2: 'AutoCount Cloud Accounting',
  subtitle: 'Access your accounting anytime, anywhere with built-in LHDN e-Invoice compliance.',
  price_prefix: 'For 1 Year from just',
  price_amount: 'RM28',
  price_suffix: '/month*',
  disclaimer: 'Limited-time offer. T&C apply.',
  btn_text: 'Get Free Trial',
  btn_link: '/login',
  badge1_text: 'Access to sales & profit reports anytime, anywhere',
  badge2_text: 'LHDN e-Invoice Ready',
  badge3_text: 'Instantly scan & record documents with AI SmartScan',
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  active_theme: 'theme2',
  service_cards_animation: 'from-bottom',
  service_cards_duration: 1000,
  service_cards_stagger: 120,
  dashboard_card_design: 'default',
  glass_theme_colors: DEFAULT_GLASS_THEME_COLORS,
  theme1_data: DEFAULT_THEME1_DATA,
  theme2_data: DEFAULT_THEME2_DATA,
};

const STORAGE_KEY = 'agency_theme_settings_cache';
const THEME_CHANGE_EVENT = 'agency_theme_settings_changed';

/**
 * Get current theme settings from localStorage (synchronous)
 */
export function getStoredThemeSettings(): ThemeSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_THEME_SETTINGS,
        ...parsed,
        service_cards_animation: parsed.service_cards_animation || 'from-bottom',
        service_cards_duration:
          typeof parsed.service_cards_duration === 'number'
            ? parsed.service_cards_duration
            : 1000,
        service_cards_stagger:
          typeof parsed.service_cards_stagger === 'number'
            ? parsed.service_cards_stagger
            : 120,
        dashboard_card_design: parsed.dashboard_card_design || 'default',
        glass_theme_colors: {
          ...DEFAULT_GLASS_THEME_COLORS,
          ...(parsed.glass_theme_colors || {}),
          schedule: {
            ...DEFAULT_GLASS_SCHEDULE,
            ...(parsed.glass_theme_colors?.schedule || {}),
            day_mapping: {
              ...DEFAULT_GLASS_SCHEDULE.day_mapping,
              ...(parsed.glass_theme_colors?.schedule?.day_mapping || {}),
            },
            rotation_steps:
              parsed.glass_theme_colors?.schedule?.rotation_steps &&
              parsed.glass_theme_colors.schedule.rotation_steps.length > 0
                ? parsed.glass_theme_colors.schedule.rotation_steps
                : DEFAULT_GLASS_SCHEDULE.rotation_steps,
          },
        },
        theme1_data: {
          ...DEFAULT_THEME1_DATA,
          ...(parsed.theme1_data || {}),
        },
        theme2_data: {
          ...DEFAULT_THEME2_DATA,
          ...(parsed.theme2_data || {}),
        },
      };
    }
  } catch (err) {
    console.error('Error reading theme settings from storage:', err);
  }
  return DEFAULT_THEME_SETTINGS;
}

/**
 * Save theme settings to localStorage and trigger custom event
 */
export function saveThemeSettingsToLocal(settings: ThemeSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: settings }));
  } catch (err) {
    console.error('Error saving theme settings to storage:', err);
  }
}

/**
 * Fetch theme settings from backend API
 */
export async function fetchThemeSettings(): Promise<ThemeSettings> {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
  try {
    const res = await fetch(`${apiBase}/theme-settings`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.active_theme) {
        const fullSettings: ThemeSettings = {
          id: data.id,
          active_theme: data.active_theme || 'theme2',
          service_cards_animation: data.service_cards_animation || 'from-bottom',
          service_cards_duration:
            typeof data.service_cards_duration === 'number'
              ? data.service_cards_duration
              : 1000,
          service_cards_stagger:
            typeof data.service_cards_stagger === 'number'
              ? data.service_cards_stagger
              : 120,
          dashboard_card_design: data.dashboard_card_design || 'default',
          glass_theme_colors: (() => {
            const parsedColors = typeof data.glass_theme_colors === 'string'
              ? JSON.parse(data.glass_theme_colors)
              : data.glass_theme_colors || {};
            return {
              ...DEFAULT_GLASS_THEME_COLORS,
              ...parsedColors,
              schedule: {
                ...DEFAULT_GLASS_SCHEDULE,
                ...(parsedColors.schedule || {}),
                day_mapping: {
                  ...DEFAULT_GLASS_SCHEDULE.day_mapping,
                  ...(parsedColors.schedule?.day_mapping || {}),
                },
                rotation_steps:
                  parsedColors.schedule?.rotation_steps &&
                  parsedColors.schedule.rotation_steps.length > 0
                    ? parsedColors.schedule.rotation_steps
                    : DEFAULT_GLASS_SCHEDULE.rotation_steps,
              },
            };
          })(),
          theme1_data: {
            ...DEFAULT_THEME1_DATA,
            ...(typeof data.theme1_data === 'string'
              ? JSON.parse(data.theme1_data)
              : data.theme1_data || {}),
          },
          theme2_data: {
            ...DEFAULT_THEME2_DATA,
            ...(typeof data.theme2_data === 'string'
              ? JSON.parse(data.theme2_data)
              : data.theme2_data || {}),
          },
          updated_at: data.updated_at,
        };
        saveThemeSettingsToLocal(fullSettings);
        return fullSettings;
      }
    }
  } catch (err) {
    console.warn('Backend theme settings not reachable, falling back to storage:', err);
  }
  return getStoredThemeSettings();
}

/**
 * Save theme settings to backend API
 */
export async function saveThemeSettingsToBackend(
  data: Partial<ThemeSettings>
): Promise<ThemeSettings> {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
  const res = await fetch(`${apiBase}/theme-settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update theme settings');
  }

  const result = await res.json();
  const rawUpdated = result.theme_settings || result;
  const updated: ThemeSettings = {
    id: rawUpdated.id,
    active_theme: rawUpdated.active_theme || 'theme2',
    service_cards_animation: rawUpdated.service_cards_animation || 'from-bottom',
    service_cards_duration:
      typeof rawUpdated.service_cards_duration === 'number'
        ? rawUpdated.service_cards_duration
        : 1000,
    service_cards_stagger:
      typeof rawUpdated.service_cards_stagger === 'number'
        ? rawUpdated.service_cards_stagger
        : 120,
    dashboard_card_design: rawUpdated.dashboard_card_design || 'default',
    glass_theme_colors: (() => {
      const parsedColors = typeof rawUpdated.glass_theme_colors === 'string'
        ? JSON.parse(rawUpdated.glass_theme_colors)
        : rawUpdated.glass_theme_colors || {};
      return {
        ...DEFAULT_GLASS_THEME_COLORS,
        ...parsedColors,
        schedule: {
          ...DEFAULT_GLASS_SCHEDULE,
          ...(parsedColors.schedule || {}),
          day_mapping: {
            ...DEFAULT_GLASS_SCHEDULE.day_mapping,
            ...(parsedColors.schedule?.day_mapping || {}),
          },
          rotation_steps:
            parsedColors.schedule?.rotation_steps &&
            parsedColors.schedule.rotation_steps.length > 0
              ? parsedColors.schedule.rotation_steps
              : DEFAULT_GLASS_SCHEDULE.rotation_steps,
        },
      };
    })(),
    theme1_data: {
      ...DEFAULT_THEME1_DATA,
      ...(typeof rawUpdated.theme1_data === 'string'
        ? JSON.parse(rawUpdated.theme1_data)
        : rawUpdated.theme1_data || {}),
    },
    theme2_data: {
      ...DEFAULT_THEME2_DATA,
      ...(typeof rawUpdated.theme2_data === 'string'
        ? JSON.parse(rawUpdated.theme2_data)
        : rawUpdated.theme2_data || {}),
    },
    updated_at: rawUpdated.updated_at,
  };

  saveThemeSettingsToLocal(updated);
  return updated;
}

/**
 * Subscribe to theme settings changes across components & tabs
 */
export function subscribeToThemeChanges(
  callback: (settings: ThemeSettings) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: any) => {
    if (e.detail) callback(e.detail);
    else callback(getStoredThemeSettings());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getStoredThemeSettings());
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Helper to get CSS animation class based on service card animation setting
 */
export function getServiceCardAnimationClass(
  animationType: ServiceCardsAnimationType = 'from-bottom',
  cardIndex: number = 0
): string {
  if (animationType === 'random') {
    const directions = [
      'anim-card-from-left',
      'anim-card-from-bottom',
      'anim-card-from-right',
      'anim-card-from-top',
    ];
    return directions[cardIndex % directions.length];
  }

  switch (animationType) {
    case 'from-left':
      return 'anim-card-from-left';
    case 'from-right':
      return 'anim-card-from-right';
    case 'from-top':
      return 'anim-card-from-top';
    case 'from-bottom':
    default:
      return 'anim-card-from-bottom';
  }
}

/**
 * Helper to generate dynamic inline style for animation speed and stagger delay
 */
export function getServiceCardAnimationStyle(
  cardIndex: number = 0,
  duration: number = 1000,
  stagger: number = 120
): React.CSSProperties {
  return {
    animationDuration: `${Math.max(200, duration)}ms`,
    animationDelay: `${cardIndex * Math.max(10, stagger)}ms`,
  };
}

/**
 * Helper to get CSS classes for dashboard cards based on active theme
 */
export function getDashboardCardClasses(
  cardDesign: DashboardCardDesignType = 'default',
  options: {
    isSpecial?: boolean;
    clickable?: boolean;
    className?: string;
  } = {}
): string {
  const { isSpecial = false, clickable = false, className = '' } = options;

  if (cardDesign === 'glassmorphism') {
    return `dashboard-card-glass rounded-2xl p-5 transition-all flex flex-col justify-between group min-h-[120px] relative overflow-hidden ${
      clickable ? 'cursor-pointer active:scale-[0.99]' : ''
    } ${
      isSpecial
        ? 'ring-1 ring-sky-300/50'
        : ''
    } ${className}`.trim();
  }

  // Default Classic Card Design
  return `bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group min-h-[120px] ${
    clickable ? 'cursor-pointer active:scale-[0.99]' : ''
  } ${
    isSpecial
      ? 'border-emerald-300 ring-1 ring-emerald-200/80 bg-gradient-to-br from-emerald-50/30 via-white to-emerald-50/10 hover:border-emerald-400'
      : 'border-slate-200 hover:border-blue-400'
  } ${className}`.trim();
}

/**
 * React Hook to subscribe to active dashboard card design
 */
export function useDashboardCardDesign(): DashboardCardDesignType {
  const [design, setDesign] = useState<DashboardCardDesignType>(() => {
    return getStoredThemeSettings().dashboard_card_design || 'default';
  });

  useEffect(() => {
    const initial = getStoredThemeSettings().dashboard_card_design;
    if (initial) setDesign(initial);

    fetchThemeSettings()
      .then((s) => {
        if (s.dashboard_card_design) setDesign(s.dashboard_card_design);
      })
      .catch(() => {});

    const unsub = subscribeToThemeChanges((settings) => {
      if (settings.dashboard_card_design) {
        setDesign(settings.dashboard_card_design);
      }
    });

    return unsub;
  }, []);

  return design;
}

/**
 * Convert hex color string to rgba format with specified alpha
 */
export function hexToRgba(hex?: string, alpha: number = 1): string {
  if (!hex || typeof hex !== 'string') return `rgba(56, 189, 248, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return `rgba(56, 189, 248, ${alpha})`;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(56, 189, 248, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calculate the active scheduled preset based on schedule configuration and current date
 */
export function getActiveScheduledGlassPreset(
  schedule?: GlassScheduleSettings,
  targetDate: Date = new Date()
): {
  presetId: string;
  description: string;
  nextChangeDays: number;
  currentStepLabel?: string;
  cycleInfo?: string;
} {
  if (!schedule || !schedule.enabled) {
    return { presetId: 'akashi', description: 'Schedule disabled', nextChangeDays: 0 };
  }

  // 1. Day of Week Mode (Sunday to Saturday)
  if (schedule.mode === 'day_of_week') {
    const dayNames = [
      'Sunday (রবিবার)',
      'Monday (সোমবার)',
      'Tuesday (মঙ্গলবার)',
      'Wednesday (বুধবার)',
      'Thursday (বৃহস্পতিবার)',
      'Friday (শুক্রবার)',
      'Saturday (শনিবার)',
    ];
    const day = targetDate.getDay();
    const presetId = schedule.day_mapping?.[day] || 'akashi';
    return {
      presetId,
      description: `Today is ${dayNames[day]} • Auto changes tomorrow at midnight`,
      nextChangeDays: 1,
      currentStepLabel: dayNames[day],
      cycleInfo: '7-Day Weekly Schedule',
    };
  }

  // Calculate elapsed calendar days from anchor start_date
  const anchorStr = schedule.start_date || '2026-11-04';
  const [startY, startM, startD] = anchorStr.split('-').map(Number);
  const startMs = Date.UTC(startY, (startM || 1) - 1, startD || 1);
  const targetMs = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.max(0, Math.floor((targetMs - startMs) / (1000 * 60 * 60 * 24)));

  // 2. Fixed Interval Mode (e.g. every 2 days or every 3 days)
  if (schedule.mode === 'interval') {
    const interval = Math.max(1, schedule.interval_days || 2);
    const presets =
      schedule.interval_presets && schedule.interval_presets.length > 0
        ? schedule.interval_presets
        : ['akashi', 'emerald', 'sapphire', 'violet', 'amber'];
    const cycleNum = Math.floor(diffDays / interval);
    const presetId = presets[cycleNum % presets.length] || 'akashi';
    const dayInInterval = (diffDays % interval) + 1;
    const nextChangeDays = interval - (diffDays % interval);

    return {
      presetId,
      description: `Every ${interval} Days Rotation (Day ${dayInInterval} of ${interval}) • Changes in ${nextChangeDays} day(s)`,
      nextChangeDays,
      currentStepLabel: `Day ${dayInInterval} / ${interval}`,
      cycleInfo: `Every ${interval} Days (${presets.length} Themes in cycle)`,
    };
  }

  // 3. Step Rotation Mode (e.g. 2 days Theme A, 3 days Theme B, 2 days Theme C)
  if (schedule.mode === 'step_rotation') {
    const steps =
      schedule.rotation_steps && schedule.rotation_steps.length > 0
        ? schedule.rotation_steps
        : [
            { id: 'step-1', preset_id: 'akashi', duration_days: 2, label: 'Theme 1 (2 Days)' },
            { id: 'step-2', preset_id: 'emerald', duration_days: 3, label: 'Theme 2 (3 Days)' },
          ];
    const totalCycle = Math.max(1, steps.reduce((acc, s) => acc + Math.max(1, s.duration_days), 0));
    const dayInCycle = diffDays % totalCycle;

    let accumulated = 0;
    let activeStep = steps[0];
    let nextChangeDays = 1;
    let stepIndex = 0;
    let dayInStep = 1;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepDuration = Math.max(1, step.duration_days);
      if (dayInCycle < accumulated + stepDuration) {
        activeStep = step;
        stepIndex = i;
        dayInStep = dayInCycle - accumulated + 1;
        nextChangeDays = accumulated + stepDuration - dayInCycle;
        break;
      }
      accumulated += stepDuration;
    }

    return {
      presetId: activeStep.preset_id || 'akashi',
      description: `Stage ${stepIndex + 1}: ${activeStep.label || activeStep.preset_id} (Day ${dayInStep} of ${activeStep.duration_days}) • Changes in ${nextChangeDays} day(s)`,
      nextChangeDays,
      currentStepLabel: activeStep.label || `Stage ${stepIndex + 1} (${activeStep.duration_days}d)`,
      cycleInfo: `Full Cycle: ${totalCycle} Days (${steps.length} Stages)`,
    };
  }

  return { presetId: 'akashi', description: 'Default schedule', nextChangeDays: 0 };
}

/**
 * Resolve effective glass theme colors considering active schedule
 */
export function resolveEffectiveGlassColors(
  colors?: Partial<GlassThemeColors>,
  targetDate: Date = new Date()
): GlassThemeColors {
  const merged: GlassThemeColors = { ...DEFAULT_GLASS_THEME_COLORS, ...(colors || {}) };
  if (!merged.schedule || !merged.schedule.enabled) {
    return merged;
  }

  const { presetId } = getActiveScheduledGlassPreset(merged.schedule, targetDate);
  const foundPreset = GLASS_COLOR_PRESETS.find((p) => p.id === presetId);
  if (!foundPreset) {
    return merged;
  }

  return {
    ...merged,
    ...foundPreset.colors,
    preset: presetId,
    // Preserve custom opacity, blur, and border width settings
    base_opacity: merged.base_opacity,
    hover_opacity: merged.hover_opacity,
    blur_radius: merged.blur_radius,
    border_width: merged.border_width,
    glow_intensity: merged.glow_intensity,
    schedule: merged.schedule,
  };
}

/**
 * Generate CSS variable key-values map from glass theme colors
 */
export function getGlassThemeCssVars(
  colors?: Partial<GlassThemeColors>,
  targetDate?: Date
): Record<string, string> {
  const c = resolveEffectiveGlassColors(colors, targetDate || new Date());
  const primary = c.primary_glow || '#38bdf8';
  const secondary = c.secondary_glow || '#0ea5e9';
  const border = c.border_color || '#bae6fd';
  const hoverBorder = c.hover_border_color || primary;
  const flare = c.flare_color || primary;
  const baseTint = c.base_tint || '#f0f9ff';
  const baseOp = typeof c.base_opacity === 'number' ? c.base_opacity : 0.82;
  const hoverOp = typeof c.hover_opacity === 'number' ? c.hover_opacity : 0.28;
  const textAccent = c.text_accent || '#0284c7';
  const blur = typeof c.blur_radius === 'number' ? c.blur_radius : 20;
  const borderWidth = typeof c.border_width === 'number' ? c.border_width : 1;

  return {
    '--glass-base-bg': hexToRgba('#ffffff', baseOp),
    '--glass-base-tint': hexToRgba(baseTint, Math.max(0.18, baseOp - 0.24)),
    '--glass-border-color': hexToRgba(border, 0.75),
    '--glass-border-inner': hexToRgba(border, 0.35),
    '--glass-border-width': `${borderWidth}px`,
    '--glass-blur': `${blur}px`,
    '--glass-flare-1': hexToRgba(border, 0.95),
    '--glass-flare-2': hexToRgba(flare, 0.6),
    '--glass-flare-glow': hexToRgba(flare, 0.5),
    '--glass-flare-glow-hover': hexToRgba(flare, 0.65),
    '--glass-hover-border': hexToRgba(hoverBorder, 0.8),
    '--glass-hover-bg-1': hexToRgba(primary, Math.min(0.55, hoverOp + 0.05)),
    '--glass-hover-bg-2': hexToRgba(secondary, hoverOp),
    '--glass-hover-bg-3': hexToRgba(primary, hoverOp),
    '--glass-hover-blur': `${blur + 4}px`,
    '--glass-hover-shadow-1': hexToRgba(secondary, 0.25),
    '--glass-hover-shadow-2': hexToRgba(primary, 0.25),
    '--glass-hover-inner': hexToRgba(primary, 0.18),
    '--glass-text-accent': textAccent,
  };
}

/**
 * Apply glass theme colors directly to document.documentElement CSS variables
 */
export function applyGlassThemeColors(
  colors?: Partial<GlassThemeColors>,
  targetDate?: Date
): void {
  if (typeof document === 'undefined') return;
  const vars = getGlassThemeCssVars(colors, targetDate);
  const root = document.documentElement;
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
}

/**
 * React Hook to subscribe to active glass theme colors
 */
export function useGlassThemeColors(): GlassThemeColors {
  const [colors, setColors] = useState<GlassThemeColors>(() => {
    return getStoredThemeSettings().glass_theme_colors || DEFAULT_GLASS_THEME_COLORS;
  });

  useEffect(() => {
    const initial = getStoredThemeSettings().glass_theme_colors;
    if (initial) {
      setColors(initial);
      applyGlassThemeColors(initial);
    }

    fetchThemeSettings()
      .then((s) => {
        if (s.glass_theme_colors) {
          setColors(s.glass_theme_colors);
          applyGlassThemeColors(s.glass_theme_colors);
        }
      })
      .catch(() => {});

    const unsub = subscribeToThemeChanges((settings) => {
      if (settings.glass_theme_colors) {
        setColors(settings.glass_theme_colors);
        applyGlassThemeColors(settings.glass_theme_colors);
      }
    });

    return unsub;
  }, []);

  return colors;
}
