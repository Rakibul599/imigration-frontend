'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  CheckSquare,
  Eye,
  EyeOff,
  FolderLock,
  Globe2,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';

export interface ModuleAccessSettings {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
}

export interface EmployeeModulePermissions {
  companies: ModuleAccessSettings;
  customers: ModuleAccessSettings;
  services: ModuleAccessSettings;
  passwords: ModuleAccessSettings;
}

const DEFAULT_PERMISSIONS: EmployeeModulePermissions = {
  companies: { view: true, create: false, edit: true, delete: false },
  customers: { view: true, create: true, edit: true, delete: false },
  services: { view: true, create: false, edit: false, delete: false },
  passwords: { view: false, create: false, edit: false, delete: false },
};

interface MasterAdminItem {
  id: number;
  name: string;
  username: string;
  email: string;
}

interface EmployeeFormFullPageProps {
  editId?: string;
  backUrl?: string;
}

export default function EmployeeFormFullPage({
  editId,
  backUrl = '/superadmin/employees',
}: EmployeeFormFullPageProps) {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const [isLoading, setIsLoading] = useState(Boolean(editId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [masterAdminId, setMasterAdminId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Assigned companies
  const [assignedCompanies, setAssignedCompanies] = useState<string[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companiesList, setCompaniesList] = useState<Company[]>([]);

  // Master admins list
  const [masterAdmins, setMasterAdmins] = useState<MasterAdminItem[]>([]);

  // Module permissions
  const [permissions, setPermissions] = useState<EmployeeModulePermissions>(DEFAULT_PERMISSIONS);

  // Load companies & master admins
  useEffect(() => {
    setCompaniesList(getStoredCompanies());
    fetchCompaniesFromBackend()
      .then((comps) => setCompaniesList(comps))
      .catch(() => {});

    fetch(`${apiBase}/master-admins`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMasterAdmins(data);
        }
      })
      .catch(() => {});
  }, [apiBase]);

  // Load employee for editing or generate random code for create
  useEffect(() => {
    if (editId) {
      setIsLoading(true);
      fetch(`${apiBase}/employees/${editId}`)
        .then((r) => r.json())
        .then((emp) => {
          if (emp && emp.id) {
            setName(emp.name || '');
            setEmployeeCode(emp.employee_code || '');
            setEmail(emp.email || '');
            setPassword(emp.plain_password || '');
            setMasterAdminId(emp.master_admin_id ? String(emp.master_admin_id) : '');
            setStatus(emp.status || 'active');
            setAssignedCompanies(Array.isArray(emp.assigned_companies) ? emp.assigned_companies : []);

            if (emp.module_permissions && typeof emp.module_permissions === 'object') {
              setPermissions({
                companies: { ...DEFAULT_PERMISSIONS.companies, ...(emp.module_permissions.companies || {}) },
                customers: { ...DEFAULT_PERMISSIONS.customers, ...(emp.module_permissions.customers || {}) },
                services: { ...DEFAULT_PERMISSIONS.services, ...(emp.module_permissions.services || {}) },
                passwords: { ...DEFAULT_PERMISSIONS.passwords, ...(emp.module_permissions.passwords || {}) },
              });
            }
          } else {
            setFeedback({ type: 'error', message: 'Employee profile not found.' });
          }
        })
        .catch((err) => {
          setFeedback({ type: 'error', message: 'Failed to load employee profile.' });
        })
        .finally(() => setIsLoading(false));
    } else {
      setEmployeeCode(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
      setPassword('password123');
    }
  }, [editId, apiBase]);

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  // Toggle company assignment
  const handleToggleCompany = (companyId: string) => {
    setAssignedCompanies((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  const handleSelectAllCompanies = () => {
    setAssignedCompanies(companiesList.map((c) => c.id));
  };

  const handleClearAllCompanies = () => {
    setAssignedCompanies([]);
  };

  // Toggle module permission
  const handlePermissionChange = (
    moduleKey: keyof EmployeeModulePermissions,
    action: keyof ModuleAccessSettings,
    checked: boolean
  ) => {
    setPermissions((prev) => {
      const current = prev[moduleKey] || { view: false };
      return {
        ...prev,
        [moduleKey]: {
          ...current,
          [action]: checked,
          // If view is unchecked, all actions in this module should be turned off
          ...(action === 'view' && !checked ? { create: false, edit: false, delete: false } : {}),
          // If create, edit, or delete is checked, view MUST be checked
          ...(action !== 'view' && checked ? { view: true } : {}),
        },
      };
    });
  };

  // Permission Presets
  const applyPreset = (preset: 'full' | 'readonly' | 'standard') => {
    if (preset === 'full') {
      setPermissions({
        companies: { view: true, create: true, edit: true, delete: true },
        customers: { view: true, create: true, edit: true, delete: true },
        services: { view: true, create: true, edit: true, delete: true },
        passwords: { view: true, create: false, edit: true, delete: false },
      });
    } else if (preset === 'readonly') {
      setPermissions({
        companies: { view: true, create: false, edit: false, delete: false },
        customers: { view: true, create: false, edit: false, delete: false },
        services: { view: true, create: false, edit: false, delete: false },
        passwords: { view: false, create: false, edit: false, delete: false },
      });
    } else {
      // Standard operator
      setPermissions({
        companies: { view: true, create: false, edit: true, delete: false },
        customers: { view: true, create: true, edit: true, delete: false },
        services: { view: true, create: false, edit: false, delete: false },
        passwords: { view: false, create: false, edit: false, delete: false },
      });
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Employee Full Name is required.' });
      return;
    }
    if (!employeeCode.trim()) {
      setFeedback({ type: 'error', message: 'Employee Code is required.' });
      return;
    }
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Employee Email is required.' });
      return;
    }
    if (!editId && !password.trim()) {
      setFeedback({ type: 'error', message: 'Password is required for new employees.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const selectedMaster = masterAdmins.find((m) => String(m.id) === masterAdminId || m.username === masterAdminId);

    const payload = {
      name: name.trim(),
      employee_code: employeeCode.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      password: password || undefined,
      role: 'Employee', // strictly Employee
      master_admin_id: masterAdminId || null,
      master_admin_name: selectedMaster ? `${selectedMaster.name} (${selectedMaster.username})` : null,
      assigned_companies: assignedCompanies,
      can_create: Boolean(permissions.customers.create),
      can_edit: Boolean(permissions.customers.edit),
      can_delete: Boolean(permissions.customers.delete),
      module_permissions: permissions,
      status,
    };

    try {
      const url = editId ? `${apiBase}/employees/${editId}` : `${apiBase}/employees`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: editId
            ? `Employee "${name}" profile updated successfully!`
            : `New Employee "${name}" registered successfully!`,
        });
        setTimeout(() => {
          router.push(backUrl);
        }, 1000);
      } else {
        const errorMsg = data.message || (data.errors ? Object.values(data.errors).flat().join(', ') : 'Failed to save employee profile.');
        setFeedback({ type: 'error', message: errorMsg });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred while saving employee.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    const q = companySearch.toLowerCase().trim();
    if (!q) return companiesList;
    return companiesList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.roc && c.roc.toLowerCase().includes(q)) ||
        (c.sector && c.sector.toLowerCase().includes(q))
    );
  }, [companiesList, companySearch]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1140px] mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading employee profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-[1140px] mx-auto w-full space-y-6">
      {/* Top Header / Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <Link href="/superadmin" className="hover:text-blue-600 transition-colors">
              Super Admin
            </Link>
            <span>•</span>
            <Link href={backUrl} className="hover:text-blue-600 transition-colors">
              Staff &amp; Workforce
            </Link>
            <span>•</span>
            <span className="text-[#0b4da2]">{editId ? 'Edit Profile' : 'New Employee'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 m-0">
            <Users className="text-[#0b4da2]" size={28} />
            <span>{editId ? `Edit Employee: ${employeeCode}` : 'Register New Employee'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure staff credentials, supervisor assignment, employer company clearances, and granular module permissions.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs no-underline"
          >
            <ArrowLeft size={14} />
            <span>Back to Employees</span>
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>{isSubmitting ? 'Saving...' : editId ? 'Update Employee' : 'Create Employee'}</span>
          </button>
        </div>
      </div>

      {/* Global Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert size={16} className="text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CARD 1: Identity & Credentials */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 m-0 uppercase tracking-wider">
                  Employee Identity &amp; System Credentials
                </h3>
                <p className="text-xs text-slate-400 m-0">
                  Basic staff profile information, login code, password, and supervising Master Admin.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Role:</span>
              <span className="text-xs font-black bg-blue-100 text-[#0b4da2] px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200">
                Employee
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mohd Syahir Bin Abdullah"
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium outline-none"
              />
            </div>

            {/* Employee Code */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Employee Code (User ID) *</span>
                <span className="text-[10px] text-blue-600 font-normal">Login ID</span>
              </label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                placeholder="e.g. EMP-2003"
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold outline-none"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Official Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. syahir@agency.gov.my"
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>{editId ? 'Password (Leave blank to keep)' : 'Password *'}</span>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer border-0 bg-transparent flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Generate
                </button>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editId}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-900 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* ASSIGN MASTER ADMIN (Positioned directly after password as requested) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Assign Master Admin</span>
                <span className="text-[10px] text-purple-600 font-bold">Supervisor</span>
              </label>
              <select
                value={masterAdminId}
                onChange={(e) => setMasterAdminId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3 py-2 text-xs text-slate-900 font-medium outline-none cursor-pointer"
              >
                <option value="">-- No Supervising Master Admin --</option>
                {masterAdmins.map((ma) => (
                  <option key={ma.id} value={String(ma.id)}>
                    {ma.name} ({ma.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3 py-2 text-xs text-slate-900 font-medium outline-none cursor-pointer"
              >
                <option value="active">Active (Permitted To Login)</option>
                <option value="inactive">Inactive (Suspended)</option>
              </select>
            </div>
          </div>
        </div>

        {/* CARD 2: Assigned Employer Companies */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 m-0 uppercase tracking-wider">
                  Assigned Employer Clearances
                </h3>
                <p className="text-xs text-slate-400 m-0">
                  Select which registered companies this employee is authorized to access and manage.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllCompanies}
                className="text-[11px] font-bold text-[#0b4da2] hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAllCompanies}
                className="text-[11px] font-bold text-slate-500 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search box for companies */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search companies by name, ROC, sector..."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0b4da2] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none"
            />
          </div>

          {/* Companies Checkbox Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[280px] overflow-y-auto p-1">
            {filteredCompanies.map((c) => {
              const isChecked = assignedCompanies.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => handleToggleCompany(c.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'border-[#0b4da2] bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-[#0b4da2] text-white' : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-slate-50 p-1 flex items-center justify-center shrink-0 border border-slate-100">
                    <img src={c.logo} alt="" className="max-h-full max-w-full object-contain" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{c.roc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 pt-1">
            <strong>{assignedCompanies.length}</strong> of {companiesList.length} companies selected for this employee.
          </div>
        </div>

        {/* CARD 3: Operational & Sidebar Module Permissions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 m-0 uppercase tracking-wider">
                  Operational Permissions &amp; Sidebar Access Control
                </h3>
                <p className="text-xs text-slate-400 m-0">
                  Granular control over which admin sidebar modules this employee can see, view, edit, or delete.
                </p>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('full')}
                className="text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors"
              >
                Full Control
              </button>
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
              >
                Standard Operator
              </button>
              <button
                type="button"
                onClick={() => applyPreset('readonly')}
                className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
              >
                View Only
              </button>
            </div>
          </div>

          {/* Granular Permission Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Sidebar Module</th>
                  <th className="py-2.5 px-3 text-center">View Access</th>
                  <th className="py-2.5 px-3 text-center">Create / Add</th>
                  <th className="py-2.5 px-3 text-center">Edit / Update</th>
                  <th className="py-2.5 px-3 text-center">Delete Access</th>
                  <th className="py-2.5 px-3 text-right">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {/* 1. Companies Management */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
                        <Building2 size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Companies Management</div>
                        <div className="text-[11px] text-slate-400">View &amp; manage employer profile cards</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={permissions.companies.view}
                      onChange={(e) => handlePermissionChange('companies', 'view', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-300 font-mono">—</td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.companies.view}
                      checked={permissions.companies.edit ?? false}
                      onChange={(e) => handlePermissionChange('companies', 'edit', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.companies.view}
                      checked={permissions.companies.delete ?? false}
                      onChange={(e) => handlePermissionChange('companies', 'delete', e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        permissions.companies.view
                          ? permissions.companies.delete
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : permissions.companies.edit
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {permissions.companies.view
                        ? permissions.companies.delete
                          ? 'Full Control'
                          : permissions.companies.edit
                          ? 'View + Edit'
                          : 'View Only'
                        : 'No Access'}
                    </span>
                  </td>
                </tr>

                {/* 2. Customer Management */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <UserCheck size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Customer &amp; Worker Management</div>
                        <div className="text-[11px] text-slate-400">Profiles, passport numbers, documents &amp; sectors</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={permissions.customers.view}
                      onChange={(e) => handlePermissionChange('customers', 'view', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.customers.view}
                      checked={permissions.customers.create ?? false}
                      onChange={(e) => handlePermissionChange('customers', 'create', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.customers.view}
                      checked={permissions.customers.edit ?? false}
                      onChange={(e) => handlePermissionChange('customers', 'edit', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.customers.view}
                      checked={permissions.customers.delete ?? false}
                      onChange={(e) => handlePermissionChange('customers', 'delete', e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        permissions.customers.view
                          ? permissions.customers.delete
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : permissions.customers.edit
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {permissions.customers.view
                        ? permissions.customers.delete
                          ? 'Full Control'
                          : permissions.customers.edit || permissions.customers.create
                          ? 'Create + Edit'
                          : 'View Only'
                        : 'No Access'}
                    </span>
                  </td>
                </tr>

                {/* 3. Service Cards */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Service Cards Management</div>
                        <div className="text-[11px] text-slate-400">Digital service cards &amp; attached documents</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={permissions.services.view}
                      onChange={(e) => handlePermissionChange('services', 'view', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.services.view}
                      checked={permissions.services.create ?? false}
                      onChange={(e) => handlePermissionChange('services', 'create', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.services.view}
                      checked={permissions.services.edit ?? false}
                      onChange={(e) => handlePermissionChange('services', 'edit', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.services.view}
                      checked={permissions.services.delete ?? false}
                      onChange={(e) => handlePermissionChange('services', 'delete', e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        permissions.services.view
                          ? permissions.services.delete
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : permissions.services.edit
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {permissions.services.view
                        ? permissions.services.delete
                          ? 'Full Control'
                          : permissions.services.edit || permissions.services.create
                          ? 'Edit Cards'
                          : 'View Only'
                        : 'No Access'}
                    </span>
                  </td>
                </tr>

                {/* 4. Password Management */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <KeyRound size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Password Management</div>
                        <div className="text-[11px] text-slate-400">View &amp; reset administrative passwords</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={permissions.passwords.view}
                      onChange={(e) => handlePermissionChange('passwords', 'view', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-300 font-mono">—</td>
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      disabled={!permissions.passwords.view}
                      checked={permissions.passwords.edit ?? false}
                      onChange={(e) => handlePermissionChange('passwords', 'edit', e.target.checked)}
                      className="w-4 h-4 text-[#0b4da2] rounded cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-300 font-mono">—</td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        permissions.passwords.view
                          ? permissions.passwords.edit
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {permissions.passwords.view ? (permissions.passwords.edit ? 'View + Edit' : 'View Only') : 'No Access'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Link
            href={backUrl}
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all no-underline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving Profile...' : editId ? 'Update Employee Profile' : 'Register Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
