'use client';

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

export interface ThemeSettings {
  id?: number;
  active_theme: 'theme1' | 'theme2';
  service_cards_animation: ServiceCardsAnimationType;
  service_cards_duration: number; // in milliseconds (e.g. 1000)
  service_cards_stagger: number; // in milliseconds per card (e.g. 120)
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
