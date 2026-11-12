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

