'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Edit2,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  Layers,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import {
  CustomerRecord,
  WorkingSector,
  deleteCustomer,
  fetchCustomers,
  fetchWorkingSectors,
  getFileUrl,
} from '@/lib/customerStorage';
import { Company } from '@/lib/companies';

export type CustomerStatusType = 'active' | 'inactive' | 'runaway' | 'blacklist';

interface CustomerStatusListingProps {
  status: CustomerStatusType;
  portalType?: 'superadmin' | 'masteradmin' | 'employee';
  baseRoute?: string;
}

const STATUS_METADATA: Record<
  CustomerStatusType,
  {
    title: string;
    badge: string;
    subtitle: string;
    headerGradient: string;
    badgeBg: string;
    badgeColor: string;
    icon: any;
    accentColor: string;
  }
> = {
  active: {
    title: 'Active Customers Registry',
    badge: 'Authorized & Active Worker Permits',
    subtitle: 'Authorized foreign workers with active permits, valid visas, and verified employer sponsorship.',
    headerGradient: 'from-[#064e3b] via-[#047857] to-[#059669]',
    badgeBg: 'bg-emerald-400/20',
    badgeColor: 'text-emerald-300 border-emerald-400/30',
    icon: UserCheck,
    accentColor: 'text-emerald-600',
  },
  inactive: {
    title: 'Inactive Customers Registry',
    badge: 'Suspended & Inactive Records',
    subtitle: 'Suspended, expired, or non-active worker permits and pending foreign dossiers.',
    headerGradient: 'from-[#881337] via-[#9f1239] to-[#be123c]',
    badgeBg: 'bg-rose-400/20',
    badgeColor: 'text-rose-300 border-rose-400/30',
    icon: UserX,
    accentColor: 'text-rose-600',
  },
  runaway: {
    title: 'Runaway Customers & Workers',
    badge: 'Runaway & Absentee Alert Registry',
    subtitle: 'Reported runaway foreign workers, unauthorized absentees, and JIM immigration notification tracking.',
    headerGradient: 'from-[#7c2d12] via-[#9a3412] to-[#c2410c]',
    badgeBg: 'bg-orange-400/20',
    badgeColor: 'text-orange-300 border-orange-400/30',
    icon: UserMinus,
    accentColor: 'text-orange-600',
  },
  blacklist: {
    title: 'Black List Customers Registry',
    badge: 'Blacklisted & Barred Registry',
    subtitle: 'Barred candidates, foreign workers with immigration violations, security flags, or blacklist sanctions.',
    headerGradient: 'from-[#0f172a] via-[#1e293b] to-[#334155]',
    badgeBg: 'bg-rose-500/20',
    badgeColor: 'text-rose-300 border-rose-400/30',
    icon: ShieldAlert,
    accentColor: 'text-slate-900',
  },
};

