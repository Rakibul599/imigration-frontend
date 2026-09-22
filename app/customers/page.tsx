'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getStoredCompanies } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import { CustomerRecord, fetchCustomers, deleteCustomer } from '@/lib/customerStorage';

function CustomersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');

  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company>({
    id: 'gamuda',
    name: 'Gamuda Berhad',
    roc: 'ROC-197601003632',
    sector: 'Engineering & Construction',
    description: 'Premier infrastructure and engineering company in Malaysia.',
    logo: '/images/companies/gamuda.svg',
    tag: 'Verified JIM',
    totalWorkers: 14200,
  });

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  useEffect(() => {
    const comps = getStoredCompanies();
    setAllCompanies(comps);

    if (comps.length > 0) {
      const found = comps.find(
        (c) =>
          c.id.toLowerCase() === (companyParam || '').toLowerCase() ||
          c.name.toLowerCase().includes((companyParam || '').toLowerCase())
      );
      if (found) {
        setActiveCompany(found);
      } else {
        setActiveCompany(comps[0]);
      }
    }
  }, [companyParam]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers(companyParam || undefined);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [companyParam]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove customer record for "${name}"?`)) {
      return;
    }
    await deleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setFeedback({
      type: 'info',
      message: `Customer record for "${name}" was deleted successfully.`,
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Filtered list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nid_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.worker_phone && c.worker_phone.includes(searchQuery)) ||
      (c.guardian_phone && c.guardian_phone.includes(searchQuery)) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.username && c.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.bank_account_number && c.bank_account_number.includes(searchQuery));

    const matchesRole = roleFilter === 'ALL' || c.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const totalSales = customers.filter((c) => c.role.toLowerCase() === 'sales').length;
  const totalWorkers = customers.filter((c) => c.role.toLowerCase() === 'worker').length;
  const totalVerified = customers.filter((c) => c.status === 'active').length;

  return (
    <div className="w-full">
      {/* Active Employer Banner Bar */}
      <section className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white py-7 sm:py-9 shadow-md">
        <div className="w-full max-w-[1240px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-white rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-lg border border-white/20">
                <img
                  src={activeCompany.logo}
                  alt={activeCompany.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Customer Directory Module
                  </span>
                  <span className="text-blue-200 text-xs font-mono">
                    {activeCompany.roc}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
                  {activeCompany.name}
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5 font-medium">
                  Sector: {activeCompany.sector} • Customer & Worker Biometric Profiles
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/services?company=${encodeURIComponent(activeCompany.id)}`}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-white/25 transition-all no-underline"
              >
                <ArrowLeft size={14} />
                <span>Return to Services</span>
              </Link>
              <Link
                href="/companies"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-white/25 transition-all no-underline"
              >
                <Building2 size={14} />
                <span>Switch Company</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="bg-[#f8fafc] py-8 sm:py-10 min-h-[600px]">
        <div className="w-full max-w-[1240px] mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-5">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <ChevronRight size={13} />
            <Link href="/companies" className="hover:text-blue-600 transition-colors">
              Employers
            </Link>
            <ChevronRight size={13} />
            <Link
              href={`/services?company=${encodeURIComponent(activeCompany.id)}`}
              className="hover:text-blue-600 transition-colors"
            >
              {activeCompany.name}
            </Link>
            <ChevronRight size={13} />
            <span className="text-[#0b4da2] font-bold">Customer Management</span>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`mb-5 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider m-0">
                  Total Customers
                </p>
                <p className="text-xl font-extrabold text-slate-900 m-0">
                  {customers.length}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <UserCheck size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider m-0">
                  Sales Representatives
                </p>
                <p className="text-xl font-extrabold text-slate-900 m-0">
                  {totalSales}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider m-0">
                  Active Workers
                </p>
                <p className="text-xl font-extrabold text-slate-900 m-0">
                  {totalWorkers}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <FileCheck2 size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider m-0">
                  Verified Records
                </p>
                <p className="text-xl font-extrabold text-slate-900 m-0">
                  {totalVerified}
                </p>
              </div>
            </div>
          </div>

          {/* Action Row: Create Button (NO MODAL - Full Page Link) + Filters + Search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* PRIMARY CREATE CUSTOMER BUTTON - DIRECT FULL PAGE NAVIGATION, NO MODAL */}
              <Link
                href={`/customers/create?company=${encodeURIComponent(activeCompany.id)}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer no-underline tracking-wide uppercase"
              >
                <Plus size={16} />
                <span>Create Customer</span>
              </Link>

              <button
                onClick={loadCustomerData}
                disabled={loading}
                title="Refresh customer list"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border-0"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              {/* Role Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
                <Filter size={13} className="text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer border-0"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Sales">Sales</option>
                  <option value="Worker">Worker</option>
                  <option value="Customer">Customer</option>
                  <option value="Agent">Agent</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, NID, phone, bank..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 transition-all shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Customers Table Matching User Screenshot & Portal Standards */}
          <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#22a34a] text-white text-xs font-bold">
                    <th className="py-3 px-4 border-r border-green-600/60 w-[24%]">
                      User Details
                    </th>
                    <th className="py-3 px-4 border-r border-green-600/60 w-[18%]">
                      NID &amp; Passport
                    </th>
                    <th className="py-3 px-4 border-r border-green-600/60 w-[18%]">
                      Contact Info
                    </th>
                    <th className="py-3 px-4 border-r border-green-600/60 w-[18%]">
                      Bank &amp; Total Payment
                    </th>
                    <th className="py-3 px-3 border-r border-green-600/60 text-center w-[8%]">
                      Role
                    </th>
                    <th className="py-3 px-3 border-r border-green-600/60 text-center w-[6%]">
                      Files
                    </th>
                    <th className="py-3 px-4 text-center font-bold w-[6%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {loading && customers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-7 h-7 border-2 border-[#22a34a] border-t-transparent rounded-full animate-spin" />
                          <span>Loading customer directory from MySQL database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-medium bg-slate-50/50">
                        <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                          <Users size={32} className="text-slate-300" />
                          <p className="font-bold text-slate-700 m-0">No customers found</p>
                          <p className="text-xs text-slate-400 m-0">
                            {searchQuery ? `No records matched "${searchQuery}"` : 'No customer profiles have been created yet.'}
                          </p>
                          <Link
                            href={`/customers/create?company=${encodeURIComponent(activeCompany.id)}`}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-lg text-xs font-semibold transition-colors no-underline"
                          >
                            <Plus size={14} />
                            <span>Create First Customer</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const docCount = Array.isArray(cust.documents) ? cust.documents.length : 0;
                      return (
                        <tr
                          key={cust.id}
                          className="hover:bg-blue-50/40 transition-colors group"
                        >
                          {/* User Details */}
                          <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/customers/${cust.id}?company=${encodeURIComponent(activeCompany.id)}`}
                                className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-slate-600 font-bold text-xs shadow-xs hover:ring-2 hover:ring-blue-400 transition-all no-underline"
                                title="View Customer Dossier"
                              >
                                {cust.profile_pic ? (
                                  <img
                                    src={cust.profile_pic}
                                    alt={cust.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  cust.full_name.charAt(0).toUpperCase()
                                )}
                              </Link>
                              <div className="min-w-0">
                                <Link
                                  href={`/customers/${cust.id}?company=${encodeURIComponent(activeCompany.id)}`}
                                  className="font-bold text-slate-900 text-xs block leading-tight truncate hover:text-blue-700 transition-colors no-underline"
                                  title="View Customer Dossier"
                                >
                                  {cust.full_name}
                                </Link>
                                {cust.username && (
                                  <span className="text-[11px] text-slate-400 font-mono block">
                                    @{cust.username}
                                  </span>
                                )}
                                {cust.leaving_address && (
                                  <span className="text-[10px] text-slate-500 truncate block max-w-[200px]" title={cust.leaving_address}>
                                    {cust.leaving_address}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* NID & Passport */}
                          <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                            <div className="space-y-1">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  NID Number
                                </span>
                                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/70 inline-block">
                                  {cust.nid_no}
                                </span>
                              </div>
                              {cust.passport_no && (
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1">
                                    Passport:
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-700">
                                    {cust.passport_no}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                            <div className="space-y-0.5">
                              {cust.worker_phone && (
                                <div className="text-xs font-medium text-slate-800">
                                  <span className="text-[10px] text-slate-400 mr-1">W:</span>
                                  {cust.worker_phone}
                                </div>
                              )}
                              {cust.guardian_phone && (
                                <div className="text-[11px] text-slate-600">
                                  <span className="text-[10px] text-slate-400 mr-1">G:</span>
                                  {cust.guardian_phone}
                                </div>
                              )}
                              <div className="text-[11px] text-blue-600 font-mono truncate max-w-[180px]">
                                {cust.email}
                              </div>
                            </div>
                          </td>

                          {/* Bank Details & Total Payment */}
                          <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                            <div className="space-y-1">
                              {cust.bank_account_number ? (
                                <div>
                                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                    <Landmark size={12} className="text-emerald-600 shrink-0" />
                                    <span className="truncate">{cust.bank_account_name || 'Bank Account'}</span>
                                  </div>
                                  <div className="font-mono text-[11px] text-slate-600">
                                    {cust.bank_account_number}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                              {cust.total_payment && (
                                <div className="pt-0.5">
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                                    <span className="text-emerald-600 font-sans font-semibold">Total:</span>
                                    <span>{cust.total_payment.startsWith('RM') ? cust.total_payment : `RM ${cust.total_payment}`}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-3 border-r border-slate-200 align-middle text-center">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                                cust.role.toLowerCase() === 'sales'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : cust.role.toLowerCase() === 'worker'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {cust.role}
                            </span>
                          </td>

                          {/* Files / Documents Count */}
                          <td className="py-3.5 px-3 border-r border-slate-200 align-middle text-center">
                            {docCount > 0 ? (
                              <Link
                                href={`/customers/${cust.id}?company=${encodeURIComponent(activeCompany.id)}`}
                                className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full hover:bg-amber-100 transition-colors no-underline"
                                title="View uploaded documents in Customer Dossier"
                              >
                                <FileText size={11} />
                                <span>{docCount}</span>
                              </Link>
                            ) : (
                              <span className="text-slate-300 text-xs">0</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 align-middle text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* EYE ICON: NO MODAL -> OPENS DEDICATED FULL-PAGE DOSSIER */}
                              <Link
                                href={`/customers/${cust.id}?company=${encodeURIComponent(activeCompany.id)}`}
                                title="View Customer Dossier (Full Page - Standard)"
                                className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors no-underline cursor-pointer"
                              >
                                <Eye size={14} />
                              </Link>

                              <Link
                                href={`/customers/create?id=${cust.id}&company=${encodeURIComponent(activeCompany.id)}`}
                                title="Edit Customer (Full Page)"
                                className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer no-underline"
                              >
                                <Edit2 size={14} />
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleDelete(cust.id, cust.full_name)}
                                title="Delete Customer"
                                className="w-8 h-8 rounded border border-rose-200 bg-rose-50/60 hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors cursor-pointer"
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
      </section>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500">
          Loading Customer Management...
        </div>
      }
    >
      <CustomersContent />
    </Suspense>
  );
}
