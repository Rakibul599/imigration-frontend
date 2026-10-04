'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
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
  CheckCircle2,
  ChevronsDown,
  ChevronsUp,
  Clock,
  Coins,
  CreditCard,
  Crown,
  DollarSign,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  PieChart,
  Plus,
  Receipt,
  RotateCcw,
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
} from 'lucide-react';
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
} from '@/lib/companyStatCards';
import CompanyOrderStatisticsChart from '@/components/CompanyOrderStatisticsChart';
import { WorkingSector, fetchWorkingSectors, createWorkingSector } from '@/lib/customerStorage';

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
  { label: 'Active Worker', icon: 'UserCheck' },
  { label: 'Inactive Worker', icon: 'UserX' },
  { label: 'Target Wallet', icon: 'Wallet' },
  { label: 'Deposit (In)', icon: 'ArrowUpRight' },
  { label: 'Cost (Out)', icon: 'ArrowDownRight' },
  { label: 'Profit (Net)', icon: 'TrendingUp' },
  { label: 'Pending Dues', icon: 'Clock' },
  { label: 'Receipt/Expense', icon: 'Receipt' },
  { label: 'Credit Card', icon: 'CreditCard' },
  { label: 'Coins', icon: 'Coins' },
  { label: 'Dollar', icon: 'DollarSign' },
  { label: 'Briefcase', icon: 'Briefcase' },
  { label: 'Shield Check', icon: 'ShieldCheck' },
];

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [statCards, setStatCards] = useState<CompanyStatCard[]>(DEFAULT_COMPANY_STAT_CARDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedCompanyCardId, setSelectedCompanyCardId] = useState<string>('ALL');
  const [syncTableWithCardFilter, setSyncTableWithCardFilter] = useState<boolean>(true);
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
  const [modalEditIcon, setModalEditIcon] = useState('');
  const [modalEditCustomValue, setModalEditCustomValue] = useState<number>(0);
  const [modalEditIconPreview, setModalEditIconPreview] = useState<string | null>(null);
  const [modalEditIconFile, setModalEditIconFile] = useState<File | null>(null);
  const [isSavingManage, setIsSavingManage] = useState(false);

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

  // Initial load
  useEffect(() => {
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

    const unsubComp = subscribeToCompanyChanges(() => {
      setCompanies(getStoredCompanies());
    });
    const unsubCards = subscribeToCompanyStatCardsChange(() => {
      setStatCards(getStoredCompanyStatCards());
    });

    return () => {
      unsubComp();
      unsubCards();
    };
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
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

  const totalActiveWorkers = selectedCardCompanies.reduce((acc, c) => acc + getCompanyActiveWorkers(c), 0);
  const totalInactiveWorkers = selectedCardCompanies.reduce((acc, c) => acc + getCompanyInactiveWorkers(c), 0);
  const totalWorkerWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyWorkerWallet(c), 0);
  const totalIncomeWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyIncomeWallet(c), 0);
  const totalCostWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyCostWallet(c), 0);
  const totalProfitWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyProfitWallet(c), 0);
  const totalPendingWallet = selectedCardCompanies.reduce((acc, c) => acc + getCompanyPendingWallet(c), 0);

  // Compute card metrics
  const getCardMetrics = (card: CompanyStatCard) => {
    switch (card.card_key) {
      case 'registered_companies':
        return {
          value: selectedSingleCompany ? '1' : `${companies.length}`,
          sub: selectedSingleCompany ? selectedSingleCompany.roc : (card.subtitle || 'View Company List →'),
          link: selectedSingleCompany ? `/superadmin/companies/${encodeURIComponent(selectedSingleCompany.id)}` : '/superadmin/companies/registered',
          isLink: true,
          theme: {
            bg: 'bg-blue-50',
            text: 'text-[#0b4da2]',
            border: 'border-blue-100',
            valColor: 'text-slate-900',
          },
        };
      case 'active_workers':
        return {
          value: totalActiveWorkers.toLocaleString(),
          sub: selectedSingleCompany ? 'Active for this Company' : (card.subtitle || 'Approved & Active Permits'),
          isLink: false,
          theme: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-100',
            valColor: 'text-emerald-600',
          },
        };
      case 'inactive_workers':
        return {
          value: totalInactiveWorkers.toLocaleString(),
          sub: selectedSingleCompany ? 'Inactive for this Company' : (card.subtitle || 'Expired / Renewal Pending'),
          isLink: false,
          theme: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            valColor: 'text-slate-700',
          },
        };
      case 'target_wallet':
        return {
          value: `RM ${totalWorkerWallet.toLocaleString()}`,
          sub: selectedSingleCompany ? 'Worker Target for this Company' : (card.subtitle || 'Total Worker Target Pool'),
          isLink: false,
          theme: {
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-100',
            valColor: 'text-purple-700',
          },
        };
      case 'deposit_wallet':
        return {
          value: `RM ${totalIncomeWallet.toLocaleString()}`,
          sub: selectedSingleCompany ? 'Deposit Inflow for this Company' : (card.subtitle || 'Total Received Inflow'),
          isLink: false,
          theme: {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-100',
            valColor: 'text-blue-700',
          },
        };
      case 'cost_wallet':
        return {
          value: `RM ${totalCostWallet.toLocaleString()}`,
          sub: selectedSingleCompany ? 'Cost & Levy for this Company' : (card.subtitle || 'Operational & Levy Outflow'),
          isLink: false,
          theme: {
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            border: 'border-rose-100',
            valColor: 'text-rose-700',
          },
        };
      case 'profit_wallet':
        return {
          value: `RM ${totalProfitWallet.toLocaleString()}`,
          sub: selectedSingleCompany ? 'Retained Margin for this Company' : (card.subtitle || 'Net Retained Margin'),
          isLink: false,
          theme: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-100',
            valColor: 'text-emerald-700',
          },
        };
      case 'pending_wallet':
        return {
          value: `RM ${totalPendingWallet.toLocaleString()}`,
          sub: selectedSingleCompany ? 'Pending Amount for this Company' : (card.subtitle || 'Pending Approvals & Dues'),
          isLink: false,
          theme: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            valColor: 'text-amber-700',
          },
        };
      case 'others_expense':
        return {
          value: `RM ${(card.custom_value ?? 0).toLocaleString()}`,
          sub: card.subtitle || 'Miscellaneous & Other Expenses',
          isLink: false,
          theme: {
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            border: 'border-rose-100',
            valColor: 'text-rose-700',
          },
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
      default: return <Coins {...iconProps} />;
    }
  };

  // Open Manage Modal
  const openManageModal = () => {
    setManageCardsList([...statCards]);
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

  const handleModalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalEditIconFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setModalEditIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save all changes in Manage modal
  const handleSaveManageModal = async () => {
    setIsSavingManage(true);
    try {
      const updated = await reorderCompanyStatCards(manageCardsList);
      setStatCards(updated);
      showToast('success', 'Stat & Wallet cards priority and settings saved to database.');
      setIsManageModalOpen(false);
    } catch (err) {
      console.error('Failed to save manage modal:', err);
    } finally {
      setIsSavingManage(false);
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

  // Filtered List for Table
  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.roc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tag && c.tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSector = selectedSector === 'ALL' || c.sector === selectedSector;
    const matchesCardCompany = !syncTableWithCardFilter || selectedCompanyCardId === 'ALL' || c.id === selectedCompanyCardId;
    return matchesSearch && matchesSector && matchesCardCompany;
  });

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
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                Super Admin — Employer Companies Registry
              </h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                selectedSingleCompany ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#0b4da2]'
              }`}>
                {selectedSingleCompany ? '1 Company Selected' : `${companies.length} Active`}
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0">
              Create, edit, and manage registered employer organizations. Stored in Laravel MySQL database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/superadmin/companies/create"
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
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 whitespace-nowrap">
              <Building2 size={16} className="text-[#0b4da2]" />
              <span>Filter Cards by Company:</span>
            </div>
            <div className="w-full sm:w-80 md:w-96">
              <Select2Search
                options={companyCardFilterOptions}
                value={selectedCompanyCardId}
                onChange={(val) => setSelectedCompanyCardId(val)}
                placeholder="All Companies (Aggregated)"
                searchPlaceholder="Search company by name, ROC, sector..."
                icon={<Building2 size={14} className="text-slate-400" />}
              />
            </div>
            {selectedCompanyCardId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCompanyCardId('ALL')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b4da2] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer w-fit"
                title="Reset card metrics to all companies"
              >
                <X size={13} />
                <span>Reset to All</span>
              </button>
            )}
          </div>

          {selectedSingleCompany && (
            <div className="flex items-center gap-3">
              <label className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncTableWithCardFilter}
                  onChange={(e) => setSyncTableWithCardFilter(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                />
                Filter table below as well
              </label>
              <span className="hidden lg:inline text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Viewing: {selectedSingleCompany.name}
              </span>
            </div>
          )}
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
              {statCards.length} Cards
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Manage Cards & Priority Button */}
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

        {/* 9 Stat & Wallet Cards Grid (Matching Dashboard Card Design) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const metrics = getCardMetrics(card);
            const isCurrency = metrics.value.startsWith('RM');

            return (
              <div
                key={card.id || card.card_key}
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[125px]"
              >
                {/* Top Row: Title on Left, Icon on Right */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight line-clamp-2"
                    title={card.name}
                  >
                    {card.name}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${metrics.theme.bg} ${metrics.theme.text}`}
                  >
                    {renderCardIcon(card.icon, 16)}
                  </div>
                </div>

                {/* Middle Row: Full Width Value */}
                <div
                  className={`font-bold tracking-tight font-mono my-0.5 ${
                    isCurrency ? 'text-[20px] sm:text-[22px] xl:text-[24px]' : 'text-2xl'
                  } ${metrics.theme.valColor}`}
                >
                  {metrics.value}
                </div>

                {/* Bottom Row: Subtitle / Link */}
                {metrics.isLink && metrics.link ? (
                  <Link
                    href={metrics.link}
                    className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium hover:underline no-underline"
                  >
                    <TrendingUp size={12} className="shrink-0" />
                    <span className="truncate">{metrics.sub.replace(/→/g, '').trim()} • View Directory →</span>
                  </Link>
                ) : (
                  <div className="text-[11px] text-slate-500 mt-1 truncate" title={metrics.sub}>
                    {metrics.sub}
                  </div>
                )}
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
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
                <th className="py-3 px-4 text-right min-w-[105px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredCompanies.map((company) => (
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
                        <Link
                          href={`/superadmin/companies/${encodeURIComponent(company.id)}`}
                          className="text-[#2563eb] hover:text-[#1d4ed8] hover:underline font-bold text-xs tracking-tight block truncate no-underline"
                          title={company.name}
                        >
                          {company.name}
                        </Link>
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

                  {/* 8. Action Buttons */}
                  <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
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
                        href={`/superadmin/companies/${encodeURIComponent(company.id)}`}
                        title="View Full Company & Directors Profile"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-600 hover:text-[#0b4da2] transition-colors shadow-2xs no-underline"
                      >
                        <Eye size={15} />
                      </Link>

                      {/* Edit Company */}
                      <Link
                        href={`/superadmin/companies/create?id=${encodeURIComponent(company.id)}`}
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
              ))}

              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
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
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-200">
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
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
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
                          <span className="text-xs font-bold text-slate-900 block uppercase leading-tight break-words">
                            {card.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block leading-tight mt-0.5">
                            {rank === 1 ? '★ Priority #1 (First Position)' : `Priority Position #${rank}`}
                            {card.card_key === 'others_expense' && card.custom_value !== undefined ? ` • RM ${card.custom_value.toLocaleString()}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: Rank input, Arrow icons, and Edit button */}
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
                            className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 uppercase font-semibold"
                            placeholder="Enter card title..."
                          />
                        </div>

                        {/* If others_expense, allow editing amount */}
                        {card.card_key === 'others_expense' && (
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              Expense Amount (RM)
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
                        )}

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
    </div>
  );
}
