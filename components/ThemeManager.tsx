'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Palette,
  Check,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  ArrowRight,
  TrendingUp,
  Monitor,
  ShieldCheck,
  ScanLine,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Shuffle,
  Play,
  LayoutGrid,
  FileText,
  Briefcase,
  HeartPulse,
  CreditCard,
  Gauge,
  Timer,
  Clock,
} from 'lucide-react';
import {
  ThemeSettings,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_THEME1_DATA,
  DEFAULT_THEME2_DATA,
  ServiceCardsAnimationType,
  getStoredThemeSettings,
  fetchThemeSettings,
  saveThemeSettingsToBackend,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
} from '@/lib/themeSettings';

export default function ThemeManager() {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  
  // Top-level tabs: 'home' for Home page theme, 'service-cards' for Service Cards animation
  const [mainTab, setMainTab] = useState<'home' | 'service-cards'>('home');

  // Sub-tabs for Home Page Theme
  const [selectedHomeTab, setSelectedHomeTab] = useState<'theme2' | 'theme1'>('theme2');

  // Selected Service Cards Animation & Timing
  const [selectedCardAnim, setSelectedCardAnim] = useState<ServiceCardsAnimationType>('from-bottom');
  const [cardDuration, setCardDuration] = useState<number>(1000);
  const [cardStagger, setCardStagger] = useState<number>(120);
  const [demoReplayKey, setDemoReplayKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load cached
    const cached = getStoredThemeSettings();
    setSettings(cached);
    if (cached.active_theme) {
      setSelectedHomeTab(cached.active_theme);
    }
    if (cached.service_cards_animation) {
      setSelectedCardAnim(cached.service_cards_animation);
    }
    if (typeof cached.service_cards_duration === 'number') {
      setCardDuration(cached.service_cards_duration);
    }
    if (typeof cached.service_cards_stagger === 'number') {
      setCardStagger(cached.service_cards_stagger);
    }

    // Fetch from backend
    fetchThemeSettings()
      .then((data) => {
        setSettings(data);
        if (data.active_theme) {
          setSelectedHomeTab(data.active_theme);
        }
        if (data.service_cards_animation) {
          setSelectedCardAnim(data.service_cards_animation);
        }
        if (typeof data.service_cards_duration === 'number') {
          setCardDuration(data.service_cards_duration);
        }
        if (typeof data.service_cards_stagger === 'number') {
          setCardStagger(data.service_cards_stagger);
        }
      })
      .catch((err) => {
        console.error('Failed to load theme settings from backend:', err);
      });
  }, []);

  const handleActiveThemeChange = async (theme: 'theme1' | 'theme2') => {
    const updated: ThemeSettings = {
      ...settings,
      active_theme: theme,
    };
    setSettings(updated);
    setSelectedHomeTab(theme);

    try {
      setSaving(true);
      await saveThemeSettingsToBackend({ active_theme: theme });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch active theme');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleCardAnimationSelect = async (animType: ServiceCardsAnimationType) => {
    setSelectedCardAnim(animType);
    setDemoReplayKey((prev) => prev + 1);

    const updated: ThemeSettings = {
      ...settings,
      service_cards_animation: animType,
    };
    setSettings(updated);

    try {
      setSaving(true);
      await saveThemeSettingsToBackend({ service_cards_animation: animType });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update animation setting');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleCardDurationChange = async (duration: number) => {
    const val = Math.max(200, Math.min(4000, duration));
    setCardDuration(val);
    setDemoReplayKey((prev) => prev + 1);

    const updated: ThemeSettings = {
      ...settings,
      service_cards_duration: val,
    };
    setSettings(updated);

    try {
      await saveThemeSettingsToBackend({ service_cards_duration: val });
    } catch (err) {
      console.warn('Auto-save duration failed:', err);
    }
  };

  const handleCardStaggerChange = async (stagger: number) => {
    const val = Math.max(0, Math.min(1500, stagger));
    setCardStagger(val);
    setDemoReplayKey((prev) => prev + 1);

    const updated: ThemeSettings = {
      ...settings,
      service_cards_stagger: val,
    };
    setSettings(updated);

    try {
      await saveThemeSettingsToBackend({ service_cards_stagger: val });
    } catch (err) {
      console.warn('Auto-save stagger delay failed:', err);
    }
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: Partial<ThemeSettings> = {
        ...settings,
        service_cards_animation: selectedCardAnim,
        service_cards_duration: cardDuration,
        service_cards_stagger: cardStagger,
      };
      const result = await saveThemeSettingsToBackend(payload);
      setSettings(result);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save theme settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all theme texts and timing to original default values?')) {
      const reset = {
        ...settings,
        service_cards_duration: 1000,
        service_cards_stagger: 120,
        theme1_data: { ...DEFAULT_THEME1_DATA },
        theme2_data: { ...DEFAULT_THEME2_DATA },
      };
      setSettings(reset);
      setCardDuration(1000);
      setCardStagger(120);
    }
  };

  const animationOptions = [
    {
      id: 'from-bottom' as ServiceCardsAnimationType,
      title: 'Slide in from Bottom',
      badge: 'Upward Flow',
      desc: 'Cards rise up smoothly from below into the grid.',
      icon: ArrowUp,
      color: 'emerald',
    },
    {
      id: 'from-left' as ServiceCardsAnimationType,
      title: 'Slide in from Left',
      badge: 'Left to Right',
      desc: 'Cards glide in from the left side with staggered delay.',
      icon: ArrowRight,
      color: 'blue',
    },
    {
      id: 'from-right' as ServiceCardsAnimationType,
      title: 'Slide in from Right',
      badge: 'Right to Left',
      desc: 'Cards slide in from the right edge into position.',
      icon: ArrowLeft,
      color: 'indigo',
    },
    {
      id: 'from-top' as ServiceCardsAnimationType,
      title: 'Slide in from Top',
      badge: 'Top Dropdown',
      desc: 'Cards drop down elegantly from the top of the section.',
      icon: ArrowDown,
      color: 'amber',
    },
    {
      id: 'random' as ServiceCardsAnimationType,
      title: 'Random (4 Directions Mix)',
      badge: 'Dynamic 4-Way Shuffle',
      desc: 'Cards enter dynamically from all 4 directions (Left, Right, Bottom, Top) staggered.',
      icon: Shuffle,
      color: 'purple',
    },
  ];

  const demoCards = [
    {
      title: 'Foreign Worker Passports',
      category: 'Immigration & Passes',
      icon: FileText,
      iconBg: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'FOMEMA Medical Screening',
      category: 'Health & Clinic',
      icon: HeartPulse,
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'SOCSO & Insurance Cover',
      category: 'Social Security',
      icon: Briefcase,
      iconBg: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'EPF & Payroll Deductions',
      category: 'Statutory Funds',
      icon: CreditCard,
      iconBg: 'bg-purple-100 text-purple-700',
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Palette size={26} className="text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 m-0">
                  Theme & Presentation Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  Live Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 m-0 mt-1">
                Customize homepage designs and entrance animations for service cards across the portal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={mainTab === 'home' ? '/' : '/services'}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors no-underline"
            >
              <Eye size={15} />
              <span>{mainTab === 'home' ? 'Preview Homepage' : 'Preview Service Cards'}</span>
              <ExternalLink size={13} className="text-slate-400" />
            </Link>

            <button
              onClick={() => handleSaveAll()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083b7e] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer border-0"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {saveSuccess && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-fadeIn">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>Theme settings successfully saved and applied to the portal!</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-semibold">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* TOP NAVIGATION TABS: Home Page Theme vs Service Cards Animation */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-2 gap-2 shadow-xs">
        <button
          type="button"
          onClick={() => setMainTab('home')}
          className={`flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer border-0 ${
            mainTab === 'home'
              ? 'bg-[#0b4da2] text-white shadow-sm'
              : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers size={18} />
          <span>Home Page Theme (AutoCount / Corporate)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('service-cards')}
          className={`flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer border-0 ${
            mainTab === 'service-cards'
              ? 'bg-[#0b4da2] text-white shadow-sm'
              : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid size={18} />
          <span>Service Cards Animation Theme (Left / Right / Bottom / Top / Random)</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: SERVICE CARDS ANIMATION THEME                                */}
      {/* ==================================================================== */}
      {mainTab === 'service-cards' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Animation Selector Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 m-0">
                    Service Cards Entrance Animation
                  </h2>
                  <p className="text-xs text-slate-500 m-0 mt-1">
                    Select which direction the cards will slide in when the services page loads.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200">
                    Current: {animationOptions.find((o) => o.id === selectedCardAnim)?.title}
                  </span>
                </div>
              </div>
            </div>

            {/* 5 Selectable Animation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {animationOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedCardAnim === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleCardAnimationSelect(opt.id)}
                    className={`cursor-pointer rounded-2xl border-2 p-4 flex flex-col justify-between transition-all relative select-none ${
                      isSelected
                        ? 'border-[#0b4da2] bg-blue-50/50 ring-4 ring-blue-100 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-[#0b4da2] text-white rounded-full p-1 shadow-xs">
                        <Check size={12} />
                      </div>
                    )}

                    <div>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                          isSelected
                            ? 'bg-[#0b4da2] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon size={20} />
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 m-0 leading-tight">
                        {opt.title}
                      </h3>
                      <span className="inline-block text-[10px] font-bold text-[#0b4da2] bg-blue-100/70 px-2 py-0.5 rounded-md mt-1 mb-2">
                        {opt.badge}
                      </span>
                      <p className="text-xs text-slate-500 m-0 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSelected ? 'text-[#0b4da2]' : 'text-slate-400'
                        }`}
                      >
                        {isSelected ? 'ACTIVE' : 'Select'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardAnimationSelect(opt.id);
                        }}
                        className="text-[11px] font-bold text-[#0b4da2] hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        Try &raquo;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Animation Speed & Delay Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                    <Gauge size={20} className="text-[#0b4da2]" />
                    <span>Animation Speed & Stagger Timing Controls</span>
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-1">
                    Control how fast the cards transition into view and customize the delay between each subsequent card.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200">
                    Speed: <strong>{cardDuration}ms</strong> ({(cardDuration / 1000).toFixed(2)}s)
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Stagger Delay: <strong>{cardStagger}ms</strong> / card
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timing Panel 1: Duration / Speed */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shadow-2xs">
                      <Timer size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                        Animation Duration (Speed)
                      </h4>
                      <p className="text-[11px] text-slate-500 m-0">
                        Total time for each card to complete entrance
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1 shadow-2xs">
                    <input
                      type="number"
                      min={200}
                      max={4000}
                      step={50}
                      value={cardDuration}
                      onChange={(e) => handleCardDurationChange(Number(e.target.value) || 1000)}
                      className="w-16 text-right text-xs font-bold text-slate-800 border-0 p-0 focus:outline-none"
                    />
                    <span className="text-[11px] font-semibold text-slate-400">ms</span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1.5 pt-1">
                  <input
                    type="range"
                    min={300}
                    max={2500}
                    step={50}
                    value={cardDuration}
                    onChange={(e) => handleCardDurationChange(Number(e.target.value))}
                    className="w-full accent-[#0b4da2] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                    <span>⚡ Faster (300ms)</span>
                    <span>🌟 Smooth (1000ms)</span>
                    <span>🧘 Relaxed (2500ms)</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                    Quick Speed Presets:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '⚡ Fast', ms: 500 },
                      { label: '🌟 Smooth', ms: 900 },
                      { label: '🧘 Balanced', ms: 1300 },
                      { label: '🎬 Cinematic', ms: 1800 },
                    ].map((preset) => (
                      <button
                        key={preset.ms}
                        type="button"
                        onClick={() => handleCardDurationChange(preset.ms)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          cardDuration === preset.ms
                            ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <div>{preset.label}</div>
                        <div className="text-[10px] opacity-75 font-normal">{preset.ms}ms</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timing Panel 2: Stagger Delay */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                        Stagger Delay per Card
                      </h4>
                      <p className="text-[11px] text-slate-500 m-0">
                        Sequence delay between each consecutive card
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1 shadow-2xs">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step={10}
                      value={cardStagger}
                      onChange={(e) => handleCardStaggerChange(Number(e.target.value) || 0)}
                      className="w-16 text-right text-xs font-bold text-slate-800 border-0 p-0 focus:outline-none"
                    />
                    <span className="text-[11px] font-semibold text-slate-400">ms</span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1.5 pt-1">
                  <input
                    type="range"
                    min={0}
                    max={400}
                    step={10}
                    value={cardStagger}
                    onChange={(e) => handleCardStaggerChange(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                    <span>Simultaneous (0ms)</span>
                    <span>Standard (120ms)</span>
                    <span>Cascading (400ms)</span>
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                    Quick Delay Presets:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'All at Once', ms: 0 },
                      { label: '⚡ Snappy', ms: 70 },
                      { label: '🌟 Standard', ms: 140 },
                      { label: '🌊 Cascade', ms: 240 },
                    ].map((preset) => (
                      <button
                        key={preset.ms}
                        type="button"
                        onClick={() => handleCardStaggerChange(preset.ms)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          cardStagger === preset.ms
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <div>{preset.label}</div>
                        <div className="text-[10px] opacity-75 font-normal">{preset.ms}ms</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Demo & Playground */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                  <Play size={16} className="text-emerald-600 fill-emerald-600" />
                  Live Preview: See Animation in Action
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Showing how service cards enter with active settings (
                  <strong>{animationOptions.find((o) => o.id === selectedCardAnim)?.title}</strong>,{' '}
                  speed: <strong>{cardDuration}ms</strong>, delay: <strong>{cardStagger}ms</strong>)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDemoReplayKey((k) => k + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer border-0"
                >
                  <RotateCcw size={13} />
                  <span>Replay Animation</span>
                </button>

                <Link
                  href="/services"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083b7e] text-white text-xs font-bold transition-colors no-underline"
                >
                  <span>Go to /services</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>

            {/* The Demo Cards Grid */}
            <div
              key={demoReplayKey}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200 overflow-hidden"
            >
              {demoCards.map((card, idx) => {
                const animClass = getServiceCardAnimationClass(selectedCardAnim, idx);
                const Icon = card.icon;

                return (
                  <div
                    key={idx}
                    style={getServiceCardAnimationStyle(idx, cardDuration, cardStagger)}
                    className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${animClass}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-11 h-11 rounded-xl p-2 flex items-center justify-center ${card.iconBg}`}>
                          <Icon size={22} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">
                          Card #{idx + 1}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 m-0 leading-snug">
                        {card.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 mb-0">
                        {card.category}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0b4da2]">
                      <span>Verified Dossier</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: HOME PAGE THEME (AutoCount / Corporate)                      */}
      {/* ==================================================================== */}
      {mainTab === 'home' && (
        <div className="space-y-8 animate-fadeIn">
          {/* SECTION 1: Active Theme Selection Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">1. Select Active Theme</h2>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Click any theme below to activate it immediately on the homepage.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                Active:{' '}
                {settings.active_theme === 'theme2'
                  ? 'Theme 2 (AutoCount Green)'
                  : 'Theme 1 (Corporate Blue)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card: Theme 2 (AutoCount Green) */}
              <div
                onClick={() => handleActiveThemeChange('theme2')}
                className={`cursor-pointer rounded-2xl border-2 transition-all p-5 flex flex-col justify-between bg-white relative overflow-hidden ${
                  settings.active_theme === 'theme2'
                    ? 'border-emerald-600 ring-4 ring-emerald-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {settings.active_theme === 'theme2' && (
                  <div className="absolute top-4 right-4 bg-emerald-600 text-white rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                    <Check size={13} />
                    <span>ACTIVE THEME</span>
                  </div>
                )}

                <div>
                  {/* Thumbnail Representation */}
                  <div className="h-40 rounded-xl bg-gradient-to-br from-[#e8f7ec] via-[#caeed2] to-[#15803d] p-3 flex flex-col justify-between relative overflow-hidden border border-emerald-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-[#154823] tracking-tight block">
                          Save 60% on
                        </span>
                        <span className="text-[9px] font-extrabold text-[#22a447] tracking-tight block">
                          AutoCount Cloud Accounting
                        </span>
                        <span className="text-[8px] font-bold text-slate-900 bg-white/70 px-1.5 py-0.5 rounded-sm inline-block">
                          From RM28 /mo
                        </span>
                      </div>
                      <div className="w-24 h-16 relative">
                        <img
                          src="/images/autocount-laptop.png"
                          alt="Theme 2 laptop"
                          className="w-full h-full object-contain filter drop-shadow-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/autocount-laptop.jpg';
                          }}
                        />
                      </div>
                    </div>

                    {/* Mini Zigzag line preview */}
                    <svg viewBox="0 0 300 45" className="w-full h-10 mt-auto">
                      <polygon
                        points="0,20 40,15 90,30 140,22 190,28 240,10 300,25 300,45 0,45"
                        fill="rgba(21, 128, 61, 0.85)"
                      />
                      <polyline
                        points="0,20 40,15 90,30 140,22 190,28 240,10 300,25"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                      />
                      <circle cx="40" cy="15" r="3.5" fill="#ef4444" />
                      <circle cx="90" cy="30" r="3.5" fill="#f97316" />
                      <circle cx="140" cy="22" r="3.5" fill="#ef4444" />
                      <circle cx="190" cy="28" r="3.5" fill="#eab308" />
                      <circle cx="240" cy="10" r="4" fill="#22c55e" stroke="#fff" strokeWidth="1" />
                    </svg>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 m-0">
                        Theme 2: AutoCount Cloud (Green)
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                        With Rising Animation & Chart
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 mb-0 leading-relaxed">
                      Inspired by AutoCount Cloud Accounting with light green styling, floating feature badges, and animated multi-color zigzag chart.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    className={`text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all border-0 ${
                      settings.active_theme === 'theme2'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {settings.active_theme === 'theme2' ? 'Currently Active' : 'Switch to Theme 2'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHomeTab('theme2');
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Edit Texts &raquo;
                  </button>
                </div>
              </div>

              {/* Card: Theme 1 (Corporate Blue) */}
              <div
                onClick={() => handleActiveThemeChange('theme1')}
                className={`cursor-pointer rounded-2xl border-2 transition-all p-5 flex flex-col justify-between bg-white relative overflow-hidden ${
                  settings.active_theme === 'theme1'
                    ? 'border-[#0b4da2] ring-4 ring-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {settings.active_theme === 'theme1' && (
                  <div className="absolute top-4 right-4 bg-[#0b4da2] text-white rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                    <Check size={13} />
                    <span>ACTIVE THEME</span>
                  </div>
                )}

                <div>
                  {/* Thumbnail Representation */}
                  <div className="h-40 rounded-xl bg-gradient-to-br from-[#0c4082] via-[#082956] to-[#04162e] p-3 flex flex-col justify-between relative overflow-hidden border border-blue-900">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-blue-200 uppercase tracking-wider block">
                          Corporate Accounting
                        </span>
                        <span className="text-[11px] font-black text-white tracking-tight block">
                          Financial Ledger
                        </span>
                        <span className="text-[8px] font-bold text-slate-900 bg-amber-400 px-1.5 py-0.5 rounded-sm inline-block">
                          Explore Accounts
                        </span>
                      </div>
                      <div className="w-24 h-16 relative">
                        <img
                          src="/images/laptop-accounting.jpg"
                          alt="Theme 1 laptop"
                          className="w-full h-full object-cover rounded-md filter drop-shadow-md"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-blue-200 pt-2 border-t border-blue-800/50">
                      <span className="flex items-center gap-1 font-semibold text-yellow-300">
                        <TrendingUp size={10} /> +32.5% Profit
                      </span>
                      <span className="text-slate-300 font-medium">Verified Core</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 m-0">
                        Theme 1: Corporate Accounting (Blue)
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-blue-100 text-blue-800">
                        Original Hero
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 mb-0 leading-relaxed">
                      Deep corporate blue design with particle constellation canvas, live financial core mockup, and metric badges.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    className={`text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all border-0 ${
                      settings.active_theme === 'theme1'
                        ? 'bg-[#0b4da2] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {settings.active_theme === 'theme1' ? 'Currently Active' : 'Switch to Theme 1'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHomeTab('theme1');
                    }}
                    className="text-xs font-semibold text-blue-700 hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Edit Texts &raquo;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Customize Texts Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Tab Headers */}
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHomeTab('theme2')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
                    selectedHomeTab === 'theme2'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Theme 2 (AutoCount Green) Texts
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedHomeTab('theme1')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
                    selectedHomeTab === 'theme1'
                      ? 'bg-[#0b4da2] text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Theme 1 (Corporate Blue) Texts
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 transition-colors bg-transparent border-0 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset texts to default</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveAll} className="p-6 md:p-8 space-y-6">
              {selectedHomeTab === 'theme2' ? (
                /* ============================================================== */
                /* THEME 2 (AutoCount Green) Fields                               */
                /* ============================================================== */
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Hero Headlines & Subtitle (Theme 2)
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      Update the main title texts shown on the left side of the hero section.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Headline Line 1 (Dark Green Bold)
                      </label>
                      <input
                        type="text"
                        value={settings.theme2_data.title_line1}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme2_data: {
                              ...settings.theme2_data,
                              title_line1: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Save 60% on"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Headline Line 2 (Vibrant Green Bold)
                      </label>
                      <input
                        type="text"
                        value={settings.theme2_data.title_line2}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme2_data: {
                              ...settings.theme2_data,
                              title_line2: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="AutoCount Cloud Accounting"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Hero Subtitle Description
                    </label>
                    <textarea
                      rows={2}
                      value={settings.theme2_data.subtitle}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          theme2_data: {
                            ...settings.theme2_data,
                            subtitle: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Access your accounting anytime, anywhere with built-in LHDN e-Invoice compliance."
                      required
                    />
                  </div>

                  {/* Price Row */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Pricing & Disclaimer Section
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Price Prefix Text
                        </label>
                        <input
                          type="text"
                          value={settings.theme2_data.price_prefix}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme2_data: {
                                ...settings.theme2_data,
                                price_prefix: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          placeholder="For 1 Year from just"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Price Amount Highlight
                        </label>
                        <input
                          type="text"
                          value={settings.theme2_data.price_amount}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme2_data: {
                                ...settings.theme2_data,
                                price_amount: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold"
                          placeholder="RM28"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Price Suffix / Frequency
                        </label>
                        <input
                          type="text"
                          value={settings.theme2_data.price_suffix}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme2_data: {
                                ...settings.theme2_data,
                                price_suffix: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          placeholder="/month*"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Disclaimer Note
                      </label>
                      <input
                        type="text"
                        value={settings.theme2_data.disclaimer}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme2_data: {
                              ...settings.theme2_data,
                              disclaimer: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                        placeholder="Limited-time offer. T&C apply."
                      />
                    </div>
                  </div>

                  {/* Button Row */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Primary Action Button
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={settings.theme2_data.btn_text}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme2_data: {
                                ...settings.theme2_data,
                                btn_text: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold"
                          placeholder="Get Free Trial"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Button URL / Link
                        </label>
                        <input
                          type="text"
                          value={settings.theme2_data.btn_link}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme2_data: {
                                ...settings.theme2_data,
                                btn_link: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          placeholder="/login"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Floating Badges */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Laptop Floating Feature Badges (3 Animated Tags)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                          <Monitor size={14} className="text-emerald-600" />
                          <span>Floating Badge 1 (Top Left): Reports Access</span>
                        </label>
                        <input
                          type="text"
                          value={settings.theme2_data.badge1_text}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme2_data: {
                                ...settings.theme2_data,
                                badge1_text: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          placeholder="Access to sales & profit reports anytime, anywhere"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-emerald-600" />
                          <span>Floating Badge 2 (Center Badge): Compliance Tag</span>
                        </label>
                        <input
                          type="text"
                          value={settings.theme2_data.badge2_text}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme2_data: {
                                ...settings.theme2_data,
                                badge2_text: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold"
                          placeholder="LHDN e-Invoice Ready"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                          <ScanLine size={14} className="text-emerald-600" />
                          <span>Floating Badge 3 (Bottom Left): AI SmartScan Tag</span>
                        </label>
                        <input
                          type="text"
                          value={settings.theme2_data.badge3_text}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme2_data: {
                                ...settings.theme2_data,
                                badge3_text: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                          placeholder="Instantly scan & record documents with AI SmartScan"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ============================================================== */
                /* THEME 1 (Corporate Blue) Fields                                */
                /* ============================================================== */
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      Hero Headlines & Subtitle (Theme 1)
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      Update the eyebrow, titles, and descriptions for the corporate blue theme.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Eyebrow Tagline
                    </label>
                    <input
                      type="text"
                      value={settings.theme1_data.eyebrow}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          theme1_data: {
                            ...settings.theme1_data,
                            eyebrow: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SMART FINANCIAL & CORPORATE ACCOUNTING SUITE"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Title Line 1
                      </label>
                      <input
                        type="text"
                        value={settings.theme1_data.title_line1}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme1_data: {
                              ...settings.theme1_data,
                              title_line1: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        placeholder="Corporate Accounting &"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Title Line 2 (Highlighted Text)
                      </label>
                      <input
                        type="text"
                        value={settings.theme1_data.title_line2}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme1_data: {
                              ...settings.theme1_data,
                              title_line2: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-amber-600"
                        placeholder="Financial Ledger"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Hero Subtitle Description
                    </label>
                    <textarea
                      rows={2}
                      value={settings.theme1_data.subtitle}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          theme1_data: {
                            ...settings.theme1_data,
                            subtitle: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Real-time ledger reconciliation, multi-entity bookkeeping, audit compliance, and revenue analytics in one unified portal."
                      required
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Hero Buttons
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Primary Button Text (Yellow)
                        </label>
                        <input
                          type="text"
                          value={settings.theme1_data.primary_btn_text}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme1_data: {
                                ...settings.theme1_data,
                                primary_btn_text: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold"
                          placeholder="Explore Accounts"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Primary Button Link
                        </label>
                        <input
                          type="text"
                          value={settings.theme1_data.primary_btn_link}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme1_data: {
                                ...settings.theme1_data,
                                primary_btn_link: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                          placeholder="/login"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Secondary Button Text
                        </label>
                        <input
                          type="text"
                          value={settings.theme1_data.secondary_btn_text}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme1_data: {
                                ...settings.theme1_data,
                                secondary_btn_text: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                          placeholder="Financial Reports"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Secondary Button Link
                        </label>
                        <input
                          type="text"
                          value={settings.theme1_data.secondary_btn_link}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme1_data: {
                                ...settings.theme1_data,
                                secondary_btn_link: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                          placeholder="#information"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Laptop Badges & Metrics */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Visual Mockup Badge & Stats
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Laptop Status Badge
                        </label>
                        <input
                          type="text"
                          value={settings.theme1_data.laptop_badge_text}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme1_data: {
                                ...settings.theme1_data,
                                laptop_badge_text: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                          placeholder="Live Financial Core"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Metric Percentage
                        </label>
                        <input
                          type="text"
                          value={settings.theme1_data.metric_percentage}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme1_data: {
                                ...settings.theme1_data,
                                metric_percentage: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold"
                          placeholder="+32.5%"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Metric Label
                        </label>
                        <input
                          type="text"
                          value={settings.theme1_data.metric_label}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              theme1_data: {
                                ...settings.theme1_data,
                                metric_label: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                          placeholder="Profit Increase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions Footer */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Changes will immediately update the live homepage upon saving.
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer border-0"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  <span>{saving ? 'Saving...' : 'Save Theme Texts'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
