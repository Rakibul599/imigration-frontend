'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Company, resolveFileUrl } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import Select2MultiSearch, { Select2MultiOption } from '@/components/Select2MultiSearch';

export type MasterAdminRecord = {
  id: number;
  name: string;
  email: string;
  username: string;
  plain_password?: string;
  assigned_companies: string[];
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
};

export default function MasterAdminPermissionPage() {
  const [masterAdmins, setMasterAdmins] = useState<MasterAdminRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<MasterAdminRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Copy Link Modal States
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyModalData, setCopyModalData] = useState<{
    name: string;
    email: string;
    username: string;
    password?: string;
    assigned_companies: string[];
  } | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<number | null>(null);
  const [modalCopiedField, setModalCopiedField] = useState<'link' | 'all' | 'password' | null>(null);
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formAssignedCompanies, setFormAssignedCompanies] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const fetchMasterAdmins = async () => {
    try {
      const res = await fetch(`${apiBase}/master-admins`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMasterAdmins(data);
      }
    } catch (err) {
      console.error('Error fetching master admins from backend:', err);
    }
  };

  useEffect(() => {
    fetchMasterAdmins();
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setCompanies(list);
    }).catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Direct portal URL generator
  const getMasterAdminPortalUrl = (username?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    if (username) {
      return `${origin}/masteradmin/login?user=${encodeURIComponent(username)}`;
    }
    return `${origin}/masteradmin/login`;
  };

  // Quick copy link from list / table row
  const handleCopyLink = async (admin: MasterAdminRecord) => {
    const link = getMasterAdminPortalUrl(admin.username);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedRowId(admin.id);
      showToast('success', `Copied login link for @${admin.username} to clipboard!`);
      setTimeout(() => {
        setCopiedRowId((prev) => (prev === admin.id ? null : prev));
      }, 2500);
    } catch {
      showToast('error', 'Failed to copy to clipboard.');
    }
  };

  // Open copy link & credentials modal for existing admin
  const openCopyModalForAdmin = (admin: MasterAdminRecord) => {
    setCopyModalData({
      name: admin.name,
      email: admin.email,
      username: admin.username,
      password: admin.plain_password || '',
      assigned_companies: Array.isArray(admin.assigned_companies) ? admin.assigned_companies : [],
    });
    setModalCopiedField(null);
    setShowModalPassword(Boolean(admin.plain_password));
    setIsCopyModalOpen(true);
  };

  const copyModalLink = async () => {
    if (!copyModalData) return;
    const link = getMasterAdminPortalUrl(copyModalData.username);
    try {
      await navigator.clipboard.writeText(link);
      setModalCopiedField('link');
      showToast('success', 'Master Admin portal link copied to clipboard!');
      setTimeout(() => setModalCopiedField(null), 3000);
    } catch {
      showToast('error', 'Failed to copy link to clipboard.');
    }
  };

  const copyModalPassword = async () => {
    if (!copyModalData?.password) return;
    try {
      await navigator.clipboard.writeText(copyModalData.password);
      setModalCopiedField('password');
      showToast('success', 'Password copied to clipboard!');
      setTimeout(() => setModalCopiedField(null), 3000);
    } catch {
      showToast('error', 'Failed to copy password.');
    }
  };

  const copyModalFullInvitation = async () => {
    if (!copyModalData) return;
    const link = getMasterAdminPortalUrl(copyModalData.username);
    const assignedCompanyNames = copyModalData.assigned_companies
      .map((code) => {
        const comp = companies.find((c) => c.id.toLowerCase() === code.toLowerCase());
        return comp ? comp.name : code;
      })
      .join('\n  • ');

    const text = [
      `🌟 Master Admin Portal Access Details`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Portal Login URL: ${link}`,
      `Name: ${copyModalData.name}`,
      `Username: ${copyModalData.username}`,
      `Email: ${copyModalData.email}`,
      copyModalData.password ? `Temporary Password: ${copyModalData.password}` : '',
      `Assigned Companies (${copyModalData.assigned_companies.length}):`,
      assignedCompanyNames ? `  • ${assignedCompanyNames}` : '  • No companies assigned',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Instructions: Access your Master Admin console using the link above, review your assigned companies, and update your password under settings.`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setModalCopiedField('all');
      showToast('success', 'Full invitation details copied to clipboard!');
      setTimeout(() => setModalCopiedField(null), 3000);
    } catch {
      showToast('error', 'Failed to copy invitation.');
    }
  };

  // Convert companies into Select2MultiOption array
  const companyOptions: Select2MultiOption[] = useMemo(() => {
    return companies.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: `${c.roc || 'ROC'} • ${c.sector}`,
      badge: c.tag || 'Verified',
      logo: c.logo,
    }));
  }, [companies]);

  // Quick auto-generate password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pass);
    setShowPassword(true);
  };

  const openCreateModal = () => {
    setEditingAdmin(null);
    setFormName('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('password123');
    // Pre-select first 2 companies if available
    setFormAssignedCompanies(companies.slice(0, 2).map((c) => c.id));
    setFormStatus('active');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (admin: MasterAdminRecord) => {
    setEditingAdmin(admin);
    setFormName(admin.name);
    setFormEmail(admin.email);
    setFormUsername(admin.username);
    setFormPassword(admin.plain_password || '');
    setFormAssignedCompanies(Array.isArray(admin.assigned_companies) ? admin.assigned_companies : []);
    setFormStatus(admin.status);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSaveMasterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formUsername.trim()) {
      showToast('error', 'Please fill in Name, Email, and Username.');
      return;
    }

    if (!editingAdmin && !formPassword.trim()) {
      showToast('error', 'Password is required for new Master Admin.');
      return;
    }

    setIsLoading(true);

    const payload: any = {
      name: formName.trim(),
      email: formEmail.trim(),
      username: formUsername.trim(),
      assigned_companies: formAssignedCompanies,
      status: formStatus,
    };

    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    }

    try {
      const url = editingAdmin
        ? `${apiBase}/master-admins/${editingAdmin.id}`
        : `${apiBase}/master-admins`;
      const method = editingAdmin ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Operation failed. Verify username and email uniqueness.');
      }

      await fetchMasterAdmins();
      setIsModalOpen(false);

      if (!editingAdmin) {
        // Open the copy link modal immediately upon creation
        const createdAdminData = {
          name: formName.trim(),
          email: formEmail.trim(),
          username: formUsername.trim(),
          password: formPassword.trim(),
          assigned_companies: formAssignedCompanies,
        };
        setCopyModalData(createdAdminData);
        setModalCopiedField(null);
        setShowModalPassword(true);
        setIsCopyModalOpen(true);
        showToast(
          'success',
          `Master Admin "${formName}" created successfully! Copy access link below.`
        );
      } else {
        showToast('success', `Master Admin "${formName}" updated successfully!`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save Master Admin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMasterAdmin = async (id: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/master-admins/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setMasterAdmins((prev) => prev.filter((a) => a.id !== id));
        showToast('info', 'Master Admin deleted successfully.');
        setDeleteConfirmId(null);
      } else {
        throw new Error('Failed to delete.');
      }
    } catch {
      showToast('error', 'Failed to delete Master Admin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (admin: MasterAdminRecord) => {
    const nextStatus = admin.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`${apiBase}/master-admins/${admin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setMasterAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, status: nextStatus } : a))
        );
        showToast(
          'info',
          `Master Admin status updated to ${nextStatus.toUpperCase()}.`
        );
      }
    } catch {
      showToast('error', 'Failed to update status.');
    }
  };

  // Filter master admins
  const filteredAdmins = useMemo(() => {
    return masterAdmins.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [masterAdmins, searchTerm, statusFilter]);

  // Statistics
  const totalAdmins = masterAdmins.length;
  const activeAdmins = masterAdmins.filter((a) => a.status === 'active').length;
  const totalAssignedSlots = masterAdmins.reduce(
    (acc, a) => acc + (a.assigned_companies?.length || 0),
    0
  );

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
          ) : notification.type === 'error' ? (
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          ) : (
            <ShieldAlert size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldAlert size={12} className="text-yellow-400" />
              <span>Multi-Tenant Company Access Control</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              Master Admin Permission
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Create and manage Master Administrators. Assign multi-company permissions using multiple Select2. Master Admins access their own dedicated panel with restricted company authority.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer border-0 shrink-0"
          >
            <Plus size={16} />
            <span>Create Master Admin</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Total Master Admins
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {totalAdmins}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Registered administrative operators
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Active Status
            </span>
            <div className="text-2xl font-bold text-emerald-600 tracking-tight mt-1">
              {activeAdmins}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Currently authorized &amp; verified
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Company Permissions
            </span>
            <div className="text-2xl font-bold text-[#0b4da2] tracking-tight mt-1">
              {totalAssignedSlots}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Total assigned company slots
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Building2 size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
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
              placeholder="Search by Name, Username, or Email..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-200/60 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                All ({masterAdmins.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                  statusFilter === 'active'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                  statusFilter === 'inactive'
                    ? 'bg-white text-rose-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Inactive
              </button>
            </div>

            <button
              onClick={fetchMasterAdmins}
              className="p-2 text-slate-500 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
              title="Refresh list"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Master Admins Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Master Admin</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4">Permitted Companies (Multi)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldAlert size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">
                      No Master Administrators Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchTerm
                        ? 'Try clearing your search filters.'
                        : 'Get started by creating your first Master Administrator.'}
                    </p>
                    <button
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-xs"
                    >
                      <Plus size={14} />
                      <span>Create Master Admin</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const assignedList = Array.isArray(admin.assigned_companies)
                    ? admin.assigned_companies
                    : [];

                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#072a6b] to-[#0c4da2] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {admin.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {admin.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              ID: #{admin.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-mono text-xs px-2.5 py-1 rounded-md font-semibold border border-slate-200">
                          @{admin.username}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        {admin.email}
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-semibold">
                          {admin.plain_password || '••••••••'}
                        </span>
                      </td>

                      {/* Permitted Companies Badges */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assignedList.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">
                              No companies assigned
                            </span>
                          ) : (
                            assignedList.slice(0, 3).map((compCode) => {
                              const match = companies.find(
                                (c) => c.id.toLowerCase() === compCode.toLowerCase()
                              );
                              return (
                                <span
                                  key={compCode}
                                  className="inline-flex items-center gap-1 bg-blue-50 text-[#0b4da2] border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-bold"
                                >
                                  <Building2 size={10} />
                                  <span className="truncate max-w-[90px]">
                                    {match ? match.name : compCode}
                                  </span>
                                </span>
                              );
                            })
                          )}
                          {assignedList.length > 3 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-md">
                              +{assignedList.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(admin)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors border-0 ${
                            admin.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              admin.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{admin.status === 'active' ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Direct Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(admin)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              copiedRowId === admin.id
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-blue-50/80 text-[#0b4da2] border-blue-200 hover:bg-[#0b4da2] hover:text-white hover:border-[#0b4da2]'
                            }`}
                            title={`Copy portal login link for @${admin.username}`}
                          >
                            {copiedRowId === admin.id ? (
                              <>
                                <Check size={13} className="text-emerald-600" />
                                <span className="text-[11px] font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Link2 size={13} />
                                <span className="text-[11px]">Copy Link</span>
                              </>
                            )}
                          </button>

                          {/* View Link & Share Details Modal */}
                          <button
                            type="button"
                            onClick={() => openCopyModalForAdmin(admin)}
                            className="p-1.5 text-slate-500 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="View Link & Share Credentials"
                          >
                            <Share2 size={14} />
                          </button>

                          {/* Edit Master Admin */}
                          <button
                            type="button"
                            onClick={() => openEditModal(admin)}
                            className="p-1.5 text-slate-600 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="Edit Master Admin"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete Master Admin */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(admin.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="Delete Master Admin"
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

      {/* Modal: Create & Edit Master Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#072a6b] to-[#0c4da2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <ShieldAlert size={18} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold m-0 leading-tight">
                    {editingAdmin ? 'Edit Master Administrator' : 'Create Master Administrator'}
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0">
                    Define login credentials and assign permitted companies
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMasterAdmin} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Tan Sri Syed Mokhtar"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Grid: Email & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="masteradmin@agency.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="masteradmin"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Password {editingAdmin ? '(Leave empty to keep unchanged)' : <span className="text-red-500">*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[#0b4da2] hover:underline text-[11px] font-semibold flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    <Sparkles size={11} />
                    <span>Auto Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingAdmin}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingAdmin ? '••••••••' : 'Enter login password'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 bg-transparent border-0 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Company Permissions (Select2 Multiple Select) */}
              <div>
                <Select2MultiSearch
                  label="Permitted Companies (Multiple Select2)"
                  options={companyOptions}
                  values={formAssignedCompanies}
                  onChange={(vals) => setFormAssignedCompanies(vals)}
                  placeholder="Select one or multiple companies for this Master Admin..."
                  searchPlaceholder="Search company by name or ROC..."
                  helpText="Only the selected companies will be visible and manageable by this Master Admin in their panel."
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Account Status
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="text-[#0b4da2] focus:ring-[#0b4da2]"
                    />
                    <span>Active (Permitted to log in)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>Inactive (Suspended)</span>
                  </label>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
                <strong>Restriction Rule:</strong> Master Administrators are granted full management rights for their permitted companies, but they <strong>cannot create new companies</strong>.
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{editingAdmin ? 'Save Changes' : 'Create Master Admin'}</span>
                </button>
              </div>
            </form>
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
              Delete Master Administrator?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this Master Admin account? All assigned company permissions for this account will be revoked.
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
                onClick={() => handleDeleteMasterAdmin(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer border-0 shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Copy Link & Share Master Admin Access */}
      {isCopyModalOpen && copyModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shadow-xs">
                  <CheckCircle2 size={20} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold m-0 leading-tight text-white flex items-center gap-2">
                    <span>Master Admin Portal Link</span>
                    <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Ready to Share
                    </span>
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0 mt-0.5">
                    Direct access link &amp; credentials for @{copyModalData.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Direct URL Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Link2 size={13} className="text-[#0b4da2]" />
                    <span>Master Admin Direct Login URL</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Auto-prefills username</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={getMasterAdminPortalUrl(copyModalData.username)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={copyModalLink}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                      modalCopiedField === 'link'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-[#0b4da2] hover:bg-[#083a7c] text-white border-[#0b4da2] shadow-xs'
                    }`}
                  >
                    {modalCopiedField === 'link' ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={getMasterAdminPortalUrl(copyModalData.username)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:text-[#0b4da2] hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
                    title="Open portal in new tab"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>

              {/* Credentials Overview Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Account Summary</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active Status
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Full Name</span>
                    <span className="font-bold text-slate-900 truncate block mt-0.5">{copyModalData.name}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Username</span>
                    <span className="font-mono font-bold text-[#0b4da2] truncate block mt-0.5">@{copyModalData.username}</span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Email</span>
                  <span className="font-mono text-slate-700 text-xs block mt-0.5">{copyModalData.email}</span>
                </div>

                {copyModalData.password && (
                  <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-800 block font-bold">Temporary Password</span>
                      <span className="font-mono text-xs font-bold text-amber-950 mt-0.5 block">
                        {showModalPassword ? copyModalData.password : '••••••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        className="p-1 text-amber-700 hover:text-amber-900 bg-transparent border-0 cursor-pointer"
                        title={showModalPassword ? 'Hide password' : 'Show password'}
                      >
                        {showModalPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={copyModalPassword}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        {modalCopiedField === 'password' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Assigned Companies Preview */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Permitted Companies ({copyModalData.assigned_companies.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {copyModalData.assigned_companies.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No companies assigned</span>
                    ) : (
                      copyModalData.assigned_companies.map((code) => {
                        const comp = companies.find((c) => c.id.toLowerCase() === code.toLowerCase());
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 bg-white text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-2xs"
                          >
                            <Building2 size={10} className="text-[#0b4da2]" />
                            <span>{comp ? comp.name : code}</span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Copy Full Invitation Button */}
              <div>
                <button
                  type="button"
                  onClick={copyModalFullInvitation}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                    modalCopiedField === 'all'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  {modalCopiedField === 'all' ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Full Invitation Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="text-slate-600" />
                      <span>Copy Full Invitation Details (For WhatsApp / Email)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Bottom Dismiss */}
              <div className="pt-2 flex justify-end border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer border-0"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
