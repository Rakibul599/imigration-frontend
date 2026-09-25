'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Coins,
  CreditCard,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  GraduationCap,
  Layers,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Company,
  CompanyDirector,
  DirectorDocument,
  resolveFileUrl,
  getCompanyActiveWorkers,
  getCompanyInactiveWorkers,
  getCompanyIncomeWallet,
  getCompanyCostWallet,
  getCompanyProfitWallet,
} from '@/lib/companies';
import {
  deleteStoredCompany,
  fetchCompaniesFromBackend,
  getStoredCompanies,
  resetStoredCompanies,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';

export default function RegisteredCompaniesListPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type?: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setCompanies(list);
    }).catch(() => {});

    const unsub = subscribeToCompanyChanges(() => {
      setCompanies(getStoredCompanies());
    });
    return unsub;
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    const updated = await deleteStoredCompany(id);
    setCompanies(updated);
    setDeleteConfirmId(null);
    setIsLoading(false);
    showToast('info', 'Company record deleted from local storage.');
  };

  const handleResetDefaults = async () => {
    if (confirm('Are you sure you want to restore default companies in the database?')) {
      setIsLoading(true);
      const restored = await resetStoredCompanies();
      setCompanies(restored);
      setIsLoading(false);
      showToast('info', 'Company registry restored to default initial dataset.');
    }
  };

  // Filtered List
  const filteredCompanies = companies.filter((c) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(term);
    const rocMatch = c.roc.toLowerCase().includes(term);
    const sectorMatch = c.sector.toLowerCase().includes(term);
    const emailMatch = c.email ? c.email.toLowerCase().includes(term) : false;
    const phoneMatch = c.phone ? c.phone.toLowerCase().includes(term) : false;
    const directorMatch = c.directors
      ? c.directors.some((d) => d.name.toLowerCase().includes(term) || d.nidNo.toLowerCase().includes(term))
      : false;

    const matchesSearch = nameMatch || rocMatch || sectorMatch || emailMatch || phoneMatch || directorMatch;
    const matchesSector = selectedSector === 'ALL' || c.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const totalWorkersCount = companies.reduce((acc, c) => acc + (c.totalWorkers || 0), 0);
  const totalDirectorsCount = companies.reduce((acc, c) => acc + (c.directors?.length || 0), 0);
  const distinctSectors = Array.from(new Set(companies.map((c) => c.sector)));

  const sectorOptions: Select2Option[] = useMemo(() => {
    return [
      { value: 'ALL', label: `All Sectors (${companies.length})`, badge: 'ALL' },
      ...distinctSectors.map((sec) => ({
        value: sec,
        label: sec,
        badge: `${companies.filter((c) => c.sector === sec).length}`,
      })),
    ];
  }, [companies, distinctSectors]);

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

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/superadmin" className="hover:text-[#0b4da2] transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link href="/superadmin/companies" className="hover:text-[#0b4da2] transition-colors">
          Companies Management
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">Registered Companies List</span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0b4da2] text-[11px] font-bold">
              <Building2 size={13} />
              <span>Official Employer Directory</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{companies.length} Registered</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0">
              Registered Companies Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed m-0">
              Comprehensive registry of verified corporate employers, banking records, workforce allocations, and board directors with uploaded NID, passports, and corporate documentation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/superadmin/companies"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </Link>

            <button
              type="button"
              onClick={handleResetDefaults}
              title="Reset companies to default dataset in MySQL/LocalStorage"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            {/* CREATE COMPANY BUTTON (Navigates to dedicated page) */}
            <Link
              href="/superadmin/companies/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-md hover:shadow-lg transition-all cursor-pointer no-underline"
            >
              <Plus size={16} />
              <span>Create Company</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Total Companies
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {companies.length}
            </p>
            <span className="text-[10px] text-slate-400">All registered entities</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Foreign Worker
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {totalWorkersCount.toLocaleString()}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Permits allocated</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Appointed Directors (CEOs)
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {totalDirectorsCount}
            </p>
            <span className="text-[10px] text-slate-400">With verified credentials</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Active Sectors
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {distinctSectors.length}
            </p>
            <span className="text-[10px] text-slate-400">Industries covered</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
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

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="w-52">
            <Select2Search
              options={sectorOptions}
              value={selectedSector}
              onChange={(val) => setSelectedSector(val)}
              placeholder="Filter Sector..."
              searchPlaceholder="Search sectors..."
              icon={<Filter size={14} className="text-slate-400" />}
            />
          </div>

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

      {/* TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="w-full max-w-full overflow-hidden bg-white border border-slate-300 rounded-xl shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
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
                              (e.target as HTMLElement).setAttribute('src', '/images/companies/gamuda.svg');
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
                          title="Edit Company Details & Directors"
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
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-600 m-0">No companies found</p>
                      <p className="text-xs text-slate-400 m-0 mt-1">
                        Try modifying your search or click &quot;Create Company&quot; to add a new employer organization.
                      </p>
                      <Link
                        href="/superadmin/companies/create"
                        className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-all no-underline"
                      >
                        <Plus size={14} />
                        <span>Create Company Now</span>
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                    <img
                      src={resolveFileUrl(company.logo) || '/images/companies/gamuda.svg'}
                      alt={company.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute('src', '/images/companies/gamuda.svg');
                      }}
                    />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {company.tag || 'Verified JIM'}
                  </span>
                </div>

                <Link
                  href={`/superadmin/companies/${encodeURIComponent(company.id)}`}
                  className="text-sm font-bold text-slate-900 m-0 hover:text-[#0b4da2] cursor-pointer no-underline block"
                >
                  {company.name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">{company.roc}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-600 truncate">{company.sector}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  {company.phone && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Phone size={13} className="text-slate-400" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Mail size={13} className="text-slate-400" />
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px]">
                    <CreditCard size={13} className="text-slate-400" />
                    <span>{company.bankName || 'Bank'}: {company.bankAccountNo || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <UserCheck size={13} className="text-purple-500" />
                    <span className="font-semibold text-purple-700">
                      {company.directors?.length || 0} Appointed Director(s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Foreign Workers</span>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {company.totalWorkers ? company.totalWorkers.toLocaleString() : '0'} workers
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/superadmin/companies/${encodeURIComponent(company.id)}`}
                    className="p-1.5 rounded-lg border border-slate-300 hover:bg-blue-50 text-slate-600 hover:text-[#0b4da2] cursor-pointer no-underline flex items-center justify-center"
                    title="View Full Profile"
                  >
                    <Eye size={15} />
                  </Link>
                  <Link
                    href={`/superadmin/companies/create?id=${encodeURIComponent(company.id)}`}
                    className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-blue-700 cursor-pointer no-underline"
                    title="Edit Company"
                  >
                    <Edit2 size={15} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(company.id)}
                    className="p-1.5 rounded-lg border border-slate-300 hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FILE PREVIEW & DOWNLOAD MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-300 relative flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#0b4da2]" />
                <h3 className="text-sm font-bold text-slate-900 m-0 truncate max-w-md">
                  {previewFile.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 flex-1 overflow-auto flex items-center justify-center min-h-[300px] bg-slate-100 rounded-xl my-3">
              {previewFile.url.startsWith('data:image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : previewFile.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[60vh] rounded-lg border-0"
                />
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <FileText size={48} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-xs text-slate-700 m-0">{previewFile.name}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Binary document file stored locally.</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Saved in browser LocalStorage</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors no-underline cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download Document</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 m-0">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Are you sure you want to permanently delete this company and all associated director records from LocalStorage?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer border-0 shadow-sm"
              >
                {isLoading ? 'Deleting...' : 'Delete Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
