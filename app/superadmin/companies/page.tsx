'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as XLSX from 'xlsx-js-style';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  AlertCircle,
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Clock,
  Coins,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Gift,
  Heart,
  HeartHandshake,
  Layers,
  PieChart,
  Plus,
  Power,
  PowerOff,
  Printer,
  Receipt,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  UserX,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import CompanyStatusModal from '@/components/CompanyStatusModal';
import {
  Company,
  resolveFileUrl,
  getCompanyActiveWorkers,
  getCompanyInactiveWorkers,
  getCompanyIncomeWallet,
  getCompanyCostWallet,
  getCompanyProfitWallet,
  getCompanyWorkerWallet,
  getCompanyPendingWallet,
} from '@/lib/companies';
import {
  deleteStoredCompany,
  fetchCompaniesFromBackend,
  getStoredCompanies,
  resetStoredCompanies,
  saveStoredCompany,
  subscribeToCompanyChanges,
  updateStoredCompany,
} from '@/lib/companyStorage';
import {
  CompanyStatCard,
  DEFAULT_COMPANY_STAT_CARDS,
  fetchCompanyStatCards,
  getStoredCompanyStatCards,
  reorderCompanyStatCards,
  resetCompanyStatCards,
  subscribeToCompanyStatCardsChange,
  updateCompanyStatCard,
  createCompanyStatCard,
  deleteCompanyStatCard,
  uploadCompanyStatCardIcon,
} from '@/lib/companyStatCards';
import CompanyOrderStatisticsChart from '@/components/CompanyOrderStatisticsChart';
import { WorkingSector, fetchWorkingSectors, createWorkingSector, CustomerRecord, fetchCustomers } from '@/lib/customerStorage';
import { ProgramRecord, fetchPrograms, getStoredPrograms } from '@/lib/programStorage';
import {
  useDashboardCardDesign,
  useCardAnimationSettings,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
} from '@/lib/themeSettings';
import {
  SubscriptionPlan,
  fetchSubscriptionPlans,
  createInvoice,
} from '@/lib/companyTrialAndFinanceStorage';
import CompanyPaymentModal, { PaymentTabType } from '@/components/CompanyPaymentModal';
import {
  SiteSettings,
  getStoredSettings,
  fetchSiteSettings,
  subscribeToSettingsChanges,
} from '@/lib/settingsStorage';

const SECTOR_OPTIONS = [
  'Civil & Building Construction',
  'Agriculture & Plantation',
  'Manufacturing & Healthcare',
  'Hospitality & Services',
  'Agri-Commodity & Processing',
  'Engineering & Development',
  'Logistics & Supply Chain',
  'General Commercial & Services',
];

const TAG_OPTIONS = [
  'Verified JIM',
  'Verified Entity',
  'Tier 1 Employer',
  'Govt Certified',
  'Major Sponsor',
  'New Registration',
];

const LOGO_PRESETS = [
  { label: 'Gamuda', path: '/images/companies/gamuda.svg' },
  { label: 'Sime Darby', path: '/images/companies/sime-darby.svg' },
  { label: 'Top Glove', path: '/images/companies/top-glove.svg' },
  { label: 'Genting', path: '/images/companies/genting.svg' },
  { label: 'IOI Group', path: '/images/companies/ioi-group.svg' },
  { label: 'Sunway', path: '/images/companies/sunway.svg' },
];

const STAT_ICON_PRESETS = [
  { label: 'Building', icon: 'Building2' },
  { label: 'Active Company', icon: 'CheckCircle2' },
  { label: 'Inactive Company', icon: 'PowerOff' },
  { label: 'Reject Company', icon: 'XCircle' },
  { label: 'Dollar', icon: 'DollarSign' },
  { label: 'Cost (Out)', icon: 'ArrowDownRight' },
  { label: 'Credit Card', icon: 'CreditCard' },
  { label: 'Profit (Net)', icon: 'TrendingUp' },
  { label: 'Coins (5% Donate)', icon: 'Coins' },
  { label: 'Gift (Donation)', icon: 'Gift' },
  { label: 'Balance / Scale', icon: 'Scale' },
  { label: 'Pending Dues', icon: 'Clock' },
  { label: 'Target Wallet', icon: 'Wallet' },
  { label: 'Receipt/Expense', icon: 'Receipt' },
  { label: 'Briefcase', icon: 'Briefcase' },
  { label: 'Shield Check', icon: 'ShieldCheck' },
];

