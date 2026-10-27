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
  SlidersHorizontal,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import {
  CustomerDocument,
  CustomerRecord,
  WorkingSector,
  deleteCustomer,
  fetchCustomers,
  fetchWorkingSectors,
  getFileUrl,
} from '@/lib/customerStorage';
import CardPriorityModal from '@/components/CardPriorityModal';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import { Company } from '@/lib/companies';
import {
  PageStatCardConfig,
  getStoredPageCards,
  saveStoredPageCards,
  resetStoredPageCards,
} from '@/lib/pageCardStorage';

const DEFAULT_CUSTOMER_CARDS: PageStatCardConfig[] = [
  { id: 'total_customers', title: 'Total Customers', subtitle: 'Across all registered employers', icon: 'Users', order_num: 1, metric_type: 'total_customers' },
  { id: 'active_permits', title: 'Active Permits', subtitle: 'Authorized worker status', icon: 'UserCheck', order_num: 2, metric_type: 'active_permits' },
  { id: 'inactive_customers', title: 'Inactive Customers', subtitle: 'Suspended worker accounts', icon: 'UserX', order_num: 3, metric_type: 'inactive_customers' },
  { id: 'absent_customers', title: 'Absent Customers', subtitle: 'Absent worker permits', icon: 'UserMinus', order_num: 4, metric_type: 'absent_customers' },
  { id: 'passport_verified', title: 'Passport Verified', subtitle: 'Valid biometric passports', icon: 'CheckCircle2', order_num: 5, metric_type: 'passport_verified' },
  { id: 'document_dossiers', title: 'Document Dossiers', subtitle: 'Total uploaded dossiers', icon: 'FolderOpen', order_num: 6, metric_type: 'document_dossiers' },
];

const CUSTOMER_METRIC_OPTIONS = [
  { id: 'total_customers', label: 'Total Customers (Live Count)' },
  { id: 'active_permits', label: 'Active Permits (Live Count)' },
  { id: 'inactive_customers', label: 'Inactive Customers (Live Count)' },
  { id: 'absent_customers', label: 'Absent Customers (Live Count)' },
  { id: 'passport_verified', label: 'Passport Verified (Live Count)' },
  { id: 'document_dossiers', label: 'Document Dossiers (Live Count)' },
  { id: 'custom', label: 'Custom Value / Fixed Number' },
];

