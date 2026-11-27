'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  KeyRound,
  Layers,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  Wallet,
  X,
} from 'lucide-react';
import {
  CustomerRecord,
  WorkingSector,
  fetchCustomers,
  fetchWorkingSectors,
} from '@/lib/customerStorage';
import {
  FutureCustomerRecord,
  getStoredFutureCustomers,
  fetchFutureCustomers,
} from '@/lib/futureCustomerStorage';
import { ProgramRecord, fetchPrograms } from '@/lib/programStorage';
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
  fetchCompaniesFromBackend,
  getStoredCompanies,
  saveStoredCompany,
  subscribeToCompanyChanges,
  updateStoredCompany,
} from '@/lib/companyStorage';
import {
  CustomerTargetAmountRecord,
  CustomerDepositAmountRecord,
  CustomerPendingAmountRecord,
  CustomerCompanyCostRecord,
  CustomerRefundAmountRecord,
  fetchCustomerTargets,
  fetchCustomerDeposits,
  fetchCustomerPendings,
  fetchCustomerCompanyCosts,
  fetchCustomerRefunds,
  getStoredCustomerTargets,
  getStoredCustomerDeposits,
  getStoredCustomerPendings,
  getStoredCompanyCosts,
  getStoredCustomerRefunds,
} from '@/lib/customerFinanceStorage';
import { PageStatCardConfig } from '@/lib/pageCardStorage';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import CustomerOrderStatisticsChart from '@/components/CustomerOrderStatisticsChart';
import { getMasterAdminUser, AuthUser } from '@/lib/auth';
import {
  useDashboardCardDesign,
  useCardAnimationSettings,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
} from '@/lib/themeSettings';
import CompanyPaymentModal from '@/components/CompanyPaymentModal';
import {
  createInvoice,
  updateCompanySubscription,
  fetchSubscriptionPlans,
  SubscriptionPlan,
} from '@/lib/companyTrialAndFinanceStorage';

export type MasterAdminEmployeeRecord = {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: 'Employee' | 'Admin';
  assigned_companies: string[];
  assigned_service_cards?: string[];
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  status: 'active' | 'inactive';
};

export type DashboardViewMode = 'foreign_customer' | 'employees_permissions';

const FOREIGN_CUSTOMER_STAT_CARDS: PageStatCardConfig[] = [
  { id: 'total_customers', title: 'Total Customer', subtitle: 'Across selected employer entities', icon: 'Users', order_num: 1, metric_type: 'total_customers' },
  { id: 'active_customers', title: 'Active Customer', subtitle: 'Authorized worker permits', icon: 'UserCheck', order_num: 2, metric_type: 'active_customers' },
  { id: 'inactive_customers', title: 'Inactive Customer', subtitle: 'Suspended worker accounts', icon: 'UserX', order_num: 3, metric_type: 'inactive_customers' },
  { id: 'runaway_customers', title: 'Runaway Customer', subtitle: 'Absentee & runaway alerts', icon: 'UserMinus', order_num: 4, metric_type: 'runaway_customers' },
  { id: 'blacklist_customers', title: 'Black List Customer', subtitle: 'Flagged immigration records', icon: 'ShieldAlert', order_num: 5, metric_type: 'blacklist_customers' },
  { id: 'future_customers', title: 'Future Customer', subtitle: 'Upcoming candidate leads', icon: 'Sparkles', order_num: 6, metric_type: 'future_customers' },
  { id: 'target_amount', title: 'Customer Target Amount', subtitle: 'Cumulative target pool', icon: 'Target', order_num: 7, metric_type: 'target_wallet' },
  { id: 'deposit_amount', title: 'Customer Deposit Amount', subtitle: 'Total received customer deposit', icon: 'DollarSign', order_num: 8, metric_type: 'deposit_wallet' },
  { id: 'refund_amount', title: 'Customer Refund Amount', subtitle: 'Total refunded to customers', icon: 'RotateCcw', order_num: 9, metric_type: 'refund_wallet' },
  { id: 'pending_amount', title: 'Customer Pending Amount', subtitle: 'Outstanding clearance dues', icon: 'Clock', order_num: 10, metric_type: 'pending_wallet' },
  { id: 'cost_amount', title: 'Customer Cost Amount', subtitle: 'Company operational & levy cost', icon: 'FileSpreadsheet', order_num: 11, metric_type: 'cost_wallet' },
  { id: 'total_profit', title: 'Total Profit Amount', subtitle: 'Net retained company profit', icon: 'TrendingUp', order_num: 12, metric_type: 'profit_wallet' },
];

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

