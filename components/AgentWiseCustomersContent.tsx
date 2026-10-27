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
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { CustomerRecord, fetchCustomers, getFileUrl } from '@/lib/customerStorage';
import { AgentRecord, fetchAgents, getStoredAgents } from '@/lib/agentStorage';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import {
  fetchAllCustomerFinances,
  getCustomerFinanceBalance,
  getStoredCustomerTargets,
  getStoredCustomerDeposits,
  CustomerFinanceBalance,
} from '@/lib/customerFinanceStorage';

interface AgentWiseCustomersContentProps {
  portalType: 'superadmin' | 'frontend_superadmin';
  backUrl: string;
}

export default function AgentWiseCustomersContent({ portalType, backUrl }: AgentWiseCustomersContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryCompanyId = searchParams.get('company_id') || searchParams.get('company') || '';
  const queryAgentId = searchParams.get('agent_id') || '';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(queryCompanyId || 'ALL');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(queryAgentId || 'ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Sync state if search params change
  useEffect(() => {
    if (queryCompanyId) setSelectedCompanyId(queryCompanyId);
    if (queryAgentId) setSelectedAgentId(queryAgentId);
  }, [queryCompanyId, queryAgentId]);

  // Initial load of Companies, Agents, Finances, and Customers
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      setLoading(true);
      try {
        const [comps, agts, custs] = await Promise.all([
          fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
          fetchAgents().catch(() => getStoredAgents()),
          fetchCustomers(),
          fetchAllCustomerFinances().catch(() => {}),
        ]);

        if (isMounted) {
          setCompanies(comps);
          setAgents(agts);
          setCustomers(custs);

          // If no specific company was passed, default to first company if available
          if (!queryCompanyId && comps.length > 0 && selectedCompanyId === 'ALL') {
            setSelectedCompanyId(comps[0].id);
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

  const refreshData = async () => {
    setLoading(true);
    try {
      const [custs, agts] = await Promise.all([
        fetchCustomers(),
        fetchAgents(),
        fetchAllCustomerFinances().catch(() => {}),
      ]);
      setCustomers(custs);
      setAgents(agts);
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

  // Filter customers strictly by Company and Agent
  const agentWiseCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // 1. Company match
      if (selectedCompanyId !== 'ALL') {
        const matchesCompany = cust.company_id === selectedCompanyId;
        if (!matchesCompany) return false;
      }

      // 2. Agent match
      if (selectedAgentId !== 'ALL') {
        const matchesAgentId = cust.agent_id ? String(cust.agent_id) === selectedAgentId : false;
        const matchesAgentName = selectedAgent ? cust.agent_name === selectedAgent.name : false;
        if (!matchesAgentId && !matchesAgentName) return false;
      }

      return true;
    });
  }, [customers, selectedCompanyId, selectedAgentId, selectedAgent]);

  // Compute live financial summary for the selected Agent & Company
  const financialSummary = useMemo(() => {
    let totalTarget = 0;
    let totalDeposit = 0;
    let totalPending = 0;

    agentWiseCustomers.forEach((cust) => {
      const bal = getCustomerFinanceBalance(cust.id);
      totalTarget += bal.total_target;
      totalDeposit += bal.total_deposited;
      totalPending += bal.net_pending;
    });

    const totalRemaining = Math.max(0, totalTarget - totalDeposit);

    return {
      totalCustomers: agentWiseCustomers.length,
      totalTarget,
      totalDeposit,
      totalPending,
      totalRemaining,
    };
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
    portalType === 'frontend_superadmin'
      ? '/superadmin/customers/create'
      : '/customers/create';

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
            <span>Back to Agent Directory</span>
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

      {/* 1. SELECTION BAR (Company Selection & Agent Selection) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0b4da2] border-b border-slate-100 pb-3">
          <SlidersHorizontal size={15} />
          <span>Select Employer &amp; Recruitment Agent</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 size={14} className="text-[#0b4da2]" />
                <span>Select Company / Employer</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {companies.length} Registered Employers
              </span>
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
            >
              <option value="ALL">🏢 All Companies (Overview)</option>
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
                <Briefcase size={14} className="text-[#0b4da2]" />
                <span>Select Recruitment Agent</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {agents.length} Registered Agents
              </span>
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
            >
              <option value="ALL">👤 All Agents (Overview)</option>
              {agents.map((agt) => (
                <option key={agt.id} value={String(agt.id)}>
                  {agt.name} {agt.phone ? `(${agt.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. OVERVIEW HEADER CARD (Left: Company Image & Name, Right: Agent Pic & Name) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
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
              Employer / Company
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

      {/* 3. FOUR METRIC STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Customer
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {financialSummary.totalCustomers}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Recruited foreign workers
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0b4da2] opacity-80" />
        </div>

        {/* Card 2: Total Deposit Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Deposit Amount
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 opacity-80" />
        </div>

        {/* Card 3: Total Pending Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-all">
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
              Pending unpaid payments
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 opacity-80" />
        </div>

        {/* Card 4: Total Remaining Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Remaining Amount
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Coins size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-900 font-mono">
              RM {financialSummary.totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Net balance (Target - Deposit)
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 opacity-80" />
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
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-[#0b4da2]">
                            {cust.profile_pic || cust.profile_image ? (
                              <img
                                src={getFileUrl(cust.profile_pic || cust.profile_image)}
                                alt={cust.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              cust.full_name ? cust.full_name.charAt(0).toUpperCase() : 'W'
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {cust.full_name}
                            </span>
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
