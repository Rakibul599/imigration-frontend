'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx-js-style';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Gift,
  Globe2,
  Heart,
  HeartHandshake,
  Layers,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  Plus,
  Power,
  PowerOff,
  Printer,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import {
  Company,
  CompanyDirector,
  resolveFileUrl,
  getCompanyActiveWorkers,
  getCompanyInactiveWorkers,
  getCompanyIncomeWallet,
  getCompanyCostWallet,
  getCompanyProfitWallet,
  getCompanyPendingWallet,
} from '@/lib/companies';
import {
  getStoredCompanies,
  fetchCompaniesFromBackend,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';
import {
  useDashboardCardDesign,
  useCardAnimationSettings,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
} from '@/lib/themeSettings';

export type CompanyCardListingType =
  | 'registered'
  | 'active'
  | 'inactive'
  | 'pending'
  | 'reject'
  | 'income'
  | 'cost'
  | 'pending-payment'
  | 'profit'
  | 'incoming-donate'
  | 'donation'
  | 'balanced-donation';

interface CompanyCardListingProps {
  cardType: CompanyCardListingType;
  portalType?: 'superadmin' | 'masteradmin' | 'employee';
  baseRoute?: string;
}

interface CardMetaConfig {
  title: string;
  badge: string;
  subtitle: string;
  headerGradient: string;
  badgeBg: string;
  badgeColor: string;
  icon: any;
  accentColor: string;
  category: 'status' | 'financial' | 'donation';
  tableHeaderBg: string;
  tableHeaderBorder: string;
}

const CARD_METADATA: Record<CompanyCardListingType, CardMetaConfig> = {
  registered: {
    title: 'Total Registered Companies',
    badge: 'Official Employer Directory',
    subtitle: 'Comprehensive registry of all verified corporate entities, directors, workforce allocations, and operational profiles.',
    headerGradient: 'from-[#0f3d73] via-[#0b4da2] to-[#1e40af]',
    badgeBg: 'bg-blue-400/20',
    badgeColor: 'text-blue-200 border-blue-400/30',
    icon: Building2,
    accentColor: 'text-[#0b4da2]',
    category: 'status',
    tableHeaderBg: 'bg-[#0b4da2]',
    tableHeaderBorder: 'border-blue-700/60',
  },
  active: {
    title: 'Total Active Companies',
    badge: 'Operational & Verified Entities',
    subtitle: 'Active corporate employers with verified workforce, active work permits, and operational compliance.',
    headerGradient: 'from-[#064e3b] via-[#047857] to-[#059669]',
    badgeBg: 'bg-emerald-400/20',
    badgeColor: 'text-emerald-200 border-emerald-400/30',
    icon: CheckCircle2,
    accentColor: 'text-emerald-600',
    category: 'status',
    tableHeaderBg: 'bg-[#047857]',
    tableHeaderBorder: 'border-emerald-700/60',
  },
  inactive: {
    title: 'Total Inactive Companies',
    badge: 'Dormant & Suspended Entities',
    subtitle: 'Corporate accounts currently marked inactive, suspended, or awaiting renewal and reactivations.',
    headerGradient: 'from-[#334155] via-[#475569] to-[#64748b]',
    badgeBg: 'bg-slate-400/20',
    badgeColor: 'text-slate-200 border-slate-400/30',
    icon: PowerOff,
    accentColor: 'text-slate-600',
    category: 'status',
    tableHeaderBg: 'bg-[#475569]',
    tableHeaderBorder: 'border-slate-600/60',
  },
  pending: {
    title: 'Total Pending Companies',
    badge: 'Pending Review & Verification',
    subtitle: 'New company registration applications and compliance submissions pending administrative verification.',
    headerGradient: 'from-[#78350f] via-[#b45309] to-[#d97706]',
    badgeBg: 'bg-amber-400/20',
    badgeColor: 'text-amber-200 border-amber-400/30',
    icon: Clock,
    accentColor: 'text-amber-600',
    category: 'status',
    tableHeaderBg: 'bg-[#b45309]',
    tableHeaderBorder: 'border-amber-700/60',
  },
  reject: {
    title: 'Total Reject Companies',
    badge: 'Declined Applications',
    subtitle: 'Company registrations that have been rejected, disqualified, or flagged for regulatory non-compliance.',
    headerGradient: 'from-[#881337] via-[#9f1239] to-[#be123c]',
    badgeBg: 'bg-rose-400/20',
    badgeColor: 'text-rose-200 border-rose-400/30',
    icon: XCircle,
    accentColor: 'text-rose-600',
    category: 'status',
    tableHeaderBg: 'bg-[#9f1239]',
    tableHeaderBorder: 'border-rose-700/60',
  },
  income: {
    title: 'Total Income Amount',
    badge: 'Deposit Inflow & Gross Revenue',
    subtitle: 'Total deposit inflows, billing receipts, and gross revenue recorded across corporate employer accounts.',
    headerGradient: 'from-[#0c4a6e] via-[#0284c7] to-[#0369a1]',
    badgeBg: 'bg-sky-400/20',
    badgeColor: 'text-sky-200 border-sky-400/30',
    icon: DollarSign,
    accentColor: 'text-blue-700',
    category: 'financial',
    tableHeaderBg: 'bg-[#0284c7]',
    tableHeaderBorder: 'border-sky-700/60',
  },
  cost: {
    title: 'Total Cost Amount',
    badge: 'Operational & Expense Outflow',
    subtitle: 'Total corporate operational disbursements, immigration levies, processing costs, and support expenses.',
    headerGradient: 'from-[#881337] via-[#be123c] to-[#e11d48]',
    badgeBg: 'bg-rose-400/20',
    badgeColor: 'text-rose-200 border-rose-400/30',
    icon: Coins,
    accentColor: 'text-rose-600',
    category: 'financial',
    tableHeaderBg: 'bg-[#be123c]',
    tableHeaderBorder: 'border-rose-700/60',
  },
  'pending-payment': {
    title: 'Total Pending Payment Amount',
    badge: 'Outstanding Receivables & Invoices',
    subtitle: 'Outstanding receivables, unpaid company dues, and pending client transactions awaiting settlement.',
    headerGradient: 'from-[#7c2d12] via-[#c2410c] to-[#ea580c]',
    badgeBg: 'bg-orange-400/20',
    badgeColor: 'text-orange-200 border-orange-400/30',
    icon: Clock,
    accentColor: 'text-orange-600',
    category: 'financial',
    tableHeaderBg: 'bg-[#c2410c]',
    tableHeaderBorder: 'border-orange-700/60',
  },
  profit: {
    title: 'Total Profit Amount',
    badge: 'Net Retained Margin',
    subtitle: 'Net retained earnings and operational margin (Total Income minus Operational Cost) across corporate accounts.',
    headerGradient: 'from-[#064e3b] via-[#059669] to-[#10b981]',
    badgeBg: 'bg-emerald-400/20',
    badgeColor: 'text-emerald-200 border-emerald-400/30',
    icon: Scale,
    accentColor: 'text-emerald-700',
    category: 'financial',
    tableHeaderBg: 'bg-[#059669]',
    tableHeaderBorder: 'border-emerald-700/60',
  },
  'incoming-donate': {
    title: 'Incoming Donate (5%)',
    badge: '5% CSR & Welfare Allocation Pool',
    subtitle: 'Statutory 5% charitable contribution pool systematically accrued from total corporate income.',
    headerGradient: 'from-[#4c1d95] via-[#6d28d9] to-[#7c3aed]',
    badgeBg: 'bg-purple-400/20',
    badgeColor: 'text-purple-200 border-purple-400/30',
    icon: Gift,
    accentColor: 'text-purple-700',
    category: 'donation',
    tableHeaderBg: 'bg-[#6d28d9]',
    tableHeaderBorder: 'border-purple-700/60',
  },
  donation: {
    title: 'Donation',
    badge: 'Disbursed Charitable Contributions',
    subtitle: 'Total philanthropic aid, worker welfare funds, and humanitarian donations disbursed to date.',
    headerGradient: 'from-[#134e4a] via-[#0f766e] to-[#14b8a6]',
    badgeBg: 'bg-teal-400/20',
    badgeColor: 'text-teal-200 border-teal-400/30',
    icon: Heart,
    accentColor: 'text-teal-700',
    category: 'donation',
    tableHeaderBg: 'bg-[#0f766e]',
    tableHeaderBorder: 'border-teal-700/60',
  },
  'balanced-donation': {
    title: 'Balanced Donation',
    badge: 'Remaining Charitable Fund Reserve',
    subtitle: 'Net remaining charitable fund balance (Incoming 5% Allocation Pool minus Disbursed Donations).',
    headerGradient: 'from-[#78350f] via-[#b45309] to-[#f59e0b]',
    badgeBg: 'bg-amber-400/20',
    badgeColor: 'text-amber-200 border-amber-400/30',
    icon: HeartHandshake,
    accentColor: 'text-amber-700',
    category: 'donation',
    tableHeaderBg: 'bg-[#b45309]',
    tableHeaderBorder: 'border-amber-700/60',
  },
};

export default function CompanyCardListing({
  cardType,
  portalType = 'superadmin',
  baseRoute,
}: CompanyCardListingProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Active theme settings hook
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';
  const {
    animation: cardAnimation,
    duration: cardDuration,
    stagger: cardStagger,
    animTriggerKey,
  } = useCardAnimationSettings();

  const resolvedBaseRoute =
    baseRoute || (pathname?.startsWith('/superadmin') ? '/superadmin/companies' : '/companies');

  const meta = CARD_METADATA[cardType] || CARD_METADATA.registered;
  const MetaIcon = meta.icon;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<Company | null>(null);

  // Header Export dropdown
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Filter Bar Export dropdown
  const [isFilterExportOpen, setIsFilterExportOpen] = useState(false);
  const filterExportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
      if (
        filterExportDropdownRef.current &&
        !filterExportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Companies
  useEffect(() => {
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setCompanies(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsub = subscribeToCompanyChanges(() => {
      setCompanies(getStoredCompanies());
    });
    return unsub;
  }, []);

  // Filter companies based on cardType and user filters
  const filteredCompanies = useMemo(() => {
    return companies
      .filter((c) => {
        if (!c) return false;

        // Card-type based filtering
        if (cardType === 'active') {
          if (c.status && c.status !== 'active') return false;
        } else if (cardType === 'inactive') {
          if (c.status !== 'inactive' && c.status !== 'suspended') return false;
        } else if (cardType === 'pending') {
          if (c.status !== 'pending') return false;
        } else if (cardType === 'reject') {
          if (c.status !== 'rejected' && c.status !== 'reject') return false;
        }

        // Sector filter
        if (selectedSector !== 'ALL' && c.sector !== selectedSector) {
          return false;
        }

        // Secondary status filter pill (if selected)
        if (statusFilter !== 'ALL') {
          const compStatus = c.status || 'active';
          if (compStatus !== statusFilter) return false;
        }

        // Live text search
        const term = (searchTerm || '').toLowerCase().trim();
        if (term) {
          const nameMatch = c.name ? String(c.name).toLowerCase().includes(term) : false;
          const rocMatch = c.roc ? String(c.roc).toLowerCase().includes(term) : false;
          const sectorMatch = c.sector ? String(c.sector).toLowerCase().includes(term) : false;
          const emailMatch = c.email ? String(c.email).toLowerCase().includes(term) : false;
          const phoneMatch = c.phone ? String(c.phone).toLowerCase().includes(term) : false;
          const directorMatch = Array.isArray(c.directors)
            ? c.directors.some((d) => {
                if (!d) return false;
                const dName = d.name ? String(d.name).toLowerCase() : '';
                const dNid = d.nidNo ? String(d.nidNo).toLowerCase() : '';
                return dName.includes(term) || dNid.includes(term);
              })
            : false;

          if (!nameMatch && !rocMatch && !sectorMatch && !emailMatch && !phoneMatch && !directorMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sorting strategy per cardType
        if (cardType === 'income') {
          return getCompanyIncomeWallet(b) - getCompanyIncomeWallet(a);
        }
        if (cardType === 'cost') {
          return getCompanyCostWallet(b) - getCompanyCostWallet(a);
        }
        if (cardType === 'profit') {
          return getCompanyProfitWallet(b) - getCompanyProfitWallet(a);
        }
        if (cardType === 'pending-payment') {
          const dueA = getCompanyPendingWallet(a) + (a.total_due || 0) + (a.invoice_due || 0);
          const dueB = getCompanyPendingWallet(b) + (b.total_due || 0) + (b.invoice_due || 0);
          return dueB - dueA;
        }
        if (cardType === 'incoming-donate') {
          const donA = Math.round(getCompanyIncomeWallet(a) * 0.05);
          const donB = Math.round(getCompanyIncomeWallet(b) * 0.05);
          return donB - donA;
        }
        if (cardType === 'donation') {
          const disbA = Math.round(Math.round(getCompanyIncomeWallet(a) * 0.05) * 0.6);
          const disbB = Math.round(Math.round(getCompanyIncomeWallet(b) * 0.05) * 0.6);
          return disbB - disbA;
        }
        if (cardType === 'balanced-donation') {
          const balA = Math.round(getCompanyIncomeWallet(a) * 0.05) - Math.round(Math.round(getCompanyIncomeWallet(a) * 0.05) * 0.6);
          const balB = Math.round(getCompanyIncomeWallet(b) * 0.05) - Math.round(Math.round(getCompanyIncomeWallet(b) * 0.05) * 0.6);
          return balB - balA;
        }
        return (b.totalWorkers || 0) - (a.totalWorkers || 0);
      });
  }, [companies, cardType, selectedSector, statusFilter, searchTerm]);

  // Distinct sectors
  const distinctSectors = useMemo(() => {
    return Array.from(new Set(companies.map((c) => c?.sector).filter(Boolean))) as string[];
  }, [companies]);

  const sectorOptions: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: `All Sectors (${companies.length})`, badge: 'ALL' },
      ...distinctSectors.map((sec) => ({
        value: sec,
        label: sec,
        badge: `${companies.filter((c) => c?.sector === sec).length}`,
      })),
    ];
  }, [companies, distinctSectors]);

  // Aggregate Metrics for Top Summary Cards
  const summaryStats = useMemo(() => {
    const list = filteredCompanies;
    const totalWorkers = list.reduce((acc, c) => acc + (c.totalWorkers || 0), 0);
    const totalActiveWorkers = list.reduce((acc, c) => acc + getCompanyActiveWorkers(c), 0);
    const totalInactiveWorkers = list.reduce((acc, c) => acc + getCompanyInactiveWorkers(c), 0);
    const totalIncome = list.reduce((acc, c) => acc + getCompanyIncomeWallet(c), 0);
    const totalCost = list.reduce((acc, c) => acc + getCompanyCostWallet(c), 0);
    const totalProfit = list.reduce((acc, c) => acc + getCompanyProfitWallet(c), 0);
    const totalPendingDues = list.reduce(
      (acc, c) => acc + getCompanyPendingWallet(c) + (c.total_due || 0) + (c.invoice_due || 0),
      0
    );
    const totalIncomingDonate = Math.round(totalIncome * 0.05);
    const totalDonation = Math.round(totalIncomingDonate * 0.6);
    const totalBalancedDonation = Math.max(0, totalIncomingDonate - totalDonation);

    const avgIncome = list.length > 0 ? Math.round(totalIncome / list.length) : 0;
    const avgCost = list.length > 0 ? Math.round(totalCost / list.length) : 0;
    const avgProfit = list.length > 0 ? Math.round(totalProfit / list.length) : 0;

    const highestIncomeComp = list.length > 0
      ? [...list].sort((a, b) => getCompanyIncomeWallet(b) - getCompanyIncomeWallet(a))[0]
      : null;

    const highestCostComp = list.length > 0
      ? [...list].sort((a, b) => getCompanyCostWallet(b) - getCompanyCostWallet(a))[0]
      : null;

    const highestProfitComp = list.length > 0
      ? [...list].sort((a, b) => getCompanyProfitWallet(b) - getCompanyProfitWallet(a))[0]
      : null;

    return {
      count: list.length,
      totalWorkers,
      totalActiveWorkers,
      totalInactiveWorkers,
      totalIncome,
      totalCost,
      totalProfit,
      totalPendingDues,
      totalIncomingDonate,
      totalDonation,
      totalBalancedDonation,
      avgIncome,
      avgCost,
      avgProfit,
      highestIncomeComp,
      highestCostComp,
      highestProfitComp,
    };
  }, [filteredCompanies]);

  // Export Row Data
  const getExportData = () => {
    return filteredCompanies.map((c, idx) => {
      const activeW = getCompanyActiveWorkers(c);
      const inactiveW = getCompanyInactiveWorkers(c);
      const inc = getCompanyIncomeWallet(c);
      const cst = getCompanyCostWallet(c);
      const prf = getCompanyProfitWallet(c);
      const pnd = getCompanyPendingWallet(c) + (c.total_due || 0) + (c.invoice_due || 0);
      const incDon = Math.round(inc * 0.05);
      const don = Math.round(incDon * 0.6);
      const bal = Math.max(0, incDon - don);

      return {
        sl: idx + 1,
        name: c.name || '—',
        roc: c.roc || '—',
        sector: c.sector || '—',
        status: (c.status || 'active').toUpperCase(),
        activeWorkers: activeW,
        inactiveWorkers: inactiveW,
        totalWorkers: c.totalWorkers || (activeW + inactiveW),
        incomeWallet: inc,
        costWallet: cst,
        profitWallet: prf,
        pendingWallet: pnd,
        incomingDonate: incDon,
        donation: don,
        balancedDonation: bal,
        phone: c.phone || '—',
        email: c.email || '—',
        address: c.address || '—',
      };
    });
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    setIsFilterExportOpen(false);
    if (!filteredCompanies || filteredCompanies.length === 0) {
      alert('No companies found to export.');
      return;
    }

    const rows = getExportData().map((r) => ({
      SL: r.sl,
      'Company Name': r.name,
      'ROC': r.roc,
      'Sector': r.sector,
      'Status': r.status,
      'Active Workers': r.activeWorkers,
      'Inactive Workers': r.inactiveWorkers,
      'Total Workers': r.totalWorkers,
      'Income Wallet (RM)': r.incomeWallet,
      'Cost Wallet (RM)': r.costWallet,
      'Profit Wallet (RM)': r.profitWallet,
      'Pending Dues (RM)': r.pendingWallet,
      '5% Donation Pool (RM)': r.incomingDonate,
      'Disbursed Donation (RM)': r.donation,
      'Balanced Donation (RM)': r.balancedDonation,
      'Phone': r.phone,
      'Email': r.email,
      'Address': r.address,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

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

    // Apply header style to all cells in Row 0 (Row 1 in Excel)
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
        const isNumeric = col >= 5 && col <= 14;

        worksheet[cellRef].s = {
          fill: isEven ? { fgColor: { rgb: 'F8FAFC' } } : undefined,
          font: {
            name: 'Calibri',
            sz: 10,
            bold: isNumeric && (col === 8 || col === 10), // Bold for Income & Profit
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
      { wch: 32 }, // Company Name
      { wch: 20 }, // ROC
      { wch: 22 }, // Sector
      { wch: 12 }, // Status
      { wch: 16 }, // Active Workers
      { wch: 16 }, // Inactive Workers
      { wch: 16 }, // Total Workers
      { wch: 20 }, // Income Wallet
      { wch: 18 }, // Cost Wallet
      { wch: 18 }, // Profit Wallet
      { wch: 18 }, // Pending Dues
      { wch: 22 }, // 5% Pool
      { wch: 22 }, // Disbursed
      { wch: 22 }, // Balance
      { wch: 18 }, // Phone
      { wch: 26 }, // Email
      { wch: 35 }, // Address
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, meta.title.slice(0, 30));
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${cardType}_companies_list_${today}.xlsx`);
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    setIsFilterExportOpen(false);
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
      'Total Workers',
      'Income Wallet (RM)',
      'Cost Wallet (RM)',
      'Profit Wallet (RM)',
      'Pending Dues (RM)',
      '5% Donation Pool (RM)',
      'Disbursed Donation (RM)',
      'Balanced Donation (RM)',
      'Phone',
      'Email',
      'Address',
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = getExportData().map((r) => [
      r.sl,
      escapeCSV(r.name),
      escapeCSV(r.roc),
      escapeCSV(r.sector),
      escapeCSV(r.status),
      r.activeWorkers,
      r.inactiveWorkers,
      r.totalWorkers,
      r.incomeWallet,
      r.costWallet,
      r.profitWallet,
      r.pendingWallet,
      r.incomingDonate,
      r.donation,
      r.balancedDonation,
      escapeCSV(r.phone),
      escapeCSV(r.email),
      escapeCSV(r.address),
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `${cardType}_companies_list_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setIsExportOpen(false);
    setIsFilterExportOpen(false);
    if (!filteredCompanies || filteredCompanies.length === 0) {
      alert('No companies found to export.');
      return;
    }

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const rowsHtml = getExportData()
      .map((r) => `
        <tr>
          <td style="text-align: center;">${r.sl}</td>
          <td style="font-weight: 600;">${r.name}</td>
          <td>${r.roc}</td>
          <td>${r.sector}</td>
          <td style="text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0369a1;">
              ${r.status}
            </span>
          </td>
          <td style="text-align: center; color: #047857; font-weight: 600;">${r.activeWorkers.toLocaleString()}</td>
          <td style="text-align: right; font-weight: 600;">RM ${r.incomeWallet.toLocaleString()}</td>
          <td style="text-align: right; color: #be123c;">RM ${r.costWallet.toLocaleString()}</td>
          <td style="text-align: right; color: #047857; font-weight: 700;">RM ${r.profitWallet.toLocaleString()}</td>
          <td style="text-align: right; color: #6d28d9; font-weight: 600;">RM ${r.incomingDonate.toLocaleString()}</td>
        </tr>
      `)
      .join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker prevented opening print view.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${meta.title} - Official Report</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 10px; }
            .header { border-bottom: 2px solid #0b4da2; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 18px; font-weight: 800; color: #0b4da2; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
            .meta { font-size: 10px; color: #64748b; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th { background: #0b4da2; color: #ffffff; padding: 7px 6px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; border: 1px solid #0b4da2; }
            td { padding: 6px 6px; border: 1px solid #cbd5e1; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 16px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">${meta.title}</h1>
              <div class="subtitle">${meta.subtitle} • Filtered Count: ${filteredCompanies.length}</div>
            </div>
            <div class="meta">
              <div><strong>Generated Date:</strong> ${today}</div>
              <div><strong>Portal:</strong> Superadmin Management</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">SL</th>
                <th>Company Name</th>
                <th>ROC</th>
                <th>Sector</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: center;">Active Workers</th>
                <th style="text-align: right;">Income Wallet</th>
                <th style="text-align: right;">Cost Wallet</th>
                <th style="text-align: right;">Profit Margin</th>
                <th style="text-align: right;">5% Donate Pool</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            Confidential Report • Official Company Intelligence Registry • Generated automatically on ${today}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Helper for Theme-Aware Card Classes
  const getCardThemeClasses = (index: number, hoverBorder: string = 'hover:border-blue-400') => {
    const animClass = getServiceCardAnimationClass(cardAnimation, index);
    return `admin-stat-card ${animClass} ${
      isGlass
        ? 'dashboard-card-glass rounded-2xl p-5 transition-all flex flex-col justify-between group min-h-[120px]'
        : `bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group min-h-[120px] border-slate-200 ${hoverBorder}`
    }`;
  };

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-[#0b4da2] transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link href={resolvedBaseRoute} className="hover:text-[#0b4da2] transition-colors">
          Companies Dashboard
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">{meta.title}</span>
      </div>

      {/* Main Themed Header Banner - overflow-visible ensures dropdown is never cut off */}
      <div
        className={`bg-gradient-to-r ${meta.headerGradient} rounded-2xl p-6 sm:p-7 text-white shadow-lg relative overflow-visible z-20`}
      >
        {/* Subtle Background Glow contained within an absolute inner boundary */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${meta.badgeBg} border ${meta.badgeColor} text-[11px] font-bold tracking-wide`}>
              <MetaIcon size={14} className="shrink-0" />
              <span>{meta.badge}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{filteredCompanies.length} Entities</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight m-0 text-white flex items-center gap-3">
              <span>{meta.title}</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed m-0">
              {meta.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Back to Companies Dashboard */}
            <Link
              href={resolvedBaseRoute}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/25 shadow-xs transition-colors backdrop-blur-xs whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Companies</span>
            </Link>

            {/* Header Export Dropdown - Full floating menu with z-50 */}
            <div className="relative inline-block text-left shrink-0 z-30" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-slate-800 hover:bg-slate-50 shadow-md hover:shadow-lg transition-all cursor-pointer border border-white whitespace-nowrap"
                title="Export list to Excel, CSV, or PDF"
              >
                <Download size={14} className="text-[#0b4da2]" />
                <span>Export</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 text-slate-500 ${isExportOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Export Format
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent font-medium"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent font-medium"
                  >
                    <FileText size={16} className="text-blue-600 shrink-0" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent font-medium"
                  >
                    <Printer size={16} className="text-rose-600 shrink-0" />
                    <span>Export / Print PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Create Company Button */}
            <Link
              href={`${resolvedBaseRoute}/create`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Create Company</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards - Fully Theme-Aware (Glassmorphism & Card Animations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {meta.category === 'status' && (
          <>
            <div
              key={`top-status-0-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(0, 'hover:border-blue-400')}
              style={getServiceCardAnimationStyle(0, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight truncate">
                  {meta.title}
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
                  <MetaIcon size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-slate-900 my-0.5">
                {summaryStats.count.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {companies.length > 0 ? `${Math.round((summaryStats.count / companies.length) * 100)}% of total registered` : 'Active registry'}
              </div>
            </div>

            <div
              key={`top-status-1-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(1, 'hover:border-emerald-400')}
              style={getServiceCardAnimationStyle(1, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-emerald-600 transition-colors leading-tight truncate">
                  Active Foreign Workers
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-emerald-600 my-0.5">
                {summaryStats.totalActiveWorkers.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Approved permits &amp; allocations
              </div>
            </div>

            <div
              key={`top-status-2-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(2, 'hover:border-sky-400')}
              style={getServiceCardAnimationStyle(2, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-sky-600 transition-colors leading-tight truncate">
                  Total Income Wallet
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-blue-700 my-0.5">
                RM {summaryStats.totalIncome.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Cumulative deposit inflows
              </div>
            </div>

            <div
              key={`top-status-3-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(3, 'hover:border-purple-400')}
              style={getServiceCardAnimationStyle(3, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-purple-600 transition-colors leading-tight truncate">
                  5% Donation Pool
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Gift size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-purple-700 my-0.5">
                RM {summaryStats.totalIncomingDonate.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Charity allocation from income
              </div>
            </div>
          </>
        )}

        {meta.category === 'financial' && (
          <>
            <div
              key={`top-fin-0-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(0, 'hover:border-blue-400')}
              style={getServiceCardAnimationStyle(0, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight truncate">
                  {meta.title}
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
                  <MetaIcon size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-slate-900 my-0.5">
                RM {(cardType === 'income'
                  ? summaryStats.totalIncome
                  : cardType === 'cost'
                  ? summaryStats.totalCost
                  : cardType === 'profit'
                  ? summaryStats.totalProfit
                  : summaryStats.totalPendingDues
                ).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Cumulative across {summaryStats.count} companies
              </div>
            </div>

            <div
              key={`top-fin-1-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(1, 'hover:border-emerald-400')}
              style={getServiceCardAnimationStyle(1, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-emerald-600 transition-colors leading-tight truncate">
                  Average Per Company
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Scale size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-emerald-700 my-0.5">
                RM {(cardType === 'income'
                  ? summaryStats.avgIncome
                  : cardType === 'cost'
                  ? summaryStats.avgCost
                  : cardType === 'profit'
                  ? summaryStats.avgProfit
                  : (summaryStats.count > 0 ? Math.round(summaryStats.totalPendingDues / summaryStats.count) : 0)
                ).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Mean corporate balance
              </div>
            </div>

            <div
              key={`top-fin-2-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(2, 'hover:border-amber-400')}
              style={getServiceCardAnimationStyle(2, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-amber-600 transition-colors leading-tight truncate">
                  Top Entity
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Crown size={16} />
                </div>
              </div>
              <div className="text-lg font-bold tracking-tight text-slate-900 my-0.5 truncate">
                {cardType === 'cost'
                  ? (summaryStats.highestCostComp?.name || '—')
                  : (summaryStats.highestIncomeComp?.name || '—')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate font-mono">
                RM {(cardType === 'cost'
                  ? (summaryStats.highestCostComp ? getCompanyCostWallet(summaryStats.highestCostComp) : 0)
                  : (summaryStats.highestIncomeComp ? getCompanyIncomeWallet(summaryStats.highestIncomeComp) : 0)
                ).toLocaleString()}
              </div>
            </div>

            <div
              key={`top-fin-3-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(3, 'hover:border-purple-400')}
              style={getServiceCardAnimationStyle(3, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-purple-600 transition-colors leading-tight truncate">
                  5% Donation Pool
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Gift size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-purple-700 my-0.5">
                RM {summaryStats.totalIncomingDonate.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                5% statutory allocation
              </div>
            </div>
          </>
        )}

        {meta.category === 'donation' && (
          <>
            <div
              key={`top-don-0-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(0, 'hover:border-purple-400')}
              style={getServiceCardAnimationStyle(0, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-purple-700 transition-colors leading-tight truncate">
                  Incoming Donate (5%)
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <Gift size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-purple-700 my-0.5">
                RM {summaryStats.totalIncomingDonate.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                5% accrued from RM {summaryStats.totalIncome.toLocaleString()}
              </div>
            </div>

            <div
              key={`top-don-1-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(1, 'hover:border-teal-400')}
              style={getServiceCardAnimationStyle(1, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-teal-700 transition-colors leading-tight truncate">
                  Disbursed Donation
                </span>
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Heart size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-teal-700 my-0.5">
                RM {summaryStats.totalDonation.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                60% distributed for philanthropic aid
              </div>
            </div>

            <div
              key={`top-don-2-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(2, 'hover:border-amber-400')}
              style={getServiceCardAnimationStyle(2, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-amber-700 transition-colors leading-tight truncate">
                  Balanced Donation
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <HeartHandshake size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-amber-700 my-0.5">
                RM {summaryStats.totalBalancedDonation.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Remaining reserve in welfare fund
              </div>
            </div>

            <div
              key={`top-don-3-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
              className={getCardThemeClasses(3, 'hover:border-emerald-400')}
              style={getServiceCardAnimationStyle(3, cardDuration, cardStagger)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-emerald-700 transition-colors leading-tight truncate">
                  Reserve Retention Rate
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight font-mono text-emerald-700 my-0.5">
                {summaryStats.totalIncomingDonate > 0
                  ? `${Math.round((summaryStats.totalBalancedDonation / summaryStats.totalIncomingDonate) * 100)}%`
                  : '40%'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                Liquidity &amp; emergency buffer
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter and Search Bar with Export Option */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company name, ROC, director, email..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-xs"
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

        {/* Sector filter, Export Dropdown, & View toggles */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap sm:flex-nowrap">
          <div className="w-56">
            <Select2Search
              options={sectorOptions}
              value={selectedSector}
              onChange={(val) => setSelectedSector(val)}
              placeholder="Filter Sector..."
              searchPlaceholder="Search sectors..."
              icon={<Filter size={14} className="text-slate-400" />}
            />
          </div>

          {/* Export Dropdown Button in Filter Bar */}
          <div className="relative inline-block text-left shrink-0" ref={filterExportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsFilterExportOpen(!isFilterExportOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer border border-emerald-700"
              title="Export Companies List"
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${isFilterExportOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isFilterExportOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Export Format
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent font-medium"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent font-medium"
                >
                  <FileText size={15} className="text-blue-600 shrink-0" />
                  <span>Export CSV (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent font-medium"
                >
                  <Printer size={15} className="text-rose-600 shrink-0" />
                  <span>Export / Print PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Table / Cards toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer border-0 ${
                viewMode === 'table' ? 'bg-white shadow-2xs text-[#0b4da2] font-semibold' : 'text-slate-500 bg-transparent'
              }`}
              title="Table View"
            >
              <Layers size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer border-0 ${
                viewMode === 'cards' ? 'bg-white shadow-2xs text-[#0b4da2] font-semibold' : 'text-slate-500 bg-transparent'
              }`}
              title="Cards View"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading company records...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
            <MetaIcon size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800 m-0">No companies found</h3>
          <p className="text-xs text-slate-500 max-w-md m-0">
            No company records matched your current query in &ldquo;{meta.title}&rdquo;. You can reset the filters or create a new company profile.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedSector('ALL');
                setStatusFilter('ALL');
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border-0"
            >
              Clear Filters
            </button>
            <Link
              href={`${resolvedBaseRoute}/create`}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-blue-700 text-white cursor-pointer no-underline"
            >
              Create Company
            </Link>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW - SL instead of # */
        <div className="w-full max-w-full overflow-hidden bg-white border border-slate-300 rounded-xl shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className={`${meta.tableHeaderBg} text-white text-xs font-bold whitespace-nowrap`}>
                  <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-center w-12`}>SL</th>
                  <th className={`py-3 px-4 border-r ${meta.tableHeaderBorder} min-w-[220px]`}>Company Name</th>
                  <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} min-w-[130px]`}>ROC</th>
                  <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} min-w-[140px]`}>Sector</th>
                  <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-center min-w-[100px]`}>Status</th>
                  <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-center min-w-[110px]`}>Active Workers</th>
                  <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-center min-w-[110px]`}>Inactive Workers</th>

                  {/* Highlights based on category */}
                  {meta.category === 'donation' ? (
                    <>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Income Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[140px] bg-purple-700`}>5% Donate Pool</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[140px] bg-teal-700`}>Disbursed Donation</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[140px] bg-amber-700`}>Balanced Reserve</th>
                    </>
                  ) : cardType === 'income' ? (
                    <>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[145px] bg-sky-700`}>Income Wallet (RM)</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Cost Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Net Profit</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>5% Donate</th>
                    </>
                  ) : cardType === 'cost' ? (
                    <>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[145px] bg-rose-700`}>Cost Wallet (RM)</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Income Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Net Profit</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Pending Due</th>
                    </>
                  ) : cardType === 'profit' ? (
                    <>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[145px] bg-emerald-700`}>Net Profit (RM)</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Income Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Cost Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>5% Donate</th>
                    </>
                  ) : cardType === 'pending-payment' ? (
                    <>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[145px] bg-orange-700`}>Pending Due (RM)</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Income Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Cost Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Net Profit</th>
                    </>
                  ) : (
                    <>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Income Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Cost Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>Profit Wallet</th>
                      <th className={`py-3 px-3.5 border-r ${meta.tableHeaderBorder} text-right min-w-[135px]`}>5% Donate</th>
                    </>
                  )}

                  <th className="py-3 px-4 text-center min-w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredCompanies.map((c, index) => {
                  const activeW = getCompanyActiveWorkers(c);
                  const inactiveW = getCompanyInactiveWorkers(c);
                  const inc = getCompanyIncomeWallet(c);
                  const cst = getCompanyCostWallet(c);
                  const prf = getCompanyProfitWallet(c);
                  const pnd = getCompanyPendingWallet(c) + (c.total_due || 0) + (c.invoice_due || 0);
                  const incDon = Math.round(inc * 0.05);
                  const don = Math.round(incDon * 0.6);
                  const bal = Math.max(0, incDon - don);

                  const statusStr = (c.status || 'active').toLowerCase();
                  let statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  );
                  if (statusStr === 'inactive' || statusStr === 'suspended') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        Inactive
                      </span>
                    );
                  } else if (statusStr === 'pending') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    );
                  } else if (statusStr === 'rejected' || statusStr === 'reject') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Rejected
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={c.id || index}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-semibold border-r border-slate-200">
                        {index + 1}
                      </td>

                      <td className="py-3 px-4 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {c.logo ? (
                              <img
                                src={resolveFileUrl(c.logo)}
                                alt={c.name}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Building2 size={18} className="text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedCompanyDetail(c)}
                              className="font-bold text-slate-900 group-hover:text-[#0b4da2] transition-colors hover:underline text-left truncate block cursor-pointer border-0 bg-transparent p-0 text-xs"
                            >
                              {c.name}
                            </button>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              {c.tag && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-blue-50 text-[#0b4da2] font-semibold border border-blue-100">
                                  {c.tag}
                                </span>
                              )}
                              <span>{c.email || c.phone || 'Verified Corporate'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-slate-700 font-medium border-r border-slate-200">
                        {c.roc || '—'}
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 border-r border-slate-200 truncate max-w-[160px]">
                        {c.sector || '—'}
                      </td>

                      <td className="py-3 px-3.5 text-center border-r border-slate-200">
                        {statusBadge}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-semibold text-emerald-600 border-r border-slate-200">
                        {activeW.toLocaleString()}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono text-slate-500 border-r border-slate-200">
                        {inactiveW.toLocaleString()}
                      </td>

                      {/* Highlighted columns */}
                      {meta.category === 'donation' ? (
                        <>
                          <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">
                            RM {inc.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-purple-700 bg-purple-50/40 border-r border-slate-200">
                            RM {incDon.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-teal-700 bg-teal-50/40 border-r border-slate-200">
                            RM {don.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-800 bg-amber-50/40 border-r border-slate-200">
                            RM {bal.toLocaleString()}
                          </td>
                        </>
                      ) : cardType === 'income' ? (
                        <>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-blue-700 bg-blue-50/50 border-r border-slate-200">
                            RM {inc.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-rose-600 border-r border-slate-200">
                            RM {cst.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                            RM {prf.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-purple-700 border-r border-slate-200">
                            RM {incDon.toLocaleString()}
                          </td>
                        </>
                      ) : cardType === 'cost' ? (
                        <>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-700 bg-rose-50/50 border-r border-slate-200">
                            RM {cst.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-blue-700 border-r border-slate-200">
                            RM {inc.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                            RM {prf.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-orange-600 border-r border-slate-200">
                            RM {pnd.toLocaleString()}
                          </td>
                        </>
                      ) : cardType === 'profit' ? (
                        <>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50 border-r border-slate-200">
                            RM {prf.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-blue-700 border-r border-slate-200">
                            RM {inc.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-rose-600 border-r border-slate-200">
                            RM {cst.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-purple-700 border-r border-slate-200">
                            RM {incDon.toLocaleString()}
                          </td>
                        </>
                      ) : cardType === 'pending-payment' ? (
                        <>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-orange-700 bg-orange-50/50 border-r border-slate-200">
                            RM {pnd.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-blue-700 border-r border-slate-200">
                            RM {inc.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-rose-600 border-r border-slate-200">
                            RM {cst.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                            RM {prf.toLocaleString()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3.5 text-right font-mono font-semibold text-blue-700 border-r border-slate-200">
                            RM {inc.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-rose-600 border-r border-slate-200">
                            RM {cst.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                            RM {prf.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-purple-700 border-r border-slate-200">
                            RM {incDon.toLocaleString()}
                          </td>
                        </>
                      )}

                      {/* Action */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCompanyDetail(c)}
                            title="View Full Company Profile"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors cursor-pointer border border-slate-200"
                          >
                            <Eye size={14} />
                          </button>
                          <Link
                            href={`${resolvedBaseRoute}?edit=${c.id}`}
                            title="Edit Company Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer border border-slate-200"
                          >
                            <Edit2 size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW - Theme-Aware */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((c, index) => {
            const activeW = getCompanyActiveWorkers(c);
            const inactiveW = getCompanyInactiveWorkers(c);
            const inc = getCompanyIncomeWallet(c);
            const cst = getCompanyCostWallet(c);
            const prf = getCompanyProfitWallet(c);
            const incDon = Math.round(inc * 0.05);

            const animClass = getServiceCardAnimationClass(cardAnimation, index % 12);
            const animStyle = getServiceCardAnimationStyle(index % 12, cardDuration, cardStagger);

            return (
              <div
                key={c.id || index}
                style={animStyle}
                className={`admin-stat-card ${animClass} ${
                  isGlass
                    ? 'dashboard-card-glass rounded-2xl p-5 transition-all flex flex-col justify-between group'
                    : 'bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.logo ? (
                          <img
                            src={resolveFileUrl(c.logo)}
                            alt={c.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Building2 size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm m-0 truncate">
                          {c.name}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-500">{c.roc}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0b4da2] border border-blue-100">
                      {c.status ? c.status.toUpperCase() : 'ACTIVE'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                    {c.description || 'Verified enterprise employer registered under national workforce immigration compliance.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50/80 border border-slate-100 text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Active Workers</span>
                      <strong className="text-emerald-700 font-mono">{activeW.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Income Wallet</span>
                      <strong className="text-blue-700 font-mono">RM {inc.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Net Profit</span>
                      <strong className="text-emerald-700 font-mono">RM {prf.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">5% Donate</span>
                      <strong className="text-purple-700 font-mono">RM {incDon.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 truncate">{c.sector}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedCompanyDetail(c)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border-0"
                    >
                      View Details
                    </button>
                    <Link
                      href={`${resolvedBaseRoute}?edit=${c.id}`}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#0b4da2] hover:bg-blue-50"
                    >
                      <Edit2 size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW COMPANY DETAILS MODAL */}
      {selectedCompanyDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden shadow-2xs">
                  {selectedCompanyDetail.logo ? (
                    <img
                      src={resolveFileUrl(selectedCompanyDetail.logo)}
                      alt={selectedCompanyDetail.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 size={24} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 m-0">
                    {selectedCompanyDetail.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{selectedCompanyDetail.roc}</span>
                    <span>•</span>
                    <span>{selectedCompanyDetail.sector}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCompanyDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Financial Snapshot */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Financial &amp; Workforce Overview
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="text-[10px] text-[#0b4da2] font-semibold">Income Wallet</div>
                    <div className="text-base font-bold font-mono text-slate-900 mt-1">
                      RM {getCompanyIncomeWallet(selectedCompanyDetail).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="text-[10px] text-rose-600 font-semibold">Cost Wallet</div>
                    <div className="text-base font-bold font-mono text-slate-900 mt-1">
                      RM {getCompanyCostWallet(selectedCompanyDetail).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-[10px] text-emerald-700 font-semibold">Net Profit</div>
                    <div className="text-base font-bold font-mono text-slate-900 mt-1">
                      RM {getCompanyProfitWallet(selectedCompanyDetail).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="text-[10px] text-purple-700 font-semibold">5% Donate Pool</div>
                    <div className="text-base font-bold font-mono text-purple-700 mt-1">
                      RM {Math.round(getCompanyIncomeWallet(selectedCompanyDetail) * 0.05).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Contact &amp; Legal Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Email Address:</span>
                    <strong className="text-slate-800">{selectedCompanyDetail.email || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Phone / Mobile:</span>
                    <strong className="text-slate-800">{selectedCompanyDetail.phone || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Registered Status:</span>
                    <strong className="text-emerald-700 uppercase">{selectedCompanyDetail.status || 'Active'}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Physical Address:</span>
                    <strong className="text-slate-800">{selectedCompanyDetail.address || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Directors */}
              {Array.isArray(selectedCompanyDetail.directors) && selectedCompanyDetail.directors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Board Directors ({selectedCompanyDetail.directors.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedCompanyDetail.directors.map((dir, dIdx) => (
                      <div
                        key={dir.id || dIdx}
                        className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold">
                            {dir.name ? dir.name.charAt(0) : 'D'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{dir.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              NID: {dir.nidNo || '—'} • Passport: {dir.passportNo || '—'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500">Contact</div>
                          <div className="font-medium text-slate-700">{dir.phone || dir.email || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">ID: {selectedCompanyDetail.id}</span>
              <div className="flex items-center gap-2">
                <Link
                  href={`${resolvedBaseRoute}?edit=${selectedCompanyDetail.id}`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-blue-700 text-white cursor-pointer no-underline"
                >
                  Edit Company
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedCompanyDetail(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