export default function SuperAdminCustomersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Manage Cards Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [initialShowAdd, setInitialShowAdd] = useState(false);
  const [cards, setCards] = useState<PageStatCardConfig[]>(DEFAULT_CUSTOMER_CARDS);

  useEffect(() => {
    setCards(getStoredPageCards('customers', DEFAULT_CUSTOMER_CARDS));
    const handleUpdate = (e: any) => {
      setCards(e.detail || getStoredPageCards('customers', DEFAULT_CUSTOMER_CARDS));
    };
    window.addEventListener('superadmin_cards_update_customers', handleUpdate);
    return () => window.removeEventListener('superadmin_cards_update_customers', handleUpdate);
  }, []);

  const handleSaveCards = (updated: PageStatCardConfig[]) => {
    const saved = saveStoredPageCards('customers', updated);
    setCards(saved);
    showToast('success', 'Cards priority and names updated successfully.');
  };

  const handleResetCards = () => {
    const reset = resetStoredPageCards('customers', DEFAULT_CUSTOMER_CARDS);
    setCards(reset);
    showToast('info', 'Cards reset to default layout.');
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'pending' | 'inactive'>('ALL');

  // Inspection & Deletion Modals
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
      setCustomers(custList);
    } catch (err) {
      console.error('Failed to load customers:', err);
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
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      showToast('info', 'Customer record was successfully deleted.');
    } catch {
      showToast('error', 'Failed to delete customer record.');
    }
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const term = searchQuery.toLowerCase().trim();
      const matchSearch =
        !term ||
        cust.full_name.toLowerCase().includes(term) ||
        cust.nid_no.toLowerCase().includes(term) ||
        (cust.passport_no && cust.passport_no.toLowerCase().includes(term)) ||
        (cust.phone && cust.phone.toLowerCase().includes(term)) ||
        (cust.email && cust.email.toLowerCase().includes(term)) ||
        (cust.country && cust.country.toLowerCase().includes(term)) ||
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
  const totalCustomers = customers.length;
  const activeCount = customers.filter((c) => c.status === 'active').length;
  const inactiveCount = customers.filter((c) => c.status === 'inactive').length;
  const absentCount = customers.filter((c) => c.status === 'absent').length;
  const passportCount = customers.filter((c) => Boolean(c.passport_no || c.passport_file)).length;
  const totalDocuments = customers.reduce((sum, c) => sum + (c.documents?.length || 0), 0);

  const getCardValue = (card: PageStatCardConfig) => {
    const metric = card.metric_type || card.id;
    switch (metric) {
      case 'total_customers':
        return totalCustomers;
      case 'active_permits':
        return activeCount;
      case 'inactive_customers':
        return inactiveCount;
      case 'absent_customers':
        return absentCount;
      case 'passport_verified':
        return passportCount;
      case 'document_dossiers':
        return totalDocuments;
      default:
        return card.custom_value !== undefined && card.custom_value !== null && card.custom_value !== ''
          ? card.custom_value
          : 0;
    }
  };

  const getCardTheme = (card: PageStatCardConfig, idx: number) => {
    const metric = card.metric_type || card.id;
    if (metric === 'total_customers') {
      return { themeColor: 'text-slate-900', iconBg: 'bg-blue-50 text-[#0b4da2]' };
    }
    if (metric === 'active_permits') {
      return { themeColor: 'text-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600' };
    }
    if (metric === 'inactive_customers') {
      return { themeColor: 'text-rose-600', iconBg: 'bg-rose-50 text-rose-600' };
    }
    if (metric === 'absent_customers') {
      return { themeColor: 'text-purple-600', iconBg: 'bg-purple-50 text-purple-600' };
    }
    if (metric === 'passport_verified') {
      return { themeColor: 'text-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600' };
    }
    if (metric === 'document_dossiers') {
      return { themeColor: 'text-amber-600', iconBg: 'bg-amber-50 text-amber-600' };
    }
    const customPalettes = [
      { themeColor: 'text-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600' },
      { themeColor: 'text-teal-600', iconBg: 'bg-teal-50 text-teal-600' },
      { themeColor: 'text-cyan-600', iconBg: 'bg-cyan-50 text-cyan-600' },
      { themeColor: 'text-violet-600', iconBg: 'bg-violet-50 text-violet-600' },
      { themeColor: 'text-orange-600', iconBg: 'bg-orange-50 text-orange-600' },
    ];
    return customPalettes[idx % customPalettes.length];
  };

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
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldCheck size={12} className="text-yellow-400" />
              <span>Super Administrator Master Registry</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              Customer &amp; Worker Management
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Complete foreign worker biometrics, passport documentation, NID records, living addresses, working sectors, and multi-file document dossiers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={() => {
                setInitialShowAdd(true);
                setIsCardModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Add Card</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInitialShowAdd(false);
                setIsCardModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal size={14} />
              <span>Manage Cards &amp; Priority</span>
            </button>

            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap"
              title="Refresh customer database"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/superadmin/customers/create"
              className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer border-0 no-underline whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Create Customer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards (Dynamic from Card Priority Config) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards
          .slice()
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
          .map((card, idx) => {
            const value = getCardValue(card);
            const { themeColor, iconBg } = getCardTheme(card, idx);

            return (
              <div
                key={card.id}
                className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-indigo-600 transition-colors leading-tight truncate">
                    {card.title}
                  </span>
                  <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    <DynamicCardIcon icon={card.icon} size={16} />
                  </div>
                </div>
                <div className={`text-2xl font-bold tracking-tight font-mono my-0.5 ${themeColor}`}>
                  {value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{card.subtitle}</div>
              </div>
            );
          })}
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
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Worker Name</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Passport</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">NID No</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Company</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">Sector</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[110px]">Basic Salary</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[110px]">Overtime</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Contact</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">Documents</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">
                      No Customer Records Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchQuery || selectedCompanyId !== 'ALL' || selectedSector !== 'ALL'
                        ? 'Try clearing your search and filter options.'
                        : 'Get started by creating your first customer profile.'}
                    </p>
                    <Link
                      href="/superadmin/customers/create"
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-xs no-underline"
                    >
                      <Plus size={14} />
                      <span>Create Customer</span>
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
                          <div className="font-bold text-slate-900 text-xs">
                            {cust.full_name}
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
                          {compMatch ? compMatch.name : (cust.company_id || cust.other_company_name || '—')}
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

                      {/* Overtime */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="text-slate-700 font-medium">
                          {cust.overtime || '—'}
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
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="capitalize">{cust.status || 'Active'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Link
                            href={`/superadmin/customers/view?id=${cust.id}`}
                            className="p-1.5 text-slate-500 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent inline-flex items-center justify-center"
                            title="View Full Profile Details"
                          >
                            <Eye size={14} />
                          </Link>

                          <Link
                            href={`/superadmin/customers/create?id=${cust.id}`}
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
              Are you sure you want to permanently delete this customer and all associated passport, NID, and document files?
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

      {/* Card Priority & Customization Modal */}
      <CardPriorityModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cards={cards}
        onSave={handleSaveCards}
        onReset={handleResetCards}
        pageTitle="Customer & Worker Management"
        availableMetrics={CUSTOMER_METRIC_OPTIONS}
        initialShowAdd={initialShowAdd}
      />
    </div>
  );
}
