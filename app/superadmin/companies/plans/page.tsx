'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Hourglass,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  SubscriptionPlan,
  CompanySubscriptionRecord,
  fetchSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  fetchCompaniesWithSubscriptions,
  updateCompanySubscription,
} from '@/lib/companyTrialAndFinanceStorage';

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [planKey, setPlanKey] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState('199.00');
  const [currency, setCurrency] = useState('RM');
  const [badge, setBadge] = useState('');
  const [savingsText, setSavingsText] = useState('');
  const [description, setDescription] = useState('');
  const [trialDays, setTrialDays] = useState(3);
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(1);
  const [featureInput, setFeatureInput] = useState('');
  const [featuresList, setFeaturesList] = useState<string[]>([]);

  // Companies Subscription Table state
  const [companies, setCompanies] = useState<CompanySubscriptionRecord[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedPackageFilter, setSelectedPackageFilter] = useState<string>('all');
  const [companySearch, setCompanySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Subscription Extend/Edit Modal state
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [targetCompany, setTargetCompany] = useState<CompanySubscriptionRecord | null>(null);
  const [modalPlanKey, setModalPlanKey] = useState('');
  const [modalExpiresAt, setModalExpiresAt] = useState('');
  const [modalStatus, setModalStatus] = useState('active');
  const [modalNotes, setModalNotes] = useState('');
  const [savingSubscription, setSavingSubscription] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await fetchSubscriptionPlans(true); // include inactive
      setPlans(data);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load plans' });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await fetchCompaniesWithSubscriptions();
      setCompanies(data);
    } catch (err: any) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    loadPlans();
    loadCompanies();
  }, []);

  // Real-time live countdown ticker (ticks every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenSubscriptionModal = (comp: CompanySubscriptionRecord) => {
    setTargetCompany(comp);
    setModalPlanKey(comp.subscription_plan_key || (plans[0]?.plan_key ?? '1_month'));
    if (comp.subscription_expires_at) {
      const d = new Date(comp.subscription_expires_at);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      setModalExpiresAt(localISOTime);
    } else {
      const future = new Date(Date.now() + 30 * 86400000);
      const tzOffset = future.getTimezoneOffset() * 60000;
      setModalExpiresAt(new Date(future.getTime() - tzOffset).toISOString().slice(0, 16));
    }
    setModalStatus(comp.subscription_status || 'active');
    setModalNotes(comp.subscription_notes || '');
    setSubscriptionModalOpen(true);
  };

  const handleQuickExtend = (days: number) => {
    let base = modalExpiresAt ? new Date(modalExpiresAt).getTime() : Date.now();
    if (isNaN(base) || base < Date.now()) {
      base = Date.now();
    }
    const newDate = new Date(base + days * 86400000);
    const tzOffset = newDate.getTimezoneOffset() * 60000;
    setModalExpiresAt(new Date(newDate.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompany) return;

    setSavingSubscription(true);
    try {
      const res = await updateCompanySubscription(targetCompany.id, {
        subscription_plan_key: modalPlanKey,
        subscription_expires_at: modalExpiresAt ? new Date(modalExpiresAt).toISOString() : undefined,
        subscription_status: modalStatus,
        subscription_notes: modalNotes,
      });

      if (res.success && res.company) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === targetCompany.id ? { ...c, ...res.company } : c))
        );
        setNotification({
          type: 'success',
          message: `Subscription for ${targetCompany.name} updated successfully!`,
        });
        setSubscriptionModalOpen(false);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update company subscription',
      });
    } finally {
      setSavingSubscription(false);
    }
  };

  const getCountdownInfo = (expiresAtStr?: string | null, startsAtStr?: string | null) => {
    if (!expiresAtStr) {
      return {
        hasExpiry: false,
        isExpired: false,
        isExpiringSoon: false,
        isExpiringVerySoon: false,
        label: 'No Expiry Set',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        percentRemaining: 100,
      };
    }

    const expireTime = new Date(expiresAtStr).getTime();
    if (isNaN(expireTime)) {
      return {
        hasExpiry: false,
        isExpired: false,
        isExpiringSoon: false,
        isExpiringVerySoon: false,
        label: 'Invalid Date',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        percentRemaining: 100,
      };
    }

    const diff = expireTime - currentTime;
    const isExpired = diff <= 0;

    if (isExpired) {
      const pastSeconds = Math.abs(Math.floor(diff / 1000));
      const pastDays = Math.floor(pastSeconds / 86400);
      const pastHours = Math.floor((pastSeconds % 86400) / 3600);
      return {
        hasExpiry: true,
        isExpired: true,
        isExpiringSoon: false,
        isExpiringVerySoon: false,
        label: 'Expired',
        days: pastDays,
        hours: pastHours,
        minutes: 0,
        seconds: 0,
        percentRemaining: 0,
      };
    }

    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const isExpiringSoon = days <= 7;
    const isExpiringVerySoon = days <= 1;

    let percentRemaining = 100;
    if (startsAtStr) {
      const startTime = new Date(startsAtStr).getTime();
      if (!isNaN(startTime) && expireTime > startTime) {
        const totalDuration = expireTime - startTime;
        const currentElapsed = currentTime - startTime;
        percentRemaining = Math.max(0, Math.min(100, Math.round(((totalDuration - currentElapsed) / totalDuration) * 100)));
      }
    }

    let label = '';
    if (days > 0) {
      label = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      label = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      label = `${minutes}m ${seconds}s`;
    }

    return {
      hasExpiry: true,
      isExpired: false,
      isExpiringSoon,
      isExpiringVerySoon,
      label,
      days,
      hours,
      minutes,
      seconds,
      percentRemaining,
    };
  };

  const packageCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: companies.length, unassigned: 0 };
    companies.forEach((c) => {
      const key = c.subscription_plan_key || 'unassigned';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [companies]);

  const filteredCompanies = React.useMemo(() => {
    return companies.filter((c) => {
      if (selectedPackageFilter !== 'all') {
        if (selectedPackageFilter === 'unassigned') {
          if (c.subscription_plan_key) return false;
        } else if (c.subscription_plan_key !== selectedPackageFilter) {
          return false;
        }
      }

      const cd = getCountdownInfo(c.subscription_expires_at, c.subscription_starts_at);
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && (cd.isExpired || c.subscription_status === 'inactive')) return false;
        if (statusFilter === 'trial' && c.subscription_status !== 'trial_active') return false;
        if (statusFilter === 'expiring_soon' && (!cd.isExpiringSoon || cd.isExpired)) return false;
        if (statusFilter === 'expired' && !cd.isExpired && c.subscription_status !== 'expired') return false;
      }

      if (companySearch.trim()) {
        const q = companySearch.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchRoc = c.roc?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchSector = c.sector?.toLowerCase().includes(q);
        const matchId = c.id?.toLowerCase().includes(q);
        if (!matchName && !matchRoc && !matchEmail && !matchSector && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [companies, selectedPackageFilter, statusFilter, companySearch, currentTime]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setPlanKey('');
    setDurationDays(30);
    setPrice('199.00');
    setCurrency('RM');
    setBadge('');
    setSavingsText('');
    setDescription('Complete agency ERP access with 3-day free trial.');
    setTrialDays(3);
    setIsPopular(false);
    setIsActive(true);
    setSortOrder(plans.length + 1);
    setFeaturesList(['Multi-Company Access', 'Attendance & Biometrics', 'Employee Management', 'Invoicing & Reports']);
    setFeatureInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: SubscriptionPlan) => {
    setEditingPlan(p);
    setName(p.name);
    setPlanKey(p.plan_key);
    setDurationDays(p.duration_days);
    setPrice(String(p.price));
    setCurrency(p.currency || 'RM');
    setBadge(p.badge || '');
    setSavingsText(p.savings_text || '');
    setDescription(p.description || '');
    setTrialDays(p.trial_days ?? 3);
    setIsPopular(Boolean(p.is_popular));
    setIsActive(Boolean(p.is_active));
    setSortOrder(p.sort_order ?? 1);
    setFeaturesList(Array.isArray(p.features) ? p.features : []);
    setFeatureInput('');
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (featureInput.trim() && !featuresList.includes(featureInput.trim())) {
      setFeaturesList([...featuresList, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setFeaturesList(featuresList.filter((_, i) => i !== idx));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Plan name is required.');
      return;
    }
    if (durationDays < 1) {
      alert('Duration days must be at least 1 day.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<SubscriptionPlan> = {
        name: name.trim(),
        plan_key: planKey.trim() || undefined,
        duration_days: Number(durationDays),
        price: parseFloat(price) || 0,
        currency: currency.trim() || 'RM',
        badge: badge.trim() || null,
        savings_text: savingsText.trim() || null,
        description: description.trim() || null,
        features: featuresList,
        trial_days: Number(trialDays),
        is_popular: isPopular,
        is_active: isActive,
        sort_order: Number(sortOrder),
      };

      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.id, payload);
        setNotification({ type: 'success', message: `Plan "${name}" updated successfully!` });
      } else {
        await createSubscriptionPlan(payload);
        setNotification({ type: 'success', message: `New plan "${name}" created successfully!` });
      }

      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (p: SubscriptionPlan) => {
    try {
      await updateSubscriptionPlan(p.id, { is_active: !p.is_active });
      setNotification({
        type: 'success',
        message: `Plan "${p.name}" is now ${!p.is_active ? 'Active' : 'Disabled'}.`,
      });
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (p: SubscriptionPlan) => {
    if (!confirm(`Are you sure you want to delete the plan "${p.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteSubscriptionPlan(p.id);
      setNotification({ type: 'success', message: `Plan "${p.name}" deleted successfully.` });
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to delete plan');
    }
  };

  const filteredPlans = plans.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.plan_key.toLowerCase().includes(q) ||
      (p.badge && p.badge.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/companies"
              className="text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft size={14} /> Back to Companies
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <Layers className="text-[#0b4da2]" size={26} />
            <span>Subscription Plan Packages</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and customize subscription plans. Active plans appear live in the Homepage &quot;Get Free Trial&quot; dropdown and Application Page.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Summary Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search plans by name, key, or badge..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="bg-blue-50 text-[#0b4da2] px-2.5 py-1 rounded-lg border border-blue-100 font-bold">
            {plans.filter((p) => p.is_active).length} Active Plans
          </span>
          <button
            type="button"
            onClick={loadPlans}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh plans list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs font-semibold text-slate-500">
          <RefreshCw size={24} className="animate-spin text-[#0b4da2] mx-auto mb-2" />
          <span>Loading subscription plans...</span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0b4da2] flex items-center justify-center mx-auto mb-3">
            <Layers size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">No Subscription Plans Found</h3>
          <p className="text-xs text-slate-500 mb-4">Click below to create your first package.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] text-white text-xs font-bold cursor-pointer"
          >
            <Plus size={14} /> Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {filteredPlans.map((plan) => {
            const isFreePrice = Number(plan.price) === 0;
            const durationDays = Number(plan.duration_days || 30);
            const trialDays = Number(plan.trial_days ?? 3);

            let durationText = '';
            if (durationDays === 30) durationText = '1 Month';
            else if (durationDays === 90) durationText = '3 Months';
            else if (durationDays === 180) durationText = '6 Months';
            else if (durationDays === 300) durationText = '10 Months';
            else if (durationDays === 365) durationText = '1 Year';
            else if (durationDays > 0 && durationDays % 30 === 0) durationText = `${durationDays / 30} Months`;
            else if (durationDays > 0) durationText = `${durationDays} Days`;
            else durationText = plan.name || 'Subscription';

            let trialText = '';
            if (trialDays === 30) trialText = '1 Month Free';
            else if (trialDays > 0) trialText = `${trialDays} Days Free`;
            else if (isFreePrice) trialText = 'Free';
            else trialText = '3 Days Free';

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all duration-200 relative h-full min-w-0 overflow-hidden ${
                  plan.is_popular
                    ? 'border-[#0b4da2] ring-2 ring-blue-500/15 shadow-md -translate-y-0.5'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                } ${!plan.is_active ? 'opacity-65 bg-slate-50/50' : ''}`}
              >
                {/* Popular or Custom Badge + Status */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {plan.badge ? (
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                          plan.is_popular
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'bg-emerald-600 text-white shadow-2xs'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 font-bold truncate max-w-[120px]">
                        #{plan.plan_key}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                      plan.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div>
                  {/* Heading: e.g. 6 Months / 3 Days Free */}
                  <div className="mb-2">
                    <h3 className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {durationText}
                      </span>
                      <span className="text-slate-300 font-bold text-sm">/</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                        {trialText}
                      </span>
                    </h3>
                    {plan.name && !plan.name.toLowerCase().startsWith(durationText.toLowerCase()) && (
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate" title={plan.name}>
                        {plan.name}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 mb-2.5">
                    {isFreePrice ? (
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">FREE</span>
                        <span className="text-[11px] font-bold text-slate-400">({plan.currency} 0.00)</span>
                        <span className="text-xs text-slate-500 ml-1">/ {durationText}</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-500">{plan.currency} </span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {plan.price}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">/ {durationText}</span>
                      </div>
                    )}
                  </div>

                  {plan.savings_text && (
                    <div className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mb-2">
                      {plan.savings_text}
                    </div>
                  )}

                  {plan.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3 break-words">
                      {plan.description}
                    </p>
                  )}

                  {/* Feature Bullets */}
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <ul className="space-y-1 mb-4 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                      {plan.features.slice(0, 4).map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-1.5">
                          <Check size={11} className="text-emerald-500 shrink-0" strokeWidth={3} />
                          <span className="truncate">{feat}</span>
                        </li>
                      ))}
                      {plan.features.length > 4 && (
                        <li className="text-[10px] text-slate-400 pl-4 font-semibold">
                          +{plan.features.length - 4} more features
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 mt-auto">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(plan)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        plan.is_active
                          ? 'border-slate-200 text-slate-500 hover:bg-slate-100'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                      title={plan.is_active ? 'Disable plan from public view' : 'Enable plan'}
                    >
                      {plan.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(plan)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete plan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackageFilter(plan.plan_key);
                        const el = document.getElementById('companies-subscription-table');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0b4da2] text-[11px] font-extrabold transition-colors cursor-pointer border border-blue-200/60"
                      title={`View companies on ${plan.name}`}
                    >
                      <Users size={12} />
                      <span>{packageCounts[plan.plan_key] || 0} Companies</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(plan)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#0b4da2] hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION: COMPANY SUBSCRIPTION & EXPIRY TRACKER TABLE           */}
      {/* ============================================================== */}
      <div id="companies-subscription-table" className="mt-12 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        {/* Header with Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center font-black shadow-2xs">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Company Subscriptions</span>
                <span className="text-xs font-black text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {filteredCompanies.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={loadCompanies}
            disabled={loadingCompanies}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0 border border-slate-200"
          >
            <RefreshCw size={13} className={loadingCompanies ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Quick Stat Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Total
            </span>
            <span className="text-2xl font-black text-slate-900">{companies.length}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
              Active
            </span>
            <span className="text-2xl font-black text-emerald-700">
              {companies.filter((c) => {
                const cd = getCountdownInfo(c.subscription_expires_at);
                return !cd.isExpired && c.subscription_status === 'active';
              }).length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
              <Hourglass size={12} className="text-amber-600 animate-spin" />
              <span>Expiring (&le;7d)</span>
            </span>
            <span className="text-2xl font-black text-amber-700">
              {companies.filter((c) => {
                const cd = getCountdownInfo(c.subscription_expires_at);
                return cd.isExpiringSoon && !cd.isExpired;
              }).length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-0.5">
              Free Trials
            </span>
            <span className="text-2xl font-black text-[#0b4da2]">
              {companies.filter((c) => c.subscription_status === 'trial_active').length}
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Primary Dropdown: Package Selector */}
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
              <label className="text-xs font-black text-slate-800 whitespace-nowrap flex items-center gap-1.5">
                <Layers size={14} className="text-[#0b4da2]" />
                <span>Package:</span>
              </label>
              <select
                value={selectedPackageFilter}
                onChange={(e) => setSelectedPackageFilter(e.target.value)}
                className="w-full sm:w-auto flex-1 max-w-sm px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-extrabold text-slate-800 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] cursor-pointer"
              >
                <option value="all">All Packages ({companies.length})</option>
                {plans.map((p) => (
                  <option key={p.plan_key} value={p.plan_key}>
                    {p.name} ({packageCounts[p.plan_key] || 0})
                  </option>
                ))}
                <option value="unassigned">Unassigned ({packageCounts['unassigned'] || 0})</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white shadow-2xs focus:outline-none focus:border-[#0b4da2] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="trial">3-Day Trial</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>

              <div className="relative w-48 sm:w-60">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search company..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white shadow-2xs"
                />
                {companySearch && (
                  <button
                    type="button"
                    onClick={() => setCompanySearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Pill Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => setSelectedPackageFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                selectedPackageFilter === 'all'
                  ? 'bg-[#0b4da2] text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({companies.length})
            </button>
            {plans.map((p) => {
              const active = selectedPackageFilter === p.plan_key;
              const count = packageCounts[p.plan_key] || 0;
              return (
                <button
                  key={p.plan_key}
                  type="button"
                  onClick={() => setSelectedPackageFilter(p.plan_key)}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0b4da2] text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{p.name}</span>
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table of Companies */}
        {loadingCompanies ? (
          <div className="py-16 text-center">
            <RefreshCw size={24} className="animate-spin text-[#0b4da2] mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Loading subscriptions...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
            <Building2 size={36} className="text-slate-300 mx-auto mb-2.5" />
            <h3 className="text-base font-bold text-slate-700 mb-1">No Companies Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {selectedPackageFilter !== 'all'
                ? `No companies assigned to this package.`
                : 'No companies match the current filter.'}
            </p>
            {selectedPackageFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedPackageFilter('all')}
                className="px-4 py-2 rounded-xl bg-blue-50 text-[#0b4da2] text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
              >
                Clear Filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700 uppercase tracking-wider">
                  <th className="py-4.5 px-6 w-[30%] min-w-[280px]">Company</th>
                  <th className="py-4.5 px-6 w-[20%] min-w-[190px]">Package</th>
                  <th className="py-4.5 px-6 w-[20%] min-w-[200px]">Expire Date</th>
                  <th className="py-4.5 px-6 w-[18%] min-w-[200px]">Countdown</th>
                  <th className="py-4.5 px-6 w-[12%] min-w-[110px]">Status</th>
                  <th className="py-4.5 px-6 text-right min-w-[120px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCompanies.map((comp) => {
                  const assignedPlan = plans.find((p) => p.plan_key === comp.subscription_plan_key);
                  const countdown = getCountdownInfo(comp.subscription_expires_at, comp.subscription_starts_at);
                  const isTrial = comp.subscription_status === 'trial_active';

                  return (
                    <tr
                      key={comp.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Company Profile */}
                      <td className="py-4.5 px-6 align-middle">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-sm overflow-hidden shrink-0 shadow-2xs">
                            {comp.logo ? (
                              <img
                                src={comp.logo}
                                alt={comp.name}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{comp.name?.charAt(0) || 'C'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-[15px] group-hover:text-[#0b4da2] transition-colors truncate max-w-[260px]">
                              {comp.name}
                            </div>
                            {comp.roc && (
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                {comp.roc}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subscribed Package */}
                      <td className="py-4.5 px-6 align-middle">
                        {assignedPlan ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-[15px]">
                              {assignedPlan.name}
                            </span>
                            {assignedPlan.badge && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-white shadow-2xs">
                                {assignedPlan.badge}
                              </span>
                            )}
                          </div>
                        ) : comp.subscription_plan_key ? (
                          <div className="font-bold text-slate-800 text-[15px] capitalize">
                            {comp.subscription_plan_key.replace('_', ' ')}
                          </div>
                        ) : (
                          <span className="inline-block text-xs text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Expire Date */}
                      <td className="py-4.5 px-6 align-middle">
                        {comp.subscription_expires_at ? (
                          <div className="flex items-center gap-2.5">
                            <CalendarClock size={18} className="text-[#0b4da2] shrink-0" />
                            <div>
                              <div className="font-extrabold text-slate-900 text-[15px]">
                                {new Date(comp.subscription_expires_at).toLocaleDateString('en-MY', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                              <div className="text-xs font-semibold text-slate-400">
                                {new Date(comp.subscription_expires_at).toLocaleTimeString('en-MY', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No expiry set</span>
                        )}
                      </td>

                      {/* Live Countdown */}
                      <td className="py-4.5 px-6 align-middle">
                        {countdown.hasExpiry ? (
                          <div
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-black shadow-2xs ${
                              countdown.isExpired
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : countdown.isExpiringSoon
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {countdown.isExpired ? (
                              <AlertCircle size={15} className="text-rose-600 shrink-0" />
                            ) : countdown.isExpiringSoon ? (
                              <Hourglass size={15} className="text-amber-600 animate-spin shrink-0" />
                            ) : (
                              <Clock size={15} className="text-emerald-600 shrink-0" />
                            )}
                            <span className="font-mono tracking-tight font-black">
                              {countdown.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Expiry</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-6 align-middle">
                        {countdown.isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Expired
                          </span>
                        ) : isTrial ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-100 text-[#0b4da2] border border-blue-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            Trial
                          </span>
                        ) : countdown.isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            Expiring
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4.5 px-6 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenSubscriptionModal(comp)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-extrabold transition-all shadow-2xs cursor-pointer"
                          >
                            <CalendarClock size={13} />
                            <span>Extend</span>
                          </button>

                          <Link
                            href={`/companies/${comp.id}`}
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View company"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* EXTEND / EDIT COMPANY SUBSCRIPTION MODAL                       */}
      {/* ============================================================== */}
      {subscriptionModalOpen && targetCompany && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-scale-up">
            <button
              type="button"
              onClick={() => setSubscriptionModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center font-black">
                <CalendarClock size={18} />
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Manage Company Subscription
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Update package allocation, add renewal days, or modify expiration date for{' '}
              <strong className="text-slate-800">{targetCompany.name}</strong>.
            </p>

            <form onSubmit={handleSaveSubscription} className="space-y-4">
              {/* Package Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign Package Plan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalPlanKey}
                  onChange={(e) => setModalPlanKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                >
                  {plans.map((p) => (
                    <option key={p.plan_key} value={p.plan_key}>
                      {p.name} ({p.currency} {p.price} / {p.duration_days} Days)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Extend Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Quick Extend Duration:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(7)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-[#0b4da2] hover:border-blue-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(14)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-[#0b4da2] hover:border-blue-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    +14 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(30)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-[#0b4da2] hover:border-blue-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    +30 Days (1 Mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(90)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-[#0b4da2] hover:border-blue-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    +90 Days (3 Mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(180)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-[#0b4da2] hover:border-blue-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    +180 Days (6 Mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(365)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-[#0b4da2] hover:border-blue-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    +1 Year (365d)
                  </button>
                </div>
              </div>

              {/* Exact Expiry Date & Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expiry Date &amp; Time <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <CalendarClock size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="datetime-local"
                    required
                    value={modalExpiresAt}
                    onChange={(e) => setModalExpiresAt(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>
              </div>

              {/* Subscription Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subscription Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                >
                  <option value="active">Active (Paid Subscription)</option>
                  <option value="trial_active">Trial Active (3-Day Free Trial)</option>
                  <option value="expired">Expired (Requires Payment/Renewal)</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Reference <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Extended by 30 days due to bank transfer clearance"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0b4da2]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSubscriptionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubscription}
                  className="px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingSubscription ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Subscription</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-scale-up">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-1">
              <Layers className="text-[#0b4da2]" size={22} />
              <span>{editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}</span>
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Configure package details, duration, pricing, and 3-day free trial settings.
            </p>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plan Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 Year Enterprise Plan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plan Key / Slug <span className="text-slate-400 font-normal">(e.g. 1_year)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="auto-generated if left blank"
                    value={planKey}
                    onChange={(e) => setPlanKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duration in Days <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Price <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-16 px-2.5 py-2 rounded-xl border border-slate-300 text-xs text-center font-bold text-slate-700 focus:outline-none focus:border-[#0b4da2]"
                    />
                    <input
                      type="number"
                      step="0.01"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Free Trial Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={trialDays}
                    onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badge Label <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. POPULAR, BEST VALUE, 35% OFF"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Savings Text <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Save 25%, Standard Rate"
                    value={savingsText}
                    onChange={(e) => setSavingsText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                  />
                </div>

                {/* Features Tag Input */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Included Features Bullet Points
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="e.g. 24/7 Dedicated Manager, AI Attendance"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#0b4da2]"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {featuresList.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#0b4da2] text-[11px] font-semibold border border-blue-200"
                      >
                        <span>{f}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(i)}
                          className="text-slate-400 hover:text-rose-600 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isPopularToggle"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0b4da2] focus:ring-blue-500 border-slate-300"
                  />
                  <label htmlFor="isPopularToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Highlight as &quot;Popular&quot;
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0b4da2] focus:ring-blue-500 border-slate-300"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Active &amp; Visible to Clients
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