export default function MasterAdminCompaniesPage() {
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';
  const {
    animation: cardAnimation,
    duration: cardDuration,
    stagger: cardStagger,
    animTriggerKey,
  } = useCardAnimationSettings();

  const [mounted, setMounted] = useState(false);
  const [dashboardViewMode, setDashboardViewMode] = useState<DashboardViewMode>('foreign_customer');
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [selectedCardKey, setSelectedCardKey] = useState<string>('total_customers');

  // Top Card Select2 Filters
  const [selectedCompanyCardId, setSelectedCompanyCardId] = useState<string>('ALL');
  const [selectedProgramCardId, setSelectedProgramCardId] = useState<string>('ALL');
  const [selectedSectorCardId, setSelectedSectorCardId] = useState<string>('ALL');
  const [selectedYearCardId, setSelectedYearCardId] = useState<string>('ALL');

  // Data Collections
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [futureCustomers, setFutureCustomers] = useState<FutureCustomerRecord[]>([]);
  const [targetRecords, setTargetRecords] = useState<CustomerTargetAmountRecord[]>([]);
  const [depositRecords, setDepositRecords] = useState<CustomerDepositAmountRecord[]>([]);
  const [pendingRecords, setPendingRecords] = useState<CustomerPendingAmountRecord[]>([]);
  const [costRecords, setCostRecords] = useState<CustomerCompanyCostRecord[]>([]);
  const [refundRecords, setRefundRecords] = useState<CustomerRefundAmountRecord[]>([]);
  const [employees, setEmployees] = useState<MasterAdminEmployeeRecord[]>([]);

  // Staff Member table states for Employees & Permissions view
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');

  // Table & Modal States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [payingCompany, setPayingCompany] = useState<Company | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Edit form states
  const [formName, setFormName] = useState('');
  const [formRoc, setFormRoc] = useState('');
  const [formSector, setFormSector] = useState(SECTOR_OPTIONS[0]);
  const [formTag, setFormTag] = useState('');
  const [formWorkers, setFormWorkers] = useState<number>(100);
  const [formDescription, setFormDescription] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankAccountNo, setFormBankAccountNo] = useState('');

  // Current logged in Master Admin user
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

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

  const assignedList = useMemo(() => {
    return currentUser && Array.isArray(currentUser.assigned_companies)
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  // Load companies & all dataset safely on mount
  useEffect(() => {
    setMounted(true);
    const user = getMasterAdminUser();
    setCurrentUser(user);
    setAllCompanies(getStoredCompanies());
    setFutureCustomers(getStoredFutureCustomers());
    setTargetRecords(getStoredCustomerTargets());
    setDepositRecords(getStoredCustomerDeposits());
    setPendingRecords(getStoredCustomerPendings());
    setCostRecords(getStoredCompanyCosts());
    setRefundRecords(getStoredCustomerRefunds());

    fetchCompaniesFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setAllCompanies(list);
      }
    }).catch(() => { });

    fetchPrograms().then((progs) => {
      if (Array.isArray(progs) && progs.length > 0) {
        setPrograms(progs);
      }
    }).catch(() => { });

    fetchWorkingSectors().then((secs) => {
      if (Array.isArray(secs) && secs.length > 0) {
        setSectors(secs);
      }
    }).catch(() => { });

    fetchCustomers().then((custs) => {
      if (Array.isArray(custs) && custs.length > 0) {
        setAllCustomers(custs);
      }
    }).catch(() => { });

    fetchFutureCustomers().then((fCusts) => {
      if (Array.isArray(fCusts) && fCusts.length > 0) {
        setFutureCustomers(fCusts);
      }
    }).catch(() => { });

    fetchCustomerTargets().then(setTargetRecords).catch(() => { });
    fetchCustomerDeposits().then(setDepositRecords).catch(() => { });
    fetchCustomerPendings().then(setPendingRecords).catch(() => { });
    fetchCustomerCompanyCosts().then(setCostRecords).catch(() => { });
    fetchCustomerRefunds().then(setRefundRecords).catch(() => { });

    fetchSubscriptionPlans(true).then((plans) => {
      if (Array.isArray(plans)) setSubscriptionPlans(plans);
    }).catch(() => { });

    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    fetch(`${apiBase}/employees`, { cache: 'no-store' })
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        if (Array.isArray(data)) setEmployees(data);
      })
      .catch(() => { });

    const unsubCompanies = subscribeToCompanyChanges(() => {
      setAllCompanies(getStoredCompanies());
    });

    return () => {
      unsubCompanies();
    };
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Filter companies strictly by Master Admin assigned permission
  const permittedCompanies = useMemo(() => {
    if (assignedList.length === 0) return [];
    if (assignedList.includes('*')) return allCompanies;
    return allCompanies.filter((c) => {
      const cleanCompId = (c.id || '').trim().toLowerCase();
      const cleanCompName = (c.name || '').trim().toLowerCase();
      const cleanCompRoc = (c.roc || '').trim().toLowerCase();
      const cleanDbId = String(c.db_id || '');
      const cleanCompNormalized = cleanCompName.replace(/[^a-z0-9]/g, '');

      return assignedList.some((raw) => {
        const id = (raw || '').trim().toLowerCase();
        if (!id) return false;
        const idNormalized = id.replace(/[^a-z0-9]/g, '');
        return (
          id === cleanCompId ||
          id === cleanCompName ||
          (cleanCompRoc && id === cleanCompRoc) ||
          (cleanDbId && id === cleanDbId) ||
          (idNormalized && cleanCompNormalized && idNormalized === cleanCompNormalized)
        );
      });
    });
  }, [allCompanies, assignedList]);

  // Options for Company Card Filter
  const companyCardFilterOptions: Select2Option[] = useMemo(() => [
    {
      value: 'ALL',
      label: `All Permitted Companies (${permittedCompanies.length})`,
      subLabel: 'Aggregated scope across assigned entities',
      badge: 'ALL',
    },
    ...permittedCompanies.map((c) => ({
      value: String(c.id),
      label: c.name,
      subLabel: c.sector,
      badge: c.roc,
    })),
  ], [permittedCompanies]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
      years.add(String(y));
    }
    allCustomers.forEach((cust) => {
      if (cust.created_at) {
        const y = cust.created_at.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
      if (cust.passport_issue_date) {
        const py = cust.passport_issue_date.slice(0, 4);
        if (/^\d{4}$/.test(py)) years.add(py);
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [allCustomers]);

  const programCardFilterOptions: Select2Option[] = useMemo(() => [
    {
      value: 'ALL',
      label: `All Programs (${programs.length})`,
      subLabel: 'All government employment clearance schemes',
      badge: `${programs.length} Progs`,
    },
    ...programs.map((p) => ({
      value: String(p.id),
      label: p.name,
      subLabel: p.description || p.code,
      badge: p.code || undefined,
    })),
  ], [programs]);

  const sectorCardFilterOptions: Select2Option[] = useMemo(() => {
    const set = new Set<string>();
    sectors.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    SECTOR_OPTIONS.forEach((s) => set.add(s));
    allCustomers.forEach((c) => {
      if (c.working_sector) set.add(c.working_sector);
    });
    const list = Array.from(set).sort();
    return [
      {
        value: 'ALL',
        label: `All Working Sectors (${list.length})`,
        subLabel: 'All job & economic sectors',
        badge: `${list.length} Sectors`,
      },
      ...list.map((s) => ({
        value: s,
        label: s,
      })),
    ];
  }, [sectors, allCustomers]);

  const yearCardFilterOptions: Select2Option[] = useMemo(() => [
    {
      value: 'ALL',
      label: `All Years (${availableYears.length})`,
      subLabel: 'All historical & current clearance years',
      badge: `${availableYears.length} Yrs`,
    },
    ...availableYears.map((yr) => ({
      value: yr,
      label: `Year ${yr}`,
      subLabel: `Clearances & quotas for ${yr}`,
    })),
  ], [availableYears]);

  // Currently selected single company (either by filter or if only 1 permitted company exists)
  const selectedSingleCompany = useMemo(() => {
    if (permittedCompanies.length === 1) return permittedCompanies[0];
    if (selectedCompanyCardId === 'ALL') return null;
    return permittedCompanies.find((c) => String(c.id) === String(selectedCompanyCardId)) || null;
  }, [permittedCompanies, selectedCompanyCardId]);

  // Filtered scope for treasury cards and statistics chart
  const selectedCardCompanies = useMemo(() => {
    if (selectedSingleCompany) return [selectedSingleCompany];
    return permittedCompanies;
  }, [selectedSingleCompany, permittedCompanies]);

  // Scoped customers filtered by permitted companies and top filter cards
  const scopedCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const compMatch = permittedCompanies.some(
        (pc) =>
          c.company_id &&
          (c.company_id.toLowerCase() === pc.id.toLowerCase() ||
            c.company_id.toLowerCase() === pc.name.toLowerCase())
      );
      if (!compMatch) return false;

      if (selectedCompanyCardId !== 'ALL') {
        const matchesComp =
          c.company_id &&
          (c.company_id.toLowerCase() === selectedCompanyCardId.toLowerCase() ||
            (selectedSingleCompany && c.company_id.toLowerCase() === selectedSingleCompany.name.toLowerCase()));
        if (!matchesComp) return false;
      }
      if (selectedProgramCardId !== 'ALL') {
        if (String(c.program_id) !== String(selectedProgramCardId)) return false;
      }
      if (selectedSectorCardId !== 'ALL') {
        if (!c.working_sector || c.working_sector.toLowerCase() !== selectedSectorCardId.toLowerCase()) {
          return false;
        }
      }
      if (selectedYearCardId !== 'ALL') {
        const y = (c.created_at || '').slice(0, 4);
        const py = (c.passport_issue_date || '').slice(0, 4);
        if (y !== selectedYearCardId && py !== selectedYearCardId) return false;
      }
      return true;
    });
  }, [allCustomers, permittedCompanies, selectedCompanyCardId, selectedSingleCompany, selectedProgramCardId, selectedSectorCardId, selectedYearCardId]);

  // Scoped future customers
  const scopedFutureCustomers = useMemo(() => {
    if (selectedYearCardId === 'ALL') return futureCustomers;
    return futureCustomers.filter(
      (fc) => fc.created_at && fc.created_at.slice(0, 4) === selectedYearCardId
    );
  }, [futureCustomers, selectedYearCardId]);

  // Scoped employees belonging to permitted scope
  const scopedEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const assigned = Array.isArray(emp.assigned_companies) ? emp.assigned_companies : [];
      const inPermitted =
        assignedList.length === 0 ||
        assignedList.includes('*') ||
        assigned.some((cId) =>
          permittedCompanies.some(
            (pc) => pc.id.toLowerCase() === cId.toLowerCase() || pc.name.toLowerCase() === cId.toLowerCase()
          )
        );

      if (!inPermitted) return false;

      if (selectedCompanyCardId !== 'ALL') {
        const matchComp = assigned.some(
          (cId) =>
            cId.toLowerCase() === selectedCompanyCardId.toLowerCase() ||
            (selectedSingleCompany && cId.toLowerCase() === selectedSingleCompany.name.toLowerCase())
        );
        if (!matchComp) return false;
      }

      return true;
    });
  }, [employees, assignedList, permittedCompanies, selectedCompanyCardId, selectedSingleCompany]);

  // Filter table with search & sector
  const filteredCompanies = useMemo(() => {
    return permittedCompanies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.roc && c.roc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.sector.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSector = selectedSector === 'ALL' || c.sector === selectedSector;
      const matchCardCompany = !selectedSingleCompany || String(c.id) === String(selectedSingleCompany.id);

      const matchesProgram =
        selectedProgramCardId === 'ALL' ||
        scopedCustomers.some(
          (cust) =>
            cust.company_id &&
            (cust.company_id.toLowerCase() === c.id.toLowerCase() ||
              cust.company_id.toLowerCase() === c.name.toLowerCase())
        );

      const matchesSectorCard =
        selectedSectorCardId === 'ALL' ||
        c.sector.toLowerCase() === selectedSectorCardId.toLowerCase() ||
        scopedCustomers.some(
          (cust) =>
            cust.working_sector?.toLowerCase() === selectedSectorCardId.toLowerCase() &&
            cust.company_id &&
            (cust.company_id.toLowerCase() === c.id.toLowerCase() ||
              cust.company_id.toLowerCase() === c.name.toLowerCase())
        );

      const matchesYear =
        selectedYearCardId === 'ALL' ||
        scopedCustomers.some(
          (cust) =>
            cust.company_id &&
            (cust.company_id.toLowerCase() === c.id.toLowerCase() ||
              cust.company_id.toLowerCase() === c.name.toLowerCase())
        );

      return matchSearch && matchSector && matchCardCompany && matchesProgram && matchesSectorCard && matchesYear;
    });
  }, [permittedCompanies, searchTerm, selectedSector, selectedSingleCompany, selectedProgramCardId, selectedSectorCardId, selectedYearCardId, scopedCustomers]);

  // Foreign Customer Card Metrics Calculation
  const getForeignCustomerCardMetrics = (card: PageStatCardConfig) => {
    const metric = card.metric_type || card.id;
    const list = scopedCustomers;
    const listCustomerIds = new Set(list.map((c) => String(c.id)));

    switch (metric) {
      case 'total_customers': {
        return {
          value: list.length.toLocaleString(),
          sub: selectedSingleCompany ? `${selectedSingleCompany.name} Customers` : 'Across permitted entities',
          isLink: true,
          link: '/customers/dashboard',
          theme: { bg: 'bg-blue-50', text: 'text-[#0b4da2]', valColor: 'text-slate-900' },
        };
      }
      case 'active_customers': {
        const c = list.filter((w) => w.status === 'active').length;
        return {
          value: c.toLocaleString(),
          sub: 'Authorized worker permits',
          isLink: true,
          link: '/customers/active',
          theme: { bg: 'bg-emerald-50', text: 'text-emerald-700', valColor: 'text-emerald-600' },
        };
      }
      case 'inactive_customers': {
        const c = list.filter((w) => w.status === 'inactive').length;
        return {
          value: c.toLocaleString(),
          sub: 'Suspended worker accounts',
          isLink: true,
          link: '/customers/inactive',
          theme: { bg: 'bg-rose-50', text: 'text-rose-700', valColor: 'text-rose-600' },
        };
      }
      case 'runaway_customers': {
        const c = list.filter((w) => w.status === 'runaway').length;
        return {
          value: c.toLocaleString(),
          sub: 'Absentee & runaway alerts',
          isLink: true,
          link: '/customers/runaway',
          theme: { bg: 'bg-orange-50', text: 'text-orange-700', valColor: 'text-orange-600' },
        };
      }
      case 'blacklist_customers': {
        const c = list.filter((w) => w.status === 'blacklist').length;
        return {
          value: c.toLocaleString(),
          sub: 'Flagged immigration records',
          isLink: true,
          link: '/customers/blacklist',
          theme: { bg: 'bg-slate-900', text: 'text-white', valColor: 'text-slate-900' },
        };
      }
      case 'future_customers': {
        const c = scopedFutureCustomers.length;
        return {
          value: c.toLocaleString(),
          sub: 'Upcoming candidate leads',
          isLink: true,
          link: '/customers/future',
          theme: { bg: 'bg-purple-50', text: 'text-purple-700', valColor: 'text-purple-600' },
        };
      }
      case 'target_wallet':
      case 'target_amount':
      case 'customer_target_amount': {
        const relevantTargets = targetRecords.filter((t) => {
          if (selectedCompanyCardId !== 'ALL' && t.company_id && t.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(t.customer_id));
        });
        const targetSum = list.length === 0
          ? 0
          : relevantTargets.reduce((sum, t) => sum + (Number(t.target_amount) || 0), 0);
        return {
          value: `RM ${targetSum.toLocaleString()}`,
          sub: 'Customer Target Pool',
          isLink: true,
          link: '/customers/target-amount',
          theme: { bg: 'bg-blue-50', text: 'text-[#0b4da2]', valColor: 'text-slate-900' },
        };
      }
      case 'deposit_wallet':
      case 'deposit_amount':
      case 'customer_deposit_amount': {
        const relevantDeposits = depositRecords.filter((d) => {
          if (selectedCompanyCardId !== 'ALL' && d.company_id && d.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(d.customer_id));
        });
        const depositSum = list.length === 0
          ? 0
          : relevantDeposits.reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);
        return {
          value: `RM ${depositSum.toLocaleString()}`,
          sub: 'Customer Deposit Received',
          isLink: true,
          link: '/customers/deposit-amount',
          theme: { bg: 'bg-emerald-50', text: 'text-emerald-700', valColor: 'text-emerald-600' },
        };
      }
      case 'refund_wallet':
      case 'refund_amount':
      case 'customer_refund_amount': {
        const relevantRefunds = refundRecords.filter((r) => {
          if (selectedCompanyCardId !== 'ALL' && r.company_id && r.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(r.customer_id));
        });
        const refundSum = list.length === 0
          ? 0
          : relevantRefunds.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);
        return {
          value: `RM ${refundSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          sub: 'Customer Refund Outflow',
          isLink: true,
          link: '/customers/refund-amount',
          theme: { bg: 'bg-rose-50', text: 'text-rose-700', valColor: 'text-rose-600' },
        };
      }
      case 'pending_wallet':
      case 'pending_amount':
      case 'customer_pending_amount': {
        const relevantTargets = targetRecords.filter((t) => {
          if (selectedCompanyCardId !== 'ALL' && t.company_id && t.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(t.customer_id));
        });
        const relevantDeposits = depositRecords.filter((d) => {
          if (selectedCompanyCardId !== 'ALL' && d.company_id && d.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(d.customer_id));
        });
        const tSum = list.length === 0 ? 0 : relevantTargets.reduce((sum, t) => sum + (Number(t.target_amount) || 0), 0);
        const dSum = list.length === 0 ? 0 : relevantDeposits.reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);
        const pendingSum = Math.max(0, tSum - dSum);
        return {
          value: `RM ${pendingSum.toLocaleString()}`,
          sub: 'Customer Pending Clearance Dues',
          isLink: true,
          link: '/customers/pending-amount',
          theme: { bg: 'bg-amber-50', text: 'text-amber-700', valColor: 'text-amber-600' },
        };
      }
      case 'cost_wallet':
      case 'cost_amount':
      case 'customer_cost_amount': {
        const relevantCosts = costRecords.filter((c) => {
          if (selectedCompanyCardId !== 'ALL' && c.company_id && c.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(c.customer_id));
        });
        const costSum = list.length === 0
          ? 0
          : relevantCosts.reduce((sum, c) => sum + (Number(c.total_cost_amount) || 0), 0);
        return {
          value: `RM ${costSum.toLocaleString()}`,
          sub: 'Company Operational & Levy Cost',
          isLink: true,
          link: '/customers/company-cost',
          theme: { bg: 'bg-rose-50', text: 'text-rose-700', valColor: 'text-rose-600' },
        };
      }
      case 'profit_wallet':
      case 'total_profit':
      case 'customer_profit_amount':
      case 'total_profit_amount': {
        const relevantDeposits = depositRecords.filter((d) => {
          if (selectedCompanyCardId !== 'ALL' && d.company_id && d.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(d.customer_id));
        });
        const relevantRefunds = refundRecords.filter((r) => {
          if (selectedCompanyCardId !== 'ALL' && r.company_id && r.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(r.customer_id));
        });
        const relevantCosts = costRecords.filter((c) => {
          if (selectedCompanyCardId !== 'ALL' && c.company_id && c.company_id.toLowerCase() !== selectedCompanyCardId.toLowerCase()) return false;
          return listCustomerIds.has(String(c.customer_id));
        });

        const dSum = list.length === 0 ? 0 : relevantDeposits.reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);
        const rSum = list.length === 0 ? 0 : relevantRefunds.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);
        const cSum = list.length === 0 ? 0 : relevantCosts.reduce((sum, c) => sum + (Number(c.total_cost_amount) || 0), 0);
        const profitSum = Math.max(0, dSum - rSum - cSum);

        return {
          value: `RM ${profitSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          sub: 'Total Net Retained Margin',
          isLink: true,
          link: '/masteradmin/customers/statement',
          theme: { bg: 'bg-emerald-50', text: 'text-emerald-700', valColor: 'text-emerald-600' },
        };
      }
      default: {
        return {
          value: '0',
          sub: card.subtitle || '',
          isLink: false,
          theme: { bg: 'bg-slate-100', text: 'text-slate-700', valColor: 'text-slate-800' },
        };
      }
    }
  };

  // Filtered staff employees for Employees & Permissions view
  const filteredStaffEmployees = useMemo(() => {
    return scopedEmployees.filter((emp) => {
      const term = staffSearchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        emp.name.toLowerCase().includes(term) ||
        emp.employee_code.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term);

      const matchStatus = staffStatusFilter === 'ALL' || emp.status === staffStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [scopedEmployees, staffSearchTerm, staffStatusFilter]);

  const handleToggleStaffStatus = async (emp: MasterAdminEmployeeRecord) => {
    const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    try {
      const res = await fetch(`${apiBase}/employees/${emp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, status: nextStatus } : e))
        );
        showToast('info', `Staff status updated to ${nextStatus.toUpperCase()}.`);
      }
    } catch {
      showToast('info', 'Failed to update status.');
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    try {
      const res = await fetch(`${apiBase}/employees/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        showToast('success', 'Staff member deleted successfully.');
      }
    } catch {
      showToast('info', 'Failed to delete staff member.');
    }
  };

  const fetchEmployeesData = async () => {
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    try {
      const res = await fetch(`${apiBase}/employees`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setEmployees(data);
        showToast('info', 'Staff list refreshed.');
      }
    } catch {
      showToast('info', 'Failed to refresh staff.');
    }
  };

  // Options for Top Dashboard View Selector Dropdown
  const dashboardViewOptions: Select2Option[] = useMemo(() => [
    {
      value: 'foreign_customer',
      label: 'Foreign Customer',
      subLabel: 'Customer cards, treasury metrics & statistics graph',
      badge: 'DEFAULT',
    },
    {
      value: 'employees_permissions',
      label: 'Employees & Permissions',
      subLabel: 'Staff roster, roles, credentials & company delegation',
      badge: `${scopedEmployees.length} Staff`,
    },
  ], [scopedEmployees.length]);

  const isAnyFilterActive =
    selectedCompanyCardId !== 'ALL' ||
    selectedProgramCardId !== 'ALL' ||
    selectedSectorCardId !== 'ALL' ||
    selectedYearCardId !== 'ALL';

  const handleResetAllFilters = () => {
    setSelectedCompanyCardId('ALL');
    setSelectedProgramCardId('ALL');
    setSelectedSectorCardId('ALL');
    setSelectedYearCardId('ALL');
  };

  const getCompanyExportRow = (company: Company, idx: number) => {
    const planName = company.subscription_plan_key
      ? company.subscription_plan_key
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      : 'Standard';

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
        '#': row.sl,
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
    worksheet['!cols'] = [
      { wch: 5 },  // #
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
      '#',
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
              <th style="width: 25px; text-align: center;">#</th>
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

  // Open Edit Modal
  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setFormName(comp.name);
    setFormRoc(comp.roc || '');
    setFormSector(comp.sector);
    setFormTag(comp.tag || '');
    setFormWorkers(comp.totalWorkers || 100);
    setFormDescription(comp.description || '');
    setFormAddress(comp.address || '');
    setFormPhone(comp.phone || '');
    setFormEmail(comp.email || '');
    setFormBankName(comp.bankName || '');
    setFormBankAccountNo(comp.bankAccountNo || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    setIsLoading(true);
    try {
      const updated: Company = {
        ...editingCompany,
        name: formName.trim(),
        roc: formRoc.trim(),
        sector: formSector,
        tag: formTag.trim(),
        totalWorkers: Number(formWorkers) || 0,
        description: formDescription.trim(),
        address: formAddress.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        bankName: formBankName.trim(),
        bankAccountNo: formBankAccountNo.trim(),
      };

      await updateStoredCompany(updated);
      setEditingCompany(null);
      showToast('success', `Company "${formName}" updated successfully!`);
    } catch {
      showToast('info', 'Failed to save changes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPaymentModal = (comp: Company) => {
    setPayingCompany(comp);
  };

  const handlePaymentSubmit = async (paymentInfo: {
    amount: number;
    method: string;
    reference: string;
    bankName: string;
    notes: string;
    tab?: string;
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

      let updatedWalletBalance = payingCompany.wallet_balance;
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
              requested_by: 'Master Admin',
            }),
          }
        );
        const deductData = await deductRes.json();
        if (!deductRes.ok || !deductData.success) {
          throw new Error(deductData.message || 'Insufficient wallet balance for this payment.');
        }
        updatedWalletBalance = deductData.wallet_balance;
      }

      // 1. Create official Paid Invoice
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
            description: `Subscription Access: ${selectedPlanName} (${selectedDurationDays} Days)`,
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
        notes: paymentInfo.notes || `Payment recorded directly by Master Admin for ${payingCompany.name}`,
      });

      // 2. Activate / Extend company subscription
      await updateCompanySubscription(payingCompany.id, {
        subscription_plan_key: selectedPlanKey,
        subscription_status: 'active',
        extra_days: selectedDurationDays,
        subscription_notes: `Subscription payment of RM ${total.toFixed(2)} (${selectedPlanName}) recorded via ${paymentInfo.method}.`,
      });

      // 3. Update local state
      setAllCompanies((prev) =>
        prev.map((c) =>
          c.id === payingCompany.id
            ? {
              ...c,
              wallet_balance: updatedWalletBalance,
              subscription_plan_key: selectedPlanKey || c.subscription_plan_key,
              subscription_status: 'active',
              status: 'active',
            }
            : c
        )
      );

      showToast('success', `Payment of RM ${total.toFixed(2)} recorded via ${paymentInfo.method} for ${payingCompany.name}! Subscription activated.`);

      window.dispatchEvent(new Event('portal-companies-updated'));
      window.dispatchEvent(new Event('company_trials_updated'));
      setPayingCompany(null);
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Safe SSR Skeleton to prevent Next.js React hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm">
          <div className="h-4 w-40 bg-white/20 rounded mb-2" />
          <div className="h-7 w-72 bg-white/30 rounded mb-2" />
          <div className="h-4 w-96 bg-white/20 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-blue-50 text-blue-800 border-blue-300'
            }`}
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP DASHBOARD VIEW MODE SELECTOR (FOREIGN CUSTOMER [DEFAULT], EMPLOYEE, PERMISSION) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold shadow-2xs">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Master Admin Dashboard View
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800">
              Select Operating Dashboard
            </div>
          </div>
        </div>

        {/* Mode Selector Dropdown */}
        <div className="w-full sm:w-72 md:w-80">
          <Select2Search
            options={dashboardViewOptions}
            value={dashboardViewMode}
            onChange={(val) => setDashboardViewMode(val as DashboardViewMode)}
            placeholder="Select Dashboard View..."
            searchPlaceholder="Search view..."
            icon={
              dashboardViewMode === 'foreign_customer' ? (
                <Globe2 size={15} className="text-[#0b4da2]" />
              ) : (
                <Users size={15} className="text-emerald-600" />
              )
            }
            dropdownWidth="w-[calc(100vw-2rem)] sm:w-[320px] max-w-[340px]"
            dropdownAlign="right"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER BAR (COMPANY, PROGRAM, WORKING SECTOR, YEAR) */}
      {/* ========================================================================= */}
      {dashboardViewMode === 'foreign_customer' && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 whitespace-nowrap shrink-0">
              <Filter size={15} className="text-[#0b4da2]" />
              <span>Filter Scope:</span>
            </div>

            {/* 1. Company Filter */}
            {permittedCompanies.length > 1 ? (
              <div className="w-52 sm:w-56 md:w-60 shrink-0">
                <Select2Search
                  options={companyCardFilterOptions}
                  value={selectedCompanyCardId}
                  onChange={(val) => setSelectedCompanyCardId(val)}
                  placeholder="All Permitted Companies"
                  searchPlaceholder="Search company by name, ROC, sector..."
                  icon={<Building2 size={14} className="text-blue-600" />}
                  dropdownWidth="w-[calc(100vw-2rem)] sm:w-[320px] max-w-[340px]"
                />
              </div>
            ) : permittedCompanies.length === 1 ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 shrink-0">
                <Building2 size={13} className="text-blue-600" />
                <span>{permittedCompanies[0].name}</span>
              </div>
            ) : null}

            {/* 2. Program Filter */}
            <div className="w-44 sm:w-48 md:w-52 shrink-0">
              <Select2Search
                options={programCardFilterOptions}
                value={selectedProgramCardId}
                onChange={(val) => setSelectedProgramCardId(val)}
                placeholder="All Programs"
                searchPlaceholder="Search program name or code..."
                icon={<Layers size={14} className="text-indigo-600" />}
                dropdownWidth="w-[calc(100vw-2rem)] sm:w-[300px] max-w-[320px]"
              />
            </div>

            {/* 3. Working Sector Filter (New Addition) */}
            <div className="w-44 sm:w-48 md:w-52 shrink-0">
              <Select2Search
                options={sectorCardFilterOptions}
                value={selectedSectorCardId}
                onChange={(val) => setSelectedSectorCardId(val)}
                placeholder="All Working Sectors"
                searchPlaceholder="Search working sector..."
                icon={<Briefcase size={14} className="text-emerald-600" />}
                dropdownWidth="w-[calc(100vw-2rem)] sm:w-[300px] max-w-[320px]"
              />
            </div>

            {/* 4. Year Filter */}
            <div className="w-32 sm:w-36 md:w-40 shrink-0">
              <Select2Search
                options={yearCardFilterOptions}
                value={selectedYearCardId}
                onChange={(val) => setSelectedYearCardId(val)}
                placeholder="All Years"
                searchPlaceholder="Search year (e.g. 2026)..."
                icon={<Calendar size={14} className="text-amber-600" />}
                dropdownAlign="right"
                dropdownWidth="w-[calc(100vw-2rem)] sm:w-[220px] max-w-[240px]"
              />
            </div>

            {/* Reset All Filters Button */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b4da2] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Reset all filters to defaults"
              >
                <RotateCcw size={13} />
                <span>Reset All</span>
              </button>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
            Scope:{' '}
            <span className="font-bold text-slate-700">
              {selectedSingleCompany ? selectedSingleCompany.name : `${permittedCompanies.length} Permitted Entities`}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW 1: FOREIGN CUSTOMER DASHBOARD (DEFAULT VIEW) */}
      {/* ========================================================================= */}
      {dashboardViewMode === 'foreign_customer' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
                Foreign Customer Overview &amp; Treasury Cards
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 text-[10px] font-bold font-mono">
                {FOREIGN_CUSTOMER_STAT_CARDS.length} Cards
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/customers/create"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-2xs transition-colors no-underline"
              >
                <Plus size={13} />
                <span>Add Customer</span>
              </Link>
              <Link
                href="/customers/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0b4da2] border border-blue-200 transition-colors no-underline"
              >
                <Users size={13} />
                <span>Customer Directory</span>
              </Link>
            </div>
          </div>

          {/* 11 Foreign Customer Stat & Wallet Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FOREIGN_CUSTOMER_STAT_CARDS.map((card, index) => {
              const metrics = getForeignCustomerCardMetrics(card);
              const isCurrency = metrics.value.startsWith('RM');
              const isSelected = selectedCardKey === (card.id || card.metric_type);
              const animClass = getServiceCardAnimationClass(cardAnimation, index);
              const animStyle = getServiceCardAnimationStyle(index, cardDuration, cardStagger);
              const cardKey = `fc-${card.id || card.metric_type}-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`;

              const cardClasses = `admin-stat-card ${animClass} ${isGlass
                ? `dashboard-card-glass rounded-2xl p-5 transition-all flex flex-col justify-between group min-h-[110px] no-underline cursor-pointer active:scale-[0.99] ${isSelected
                  ? 'ring-2 ring-emerald-500 shadow-md bg-emerald-50/20'
                  : ''
                }`
                : `bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group min-h-[110px] no-underline cursor-pointer ${isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-50/15'
                  : 'border-slate-200 hover:border-blue-400'
                }`
                }`;

              return (
                <div
                  key={cardKey}
                  style={animStyle}
                  onClick={() => setSelectedCardKey(card.id || card.metric_type || 'total_customers')}
                  className={cardClasses}
                  title={`Click to view ${card.title} in order statistics chart`}
                >
                  {/* Top Row: Title on Left, Icon on Right */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-xs text-slate-600 font-bold tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight line-clamp-2"
                      title={card.title}
                    >
                      {card.title}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors p-0.5 ${metrics.theme.bg} ${metrics.theme.text}`}
                    >
                      <DynamicCardIcon icon={card.icon} size={16} />
                    </div>
                  </div>

                  {/* Middle Row: Full Width Value */}
                  <div
                    className={`font-bold tracking-tight font-mono my-0.5 ${isCurrency ? 'text-[20px] sm:text-[22px] xl:text-[24px]' : 'text-2xl'
                      } ${metrics.theme.valColor}`}
                  >
                    {metrics.value}
                  </div>

                  {/* Bottom Row: Subtitle / Link */}
                  {metrics.isLink && metrics.link ? (
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 mt-1">
                      <span className="truncate">{metrics.sub}</span>
                      <Link
                        href={metrics.link}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 font-semibold shrink-0 no-underline"
                        title={`Go to ${card.title} page`}
                      >
                        <span>View</span>
                        <ArrowRight size={10} />
                      </Link>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 mt-1 truncate" title={metrics.sub}>
                      {metrics.sub}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Interactive Date-Wise Customer Order & Metric Statistics Chart */}
          <CustomerOrderStatisticsChart
            customers={scopedCustomers}
            companies={selectedCardCompanies}
            statCards={FOREIGN_CUSTOMER_STAT_CARDS}
            initialCardKey={selectedCardKey}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW 2: EMPLOYEES & PERMISSIONS DASHBOARD (EXACT SAME AS /masteradmin/employees) */}
      {/* ========================================================================= */}
      {dashboardViewMode === 'employees_permissions' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
                  <Users size={12} className="text-yellow-400" />
                  <span>Scope Delegation &amp; Staff Access</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
                  Employees &amp; Permissions
                </h1>
                <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
                  Manage operational staff and configure access permissions across your {permittedCompanies.length} permitted companies.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
                <Link
                  href="/masteradmin/employees/resignations"
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all no-underline shrink-0"
                >
                  <FileText size={16} className="text-yellow-300" />
                  <span>Resignations &amp; Letters</span>
                </Link>

                <Link
                  href="/masteradmin/employees/create"
                  className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer no-underline shrink-0"
                >
                  <Plus size={16} />
                  <span>Add Staff Member</span>
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between admin-stat-card">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Total Employees
                </span>
                <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                  {filteredStaffEmployees.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">In your assigned scope</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                <Users size={20} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between admin-stat-card">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Total Active Employees
                </span>
                <div className="text-2xl font-bold text-emerald-600 tracking-tight mt-1">
                  {filteredStaffEmployees.filter((e) => e.status === 'active').length}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1">Operational accounts</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between admin-stat-card">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Inactive Employees
                </span>
                <div className="text-2xl font-bold text-rose-600 tracking-tight mt-1">
                  {filteredStaffEmployees.filter((e) => e.status !== 'active').length}
                </div>
                <div className="text-[11px] text-rose-600 mt-1">Inactive / suspended accounts</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <UserX size={20} />
              </div>
            </div>
          </div>

          {/* Main Staff Table Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Table Filter Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 relative max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={staffSearchTerm}
                  onChange={(e) => setStaffSearchTerm(e.target.value)}
                  placeholder="Search staff by Name, Code, or Email..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg bg-slate-200/60 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('ALL')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                      staffStatusFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    All ({filteredStaffEmployees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('active')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                      staffStatusFilter === 'active'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffStatusFilter('inactive')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                      staffStatusFilter === 'inactive'
                        ? 'bg-white text-rose-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    Inactive
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchEmployeesData}
                  className="p-2 text-slate-500 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                  title="Refresh staff list"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            {/* Staff Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Employee Code</th>
                    <th className="py-3 px-4">Assigned Companies</th>
                    <th className="py-3 px-4">Action Permissions</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStaffEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-600 m-0">
                          No Staff Records Found
                        </p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">
                          {staffSearchTerm
                            ? 'Try clearing your search query.'
                            : 'Add staff members to delegate company workload.'}
                        </p>
                        <Link
                          href="/masteradmin/employees/create"
                          className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold no-underline shadow-xs"
                        >
                          <Plus size={14} />
                          <span>Add Staff Member</span>
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    filteredStaffEmployees.map((emp) => {
                      const assigned = Array.isArray(emp.assigned_companies)
                        ? emp.assigned_companies
                        : [];

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Name & Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center font-bold text-xs shrink-0">
                                {emp.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">
                                  {emp.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {emp.email} • <span className="font-semibold text-slate-600">{emp.role}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Code */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              {emp.employee_code}
                            </span>
                          </td>

                          {/* Assigned Companies */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {assigned.length === 0 ? (
                                <span className="text-[11px] text-slate-400 italic">
                                  No companies assigned
                                </span>
                              ) : (
                                assigned.slice(0, 2).map((cId) => {
                                  const match = allCompanies.find(
                                    (c) => c.id.toLowerCase() === cId.toLowerCase()
                                  );
                                  return (
                                    <span
                                      key={cId}
                                      className="inline-flex items-center gap-1 bg-blue-50 text-[#0b4da2] border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold"
                                    >
                                      <Building2 size={10} />
                                      <span className="truncate max-w-[85px]">
                                        {match ? match.name : cId}
                                      </span>
                                    </span>
                                  );
                                })
                              )}
                              {assigned.length > 2 && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                                  +{assigned.length - 2} more
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Permissions */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  emp.can_create
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                                title={emp.can_create ? 'Allowed to create' : 'Cannot create'}
                              >
                                Create
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  emp.can_edit
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                                title={emp.can_edit ? 'Allowed to edit' : 'Cannot edit'}
                              >
                                Edit
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  emp.can_delete
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                                title={emp.can_delete ? 'Allowed to delete' : 'Cannot delete'}
                              >
                                Delete
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(emp)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors border-0 ${
                                emp.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  emp.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span>{emp.status === 'active' ? 'Active' : 'Inactive'}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Link
                                href={`/masteradmin/employees/resignations/new?employee_code=${emp.employee_code}`}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center no-underline"
                                title="Issue Resignation & Clearance"
                              >
                                <UserMinus size={14} />
                              </Link>

                              <Link
                                href={`/masteradmin/employees/edit?id=${emp.id}`}
                                className="p-1.5 text-slate-600 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center no-underline"
                                title="Edit Staff Member"
                              >
                                <Edit2 size={14} />
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(emp.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                                title="Delete Staff Member"
                              >
                                <Trash2 size={14} />
                              </button>
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
      )}

      {/* ========================================================================= */}
      {/* 6. MAIN COMPANIES REGISTRY TABLE & MANAGEMENT CARD */}
      {/* ========================================================================= */}
      {dashboardViewMode === 'foreign_customer' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Filters & Actions */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 relative max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assigned companies by Name, ROC, or Sector..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Sectors ({permittedCompanies.length})</option>
              {SECTOR_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSector('ALL');
                setSelectedCompanyCardId('ALL');
              }}
              className="p-2 text-slate-500 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
              title="Reset table search"
            >
              <RotateCcw size={15} />
            </button>

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

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Employer Company</th>
                <th className="py-3 px-4">ROC / Registration</th>
                <th className="py-3 px-4">Industry Sector</th>
                <th className="py-3 px-4 text-center">Permitted Workers</th>
                <th className="py-3 px-4">Financial Status</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldAlert size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">
                      No Companies Found in Assigned Scope
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm
                        ? 'Try adjusting your search criteria.'
                        : 'Contact Super Admin to grant you permissions for additional companies.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp) => {
                  const income = getCompanyIncomeWallet(comp);
                  const profit = getCompanyProfitWallet(comp);

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Logo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                            {comp.logo ? (
                              <img
                                src={resolveFileUrl(comp.logo)}
                                alt={comp.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Building2 size={18} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/masteradmin/companies/${comp.id}`}
                              className="font-bold text-slate-900 text-xs hover:text-[#0b4da2] no-underline block"
                            >
                              {comp.name}
                            </Link>
                            {comp.tag && (
                              <span className="inline-block mt-0.5 text-[9px] bg-blue-50 text-[#0b4da2] border border-blue-200 px-1.5 py-0.2 rounded font-bold">
                                {comp.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ROC */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {comp.roc || 'ROC-PENDING'}
                      </td>

                      {/* Sector */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-700">
                          {comp.sector}
                        </span>
                      </td>

                      {/* Workers */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
                          <Users size={12} />
                          <span>{(comp.totalWorkers || 0).toLocaleString()}</span>
                        </span>
                      </td>

                      {/* Financial Wallets */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className="text-slate-700">
                          Income: <strong className="text-emerald-700">RM {income.toLocaleString()}</strong>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Profit: <span className="text-[#0b4da2] font-semibold">RM {profit.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div>{comp.phone || 'Phone: -'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                          {comp.email || 'Email: -'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Payment Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(comp)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-2xs hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer border-0"
                            title="Receive payment & activate subscription"
                          >
                            <DollarSign size={12} />
                            <span>Payment</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCompanyCardId(selectedCompanyCardId === String(comp.id) ? 'ALL' : String(comp.id))}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer border ${selectedCompanyCardId === String(comp.id)
                              ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                              : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0b4da2] border-slate-200'
                              }`}
                            title="Filter cards and metrics to this company"
                          >
                            <Building2 size={12} />
                            <span>{selectedCompanyCardId === String(comp.id) ? 'Active' : 'Filter Cards'}</span>
                          </button>

                          <Link
                            href={`/services?company=${encodeURIComponent(comp.id)}`}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#0b4da2] text-[11px] font-bold inline-flex items-center gap-1 transition-colors no-underline border border-blue-200"
                            title="Open Service Cards for this Company"
                          >
                            <Sparkles size={12} />
                            <span>Services</span>
                          </Link>

                          <Link
                            href={`/masteradmin/companies/${comp.id}`}
                            className="p-1.5 text-slate-600 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center"
                            title="Open Company Details"
                          >
                            <Eye size={14} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => openEditModal(comp)}
                            className="p-1.5 text-[#0b4da2] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="Edit Company Details"
                          >
                            <Edit2 size={14} />
                          </button>
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
      )}

      {/* Edit Company Details Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-[#072a6b] to-[#0c4da2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Edit2 size={16} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold m-0 leading-tight">
                    Edit Company Information
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0">
                    Updating details for &quot;{editingCompany.name}&quot;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ROC / Registration No.
                  </label>
                  <input
                    type="text"
                    value={formRoc}
                    onChange={(e) => setFormRoc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Sector
                  </label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  >
                    {SECTOR_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Certification Tag
                  </label>
                  <input
                    type="text"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    placeholder="Verified Entity"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Permitted Workers
                  </label>
                  <input
                    type="number"
                    value={formWorkers}
                    onChange={(e) => setFormWorkers(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Official Phone
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+60 3-..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    placeholder="Maybank / CIMB"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Bank Account No.
                  </label>
                  <input
                    type="text"
                    value={formBankAccountNo}
                    onChange={(e) => setFormBankAccountNo(e.target.value)}
                    placeholder="Account number"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Physical Registered Address
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Street, City, Postal Code"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment & Subscription Activation Modal */}
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
