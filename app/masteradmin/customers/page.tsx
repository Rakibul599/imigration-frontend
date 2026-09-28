'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import {
  CustomerDocument,
  CustomerRecord,
  WorkingSector,
  deleteCustomer,
  fetchCustomers,
  fetchWorkingSectors,
  getFileUrl,
} from '@/lib/customerStorage';
import { getMasterAdminUser } from '@/lib/auth';

export default function MasterAdminCustomersPage() {
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'pending' | 'inactive'>('ALL');

  // Inspection & Deletion Modals
  const [viewingCustomer, setViewingCustomer] = useState<CustomerRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const currentUser = getMasterAdminUser();
  const assignedList = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

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
      setAllCompanies(comps);
      setSectors(secList);

      // Filter customers strictly to those whose company_id matches assignedList
      const permitted = custList.filter((c) => {
        const cId = c.company_id;
        return Boolean(cId && assignedList.some((id) => id.toLowerCase() === cId.toLowerCase()));
      });
      setCustomers(permitted);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assignedList]);

  // Permitted companies
  const permittedCompanies = useMemo(() => {
    return allCompanies.filter((c) =>
      assignedList.some((id) => id.toLowerCase() === c.id.toLowerCase())
    );
  }, [allCompanies, assignedList]);

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      showToast('info', 'Customer record was successfully deleted.');
    } catch {
      showToast('error', 'Failed to delete customer record.');
    }
  };

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const term = searchQuery.toLowerCase().trim();
      const matchSearch =
        !term ||
        cust.full_name.toLowerCase().includes(term) ||
        cust.nid_no.toLowerCase().includes(term) ||
        (cust.passport_no && cust.passport_no.toLowerCase().includes(term)) ||
        (cust.email && cust.email.toLowerCase().includes(term)) ||
        (cust.phone && cust.phone.toLowerCase().includes(term)) ||
        (cust.working_sector && cust.working_sector.toLowerCase().includes(term)) ||
        (cust.working_address && cust.working_address.toLowerCase().includes(term));

      const matchCompany =
        selectedCompanyId === 'ALL' ||
        (cust.company_id && cust.company_id.toLowerCase() === selectedCompanyId.toLowerCase());

      const matchSector =
        selectedSector === 'ALL' ||
        (cust.working_sector && cust.working_sector === selectedSector);

      const matchStatus =
        statusFilter === 'ALL' || cust.status === statusFilter;

      return matchSearch && matchCompany && matchSector && matchStatus;
    });
  }, [customers, searchQuery, selectedCompanyId, selectedSector, statusFilter]);

  // Statistics
  const totalInScope = customers.length;
  const activeCount = customers.filter((c) => c.status === 'active').length;
  const passportCount = customers.filter((c) => Boolean(c.passport_no || c.passport_file)).length;
  const totalDocuments = customers.reduce((sum, c) => sum + (c.documents?.length || 0), 0);

  return (
    <div className="space-y-6">
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
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldAlert size={12} className="text-yellow-400" />
              <span>Assigned Scope: {permittedCompanies.length} Permitted Employers</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0">
              Customer &amp; Worker Directory
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Foreign worker registration, biometric passport documents, NID records, living addresses, and official working sector assignments for your authorized companies.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/masteradmin/customers/create"
              className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer border-0 no-underline"
            >
              <Plus size={16} />
              <span>Create Customer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Permitted Workers
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {totalInScope}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Under your {permittedCompanies.length} employers
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Active Status
            </span>
            <div className="text-2xl font-bold text-emerald-600 tracking-tight mt-1">
              {activeCount}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Approved worker permits
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Passport Verified
            </span>
            <div className="text-2xl font-bold text-purple-600 tracking-tight mt-1">
              {passportCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Registered passports
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileCheck2 size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Uploaded Files
            </span>
            <div className="text-2xl font-bold text-amber-600 tracking-tight mt-1">
              {totalDocuments}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Document dossiers attached
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by worker name, passport, NID, phone, sector..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Scope Restricted Company Filter */}
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Assigned Employers ({permittedCompanies.length})</option>
              {permittedCompanies.map((c) => (
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Workers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Worker Profile</th>
                <th className="py-3 px-4">Passport Details</th>
                <th className="py-3 px-4">NID / IC No.</th>
                <th className="py-3 px-4">Employer Company</th>
                <th className="py-3 px-4">Working Sector</th>
                <th className="py-3 px-4">Compensation</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Documents</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">
                      No Customer / Worker Records Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchQuery || selectedCompanyId !== 'ALL' || selectedSector !== 'ALL'
                        ? 'Try clearing your search and filter options.'
                        : 'Register your first customer under your permitted employers.'}
                    </p>
                    <Link
                      href="/masteradmin/customers/create"
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-xs no-underline"
                    >
                      <Plus size={14} />
                      <span>Create Customer</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const compMatch = permittedCompanies.find(
                    (c) => c.id.toLowerCase() === (cust.company_id || '').toLowerCase()
                  );
                  const docCount = Array.isArray(cust.documents) ? cust.documents.length : 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Origin */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {cust.profile_pic || cust.profile_image ? (
                            <img
                              src={getFileUrl(cust.profile_pic || cust.profile_image)}
                              alt={cust.full_name}
                              className="w-9 h-9 rounded-xl object-cover shadow-xs shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#072a6b] to-[#0c4da2] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                              {cust.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {cust.full_name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Globe2 size={10} />
                              <span>{cust.country || 'N/A'}</span>
                              {cust.date_of_birth && <span>• DOB: {cust.date_of_birth}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Passport Details & Upload */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800">
                            {cust.passport_no || 'NOT ISSUED'}
                          </span>
                          {cust.passport_file ? (
                            <div>
                              <a
                                href={getFileUrl(cust.passport_file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-sans"
                              >
                                <FileCheck2 size={11} />
                                <span>View Passport</span>
                              </a>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">No file uploaded</div>
                          )}
                          {cust.passport_expire_date && (
                            <div className="text-[10px] text-amber-700 font-sans">
                              Exp: {cust.passport_expire_date}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* NID Details & Upload */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900">
                            {cust.nid_no}
                          </span>
                          {cust.nid_file ? (
                            <div>
                              <a
                                href={getFileUrl(cust.nid_file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline font-sans"
                              >
                                <FileCheck2 size={11} />
                                <span>View NID</span>
                              </a>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">No file uploaded</div>
                          )}
                        </div>
                      </td>

                      {/* Employer Company */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-[#0b4da2] border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          <Building2 size={10} />
                          <span className="truncate max-w-[120px]">
                            {compMatch ? compMatch.name : (cust.company_id || 'Unassigned')}
                          </span>
                        </span>
                      </td>

                      {/* Working Sector */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                          {cust.working_sector || 'General Sector'}
                        </span>
                        {cust.working_address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">
                            {cust.working_address}
                          </div>
                        )}
                      </td>

                      {/* Compensation */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="text-slate-800 font-semibold">
                          {cust.basic_salary || '—'}
                        </div>
                        {cust.overtime && (
                          <div className="text-[10px] text-slate-500 font-sans">
                            OT: {cust.overtime}
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="text-slate-800 font-mono text-[11px]">
                          {cust.phone || cust.worker_phone || '—'}
                        </div>
                        {cust.email && (
                          <div className="text-[10px] text-blue-600 truncate max-w-[130px]">
                            {cust.email}
                          </div>
                        )}
                      </td>

                      {/* Documents */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            docCount > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <FileText size={10} />
                          <span>{docCount} files</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cust.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cust.status === 'active'
                                ? 'bg-emerald-500'
                                : cust.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="capitalize">{cust.status || 'Active'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setViewingCustomer(cust)}
                            className="p-1.5 text-slate-500 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="View Full Profile Details"
                          >
                            <Eye size={14} />
                          </button>

                          <Link
                            href={`/masteradmin/customers/create?id=${cust.id}`}
                            className="p-1.5 text-slate-600 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent inline-flex items-center justify-center"
                            title="Edit Customer"
                          >
                            <Edit2 size={14} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="Delete Customer"
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

      {/* View Dossier Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
            <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {viewingCustomer.profile_pic || viewingCustomer.profile_image ? (
                  <img
                    src={getFileUrl(viewingCustomer.profile_pic || viewingCustomer.profile_image)}
                    alt={viewingCustomer.full_name}
                    className="w-11 h-11 rounded-xl object-cover border-2 border-white/40 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                    <UserCheck size={20} className="text-yellow-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold m-0 leading-tight">
                    {viewingCustomer.full_name}
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0">
                    NID: {viewingCustomer.nid_no} • Passport: {viewingCustomer.passport_no || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
              {/* Employer & Origin */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Origin Country</span>
                  <span className="font-bold text-slate-800">{viewingCustomer.country || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Date of Birth</span>
                  <span className="font-bold text-slate-800">{viewingCustomer.date_of_birth || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Passport Issue</span>
                  <span className="font-mono text-slate-800">{viewingCustomer.passport_issue_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Passport Expire</span>
                  <span className="font-mono text-slate-800">{viewingCustomer.passport_expire_date || 'N/A'}</span>
                </div>
              </div>

              {/* Passport & NID Files */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Passport Document
                  </span>
                  <div className="font-mono text-xs font-semibold text-slate-800">
                    No: {viewingCustomer.passport_no || 'Not Issued'}
                  </div>
                  {viewingCustomer.passport_file ? (
                    <a
                      href={getFileUrl(viewingCustomer.passport_file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-bold"
                    >
                      <Download size={13} />
                      <span>Download / View Passport Document</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs italic">No document file attached</span>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    National ID (NID)
                  </span>
                  <div className="font-mono text-xs font-semibold text-slate-800">
                    No: {viewingCustomer.nid_no}
                  </div>
                  {viewingCustomer.nid_file ? (
                    <a
                      href={getFileUrl(viewingCustomer.nid_file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-bold"
                    >
                      <Download size={13} />
                      <span>Download / View NID Document</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs italic">No document file attached</span>
                  )}
                </div>
              </div>

              {/* Contact & Address */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Phone Number</span>
                    <span className="font-mono font-semibold text-slate-800">{viewingCustomer.phone || viewingCustomer.worker_phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Email Address</span>
                    <span className="font-mono text-slate-800">{viewingCustomer.email || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Leaving / Living Address</span>
                  <span className="text-slate-700">{viewingCustomer.leaving_address || 'N/A'}</span>
                </div>
              </div>

              {/* Working Sector & Compensation */}
              <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-blue-900 block font-bold">Working Sector</span>
                    <span className="font-semibold text-slate-800">{viewingCustomer.working_sector || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-900 block font-bold">Basic Salary</span>
                    <span className="font-mono font-bold text-slate-800">{viewingCustomer.basic_salary || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-900 block font-bold">Our Time (Overtime)</span>
                    <span className="font-mono font-bold text-slate-800">{viewingCustomer.overtime || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-blue-900 block font-bold">Working Address / Worksite</span>
                  <span className="text-slate-700">{viewingCustomer.working_address || 'N/A'}</span>
                </div>
              </div>

              {/* Multiple Uploaded Documents */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Uploaded Document Attachments ({viewingCustomer.documents?.length || 0})
                </span>
                {!viewingCustomer.documents || viewingCustomer.documents.length === 0 ? (
                  <div className="text-slate-400 text-xs italic p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    No additional document attachments uploaded.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewingCustomer.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={15} className="text-[#0b4da2] shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-slate-800 truncate">{doc.name}</div>
                            <div className="text-[10px] text-slate-400">{doc.size || 'Attachment'}</div>
                          </div>
                        </div>
                        {doc.url && (
                          <a
                            href={getFileUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-[#0b4da2] hover:bg-blue-50 rounded transition-colors"
                            title="Open / Download"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer border-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Delete Customer Record?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this customer record? All associated files and data will be removed.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer border-0 shadow-sm"
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
