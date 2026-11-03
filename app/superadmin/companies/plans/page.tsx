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
  CreditCard,
  DollarSign,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Hourglass,
  Layers,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  SubscriptionPlan,
  CompanySubscriptionRecord,
  CompanyInvoice,
  fetchSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  fetchCompaniesWithSubscriptions,
  updateCompanySubscription,
  fetchInvoices,
  createInvoice,
  markInvoicePaid,
} from '@/lib/companyTrialAndFinanceStorage';

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State for Plan CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields for Plan CRUD
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
  const [invoices, setInvoices] = useState<CompanyInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [selectedPackageFilter, setSelectedPackageFilter] = useState<string>('all');
  const [companySearch, setCompanySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Subscription Extend/Duration Modal state
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [targetCompany, setTargetCompany] = useState<CompanySubscriptionRecord | null>(null);
  const [modalPlanKey, setModalPlanKey] = useState('');
  const [modalExpiresAt, setModalExpiresAt] = useState('');
  const [modalStatus, setModalStatus] = useState('active');
  const [modalNotes, setModalNotes] = useState('');
  const [customAddDays, setCustomAddDays] = useState<number>(30);
  const [savingSubscription, setSavingSubscription] = useState(false);

  // Settle / Record Payment Modal state (Dena Paona / Due Balance / Half Payment)
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleCompany, setSettleCompany] = useState<CompanySubscriptionRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<string>('Bank Transfer');
  const [settlePaymentRef, setSettlePaymentRef] = useState<string>('');
  const [settleBankName, setSettleBankName] = useState<string>('Maybank');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

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

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    loadPlans();
    loadCompanies();
    loadInvoices();
  }, []);

  // Real-time live countdown ticker (ticks every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Helper to compute financials / receivables (Dena Paona / Due Balance) for a company
   */
  const getCompanyFinanceInfo = (comp: CompanySubscriptionRecord) => {
    const assignedPlan = plans.find((p) => p.plan_key === comp.subscription_plan_key);
    const nominalPrice = assignedPlan ? Number(assignedPlan.price) || 0 : 0;

    // Match invoices by company_id OR company_name (case-insensitive)
    const compInvoices = invoices.filter((inv) => {
      const matchId =
        inv.company_id && comp.id && String(inv.company_id).toLowerCase() === String(comp.id).toLowerCase();
      const matchName =
        inv.company_name &&
        comp.name &&
        inv.company_name.toLowerCase().trim() === comp.name.toLowerCase().trim();
      return Boolean(matchId || matchName);
    });

    if (compInvoices.length > 0) {
      const totalAmount = compInvoices.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);
      const amountPaid = compInvoices.reduce((acc, inv) => acc + (Number(inv.amount_paid) || 0), 0);
      const balanceDue = compInvoices.reduce((acc, inv) => acc + (Number(inv.balance_due) || 0), 0);

      let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Trial' = 'Paid';
      if (balanceDue <= 0 && amountPaid > 0) {
        paymentStatus = 'Paid';
      } else if (amountPaid > 0 && balanceDue > 0) {
        paymentStatus = 'Partial';
      } else if (amountPaid === 0 && balanceDue > 0) {
        paymentStatus = 'Unpaid';
      } else if (comp.subscription_status === 'trial_active') {
        paymentStatus = 'Trial';
      }

      return {
        totalAmount,
        amountPaid,
        balanceDue,
        currency: compInvoices[0]?.currency || 'RM',
        paymentStatus,
        hasDue: balanceDue > 0,
        invoices: compInvoices,
        latestInvoice: compInvoices[0],
      };
    }

    // Default fallback if no invoices logged yet in the database
    if (comp.subscription_status === 'trial_active') {
      return {
        totalAmount: nominalPrice,
        amountPaid: 0,
        balanceDue: 0,
        currency: 'RM',
        paymentStatus: 'Trial' as const,
        hasDue: false,
        invoices: [],
        latestInvoice: null,
      };
    }

    if (comp.subscription_status === 'active') {
      return {
        totalAmount: nominalPrice,
        amountPaid: nominalPrice,
        balanceDue: 0,
        currency: 'RM',
        paymentStatus: 'Paid' as const,
        hasDue: false,
        invoices: [],
        latestInvoice: null,
      };
    }

    const fallbackStatus: 'Unpaid' | 'Paid' = nominalPrice > 0 ? 'Unpaid' : 'Paid';
    return {
      totalAmount: nominalPrice,
      amountPaid: 0,
      balanceDue: nominalPrice,
      currency: 'RM',
      paymentStatus: fallbackStatus,
      hasDue: nominalPrice > 0,
      invoices: [],
      latestInvoice: null,
    };
  };

  // Open Duration & Subscription Modal
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
    setCustomAddDays(30);
    setSubscriptionModalOpen(true);
  };

  // Quick Extend Duration (adds days to current expiry)
  const handleQuickExtend = (days: number) => {
    let base = modalExpiresAt ? new Date(modalExpiresAt).getTime() : Date.now();
    if (isNaN(base) || base < Date.now()) {
      base = Date.now();
    }
    const newDate = new Date(base + days * 86400000);
    const tzOffset = newDate.getTimezoneOffset() * 60000;
    setModalExpiresAt(new Date(newDate.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  // Save Duration & Subscription Changes
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
        const formattedExpiry = modalExpiresAt ? new Date(modalExpiresAt).toLocaleDateString('en-GB') : '';
        setNotification({
          type: 'success',
          message: `Subscription duration for "${targetCompany.name}" updated successfully! (Valid until ${formattedExpiry})`,
        });
        setSubscriptionModalOpen(false);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update company subscription duration',
      });
    } finally {
      setSavingSubscription(false);
    }
  };

  // Toggle Active / Inactive Status for Company
  const handleToggleActiveCompany = async (comp: CompanySubscriptionRecord) => {
    const isCurrentlyInactive =
      comp.subscription_status === 'inactive' || comp.status === 'inactive';
    const newStatus = isCurrentlyInactive ? 'active' : 'inactive';
    const actionText = isCurrentlyInactive ? 'Activate' : 'Deactivate';

    if (
      !confirm(
        `Are you sure you want to ${actionText.toLowerCase()} "${comp.name}"? ${
          isCurrentlyInactive
            ? 'Their Master Admin portal access and subscription will be enabled.'
            : 'Their Master Admin portal access and subscription will be temporarily disabled.'
        }`
      )
    ) {
      return;
    }

    try {
      const res = await updateCompanySubscription(comp.id, {
        subscription_status: newStatus,
        subscription_notes: `Status toggled to ${newStatus} on ${new Date().toLocaleDateString('en-GB')}`,
      });

      if (res.success) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === comp.id
              ? { ...c, subscription_status: newStatus, status: newStatus }
              : c
          )
        );
        setNotification({
          type: 'success',
          message: `Company "${comp.name}" is now ${isCurrentlyInactive ? 'Active' : 'Inactive'}.`,
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update company status',
      });
    }
  };

  // Open Settle / Record Payment Modal
  const handleOpenSettleModal = (comp: CompanySubscriptionRecord) => {
    const fin = getCompanyFinanceInfo(comp);
    setSettleCompany(comp);

    if (fin.balanceDue > 0) {
      setSettleAmount(fin.balanceDue.toFixed(2));
    } else if (fin.amountPaid === 0 && fin.totalAmount > 0) {
      setSettleAmount((fin.totalAmount / 2).toFixed(2)); // Default to 50% half payment
    } else {
      setSettleAmount(fin.totalAmount > 0 ? (fin.totalAmount / 2).toFixed(2) : '100.00');
    }

    setSettlePaymentMethod('Bank Transfer');
    setSettlePaymentRef(`PAY-${Date.now().toString().slice(-6)}`);
    setSettleBankName('Maybank');
    setSettleNotes('');
    setSettleModalOpen(true);
  };

  // Record / Settle Payment (Full or Half Payment)
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCompany) return;

    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setIsRecordingPayment(true);
    try {
      const fin = getCompanyFinanceInfo(settleCompany);
      const assignedPlan = plans.find((p) => p.plan_key === settleCompany.subscription_plan_key);
      const planPrice = assignedPlan ? Number(assignedPlan.price) || 0 : fin.totalAmount || 0;

      if (fin.latestInvoice) {
        // Record payment against existing invoice
        const currentPaid = Number(fin.latestInvoice.amount_paid) || 0;
        const total = Number(fin.latestInvoice.total_amount) || 0;
        const newPaid = Math.min(total, currentPaid + amount);

        await markInvoicePaid(fin.latestInvoice.id, {
          payment_method: settlePaymentMethod,
          payment_reference: settlePaymentRef,
          amount_paid: newPaid,
          bank_name: settleBankName,
          notes: settleNotes || `Payment of RM ${amount.toFixed(2)} recorded on ${new Date().toLocaleDateString('en-GB')}`,
        });
      } else {
        // Create new invoice with partial/full payment
        const total = planPrice > 0 ? planPrice : amount;
        const balance = Math.max(0, total - amount);
        const pStatus = balance <= 0 ? 'Paid' : amount > 0 ? 'Partial' : 'Pending';

        await createInvoice({
          company_id: settleCompany.id,
          company_name: settleCompany.name,
          customer_name: settleCompany.name,
          customer_email: settleCompany.email,
          customer_phone: settleCompany.phone,
          customer_address: settleCompany.address,
          package_name: assignedPlan?.name || 'Subscription Package',
          invoice_date: new Date().toISOString().slice(0, 10),
          items: [
            {
              description: `Subscription Access: ${assignedPlan?.name || 'ERP Agency Access'}`,
              qty: 1,
              unit_price: total,
              total: total,
            },
          ],
          total_amount: total,
          amount_paid: amount,
          balance_due: balance,
          currency: 'MYR',
          payment_status: pStatus,
          payment_method: settlePaymentMethod,
          payment_reference: settlePaymentRef,
          bank_name: settleBankName,
          notes: settleNotes || `Payment recorded directly from Company Subscriptions Table.`,
        });
      }

      // If company was on trial or inactive, activate subscription
      if (settleCompany.subscription_status !== 'active') {
        await updateCompanySubscription(settleCompany.id, {
          subscription_status: 'active',
          subscription_notes: `Active subscription with payment of RM ${amount.toFixed(2)} recorded.`,
        });
      }

      await loadInvoices();
      await loadCompanies();

      setNotification({
        type: 'success',
        message: `Payment of RM ${amount.toFixed(2)} recorded for ${settleCompany.name}! Updated due balance accordingly.`,
      });
      setSettleModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
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

  // Overall Financial & Due Metrics
  const dueMetrics = React.useMemo(() => {
    let dueCount = 0;
    let totalDueAmount = 0;
    let partialCount = 0;
    let paidFullCount = 0;
    let inactiveCount = 0;

    companies.forEach((c) => {
      const fin = getCompanyFinanceInfo(c);
      const isInactive = c.subscription_status === 'inactive' || c.status === 'inactive';
      if (isInactive) {
        inactiveCount++;
      }
      if (fin.hasDue) {
        dueCount++;
        totalDueAmount += fin.balanceDue;
      }
      if (fin.paymentStatus === 'Partial') {
        partialCount++;
      }
      if (fin.paymentStatus === 'Paid') {
        paidFullCount++;
      }
    });

    return { dueCount, totalDueAmount, partialCount, paidFullCount, inactiveCount };
  }, [companies, invoices, plans]);

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
      const fin = getCompanyFinanceInfo(c);
      const isInactive = c.subscription_status === 'inactive' || c.status === 'inactive';

      if (statusFilter !== 'all') {
        if (statusFilter === 'inactive' && !isInactive) return false;
        if (statusFilter === 'active' && (isInactive || cd.isExpired)) return false;
        if (statusFilter === 'has_due' && !fin.hasDue) return false;
        if (statusFilter === 'paid_full' && fin.paymentStatus !== 'Paid') return false;
        if (statusFilter === 'partial' && fin.paymentStatus !== 'Partial') return false;
        if (statusFilter === 'trial' && (c.subscription_status !== 'trial_active' || isInactive)) return false;
        if (statusFilter === 'expiring_soon' && (!cd.isExpiringSoon || cd.isExpired || isInactive)) return false;
        if (statusFilter === 'expired' && (!cd.isExpired || isInactive) && c.subscription_status !== 'expired') return false;
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
  }, [companies, invoices, plans, selectedPackageFilter, statusFilter, companySearch, currentTime]);

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
            className="text-slate-400 hover:text-slate-700 font-bold ml-2 cursor-pointer"
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
                  {/* Heading */}
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
      {/* SECTION: COMPANY SUBSCRIPTIONS & FINANCIAL TRACKER (DENA PAONA)*/}
      {/* ============================================================== */}
      <div id="companies-subscription-table" className="mt-12 space-y-5">
        {/* Header with Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/companies" className="hover:text-[#0b4da2] no-underline">
                Company Management
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Subscriptions &amp; Receivables</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="text-[#0b4da2]" size={24} />
              <span>Company Subscriptions &amp; Due Balances</span>
              <span className="text-xs font-black text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 ml-1">
                {filteredCompanies.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor active subscriptions, countdowns, and financial dues (dena paona). Extend subscription duration, toggle active/inactive status, or record full and half payments.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                loadCompanies();
                loadInvoices();
              }}
              disabled={loadingCompanies || loadingInvoices}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-300 shadow-2xs"
            >
              <RefreshCw size={13} className={loadingCompanies || loadingInvoices ? 'animate-spin' : ''} />
              <span>Refresh Table</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {/* 1. Total Subscribed Companies */}
          <div className="admin-stat-card bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Companies
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">{companies.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across all plans</div>
          </div>

          {/* 2. Active Subscriptions */}
          <div
            onClick={() => setStatusFilter('active')}
            className={`admin-stat-card bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
              statusFilter === 'active'
                ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                : 'border-slate-200/90 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Active
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-2">
              {companies.filter((c) => {
                const cd = getCountdownInfo(c.subscription_expires_at);
                const isInactive = c.subscription_status === 'inactive' || c.status === 'inactive';
                return !cd.isExpired && c.subscription_status === 'active' && !isInactive;
              }).length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Live portal active</div>
          </div>

          {/* 3. Inactive Companies */}
          <div
            onClick={() => setStatusFilter('inactive')}
            className={`admin-stat-card bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
              statusFilter === 'inactive'
                ? 'border-rose-400 ring-2 ring-rose-400/20'
                : 'border-slate-200/90 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                Inactive
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <PowerOff size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-2">
              {dueMetrics.inactiveCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Deactivated access</div>
          </div>

          {/* 4. Due & Partial Accounts (Dena Paona) */}
          <div
            onClick={() => setStatusFilter('has_due')}
            className={`admin-stat-card bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
              statusFilter === 'has_due'
                ? 'border-rose-400 ring-2 ring-rose-400/20'
                : 'border-slate-200/90 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle size={14} className="text-rose-600" />
                <span>Due Balance</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Coins size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-2">
              {dueMetrics.dueCount}
            </div>
            <div className="text-[11px] font-bold text-rose-700 mt-0.5 font-mono">
              RM {dueMetrics.totalDueAmount.toFixed(2)} Due
            </div>
          </div>

          {/* 5. Free Trials */}
          <div
            onClick={() => setStatusFilter('trial')}
            className={`admin-stat-card bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
              statusFilter === 'trial'
                ? 'border-blue-400 ring-2 ring-blue-400/20'
                : 'border-slate-200/90 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Free Trials
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#0b4da2] mt-2">
              {companies.filter((c) => c.subscription_status === 'trial_active').length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">3-Day evaluation tier</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Primary Dropdown: Package Selector */}
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <Layers size={14} className="text-[#0b4da2]" />
                <span>Package:</span>
              </label>
              <select
                value={selectedPackageFilter}
                onChange={(e) => setSelectedPackageFilter(e.target.value)}
                className="w-full sm:w-auto flex-1 max-w-sm px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] cursor-pointer"
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

            {/* Status & Search Filter */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white shadow-2xs focus:outline-none focus:border-[#0b4da2] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="has_due">Has Due Balance (Dena)</option>
                <option value="active">Active Subscription</option>
                <option value="inactive">Inactive / Deactivated</option>
                <option value="paid_full">Paid in Full</option>
                <option value="partial">Partial Paid</option>
                <option value="trial">3-Day Trial</option>
                <option value="expiring_soon">Expiring Soon (&le;7d)</option>
                <option value="expired">Expired</option>
              </select>

              <div className="relative w-48 sm:w-60">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search company, ROC, email..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] bg-white shadow-2xs"
                />
                {companySearch && (
                  <button
                    type="button"
                    onClick={() => setCompanySearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Pill Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 mr-1">Filter:</span>
            {[
              { key: 'all', label: `All (${companies.length})` },
              { key: 'has_due', label: `Has Due Balance (${dueMetrics.dueCount})`, isDue: true },
              { key: 'active', label: `Active (${companies.filter((c) => {
                const cd = getCountdownInfo(c.subscription_expires_at);
                const isInactive = c.subscription_status === 'inactive' || c.status === 'inactive';
                return !cd.isExpired && c.subscription_status === 'active' && !isInactive;
              }).length})` },
              { key: 'inactive', label: `Inactive (${dueMetrics.inactiveCount})` },
              { key: 'partial', label: `Partial Paid (${dueMetrics.partialCount})` },
              { key: 'paid_full', label: `Paid In Full (${dueMetrics.paidFullCount})` },
              {
                key: 'trial',
                label: `3-Day Trial (${companies.filter((c) => c.subscription_status === 'trial_active').length})`,
              },
              {
                key: 'expiring_soon',
                label: `Expiring Soon (${
                  companies.filter((c) => {
                    const cd = getCountdownInfo(c.subscription_expires_at);
                    const isInactive = c.subscription_status === 'inactive' || c.status === 'inactive';
                    return cd.isExpiringSoon && !cd.isExpired && !isInactive;
                  }).length
                })`,
              },
              {
                key: 'expired',
                label: `Expired (${
                  companies.filter((c) => {
                    const cd = getCountdownInfo(c.subscription_expires_at);
                    return cd.isExpired;
                  }).length
                })`,
              },
            ].map((st) => {
              const isSelected = statusFilter === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                      : st.isDue && dueMetrics.dueCount > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Table with Financial / Due Columns & Action Buttons */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            <table className="w-full text-left border-collapse text-xs min-w-[1700px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-3 text-center w-[50px] min-w-[50px]">#</th>
                  <th className="py-3.5 px-4 w-[240px] min-w-[240px]">Company Name</th>
                  <th className="py-3.5 px-4 w-[170px] min-w-[170px]">Package Plan</th>
                  <th className="py-3.5 px-4 w-[130px] min-w-[130px]">Package Total</th>
                  <th className="py-3.5 px-4 w-[130px] min-w-[130px]">Amount Paid</th>
                  <th className="py-3.5 px-4 w-[160px] min-w-[160px]">Due Balance (Dena)</th>
                  <th className="py-3.5 px-4 w-[160px] min-w-[160px]">Payment Status</th>
                  <th className="py-3.5 px-4 w-[160px] min-w-[160px]">Expire Date</th>
                  <th className="py-3.5 px-4 w-[180px] min-w-[180px]">Countdown</th>
                  <th className="py-3.5 px-4 w-[130px] min-w-[130px]">Subscription</th>
                  <th className="py-3.5 px-4 text-center w-[190px] min-w-[190px] bg-slate-50/90">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {loadingCompanies || loadingInvoices ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <div className="w-7 h-7 border-2 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium text-slate-600">Loading company subscriptions &amp; receivables...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-500">
                      <Building2 size={36} className="text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-slate-700 text-sm">No Companies Found</div>
                      <p className="text-xs text-slate-400 mt-1">
                        {companySearch || statusFilter !== 'all' || selectedPackageFilter !== 'all'
                          ? 'Try clearing your search terms or filters.'
                          : 'No company subscriptions available.'}
                      </p>
                      {(statusFilter !== 'all' || selectedPackageFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('all');
                            setSelectedPackageFilter('all');
                            setCompanySearch('');
                          }}
                          className="mt-3 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0b4da2] text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((comp, idx) => {
                    const assignedPlan = plans.find((p) => p.plan_key === comp.subscription_plan_key);
                    const countdown = getCountdownInfo(comp.subscription_expires_at, comp.subscription_starts_at);
                    const fin = getCompanyFinanceInfo(comp);
                    const isInactive = comp.subscription_status === 'inactive' || comp.status === 'inactive';
                    const isTrial = comp.subscription_status === 'trial_active';

                    return (
                      <tr
                        key={comp.id}
                        className="hover:bg-blue-50/35 transition-colors group"
                      >
                        {/* 1. # Index */}
                        <td className="py-3.5 px-3 text-center align-middle font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </td>

                        {/* 2. Company Name */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs overflow-hidden shrink-0 shadow-2xs">
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
                              <div
                                className="font-bold text-slate-900 text-xs truncate max-w-[180px] group-hover:text-[#0b4da2] transition-colors"
                                title={comp.name}
                              >
                                {comp.name}
                              </div>
                              {comp.roc && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ROC: <span className="text-slate-600 font-semibold">{comp.roc}</span>
                                </div>
                              )}
                              {comp.sector && (
                                <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                  {comp.sector}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Package Plan */}
                        <td className="py-3.5 px-4 align-middle">
                          {assignedPlan ? (
                            <div>
                              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 flex-wrap">
                                <span>{assignedPlan.name}</span>
                                {assignedPlan.badge && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white shadow-2xs">
                                    {assignedPlan.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {assignedPlan.duration_days} Days Access
                              </div>
                            </div>
                          ) : comp.subscription_plan_key ? (
                            <span className="font-bold text-slate-800 text-xs capitalize">
                              {comp.subscription_plan_key.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* 4. Package Total */}
                        <td className="py-3.5 px-4 align-middle font-mono font-bold text-slate-800 text-xs">
                          RM {fin.totalAmount.toFixed(2)}
                        </td>

                        {/* 5. Amount Paid */}
                        <td className="py-3.5 px-4 align-middle">
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-200/70 px-2 py-0.5 rounded-md text-xs inline-block">
                            RM {fin.amountPaid.toFixed(2)}
                          </span>
                        </td>

                        {/* 6. Due Balance (Dena) */}
                        <td className="py-3.5 px-4 align-middle">
                          {fin.balanceDue > 0 ? (
                            <div className="inline-flex items-center gap-1 font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                              <AlertCircle size={11} className="text-rose-600 shrink-0" />
                              <span>RM {fin.balanceDue.toFixed(2)} Due</span>
                            </div>
                          ) : (
                            <span className="font-mono text-slate-400 text-xs font-semibold">RM 0.00</span>
                          )}
                        </td>

                        {/* 7. Payment Status */}
                        <td className="py-3.5 px-4 align-middle">
                          {fin.paymentStatus === 'Paid' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap shadow-2xs">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Paid (Full)
                            </span>
                          ) : fin.paymentStatus === 'Partial' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 whitespace-nowrap shadow-2xs">
                              <Coins size={12} className="text-amber-600" />
                              Partial Paid
                            </span>
                          ) : fin.paymentStatus === 'Trial' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#0b4da2] border border-blue-200 whitespace-nowrap shadow-2xs">
                              <Sparkles size={12} className="text-[#0b4da2]" />
                              3-Day Trial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap shadow-2xs">
                              <AlertCircle size={12} className="text-rose-600" />
                              Unpaid / Due
                            </span>
                          )}
                        </td>

                        {/* 8. Expire Date */}
                        <td className="py-3.5 px-4 align-middle">
                          {comp.subscription_expires_at ? (
                            <div>
                              <div className="font-bold text-slate-800 text-xs">
                                {new Date(comp.subscription_expires_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {new Date(comp.subscription_expires_at).toLocaleTimeString('en-MY', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No expiry set</span>
                          )}
                        </td>

                        {/* 9. Live Countdown */}
                        <td className="py-3.5 px-4 align-middle">
                          {countdown.hasExpiry ? (
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs ${
                                countdown.isExpired
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : countdown.isExpiringSoon
                                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {countdown.isExpired ? (
                                <AlertCircle size={13} className="text-rose-600 shrink-0" />
                              ) : countdown.isExpiringSoon ? (
                                <Hourglass size={13} className="text-amber-600 animate-spin shrink-0" />
                              ) : (
                                <Clock size={13} className="text-emerald-600 shrink-0" />
                              )}
                              <span className="font-mono tracking-tight font-black">
                                {countdown.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No Expiry</span>
                          )}
                        </td>

                        {/* 10. Subscription Status */}
                        <td className="py-3.5 px-4 align-middle">
                          {isInactive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Inactive
                            </span>
                          ) : countdown.isExpired ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Expired
                            </span>
                          ) : isTrial ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-[#0b4da2] border border-blue-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              Trial
                            </span>
                          ) : countdown.isExpiringSoon ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              Expiring
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          )}
                        </td>

                        {/* 11. Actions: Clean Icon-Only Buttons matching Superadmin UI */}
                        <td className="py-3.5 px-4 align-middle text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. Active / Inactive Status Toggle Icon */}
                            <button
                              type="button"
                              onClick={() => handleToggleActiveCompany(comp)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer border shadow-2xs ${
                                isInactive
                                  ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                  : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                              title={
                                isInactive
                                  ? 'Status: Inactive (Click to Activate)'
                                  : 'Status: Active (Click to Deactivate)'
                              }
                            >
                              {isInactive ? <PowerOff size={13} /> : <Power size={13} />}
                            </button>

                            {/* 2. Set / Extend Duration Icon */}
                            <button
                              type="button"
                              onClick={() => handleOpenSubscriptionModal(comp)}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer border border-amber-200 bg-white shadow-2xs"
                              title="Set / Extend Subscription Duration"
                            >
                              <Clock size={13} />
                            </button>

                            {/* 3. Record / Settle Payment Icon */}
                            <button
                              type="button"
                              onClick={() => handleOpenSettleModal(comp)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer border shadow-2xs ${
                                fin.balanceDue > 0
                                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 bg-white'
                              }`}
                              title={
                                fin.balanceDue > 0
                                  ? `Settle Due Balance (RM ${fin.balanceDue.toFixed(2)})`
                                  : 'Record / Settle Payment'
                              }
                            >
                              <DollarSign size={13} />
                            </button>

                            {/* 4. View Company Details Icon */}
                            <Link
                              href={`/companies/${comp.id}`}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
                              title="View Company Details"
                            >
                              <Eye size={13} />
                            </Link>

                            {/* 5. Open Company in New Tab Icon */}
                            <Link
                              href={`/companies/${comp.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
                              title="Open Company in New Tab"
                            >
                              <ExternalLink size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: SET / EXTEND SUBSCRIPTION DURATION                      */}
      {/* ============================================================== */}
      {subscriptionModalOpen && targetCompany && (() => {
        const assignedPlan = plans.find((p) => p.plan_key === targetCompany.subscription_plan_key);
        const countdown = getCountdownInfo(targetCompany.subscription_expires_at, targetCompany.subscription_starts_at);
        const isInactive = targetCompany.subscription_status === 'inactive' || targetCompany.status === 'inactive';

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-scale-up">
              <button
                type="button"
                onClick={() => setSubscriptionModalOpen(false)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center font-black">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Set &amp; Extend Duration
                  </h2>
                  <p className="text-xs text-slate-500">
                    Add duration days or set custom expiration date for company access
                  </p>
                </div>
              </div>

              {/* Company & Subscription Info Box */}
              <div className="my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{targetCompany.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ROC: {targetCompany.roc || 'N/A'}</div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      isInactive
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isInactive ? 'Inactive' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold">Assigned Plan:</span>
                    <strong className="text-slate-800">{assignedPlan?.name || 'Standard Package'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase font-bold">Current Expiry:</span>
                    <strong className="text-[#0b4da2] font-mono">
                      {targetCompany.subscription_expires_at
                        ? new Date(targetCompany.subscription_expires_at).toLocaleString('en-MY', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'No Expiry Set'}
                    </strong>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveSubscription} className="space-y-4">
                {/* Quick Add Days Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Quick Extend Duration (Presets):
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickExtend(3)}
                      className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-[#0b4da2] hover:border-blue-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      +3 Days
                    </button>
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
                      className="py-1.5 px-2 rounded-lg border border-blue-200 bg-blue-50 text-[#0b4da2] text-xs font-black transition-all cursor-pointer text-center"
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
                      onClick={() => handleQuickExtend(300)}
                      className="py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-[#0b4da2] hover:border-blue-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      +10 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickExtend(365)}
                      className="py-1.5 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-black transition-all cursor-pointer text-center"
                    >
                      +1 Year (365d)
                    </button>
                  </div>
                </div>

                {/* Custom Days Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Or Add Custom Number of Days:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={customAddDays}
                      onChange={(e) => setCustomAddDays(parseInt(e.target.value) || 1)}
                      className="w-32 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickExtend(customAddDays)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer border border-slate-200"
                    >
                      + Add {customAddDays} Days
                    </button>
                  </div>
                </div>

                {/* Exact Expiry Date & Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Exact Expiration Date &amp; Time <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarClock size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="datetime-local"
                      required
                      value={modalExpiresAt}
                      onChange={(e) => setModalExpiresAt(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Subscription Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subscription Status
                    </label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                    >
                      <option value="active">Active (Paid Access)</option>
                      <option value="trial_active">Trial Active (3-Day Free)</option>
                      <option value="inactive">Inactive / Suspended</option>
                      <option value="expired">Expired (Due)</option>
                    </select>
                  </div>

                  {/* Assign Package Plan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assigned Package Plan
                    </label>
                    <select
                      value={modalPlanKey}
                      onChange={(e) => setModalPlanKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                    >
                      {plans.map((p) => (
                        <option key={p.plan_key} value={p.plan_key}>
                          {p.name} ({p.currency} {p.price})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notes / Extension Reason <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Extended by 30 days due to bank payment verification."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0b4da2]"
                  />
                </div>

                {/* Modal Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
                        <span>Save Duration</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* MODAL: RECORD / SETTLE PAYMENT (DENA PAONA / DUE / HALF PAY)    */}
      {/* ============================================================== */}
      {settleModalOpen && settleCompany && (() => {
        const fin = getCompanyFinanceInfo(settleCompany);
        const assignedPlan = plans.find((p) => p.plan_key === settleCompany.subscription_plan_key);
        const inputAmount = parseFloat(settleAmount) || 0;
        const currentPaid = fin.amountPaid;
        const totalAmount = fin.totalAmount > 0 ? fin.totalAmount : (assignedPlan ? Number(assignedPlan.price) : inputAmount);
        
        // Calculate projection
        const projectedPaid = fin.latestInvoice ? Math.min(totalAmount, currentPaid + inputAmount) : inputAmount;
        const projectedDue = Math.max(0, totalAmount - projectedPaid);

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-scale-up">
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <Coins size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Record &amp; Settle Payment
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage receivables, half payments, or clear dues (Dena Paona)
                  </p>
                </div>
              </div>

              {/* Company & Financial Snapshot Box */}
              <div className="my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{settleCompany.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ROC: {settleCompany.roc || 'N/A'}</div>
                  </div>
                  <span className="text-[11px] font-bold text-[#0b4da2] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {assignedPlan?.name || 'Standard Plan'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Price</span>
                    <span className="text-xs font-extrabold text-slate-800 font-mono">
                      RM {totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase">Amount Paid</span>
                    <span className="text-xs font-extrabold text-emerald-700 font-mono">
                      RM {currentPaid.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-200/60">
                    <span className="text-[10px] text-rose-800 font-bold block uppercase">Current Due</span>
                    <span className="text-xs font-extrabold text-rose-700 font-mono">
                      RM {fin.balanceDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSavePayment} className="space-y-4">
                {/* Quick Preset Buttons (Half Payment, Full Settle) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Quick Amount Presets:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {fin.balanceDue > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSettleAmount(fin.balanceDue.toFixed(2))}
                          className="py-1.5 px-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          Settle Full Due
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettleAmount((fin.balanceDue / 2).toFixed(2))}
                          className="py-1.5 px-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          50% of Due
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettleAmount(totalAmount.toFixed(2))}
                          className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          Package Total
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSettleAmount((totalAmount / 2).toFixed(2))}
                          className="py-1.5 px-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          Half Payment (50%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettleAmount(totalAmount.toFixed(2))}
                          className="py-1.5 px-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          Full Pay (100%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettleAmount('100.00')}
                          className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          RM 100 Deposit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount Paid Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Amount to Record (RM) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">RM</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
                    />
                  </div>

                  {/* Reactive Calculation Preview */}
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Projected Total Paid:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        RM {projectedPaid.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 text-[11px] block">Remaining Due (Dena):</span>
                      <span
                        className={`font-mono font-bold ${
                          projectedDue > 0 ? 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded' : 'text-emerald-700'
                        }`}
                      >
                        RM {projectedDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={settlePaymentMethod}
                      onChange={(e) => setSettlePaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Online Banking (FPX)">Online Banking (FPX)</option>
                      <option value="Maybank QR Pay">Maybank QR Pay</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Receiving Bank
                    </label>
                    <select
                      value={settleBankName}
                      onChange={(e) => setSettleBankName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0b4da2]"
                    >
                      <option value="Maybank">Maybank (Malayan Banking)</option>
                      <option value="CIMB Bank">CIMB Bank</option>
                      <option value="Public Bank">Public Bank</option>
                      <option value="RHB Bank">RHB Bank</option>
                      <option value="AmBank">AmBank Berhad</option>
                      <option value="Hong Leong Bank">Hong Leong Bank</option>
                    </select>
                  </div>
                </div>

                {/* Reference No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Reference / Receipt ID
                  </label>
                  <input
                    type="text"
                    value={settlePaymentRef}
                    onChange={(e) => setSettlePaymentRef(e.target.value)}
                    placeholder="e.g. PAY-982341 or Maybank Ref"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0b4da2]"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notes / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 50% partial payment received via bank transfer. Balance due next month."
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0b4da2]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSettleModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRecordingPayment}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {isRecordingPayment ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Recording Payment...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Confirm &amp; Record Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* CREATE / EDIT PLAN MODAL */}
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
                          className="text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
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
                    className="w-4 h-4 rounded text-[#0b4da2] focus:ring-blue-500 border-slate-300 cursor-pointer"
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
                    className="w-4 h-4 rounded text-[#0b4da2] focus:ring-blue-500 border-slate-300 cursor-pointer"
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
