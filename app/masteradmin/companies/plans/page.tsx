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
import CompanyPaymentModal, { PaymentTabType } from '@/components/CompanyPaymentModal';

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

  // Payment Modal State ("amar format" CompanyPaymentModal)
  const [paymentModalCompany, setPaymentModalCompany] = useState<Company | null>(null);
  const [paymentModalTargetPlan, setPaymentModalTargetPlan] = useState<SubscriptionPlan | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Live 1-second countdown ticker
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleOpenPaymentForPlan = (plan: SubscriptionPlan) => {
    if (!activeCompany) return;
    setPaymentModalCompany(activeCompany);
    setPaymentModalTargetPlan(plan);
  };

  const handleOpenPaymentForCompany = (comp: Company) => {
    setSelectedCompanyId(comp.id);
    setPaymentModalCompany(comp);
    const activePlan = getCompanyActivePlan(comp);
    setPaymentModalTargetPlan(activePlan || plans[0] || null);
  };

  const isPlanActive = (plan: SubscriptionPlan) => {
    if (!normalizedActiveKey) return false;
    const cleanPlanKey = (plan.plan_key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPlanName = (plan.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanPlanKey === normalizedActiveKey || cleanPlanName === normalizedActiveKey;
  };

  // Helper to determine active plan object for any company
  const getCompanyActivePlan = (comp: Company): SubscriptionPlan | null => {
    const rawKey = (comp.subscription_plan_key || (comp as any).subscription_package || '').trim().toLowerCase();
    const cleanKey = rawKey.replace(/[^a-z0-9]/g, '');
    if (!cleanKey) return null;
    return (
      plans.find((p) => {
        const pk = (p.plan_key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const pn = (p.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return pk === cleanKey || pn === cleanKey;
      }) || null
    );
  };

  // Helper to calculate timeline and expiry for any company
  const getCompanyTimeline = (comp: Company) => {
    const expiresAt = comp.subscription_expires_at;
    const startsAt = comp.subscription_starts_at;
    const status = comp.subscription_status || 'active';

    if (!expiresAt) {
      return {
        hasExpiry: false,
        isExpired: false,
        daysLeft: null,
        formattedExpires: 'Unlimited / Not Set',
        formattedStarts: startsAt ? new Date(startsAt).toLocaleDateString('en-GB') : 'Initial Setup',
        statusBadge: status === 'trial_active' ? 'Trial' : 'Active',
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
      statusBadge: isExpired ? 'Expired' : status === 'trial_active' ? 'Trial' : 'Active',
    };
  };

  // Helper to compute live ticking countdown info
  const getCountdownInfo = (expiresAtStr?: string | null) => {
    if (!expiresAtStr) {
      return {
        hasExpiry: false,
        isExpired: false,
        isExpiringSoon: false,
        isExpiringVerySoon: false,
        label: 'No Expiry Set',
        color: 'text-slate-400 bg-slate-50 border-slate-200',
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
        color: 'text-slate-400 bg-slate-50 border-slate-200',
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
        label: pastDays > 0 ? `Expired (${pastDays}d ${pastHours}h ago)` : `Expired (<1d ago)`,
        color: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }

    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const isExpiringSoon = days <= 7;
    const isExpiringVerySoon = days <= 1;

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
      color: isExpiringSoon
        ? 'bg-amber-50 text-amber-800 border-amber-300'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  };

  const handlePaymentSubmit = async (paymentInfo: {
    amount: number;
    method: string;
    reference: string;
    bankName: string;
    notes: string;
    tab: PaymentTabType;
    slipData?: string | null;
    slipName?: string;
    planKey?: string;
    planName?: string;
    packageDurationDays?: number;
  }) => {
    if (!paymentModalCompany) return;

    setIsSubmittingPayment(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
      const assignedPlan = plans.find(
        (p) =>
          p.plan_key === (paymentInfo.planKey || paymentModalCompany.subscription_plan_key) ||
          p.name?.toLowerCase() === (paymentInfo.planName || paymentModalCompany.subscription_plan_key)?.toLowerCase()
      );
      const selectedPlanName = paymentInfo.planName || assignedPlan?.name || paymentModalCompany.subscription_plan_key || 'Subscription Package';
      const selectedPlanKey = paymentInfo.planKey || assignedPlan?.plan_key || paymentModalCompany.subscription_plan_key || '1_month';
      const selectedDurationDays = Number(paymentInfo.packageDurationDays || assignedPlan?.duration_days) || 30;
      const total = paymentInfo.amount;

      let updatedWalletBalance = (paymentModalCompany as any).wallet_balance;
      if (paymentInfo.tab === 'wallet') {
        const deductRes = await fetch(
          `${apiBase}/companies/${encodeURIComponent(paymentModalCompany.id)}/wallet/deduct-balance`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              amount: total,
              reference: paymentInfo.reference,
              notes: paymentInfo.notes || `Wallet payment for ${selectedPlanName}`,
              requested_by: currentUser?.name || 'Master Admin',
            }),
          }
        );
        const deductData = await deductRes.json();
        if (!deductRes.ok || !deductData.success) {
          throw new Error(deductData.message || 'Insufficient wallet balance for this payment.');
        }
        updatedWalletBalance = deductData.wallet_balance;
      }

      // 1. Create official Paid Corporate Invoice record
      try {
        await createInvoice({
          company_id: paymentModalCompany.id,
          company_name: paymentModalCompany.name,
          customer_name: paymentModalCompany.name,
          customer_email: paymentModalCompany.email || '',
          customer_phone: paymentModalCompany.phone || '',
          customer_address: paymentModalCompany.address || '',
          package_name: selectedPlanName,
          invoice_date: new Date().toISOString().slice(0, 10),
          items: [
            {
              id: '1',
              description: `Subscription Access: ${selectedPlanName} (${selectedDurationDays} Days)`,
              qty: 1,
              quantity: 1,
              unit_price: total,
              total: total,
              total_price: total,
            },
          ],
          total_amount: total,
          amount_paid: total,
          balance_due: 0,
          currency: 'MYR',
          payment_status: 'Paid',
          payment_method: paymentInfo.method,
          payment_reference: paymentInfo.reference,
          bank_name: paymentInfo.bankName,
          notes: paymentInfo.notes || `Payment recorded directly by Master Admin for ${paymentModalCompany.name}`,
        });
      } catch (invErr) {
        console.warn('Auto invoice notice:', invErr);
      }

      // 2. Activate / Extend company subscription
      const now = new Date();
      const expires = new Date();
      expires.setDate(expires.getDate() + selectedDurationDays);

      const payload = {
        subscription_plan_key: selectedPlanKey,
        subscription_starts_at: now.toISOString(),
        subscription_expires_at: expires.toISOString(),
        subscription_status: 'active',
        extra_days: selectedDurationDays,
        subscription_notes: `Subscription payment of RM ${total.toFixed(2)} (${selectedPlanName}) recorded via ${paymentInfo.method}.`,
      };

      await updateCompanySubscription(paymentModalCompany.id, payload);

      // 3. Update local company storage
      updateStoredCompany({
        ...paymentModalCompany,
        wallet_balance: updatedWalletBalance,
        subscription_plan_key: selectedPlanKey,
        subscription_starts_at: payload.subscription_starts_at,
        subscription_expires_at: payload.subscription_expires_at,
        subscription_status: 'active',
      });

      // 4. Update current view state
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === paymentModalCompany.id
            ? {
                ...c,
                wallet_balance: updatedWalletBalance,
                subscription_plan_key: selectedPlanKey,
                subscription_starts_at: payload.subscription_starts_at,
                subscription_expires_at: payload.subscription_expires_at,
                subscription_status: 'active',
              }
            : c
        )
      );

      setPaymentModalCompany(null);
      setPaymentModalTargetPlan(null);
      showToast('success', `Payment confirmed! Subscription for "${paymentModalCompany.name}" updated to ${selectedPlanName}.`);
    } catch (err: any) {
      console.error('Failed to process payment:', err);
      showToast('error', err.message || 'Unable to complete payment and update subscription.');
    } finally {
      setIsSubmittingPayment(false);
    }
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
                          onClick={() => handleOpenPaymentForPlan(plan)}
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

          {/* Active Subscription Plan Details Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Active Subscription Plans
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Total Companies: {companies.length}
              </span>
            </div>

            {/* Table with Horizontal Scroll */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
              <table className="w-full text-left border-collapse text-xs min-w-[1720px]">
                <thead>
                  <tr className="bg-slate-50/95 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Company Name</th>
                    <th className="py-3.5 px-4 min-w-[150px]">ROC Number</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Sector / Industry</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Current Active Plan</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Plan Rate</th>
                    <th className="py-3.5 px-4 min-w-[120px]">Duration</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Activation Date</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Expiration Date</th>
                    <th className="py-3.5 px-4 min-w-[210px]">Live Countdown</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Validity Status</th>
                    <th className="py-3.5 px-4 text-center min-w-[150px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-400 italic">
                        No company records found.
                      </td>
                    </tr>
                  ) : (
                    companies.map((comp, idx) => {
                      const activePlan = getCompanyActivePlan(comp);
                      const timeline = getCompanyTimeline(comp);
                      const countdown = getCountdownInfo(comp.subscription_expires_at);
                      const isCurrentlyInspected = comp.id === activeCompany?.id;

                      return (
                        <tr
                          key={comp.id}
                          className={`transition-colors hover:bg-blue-50/40 ${isCurrentlyInspected ? 'bg-blue-50/25' : ''}`}
                        >
                          {/* 1. Serial # */}
                          <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {String(idx + 1).padStart(2, '0')}
                          </td>

                          {/* 2. Company Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] font-black text-xs flex items-center justify-center border border-blue-100 shrink-0">
                                {comp.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{comp.name}</span>
                                {isCurrentlyInspected && (
                                  <span className="text-[10px] bg-blue-100 text-[#0b4da2] font-bold px-1.5 py-0.5 rounded">
                                    Inspecting
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. ROC Number */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {comp.roc ? (
                              <span className="font-mono text-xs text-slate-700 font-semibold px-2 py-0.5 rounded bg-slate-100/80 border border-slate-200/60">
                                {comp.roc}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Not Provided</span>
                            )}
                          </td>

                          {/* 4. Sector / Industry */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                              {comp.sector || 'General Corporate'}
                            </span>
                          </td>

                          {/* 5. Current Active Plan */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {activePlan ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs shadow-2xs">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                <span>{activePlan.name}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-xs">
                                <AlertCircle size={13} className="text-amber-600 shrink-0" />
                                <span>{comp.subscription_plan_key || (comp as any).subscription_package || 'No Plan Active'}</span>
                              </div>
                            )}
                          </td>

                          {/* 6. Plan Rate */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                            {activePlan ? (
                              <span className="font-extrabold text-slate-900 text-xs">
                                {activePlan.currency || 'RM'} {Number(activePlan.price).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">N/A</span>
                            )}
                          </td>

                          {/* 7. Duration */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {activePlan ? (
                              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0b4da2] font-semibold text-[11px] border border-blue-100">
                                {activePlan.duration_days} Days
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </td>

                          {/* 8. Activation Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 font-medium">
                            {timeline.formattedStarts}
                          </td>

                          {/* 9. Expiration Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700 font-semibold">
                            {timeline.formattedExpires}
                          </td>

                          {/* 10. Live Countdown */}
                          <td className="py-3.5 px-4 whitespace-nowrap" suppressHydrationWarning>
                            {countdown.hasExpiry ? (
                              <div
                                suppressHydrationWarning
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border shadow-2xs ${
                                  mounted ? countdown.color : 'text-slate-400 bg-slate-50 border-slate-200'
                                }`}
                              >
                                {countdown.isExpired ? (
                                  <AlertCircle size={13} className="text-rose-600 shrink-0" />
                                ) : countdown.isExpiringSoon ? (
                                  <Hourglass size={13} className="text-amber-600 animate-spin shrink-0" />
                                ) : (
                                  <Clock size={13} className="text-emerald-600 shrink-0" />
                                )}
                                <span suppressHydrationWarning className="tracking-tight">
                                  {mounted ? countdown.label : '...'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No Expiry Set</span>
                            )}
                          </td>

                          {/* 11. Validity Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {timeline.hasExpiry ? (
                              timeline.isExpired ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  Expired
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-2xs ${
                                  (timeline.daysLeft || 0) <= 7
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    (timeline.daysLeft || 0) <= 7 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`} />
                                  Active
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Permanent / Active
                              </span>
                            )}
                          </td>

                          {/* 12. Action */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentForCompany(comp)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-[#0b4da2] text-[#0b4da2] hover:text-white border border-blue-200 hover:border-transparent font-bold text-xs transition-all shadow-2xs hover:shadow-md cursor-pointer"
                            >
                              <RefreshCw size={12} />
                              <span>Change Plan</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Official Platform Company Payment Modal ("amar format") */}
      <CompanyPaymentModal
        isOpen={!!paymentModalCompany}
        onClose={() => {
          setPaymentModalCompany(null);
          setPaymentModalTargetPlan(null);
        }}
        data={
          paymentModalCompany
            ? {
                id: paymentModalCompany.id,
                companyName: paymentModalCompany.name,
                roc: paymentModalCompany.roc,
                email: paymentModalCompany.email,
                phone: paymentModalCompany.phone,
                address: paymentModalCompany.address,
                planPackage: paymentModalTargetPlan?.plan_key || paymentModalCompany.subscription_plan_key || '1_month',
                packageDurationDays: paymentModalTargetPlan?.duration_days,
                amount: Number(paymentModalTargetPlan?.price) || 199,
                walletBalance: (paymentModalCompany as any).wallet_balance,
                walletAccountNo: (paymentModalCompany as any).wallet_account_no,
              }
            : null
        }
        isSubmitting={isSubmittingPayment}
        onSubmit={handlePaymentSubmit}
      />
    </div>
  );
}
