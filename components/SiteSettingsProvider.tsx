'use client';

import { useEffect } from 'react';
import {
  fetchSiteSettings,
  getStoredSettings,
  applySiteFavicon,
  subscribeToSettingsChanges,
} from '@/lib/settingsStorage';
import {
  getStoredThemeSettings,
  fetchThemeSettings,
  subscribeToThemeChanges,
  DashboardCardDesignType,
  applyGlassThemeColors,
} from '@/lib/themeSettings';

export default function SiteSettingsProvider() {
  useEffect(() => {
    const applyCardDesignTheme = (design?: DashboardCardDesignType, colors?: any) => {
      if (typeof document === 'undefined') return;
      if (design === 'glassmorphism') {
        document.documentElement.setAttribute('data-card-design', 'glassmorphism');
        document.body.classList.add('card-theme-glass');
      } else {
        document.documentElement.removeAttribute('data-card-design');
        document.body.classList.remove('card-theme-glass');
      }
      applyGlassThemeColors(colors);
    };

    const initial = getStoredSettings();
    applySiteFavicon(initial.site_favicon);
    if (initial.site_name && typeof document !== 'undefined') {
      document.title = initial.site_name;
    }

    // Apply active card theme immediately
    const initialTheme = getStoredThemeSettings();
    applyCardDesignTheme(initialTheme.dashboard_card_design, initialTheme.glass_theme_colors);

    fetchSiteSettings()
      .then((data) => {
        applySiteFavicon(data.site_favicon);
        if (data.site_name && typeof document !== 'undefined') {
          document.title = data.site_name;
        }
      })
      .catch(() => {});

    fetchThemeSettings()
      .then((themeData) => {
        applyCardDesignTheme(themeData.dashboard_card_design, themeData.glass_theme_colors);
      })
      .catch(() => {});

    const unsub = subscribeToSettingsChanges((newSettings) => {
      applySiteFavicon(newSettings.site_favicon);
      if (newSettings.site_name && typeof document !== 'undefined') {
        document.title = newSettings.site_name;
      }
    });

    const unsubTheme = subscribeToThemeChanges((newTheme) => {
      applyCardDesignTheme(newTheme.dashboard_card_design, newTheme.glass_theme_colors);
    });

    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = 'error' in event ? event.error : (event as PromiseRejectionEvent).reason;
      if (
        error &&
        (error.name === 'ChunkLoadError' ||
          (typeof error.message === 'string' &&
            (error.message.includes('Loading chunk') ||
              error.message.includes('Failed to fetch dynamically imported module'))))
      ) {
        const reloadKey = 'chunk_reload_' + (typeof window !== 'undefined' ? window.location.pathname : '');
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleChunkError);

    return () => {
      unsub();
      unsubTheme();
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
    };
  }, []);

  return null;
}