export default function SuperAdminCompaniesPage() {
  const pathname = usePathname();
  const baseRoute = pathname?.startsWith('/superadmin') ? '/superadmin/companies' : '/companies';
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';
  const {
    animation: cardAnimation,
    duration: cardDuration,
    stagger: cardStagger,
    animTriggerKey,
  } = useCardAnimationSettings();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [statCards, setStatCards] = useState<CompanyStatCard[]>(DEFAULT_COMPANY_STAT_CARDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedCompanyCardId, setSelectedCompanyCardId] = useState<string>('ALL');
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => getStoredSettings());
  const [programs, setPrograms] = useState<ProgramRecord[]>(() => {
    return typeof window !== 'undefined' ? getStoredPrograms() : [];
  });
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [syncTableWithCardFilter, setSyncTableWithCardFilter] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'rejected'>('all');
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Manage Cards & Priority Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageCardsList, setManageCardsList] = useState<CompanyStatCard[]>([]);
  const [editingCardIdInModal, setEditingCardIdInModal] = useState<number | null>(null);
  const [modalEditName, setModalEditName] = useState('');
  const [modalEditSubtitle, setModalEditSubtitle] = useState('');
  const [modalEditIcon, setModalEditIcon] = useState('');
  const [modalEditCustomValue, setModalEditCustomValue] = useState<number>(0);
  const [modalEditIconPreview, setModalEditIconPreview] = useState<string | null>(null);
  const [modalEditIconFile, setModalEditIconFile] = useState<File | null>(null);
  const [isSavingManage, setIsSavingManage] = useState(false);

  // Add Card Modal State
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [addCardName, setAddCardName] = useState('');
  const [addCardSubtitle, setAddCardSubtitle] = useState('');
  const [addCardValue, setAddCardValue] = useState<number>(0);
  const [addCardIcon, setAddCardIcon] = useState('Wallet');
  const [addCardIconPreview, setAddCardIconPreview] = useState<string | null>(null);
  const [addCardIconFile, setAddCardIconFile] = useState<File | null>(null);
  const [isSubmittingAddCard, setIsSubmittingAddCard] = useState(false);

  // Form states for Create & Edit Company
  const [dbWorkingSectors, setDbWorkingSectors] = useState<WorkingSector[]>([]);
  const [formName, setFormName] = useState('');
  const [formRoc, setFormRoc] = useState('');
  const [formSector, setFormSector] = useState(SECTOR_OPTIONS[0]);
  const [formCustomSector, setFormCustomSector] = useState('');
  const [formTag, setFormTag] = useState(TAG_OPTIONS[0]);
  const [formWorkers, setFormWorkers] = useState<number>(1500);
  const [formLogo, setFormLogo] = useState(LOGO_PRESETS[0].path);
  const [formDescription, setFormDescription] = useState('');

  // Status & Auto-Deactivation Modal State
  const [statusModalCompany, setStatusModalCompany] = useState<Company | null>(null);
  const [payingCompany, setPayingCompany] = useState<Company | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [pendingTrialCount, setPendingTrialCount] = useState<number>(0);

  // Export Dropdown State & Ref
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initial load
  useEffect(() => {
    setMounted(true);
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setCompanies(list);
    }).catch(() => {});

    fetchWorkingSectors().then((secList) => {
      if (Array.isArray(secList) && secList.length > 0) {
        setDbWorkingSectors(secList);
      }
    }).catch(() => {});

    setStatCards(getStoredCompanyStatCards());
    fetchCompanyStatCards().then((cards) => {
      setStatCards(cards);
    }).catch(() => {});

    fetchSubscriptionPlans(true).then((plans) => {
      if (Array.isArray(plans)) setSubscriptionPlans(plans);
    }).catch(() => {});

    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    fetch(`${apiBase}/company-trial-applications?status=pending`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPendingTrialCount(data.length);
      })
      .catch(() => {});

    fetchPrograms().then((progs) => {
      if (Array.isArray(progs) && progs.length > 0) setPrograms(progs);
    }).catch(() => {});

    fetchCustomers().then((custs) => {
      if (Array.isArray(custs) && custs.length > 0) setAllCustomers(custs);
    }).catch(() => {});

    setSiteSettings(getStoredSettings());
    fetchSiteSettings().then((s) => {
      if (s) setSiteSettings(s);
    }).catch(() => {});
    const unsubSettings = subscribeToSettingsChanges((newSettings) => {
      setSiteSettings(newSettings);
    });

    const unsubComp = subscribeToCompanyChanges(() => {
      setCompanies(getStoredCompanies());
    });
    const unsubCards = subscribeToCompanyStatCardsChange(() => {
      setStatCards(getStoredCompanyStatCards());
    });

    // Live countdown ticker every 1 second
    const countdownInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    // Periodic check every 15s for auto-deactivation timer expiration
    const timerInterval = setInterval(() => {
      setCompanies(getStoredCompanies());
    }, 15000);

    return () => {
      unsubComp();
      unsubCards();
      unsubSettings();
      clearInterval(countdownInterval);
      clearInterval(timerInterval);
    };
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleCompanyStatusUpdated = (updatedCompany: Company) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === updatedCompany.id ? { ...c, ...updatedCompany } : c))
    );
    showToast(
      'success',
      `Company "${updatedCompany.name}" status updated to ${
        updatedCompany.status === 'inactive' ? 'Inactive' : 'Active'
      }${updatedCompany.auto_deactivate_at ? ' (Auto-Off scheduled)' : ''}.`
    );
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
    if (!payingCompany) return;
    setIsSubmittingPayment(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
      const assignedPlan = subscriptionPlans.find(
        (p) =>
          p.plan_key === (paymentInfo.planKey || payingCompany.subscription_plan_key) ||
          p.name?.toLowerCase() === (paymentInfo.planName || payingCompany.subscription_plan_key)?.toLowerCase()
      );
      const selectedPlanName = paymentInfo.planName || assignedPlan?.name || payingCompany.subscription_plan_key || 'Subscription Package';
      const selectedPlanKey = paymentInfo.planKey || assignedPlan?.plan_key || payingCompany.subscription_plan_key;
      const selectedDurationDays = Number(paymentInfo.packageDurationDays || assignedPlan?.duration_days) || 30;
      const total = paymentInfo.amount;

      if (paymentInfo.tab === 'wallet') {
        const deductRes = await fetch(
          `${apiBase}/companies/${encodeURIComponent(payingCompany.id)}/wallet/deduct-balance`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              amount: total,
              reference: paymentInfo.reference,
              notes: paymentInfo.notes || `Wallet payment for ${selectedPlanName}`,
              requested_by: 'Super Admin',
            }),
          }
        );
        const deductData = await deductRes.json();
        if (!deductRes.ok || !deductData.success) {
          throw new Error(deductData.message || 'Insufficient wallet balance for this payment.');
        }
      }

      await createInvoice({
        company_id: payingCompany.id,
        company_name: payingCompany.name,
        customer_name: payingCompany.name,
        customer_email: payingCompany.email,
        customer_phone: payingCompany.phone,
        customer_address: payingCompany.address,
        package_name: selectedPlanName,
        invoice_date: new Date().toISOString().slice(0, 10),
        items: [
          {
            description: `Payment for ${selectedPlanName} (${selectedDurationDays} Days)`,
            qty: 1,
            unit_price: total,
            total: total,
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
        notes: paymentInfo.notes || `Payment recorded by Super Admin for ${payingCompany.name}`,
      });

      if (selectedPlanKey || selectedDurationDays > 0) {
        try {
          await fetch(`${apiBase}/companies/${encodeURIComponent(payingCompany.id)}/subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              subscription_plan_key: selectedPlanKey,
              subscription_status: 'active',
              extra_days: selectedDurationDays,
              subscription_notes: `Paid RM ${total.toFixed(2)} via ${paymentInfo.method} (${selectedPlanName}) • Ref: ${paymentInfo.reference}`,
            }),
          });
          const refreshed = await fetchCompaniesFromBackend();
          setCompanies(refreshed);
        } catch {
          // ignore
        }
      }

      setPayingCompany(null);
      showToast(
        'success',
        `Payment of RM ${total.toFixed(2)} for "${selectedPlanName}" recorded successfully for ${payingCompany.name}!`
      );
    } catch (err: any) {
      showToast('info', err?.message || 'Payment recording failed.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // KPI Calculations
  const selectedCardCompanies = useMemo(() => {
    if (selectedCompanyCardId === 'ALL') return companies;
    return companies.filter((c) => c.id === selectedCompanyCardId);
  }, [companies, selectedCompanyCardId]);

  const selectedSingleCompany = useMemo(() => {
    if (selectedCompanyCardId === 'ALL') return null;
    return companies.find((c) => c.id === selectedCompanyCardId) || null;
  }, [companies, selectedCompanyCardId]);

  const scopedCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      if (selectedCompanyCardId !== 'ALL') {
        const matchesComp =
          c.company_id &&
          (c.company_id.toLowerCase() === selectedCompanyCardId.toLowerCase() ||
           (selectedSingleCompany && c.company_id.toLowerCase() === selectedSingleCompany.name.toLowerCase()));
        if (!matchesComp) return false;
      }
      return true;
    });
  }, [allCustomers, selectedCompanyCardId, selectedSingleCompany]);

  const totalActiveWorkers = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyActiveWorkers(c), 0);
  }, [selectedCardCompanies]);

  const totalInactiveWorkers = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyInactiveWorkers(c), 0);
  }, [selectedCardCompanies]);
  const totalWorkerWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyWorkerWallet(c), 0);
  const totalIncomeWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyIncomeWallet(c), 0);
  const totalCostWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyCostWallet(c), 0);
  const totalProfitWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyProfitWallet(c), 0);
  const totalPendingWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyPendingWallet(c), 0);

  // Memoized permanent fallback cards ensuring cards never disappear even if DB is deleted
  const activeStatCards = useMemo(() => {
    return statCards && statCards.length > 0 ? statCards : DEFAULT_COMPANY_STAT_CARDS;
  }, [statCards]);

  // Additional wallet, profit and donation cards metrics
  const othersCostCard = activeStatCards.find((c) => c.card_key === 'others_cost');
  const othersExpenseCard = activeStatCards.find((c) => c.card_key === 'others_expense');
  const othersProfitCard = activeStatCards.find((c) => c.card_key === 'others_profit');
  const othersPendingCard = activeStatCards.find((c) => c.card_key === 'others_pending');
  const totalProfitCard = activeStatCards.find((c) => c.card_key === 'total_profit' || c.card_key === 'total_profit_amount');

  const incomingDonateCard = activeStatCards.find((c) => c.card_key === 'incoming_donate');
  const donationCard = activeStatCards.find((c) => c.card_key === 'donation');
  const balancedDonationCard = activeStatCards.find((c) => c.card_key === 'balanced_donation');

  const totalOthersCost = othersCostCard?.custom_value !== undefined && othersCostCard.custom_value !== null ? Number(othersCostCard.custom_value) : 45000;
  const totalOthersExpense = othersExpenseCard?.custom_value !== undefined && othersExpenseCard.custom_value !== null ? Number(othersExpenseCard.custom_value) : 0;
  const totalOthersProfit = othersProfitCard?.custom_value !== undefined && othersProfitCard.custom_value !== null ? Number(othersProfitCard.custom_value) : 32500;
  const totalOthersPending = othersPendingCard?.custom_value !== undefined && othersPendingCard.custom_value !== null ? Number(othersPendingCard.custom_value) : 18200;

  // Total Combined Profit = Foreigner Profit + Others Profit
  const computedGrandTotalProfit = totalProfitWallet + totalOthersProfit;
  const grandTotalProfit = (totalProfitCard?.custom_value && totalProfitCard.custom_value > 0)
    ? totalProfitCard.custom_value
    : computedGrandTotalProfit;

  // Company count metrics
  const totalRegisteredCompanies = selectedSingleCompany ? 1 : companies.length;
  const totalActiveCompanies = selectedSingleCompany
    ? (selectedSingleCompany.status === 'inactive' ? 0 : 1)
    : companies.filter((c) => !c.status || c.status === 'active').length;
  const totalInactiveCompanies = selectedSingleCompany
    ? (selectedSingleCompany.status === 'inactive' ? 1 : 0)
    : companies.filter((c) => c.status === 'inactive' || c.status === 'suspended').length;
  const totalPendingCompanies = selectedSingleCompany
    ? (selectedSingleCompany.status === 'pending' ? 1 : 0)
    : companies.filter((c) => c.status === 'pending').length + (pendingTrialCount || 0);
  const totalRejectCompanies = selectedSingleCompany
    ? (selectedSingleCompany.status === 'rejected' ? 1 : 0)
    : companies.filter((c) => c.status === 'rejected' || c.status === 'reject').length;

  // Financial metrics
  const totalIncomeVal = totalIncomeWallet;
  const totalCostVal = totalCostWallet;
  const totalPendingPaymentVal = totalPendingWallet;
  const totalProfitVal = totalProfitWallet;

  // Donation metrics (5% of Income, Donation disbursed, Balanced Donation)
  const computedIncomingDonate = Math.round(totalIncomeVal * 0.05);
  const totalIncomingDonate = (incomingDonateCard?.custom_value !== undefined && incomingDonateCard.custom_value !== null && Number(incomingDonateCard.custom_value) > 0)
    ? Number(incomingDonateCard.custom_value)
    : computedIncomingDonate;

  const totalDonation = (donationCard?.custom_value !== undefined && donationCard.custom_value !== null && Number(donationCard.custom_value) > 0)
    ? Number(donationCard.custom_value)
    : (donationCard?.custom_value === 0 ? 0 : Math.round(totalIncomingDonate * 0.6));

  const totalBalancedDonation = (balancedDonationCard?.custom_value !== undefined && balancedDonationCard.custom_value !== null && Number(balancedDonationCard.custom_value) > 0)
    ? Number(balancedDonationCard.custom_value)
    : Math.max(0, totalIncomingDonate - totalDonation);

  // Compute card metrics
  const getCardMetrics = (card: CompanyStatCard) => {
    switch (card.card_key) {
      case 'registered_companies':
      case 'total_registered_company':
        if (selectedSingleCompany) {
          return {
            value: selectedSingleCompany.name,
            sub: `${selectedSingleCompany.roc || 'Verified Entity'} • View Profile →`,
            link: `${baseRoute}/${encodeURIComponent(selectedSingleCompany.id)}`,
            isLink: true,
            isCompanyEntity: true,
            theme: {
              bg: 'bg-blue-50',
              text: 'text-[#0b4da2]',
              border: 'border-blue-100',
              valColor: 'text-slate-900',
            },
          };
        }
        return {
          value: `${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalRegisteredCompanies).toLocaleString()}`,
          sub: card.subtitle || 'View Registered Companies →',
          link: `${baseRoute}/registered`,
          isLink: true,
          isCompanyEntity: false,
          theme: {
            bg: 'bg-blue-50',
            text: 'text-[#0b4da2]',
            border: 'border-blue-100',
            valColor: 'text-slate-900',
          },
        };

      case 'total_active_company':
        return {
          value: (card.custom_value && card.custom_value > 0 ? card.custom_value : totalActiveCompanies).toLocaleString(),
          sub: card.subtitle || 'View Active Companies →',
          link: `${baseRoute}/active`,
          isLink: true,
          theme: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-100',
            valColor: 'text-emerald-600',
          },
        };

      case 'total_inactive_company':
        return {
          value: (card.custom_value && card.custom_value > 0 ? card.custom_value : totalInactiveCompanies).toLocaleString(),
          sub: card.subtitle || 'View Inactive Companies →',
          link: `${baseRoute}/inactive`,
          isLink: true,
          theme: {
            bg: 'bg-slate-100',
            text: 'text-slate-600',
            border: 'border-slate-200',
            valColor: 'text-slate-700',
          },
        };

      case 'total_pending_company':
        return {
          value: (card.custom_value && card.custom_value > 0 ? card.custom_value : totalPendingCompanies).toLocaleString(),
          sub: card.subtitle || 'View Pending Companies →',
          link: `${baseRoute}/pending`,
          isLink: true,
          theme: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            valColor: 'text-amber-700',
          },
        };

      case 'total_reject_company':
        return {
          value: (card.custom_value && card.custom_value > 0 ? card.custom_value : totalRejectCompanies).toLocaleString(),
          sub: card.subtitle || 'View Rejected Companies →',
          link: `${baseRoute}/reject`,
          isLink: true,
          theme: {
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            border: 'border-rose-100',
            valColor: 'text-rose-600',
          },
        };

      case 'total_income_amount':
        return {
          value: `RM ${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalIncomeVal).toLocaleString()}`,
          sub: selectedSingleCompany ? 'Deposit Inflow for this Company →' : (card.subtitle || 'View Income Breakdown →'),
          link: `${baseRoute}/income`,
          isLink: true,
          theme: {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-100',
            valColor: 'text-blue-700',
          },
        };

      case 'total_cost_amount':
        return {
          value: `RM ${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalCostVal).toLocaleString()}`,
          sub: selectedSingleCompany ? 'Cost & Levy for this Company →' : (card.subtitle || 'View Cost Breakdown →'),
          link: `${baseRoute}/cost`,
          isLink: true,
          theme: {
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            border: 'border-rose-100',
            valColor: 'text-rose-700',
          },
        };

      case 'total_pending_payment_amount':
        return {
          value: `RM ${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalPendingPaymentVal).toLocaleString()}`,
          sub: selectedSingleCompany ? 'Pending Amount for this Company →' : (card.subtitle || 'View Outstanding Dues →'),
          link: `${baseRoute}/pending-payment`,
          isLink: true,
          theme: {
            bg: 'bg-orange-50',
            text: 'text-orange-600',
            border: 'border-orange-100',
            valColor: 'text-orange-700',
          },
        };

      case 'total_profit_amount':
        return {
          value: `RM ${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalProfitVal).toLocaleString()}`,
          sub: selectedSingleCompany ? 'Retained Margin for this Company →' : (card.subtitle || 'View Profit Breakdown →'),
          link: `${baseRoute}/profit`,
          isLink: true,
          theme: {
            bg: 'bg-emerald-100/80',
            text: 'text-emerald-800',
            border: 'border-emerald-300',
            valColor: 'text-emerald-800',
          },
        };

      case 'incoming_donate':
        return {
          value: `RM ${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalIncomingDonate).toLocaleString()}`,
          sub: card.subtitle || 'View 5% Donation Allocation →',
          link: `${baseRoute}/incoming-donate`,
          isLink: true,
          theme: {
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-100',
            valColor: 'text-purple-700',
          },
        };

      case 'donation':
        return {
          value: `RM ${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalDonation).toLocaleString()}`,
          sub: card.subtitle || 'View Disbursed Donations →',
          link: `${baseRoute}/donation`,
          isLink: true,
          theme: {
            bg: 'bg-teal-50',
            text: 'text-teal-700',
            border: 'border-teal-100',
            valColor: 'text-teal-700',
          },
        };

      case 'balanced_donation':
        return {
          value: `RM ${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalBalancedDonation).toLocaleString()}`,
          sub: card.subtitle || 'View Balanced Donations →',
          link: `${baseRoute}/balanced-donation`,
          isLink: true,
          theme: {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            valColor: 'text-amber-800',
          },
        };

      // Backward compatible fallbacks
      case 'active_workers':
        return {
          value: totalActiveWorkers.toLocaleString(),
          sub: card.subtitle || 'Approved & Active Permits',
          isLink: false,
          theme: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', valColor: 'text-emerald-600' },
        };
      case 'inactive_workers':
        return {
          value: totalInactiveWorkers.toLocaleString(),
          sub: card.subtitle || 'Expired / Renewal Pending',
          isLink: false,
          theme: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', valColor: 'text-slate-700' },
        };
      case 'target_wallet':
        return {
          value: `RM ${totalWorkerWallet.toLocaleString()}`,
          sub: card.subtitle || 'Total Worker Target Pool',
          isLink: false,
          theme: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', valColor: 'text-purple-700' },
        };
      case 'deposit_wallet':
        return {
          value: `RM ${totalIncomeWallet.toLocaleString()}`,
          sub: card.subtitle || 'Total Received Inflow',
          isLink: false,
          theme: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', valColor: 'text-blue-700' },
        };
      case 'cost_wallet':
      case 'others_cost':
      case 'others_expense':
        return {
          value: `RM ${(card.custom_value ?? totalCostWallet).toLocaleString()}`,
          sub: card.subtitle || 'Operational & Expense Outflow',
          isLink: false,
          theme: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', valColor: 'text-rose-700' },
        };
      case 'profit_wallet':
      case 'others_profit':
      case 'total_profit':
        return {
          value: `RM ${(card.custom_value && card.custom_value > 0 ? card.custom_value : totalProfitWallet).toLocaleString()}`,
          sub: card.subtitle || 'Net Retained Margin',
          isLink: false,
          theme: { bg: 'bg-emerald-100/80', text: 'text-emerald-800', border: 'border-emerald-300', valColor: 'text-emerald-800' },
        };
      case 'pending_wallet':
      case 'others_pending':
        return {
          value: `RM ${(card.custom_value ?? totalPendingWallet).toLocaleString()}`,
          sub: card.subtitle || 'Pending Approvals & Dues',
          isLink: false,
          theme: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', valColor: 'text-amber-700' },
        };
      default:
        return {
          value: card.custom_value ? `RM ${card.custom_value.toLocaleString()}` : '0',
          sub: card.subtitle || '',
          isLink: false,
          theme: {
            bg: 'bg-slate-50',
            text: 'text-slate-700',
            border: 'border-slate-200',
            valColor: 'text-slate-900',
          },
        };
    }
  };

  // Helper to render icon for a stat card
  const renderCardIcon = (iconStr: string, size = 16) => {
    if (iconStr?.startsWith('/') || iconStr?.startsWith('http') || iconStr?.startsWith('data:image')) {
      return (
        <img
          src={iconStr}
          alt="icon"
          className="max-h-4 max-w-4 object-contain"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    const iconProps = { size, className: 'shrink-0' };
    switch (iconStr) {
      case 'Building2': return <Building2 {...iconProps} />;
      case 'UserCheck': return <UserCheck {...iconProps} />;
      case 'UserX': return <UserX {...iconProps} />;
      case 'Wallet': return <Wallet {...iconProps} />;
      case 'ArrowUpRight': return <ArrowUpRight {...iconProps} />;
      case 'ArrowDownRight': return <ArrowDownRight {...iconProps} />;
      case 'TrendingUp': return <TrendingUp {...iconProps} />;
      case 'Clock': return <Clock {...iconProps} />;
      case 'Receipt': return <Receipt {...iconProps} />;
      case 'CreditCard': return <CreditCard {...iconProps} />;
      case 'Coins': return <Coins {...iconProps} />;
      case 'DollarSign': return <DollarSign {...iconProps} />;
      case 'Briefcase': return <Briefcase {...iconProps} />;
      case 'ShieldCheck': return <ShieldCheck {...iconProps} />;
      case 'Sparkles': return <Sparkles {...iconProps} />;
      case 'Crown': return <Crown {...iconProps} />;
      case 'PieChart': return <PieChart {...iconProps} />;
      case 'CheckCircle2': return <CheckCircle2 {...iconProps} />;
      case 'PowerOff': return <PowerOff {...iconProps} />;
      case 'XCircle': return <XCircle {...iconProps} />;
      case 'Gift': return <Gift {...iconProps} />;
      case 'Scale': return <Scale {...iconProps} />;
      case 'Heart': return <Heart {...iconProps} />;
      case 'HeartHandshake': return <HeartHandshake {...iconProps} />;
      default: return <Coins {...iconProps} />;
    }
  };

  // Open Manage Modal
  const openManageModal = () => {
    setManageCardsList([...activeStatCards]);
    setEditingCardIdInModal(null);
    setIsManageModalOpen(true);
  };

  // Manage Modal Card Reorder
  const handleModalMoveItem = (index: number, action: 'top' | 'up' | 'down' | 'bottom') => {
    const list = [...manageCardsList];
    const item = list.splice(index, 1)[0];
    if (action === 'top') list.unshift(item);
    else if (action === 'bottom') list.push(item);
    else if (action === 'up') list.splice(Math.max(0, index - 1), 0, item);
    else if (action === 'down') list.splice(Math.min(list.length, index + 1), 0, item);
    setManageCardsList(list);
  };

  const handleModalSetRank = (currentIndex: number, newRank: number) => {
    const targetIdx = Math.max(0, Math.min(manageCardsList.length - 1, newRank - 1));
    if (targetIdx === currentIndex) return;
    const list = [...manageCardsList];
    const [item] = list.splice(currentIndex, 1);
    list.splice(targetIdx, 0, item);
    setManageCardsList(list);
  };

  // Inline card edit inside Manage modal
  const startInlineEdit = (card: CompanyStatCard) => {
    if (editingCardIdInModal === card.id) {
      setEditingCardIdInModal(null);
      return;
    }
    setEditingCardIdInModal(card.id);
    setModalEditName(card.name);
    setModalEditSubtitle(card.subtitle || '');
    setModalEditIcon(card.icon || 'Receipt');
    setModalEditCustomValue(card.custom_value ?? 0);
    setModalEditIconPreview(null);
    setModalEditIconFile(null);
  };

  const applyInlineCardEdit = (cardId: number) => {
    const list = manageCardsList.map((c) => {
      if (c.id === cardId) {
        return {
          ...c,
          name: modalEditName.trim() || c.name,
          subtitle: modalEditSubtitle.trim() || c.subtitle,
          icon: modalEditIconPreview || modalEditIcon,
          custom_value: modalEditCustomValue,
        };
      }
      return c;
    });
    setManageCardsList(list);
    setEditingCardIdInModal(null);
    showToast('info', 'Card updated in list. Click "Save Changes" to persist.');
  };

  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalEditIconFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setModalEditIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    uploadCompanyStatCardIcon(file).then((url) => {
      if (url) {
        setModalEditIcon(url);
        setModalEditIconPreview(url);
      }
    }).catch(() => {});
  };

  // Save all changes in Manage modal
  const handleSaveManageModal = async () => {
    setIsSavingManage(true);
    try {
      // Auto-apply currently edited card if user forgot to click "Done Editing"
      let currentList = [...manageCardsList];
      if (editingCardIdInModal !== null) {
        currentList = currentList.map((c) => {
          if (c.id === editingCardIdInModal) {
            return {
              ...c,
              name: modalEditName.trim() || c.name,
              subtitle: modalEditSubtitle.trim() || c.subtitle,
              icon: modalEditIconPreview || modalEditIcon,
              custom_value: modalEditCustomValue,
            };
          }
          return c;
        });
        setManageCardsList(currentList);
        setEditingCardIdInModal(null);
      }

      const updated = await reorderCompanyStatCards(currentList);
      setStatCards(updated);
      showToast('success', 'Stat & Wallet cards priority and settings saved successfully.');
      setIsManageModalOpen(false);
    } catch (err) {
      console.error('Failed to save manage modal:', err);
      showToast('info', 'Failed to save card changes.');
    } finally {
      setIsSavingManage(false);
    }
  };

  const handleDeleteCard = async (card: CompanyStatCard) => {
    if (!confirm(`Are you sure you want to delete card "${card.name}"?`)) return;
    try {
      const updated = await deleteCompanyStatCard(card.id);
      setStatCards(updated);
      setManageCardsList(updated);
      if (editingCardIdInModal === card.id) {
        setEditingCardIdInModal(null);
      }
      showToast('info', `Card "${card.name}" deleted successfully.`);
    } catch (err) {
      console.error('Failed to delete card:', err);
      showToast('info', 'Failed to delete card.');
    }
  };

  const handleResetCardsDefault = async () => {
    if (confirm('Reset all stat & wallet cards (names, icons, and order) to default?')) {
      const reset = await resetCompanyStatCards();
      setStatCards(reset);
      setManageCardsList(reset);
      setEditingCardIdInModal(null);
      showToast('info', 'Stat & wallet cards reset to original defaults.');
    }
  };

  // Add Card handlers
  const openAddCardModal = () => {
    setAddCardName('');
    setAddCardSubtitle('');
    setAddCardValue(0);
    setAddCardIcon('Wallet');
    setAddCardIconPreview(null);
    setAddCardIconFile(null);
    setIsAddCardModalOpen(true);
  };

  const handleAddCardFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddCardIconFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setAddCardIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    uploadCompanyStatCardIcon(file).then((url) => {
      if (url) {
        setAddCardIcon(url);
        setAddCardIconPreview(url);
      }
    }).catch(() => {});
  };

  const handleCreateNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCardName.trim()) {
      showToast('info', 'Please enter a card title/name.');
      return;
    }
    setIsSubmittingAddCard(true);
    try {
      let iconUrl = addCardIconPreview || addCardIcon;
      if (addCardIconFile && !iconUrl.startsWith('/storage/')) {
        const uploaded = await uploadCompanyStatCardIcon(addCardIconFile);
        if (uploaded) {
          iconUrl = uploaded;
        }
      }

      const { card, cards } = await createCompanyStatCard({
        name: addCardName.trim(),
        subtitle: addCardSubtitle.trim() || 'Custom Financial Metric',
        custom_value: Number(addCardValue) || 0,
        icon: iconUrl,
        icon_file: addCardIconFile || undefined,
      });

      setStatCards(cards);
      setManageCardsList(cards);
      setIsAddCardModalOpen(false);
      showToast('success', `Card "${card.name}" created and added successfully!`);
    } catch (err) {
      console.error('Failed to create stat card:', err);
      showToast('info', 'Failed to create new card.');
    } finally {
      setIsSubmittingAddCard(false);
    }
  };

  // Company management actions
  const openCreateModal = () => {
    setEditingCompany(null);
    setFormName('');
    setFormRoc(`ROC-${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 90000000)}`);
    setFormSector(SECTOR_OPTIONS[0]);
    setFormCustomSector('');
    setFormTag('Verified Entity');
    setFormWorkers(1500);
    setFormLogo(LOGO_PRESETS[0].path);
    setFormDescription('Newly registered employer entity within the Malaysian Immigration portal.');
    setIsCreateModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsLoading(true);
    const finalSector = formSector === 'OTHER' ? formCustomSector.trim() || 'General Services' : formSector;
    const finalId = editingCompany
      ? editingCompany.id
      : formName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const companyData: Company = {
      id: finalId,
      name: formName.trim().toUpperCase(),
      roc: formRoc.trim(),
      sector: finalSector,
      tag: formTag,
      totalWorkers: Number(formWorkers) || 0,
      logo: formLogo,
      description: formDescription.trim() || 'Newly registered employer entity within the Malaysian Immigration portal.',
    };

    if (formSector === 'OTHER' && formCustomSector.trim()) {
      createWorkingSector(formCustomSector.trim()).then((sec) => {
        if (sec) setDbWorkingSectors((prev) => [...prev, sec]);
      }).catch(() => {});
    }

    if (editingCompany) {
      const updated = await updateStoredCompany(companyData);
      setCompanies(updated);
      showToast('success', `Company "${companyData.name}" has been updated.`);
    } else {
      const updated = await saveStoredCompany(companyData);
      setCompanies(updated);
      showToast('success', `Company "${companyData.name}" created in database.`);
    }

    setIsLoading(false);
    setIsCreateModalOpen(false);
    setEditingCompany(null);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    const updated = await deleteStoredCompany(id);
    setCompanies(updated);
    setDeleteConfirmId(null);
    setIsLoading(false);
    showToast('info', 'Company record deleted from database.');
  };

  const handleResetDefaults = async () => {
    if (confirm('Are you sure you want to restore default companies in the database?')) {
      setIsLoading(true);
      const restored = await resetStoredCompanies();
      setCompanies(restored);
      setIsLoading(false);
      showToast('info', 'Company registry restored to default initial data in MySQL.');
    }
  };

  const allSectorList = useMemo(() => {
    const list = [...SECTOR_OPTIONS];
    dbWorkingSectors.forEach((s) => {
      if (s.name && !list.includes(s.name)) {
        list.push(s.name);
      }
    });
    return list;
  }, [dbWorkingSectors]);

  const isCompanyRejected = (c: Company) => {
    const st = String(c.status || '').toLowerCase();
    const subSt = String(c.subscription_status || '').toLowerCase();
    return st === 'rejected' || subSt === 'rejected';
  };

  const isCompanyInactive = (c: Company) => {
    if (isCompanyRejected(c)) return false;
    const st = String(c.status || '').toLowerCase();
    const subSt = String(c.subscription_status || '').toLowerCase();
    return st === 'inactive' || st === 'suspended' || subSt === 'inactive' || subSt === 'expired';
  };

  const isCompanyActive = (c: Company) => {
    return !isCompanyRejected(c) && !isCompanyInactive(c);
  };

  const getCountdownInfo = (expiresAt?: string | null) => {
    if (!expiresAt || expiresAt === 'infinite' || expiresAt === 'infinity' || expiresAt === 'lifetime') {
      return {
        status: 'none' as const,
        label: 'No Expiry',
        color: 'text-slate-400 bg-slate-50 border-slate-200',
      };
    }

    const expTime = new Date(expiresAt).getTime();
    if (isNaN(expTime)) {
      return {
        status: 'invalid' as const,
        label: 'Invalid Date',
        color: 'text-slate-400 bg-slate-50 border-slate-200',
      };
    }

    const diffMs = expTime - currentTime;
    if (!isFinite(diffMs)) {
      return {
        status: 'invalid' as const,
        label: 'Invalid Date',
        color: 'text-slate-400 bg-slate-50 border-slate-200',
      };
    }
    if (diffMs <= 0) {
      return {
        status: 'expired' as const,
        label: 'Expired',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
      };
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    let label = '';
    if (days > 0) {
      label = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      label = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      label = `${minutes}m ${seconds}s`;
    }

    const isUrgent = days === 0 && hours < 24;

    return {
      status: 'active' as const,
      label,
      days,
      color: isUrgent
        ? 'text-amber-700 bg-amber-50 border-amber-300 animate-pulse'
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
    };
  };

  const statusCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let rejected = 0;
    companies.forEach((c) => {
      if (isCompanyRejected(c)) rejected++;
      else if (isCompanyInactive(c)) inactive++;
      else active++;
    });
    return {
      all: companies.length,
      active,
      inactive,
      rejected,
    };
  }, [companies]);

  // Filtered List for Table
  const filteredCompanies = companies.filter((c) => {
    if (!c) return false;
    const lowerTerm = (searchTerm || '').toLowerCase().trim();
    const matchesSearch =
      !lowerTerm ||
      (c.name && String(c.name).toLowerCase().includes(lowerTerm)) ||
      (c.roc && String(c.roc).toLowerCase().includes(lowerTerm)) ||
      (c.sector && String(c.sector).toLowerCase().includes(lowerTerm)) ||
      (c.tag && String(c.tag).toLowerCase().includes(lowerTerm));

    const matchesSector = selectedSector === 'ALL' || c.sector === selectedSector;
    const matchesCardCompany = !syncTableWithCardFilter || selectedCompanyCardId === 'ALL' || c.id === selectedCompanyCardId;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isCompanyActive(c)) ||
      (statusFilter === 'inactive' && isCompanyInactive(c)) ||
      (statusFilter === 'rejected' && isCompanyRejected(c));

    return matchesSearch && matchesSector && matchesCardCompany && matchesStatus;
  });

  const getCompanyExportRow = (company: Company, idx: number) => {
    const assignedPlan = subscriptionPlans.find(
      (p) =>
        p.plan_key === company.subscription_plan_key ||
        p.name?.toLowerCase() === company.subscription_plan_key?.toLowerCase()
    );
    const planName =
      assignedPlan?.name ||
      (company.subscription_plan_key
        ? company.subscription_plan_key
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
        : 'Unassigned');

    const expiryStr = company.subscription_expires_at
      ? new Date(company.subscription_expires_at).toLocaleDateString('en-GB')
      : 'No Expiry';

    return {
      sl: idx + 1,
      name: company.name || '',
      roc: company.roc || '',
      sector: company.sector || '',
      status: (company.status || 'active').toUpperCase(),
      activeWorkers: getCompanyActiveWorkers(company),
      inactiveWorkers: getCompanyInactiveWorkers(company),
      incomeWallet: getCompanyIncomeWallet(company),
      costWallet: getCompanyCostWallet(company),
      profitWallet: getCompanyProfitWallet(company),
      plan: planName,
      subStatus: (company.subscription_status || '').replace(/_/g, ' ').toUpperCase() || 'STANDARD',
      expiry: expiryStr,
      phone: company.phone || company.telephone || '',
      email: company.email || '',
      address: company.address || '',
    };
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (!filteredCompanies || filteredCompanies.length === 0) {
      alert('No companies found to export.');
      return;
    }

    const data = filteredCompanies.map((c, idx) => {
      const row = getCompanyExportRow(c, idx);
      return {
        SL: row.sl,
        'Company Name': row.name,
        'ROC': row.roc,
        'Sector': row.sector,
        'Status': row.status,
        'Active Workers': row.activeWorkers,
        'Inactive Workers': row.inactiveWorkers,
        'Income Wallet (RM)': row.incomeWallet,
        'Cost Wallet (RM)': row.costWallet,
        'Profit Wallet (RM)': row.profitWallet,
        'Subscription Plan': row.plan,
        'Subscription Status': row.subStatus,
        'Subscription Expiry': row.expiry,
        'Phone': row.phone,
        'Email': row.email,
        'Address': row.address,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Apply Premium Corporate Header Styling (Row 1)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headerStyle = {
      fill: {
        fgColor: { rgb: '0B4DA2' }, // Corporate Royal Blue
      },
      font: {
        name: 'Calibri',
        sz: 11,
        bold: true,
        color: { rgb: 'FFFFFF' }, // White
      },
      alignment: {
        vertical: 'center',
        horizontal: 'center',
        wrapText: true,
      },
      border: {
        top: { style: 'thin', color: { rgb: '083877' } },
        bottom: { style: 'medium', color: { rgb: '083877' } },
        left: { style: 'thin', color: { rgb: '083877' } },
        right: { style: 'thin', color: { rgb: '083877' } },
      },
    };

    // Apply header style to all cells in Row 0
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellRef]) continue;
      worksheet[cellRef].s = headerStyle;
    }

    // Apply data rows styling (clean borders, zebra striping, aligned numbers)
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const isEven = row % 2 === 0;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellRef]) continue;

        const isSL = col === 0;
        const isNumeric = col >= 5 && col <= 9;

        worksheet[cellRef].s = {
          fill: isEven ? { fgColor: { rgb: 'F8FAFC' } } : undefined,
          font: {
            name: 'Calibri',
            sz: 10,
            bold: isNumeric && (col === 7 || col === 9), // Bold for Income & Profit
          },
          alignment: {
            vertical: 'center',
            horizontal: isSL ? 'center' : isNumeric ? 'right' : 'left',
          },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };
      }
    }

    // Set row heights: Row 0 (Header) = 28pt, data rows = 20pt
    const rowHeights: { hpt: number }[] = [{ hpt: 28 }];
    for (let r = 1; r <= range.e.r; r++) {
      rowHeights.push({ hpt: 20 });
    }
    worksheet['!rows'] = rowHeights;

    worksheet['!cols'] = [
      { wch: 6 },  // SL
      { wch: 30 }, // Company Name
      { wch: 18 }, // ROC
      { wch: 18 }, // Sector
      { wch: 12 }, // Status
      { wch: 16 }, // Active Workers
      { wch: 16 }, // Inactive Workers
      { wch: 20 }, // Income Wallet
      { wch: 18 }, // Cost Wallet
      { wch: 18 }, // Profit Wallet
      { wch: 20 }, // Plan
      { wch: 20 }, // Sub Status
      { wch: 18 }, // Expiry
      { wch: 18 }, // Phone
      { wch: 26 }, // Email
      { wch: 35 }, // Address
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `companies_list_${today}.xlsx`);
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (!filteredCompanies || filteredCompanies.length === 0) {
      alert('No companies found to export.');
      return;
    }

    const headers = [
      'SL',
      'Company Name',
      'ROC',
      'Sector',
      'Status',
      'Active Workers',
      'Inactive Workers',
      'Income Wallet (RM)',
      'Cost Wallet (RM)',
      'Profit Wallet (RM)',
      'Subscription Plan',
      'Subscription Status',
      'Subscription Expiry',
      'Phone',
      'Email',
      'Address',
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredCompanies.map((c, idx) => {
      const row = getCompanyExportRow(c, idx);
      return [
        row.sl,
        escapeCSV(row.name),
        escapeCSV(row.roc),
        escapeCSV(row.sector),
        escapeCSV(row.status),
        row.activeWorkers,
        row.inactiveWorkers,
        row.incomeWallet,
        row.costWallet,
        row.profitWallet,
        escapeCSV(row.plan),
        escapeCSV(row.subStatus),
        escapeCSV(row.expiry),
        escapeCSV(row.phone),
        escapeCSV(row.email),
        escapeCSV(row.address),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `companies_list_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setIsExportOpen(false);
    if (!filteredCompanies || filteredCompanies.length === 0) {
      alert('No companies found to export.');
      return;
    }

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const rowsHtml = filteredCompanies
      .map((c, idx) => {
        const row = getCompanyExportRow(c, idx);
        return `
          <tr>
            <td style="text-align: center;">${row.sl}</td>
            <td style="font-weight: 600;">${row.name || '—'}</td>
            <td style="font-family: monospace;">${row.roc || '—'}</td>
            <td>${row.sector || '—'}</td>
            <td style="text-align: center;">
              <span class="badge ${row.status.toLowerCase() === 'inactive' ? 'badge-inactive' : 'badge-active'}">
                ${row.status}
              </span>
            </td>
            <td style="text-align: center; font-family: monospace; font-weight: 600;">${row.activeWorkers.toLocaleString()}</td>
            <td style="text-align: center; font-family: monospace;">${row.inactiveWorkers.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace; color: #1d4ed8; font-weight: 600;">RM ${row.incomeWallet.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace; color: #be123c;">RM ${row.costWallet.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace; color: #047857; font-weight: 600;">RM ${row.profitWallet.toLocaleString()}</td>
            <td style="text-align: center;">${row.plan}</td>
            <td style="text-align: center; font-family: monospace; font-size: 10px;">${row.expiry}</td>
          </tr>
        `;
      })
      .join('');

    const totalActiveWorkers = filteredCompanies.reduce((acc, c) => acc + getCompanyActiveWorkers(c), 0);
    const totalIncome = filteredCompanies.reduce((acc, c) => acc + getCompanyIncomeWallet(c), 0);
    const totalCost = filteredCompanies.reduce((acc, c) => acc + getCompanyCostWallet(c), 0);
    const totalProfit = filteredCompanies.reduce((acc, c) => acc + getCompanyProfitWallet(c), 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Companies Registry Report - ${today}</title>
        <style>
          @page {
            size: landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 16px;
            font-size: 11px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0b4da2;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            color: #0b4da2;
            margin: 0;
          }
          .subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            color: #475569;
          }
          .summary-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 14px;
          }
          .summary-card {
            flex: 1;
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #f8fafc;
          }
          .summary-card .lbl {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
          }
          .summary-card .val {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th {
            background: #22a34a;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 6px 7px;
            border: 1px solid #16a34a;
            white-space: nowrap;
          }
          td {
            padding: 5px 7px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-active {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          .badge-inactive {
            background: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }
          .footer {
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94a3b8;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">COMPANIES REGISTRY REPORT</h1>
            <div class="subtitle">Foreign Customer / Companies Management System</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${today}</div>
            <div><strong>Total Filtered:</strong> ${filteredCompanies.length} Companies</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-card">
            <div class="lbl">Total Listed Companies</div>
            <div class="val">${filteredCompanies.length}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Total Active Workers</div>
            <div class="val" style="color: #15803d;">${totalActiveWorkers.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Total Income Wallet</div>
            <div class="val" style="color: #1d4ed8;">RM ${totalIncome.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Total Cost Wallet</div>
            <div class="val" style="color: #be123c;">RM ${totalCost.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="lbl">Total Profit Wallet</div>
            <div class="val" style="color: #047857;">RM ${totalProfit.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">SL</th>
              <th>Company Name</th>
              <th>ROC</th>
              <th>Sector</th>
              <th style="text-align: center;">Status</th>
              <th style="text-align: center;">Active Workers</th>
              <th style="text-align: center;">Inactive Workers</th>
              <th style="text-align: right;">Income (RM)</th>
              <th style="text-align: right;">Cost (RM)</th>
              <th style="text-align: right;">Profit (RM)</th>
              <th style="text-align: center;">Subscription</th>
              <th style="text-align: center;">Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Generated by Companies Management System</span>
          <span>Confidential</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const companyCardFilterOptions: Select2Option[] = useMemo(() => [
    {
      value: 'ALL',
      label: `All Companies (${companies.length})`,
      subLabel: 'Aggregated totals across all registered employers',
      badge: 'ALL',
    },
    ...companies.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: c.sector,
      badge: c.roc,
    })),
  ], [companies]);

  const sectorFilterOptions: Select2Option[] = useMemo(() => [
    { value: 'ALL', label: `All Sectors (${companies.length})`, badge: 'ALL' },
    ...allSectorList.map((sec) => ({
      value: sec,
      label: sec,
      badge: `${companies.filter((c) => c.sector === sec).length}`,
    })),
  ], [companies, allSectorList]);

  const modalSectorOptions: Select2Option[] = useMemo(() => [
    ...allSectorList.map((sec) => ({
      value: sec,
      label: sec,
    })),
    { value: 'OTHER', label: '+ Other / Add New Sector (Specify Below)' },
  ], [allSectorList]);

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 text-xs animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-3 text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header with Title and Underline */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-wrap">
            {siteSettings?.site_logo ? (
              <img
                src={resolveFileUrl(siteSettings.site_logo)}
                alt={siteSettings?.site_name || 'Logo'}
                className="h-16 sm:h-20 md:h-24 w-auto max-w-[280px] sm:max-w-[380px] md:max-w-[440px] object-contain drop-shadow-xs"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {siteSettings?.site_name || 'Employer Companies Registry'}
              </span>
            )}
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
              selectedSingleCompany ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#0b4da2]'
            }`}>
              {selectedSingleCompany ? '1 Company Selected' : `${companies.length} Active`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/companies/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors cursor-pointer border-0 no-underline"
            >
              <Plus size={14} />
              <span>Add Company</span>
            </Link>
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Reset companies to default dataset in MySQL"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Company Select2 Filter for Cards Information */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 whitespace-nowrap shrink-0">
              <Building2 size={16} className="text-[#0b4da2]" />
              <span>Filter Cards by Company:</span>
            </div>

            {/* Company Filter */}
            <div className="w-52 sm:w-60 md:w-64 shrink-0">
              <Select2Search
                options={companyCardFilterOptions}
                value={selectedCompanyCardId}
                onChange={(val) => setSelectedCompanyCardId(val)}
                placeholder="All Companies (Aggregated)"
                searchPlaceholder="Search company by name, ROC, sector..."
                icon={<Building2 size={14} className="text-blue-600" />}
                dropdownWidth="w-[calc(100vw-2rem)] sm:w-[320px] max-w-[340px]"
              />
            </div>

            {/* Reset Filter button */}
            {selectedCompanyCardId !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCompanyCardId('ALL');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b4da2] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Reset card metrics to all companies"
              >
                <X size={13} />
                <span>Reset to All</span>
              </button>
            )}

            {/* Compact Sync Table Toggle */}
            {selectedSingleCompany && (
              <label className="text-[11px] text-slate-600 font-medium inline-flex items-center gap-1.5 cursor-pointer select-none shrink-0 ml-auto whitespace-nowrap bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={syncTableWithCardFilter}
                  onChange={(e) => setSyncTableWithCardFilter(e.target.checked)}
                  className="rounded text-[#0b4da2] focus:ring-blue-400 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Sync table below</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* TOP STAT & WALLET CARDS SECTION (Clean Design Matching Screenshot with Top Manage Button) */}
      <div className="space-y-4">
        {/* Section Header with Manage Cards & Priority Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
              Overview & Financial Treasury Cards
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 text-[10px] font-bold font-mono">
              {activeStatCards.length} Cards
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Manage Cards & Priority Button (Add Card Disabled) */}
            <button
              type="button"
              onClick={openManageModal}
              title="Click to change card names, upload icons, and arrange priority"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-blue-700 text-white shadow-xs hover:shadow transition-all cursor-pointer border-0"
            >
              <SlidersHorizontal size={14} />
              <span>Manage Cards & Priority</span>
            </button>
          </div>
        </div>

        {/* 12 Stat & Wallet Cards Grid (Matching Dashboard Card Design, Hardcoded Static Fallback) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeStatCards.map((card, index) => {
            const metrics = getCardMetrics(card);
            const isCurrency = metrics.value.startsWith('RM');
            const animClass = getServiceCardAnimationClass(cardAnimation, index);
            const animStyle = getServiceCardAnimationStyle(index, cardDuration, cardStagger);
            const cardKey = `${card.id || card.card_key}-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`;

            const cardClasses = `admin-stat-card ${animClass} ${
              isGlass
                ? `dashboard-card-glass rounded-2xl p-5 transition-all flex flex-col justify-between group min-h-[130px] no-underline ${
                    metrics.isLink && metrics.link
                      ? 'cursor-pointer active:scale-[0.99]'
                      : ''
                  } ${
                    card.card_key === 'total_profit'
                      ? 'ring-1 ring-emerald-300/60'
                      : ''
                  }`
                : `bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group min-h-[130px] no-underline ${
                    metrics.isLink && metrics.link
                      ? 'cursor-pointer hover:border-[#0b4da2] hover:ring-2 hover:ring-blue-100 active:scale-[0.99]'
                      : ''
                  } ${
                    card.card_key === 'total_profit'
                      ? 'border-emerald-300 ring-1 ring-emerald-200/80 bg-gradient-to-br from-emerald-50/30 via-white to-emerald-50/10 hover:border-emerald-400'
                      : 'border-slate-200 hover:border-blue-400'
                  }`
            }`;

            const isCompanyEntity = metrics.isCompanyEntity && selectedSingleCompany;

            const cardContent = (
              <>
                {/* Top Row: Title on Left, Icon on Right */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="text-xs text-slate-600 font-bold tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight line-clamp-2"
                    title={isCompanyEntity ? selectedSingleCompany.name : card.name}
                  >
                    {isCompanyEntity ? 'REGISTERED COMPANY' : card.name}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors p-0.5 ${
                      isCompanyEntity && selectedSingleCompany.logo
                        ? 'bg-white border border-slate-200 shadow-2xs'
                        : `${metrics.theme.bg} ${metrics.theme.text}`
                    }`}
                  >
                    {isCompanyEntity && selectedSingleCompany.logo ? (
                      <img
                        src={resolveFileUrl(selectedSingleCompany.logo)}
                        alt={selectedSingleCompany.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      renderCardIcon(card.icon, 16)
                    )}
                  </div>
                </div>

                {/* Middle Row: Full Width Value / Company Name */}
                {isCompanyEntity ? (
                  <div
                    className="font-extrabold tracking-tight text-slate-900 text-sm sm:text-base line-clamp-2 leading-snug my-1 min-h-[44px] flex items-center"
                    title={selectedSingleCompany.name}
                  >
                    {selectedSingleCompany.name}
                  </div>
                ) : (
                  <div
                    className={`font-bold tracking-tight font-mono my-0.5 ${
                      isCurrency ? 'text-[20px] sm:text-[22px] xl:text-[24px]' : 'text-2xl'
                    } ${metrics.theme.valColor}`}
                  >
                    {metrics.value}
                  </div>
                )}

                {/* Bottom Row: Subtitle / Link */}
                {metrics.isLink && metrics.link ? (
                  <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium group-hover:underline">
                    <TrendingUp size={12} className="shrink-0" />
                    <span className="truncate">{metrics.sub}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 mt-1 truncate" title={metrics.sub}>
                    {metrics.sub}
                  </div>
                )}
              </>
            );

            if (metrics.isLink && metrics.link) {
              return (
                <Link
                  key={cardKey}
                  href={metrics.link}
                  style={animStyle}
                  className={cardClasses}
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div
                key={cardKey}
                style={animStyle}
                className={cardClasses}
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Date-Wise Order & Metric Statistics Chart (Matching Screenshot) */}
      <CompanyOrderStatisticsChart
        companies={companies}
        statCards={statCards}
        initialCardKey={selectedCompanyCardId !== 'ALL' ? selectedCompanyCardId : 'deposit_wallet'}
      />

      {/* Filter and Search Bar for Company Registry Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'All Company', count: statusCounts.all },
              { key: 'active', label: 'Active Company', count: statusCounts.active },
              { key: 'inactive', label: 'Inactive Company', count: statusCounts.inactive },
              { key: 'rejected', label: 'Rejected Company', count: statusCounts.rejected },
            ].map((st) => {
              const isSelected = statusFilter === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar & Sector Filter */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company, ROC, sector..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 bg-transparent border-0 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {selectedSingleCompany && syncTableWithCardFilter && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#0b4da2] border border-blue-200 text-xs font-semibold">
                <span className="truncate max-w-[160px] sm:max-w-[220px]">Company: {selectedSingleCompany.name}</span>
                <button
                  type="button"
                  onClick={() => setSyncTableWithCardFilter(false)}
                  title="Show all companies in table while keeping cards filtered"
                  className="text-blue-500 hover:text-blue-700 bg-transparent border-0 cursor-pointer p-0 ml-1"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="w-full sm:w-56">
              <Select2Search
                options={sectorFilterOptions}
                value={selectedSector}
                onChange={(val) => setSelectedSector(val)}
                placeholder="Filter Sector..."
                searchPlaceholder="Search sectors..."
                icon={<Filter size={14} className="text-slate-400" />}
              />
            </div>

            {/* Export Dropdown Button (Excel, CSV, PDF) */}
            <div className="relative inline-block text-left shrink-0" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer border border-emerald-700"
                title="Export Companies List"
              >
                <Download size={14} className="shrink-0" />
                <span>Export</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Export ({filteredCompanies.length} records)
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <FileText size={15} className="text-blue-600 shrink-0" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <Printer size={15} className="text-rose-600 shrink-0" />
                    <span>Export PDF (.pdf)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The Signature Table Matching User's Required Columns */}
      <div className="w-full max-w-full overflow-hidden bg-white border border-slate-300 rounded-sm shadow-xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#22a34a] text-white text-xs font-bold whitespace-nowrap">
                <th className="py-3 px-4 border-r border-green-600/60 min-w-[200px]">
                  Company Name
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 min-w-[130px]">
                  ROC
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 text-center min-w-[130px]">
                  Total Active Worker
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 text-center min-w-[130px]">
                  Total Inactive Worker
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 text-right min-w-[135px]">
                  Total Income Wallet
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 text-right min-w-[130px]">
                  Total Cost Wallet
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 text-right min-w-[135px]">
                  Total Profit Wallet
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 text-center min-w-[145px]">
                  Subscription
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 text-center min-w-[135px]">
                  Expire Date
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 text-center min-w-[150px]">
                  Countdown
                </th>
                <th className="py-3 px-4 text-right min-w-[145px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredCompanies.map((company) => {
                const assignedPlan = subscriptionPlans.find(
                  (p) =>
                    p.plan_key === company.subscription_plan_key ||
                    p.name?.toLowerCase() === company.subscription_plan_key?.toLowerCase()
                );
                const planName =
                  assignedPlan?.name ||
                  (company.subscription_plan_key
                    ? company.subscription_plan_key
                        .split('_')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')
                    : 'Unassigned');

                const countdown = getCountdownInfo(company.subscription_expires_at);

                const formatExpiry = (isoStr?: string | null) => {
                  if (!isoStr || isoStr === 'infinite' || isoStr === 'infinity' || isoStr === 'lifetime') return null;
                  const d = new Date(isoStr);
                  if (isNaN(d.getTime())) return null;
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = d.toLocaleString('en-US', { month: 'short' });
                  const year = d.getFullYear();
                  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                  return { date: `${day} ${month} ${year}`, time };
                };
                const expiry = formatExpiry(company.subscription_expires_at);

                return (
                  <tr
                    key={company.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                  {/* 1. Company Name with Logo */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                        <img
                          src={resolveFileUrl(company.logo) || '/images/companies/gamuda.svg'}
                          alt={company.name}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).setAttribute('src', '/images/companies/others.svg');
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/companies/${encodeURIComponent(company.id)}`}
                            className="text-[#2563eb] hover:text-[#1d4ed8] hover:underline font-bold text-xs tracking-tight block truncate no-underline"
                            title={company.name}
                          >
                            {company.name}
                          </Link>
                          {company.status === 'inactive' ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                              Inactive
                            </span>
                          ) : company.auto_deactivate_at ? (
                            <span
                              suppressHydrationWarning
                              title={mounted && company.auto_deactivate_at ? `Scheduled auto-off: ${new Date(company.auto_deactivate_at).toLocaleString()}` : undefined}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 shrink-0 cursor-help"
                            >
                              <Clock size={9} />
                              <span>Auto-off timer</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {company.sector}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. ROC */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                    {company.roc}
                  </td>

                  {/* 3. Total Active Worker */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {getCompanyActiveWorkers(company).toLocaleString()}
                    </span>
                  </td>

                  {/* 4. Total Inactive Worker */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-center whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-slate-100 text-slate-600 border border-slate-200">
                      {getCompanyInactiveWorkers(company).toLocaleString()}
                    </span>
                  </td>

                  {/* 5. Total Income Wallet */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-right whitespace-nowrap font-mono font-bold text-xs text-blue-700">
                    RM {getCompanyIncomeWallet(company).toLocaleString()}
                  </td>

                  {/* 6. Total Cost Wallet */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-right whitespace-nowrap font-mono font-semibold text-xs text-rose-700">
                    RM {getCompanyCostWallet(company).toLocaleString()}
                  </td>

                  {/* 7. Total Profit Wallet */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-right whitespace-nowrap font-mono font-bold text-xs text-emerald-700">
                    RM {getCompanyProfitWallet(company).toLocaleString()}
                  </td>

                  {/* 8. Subscription */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-center whitespace-nowrap">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          company.subscription_plan_key
                            ? 'bg-blue-50 text-[#0b4da2] border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <Crown size={11} className={company.subscription_plan_key ? 'text-amber-500' : 'text-slate-400'} />
                        <span>{planName}</span>
                      </span>
                      {company.subscription_status && (
                        <span
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                            company.subscription_status === 'trial_active'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : company.subscription_status === 'active' || company.subscription_status === 'paid_active'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : company.subscription_status === 'expired'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : company.subscription_status === 'rejected'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {company.subscription_status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 9. Expire Date */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-center whitespace-nowrap" suppressHydrationWarning>
                    {assignedPlan?.is_free_plan ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Lifetime Access
                      </span>
                    ) : expiry ? (
                      <div className="flex flex-col items-center justify-center" suppressHydrationWarning>
                        <span className="font-mono font-semibold text-slate-700 text-xs" suppressHydrationWarning>
                          {mounted ? expiry.date : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono" suppressHydrationWarning>
                          {mounted ? expiry.time : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">No Expiry</span>
                    )}
                  </td>

                  {/* 10. Countdown */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-center whitespace-nowrap" suppressHydrationWarning>
                    {assignedPlan?.is_free_plan ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Lifetime</span>
                      </span>
                    ) : company.subscription_expires_at ? (
                      <span
                        suppressHydrationWarning
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${mounted ? countdown.color : 'text-slate-400 bg-slate-50 border-slate-200'}`}
                      >
                        <Clock size={12} />
                        <span suppressHydrationWarning>{mounted ? countdown.label : '...'}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">—</span>
                    )}
                  </td>

                  {/* 11. Action Buttons */}
                  <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Record Payment Button */}
                      <button
                        type="button"
                        onClick={() => setPayingCompany(company)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-2xs hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer border-0"
                        title={`Record Payment for ${company.name}`}
                      >
                        <DollarSign size={12} />
                        <span>Payment</span>
                      </button>

                      {/* Manage Status & Auto-Deactivation Timer */}
                      <button
                        type="button"
                        onClick={() => setStatusModalCompany(company)}
                        title={
                          company.status === 'inactive'
                            ? 'Company is Inactive - Click to Reactivate or manage status'
                            : company.auto_deactivate_at
                            ? (mounted ? `Active (Scheduled Auto-Off: ${new Date(company.auto_deactivate_at).toLocaleString()}) - Click to manage` : 'Active - Auto-Off Timer')
                            : 'Company is Active - Click to Deactivate or Set Auto-Off Timer'
                        }
                        className={`w-8 h-8 rounded border flex items-center justify-center transition-colors cursor-pointer shadow-2xs relative ${
                          company.status === 'inactive'
                            ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
                            : company.auto_deactivate_at
                            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {company.status === 'inactive' ? (
                          <PowerOff size={14} />
                        ) : company.auto_deactivate_at ? (
                          <Clock size={14} />
                        ) : (
                          <Power size={14} />
                        )}
                        {company.auto_deactivate_at && company.status !== 'inactive' && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white animate-pulse" />
                        )}
                      </button>

                      {/* Services Cards */}
                      <Link
                        href={`/services?company=${encodeURIComponent(company.id)}`}
                        title="Open Service Cards for this Company"
                        className="w-8 h-8 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-[#0b4da2] hover:text-blue-800 transition-colors shadow-2xs no-underline"
                      >
                        <Sparkles size={14} />
                      </Link>

                      {/* View Full Company Profile Page */}
                      <Link
                        href={`/companies/${encodeURIComponent(company.id)}`}
                        title="View Full Company & Directors Profile"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-600 hover:text-[#0b4da2] transition-colors shadow-2xs no-underline"
                      >
                        <Eye size={15} />
                      </Link>

                      {/* Edit Company */}
                      <Link
                        href={`/companies/create?id=${encodeURIComponent(company.id)}`}
                        title="Edit Company Details"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors shadow-2xs no-underline"
                      >
                        <Edit2 size={14} />
                      </Link>

                      {/* Delete Company */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(company.id)}
                        title="Delete Company Record"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-red-50 flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
                    No company found matching &quot;{searchTerm}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANAGE CARDS & PRIORITY MODAL */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                    <span>Manage Cards & Priority</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0b4da2] text-[10px] font-mono font-bold">
                      {manageCardsList.length} Cards
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 m-0">
                    Change card names, upload icons, and arrange display order (#1 shows first).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Cards List with inline edit capabilities */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
              {manageCardsList.map((card, idx) => {
                const rank = idx + 1;
                const isFirst = idx === 0;
                const isLast = idx === manageCardsList.length - 1;
                const isEditing = editingCardIdInModal === card.id;

                return (
                  <div
                    key={card.id || card.card_key}
                    className={`p-3 rounded-xl transition-colors border ${
                      isEditing
                        ? 'bg-blue-50/40 border-blue-200'
                        : rank === 1
                        ? 'bg-amber-50/50 border-amber-200/70'
                        : 'border-slate-100 hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Row Summary */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Rank Badge */}
                        <div className="shrink-0 w-8 text-center">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500 text-white font-black text-xs shadow-xs">
                              1
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs border border-slate-200">
                              {rank}
                            </span>
                          )}
                        </div>

                        {/* Icon Preview */}
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs text-slate-700">
                          {renderCardIcon(card.icon)}
                        </div>

                        {/* Card Name */}
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-900 block leading-tight break-words">
                            {card.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block leading-tight mt-0.5">
                            {rank === 1 ? '★ Priority #1 (First Position)' : `Priority Position #${rank}`}
                            {card.subtitle ? ` • ${card.subtitle}` : ''}
                            {card.custom_value !== undefined && Number(card.custom_value) > 0 ? ` • RM ${Number(card.custom_value).toLocaleString()}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: Rank input, Arrow icons, Edit button, Delete button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 mr-1">
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Rank:</span>
                          <input
                            type="number"
                            min={1}
                            max={manageCardsList.length}
                            value={rank}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1 && val <= manageCardsList.length) {
                                handleModalSetRank(idx, val);
                              }
                            }}
                            className="w-11 text-center bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0b4da2] rounded-lg py-1 text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleModalMoveItem(idx, 'top')}
                          title="Move to Top (#1 Priority)"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ChevronsUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleModalMoveItem(idx, 'up')}
                          title="Move Up"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#0b4da2] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleModalMoveItem(idx, 'down')}
                          title="Move Down"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#0b4da2] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleModalMoveItem(idx, 'bottom')}
                          title="Move to Bottom"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ChevronsDown size={14} />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => startInlineEdit(card)}
                          title="Edit Card Name & Icon"
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            isEditing
                              ? 'bg-[#0b4da2] text-white'
                              : 'bg-blue-50 text-[#0b4da2] hover:bg-blue-100'
                          }`}
                        >
                          <Edit2 size={12} />
                          <span>{isEditing ? 'Close' : 'Edit'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Edit Panel */}
                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-blue-200/70 space-y-3 bg-white p-3.5 rounded-xl border">
                        {/* Name Field */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Card Title / Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={modalEditName}
                            onChange={(e) => setModalEditName(e.target.value)}
                            className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-semibold"
                            placeholder="Enter card title..."
                          />
                        </div>

                        {/* Subtitle Field */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Card Subtitle / Description
                          </label>
                          <input
                            type="text"
                            value={modalEditSubtitle}
                            onChange={(e) => setModalEditSubtitle(e.target.value)}
                            className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                            placeholder="Enter card subtitle or description..."
                          />
                        </div>

                        {/* Custom amount field for financial/custom cards */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            {['others_cost', 'others_expense', 'total_cost_amount'].includes(card.card_key)
                              ? 'Expense / Cost Amount (RM)'
                              : ['others_profit', 'total_profit', 'total_profit_amount'].includes(card.card_key)
                              ? 'Profit Amount / Override (RM)'
                              : card.card_key.includes('income')
                              ? 'Income Amount / Override (RM)'
                              : card.card_key.includes('pending')
                              ? 'Pending Amount / Override (RM)'
                              : card.card_key.includes('donate') || card.card_key === 'donation'
                              ? 'Donation Amount / Override (RM)'
                              : card.card_key.includes('company')
                              ? 'Company Count / Override'
                              : 'Card Amount / Value (RM)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={modalEditCustomValue}
                            onChange={(e) => setModalEditCustomValue(Number(e.target.value))}
                            className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-mono font-bold"
                            placeholder="0"
                          />
                        </div>

                        {/* Icon Upload & Selection */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">
                            Card Icon / Logo
                          </label>

                          <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                            {/* Live Preview */}
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-2xs text-[#0b4da2]">
                              {modalEditIconPreview ? (
                                <img src={modalEditIconPreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                              ) : (
                                renderCardIcon(modalEditIcon)
                              )}
                            </div>

                            {/* Upload Button */}
                            <label className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-lg text-xs font-bold text-[#0b4da2] cursor-pointer transition-all w-full">
                              <Upload size={14} />
                              <span>Upload Icon File (SVG, PNG, JPG)</span>
                              <input
                                type="file"
                                accept="image/*,.svg"
                                className="hidden"
                                onChange={handleModalFileUpload}
                              />
                            </label>

                            {modalEditIconPreview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalEditIconPreview(null);
                                  setModalEditIconFile(null);
                                }}
                                className="text-xs text-red-600 hover:underline bg-transparent border-0 cursor-pointer font-semibold"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Preset Icons Selection */}
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Or Choose from Preset Icons:
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 border border-slate-100 rounded-lg">
                              {STAT_ICON_PRESETS.map((preset) => {
                                const isSelected = !modalEditIconPreview && modalEditIcon === preset.icon;
                                return (
                                  <button
                                    key={preset.icon}
                                    type="button"
                                    onClick={() => {
                                      setModalEditIcon(preset.icon);
                                      setModalEditIconPreview(null);
                                      setModalEditIconFile(null);
                                    }}
                                    title={preset.label}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all cursor-pointer ${
                                      isSelected
                                        ? 'border-[#0b4da2] bg-blue-50 text-[#0b4da2] ring-1 ring-[#0b4da2]'
                                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                                    }`}
                                  >
                                    <span className="w-4 h-4 flex items-center justify-center">
                                      {renderCardIcon(preset.icon)}
                                    </span>
                                    <span>{preset.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Done Editing Button */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => applyInlineCardEdit(card.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-blue-800 text-white cursor-pointer transition-colors shadow-2xs border-0"
                          >
                            <CheckCircle2 size={13} />
                            <span>Done Editing This Card</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs shrink-0">
              <button
                type="button"
                onClick={handleResetCardsDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 transition-colors cursor-pointer border-0"
              >
                <RotateCcw size={13} />
                <span>Reset Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingManage}
                  onClick={handleSaveManageModal}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-blue-800 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 border-0"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSavingManage ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW CARD MODAL */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                    Add New Financial / Metric Card
                  </h2>
                  <p className="text-xs text-slate-500 m-0">
                    Create a custom card to display in Companies Overview &amp; Treasury.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCardModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateNewCard} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Card Title / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addCardName}
                  onChange={(e) => setAddCardName(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Special Welfare Fund, VIP Reserve..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  value={addCardSubtitle}
                  onChange={(e) => setAddCardSubtitle(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Monthly Operational Reserve, Auxiliary Pool..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Amount / Value (RM)
                </label>
                <input
                  type="number"
                  min="0"
                  value={addCardValue}
                  onChange={(e) => setAddCardValue(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Card Icon / Logo
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-2xs text-emerald-600">
                    {addCardIconPreview ? (
                      <img src={addCardIconPreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      renderCardIcon(addCardIcon, 20)
                    )}
                  </div>
                  <label className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl text-xs font-bold text-emerald-700 cursor-pointer transition-all w-full">
                    <Upload size={14} />
                    <span>Upload Custom Icon (SVG, PNG, JPG)</span>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      className="hidden"
                      onChange={handleAddCardFileUpload}
                    />
                  </label>
                  {addCardIconPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddCardIconPreview(null);
                        setAddCardIconFile(null);
                      }}
                      className="text-xs text-red-600 hover:underline bg-transparent border-0 cursor-pointer font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                    Or Select Preset Icon:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 border border-slate-100 rounded-xl">
                    {STAT_ICON_PRESETS.map((preset) => {
                      const isSelected = !addCardIconPreview && addCardIcon === preset.icon;
                      return (
                        <button
                          key={preset.icon}
                          type="button"
                          onClick={() => {
                            setAddCardIcon(preset.icon);
                            setAddCardIconPreview(null);
                            setAddCardIconFile(null);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          <span className="w-4 h-4 flex items-center justify-center">
                            {renderCardIcon(preset.icon, 14)}
                          </span>
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddCard}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 border-0"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSubmittingAddCard ? 'Creating Card...' : 'Add Card'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COMPANY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingCompany(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 m-0">
                  {editingCompany ? 'Edit Employer Company' : 'Create New Company'}
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  {editingCompany
                    ? 'Update registered organization details and workforce.'
                    : 'Register a new employer organization in the Malaysian Immigration database.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCompany} className="flex flex-col gap-3.5 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NATASHA CONSTRUCTION SDN. BHD."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 uppercase font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ROC Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ROC-202601099234"
                    value={formRoc}
                    onChange={(e) => setFormRoc(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Foreign Worker
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formWorkers}
                    onChange={(e) => setFormWorkers(Number(e.target.value))}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Industry / Sector
                </label>
                <Select2Search
                  options={modalSectorOptions}
                  value={formSector}
                  onChange={(val) => setFormSector(val)}
                  placeholder="Select Industry Sector..."
                  searchPlaceholder="Search sectors..."
                />
                {formSector === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="e.g. Telecommunications & Networks"
                    value={formCustomSector}
                    onChange={(e) => setFormCustomSector(e.target.value)}
                    className="mt-2 w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Verification Status Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormTag(tag)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                        formTag === tag
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Corporate Logo
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {LOGO_PRESETS.map((lp) => (
                    <button
                      key={lp.path}
                      type="button"
                      onClick={() => setFormLogo(lp.path)}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                        formLogo === lp.path
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center">
                        <img src={lp.path} alt={lp.label} className="max-h-full max-w-full object-contain" />
                      </div>
                      <span className="text-[10px] text-slate-600 truncate w-full text-center">
                        {lp.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Official registered notes or business activities..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingCompany(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0 shadow-xs disabled:opacity-50"
                >
                  {isLoading ? 'Saving to Database...' : editingCompany ? 'Save Changes' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 m-0 mb-1">
              Delete Company Record?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              This action will remove the company from the MySQL database and public employer directory.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-xs"
              >
                {isLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPANY STATUS & AUTO-DEACTIVATION MODAL */}
      {statusModalCompany && (
        <CompanyStatusModal
          company={statusModalCompany}
          onClose={() => setStatusModalCompany(null)}
          onUpdated={handleCompanyStatusUpdated}
        />
      )}

      {/* Payment & Subscription Settlement Modal */}
      <CompanyPaymentModal
        isOpen={!!payingCompany}
        onClose={() => setPayingCompany(null)}
        data={
          payingCompany
            ? {
                id: payingCompany.id,
                companyName: payingCompany.name,
                roc: payingCompany.roc,
                email: payingCompany.email,
                phone: payingCompany.phone,
                address: payingCompany.address,
                planPackage: payingCompany.subscription_plan_key || 'Standard Subscription',
                amount: Number(
                  subscriptionPlans.find(
                    (p) =>
                      p.plan_key === payingCompany.subscription_plan_key ||
                      p.name?.toLowerCase() === payingCompany.subscription_plan_key?.toLowerCase()
                  )?.price || 199
                ),
              }
            : null
        }
        isSubmitting={isSubmittingPayment}
        onSubmit={handlePaymentSubmit}
      />
    </div>
  );
}
