'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe2,
  Image as ImageIcon,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
  getStoredSettings,
  fetchSiteSettings,
  saveSiteSettingsToBackend,
  applySiteFavicon,
} from '@/lib/settingsStorage';
import { resolveFileUrl } from '@/lib/companies';

const LOGO_PRESETS = [
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

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [siteName, setSiteName] = useState('');
  const [siteTagline, setSiteTagline] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [siteFavicon, setSiteFavicon] = useState('');

  // File upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // Save Settings
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

      // If user uploaded a new logo or favicon file, send via FormData
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

        savedResult = await saveSiteSettingsToBackend(formData);
      } else {
        // Send JSON payload
        savedResult = await saveSiteSettingsToBackend({
          site_name: siteName.trim(),
          site_tagline: siteTagline.trim() || undefined,
          site_logo: siteLogo,
          site_favicon: siteFavicon,
        });
      }

      populateForm(savedResult);
      applySiteFavicon(savedResult.site_favicon);
      setLogoFile(null);
      setFaviconFile(null);

      showToast('success', 'General settings saved successfully! Navigation logo and favicon updated.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save site settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset website name, logo, and favicon to system defaults?')) {
      populateForm(DEFAULT_SITE_SETTINGS);
      setLogoFile(null);
      setFaviconFile(null);
      showToast('info', 'Loaded default values. Click "Save Settings" to apply.');
    }
  };

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
              <span className="text-xs text-slate-500 font-semibold">Branding &amp; Assets</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
              General Settings &amp; Site Identity
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl m-0">
              Customize the website name, navigation primary logo (displayed on the left side of the top header), and browser tab favicon.
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

        {/* 1. Simulated Browser Tab */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Website Name (Portal Title) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Foreign Workers & Employer Services"
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sub-Title / Tagline (Optional)
              </label>
              <input
                type="text"
                value={siteTagline}
                onChange={(e) => setSiteTagline(e.target.value)}
                placeholder="e.g. Official Digital Portal"
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium outline-none"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: Website Primary Logo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ImageIcon size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 m-0 uppercase tracking-wider">
                Website Logo (Navbar Left Side)
              </h3>
              <p className="text-xs text-slate-400 m-0">
                Upload your organization logo or choose from available system emblems.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Logo Preview Box */}
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/60 text-center">
              <div className="w-full max-w-[340px] h-32 rounded-2xl bg-white border border-slate-200 p-3 flex items-center justify-center shadow-xs mb-3 overflow-hidden">
                <img
                  src={resolveFileUrl(logoPreview) || '/images/malaysia-crest.svg'}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/malaysia-crest.svg';
                  }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700">Current Logo</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Displays wide and prominent on top navigation</span>
            </div>

            {/* Upload & URL Controls */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Upload New Logo File
                </label>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>Choose Logo Image</span>
                  </button>
                  {logoFile && (
                    <span className="text-xs text-emerald-600 font-bold truncate max-w-xs">
                      Selected: {logoFile.name}
                    </span>
                  )}
                </div>
              </div>

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
                  placeholder="/images/malaysia-crest.svg or https://..."
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none"
                />
              </div>

              {/* Preset Logos */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  System Presets:
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
        </div>

        {/* CARD 3: Website Favicon */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Globe2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 m-0 uppercase tracking-wider">
                Browser Favicon (.ico / .svg / .png)
              </h3>
              <p className="text-xs text-slate-400 m-0">
                The small icon shown in browser tabs, bookmarks, and mobile home screens.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Favicon Preview Box */}
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/60 text-center">
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-xs mb-3">
                <img
                  src={faviconPreview || '/favicon.ico'}
                  alt="Favicon"
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/malaysia-crest.svg';
                  }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700">Current Favicon</span>
              <span className="text-[10px] text-slate-400 mt-0.5">32x32 px recommended</span>
            </div>

            {/* Favicon Controls */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Upload New Favicon File
                </label>
                <input
                  type="file"
                  ref={faviconInputRef}
                  onChange={handleFaviconFileChange}
                  accept=".ico,image/png,image/svg+xml"
                  className="hidden"
                />
                <div className="flex items-center gap-3">
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
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between pt-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving Changes...' : 'Save General Settings'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
