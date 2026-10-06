'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
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
  fetchCompaniesFromBackend,
  getStoredCompanies,
  saveStoredCompany,
  subscribeToCompanyChanges,
  updateStoredCompany,
} from '@/lib/companyStorage';
import {
  CompanyStatCard,
  DEFAULT_COMPANY_STAT_CARDS,
  getStoredCompanyStatCards,
  fetchCompanyStatCards,
  subscribeToCompanyStatCardsChange,
} from '@/lib/companyStatCards';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import CompanyOrderStatisticsChart from '@/components/CompanyOrderStatisticsChart';
import { getMasterAdminUser, AuthUser } from '@/lib/auth';

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
  const [mounted, setMounted] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [statCards, setStatCards] = useState<CompanyStatCard[]>(DEFAULT_COMPANY_STAT_CARDS);
  const [selectedCardKey, setSelectedCardKey] = useState<string>('deposit_wallet');
  const [selectedCompanyCardId, setSelectedCompanyCardId] = useState<string>('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const assignedList = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  // Load companies & stat cards safely on mount to eliminate hydration mismatches
  useEffect(() => {
    setMounted(true);
    const user = getMasterAdminUser();
    setCurrentUser(user);
    setAllCompanies(getStoredCompanies());
    setStatCards(getStoredCompanyStatCards());

    fetchCompaniesFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setAllCompanies(list);
      }
    }).catch(() => {});

    fetchCompanyStatCards().then((cards) => {
      if (Array.isArray(cards) && cards.length > 0) {
        setStatCards(cards);
      }
    }).catch(() => {});

    const unsubCompanies = subscribeToCompanyChanges(() => {
      setAllCompanies(getStoredCompanies());
    });

    const unsubCards = subscribeToCompanyStatCardsChange(() => {
      setStatCards(getStoredCompanyStatCards());
    });

    return () => {
      unsubCompanies();
      unsubCards();
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
      subLabel: '',
      badge: 'ALL',
    },
    ...permittedCompanies.map((c) => ({
      value: String(c.id),
      label: c.name,
      subLabel: c.sector,
      badge: c.roc,
    })),
  ], [permittedCompanies]);

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

  // Filter table with search & sector
  const filteredCompanies = useMemo(() => {
    return permittedCompanies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.roc && c.roc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.sector.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSector = selectedSector === 'ALL' || c.sector === selectedSector;
      const matchCardCompany = !selectedSingleCompany || String(c.id) === String(selectedSingleCompany.id);
      return matchSearch && matchSector && matchCardCompany;
    });
  }, [permittedCompanies, searchTerm, selectedSector, selectedSingleCompany]);

  // Aggregated totals strictly for selected scope (single company or all permitted)
  const totalActiveWorkers = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyActiveWorkers(c), 0);
  }, [selectedCardCompanies]);

  const totalInactiveWorkers = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyInactiveWorkers(c), 0);
  }, [selectedCardCompanies]);

  const totalWorkerWallet = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyWorkerWallet(c), 0);
  }, [selectedCardCompanies]);

  const totalIncomeWallet = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyIncomeWallet(c), 0);
  }, [selectedCardCompanies]);

  const totalCostWallet = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyCostWallet(c), 0);
  }, [selectedCardCompanies]);

  const totalProfitWallet = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyProfitWallet(c), 0);
  }, [selectedCardCompanies]);

  const totalPendingWallet = useMemo(() => {
    return selectedCardCompanies.reduce((acc, c) => acc + getCompanyPendingWallet(c), 0);
  }, [selectedCardCompanies]);

  // Compute card metrics strictly for permitted / selected scope
  const getCardMetrics = (card: CompanyStatCard) => {
    switch (card.card_key) {
      case 'registered_companies':
        if (selectedSingleCompany) {
          return {
            value: selectedSingleCompany.name,
            sub: `${selectedSingleCompany.roc || 'Verified Entity'} • View Profile →`,
            link: `/masteradmin/companies/${encodeURIComponent(selectedSingleCompany.id)}`,
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
          value: `${permittedCompanies.length}`,
          sub: 'Permitted Employer Entities',
          link: '/masteradmin/companies',
          isLink: false,
          isCompanyEntity: false,
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
          isCompanyEntity: false,
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
          isCompanyEntity: false,
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
          isCompanyEntity: false,
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
          isCompanyEntity: false,
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
          isCompanyEntity: false,
          theme: {
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            border: 'border-rose-100',
            valColor: 'text-rose-700',
          },
        };
      case 'others_cost':
      case 'others_expense':
        return {
          value: `RM ${(Number(card.custom_value) || 0).toLocaleString()}`,
          sub: card.subtitle || 'Miscellaneous & Other Expenses',
          isLink: false,
          isCompanyEntity: false,
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
          sub: selectedSingleCompany ? 'Net Margin for this Company' : (card.subtitle || 'Net Retained Margin'),
          isLink: false,
          isCompanyEntity: false,
          theme: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-100',
            valColor: 'text-emerald-700',
          },
        };
      case 'others_profit':
        return {
          value: `RM ${(Number(card.custom_value) || 0).toLocaleString()}`,
          sub: card.subtitle || 'Auxiliary & Service Profits',
          isLink: false,
          isCompanyEntity: false,
          theme: {
            bg: 'bg-teal-50',
            text: 'text-teal-700',
            border: 'border-teal-100',
            valColor: 'text-teal-700',
          },
        };
      case 'pending_wallet':
        return {
          value: `RM ${totalPendingWallet.toLocaleString()}`,
          sub: selectedSingleCompany ? 'Pending Dues for this Company' : (card.subtitle || 'Pending Approvals & Dues'),
          isLink: false,
          isCompanyEntity: false,
          theme: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            valColor: 'text-amber-700',
          },
        };
      case 'others_pending':
        return {
          value: `RM ${(Number(card.custom_value) || 0).toLocaleString()}`,
          sub: card.subtitle || 'Other Pending Invoices & Dues',
          isLink: false,
          isCompanyEntity: false,
          theme: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            valColor: 'text-amber-700',
          },
        };
      case 'total_profit':
        return {
          value: `RM ${(totalProfitWallet + (Number(card.custom_value) || 0)).toLocaleString()}`,
          sub: card.subtitle || 'Foreigner Profit + Auxiliary Profit',
          isLink: false,
          isCompanyEntity: false,
          theme: {
            bg: 'bg-emerald-100',
            text: 'text-emerald-800',
            border: 'border-emerald-200',
            valColor: 'text-emerald-700',
          },
        };
      default:
        return {
          value: typeof card.custom_value === 'number'
            ? (card.custom_value >= 1000 ? `RM ${card.custom_value.toLocaleString()}` : card.custom_value.toLocaleString())
            : '0',
          sub: card.subtitle || 'Custom Treasury Metric',
          isLink: false,
          isCompanyEntity: false,
          theme: {
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200',
            valColor: 'text-slate-800',
          },
        };
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
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldAlert size={12} className="text-yellow-400" />
              <span>Assigned Scope Only • Read-Only Treasury Cards</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              Permitted Companies Management
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Welcome, {currentUser?.name || 'Master Admin'}. You have administrative clearance to view records, financial metrics, and workers for your {permittedCompanies.length} permitted {permittedCompanies.length === 1 ? 'company' : 'companies'}.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 border border-white/20 px-3.5 py-2 rounded-xl text-right">
              <div className="text-[10px] text-blue-200 uppercase font-bold">Authorized Scope</div>
              <div className="text-base font-extrabold text-white">
                {permittedCompanies.length} Companies
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Select Filter Bar (Matching Super Admin: Select2 Search or Single Scope indicator + Quick 1-click pills) */}
      {permittedCompanies.length > 1 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 whitespace-nowrap">
              <Building2 size={16} className="text-[#0b4da2]" />
              <span>Filter Cards by Company:</span>
            </div>
            <div className="w-full sm:w-72 md:w-80">
              <Select2Search
                options={companyCardFilterOptions}
                value={selectedCompanyCardId}
                onChange={(val) => setSelectedCompanyCardId(val)}
                placeholder="All Permitted Companies (Aggregated)"
                searchPlaceholder="Search company by name, ROC, sector..."
                icon={<Building2 size={14} className="text-slate-400" />}
              />
            </div>
            {selectedCompanyCardId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCompanyCardId('ALL')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b4da2] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer w-fit"
                title="Reset card metrics to all permitted companies"
              >
                <X size={13} />
                <span>Reset to All</span>
              </button>
            )}

            {/* Quick 1-click Company Selection Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCompanyCardId('ALL')}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  selectedCompanyCardId === 'ALL'
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({permittedCompanies.length})
              </button>
              {permittedCompanies.map((c) => {
                const isSelected = selectedCompanyCardId === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCompanyCardId(String(c.id))}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-[#0b4da2]'
                    }`}
                    title={`View ${c.name} cards & statistics`}
                  >
                    {c.logo ? (
                      <img
                        src={resolveFileUrl(c.logo)}
                        alt=""
                        className="w-4 h-4 object-contain rounded shrink-0 bg-white"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Building2 size={13} className="shrink-0 text-slate-400" />
                    )}
                    <span className="truncate max-w-[130px]">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSingleCompany && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Viewing: {selectedSingleCompany.name}
              </span>
            </div>
          )}
        </div>
      ) : permittedCompanies.length === 1 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 flex-wrap">
            <Building2 size={16} className="text-[#0b4da2]" />
            <span className="font-bold">Assigned Employer Company:</span>
            <span className="font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {permittedCompanies[0].name}
            </span>
            {permittedCompanies[0].roc && (
              <span className="text-slate-400 font-mono text-[11px]">
                ({permittedCompanies[0].roc})
              </span>
            )}
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
            1 Company Scope
          </span>
        </div>
      ) : null}

      {/* Financial Treasury Cards Section (Read-Only: No Add Card, No Manage Priority) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
              Overview & Financial Treasury Cards
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200 text-[10px] font-bold font-mono">
              {statCards.length} Cards
            </span>
          </div>

          <div className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
            Scope: <span className="font-bold text-slate-700">{selectedSingleCompany ? selectedSingleCompany.name : `${permittedCompanies.length} Permitted Companies`}</span>
          </div>
        </div>

        {/* Stat Cards Grid (Clickable to switch chart metric) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const metrics = getCardMetrics(card);
            const isCurrency = metrics.value.startsWith('RM');
            const isCompanyEntity = metrics.isCompanyEntity && selectedSingleCompany;
            const isSelected = selectedCardKey === card.card_key;

            const cardClasses = `bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group min-h-[130px] no-underline ${
              isSelected
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                : card.card_key === 'total_profit'
                ? 'border-emerald-300 ring-1 ring-emerald-200/80 bg-gradient-to-br from-emerald-50/30 via-white to-emerald-50/10 hover:border-emerald-400'
                : 'border-slate-200 hover:border-blue-400'
            } ${metrics.isLink && metrics.link ? 'cursor-pointer' : 'cursor-pointer'}`;

            const cardContent = (
              <>
                {/* Top Row: Title on Left, Icon or Logo on Right */}
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
                      <DynamicCardIcon icon={card.icon} size={16} />
                    )}
                  </div>
                </div>

                {/* Middle Row: Full Width Value or Company Name */}
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
                  key={card.id || card.card_key}
                  href={metrics.link}
                  className={cardClasses}
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div
                key={card.id || card.card_key}
                onClick={() => setSelectedCardKey(card.card_key)}
                className={cardClasses}
                title={`Click to view ${card.name} in statistics graph`}
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Date-Wise Order & Metric Statistics Chart (Strictly Permitted Scope) */}
      <CompanyOrderStatisticsChart
        companies={selectedCardCompanies}
        statCards={statCards}
        initialCardKey={selectedCardKey}
      />

      {/* Main Companies List & Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Filters */}
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
              title="Reset filters"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Table */}
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
                  const cost = getCompanyCostWallet(comp);
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
                          <button
                            type="button"
                            onClick={() => setSelectedCompanyCardId(selectedCompanyCardId === String(comp.id) ? 'ALL' : String(comp.id))}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer border ${
                              selectedCompanyCardId === String(comp.id)
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
    </div>
  );
}
