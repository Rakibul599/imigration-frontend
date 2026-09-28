'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';

export type CredentialRecord = {
  id: number | string;
  type: 'super_admin' | 'master_admin' | 'employee' | 'customer';
  role: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  company_info?: string;
  assigned_companies?: string[];
  status: string;
  updated_at?: string;
};

export default function SuperAdminPasswordManagementPage() {
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(true); // Default show or toggle
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Edit / Reset Password Modal
  const [editingTarget, setEditingTarget] = useState<CredentialRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/passwords`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.credentials && Array.isArray(data.credentials)) {
          setCredentials(data.credentials);
        }
      }
    } catch (err) {
      console.error('Error fetching passwords:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('success', `Copied ${label} to clipboard!`);
  };

  const toggleReveal = (key: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleShowAll = () => {
    const nextState = !showAllPasswords;
    setShowAllPasswords(nextState);
    const updated: Record<string, boolean> = {};
    credentials.forEach((c) => {
      updated[`${c.type}-${c.id}`] = nextState;
    });
    setRevealedIds(updated);
  };

  const openResetModal = (cred: CredentialRecord) => {
    setEditingTarget(cred);
    setNewPassword('');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget || !newPassword.trim()) return;

    if (editingTarget.type === 'super_admin') {
      showToast('info', 'Root Super Admin password is configured via security environment configuration.');
      setEditingTarget(null);
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch(`${apiBase}/passwords/${editingTarget.type}/${editingTarget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ new_password: newPassword.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to update password');
      }

      const data = await res.json();
      showToast('success', data.message || 'Password successfully updated!');
      setEditingTarget(null);
      await fetchCredentials();
    } catch {
      showToast('error', 'Error updating password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  // Filter credentials
  const filteredCredentials = useMemo(() => {
    return credentials.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.username.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        (item.phone && item.phone.toLowerCase().includes(term)) ||
        (item.company_info && item.company_info.toLowerCase().includes(term));

      const matchRole =
        selectedRole === 'ALL' ||
        (selectedRole === 'SUPER_ADMIN' && item.type === 'super_admin') ||
        (selectedRole === 'MasterAdmin' && item.type === 'master_admin') ||
        (selectedRole === 'Employee' && item.type === 'employee') ||
        (selectedRole === 'Customer' && item.type === 'customer');

      return matchSearch && matchRole;
    });
  }, [credentials, searchTerm, selectedRole]);

  // Counts
  const superAdminCount = credentials.filter((c) => c.type === 'super_admin').length;
  const masterAdminCount = credentials.filter((c) => c.type === 'master_admin').length;
  const employeeCount = credentials.filter((c) => c.type === 'employee').length;
  const customerCount = credentials.filter((c) => c.type === 'customer').length;

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
            <KeyRound size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <KeyRound size={12} className="text-yellow-400" />
              <span>Super Admin Master Credential Directory</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              Password Management Console
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Centralized administrative access to view and manage account passwords across Super Admins, Master Admins, Employees, and Registered Workers/Customers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleShowAll}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              {showAllPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{showAllPasswords ? 'Mask All Passwords' : 'Show All Passwords'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Total Accounts
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            {credentials.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">All registered accounts</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-[#0b4da2] font-bold uppercase tracking-wider">
            Master Admins
          </div>
          <div className="text-2xl font-bold text-[#0b4da2] tracking-tight mt-1">
            {masterAdminCount}
          </div>
          <div className="text-[10px] text-blue-600 mt-1">Multi-company administrators</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">
            Staff &amp; Employees
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight mt-1">
            {employeeCount}
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">Internal operators</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-purple-600 font-bold uppercase tracking-wider">
            Workers &amp; Clients
          </div>
          <div className="text-2xl font-bold text-purple-600 tracking-tight mt-1">
            {customerCount}
          </div>
          <div className="text-[10px] text-purple-600 mt-1">Foreign worker permits</div>
        </div>
      </div>

      {/* Filter and Credentials Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Filters */}
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
              placeholder="Search by name, username, email, or company..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-lg bg-slate-200/60 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedRole('ALL')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                  selectedRole === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                All ({credentials.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('MasterAdmin')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                  selectedRole === 'MasterAdmin'
                    ? 'bg-white text-[#0b4da2] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Master Admins ({masterAdminCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('Employee')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                  selectedRole === 'Employee'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Staff ({employeeCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('Customer')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer border-0 ${
                  selectedRole === 'Customer'
                    ? 'bg-white text-purple-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Workers ({customerCount})
              </button>
            </div>

            <button
              onClick={fetchCredentials}
              className="p-2 text-slate-500 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
              title="Refresh credentials"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Credentials Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">User Account</th>
                <th className="py-3 px-4">Role Classification</th>
                <th className="py-3 px-4">Login Username / ID</th>
                <th className="py-3 px-4">Email / Contact</th>
                <th className="py-3 px-4">Company Scope</th>
                <th className="py-3 px-4">Password (Super Admin View)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCredentials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <KeyRound size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">
                      No Accounts Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      No user accounts match your search query.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCredentials.map((cred) => {
                  const itemKey = `${cred.type}-${cred.id}`;
                  const isRevealed = revealedIds[itemKey] ?? showAllPasswords;

                  return (
                    <tr
                      key={itemKey}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              cred.type === 'super_admin'
                                ? 'bg-amber-100 text-amber-800'
                                : cred.type === 'master_admin'
                                ? 'bg-blue-100 text-[#0b4da2]'
                                : cred.type === 'employee'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {cred.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {cred.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Type: {cred.type.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cred.type === 'super_admin'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : cred.type === 'master_admin'
                              ? 'bg-blue-100 text-[#0b4da2] border border-blue-300'
                              : cred.type === 'employee'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {cred.type === 'super_admin' && <ShieldCheck size={11} />}
                          {cred.type === 'master_admin' && <ShieldAlert size={11} />}
                          {cred.type === 'employee' && <User size={11} />}
                          {cred.type === 'customer' && <Users size={11} />}
                          <span>{cred.role}</span>
                        </span>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {cred.username}
                        </span>
                      </td>

                      {/* Email / Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-slate-700">
                          {cred.email}
                        </div>
                        {cred.phone && cred.phone !== '-' && (
                          <div className="text-[10px] text-slate-400">
                            {cred.phone}
                          </div>
                        )}
                      </td>

                      {/* Company Info */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <span className="truncate max-w-[150px] block font-medium">
                          {cred.company_info || 'System-wide'}
                        </span>
                      </td>

                      {/* Password Field (With View & Copy) */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2 bg-amber-50/70 border border-amber-200 px-2.5 py-1 rounded-lg">
                          <span className="font-mono text-xs font-bold text-amber-950 select-all min-w-[70px]">
                            {isRevealed ? cred.password : '••••••••'}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleReveal(itemKey)}
                            className="text-amber-700 hover:text-amber-900 p-0.5 rounded bg-transparent border-0 cursor-pointer transition-colors"
                            title={isRevealed ? 'Hide Password' : 'Show Password'}
                          >
                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(cred.password, `${cred.name}'s Password`)}
                            className="text-amber-700 hover:text-amber-900 p-0.5 rounded bg-transparent border-0 cursor-pointer transition-colors"
                            title="Copy Password"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </td>

                      {/* Actions: Reset / Change Password */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openResetModal(cred)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#0b4da2] hover:bg-blue-50 border border-blue-200 transition-all cursor-pointer bg-white"
                          title="Change / Reset Password"
                        >
                          <Edit2 size={12} />
                          <span>Change</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Change / Reset Password */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#072a6b] to-[#0c4da2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <KeyRound size={18} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold m-0 leading-tight">
                    Reset Account Password
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0">
                    Update credential for {editingTarget.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>User:</span>
                  <span className="font-bold text-slate-900">{editingTarget.name}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Username:</span>
                  <span className="font-mono font-semibold text-slate-800">{editingTarget.username}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Current Password:</span>
                  <span className="font-mono font-bold text-amber-800">{editingTarget.password}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 4 characters)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !newPassword.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50 flex items-center gap-2"
                >
                  {isResetting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