export default function CustomerStatusListing({
  status,
  portalType = 'superadmin',
  baseRoute = '/customers',
}: CustomerStatusListingProps) {
  const meta = STATUS_METADATA[status] || STATUS_METADATA.active;
  const StatusIcon = meta.icon;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');

  // Modal & Toast
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [comps, secList, custList] = await Promise.all([
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
        fetchWorkingSectors(),
        fetchCustomers(),
      ]);
      setCompanies(comps);
      setSectors(secList);
      setAllCustomers(custList);
    } catch (err) {
      console.error(`Failed to load ${status} customers:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id);
      setAllCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      showToast('info', 'Customer record deleted successfully.');
    } catch {
      showToast('error', 'Failed to delete customer record.');
    }
  };

  // Filter for this specific status
  const statusCustomers = useMemo(() => {
    return allCustomers.filter((c) => c.status === status);
  }, [allCustomers, status]);

  // Search and secondary filters
  const filteredCustomers = useMemo(() => {
    return statusCustomers.filter((cust) => {
      const term = searchQuery.toLowerCase().trim();
      const matchSearch =
        !term ||
        cust.full_name.toLowerCase().includes(term) ||
        cust.nid_no.toLowerCase().includes(term) ||
        (cust.passport_no && cust.passport_no.toLowerCase().includes(term)) ||
        (cust.phone && cust.phone.toLowerCase().includes(term)) ||
        (cust.email && cust.email.toLowerCase().includes(term)) ||
        (cust.working_sector && cust.working_sector.toLowerCase().includes(term)) ||
        (cust.working_address && cust.working_address.toLowerCase().includes(term));

      const matchCompany =
        selectedCompanyId === 'ALL' ||
        (cust.company_id && cust.company_id.toLowerCase() === selectedCompanyId.toLowerCase());

      const matchSector =
        selectedSector === 'ALL' ||
        (cust.working_sector && cust.working_sector === selectedSector);

      return matchSearch && matchCompany && matchSector;
    });
  }, [statusCustomers, searchQuery, selectedCompanyId, selectedSector]);

  // Statistics
  const totalInStatus = statusCustomers.length;
  const involvedCompanies = new Set(statusCustomers.map((c) => c.company_id).filter(Boolean)).size;
  const involvedSectors = new Set(statusCustomers.map((c) => c.working_sector).filter(Boolean)).size;
  const passportCount = statusCustomers.filter((c) => Boolean(c.passport_no || c.passport_file)).length;

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : notification.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`bg-gradient-to-r ${meta.headerGradient} text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div
              className={`inline-flex items-center gap-1.5 ${meta.badgeBg} ${meta.badgeColor} border text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2`}
            >
              <StatusIcon size={12} />
              <span>{meta.badge}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              {meta.title}
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed m-0">
              {meta.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3 py-2 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap"
              title="Refresh database"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href={`${baseRoute}/dashboard`}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all no-underline whitespace-nowrap border border-white/30"
            >
              <LayoutDashboard size={14} />
              <span>Customer Dashboard</span>
            </Link>

            <Link
              href={`${baseRoute}/create`}
              className="inline-flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all no-underline whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Register Customer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Total in this Status
            </span>
            <div className={`w-8 h-8 rounded-lg bg-slate-100 ${meta.accentColor} flex items-center justify-center shrink-0`}>
              <StatusIcon size={16} />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black ${meta.accentColor} tracking-tight`}>
              {totalInStatus}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 capitalize">
              {status} foreign workers
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Employer Companies
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{involvedCompanies}</div>
            <div className="text-[11px] text-slate-400 mt-1">Companies associated</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Working Sectors
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{involvedSectors}</div>
            <div className="text-[11px] text-slate-400 mt-1">Economic industries</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Passports On Record
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-teal-600 tracking-tight">{passportCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Biometrics attached</div>
          </div>
        </div>
      </div>

      {/* Quick Status Navigation Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          <Link
            href={`${baseRoute}/dashboard`}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 no-underline transition-all"
          >
            All Customers ({allCustomers.length})
          </Link>

          <Link
            href={`${baseRoute}/active`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all no-underline border ${
              status === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-white' : 'bg-emerald-500'}`} />
            <span>Active Customers ({allCustomers.filter((c) => c.status === 'active').length})</span>
          </Link>

          <Link
            href={`${baseRoute}/inactive`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all no-underline border ${
              status === 'inactive'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === 'inactive' ? 'bg-white' : 'bg-rose-500'}`} />
            <span>Inactive Customers ({allCustomers.filter((c) => c.status === 'inactive').length})</span>
          </Link>

          <Link
            href={`${baseRoute}/runaway`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all no-underline border ${
              status === 'runaway'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === 'runaway' ? 'bg-white' : 'bg-orange-500'}`} />
            <span>Runaway Customers ({allCustomers.filter((c) => c.status === 'runaway').length})</span>
          </Link>

          <Link
            href={`${baseRoute}/blacklist`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all no-underline border ${
              status === 'blacklist'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === 'blacklist' ? 'bg-rose-400' : 'bg-slate-900'}`} />
            <span>Black List Customers ({allCustomers.filter((c) => c.status === 'blacklist').length})</span>
          </Link>

          <Link
            href={`${baseRoute}/future`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 no-underline transition-all"
          >
            <Sparkles size={12} className="text-purple-600" />
            <span>Future Candidates</span>
          </Link>
        </div>
      </div>

      {/* Main Customers Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${status} workers by name, passport, NID, phone...`}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Company Filter */}
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Employer Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sector Filter */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Working Sectors</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Worker Name</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Passport</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">NID No</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Employer Company</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">Sector</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[110px]">Salary</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Contact</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[100px]">Dossiers</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <StatusIcon size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      No {status} customer records found
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchQuery
                        ? 'Try clearing the search query or changing filters'
                        : `No workers currently marked with "${status}" status`}
                    </p>
                    <Link
                      href={`${baseRoute}/create`}
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-xs no-underline"
                    >
                      <Plus size={14} />
                      <span>Register Customer</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const compMatch = companies.find(
                    (c) => c.id.toLowerCase() === (cust.company_id || '').toLowerCase()
                  );
                  const docCount = Array.isArray(cust.documents) ? cust.documents.length : 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Worker Name */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {cust.profile_pic || cust.profile_image ? (
                            <img
                              src={getFileUrl(cust.profile_pic || cust.profile_image)}
                              alt={cust.full_name}
                              className="w-9 h-9 rounded-full object-cover shadow-xs shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {cust.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase() || 'CW'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {cust.full_name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {cust.country || 'Malaysia / Expat'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Passport */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="font-semibold text-slate-800">
                          {cust.passport_no || '—'}
                        </span>
                      </td>

                      {/* NID No */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="font-semibold text-slate-800">
                          {cust.nid_no || '—'}
                        </span>
                      </td>

                      {/* Employer Company */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {compMatch ? compMatch.name : cust.company_id || cust.other_company_name || '—'}
                        </span>
                      </td>

                      {/* Working Sector */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-medium text-slate-800">
                          {cust.working_sector || 'General'}
                        </span>
                      </td>

                      {/* Basic Salary */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="text-slate-800 font-semibold">
                          {cust.basic_salary || '—'}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="text-slate-800">
                          {cust.phone || cust.worker_phone || '—'}
                        </span>
                      </td>

                      {/* Documents */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            docCount > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <FileText size={11} />
                          <span>{docCount} files</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cust.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : cust.status === 'absent'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : cust.status === 'runaway'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : cust.status === 'blacklist'
                              ? 'bg-rose-950 text-rose-100 border border-rose-900'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cust.status === 'active'
                                ? 'bg-emerald-500'
                                : cust.status === 'pending'
                                ? 'bg-amber-500'
                                : cust.status === 'absent'
                                ? 'bg-purple-500'
                                : cust.status === 'runaway'
                                ? 'bg-orange-500'
                                : cust.status === 'blacklist'
                                ? 'bg-rose-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="capitalize">
                            {cust.status === 'blacklist' ? 'Black List' : cust.status || 'Active'}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`${baseRoute}/view?id=${cust.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors"
                            title="View customer dossier"
                          >
                            <Eye size={15} />
                          </Link>

                          <Link
                            href={`${baseRoute}/create?id=${cust.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Edit customer details"
                          >
                            <Edit2 size={15} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                            title="Delete customer record"
                          >
                            <Trash2 size={15} />
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Customer Record</h3>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to delete this customer record? All target records and uploaded documents will be permanently removed.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors border-0 cursor-pointer shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

