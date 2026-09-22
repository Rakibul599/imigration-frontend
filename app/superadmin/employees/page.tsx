'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  CheckSquare,
  Edit2,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';

export type EmployeeRecord = {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: 'Employee' | 'Admin';
  assigned_companies: string[];
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
};

export default function SuperAdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setCompanies(list);
    }).catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormName('');
    setFormCode(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormEmail('');
    setFormPassword('password123');
    setFormRole('Employee');
    // Default assign first two companies if available
    setFormAssignedCompanies(companies.slice(0, 2).map((c) => c.id));
    setFormCanCreate(true);
    setFormCanEdit(true);
    setFormCanDelete(false);
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: EmployeeRecord) => {
    setEditingEmployee(emp);
    setFormName(emp.name);
    setFormCode(emp.employee_code);
    setFormEmail(emp.email);
    setFormPassword(''); // blank means leave unchanged
    setFormRole(emp.role);
    setFormAssignedCompanies(Array.isArray(emp.assigned_companies) ? emp.assigned_companies : []);
    setFormCanCreate(Boolean(emp.can_create));
    setFormCanEdit(Boolean(emp.can_edit));
    setFormCanDelete(Boolean(emp.can_delete));
    setFormStatus(emp.status);
    setIsModalOpen(true);
  };

  const toggleCompanyAssignment = (companyId: string) => {
    setFormAssignedCompanies((prev) => {
      if (prev.includes(companyId)) {
        return prev.filter((id) => id !== companyId);
      }
      return [...prev, companyId];
    });
  };

  const selectAllCompanies = () => {
    setFormAssignedCompanies(companies.map((c) => c.id));
  };

  const clearAllCompanies = () => {
    setFormAssignedCompanies([]);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim() || !formEmail.trim()) return;

    setIsLoading(true);

    const payload: any = {
      name: formName.trim(),
      employee_code: formCode.trim().toUpperCase(),
      email: formEmail.trim().toLowerCase(),
      role: formRole,
      assigned_companies: formAssignedCompanies,
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

      if (res.ok) {
        await fetchEmployees();
        setIsModalOpen(false);
        setEditingEmployee(null);
        showToast(
          'success',
          editingEmployee
            ? `Employee "${payload.name}" updated successfully.`
            : `New Employee "${payload.name}" created with ${formAssignedCompanies.length} assigned companies.`
        );
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Error saving employee.');
      }
    } catch (err) {
      console.error('Save employee error:', err);
      alert('Failed to connect to backend.');
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
        await fetchEmployees();
        setDeleteConfirmId(null);
        showToast('info', 'Employee deleted successfully from MySQL database.');
      }
    } catch (err) {
      console.error('Delete employee error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered employee list
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = employees.filter((e) => e.status === 'active').length;

  return (
    <div className="space-y-6">
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

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                Employee &amp; Permissions Management
              </h1>
              <span className="bg-blue-100 text-[#0b4da2] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {employees.length} Users
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0">
              Configure employee login accounts, assign permitted companies, and specify granular permissions (Create, Edit, Delete).
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-sm transition-all cursor-pointer border-0"
          >
            <Plus size={16} />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Total Accounts
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {employees.length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Active Logins
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {activeCount}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Available Companies
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {companies.length}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, User ID, or email..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-xs"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Showing {filteredEmployees.length} of {employees.length} employees
        </span>
      </div>

      {/* Employee Table with Signature Green Header */}
      <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#22a34a] text-white text-xs font-bold">
              <th className="py-3 px-4 border-r border-green-600/60 w-[25%]">
                Employee Profile
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[12%]">
                Role
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[35%]">
                Assigned Company Access
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 text-center w-[16%]">
                Permissions
              </th>
              <th className="py-3 px-4 text-right w-[12%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredEmployees.map((emp) => {
              const assignedIds = Array.isArray(emp.assigned_companies) ? emp.assigned_companies : [];
              const assignedCompanyObjects = companies.filter((c) => assignedIds.includes(c.id));

              return (
                <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                  {/* Name, Code, Email */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0b4da2] font-bold flex items-center justify-center text-xs shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block text-[13px]">
                          {emp.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] font-bold text-[#0b4da2] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {emp.employee_code}
                          </span>
                          <span className="text-slate-500 text-[11px]">{emp.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        emp.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </td>

                  {/* Assigned Companies */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {assignedCompanyObjects.length === 0 ? (
                        <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-medium">
                          No company access assigned
                        </span>
                      ) : assignedCompanyObjects.length === companies.length ? (
                        <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                          Full Access (All {companies.length} Companies)
                        </span>
                      ) : (
                        assignedCompanyObjects.map((c) => (
                          <span
                            key={c.id}
                            className="inline-block text-[10px] font-semibold bg-blue-50 text-[#0b4da2] border border-blue-200 px-2 py-0.5 rounded"
                          >
                            {c.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  {/* Permissions Pills */}
                  <td className="py-3.5 px-4 border-r border-slate-200 text-center align-middle">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          emp.can_create
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-400 line-through'
                        }`}
                        title={emp.can_create ? 'Permission: Create Records' : 'No Create Permission'}
                      >
                        Create
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          emp.can_edit
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-400 line-through'
                        }`}
                        title={emp.can_edit ? 'Permission: Edit Records' : 'No Edit Permission'}
                      >
                        Edit
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          emp.can_delete
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-400 line-through'
                        }`}
                        title={emp.can_delete ? 'Permission: Delete Records' : 'No Delete Permission'}
                      >
                        Delete
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(emp)}
                        title="Edit Employee & Permissions"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(emp.id)}
                        title="Delete Employee"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-red-50 flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                  No employees found matching &quot;{searchTerm}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0b4da2]">
                <Users size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 m-0">
                  {editingEmployee ? 'Edit Employee & Access Permissions' : 'Create New Employee Account'}
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  Configure employee credentials, company permissions, and operational access levels.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEmployee} className="flex flex-col gap-4 pt-2">
              {/* Name and Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Employee Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmad bin Zulkifli"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Role Category
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'Employee' | 'Admin')}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 cursor-pointer bg-white"
                  >
                    <option value="Employee">Employee (Company Access Restricted)</option>
                    <option value="Admin">Admin (Elevated Operational Access)</option>
                  </select>
                </div>
              </div>

              {/* Employee Code / User ID and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    User ID / Employee Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEMO2026 or EMP-1001"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ahmad@demo.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Password {editingEmployee ? <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span> : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  required={!editingEmployee}
                  placeholder={editingEmployee ? '•••••••• (unchanged)' : 'Enter login password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 font-mono"
                />
              </div>

              {/* COMPANY ACCESS CHECKBOXES */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block m-0">
                      Assigned Company Access ({formAssignedCompanies.length} Selected)
                    </label>
                    <p className="text-[11px] text-slate-500 m-0">
                      Employee will ONLY be able to access and view these selected companies.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllCompanies}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold bg-transparent border-0 cursor-pointer p-0"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllCompanies}
                      className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold bg-transparent border-0 cursor-pointer p-0"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 max-h-44 overflow-y-auto pr-1">
                  {companies.map((comp) => {
                    const isChecked = formAssignedCompanies.includes(comp.id);
                    return (
                      <label
                        key={comp.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50/80 border-blue-300 text-[#0b4da2] font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCompanyAssignment(comp.id)}
                          className="w-4 h-4 rounded text-[#0b4da2] border-slate-300 cursor-pointer"
                        />
                        <div className="truncate">
                          <span className="truncate block leading-tight">{comp.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block leading-none mt-0.5">
                            {comp.roc}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* GRANULAR PERMISSIONS */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Operational Permissions
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Specify whether this user has permission to create, edit, or delete items within their assigned companies.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Can Create */}
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formCanCreate
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formCanCreate}
                      onChange={(e) => setFormCanCreate(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span>Can Create</span>
                  </label>

                  {/* Can Edit */}
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formCanEdit
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formCanEdit}
                      onChange={(e) => setFormCanEdit(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <span>Can Edit</span>
                  </label>

                  {/* Can Delete */}
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formCanDelete
                        ? 'bg-red-50 border-red-300 text-red-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formCanDelete}
                      onChange={(e) => setFormCanDelete(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 cursor-pointer"
                    />
                    <span>Can Delete</span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Account Status
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Active accounts can log into the digital portal.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormStatus(formStatus === 'active' ? 'inactive' : 'active')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
                    formStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-300'
                  }`}
                >
                  {formStatus === 'active' ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0 shadow-xs disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
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
              Delete Employee Record?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              This action will revoke their login credentials and company access.
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
                disabled={isLoading}
                onClick={() => handleDeleteEmployee(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-xs"
              >
                {isLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
