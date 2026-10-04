'use client';

export interface SiteSettings {
  id?: number;
  site_name: string;
  site_tagline?: string;
  site_logo: string;
  site_favicon: string;
  sidebar_bg_color?: string;
  sidebar_text_color?: string;
  sidebar_active_bg_color?: string;
  sidebar_active_text_color?: string;
  sidebar_border_color?: string;
  updated_at?: string;
}

export const DEFAULT_SIDEBAR_STYLING = {
  sidebar_bg_color: '#ffffff',
  sidebar_text_color: '#334155',
  sidebar_active_bg_color: '#eff6ff',
  sidebar_active_text_color: '#0b4da2',
  sidebar_border_color: '#e2e8f0',
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: 'Foreign Workers & Employer Services',
  site_tagline: 'Official Digital Portal',
  site_logo: '/images/agency-logo.jpg',
  site_favicon: '/favicon.ico',
  ...DEFAULT_SIDEBAR_STYLING,
};

const STORAGE_KEY = 'agency_site_settings_cache';
const SETTINGS_EVENT = 'agency_site_settings_changed';

/**
 * Get current settings from localStorage cache (sync)
 */
export function getStoredSettings(): SiteSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SITE_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const logo =
        !parsed.site_logo || parsed.site_logo === '/images/malaysia-crest.svg'
          ? DEFAULT_SITE_SETTINGS.site_logo
          : parsed.site_logo;

      return {
        ...DEFAULT_SITE_SETTINGS,
        ...parsed,
        site_logo: logo,
        sidebar_bg_color: parsed.sidebar_bg_color || DEFAULT_SIDEBAR_STYLING.sidebar_bg_color,
        sidebar_text_color: parsed.sidebar_text_color || DEFAULT_SIDEBAR_STYLING.sidebar_text_color,
        sidebar_active_bg_color: parsed.sidebar_active_bg_color || DEFAULT_SIDEBAR_STYLING.sidebar_active_bg_color,
        sidebar_active_text_color: parsed.sidebar_active_text_color || DEFAULT_SIDEBAR_STYLING.sidebar_active_text_color,
        sidebar_border_color: parsed.sidebar_border_color || DEFAULT_SIDEBAR_STYLING.sidebar_border_color,
      };
    }
  } catch (err) {
    console.error('Error reading site settings from storage', err);
  }
  return DEFAULT_SITE_SETTINGS;
}

/**
 * Apply sidebar styling CSS custom properties to document root
 */
export function applySidebarStyling(settings?: SiteSettings | Partial<typeof DEFAULT_SIDEBAR_STYLING>) {
  if (typeof window === 'undefined') return;
  try {
    const root = document.documentElement;
    const bg = settings?.sidebar_bg_color || DEFAULT_SIDEBAR_STYLING.sidebar_bg_color;
    const text = settings?.sidebar_text_color || DEFAULT_SIDEBAR_STYLING.sidebar_text_color;
    const activeBg = settings?.sidebar_active_bg_color || DEFAULT_SIDEBAR_STYLING.sidebar_active_bg_color;
    const activeText = settings?.sidebar_active_text_color || DEFAULT_SIDEBAR_STYLING.sidebar_active_text_color;
    const border = settings?.sidebar_border_color || DEFAULT_SIDEBAR_STYLING.sidebar_border_color;

    root.style.setProperty('--admin-sidebar-bg', bg);
    root.style.setProperty('--admin-sidebar-text', text);
    root.style.setProperty('--admin-sidebar-active-bg', activeBg);
    root.style.setProperty('--admin-sidebar-active-text', activeText);
    root.style.setProperty('--admin-sidebar-border', border);
  } catch (err) {
    console.error('Failed to apply sidebar styling to root', err);
  }
}

/**
 * Check if a hex color is perceptually dark
 */
export function isColorDark(hexColor?: string): boolean {
  if (!hexColor) return false;
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

/**
 * Save settings to localStorage and notify listeners
 */
export function saveSettingsToLocal(settings: SiteSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
    applySiteFavicon(settings.site_favicon);
    applySidebarStyling(settings);
  } catch (err) {
    console.error('Error saving site settings to storage', err);
  }
}

/**
 * Fetch settings from Laravel backend API
 */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
  try {
    const res = await fetch(`${apiBase}/settings`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.site_name) {
        saveSettingsToLocal(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend settings not reachable, falling back to local:', err);
  }
  return getStoredSettings();
}

/**
 * Update settings on backend API
 */
export async function saveSiteSettingsToBackend(
  data: FormData | Partial<SiteSettings>
): Promise<SiteSettings> {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  let res: Response;
  if (data instanceof FormData) {
    res = await fetch(`${apiBase}/settings`, {
      method: 'POST',
      body: data,
    });
  } else {
    res = await fetch(`${apiBase}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update site settings');
  }

  const result = await res.json();
  const updated = result.settings || result;
  saveSettingsToLocal(updated);
  return updated;
}

/**
 * Dynamically update the website favicon in document head
 */
export function applySiteFavicon(faviconUrl?: string) {
  if (typeof window === 'undefined' || !faviconUrl) return;
  try {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = faviconUrl;
  } catch (err) {
    console.error('Failed to update favicon', err);
  }
}

/**
 * Listen for settings updates across components
 */
export function subscribeToSettingsChanges(callback: (settings: SiteSettings) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: any) => {
    if (e.detail) callback(e.detail);
    else callback(getStoredSettings());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getStoredSettings());
    }
  };

  window.addEventListener(SETTINGS_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(SETTINGS_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}
