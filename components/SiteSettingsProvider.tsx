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

    return unsub;
  }, []);

  return null;
}
