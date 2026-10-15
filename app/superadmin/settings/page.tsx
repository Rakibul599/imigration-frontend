'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe2,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_SIDEBAR_STYLING,
  getStoredSettings,
  fetchSiteSettings,
  saveSiteSettingsToBackend,
  applySiteFavicon,
  applySidebarStyling,
  isColorDark,
} from '@/lib/settingsStorage';
import { resolveFileUrl } from '@/lib/companies';

const LOGO_PRESETS = [
  { label: 'Agency Logo (Default)', url: '/images/agency-logo.jpg' },
  { label: 'Official Crest', url: '/images/malaysia-crest.svg' },
  { label: 'Agency Emblem', url: '/image.png' },
  { label: 'Work Pass Icon', url: '/images/work-information.svg' },
  { label: 'Document Seal', url: '/images/registration-document.svg' },
];

const FAVICON_PRESETS = [
  { label: 'Standard Favicon', url: '/favicon.ico' },
  { label: 'Official Crest', url: '/images/malaysia-crest.svg' },
  { label: 'Work Pass Badge', url: '/images/work-information.svg' },
  { label: 'Document Icon', url: '/images/registration-document.svg' },
];

const SIDEBAR_PRESETS = [
  {
    name: 'Clean White (Default)',
    bg: '#ffffff',
    text: '#334155',
    activeBg: '#eff6ff',
    activeText: '#0b4da2',
    border: '#e2e8f0',
  },
  {
    name: 'Sleek Dark Slate',
    bg: '#0f172a',
    text: '#94a3b8',
    activeBg: '#1e293b',
    activeText: '#38bdf8',
    border: '#334155',
  },
  {
    name: 'Deep Navy Blue',
    bg: '#0b1f3a',
    text: '#94a3b8',
    activeBg: '#103565',
    activeText: '#ffffff',
    border: '#1e3a60',
  },
  {
    name: 'Modern Midnight',
    bg: '#111827',
    text: '#9ca3af',
    activeBg: '#1f2937',
    activeText: '#60a5fa',
    border: '#374151',
  },
  {
    name: 'Emerald Green',
    bg: '#064e3b',
    text: '#a7f3d0',
    activeBg: '#047857',
    activeText: '#ffffff',
    border: '#065f46',
  },
  {
    name: 'Royal Indigo',
    bg: '#1e1b4b',
    text: '#c7d2fe',
    activeBg: '#312e81',
    activeText: '#ffffff',
    border: '#3730a3',
  },
];

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  // Active Tab: 'general' (Site Identity & Branding) vs 'sidebar' (Admin Sidebar Styling)
  const [activeTab, setActiveTab] = useState<'general' | 'sidebar'>('general');

  // General Settings States
  const [siteName, setSiteName] = useState('');
  const [siteTagline, setSiteTagline] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [siteFavicon, setSiteFavicon] = useState('');

  // File upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>('');

  // Sidebar Styling States
  const [sidebarBgColor, setSidebarBgColor] = useState<string>(DEFAULT_SIDEBAR_STYLING.sidebar_bg_color);
  const [sidebarTextColor, setSidebarTextColor] = useState<string>(DEFAULT_SIDEBAR_STYLING.sidebar_text_color);
  const [sidebarActiveBgColor, setSidebarActiveBgColor] = useState<string>(DEFAULT_SIDEBAR_STYLING.sidebar_active_bg_color);
  const [sidebarActiveTextColor, setSidebarActiveTextColor] = useState<string>(DEFAULT_SIDEBAR_STYLING.sidebar_active_text_color);
  const [sidebarBorderColor, setSidebarBorderColor] = useState<string>(DEFAULT_SIDEBAR_STYLING.sidebar_border_color);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSidebar, setIsSavingSidebar] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Load existing settings
  useEffect(() => {
    setIsLoading(true);
    const initial = getStoredSettings();
    populateForm(initial);

    fetchSiteSettings()
      .then((data) => {
        populateForm(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const populateForm = (data: SiteSettings) => {
    setSettings(data);
    setSiteName(data.site_name || DEFAULT_SITE_SETTINGS.site_name);
    setSiteTagline(data.site_tagline || DEFAULT_SITE_SETTINGS.site_tagline || '');
    setSiteLogo(data.site_logo || DEFAULT_SITE_SETTINGS.site_logo);
    setLogoPreview(data.site_logo || DEFAULT_SITE_SETTINGS.site_logo);
    setSiteFavicon(data.site_favicon || DEFAULT_SITE_SETTINGS.site_favicon);
    setFaviconPreview(data.site_favicon || DEFAULT_SITE_SETTINGS.site_favicon);

    // Sidebar colors
    setSidebarBgColor(data.sidebar_bg_color || DEFAULT_SIDEBAR_STYLING.sidebar_bg_color);
    setSidebarTextColor(data.sidebar_text_color || DEFAULT_SIDEBAR_STYLING.sidebar_text_color);
    setSidebarActiveBgColor(data.sidebar_active_bg_color || DEFAULT_SIDEBAR_STYLING.sidebar_active_bg_color);
    setSidebarActiveTextColor(data.sidebar_active_text_color || DEFAULT_SIDEBAR_STYLING.sidebar_active_text_color);
    setSidebarBorderColor(data.sidebar_border_color || DEFAULT_SIDEBAR_STYLING.sidebar_border_color);
  };

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Handle Logo file select
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.endsWith('.svg') && !file.name.endsWith('.ico')) {
      showToast('error', 'Please upload a valid image file (PNG, SVG, JPG, WEBP).');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLogoPreview(dataUrl);
      setSiteLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle Favicon file select
  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaviconFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFaviconPreview(dataUrl);
      setSiteFavicon(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Select Preset Logo
  const handleSelectLogoPreset = (url: string) => {
    setLogoFile(null);
    setSiteLogo(url);
    setLogoPreview(url);
  };

  // Select Preset Favicon
  const handleSelectFaviconPreset = (url: string) => {
    setFaviconFile(null);
    setSiteFavicon(url);
    setFaviconPreview(url);
  };

  // Apply Sidebar Preset
  const handleApplySidebarPreset = (preset: typeof SIDEBAR_PRESETS[0]) => {
    setSidebarBgColor(preset.bg);
    setSidebarTextColor(preset.text);
    setSidebarActiveBgColor(preset.activeBg);
    setSidebarActiveTextColor(preset.activeText);
    setSidebarBorderColor(preset.border);
    showToast('info', `Selected "${preset.name}". Click "Save Sidebar Styling" to apply.`);
  };

  // Reset Sidebar to Default
  const handleResetSidebarDefaults = () => {
    setSidebarBgColor(DEFAULT_SIDEBAR_STYLING.sidebar_bg_color);
    setSidebarTextColor(DEFAULT_SIDEBAR_STYLING.sidebar_text_color);
    setSidebarActiveBgColor(DEFAULT_SIDEBAR_STYLING.sidebar_active_bg_color);
    setSidebarActiveTextColor(DEFAULT_SIDEBAR_STYLING.sidebar_active_text_color);
    setSidebarBorderColor(DEFAULT_SIDEBAR_STYLING.sidebar_border_color);
    showToast('info', 'Reset sidebar colors to default. Click "Save Sidebar Styling" to apply.');
  };

  // Save General Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      showToast('error', 'Website name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setNotification(null);

    try {
      let savedResult: SiteSettings;

      if (logoFile || faviconFile) {
        const formData = new FormData();
        formData.append('site_name', siteName.trim());
        if (siteTagline.trim()) formData.append('site_tagline', siteTagline.trim());
        if (logoFile) {
          formData.append('logo_file', logoFile);
        } else if (siteLogo) {
          formData.append('site_logo', siteLogo);
        }

        if (faviconFile) {
          formData.append('favicon_file', faviconFile);
        } else if (siteFavicon) {
          formData.append('site_favicon', siteFavicon);
        }

        // Keep current sidebar styling
        formData.append('sidebar_bg_color', sidebarBgColor);
        formData.append('sidebar_text_color', sidebarTextColor);
        formData.append('sidebar_active_bg_color', sidebarActiveBgColor);
        formData.append('sidebar_active_text_color', sidebarActiveTextColor);
        formData.append('sidebar_border_color', sidebarBorderColor);

        savedResult = await saveSiteSettingsToBackend(formData);
      } else {
        savedResult = await saveSiteSettingsToBackend({
          site_name: siteName.trim(),
          site_tagline: siteTagline.trim() || undefined,
          site_logo: siteLogo,
          site_favicon: siteFavicon,
          sidebar_bg_color: sidebarBgColor,
          sidebar_text_color: sidebarTextColor,
          sidebar_active_bg_color: sidebarActiveBgColor,
          sidebar_active_text_color: sidebarActiveTextColor,
          sidebar_border_color: sidebarBorderColor,
        });
      }

      populateForm(savedResult);
      applySiteFavicon(savedResult.site_favicon);
      applySidebarStyling(savedResult);
      setLogoFile(null);
      setFaviconFile(null);

      showToast('success', 'General settings saved successfully! Navigation logo and favicon updated.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save site settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Sidebar Styling
  const handleSaveSidebarSettings = async () => {
    setIsSavingSidebar(true);
    setNotification(null);

    try {
      const payload: Partial<SiteSettings> = {
        site_name: siteName.trim() || settings.site_name,
        site_tagline: siteTagline.trim() || settings.site_tagline || undefined,
        site_logo: siteLogo || settings.site_logo,
        site_favicon: siteFavicon || settings.site_favicon,
        sidebar_bg_color: sidebarBgColor,
        sidebar_text_color: sidebarTextColor,
        sidebar_active_bg_color: sidebarActiveBgColor,
        sidebar_active_text_color: sidebarActiveTextColor,
        sidebar_border_color: sidebarBorderColor,
      };

      const savedResult = await saveSiteSettingsToBackend(payload);
      populateForm(savedResult);
      applySidebarStyling(savedResult);

      showToast('success', 'Admin sidebar appearance saved successfully! Changes applied immediately.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save sidebar styling.');
    } finally {
      setIsSavingSidebar(false);
    }
  };

  // Reset General Defaults
  const handleResetGeneralDefaults = () => {
    if (confirm('Are you sure you want to reset website name, logo, and favicon to system defaults?')) {
      populateForm(DEFAULT_SITE_SETTINGS);
      setLogoFile(null);
      setFaviconFile(null);
      showToast('info', 'Loaded default values. Click "Save General Settings" to apply.');
    }
  };

  const isDarkPreview = isColorDark(sidebarBgColor);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : notification.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <Info size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                System Customization
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">Console Settings &amp; Appearance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
              General Settings &amp; Console Customizer
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl m-0">
              Configure website branding, logos, browser favicon, and customize the administration console sidebar background and font styling.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all no-underline"
            >
              <ExternalLink size={14} />
              <span>Preview Public Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'border-[#0b4da2] text-[#0b4da2] bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
          }`}
        >
          <Globe2 size={16} />
          <span>Site Identity &amp; Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sidebar')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'sidebar'
              ? 'border-[#0b4da2] text-[#0b4da2] bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
          }`}
        >
          <Palette size={16} />
          <span>Admin Sidebar Styling</span>
          <span className="text-[10px] bg-blue-100 text-[#0b4da2] font-bold px-2 py-0.5 rounded-full">
            Customizer
          </span>
        </button>
      </div>

      {/* TAB 1: SITE IDENTITY & GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* LIVE PREVIEW CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-[#0b4da2]" />
                <h3 className="text-sm font-bold text-slate-900 m-0">
                  Browser Tab &amp; Favicon Preview
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Real-time preview of tab</span>
            </div>

            {/* Simulated Browser Tab */}
            <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 max-w-sm">
              <div className="bg-white px-3 py-1.5 rounded-lg shadow-2xs border border-slate-200 flex items-center gap-2">
                <img
                  src={faviconPreview || '/favicon.ico'}
                  alt="Favicon"
                  className="w-4 h-4 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/malaysia-crest.svg';
                  }}
                />
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {siteName || 'Foreign Workers & Employer Services'}
                </span>
              </div>
            </div>
          </div>

          {/* SETTINGS FORM */}
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* CARD 1: Website Name & Tagline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold">
                  <Globe2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 m-0 uppercase tracking-wider">
                    Website Name &amp; Title
                  </h3>
                  <p className="text-xs text-slate-400 m-0">
                    This appears in page title headers, browser titles, and beside the navbar logo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Website / Portal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Foreign Workers &amp; Employer Services"
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Website Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={siteTagline}
                    onChange={(e) => setSiteTagline(e.target.value)}
                    placeholder="e.g. Official Digital Portal"
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: Primary Logo */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <ImageIcon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 m-0 uppercase tracking-wider">
                    Navigation Primary Logo
                  </h3>
                  <p className="text-xs text-slate-400 m-0">
                    Displayed on the left side of the top navigation bar across all pages.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {/* Live Preview Box */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-32 h-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2 shadow-2xs shrink-0 overflow-hidden">
                    <img
                      src={resolveFileUrl(logoPreview) || '/images/agency-logo.jpg'}
                      alt="Logo Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/agency-logo.jpg';
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      Upload New Logo Image
                    </div>
                    <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
                      Recommended: High resolution PNG, SVG, or WEBP with transparent background (Height: 48px - 80px).
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoFileChange}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>Choose Logo File</span>
                      </button>
                      {logoFile && (
                        <span className="text-xs text-emerald-600 font-bold truncate max-w-xs">
                          Selected: {logoFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct URL input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Or enter Logo Asset URL / Path
                  </label>
                  <input
                    type="text"
                    value={siteLogo}
                    onChange={(e) => {
                      setSiteLogo(e.target.value);
                      setLogoPreview(e.target.value);
                    }}
                    placeholder="/images/agency-logo.jpg or https://..."
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none"
                  />
                </div>

                {/* Preset Logos */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Quick Logo Presets:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {LOGO_PRESETS.map((p) => (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => handleSelectLogoPreset(p.url)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          siteLogo === p.url
                            ? 'bg-blue-50 border-[#0b4da2] text-[#0b4da2] font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <img src={p.url} alt="" className="w-4 h-4 object-contain" />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: Favicon */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 m-0 uppercase tracking-wider">
                    Browser Tab Favicon
                  </h3>
                  <p className="text-xs text-slate-400 m-0">
                    The small icon shown on browser tabs, bookmarks, and shortcuts.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2 shadow-2xs shrink-0 overflow-hidden">
                    <img
                      src={resolveFileUrl(faviconPreview) || '/favicon.ico'}
                      alt="Favicon Preview"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/malaysia-crest.svg';
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      Upload Favicon (.ico, .svg, .png)
                    </div>
                    <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
                      Recommended: Square 32x32px or 64x64px favicon icon or SVG vector format.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="file"
                        ref={faviconInputRef}
                        onChange={handleFaviconFileChange}
                        accept="image/x-icon,image/png,image/svg+xml,image/vnd.microsoft.icon"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>Choose Favicon Image</span>
                      </button>
                      {faviconFile && (
                        <span className="text-xs text-emerald-600 font-bold truncate max-w-xs">
                          Selected: {faviconFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Or enter Favicon Asset URL / Path
                  </label>
                  <input
                    type="text"
                    value={siteFavicon}
                    onChange={(e) => {
                      setSiteFavicon(e.target.value);
                      setFaviconPreview(e.target.value);
                    }}
                    placeholder="/favicon.ico or https://..."
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none"
                  />
                </div>

                {/* Preset Favicons */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Favicon Presets:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {FAVICON_PRESETS.map((p) => (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => handleSelectFaviconPreset(p.url)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          siteFavicon === p.url
                            ? 'bg-purple-50 border-purple-600 text-purple-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <img src={p.url} alt="" className="w-4 h-4 object-contain" />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Bar for General Tab */}
            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={handleResetGeneralDefaults}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Reset to Defaults</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50"
              >
                <Save size={15} />
                <span>{isSaving ? 'Saving Changes...' : 'Save General Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ADMIN SIDEBAR STYLING */}
      {activeTab === 'sidebar' && (
        <div className="space-y-6">
          {/* Header Banner for Sidebar Tab */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Palette size={20} className="text-[#0b4da2]" />
                <h2 className="text-lg font-bold text-slate-900 m-0">
                  Admin Console Sidebar Appearance
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 m-0">
                Customize the sidebar background color, front/text color, active highlight, and border. Changes apply to the admin console navigation drawer.
              </p>
            </div>

            {/* Prominent Reset to Default button */}
            <button
              type="button"
              onClick={handleResetSidebarDefaults}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              title="Restore standard clean white sidebar colors"
            >
              <RotateCcw size={14} className="text-slate-500" />
              <span>Reset to Default</span>
            </button>
          </div>

          {/* Quick Color Presets */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Theme Presets:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {SIDEBAR_PRESETS.map((p) => {
                const isSelected =
                  sidebarBgColor.toLowerCase() === p.bg.toLowerCase() &&
                  sidebarTextColor.toLowerCase() === p.text.toLowerCase();
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplySidebarPreset(p)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0b4da2] ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full mb-2">
                      <div
                        className="w-5 h-5 rounded-md border border-black/10 shrink-0"
                        style={{ backgroundColor: p.bg }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.activeText }}
                      />
                      {isSelected && (
                        <Check size={14} className="text-[#0b4da2] ml-auto shrink-0" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {p.bg}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main 2-Column Section: Color Controls (Left) & Real-time Live Preview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Color Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* 1. Sidebar Background Color */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">
                      Sidebar Background Color
                    </label>
                    <p className="text-[11px] text-slate-500 m-0">
                      The primary background color of the admin sidebar drawer and header.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={sidebarBgColor}
                      onChange={(e) => setSidebarBgColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                      title="Choose sidebar background color"
                    />
                    <input
                      type="text"
                      value={sidebarBgColor}
                      onChange={(e) => setSidebarBgColor(e.target.value)}
                      className="w-24 bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Sidebar Front / Text Color */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">
                      Sidebar Front / Text Color
                    </label>
                    <p className="text-[11px] text-slate-500 m-0">
                      The font color for standard inactive navigation links and icons.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={sidebarTextColor}
                      onChange={(e) => setSidebarTextColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                      title="Choose sidebar font color"
                    />
                    <input
                      type="text"
                      value={sidebarTextColor}
                      onChange={(e) => setSidebarTextColor(e.target.value)}
                      className="w-24 bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Active Menu Item Background */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">
                      Active Link Highlight Background
                    </label>
                    <p className="text-[11px] text-slate-500 m-0">
                      Background highlight tint applied to the currently selected route.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={sidebarActiveBgColor}
                      onChange={(e) => setSidebarActiveBgColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                      title="Choose active link background"
                    />
                    <input
                      type="text"
                      value={sidebarActiveBgColor}
                      onChange={(e) => setSidebarActiveBgColor(e.target.value)}
                      className="w-24 bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Active Menu Item Text & Accent */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">
                      Active Link Text &amp; Accent Color
                    </label>
                    <p className="text-[11px] text-slate-500 m-0">
                      Font and indicator stripe color for the currently active link.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={sidebarActiveTextColor}
                      onChange={(e) => setSidebarActiveTextColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                      title="Choose active link text color"
                    />
                    <input
                      type="text"
                      value={sidebarActiveTextColor}
                      onChange={(e) => setSidebarActiveTextColor(e.target.value)}
                      className="w-24 bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Sidebar Border / Divider Color */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">
                      Sidebar Border &amp; Separator Color
                    </label>
                    <p className="text-[11px] text-slate-500 m-0">
                      Color of the vertical sidebar border line and dividing separators.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={sidebarBorderColor}
                      onChange={(e) => setSidebarBorderColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                      title="Choose border color"
                    />
                    <input
                      type="text"
                      value={sidebarBorderColor}
                      onChange={(e) => setSidebarBorderColor(e.target.value)}
                      className="w-24 bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Live Preview (5 cols) */}
            <div className="lg:col-span-5 sticky top-20">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye size={18} className="text-[#0b4da2]" />
                    <h3 className="text-sm font-bold text-slate-900 m-0">
                      Live Sidebar Preview
                    </h3>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Real-time
                  </span>
                </div>

                {/* Simulated Mini Sidebar Box */}
                <div
                  style={{
                    backgroundColor: sidebarBgColor,
                    borderColor: sidebarBorderColor,
                  }}
                  className="rounded-xl border shadow-md overflow-hidden transition-all duration-300"
                >
                  {/* Top Header Mockup */}
                  <div
                    style={{
                      borderBottomColor: sidebarBorderColor,
                    }}
                    className="p-3.5 border-b flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#0b4da2] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck size={18} className="text-yellow-400" />
                    </div>
                    <div>
                      <div
                        style={{ color: isDarkPreview ? '#f8fafc' : '#0f172a' }}
                        className="text-xs font-bold uppercase tracking-tight leading-tight"
                      >
                        Super Admin
                      </div>
                      <div
                        style={{ color: isDarkPreview ? '#93c5fd' : '#0b4da2' }}
                        className="text-[10px] font-semibold leading-tight"
                      >
                        Control Console
                      </div>
                    </div>
                  </div>

                  {/* Nav Links Mockup */}
                  <div className="p-3 space-y-3">
                    <p
                      style={{
                        color: isDarkPreview ? 'rgba(255,255,255,0.45)' : sidebarTextColor,
                        opacity: isDarkPreview ? 1 : 0.7,
                      }}
                      className="text-[9px] font-bold uppercase tracking-wider px-2 m-0"
                    >
                      Management
                    </p>

                    <div className="space-y-1">
                      {/* Active Item */}
                      <div
                        style={{
                          backgroundColor: sidebarActiveBgColor,
                          color: sidebarActiveTextColor,
                          borderLeftColor: sidebarActiveTextColor,
                        }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold border-l-4 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 size={15} style={{ color: sidebarActiveTextColor }} />
                          <span>Companies Management</span>
                        </div>
                        <span
                          style={{
                            backgroundColor: sidebarActiveTextColor,
                            color: '#ffffff',
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        >
                          12
                        </span>
                      </div>

                      {/* Inactive Item 1 */}
                      <div
                        style={{ color: sidebarTextColor }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium border-l-4 border-transparent hover:opacity-80 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldAlert
                            size={15}
                            style={{ color: sidebarTextColor, opacity: 0.8 }}
                          />
                          <span>Master Admin Permission</span>
                        </div>
                        <span
                          style={{
                            backgroundColor: isDarkPreview ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                            color: sidebarTextColor,
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        >
                          3
                        </span>
                      </div>

                      {/* Inactive Item 2 */}
                      <div
                        style={{ color: sidebarTextColor }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium border-l-4 border-transparent hover:opacity-80 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Users
                            size={15}
                            style={{ color: sidebarTextColor, opacity: 0.8 }}
                          />
                          <span>Employees &amp; Permissions</span>
                        </div>
                      </div>

                      {/* Inactive Item 3 */}
                      <div
                        style={{ color: sidebarTextColor }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium border-l-4 border-transparent hover:opacity-80 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck
                            size={15}
                            style={{ color: sidebarTextColor, opacity: 0.8 }}
                          />
                          <span>Customer Management</span>
                        </div>
                      </div>

                      {/* Inactive Item 4 */}
                      <div
                        style={{ color: sidebarTextColor }}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium border-l-4 border-transparent hover:opacity-80 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles
                            size={15}
                            style={{ color: sidebarTextColor, opacity: 0.8 }}
                          />
                          <span>Service Cards</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Mockup */}
                  <div
                    style={{
                      borderTopColor: sidebarBorderColor,
                    }}
                    className="p-3 border-t"
                  >
                    <div
                      style={{
                        backgroundColor: isDarkPreview ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        borderColor: sidebarBorderColor,
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg border"
                    >
                      <div className="w-6 h-6 rounded-md bg-blue-100 text-[#0b4da2] flex items-center justify-center font-bold text-[10px] shrink-0">
                        SA
                      </div>
                      <div className="truncate">
                        <div
                          style={{ color: isDarkPreview ? '#f8fafc' : '#0f172a' }}
                          className="text-[11px] font-bold leading-tight"
                        >
                          Super Admin
                        </div>
                        <div
                          style={{ color: sidebarTextColor, opacity: 0.7 }}
                          className="text-[9px] leading-tight"
                        >
                          superadmin@admin.com
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 m-0 text-center">
                  This preview renders in real time as you adjust colors or select presets above.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Bar for Sidebar Tab */}
          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={handleResetSidebarDefaults}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset to Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSidebarSettings}
              disabled={isSavingSidebar}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSavingSidebar ? 'Saving Styling...' : 'Save Sidebar Styling'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
