import HomeClient from '@/components/HomeClient';
import {
  ThemeSettings,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_THEME1_DATA,
  DEFAULT_THEME2_DATA,
} from '@/lib/themeSettings';

// Force dynamic SSR so every page refresh gets the latest active theme directly from database
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getInitialThemeSettings(): Promise<ThemeSettings> {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
  try {
    const res = await fetch(`${apiBase}/theme-settings`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.active_theme) {
        return {
          id: data.id,
          active_theme: data.active_theme,
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
      }
    }
  } catch (err) {
    console.warn('Backend theme settings not reachable during SSR, using default:', err);
  }

  return DEFAULT_THEME_SETTINGS;
}

export default async function Page() {
  const initialTheme = await getInitialThemeSettings();
  return <HomeClient initialTheme={initialTheme} />;
}
