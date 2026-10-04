'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  CheckSquare,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RotateCcw,
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
import { Company, resolveFileUrl } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';
import { getMasterAdminUser } from '@/lib/auth';
import Select2MultiSearch, { Select2MultiOption } from '@/components/Select2MultiSearch';
import { ServiceCard, getStoredServices, fetchServiceCards } from '@/lib/serviceStorage';

export type EmployeeRecord = {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: 'Employee' | 'Admin';
  assigned_companies: string[];
  assigned_service_cards?: string[];
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  plain_password?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
};

export default function MasterAdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'Employee' | 'Admin'>('Employee');
  const [formAssignedCompanies, setFormAssignedCompanies] = useState<string[]>([]);
  const [formCanCreate, setFormCanCreate] = useState(false);
  const [formCanEdit, setFormCanEdit] = useState(true);
  const [formCanDelete, setFormCanDelete] = useState(false);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [serviceCardsList, setServiceCardsList] = useState<ServiceCard[]>(() => {
    return typeof window !== 'undefined' ? getStoredServices() : [];
  });
  const [formAssignedServiceCards, setFormAssignedServiceCards] = useState<string[]>(['*']);

  const currentUser = getMasterAdminUser();
  const assignedScope = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${apiBase}/employees`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Error fetching employees from backend:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    setAllCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setAllCompanies(list);
    }).catch(() => {});
    fetchServiceCards().then((list) => {
      if (list && list.length > 0) setServiceCardsList(list);
    }).catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Only companies assigned to Master Admin are available for assignment
  const permittedCompanies = useMemo(() => {
    return allCompanies.filter((c) =>
      assignedScope.some((id) => id.toLowerCase() === c.id.toLowerCase())
    );
  }, [allCompanies, assignedScope]);

  const permittedCompanyOptions: Select2MultiOption[] = useMemo(() => {
    return permittedCompanies.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: `${c.roc || 'ROC'} • ${c.sector}`,
      badge: c.tag || 'Permitted',
      logo: c.logo,
    }));
  }, [permittedCompanies]);

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
    setEditingEmployee(null);
    setFormName('');
    setFormCode(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormEmail('');
    setFormPassword('password123');
    setFormRole('Employee');
    // Pre-assign first permitted company if available
    setFormAssignedCompanies(permittedCompanies.slice(0, 1).map((c) => c.id));
    setFormCanCreate(false);
    setFormCanEdit(true);
    setFormCanDelete(false);
    setFormStatus('active');
    setFormAssignedServiceCards(['*']);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: EmployeeRecord) => {
    setEditingEmployee(emp);
    setFormName(emp.name);
    setFormCode(emp.employee_code);
    setFormEmail(emp.email);
    setFormPassword('');
    setFormRole(emp.role);
    setFormAssignedCompanies(
      Array.isArray(emp.assigned_companies)
        ? emp.assigned_companies.filter((id) =>
            assignedScope.some((sId) => sId.toLowerCase() === id.toLowerCase())
          )
        : []
    );
    setFormCanCreate(Boolean(emp.can_create));
    setFormCanEdit(Boolean(emp.can_edit));
    setFormCanDelete(Boolean(emp.can_delete));
    setFormStatus(emp.status);
    setFormAssignedServiceCards(
      Array.isArray(emp.assigned_service_cards) && emp.assigned_service_cards.length > 0
        ? emp.assigned_service_cards
        : ['*']
    );
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim() || !formEmail.trim()) {
      showToast('error', 'Please fill in Name, Code, and Email.');
      return;
    }

    setIsLoading(true);

    const payload: any = {
      name: formName.trim(),
      employee_code: formCode.trim().toUpperCase(),
      email: formEmail.trim().toLowerCase(),
      role: formRole,
      assigned_companies: formAssignedCompanies,
      assigned_service_cards: formAssignedServiceCards,
      can_create: formCanCreate,
      can_edit: formCanEdit,
      can_delete: formCanDelete,
      status: formStatus,
    };

    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    }

    try {
      const url = editingEmployee
        ? `${apiBase}/employees/${editingEmployee.id}`
        : `${apiBase}/employees`;
      const method = editingEmployee ? 'PUT' : 'POST';

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
        throw new Error(errorData.message || 'Operation failed. Verify employee code and email uniqueness.');
      }

      await fetchEmployees();
      setIsModalOpen(false);
      showToast(
        'success',
        editingEmployee
          ? `Staff "${formName}" updated successfully!`
          : `Staff member "${formName}" created with ${formAssignedCompanies.length} assigned companies!`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save staff member.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/employees/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        showToast('info', 'Staff member removed successfully.');
        setDeleteConfirmId(null);
      } else {
        throw new Error('Failed to delete.');
      }
    } catch {
      showToast('error', 'Failed to delete staff member.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (emp: EmployeeRecord) => {
    const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`${apiBase}/employees/${emp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, status: nextStatus } : e))
        );
        showToast('info', `Staff status updated to ${nextStatus.toUpperCase()}.`);
      }
    } catch {
      showToast('error', 'Failed to update status.');
    }
  };

  // Filter employees belonging to or relevant to Master Admin scope
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const assigned = Array.isArray(emp.assigned_companies) ? emp.assigned_companies : [];
      // Employee has at least one company in common with Master Admin scope OR all if admin
      const inScope =
        emp.role === 'Admin' ||
        assigned.some((cId) => assignedScope.some((sId) => sId.toLowerCase() === cId.toLowerCase()));

      if (!inScope && assignedScope.length > 0) return false;

      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        emp.name.toLowerCase().includes(term) ||
        emp.employee_code.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term);

      const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [employees, searchTerm, statusFilter, assignedScope]);

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
            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <Users size={12} className="text-yellow-400" />
              <span>Scope Delegation &amp; Staff Access</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              Employees &amp; Permissions
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Manage operational staff and configure access permissions across your {permittedCompanies.length} permitted companies.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer border-0 shrink-0"
          >
            <Plus size={16} />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Staff Members
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {filteredEmployees.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">In your assigned scope</div>
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
              {filteredEmployees.filter((e) => e.status === 'active').length}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">Operational accounts</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Permitted Scope
            </span>
            <div className="text-2xl font-bold text-purple-700 tracking-tight mt-1">
              {permittedCompanies.length}
            </div>
            <div className="text-[11px] text-purple-600 mt-1">Available company assignments</div>
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
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search staff by Name, Code, or Email..."
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
                All ({filteredEmployees.length})
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
              onClick={fetchEmployees}
              className="p-2 text-slate-500 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
              title="Refresh list"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Employee Code</th>
                <th className="py-3 px-4">Assigned Companies</th>
                <th className="py-3 px-4">Action Permissions</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">
                      No Staff Records Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchTerm
                        ? 'Try clearing your search query.'
                        : 'Add staff members to delegate company workload.'}
                    </p>
                    <button
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-xs"
                    >
                      <Plus size={14} />
                      <span>Add Staff Member</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const assigned = Array.isArray(emp.assigned_companies)
                    ? emp.assigned_companies
                    : [];

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center font-bold text-xs shrink-0">
                            {emp.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {emp.email} • <span className="font-semibold text-slate-600">{emp.role}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {emp.employee_code}
                        </span>
                      </td>

                      {/* Assigned Companies */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assigned.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">
                              No companies assigned
                            </span>
                          ) : (
                            assigned.slice(0, 2).map((cId) => {
                              const match = allCompanies.find(
                                (c) => c.id.toLowerCase() === cId.toLowerCase()
                              );
                              return (
                                <span
                                  key={cId}
                                  className="inline-flex items-center gap-1 bg-blue-50 text-[#0b4da2] border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold"
                                >
                                  <Building2 size={10} />
                                  <span className="truncate max-w-[85px]">
                                    {match ? match.name : cId}
                                  </span>
                                </span>
                              );
                            })
                          )}
                          {assigned.length > 2 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                              +{assigned.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              emp.can_create
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={emp.can_create ? 'Allowed to create' : 'Cannot create'}
                          >
                            Create
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              emp.can_edit
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={emp.can_edit ? 'Allowed to edit' : 'Cannot edit'}
                          >
                            Edit
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              emp.can_delete
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            title={emp.can_delete ? 'Allowed to delete' : 'Cannot delete'}
                          >
                            Delete
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors border-0 ${
                            emp.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{emp.status === 'active' ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 text-slate-600 hover:text-[#0b4da2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="Edit Staff Member"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(emp.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="Delete Staff Member"
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

      {/* Modal: Create / Edit Employee */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-[#072a6b] to-[#0c4da2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Users size={18} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold m-0 leading-tight">
                    {editingEmployee ? 'Edit Staff Member' : 'Add New Staff Member'}
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0">
                    Assign company clearance and operational privileges
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

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Staff Name"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Employee Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="EMP-1001"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2] focus:bg-white uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="staff@agency.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Role Category
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'Employee' | 'Admin')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                  >
                    <option value="Employee">Operational Employee</option>
                    <option value="Admin">Scope Supervisor (Admin)</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Login Password {editingEmployee ? '(Leave blank to retain)' : <span className="text-red-500">*</span>}
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
                    required={!editingEmployee}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingEmployee ? '••••••••' : 'Enter password'}
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

              {/* Permitted Companies (Multiple Select2) */}
              <div>
                <Select2MultiSearch
                  label="Assigned Companies (From Your Permitted Scope)"
                  options={permittedCompanyOptions}
                  values={formAssignedCompanies}
                  onChange={(vals) => setFormAssignedCompanies(vals)}
                  placeholder="Select companies this staff member can access..."
                  searchPlaceholder="Search your permitted companies..."
                  helpText="Only companies in your Master Admin scope can be assigned to this staff member."
                />
              </div>

              {/* Permitted Service Cards Clearances */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 m-0">
                      Service Cards Clearance ({formAssignedServiceCards.includes('*') ? serviceCardsList.length : formAssignedServiceCards.length} Selected)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Select which service cards this staff member is authorized to access
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormAssignedServiceCards(['*'])}
                      className="text-[11px] font-bold text-[#0b4da2] hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormAssignedServiceCards([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {serviceCardsList.map((card) => {
                    const isSelected = formAssignedServiceCards.includes('*') || formAssignedServiceCards.includes(card.id);
                    return (
                      <label
                        key={card.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (formAssignedServiceCards.includes('*')) {
                              const allExceptThis = serviceCardsList.map((s) => s.id).filter((id) => id !== card.id);
                              setFormAssignedServiceCards(allExceptThis);
                            } else if (formAssignedServiceCards.includes(card.id)) {
                              setFormAssignedServiceCards(formAssignedServiceCards.filter((id) => id !== card.id));
                            } else {
                              const next = [...formAssignedServiceCards, card.id];
                              if (next.length === serviceCardsList.length) {
                                setFormAssignedServiceCards(['*']);
                              } else {
                                setFormAssignedServiceCards(next);
                              }
                            }
                          }}
                          className="rounded text-[#0b4da2] focus:ring-[#0b4da2] shrink-0"
                        />
                        <span className="truncate">{card.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Permissions Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Action Permissions
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formCanCreate}
                      onChange={(e) => setFormCanCreate(e.target.checked)}
                      className="rounded text-[#0b4da2] focus:ring-[#0b4da2]"
                    />
                    <span>Can Create</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formCanEdit}
                      onChange={(e) => setFormCanEdit(e.target.checked)}
                      className="rounded text-[#0b4da2] focus:ring-[#0b4da2]"
                    />
                    <span>Can Edit</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formCanDelete}
                      onChange={(e) => setFormCanDelete(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Can Delete</span>
                  </label>
                </div>
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
                    <span>Active</span>
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

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer bg-white"
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
                  <span>{editingEmployee ? 'Save Changes' : 'Create Staff Member'}</span>
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
              Delete Staff Member?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this employee account? Access to assigned companies will be terminated.
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
                onClick={() => handleDeleteEmployee(deleteConfirmId)}
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
