'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  Edit2,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  SubscriptionPlan,
  fetchSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
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

  useEffect(() => {
    loadPlans();
  }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredPlans.map((plan) => {
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between transition-all relative ${
                  plan.is_popular
                    ? 'border-[#0b4da2] ring-2 ring-blue-500/10'
                    : 'border-slate-200 hover:border-slate-300'
                } ${!plan.is_active ? 'opacity-65 bg-slate-50/50' : ''}`}
              >
                {/* Popular or Custom Badge */}
                <div className="flex items-center justify-between mb-3">
                  {plan.badge ? (
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        plan.is_popular
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      #{plan.plan_key}
                    </span>
                  )}

                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      plan.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {plan.name}
                  </h3>

                  <div className="mt-2 mb-3">
                    <span className="text-xs font-bold text-slate-500">{plan.currency} </span>
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/ {plan.duration_days} Days</span>
                  </div>

                  {plan.savings_text && (
                    <div className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mb-2">
                      {plan.savings_text}
                    </div>
                  )}

                  <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 mb-2">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>{plan.trial_days} Days Free Trial Included</span>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
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
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
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
            );
          })}
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
