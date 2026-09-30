'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import {
  fetchCompaniesFromBackend,
  getStoredCompanies,
  subscribeToCompanyChanges,
  updateStoredCompany,
} from '@/lib/companyStorage';
import { getCurrentUser, AuthUser } from '@/lib/auth';

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

export default function EmployeeCompaniesPage() {
  const [allCompanies, setAllCompanies] = useState<Company[]>(() => {
    if (typeof window === 'undefined') return [];
    return getStoredCompanies();
  });
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

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    setAllCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setAllCompanies(list);
    }).catch(() => {});

    const unsub = subscribeToCompanyChanges(() => {
      setAllCompanies(getStoredCompanies());
    });
    return unsub;
  }, []);

  const assignedList = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  const perms = useMemo(() => {
    return (
      currentUser?.module_permissions || {
        companies: { view: true, edit: false, delete: false },
      }
    );
  }, [currentUser]);

  const canEdit = Boolean(perms?.companies?.edit);
  const canDelete = Boolean(perms?.companies?.delete);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Filter companies strictly by assigned permissions
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

  // Filter with search & sector
  const filteredCompanies = useMemo(() => {
    return permittedCompanies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.roc && c.roc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.sector.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSector = selectedSector === 'ALL' || c.sector === selectedSector;
      return matchSearch && matchSector;
    });
  }, [permittedCompanies, searchTerm, selectedSector]);

  // Open Edit Modal
  const openEditModal = (comp: Company) => {
    if (!canEdit) {
      alert('You do not have permission to edit company profiles. Contact your administrator.');
      return;
    }
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
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !canEdit) return;

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

      {/* Top Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Authorized Scope
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">
                Clearance: {canEdit ? 'View + Edit' : 'View Only'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
              Assigned Employer Companies Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl m-0">
              You are authorized to access and view records for the following {permittedCompanies.length} employer companies assigned to your staff profile.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/employee/customers"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all no-underline"
            >
              <Users size={15} />
              <span>Worker Directory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company name, ROC, sector..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400 shrink-0 hidden sm:inline" />
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium cursor-pointer"
          >
            <option value="ALL">All Sectors ({permittedCompanies.length})</option>
            {SECTOR_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Companies Table with Signature Green Header */}
      <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#22a34a] text-white text-xs font-bold">
              <th className="py-3 px-4 border-r border-green-600/60 w-[30%]">
                Employer Company
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[20%]">
                ROC &amp; Sector
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[15%] text-center">
                Allocated Workers
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[20%]">
                Contact &amp; Address
              </th>
              <th className="py-3 px-4 text-right w-[15%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredCompanies.map((c) => (
              <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                {/* Logo & Name */}
                <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                      <img src={c.logo} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block text-xs truncate">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 inline-block mt-0.5">
                        {c.tag || 'Registered Employer'}
                      </span>
                    </div>
                  </div>
                </td>

                {/* ROC & Sector */}
                <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                  <div className="font-mono text-xs font-bold text-slate-800">{c.roc}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{c.sector}</div>
                </td>

                {/* Allocated Workers */}
                <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-center">
                  <span className="font-bold text-slate-900 text-sm">{c.totalWorkers || 100}</span>
                  <span className="text-[10px] text-slate-400 block">Quota</span>
                </td>

                {/* Contact */}
                <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                  <div className="text-slate-700 truncate">{c.phone || c.email || '—'}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">
                    {c.address || '—'}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/services?company=${encodeURIComponent(c.id)}`}
                      title="Launch Employer Services Portal"
                      className="px-2.5 py-1.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0b4da2] text-[11px] font-bold inline-flex items-center gap-1 transition-colors no-underline border border-blue-200"
                    >
                      <Sparkles size={12} />
                      <span>Services</span>
                    </Link>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        title="Edit Company Details"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filteredCompanies.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                  No companies found matching &quot;{searchTerm}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT COMPANY MODAL */}
      {editingCompany && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingCompany(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0b4da2]">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  Edit Employer Details
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  Update corporate contact information and sector assignment.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Company Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ROC Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formRoc}
                    onChange={(e) => setFormRoc(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Allocated Workers Quota
                  </label>
                  <input
                    type="number"
                    value={formWorkers}
                    onChange={(e) => setFormWorkers(Number(e.target.value))}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Industry Sector
                </label>
                <select
                  value={formSector}
                  onChange={(e) => setFormSector(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                >
                  {SECTOR_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Official Phone
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Registered Address
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-xs"
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
