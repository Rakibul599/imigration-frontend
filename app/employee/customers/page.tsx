'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
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
  createCustomer,
  updateCustomer,
} from '@/lib/customerStorage';
import { getCurrentUser, AuthUser } from '@/lib/auth';

export default function EmployeeCustomersPage() {
  const [allCompanies, setAllCompanies] = useState<Company[]>(() => {
    if (typeof window === 'undefined') return [];
    return getStoredCompanies();
  });
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'pending' | 'inactive'>('ALL');

  // Modals
  const [viewingCustomer, setViewingCustomer] = useState<CustomerRecord | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Form states for Create / Edit
  const [formName, setFormName] = useState('');
  const [formPassport, setFormPassport] = useState('');
  const [formNid, setFormNid] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formCountry, setFormCountry] = useState('Bangladesh');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formSector, setFormSector] = useState('');
  const [formSalary, setFormSalary] = useState('1500');
  const [formStatus, setFormStatus] = useState<'active' | 'pending' | 'inactive'>('active');

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    loadData();
  }, []);

  const assignedList = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  const perms = useMemo(() => {
    return (
      currentUser?.module_permissions || {
        customers: { view: true, create: false, edit: false, delete: false },
      }
    );
  }, [currentUser]);

  const canCreate = Boolean(perms?.customers?.create);
  const canEdit = Boolean(perms?.customers?.edit);
  const canDelete = Boolean(perms?.customers?.delete);

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
      setCustomers(custList);
    } catch (err) {
      console.error('Failed to load employee customers data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Permitted Companies list
  const permittedCompanies = useMemo(() => {
    if (assignedList.length === 0) return [];
    if (assignedList.includes('*')) return allCompanies;
    return allCompanies.filter((c) =>
      assignedList.some((id) => id.toLowerCase() === c.id.toLowerCase())
    );
  }, [allCompanies, assignedList]);

  // Customers in permitted scope
  const inScopeCustomers = useMemo(() => {
    if (assignedList.length === 0) return [];
    if (assignedList.includes('*')) return customers;
    return customers.filter((cust) => {
      const cId = (cust.company_id || '').trim().toLowerCase();
      if (!cId) return false;
      return assignedList.some((id) => id.trim().toLowerCase() === cId);
    });
  }, [customers, assignedList]);

  // Filtered customers with search and filters
  const filteredCustomers = useMemo(() => {
    return inScopeCustomers.filter((cust) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        cust.full_name?.toLowerCase().includes(q) ||
        cust.passport_no?.toLowerCase().includes(q) ||
        cust.nid_no?.toLowerCase().includes(q) ||
        cust.email?.toLowerCase().includes(q) ||
        String(cust.id).includes(q);

      const matchCompany =
        selectedCompanyId === 'ALL' ||
        (cust.company_id && cust.company_id.toLowerCase() === selectedCompanyId.toLowerCase());

      const matchSector =
        selectedSector === 'ALL' ||
        (cust.working_sector && cust.working_sector.toLowerCase() === selectedSector.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || cust.status === statusFilter;

      return matchQuery && matchCompany && matchSector && matchStatus;
    });
  }, [inScopeCustomers, searchQuery, selectedCompanyId, selectedSector, statusFilter]);

  const openCreateModal = () => {
    if (!canCreate) {
      alert('You do not have permission to add new customers.');
      return;
    }
    setEditingCustomer(null);
    setFormName('');
    setFormPassport('');
    setFormNid('');
    setFormEmail('');
    setFormPhone('');
    setFormDob('1995-05-15');
    setFormCountry('Bangladesh');
    setFormCompanyId(permittedCompanies[0]?.id || '');
    setFormSector(sectors[0]?.name || 'Construction');
    setFormSalary('1500');
    setFormStatus('active');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (cust: CustomerRecord) => {
    if (!canEdit) {
      alert('You do not have permission to edit customer records.');
      return;
    }
    setEditingCustomer(cust);
    setFormName(cust.full_name || '');
    setFormPassport(cust.passport_no || '');
    setFormNid(cust.nid_no || '');
    setFormEmail(cust.email || '');
    setFormPhone(cust.phone || cust.worker_phone || '');
    setFormDob(cust.date_of_birth || '');
    setFormCountry(cust.country || 'Bangladesh');
    setFormCompanyId(cust.company_id || permittedCompanies[0]?.id || '');
    setFormSector(cust.working_sector || sectors[0]?.name || '');
    setFormSalary(cust.basic_salary || '1500');
    setFormStatus(cust.status || 'active');
    setIsCreateModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCompanyId) {
      alert('Please fill in required fields (Name and Authorized Company).');
      return;
    }

    setLoading(true);
    const payload: Partial<CustomerRecord> = {
      full_name: formName.trim(),
      passport_no: formPassport.trim(),
      nid_no: formNid.trim() || `NID-${Date.now().toString().slice(-6)}`,
      email: formEmail.trim() || `${formName.toLowerCase().replace(/\s+/g, '')}@worker.agency`,
      phone: formPhone.trim(),
      date_of_birth: formDob,
      country: formCountry,
      company_id: formCompanyId,
      working_sector: formSector,
      basic_salary: formSalary,
      status: formStatus,
      role: 'Foreign Worker',
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        showToast('success', `Worker "${payload.full_name}" updated successfully.`);
      } else {
        await createCustomer(payload);
        showToast('success', `Worker "${payload.full_name}" registered successfully.`);
      }
      setIsCreateModalOpen(false);
      setEditingCustomer(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save customer.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!canDelete) {
      alert('You do not have permission to delete customer records.');
      return;
    }
    setLoading(true);
    try {
      await deleteCustomer(id);
      setDeleteConfirmId(null);
      showToast('info', 'Worker record removed from database.');
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete customer.');
    } finally {
      setLoading(false);
    }
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
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Staff Desk
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">
                Clearance: {canCreate ? 'Create + Edit' : canEdit ? 'Edit Only' : 'View Only'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
              Worker &amp; Customer Management
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl m-0">
              Manage worker profiles, passport credentials, clearances, and uploaded service documentation for your {permittedCompanies.length} authorized employer companies.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canCreate && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#22a34a] hover:bg-[#1b843c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0"
              >
                <Plus size={16} />
                <span>Add New Worker</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by worker name, passport, NID..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Company Filter (Restricted to Permitted) */}
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none font-medium cursor-pointer max-w-[200px]"
          >
            <option value="ALL">All Authorized Companies ({permittedCompanies.length})</option>
            {permittedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Workers Table with Signature Green Header */}
      <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#22a34a] text-white text-xs font-bold">
              <th className="py-3 px-4 border-r border-green-600/60 w-[26%]">
                Worker Profile
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[24%]">
                Assigned Employer
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[18%]">
                Sector &amp; Nationality
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[16%] text-center">
                Attached Documents
              </th>
              <th className="py-3 px-4 text-right w-[16%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredCustomers.map((cust) => {
              const matchedComp = allCompanies.find(
                (c) => c.id.toLowerCase() === (cust.company_id || '').toLowerCase()
              );
              const docCount = Array.isArray(cust.documents) ? cust.documents.length : 0;

              return (
                <tr key={cust.id} className="hover:bg-blue-50/40 transition-colors">
                  {/* Name & Credentials */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0b4da2] font-bold flex items-center justify-center text-xs shrink-0">
                        {cust.full_name?.charAt(0).toUpperCase() || 'W'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block text-[13px]">
                          {cust.full_name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-[#0b4da2] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {cust.passport_no || 'NO PASSPORT'}
                          </span>
                          <span className="text-[10px] text-slate-400">ID #{cust.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Employer */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    {matchedComp ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-50 p-0.5 border border-slate-200 shrink-0">
                          <img src={matchedComp.logo} alt="" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            {matchedComp.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{matchedComp.roc}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned Company</span>
                    )}
                  </td>

                  {/* Sector & Nationality */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <div className="font-semibold text-slate-800">{cust.working_sector || 'General'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{cust.country || 'Malaysia'}</div>
                  </td>

                  {/* Documents Count */}
                  <td className="py-3.5 px-4 border-r border-slate-200 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => setViewingCustomer(cust)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#0b4da2] hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
                    >
                      <FileText size={12} />
                      <span>{docCount} Files</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingCustomer(cust)}
                        title="View Worker Dossier"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye size={13} />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditModal(cust)}
                          title="Edit Worker Profile"
                          className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(cust.id)}
                          title="Delete Worker Record"
                          className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-red-50 flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                  No workers found matching the current search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <UserCheck size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  {editingCustomer ? 'Edit Worker Profile' : 'Register New Worker'}
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  Assign to an authorized employer and set official credentials.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Md Tariqul Islam"
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Passport Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassport}
                    onChange={(e) => setFormPassport(e.target.value.toUpperCase())}
                    placeholder="e.g. A01234567"
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    NID / National ID
                  </label>
                  <input
                    type="text"
                    value={formNid}
                    onChange={(e) => setFormNid(e.target.value)}
                    placeholder="National ID"
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Authorized Employer Company *
                </label>
                <select
                  required
                  value={formCompanyId}
                  onChange={(e) => setFormCompanyId(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Select Assigned Company --</option>
                  {permittedCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roc})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Working Sector
                  </label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                  >
                    {sectors.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-xs"
                >
                  {loading ? 'Saving...' : editingCustomer ? 'Update Worker' : 'Register Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW WORKER DOSSIER MODAL */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingCustomer(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0b4da2] font-bold">
                {viewingCustomer.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  {viewingCustomer.full_name}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Passport: {viewingCustomer.passport_no || 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">National ID</span>
                  <span className="font-semibold text-slate-800">{viewingCustomer.nid_no || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sector</span>
                  <span className="font-semibold text-slate-800">{viewingCustomer.working_sector || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nationality</span>
                  <span className="font-semibold text-slate-800">{viewingCustomer.country || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-emerald-700 capitalize">{viewingCustomer.status}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">Attached Clearance Documents</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {Array.isArray(viewingCustomer.documents) && viewingCustomer.documents.length > 0 ? (
                    viewingCustomer.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={14} className="text-blue-600 shrink-0" />
                          <span className="truncate font-medium text-slate-700">{doc.name}</span>
                        </div>
                        {doc.url && (
                          <a
                            href={getFileUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0b4da2] hover:underline font-bold text-[11px] shrink-0"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic py-2 text-center">
                      No service documents currently uploaded for this worker.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border-0"
              >
                Close
              </button>
            </div>
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
              Delete Worker Record?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              This action cannot be undone and removes all associated document links.
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
                disabled={loading}
                onClick={() => handleDeleteCustomer(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-xs"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
