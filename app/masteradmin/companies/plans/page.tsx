'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Crown,
  DollarSign,
  ExternalLink,
  Flame,
  Hourglass,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import {
  fetchCompaniesFromBackend,
  getStoredCompanies,
  subscribeToCompanyChanges,
  updateStoredCompany,
} from '@/lib/companyStorage';
import {
  SubscriptionPlan,
  CompanySubscriptionRecord,
  fetchSubscriptionPlans,
  updateCompanySubscription,
  createInvoice,
} from '@/lib/companyTrialAndFinanceStorage';
import { getMasterAdminUser, AuthUser } from '@/lib/auth';

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    plan_key: '1_month',
    name: '1 Month Plan',
    duration_days: 30,
    price: '199.00',
    currency: 'RM',
    badge: null,
    savings_text: 'Standard Monthly',
    description: 'Essential management for workforce, attendance, and corporate billing.',
    features: [
      'Multi-Employee Management',
      'AI Facial Biometric Attendance',
      'Leave & Holiday Approvals',
      'Customer & Worker Portals',
      'Official Quotations & Tax Invoices',
      'MYPASS Identity Pass System',
    ],
    trial_days: 3,
    is_popular: false,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 2,
    plan_key: '3_months',
    name: '3 Months Plan',
    duration_days: 90,
    price: '499.00',
    currency: 'RM',
    badge: 'Popular',
    savings_text: 'Save 16%',
    description: 'Most popular option for growing business operations with priority support.',
    features: [
      'Everything in 1 Month Plan',
      'Priority Customer & Worker Support',
      'Automated Resignation & Clearances',
      'Advanced Attendance Reports & Overtime',
      'Unlimited Corporate Documents',
      'Dedicated Account Assistance',
    ],
    trial_days: 3,
    is_popular: true,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 3,
    plan_key: '6_months',
    name: '6 Months Plan',
    duration_days: 180,
    price: '899.00',
    currency: 'RM',
    badge: 'Best Value',
    savings_text: 'Save 25%',
    description: 'Extended operational reliability with bulk worker pass distribution.',
    features: [
      'Everything in 3 Months Plan',
      'Custom Agreement & Letter Templates',
      'Face Matching AI Microservice Priority',
      'Consolidated Quarterly Financial Reports',
      'Bulk Worker Pass QR Generation',
      'Full Multi-Department Permission Scopes',
    ],
    trial_days: 3,
    is_popular: false,
    is_active: true,
    sort_order: 3,
  },
  {
    id: 4,
    plan_key: '10_months',
    name: '10 Months Plan',
    duration_days: 300,
    price: '1399.00',
    currency: 'RM',
    badge: 'Enterprise',
    savings_text: 'Save 30%',
    description: 'Maximum financial savings for established contractor and agency operations.',
    features: [
      'Everything in 6 Months Plan',
      'Enterprise SLA & 24/7 Hotline Support',
      'Unlimited Worker Onboarding & Biodata',
      'Full Multi-Company Scoped Workspaces',
      'Automated Daily Cloud Backup Retention',
      'Exclusive Feature Early Access',
    ],
    trial_days: 3,
    is_popular: false,
    is_active: true,
    sort_order: 4,
  },
];

export default function MasterAdminSubscriptionPlansPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<SubscriptionPlan | null>(null);
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Online Banking / FPX' | 'Corporate Cheque'>('Online Banking / FPX');

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const assignedScope = useMemo(() => {
    return Array.isArray(currentUser?.assigned_companies) ? currentUser!.assigned_companies : [];
  }, [currentUser]);

  // Load user, permitted companies and subscription plans
  const loadData = async () => {
    setLoading(true);
    try {
      const user = getMasterAdminUser();
      setCurrentUser(user);

      const [compsRes, plansRes] = await Promise.all([
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
        fetchSubscriptionPlans().catch(() => []),
      ]);

      const userScope = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
      const permitted = compsRes.filter((c: Company) => {
        if (userScope.length === 0) return true;
        if (userScope.includes('*')) return true;
        return userScope.some((id) => id.toLowerCase() === c.id.toLowerCase());
      });

      setCompanies(permitted);
      if (permitted.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(permitted[0].id);
      }

      if (Array.isArray(plansRes) && plansRes.length > 0) {
        setPlans(plansRes);
      } else {
        setPlans(FALLBACK_PLANS);
      }
    } catch (err: any) {
      console.error('Failed to load subscription plan data:', err);
      showToast('error', 'Failed to load subscription data. Using local cache.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToCompanyChanges(() => {
      const all = getStoredCompanies();
      const user = getMasterAdminUser();
      const userScope = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
      const permitted = all.filter((c) => {
        if (userScope.length === 0) return true;
        if (userScope.includes('*')) return true;
        return userScope.some((id) => id.toLowerCase() === c.id.toLowerCase());
      });
      setCompanies(permitted);
    });
    return unsub;
  }, []);

  // Currently inspected company
  const activeCompany = useMemo(() => {
    if (!selectedCompanyId && companies.length > 0) return companies[0];
    return companies.find((c) => c.id === selectedCompanyId) || companies[0] || null;
  }, [companies, selectedCompanyId]);

  // Check which plan key matches active company
  const normalizedActiveKey = useMemo(() => {
    if (!activeCompany) return '';
    const raw = (activeCompany.subscription_plan_key || (activeCompany as any).subscription_package || '').trim().toLowerCase();
    return raw.replace(/[^a-z0-9]/g, '');
  }, [activeCompany]);

  // Expiration and timeline calculation
  const subscriptionTimeline = useMemo(() => {
    if (!activeCompany) return null;
    const expiresAt = activeCompany.subscription_expires_at;
    const startsAt = activeCompany.subscription_starts_at;
    const status = activeCompany.subscription_status || 'active';

    if (!expiresAt) {
      return {
        hasExpiry: false,
        isExpired: false,
        daysLeft: null,
        formattedExpires: 'Unlimited / Not Set',
        formattedStarts: startsAt ? new Date(startsAt).toLocaleDateString('en-GB') : 'Initial Setup',
        statusText: status === 'trial_active' ? 'Free Trial' : 'Active Membership',
      };
    }

    const expTime = new Date(expiresAt).getTime();
    const nowTime = Date.now();
    const diffDays = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24));
    const isExpired = diffDays <= 0;

    return {
      hasExpiry: true,
      isExpired,
      daysLeft: diffDays,
      formattedExpires: new Date(expiresAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      formattedStarts: startsAt
        ? new Date(startsAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        : 'Active Session',
      statusText: isExpired ? 'Expired' : status === 'trial_active' ? 'Trial Active' : 'Active Subscription',
    };
  }, [activeCompany]);

  const handleOpenUpgradeModal = (plan: SubscriptionPlan) => {
    setSelectedPlanToUpgrade(plan);
    setIsUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!activeCompany || !selectedPlanToUpgrade) return;
    setSubmittingUpgrade(true);

    try {
      const now = new Date();
      const expires = new Date();
      expires.setDate(expires.getDate() + selectedPlanToUpgrade.duration_days);

      const payload = {
        subscription_plan_key: selectedPlanToUpgrade.plan_key,
        subscription_starts_at: now.toISOString(),
        subscription_expires_at: expires.toISOString(),
        subscription_status: 'active',
        subscription_trial_days: selectedPlanToUpgrade.trial_days || 0,
        subscription_notes: `Upgraded by Master Admin (${currentUser?.name || 'Authorized Admin'}) on ${now.toLocaleString()}`,
      };

      const res = await updateCompanySubscription(activeCompany.id, payload);

      if (res.success) {
        // Also generate corporate invoice record for accounting tracking
        try {
          await createInvoice({
            company_id: activeCompany.id,
            company_name: activeCompany.name,
            customer_name: `${activeCompany.name} (Subscription Plan)`,
            customer_email: activeCompany.email || '',
            package_name: selectedPlanToUpgrade.name,
            total_amount: Number(selectedPlanToUpgrade.price) || 199,
            amount_paid: Number(selectedPlanToUpgrade.price) || 199,
            balance_due: 0,
            payment_status: 'Paid',
            payment_method: paymentMethod,
            payment_reference: `SUB-${Date.now().toString().slice(-6)}`,
            items: [
              {
                id: '1',
                description: `${selectedPlanToUpgrade.name} (${selectedPlanToUpgrade.duration_days} Days Full System License)`,
                quantity: 1,
                unit_price: Number(selectedPlanToUpgrade.price) || 199,
                total_price: Number(selectedPlanToUpgrade.price) || 199,
              },
            ],
          });
        } catch (invErr) {
          console.warn('Auto invoice notice:', invErr);
        }

        // Update local company storage immediately
        updateStoredCompany({
          ...activeCompany,
          subscription_plan_key: selectedPlanToUpgrade.plan_key,
          subscription_starts_at: payload.subscription_starts_at,
          subscription_expires_at: payload.subscription_expires_at,
          subscription_status: 'active',
        });

        // Update current view state
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === activeCompany.id
              ? {
                ...c,
                subscription_plan_key: selectedPlanToUpgrade.plan_key,
                subscription_starts_at: payload.subscription_starts_at,
                subscription_expires_at: payload.subscription_expires_at,
                subscription_status: 'active',
              }
              : c
          )
        );

        setIsUpgradeModalOpen(false);
        showToast('success', `Subscription successfully updated to ${selectedPlanToUpgrade.name}!`);
      } else {
        throw new Error(res.message || 'Failed to update subscription.');
      }
    } catch (err: any) {
      console.error('Failed to upgrade subscription:', err);
      showToast('error', err.message || 'Unable to update subscription. Please verify backend connection.');
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  const isPlanActive = (plan: SubscriptionPlan) => {
    if (!normalizedActiveKey) return false;
    const cleanPlanKey = (plan.plan_key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPlanName = (plan.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanPlanKey === normalizedActiveKey || cleanPlanName === normalizedActiveKey;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-12 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-semibold backdrop-blur-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50/95 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50/95 text-rose-800 border-rose-200'
              : 'bg-blue-50/95 text-blue-800 border-blue-200'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
          {notification.type === 'error' && <AlertCircle size={16} className="text-rose-600 shrink-0" />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent p-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/masteradmin/companies"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="text-[#0b4da2]" size={24} />
              <span>Company Subscription Plan</span>
            </h1>
            <p className="text-xs text-slate-500">
              Review current active package, validity duration, and upgrade or switch membership plans.
            </p>
          </div>
        </div>

        {/* Company Switcher if Master Admin has multiple assigned companies */}
        {companies.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Building2 size={16} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Company:</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <RefreshCw className="animate-spin text-[#0b4da2]" size={28} />
          <span className="text-xs font-semibold text-slate-600">Loading company subscription plan status...</span>
        </div>
      ) : !activeCompany ? (
        <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-3 shadow-xs">
          <AlertCircle className="mx-auto text-amber-500" size={32} />
          <h3 className="text-base font-bold text-slate-800">No Permitted Company Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your Master Admin account has not been assigned to any employer organization yet.
          </p>
        </div>
      ) : (
        <>
          {/* Active Membership Banner Card */}
          <div className="bg-gradient-to-br from-slate-900 via-[#072448] to-[#0b4da2] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/10 text-yellow-300 border border-yellow-300/30 flex items-center gap-1.5">
                    <Crown size={12} className="text-yellow-400" />
                    <span>CURRENT ACTIVE MEMBERSHIP</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    <span>{subscriptionTimeline?.statusText || 'Active'}</span>
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {activeCompany.name}
                  </h2>
                  <p className="text-xs text-blue-200/80 font-mono mt-0.5">
                    ROC: {activeCompany.roc || 'Registered Employer'} • Sector: {activeCompany.sector || 'General Commercial'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-200">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <Layers size={14} className="text-yellow-400" />
                    <span>Active Package:</span>
                    <strong className="text-white font-bold capitalize">
                      {activeCompany.subscription_plan_key?.replace('_', ' ') || '1 Month Standard Plan'}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <Calendar size={14} className="text-sky-300" />
                    <span>Valid Through:</span>
                    <strong className="text-white font-bold">
                      {subscriptionTimeline?.formattedExpires || 'Active License'}
                    </strong>
                  </div>

                  {subscriptionTimeline?.hasExpiry && subscriptionTimeline.daysLeft !== null && (
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold ${
                        subscriptionTimeline.daysLeft <= 5
                          ? 'bg-rose-500/20 text-rose-200 border-rose-400/30'
                          : subscriptionTimeline.daysLeft <= 14
                          ? 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                          : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                      }`}
                    >
                      <Clock size={14} />
                      <span>
                        {subscriptionTimeline.daysLeft > 0
                          ? `${subscriptionTimeline.daysLeft} Days Remaining`
                          : 'Subscription Expired'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button inside active card */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <a
                  href="#available-plans"
                  className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 no-underline"
                >
                  <Sparkles size={15} />
                  <span>Upgrade / Change Plan</span>
                </a>
              </div>
            </div>
          </div>

          {/* Section Divider: Available Plans */}
          <div id="available-plans" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Available Subscription Plans</h3>
                <p className="text-xs text-slate-500">
                  Select a plan to immediately switch or extend your company&apos;s active system features.
                </p>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const active = isPlanActive(plan);
                const features = Array.isArray(plan.features) && plan.features.length > 0
                  ? plan.features
                  : FALLBACK_PLANS.find((p) => p.duration_days === plan.duration_days)?.features || [
                    'Multi-Employee Management',
                    'Biometric AI Attendance',
                    'Customer & Worker Records',
                    'Corporate Quotations & Invoices',
                  ];

                return (
                  <div
                    key={plan.id || plan.plan_key}
                    className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 bg-white border shadow-sm hover:shadow-md ${
                      active
                        ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/10 shadow-emerald-500/10'
                        : plan.is_popular
                        ? 'border-2 border-blue-400 shadow-blue-500/5'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Active Pill or Popular Badge on Top */}
                    {active ? (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>CURRENT ACTIVE PLAN</span>
                      </div>
                    ) : plan.badge ? (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Flame size={12} className="text-amber-300" />
                        <span>{plan.badge}</span>
                      </div>
                    ) : null}

                    {/* Plan Header */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-bold text-slate-900 tracking-tight">{plan.name}</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {plan.duration_days} Days
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed min-h-[34px]">
                          {plan.description || `${plan.duration_days} days complete cloud system access.`}
                        </p>
                      </div>

                      {/* Price Section */}
                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-slate-500">{plan.currency || 'RM'}</span>
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {typeof plan.price === 'number' ? plan.price.toFixed(2) : plan.price}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">/{plan.duration_days}d</span>
                        </div>
                        {plan.savings_text && (
                          <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            {plan.savings_text}
                          </span>
                        )}
                      </div>

                      {/* Features List */}
                      <div className="space-y-2.5 pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Included System Features
                        </span>
                        <ul className="space-y-2 p-0 m-0 list-none">
                          {features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                              <Check size={14} className="text-emerald-500 shrink-0 mt-0.5 font-bold" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Bottom CTA Button */}
                    <div className="pt-6 mt-4 border-t border-slate-100">
                      {active ? (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 text-center shadow-2xs">
                          <CheckCircle2 size={15} />
                          <span>Currently Active</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenUpgradeModal(plan)}
                          className="w-full py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#073675] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5 border-0"
                        >
                          <Zap size={14} className="text-yellow-400" />
                          <span>Switch to this Plan</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Upgrade / Switch Confirmation Modal */}
      {isUpgradeModalOpen && selectedPlanToUpgrade && activeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsUpgradeModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
                <Crown size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirm Plan Upgrade</h3>
                <p className="text-xs text-slate-500">
                  Switch subscription package for <strong>{activeCompany.name}</strong>
                </p>
              </div>
            </div>

            {/* Plan Comparison Summary Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">New Membership Tier:</span>
                <strong className="text-slate-900 font-bold">{selectedPlanToUpgrade.name}</strong>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Coverage Duration:</span>
                <strong className="text-slate-900 font-bold">{selectedPlanToUpgrade.duration_days} Days</strong>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Package Price:</span>
                <strong className="text-emerald-700 font-bold text-sm">
                  {selectedPlanToUpgrade.currency || 'RM'} {Number(selectedPlanToUpgrade.price).toFixed(2)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">New Expiration Date:</span>
                <strong className="text-slate-900 font-bold">
                  {new Date(Date.now() + selectedPlanToUpgrade.duration_days * 86400000).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </div>
            </div>

            {/* Payment / Activation Method Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Billing / Payment Method:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="Online Banking / FPX">Online Banking / FPX Instant Transfer</option>
                <option value="Bank Transfer">Direct Bank Transfer / TT</option>
                <option value="Corporate Cheque">Corporate Cheque / Deposit</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Activating this tier will immediately apply the new subscription license and generate an automated official corporate invoice record.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                disabled={submittingUpgrade}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpgrade}
                disabled={submittingUpgrade}
                className="px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#073675] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 border-0 disabled:opacity-50"
              >
                {submittingUpgrade ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Activating License...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirm & Activate Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
