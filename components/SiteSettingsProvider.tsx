'use client';

import { useEffect } from 'react';
import {
  fetchSiteSettings,
  getStoredSettings,
  applySiteFavicon,
  subscribeToSettingsChanges,
} from '@/lib/settingsStorage';

export default function SiteSettingsProvider() {
  useEffect(() => {
    const initial = getStoredSettings();
    applySiteFavicon(initial.site_favicon);
    if (initial.site_name && typeof document !== 'undefined') {
      document.title = initial.site_name;
    }

    fetchSiteSettings()
      .then((data) => {
        applySiteFavicon(data.site_favicon);
        if (data.site_name && typeof document !== 'undefined') {
          document.title = data.site_name;
        }
      })
      .catch(() => {});

    const unsub = subscribeToSettingsChanges((newSettings) => {
      applySiteFavicon(newSettings.site_favicon);
      if (newSettings.site_name && typeof document !== 'undefined') {
        document.title = newSettings.site_name;
      }
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
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
    };
  }, []);

  return null;
}
