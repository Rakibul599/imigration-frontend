'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Layers,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  User,
  UserCheck,
  UserMinus,
  UserX,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { CustomerRecord, fetchCustomers, getFileUrl, fetchWorkingSectors, WorkingSector } from '@/lib/customerStorage';
import { AgentRecord, fetchAgents, getStoredAgents } from '@/lib/agentStorage';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import { ProgramRecord, fetchPrograms, getStoredPrograms } from '@/lib/programStorage';
import {
  fetchAllCustomerFinances,
  getCustomerFinanceBalance,
  getStoredCustomerTargets,
  getStoredCustomerDeposits,
  CustomerFinanceBalance,
  CustomerCompanyCostRecord,
  getStoredCompanyCosts,
  fetchCustomerCompanyCosts,
} from '@/lib/customerFinanceStorage';
import {
  useDashboardCardDesign,
  useCardAnimationSettings,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
} from '@/lib/themeSettings';
import { getMasterAdminUser } from '@/lib/auth';

interface AgentWiseCustomersContentProps {
  portalType: 'superadmin' | 'frontend_superadmin' | 'masteradmin';
  backUrl: string;
}

export default function AgentWiseCustomersContent({ portalType, backUrl }: AgentWiseCustomersContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';
  const {
    animation: cardAnimation,
    duration: cardDuration,
    stagger: cardStagger,
    animTriggerKey,
  } = useCardAnimationSettings();

  const getCardThemeClasses = (index: number, hoverBorder: string = 'hover:border-blue-400') => {
    const animClass = getServiceCardAnimationClass(cardAnimation, index);
    return `admin-stat-card ${animClass} relative overflow-hidden group transition-all flex flex-col justify-between min-h-[120px] ${
      isGlass
        ? 'dashboard-card-glass rounded-2xl p-5'
        : `bg-white border border-slate-200 rounded-2xl p-5 shadow-xs ${hoverBorder}`
    }`;
  };

  const queryCompanyId = searchParams.get('company_id') || searchParams.get('company') || '';
  const queryAgentId = searchParams.get('agent_id') || '';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [costRecords, setCostRecords] = useState<CustomerCompanyCostRecord[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(queryCompanyId || 'ALL');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(queryAgentId || 'ALL');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Sync state if search params change
  useEffect(() => {
    if (queryCompanyId) setSelectedCompanyId(queryCompanyId);
    if (queryAgentId) setSelectedAgentId(queryAgentId);
  }, [queryCompanyId, queryAgentId]);

  // Initial load of Companies, Agents, Programs, Sectors, Finances, and Customers
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      setLoading(true);
      try {
        const [comps, agts, custs, progs, secs, _finances, costs] = await Promise.all([
          fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
          fetchAgents().catch(() => getStoredAgents()),
          fetchCustomers(),
          fetchPrograms().catch(() => getStoredPrograms()),
          fetchWorkingSectors().catch(() => []),
          fetchAllCustomerFinances().catch(() => {}),
          fetchCustomerCompanyCosts().catch(() => getStoredCompanyCosts()),
        ]);

        if (isMounted) {
          let finalComps = comps;
          let finalCusts = custs;
          if (portalType === 'masteradmin') {
            const user = getMasterAdminUser();
            const scope = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
            if (scope.length > 0 && !scope.includes('*')) {
              finalComps = comps.filter((c: Company) => scope.some((sId) => sId.toLowerCase() === c.id.toLowerCase()));
              finalCusts = custs.filter((c: CustomerRecord) => Boolean(c.company_id && scope.some((sId) => sId.toLowerCase() === c.company_id?.toLowerCase())));
            }
          }

          setCompanies(finalComps);
          setAgents(agts);
          setCustomers(finalCusts);
          setPrograms(progs);
          setSectors(secs);
          setCostRecords(costs || getStoredCompanyCosts());

          // If no specific company was passed, default to first company if available
          if (!queryCompanyId && finalComps.length > 0 && selectedCompanyId === 'ALL') {
            setSelectedCompanyId(finalComps[0].id);
          }
          // If no specific agent was passed, default to first agent if available
          if (!queryAgentId && agts.length > 0 && selectedAgentId === 'ALL') {
            setSelectedAgentId(String(agts[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load agent wise data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for background company cost updates
  useEffect(() => {
    const handleCostUpdate = () => {
      setCostRecords(getStoredCompanyCosts());
    };
    window.addEventListener('companyCostsUpdated', handleCostUpdate);
    return () => window.removeEventListener('companyCostsUpdated', handleCostUpdate);
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [custs, agts, progs, secs, _finances, costs] = await Promise.all([
        fetchCustomers(),
        fetchAgents(),
        fetchPrograms().catch(() => getStoredPrograms()),
        fetchWorkingSectors().catch(() => []),
        fetchAllCustomerFinances().catch(() => {}),
        fetchCustomerCompanyCosts().catch(() => getStoredCompanyCosts()),
      ]);
      let finalCusts = custs;
      if (portalType === 'masteradmin') {
        const user = getMasterAdminUser();
        const scope = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
        if (scope.length > 0 && !scope.includes('*')) {
          finalCusts = custs.filter((c: CustomerRecord) => Boolean(c.company_id && scope.some((sId) => sId.toLowerCase() === c.company_id?.toLowerCase())));
        }
      }
      setCustomers(finalCusts);
      setAgents(agts);
      setPrograms(progs);
      setSectors(secs);
      setCostRecords(costs || getStoredCompanyCosts());
      setNotification({ type: 'success', message: 'Data refreshed successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch {
      setNotification({ type: 'error', message: 'Failed to refresh customer records.' });
    } finally {
      setLoading(false);
    }
  };

  // Find currently selected Company object
  const selectedCompany = useMemo(() => {
    if (selectedCompanyId === 'ALL') return null;
    return companies.find((c) => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // Find currently selected Agent object
  const selectedAgent = useMemo(() => {
    if (selectedAgentId === 'ALL') return null;
    return agents.find((a) => String(a.id) === selectedAgentId) || null;
  }, [agents, selectedAgentId]);

  // Unique sector options (API sectors + customers + defaults)
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    sectors.forEach((s) => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    customers.forEach((c) => {
      if (c.working_sector && c.working_sector.trim()) set.add(c.working_sector.trim());
    });
    const defaults = [
      'Construction',
      'Manufacturing',
      'Plantation',
      'Agriculture',
      'Services',
      'Cleaning',
      'Hospitality',
      'Security',
      'F&B',
      'IT / Office',
      'Other',
    ];
    defaults.forEach((d) => set.add(d));
    return Array.from(set).sort();
  }, [sectors, customers]);

  // Available recruitment / clearance years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (let y = currentYear + 2; y >= currentYear - 4; y--) {
      years.add(String(y));
    }
    customers.forEach((cust) => {
      if (cust.created_at) {
        const y = cust.created_at.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
      if (cust.passport_issue_date) {
        const y = cust.passport_issue_date.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
    });
    agents.forEach((agt) => {
      if (agt.year && /^\d{4}$/.test(agt.year)) years.add(agt.year);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [customers, agents]);

  // Filter customers strictly by Company, Agent, Program, Sector, and Year
  const agentWiseCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // 1. Company match
      if (selectedCompanyId !== 'ALL') {
        const matchesCompany = cust.company_id && cust.company_id.toLowerCase() === selectedCompanyId.toLowerCase();
        if (!matchesCompany) return false;
      }

      // 2. Agent match
      if (selectedAgentId !== 'ALL') {
        const matchesAgentId = cust.agent_id ? String(cust.agent_id) === selectedAgentId : false;
        const matchesAgentName = selectedAgent ? cust.agent_name === selectedAgent.name : false;
        if (!matchesAgentId && !matchesAgentName) return false;
      }

      // 3. Program match
      if (selectedProgramId !== 'ALL') {
        const matchesProgram = cust.program_id ? String(cust.program_id) === selectedProgramId : false;
        if (!matchesProgram) return false;
      }

      // 4. Sector match
      if (selectedSector !== 'ALL') {
        const matchesSector = cust.working_sector ? cust.working_sector.toLowerCase() === selectedSector.toLowerCase() : false;
        if (!matchesSector) return false;
      }

      // 5. Year match
      if (selectedYear !== 'ALL') {
        const matchCreated = cust.created_at && cust.created_at.slice(0, 4) === selectedYear;
        const matchPassport = cust.passport_issue_date && cust.passport_issue_date.slice(0, 4) === selectedYear;
        if (!matchCreated && !matchPassport) return false;
      }

      return true;
    });
  }, [customers, selectedCompanyId, selectedAgentId, selectedAgent, selectedProgramId, selectedSector, selectedYear]);

  // Compute live financial summary for the selected Agent & Company
  const financialSummary = useMemo(() => {
    let totalTarget = 0;
    let totalDeposit = 0;
    let totalPending = 0;
    let totalCost = 0;

    const custIdSet = new Set(agentWiseCustomers.map((c) => String(c.id)));

    agentWiseCustomers.forEach((cust) => {
      const bal = getCustomerFinanceBalance(cust.id);
      totalTarget += bal.total_target;
      totalDeposit += bal.total_deposited;
      totalPending += bal.net_pending;
    });

    costRecords.forEach((c) => {
      if (c.customer_id && custIdSet.has(String(c.customer_id))) {
        totalCost += Number(c.total_cost_amount) || 0;
      }
    });

    if (totalCost === 0 && selectedCompanyId !== 'ALL') {
      costRecords.forEach((c) => {
        if (c.company_id && String(c.company_id).toLowerCase() === selectedCompanyId.toLowerCase()) {
          totalCost += Number(c.total_cost_amount) || 0;
        }
      });
    }

    const totalRemaining = Math.max(0, totalTarget - totalDeposit);
    const revenueBasis = totalTarget > 0 ? totalTarget : totalDeposit;
    const totalProfit = Math.max(0, revenueBasis - totalCost);

    return {
      totalCustomers: agentWiseCustomers.length,
      totalTarget,
      totalDeposit,
      totalPending,
      totalRemaining,
      totalCost,
      totalProfit,
    };
  }, [agentWiseCustomers, costRecords, selectedCompanyId]);

  // Compute live customer counts by status for selected Agent & Company
  const statusCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let runaway = 0;
    let blacklist = 0;

    agentWiseCustomers.forEach((cust) => {
      const st = (cust.status || '').toLowerCase().trim();
      if (st === 'active') active++;
      else if (st === 'inactive') inactive++;
      else if (st === 'runaway') runaway++;
      else if (st === 'blacklist') blacklist++;
    });

    return { active, inactive, runaway, blacklist };
  }, [agentWiseCustomers]);

  // Further filter for the interactive table (search term + status filter)
  const displayTableCustomers = useMemo(() => {
    return agentWiseCustomers.filter((cust) => {
      if (statusFilter !== 'ALL' && cust.status !== statusFilter) {
        return false;
      }

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchesName = cust.full_name?.toLowerCase().includes(s);
        const matchesPassport = cust.passport_no?.toLowerCase().includes(s);
        const matchesNid = cust.nid_no?.toLowerCase().includes(s);
        const matchesPhone = cust.phone?.toLowerCase().includes(s);
        if (!matchesName && !matchesPassport && !matchesNid && !matchesPhone) return false;
      }

      return true;
    });
  }, [agentWiseCustomers, searchTerm, statusFilter]);

  const viewBaseUrl =
    portalType === 'masteradmin'
      ? '/masteradmin/customers/create'
      : portalType === 'frontend_superadmin'
        ? '/superadmin/customers/create'
        : '/customers/create';

  const statementBaseUrl =
    portalType === 'masteradmin'
      ? '/masteradmin/customers/statement'
      : portalType === 'frontend_superadmin'
        ? '/superadmin/customers/statement'
        : '/customers/statement';

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors no-underline"
          >
            <ArrowLeft size={16} />
            <span>Back to Agent Dashboard</span>
          </Link>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-[#0b4da2] font-bold">
            Agent Wise Customers
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#0b4da2]' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. SELECTION BAR (Company, Agent, Program, Sector & Year) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0b4da2]">
            <SlidersHorizontal size={15} />
            <span>Select Filters • Company, Agent, Program, Sector &amp; Year</span>
          </div>

          {(selectedCompanyId !== 'ALL' || selectedAgentId !== 'ALL' || selectedProgramId !== 'ALL' || selectedSector !== 'ALL' || selectedYear !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedCompanyId('ALL');
                setSelectedAgentId('ALL');
                setSelectedProgramId('ALL');
                setSelectedSector('ALL');
                setSelectedYear('ALL');
              }}
              className="text-xs text-[#0b4da2] hover:text-[#083a7c] font-semibold underline bg-transparent border-0 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Company Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 size={13} className="text-[#0b4da2]" />
                <span>Company</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {companies.length}
              </span>
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
            >
              <option value="ALL">🏢 All Companies</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} {comp.sector ? `• ${comp.sector}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Agent Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#0b4da2]" />
                <span>Agent</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {agents.length}
              </span>
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
            >
              <option value="ALL">👤 All Agents</option>
              {agents.map((agt) => (
                <option key={agt.id} value={String(agt.id)}>
                  {agt.name} {agt.phone ? `(${agt.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Program Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers size={13} className="text-[#0b4da2]" />
                <span>Program</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {programs.length}
              </span>
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
            >
              <option value="ALL">📁 All Programs</option>
              {programs.map((prog) => (
                <option key={prog.id} value={String(prog.id)}>
                  {prog.name} {prog.category ? `(${prog.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sector Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe2 size={13} className="text-[#0b4da2]" />
                <span>Sector</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {availableSectors.length}
              </span>
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
            >
              <option value="ALL">🌐 All Sectors</option>
              {availableSectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-[#0b4da2]" />
                <span>Year</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {availableYears.length}
              </span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
            >
              <option value="ALL">📅 All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. OVERVIEW HEADER CARD (Left: Company Image & Name, Right: Agent Pic & Name) */}
      <div className={isGlass ? "dashboard-card-glass rounded-2xl p-5 sm:p-6 shadow-xs" : "bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs"}>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0b4da2]" />
            <span>Company &amp; Agent Dossier Link</span>
          </div>
          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-semibold">
            {financialSummary.totalCustomers} Assigned Workers
          </span>
        </div>

        <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 border border-slate-200/90 flex flex-col md:flex-row items-center justify-around gap-6 shadow-2xs">
          {/* Left Side: Company Logo on Top, Name Underneath */}
          <div className="flex flex-col items-center text-center max-w-[280px] w-full md:w-auto">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-2 overflow-hidden transition-all hover:shadow-xs">
              {selectedCompany?.logo ? (
                <img
                  src={getFileUrl(selectedCompany.logo)}
                  alt={selectedCompany.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 size={36} className="text-indigo-600" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2.5 block">
              Company
            </span>
            <h3 className="text-sm sm:text-base font-black text-slate-900 m-0 mt-0.5 leading-snug">
              {selectedCompany ? selectedCompany.name : 'All Companies'}
            </h3>
            <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full mt-1.5">
              {selectedCompany?.sector || 'Multi-Sector Corporate'}
            </div>
          </div>

          {/* Divider between Left & Right */}
          <div className="hidden md:block h-24 w-px bg-slate-200" />

          {/* Right Side: Agent Pic on Top, Name & Contact Underneath */}
          <div className="flex flex-col items-center text-center max-w-[280px] w-full md:w-auto">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-blue-500/30 shadow-2xs flex items-center justify-center p-0.5 overflow-hidden transition-all hover:shadow-xs">
              {selectedAgent?.image ? (
                <img
                  src={getFileUrl(selectedAgent.image)}
                  alt={selectedAgent.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#0b4da2] to-blue-800 text-white font-black text-2xl flex items-center justify-center shadow-inner">
                  {selectedAgent ? selectedAgent.name.charAt(0).toUpperCase() : <User size={30} />}
                </div>
              )}
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2.5 block">
              Recruitment Agent
            </span>
            <h3 className="text-sm sm:text-base font-black text-slate-900 m-0 mt-0.5 leading-snug">
              {selectedAgent ? selectedAgent.name : 'All Registered Agents'}
            </h3>

            {selectedAgent?.phone ? (
              <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                <Phone size={11} className="text-emerald-600" />
                <span>{selectedAgent.phone}</span>
                {selectedAgent.phone.replace(/[^0-9]/g, '') && (
                  <a
                    href={`https://wa.me/${selectedAgent.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-emerald-600 hover:text-emerald-800"
                    title="WhatsApp Agent"
                  >
                    <MessageSquare size={11} />
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-1.5 font-mono text-[11px] text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                Direct Liaison
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. SEVEN METRIC STAT CARDS (4 Customer Statuses + 3 Financial Metrics) */}
      <div className="space-y-4">
        {/* Customer Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total active customer */}
          <div
            key={`stat-card-0-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(0, cardDuration, cardStagger)}
            className={getCardThemeClasses(0, 'hover:border-emerald-400')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total active customer
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-700">
                {statusCounts.active}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Active foreign workers
              </div>
            </div>
          </div>

          {/* Card 2: Inactive customer */}
          <div
            key={`stat-card-1-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(1, cardDuration, cardStagger)}
            className={getCardThemeClasses(1, 'hover:border-rose-400')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inactive customer
              </span>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <UserX size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-700">
                {statusCounts.inactive}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Deactivated / expired workers
              </div>
            </div>
          </div>

          {/* Card 3: Runway customer */}
          <div
            key={`stat-card-2-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(2, cardDuration, cardStagger)}
            className={getCardThemeClasses(2, 'hover:border-amber-400')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Runway customer
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <UserMinus size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-700">
                {statusCounts.runaway}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Reported runaway workers
              </div>
            </div>
          </div>

          {/* Card 4: Blacklist customer */}
          <div
            key={`stat-card-3-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(3, cardDuration, cardStagger)}
            className={getCardThemeClasses(3, 'hover:border-slate-500')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Blacklist customer
              </span>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <ShieldAlert size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">
                {statusCounts.blacklist}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Flagged / blacklisted workers
              </div>
            </div>
          </div>
        </div>

        {/* Financial Metrics Cards (4 cards per row) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 5: Total Target Amount */}
          <div
            key={`stat-card-4-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(4, cardDuration, cardStagger)}
            className={getCardThemeClasses(4, 'hover:border-blue-400')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Target Amount
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                <Target size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-[#0b4da2] font-mono">
                RM {financialSummary.totalTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Total target recruitment budget
              </div>
            </div>
          </div>

          {/* Card 6: Total deposit amount */}
          <div
            key={`stat-card-5-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(5, cardDuration, cardStagger)}
            className={getCardThemeClasses(5, 'hover:border-emerald-400')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total deposit amount
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Receipt size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-700 font-mono">
                RM {financialSummary.totalDeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Collected customer deposits
              </div>
            </div>
          </div>

          {/* Card 7: Total Pending Amount */}
          <div
            key={`stat-card-6-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(6, cardDuration, cardStagger)}
            className={getCardThemeClasses(6, 'hover:border-amber-400')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Pending Amount
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-700 font-mono">
                RM {financialSummary.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Pending unpaid dues
              </div>
            </div>
          </div>

          {/* Card 8: Total Cost */}
          <div
            key={`stat-card-7-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(7, cardDuration, cardStagger)}
            className={getCardThemeClasses(7, 'hover:border-rose-400')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Cost
              </span>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileSpreadsheet size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-700 font-mono">
                RM {financialSummary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Total processing &amp; operational cost
              </div>
            </div>
          </div>

          {/* Card 9: Total Profit */}
          <div
            key={`stat-card-8-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
            style={getServiceCardAnimationStyle(8, cardDuration, cardStagger)}
            className={getCardThemeClasses(8, 'hover:border-indigo-400')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Profit
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#0b4da2] flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-[#0b4da2] font-mono">
                RM {financialSummary.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Net retained profit margin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FILTERABLE TABLE (Company & Agent Wise Customer List) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 m-0">
              Customer Directory — {selectedAgent ? selectedAgent.name : 'All Agents'} ({selectedCompany ? selectedCompany.name : 'All Employers'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Showing {displayTableCustomers.length} of {agentWiseCustomers.length} worker dossiers
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, passport, NID..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#0b4da2] transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">Customer / Worker</th>
                <th className="py-3 px-4">Passport &amp; NID</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Employer / Company</th>
                <th className="py-3 px-4 text-right">Target (RM)</th>
                <th className="py-3 px-4 text-right">Deposit (RM)</th>
                <th className="py-3 px-4 text-right">Remaining (RM)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto text-blue-500 animate-spin mb-2" />
                    <span>Loading customer records...</span>
                  </td>
                </tr>
              ) : displayTableCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">
                      No Customers Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || statusFilter !== 'ALL'
                        ? 'No workers match the specified filters.'
                        : 'No workers have been registered under this agent and employer combination yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayTableCustomers.map((cust, idx) => {
                  const bal = getCustomerFinanceBalance(cust.id);
                  const remaining = Math.max(0, bal.total_target - bal.total_deposited);

                  return (
                    <tr key={cust.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Worker Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`${statementBaseUrl}?id=${cust.id}`}
                            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-[#0b4da2] hover:ring-2 hover:ring-[#0b4da2] transition-all cursor-pointer"
                            title="View Financial Statement & Wallet"
                          >
                            {cust.profile_pic || cust.profile_image ? (
                              <img
                                src={getFileUrl(cust.profile_pic || cust.profile_image)}
                                alt={cust.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              cust.full_name ? cust.full_name.charAt(0).toUpperCase() : 'W'
                            )}
                          </Link>
                          <div>
                            <Link
                              href={`${statementBaseUrl}?id=${cust.id}`}
                              className="font-bold text-slate-900 hover:text-[#0b4da2] hover:underline transition-colors block leading-tight cursor-pointer"
                              title="View Financial Statement & Wallet"
                            >
                              {cust.full_name}
                            </Link>
                            <span className="text-[10px] font-mono text-slate-400">
                              ID #{cust.id} {cust.working_sector ? `• ${cust.working_sector}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Passport & NID */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-800">
                          {cust.passport_no || 'No Passport'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          NID: {cust.nid_no || '—'}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <span>{cust.phone}</span>
                            {cust.phone.replace(/[^0-9]/g, '') && (
                              <a
                                href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare size={12} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Employer / Company */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">
                          {cust.company_id
                            ? companies.find((c) => c.id === cust.company_id)?.name || cust.company_id
                            : cust.other_company_name || 'Direct Employer'}
                        </span>
                      </td>

                      {/* Target (RM) */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        RM {bal.total_target.toFixed(2)}
                      </td>

                      {/* Deposit (RM) */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        RM {bal.total_deposited.toFixed(2)}
                      </td>

                      {/* Remaining (RM) */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            remaining === 0 && bal.total_target > 0
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }
                        >
                          RM {remaining.toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            cust.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cust.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {cust.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`${viewBaseUrl}?id=${cust.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-600 hover:text-[#0b4da2] transition-colors"
                            title="Edit / View Worker Profile"
                          >
                            <Eye size={13} />
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
  );
}
