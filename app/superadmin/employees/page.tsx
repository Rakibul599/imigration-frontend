'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit2,
  FileText,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import CardPriorityModal from '@/components/CardPriorityModal';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import {
  PageStatCardConfig,
  getStoredPageCards,
  saveStoredPageCards,
  resetStoredPageCards,
} from '@/lib/pageCardStorage';
import { Company } from '@/lib/companies';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';

export type EmployeeRecord = {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: 'Employee' | 'Admin';
  master_admin_id?: number | null;
  master_admin_name?: string | null;
  assigned_companies: string[];
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  module_permissions?: {
    companies?: { view: boolean; edit?: boolean; delete?: boolean };
    customers?: { view: boolean; create?: boolean; edit?: boolean; delete?: boolean };
    services?: { view: boolean; create?: boolean; edit?: boolean; delete?: boolean };
    passwords?: { view: boolean; edit?: boolean };
  };
  status: 'active' | 'inactive';
  documents?: Array<{ name: string; issue_date?: string; expire_date?: string; url?: string; size?: string }>;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_EMPLOYEE_CARDS: PageStatCardConfig[] = [
  { id: 'total_accounts', title: 'Total Accounts', subtitle: 'Registered staff & workforce members', icon: 'Users', order_num: 1 },
  { id: 'active_logins', title: 'Active Logins', subtitle: 'Authorized & operational logins', icon: 'UserCheck', order_num: 2 },
  { id: 'available_companies', title: 'Available Companies', subtitle: 'Assigned corporate employer entities', icon: 'Building2', order_num: 3 },
];

export default function SuperAdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Manage Cards Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cards, setCards] = useState<PageStatCardConfig[]>(DEFAULT_EMPLOYEE_CARDS);

  useEffect(() => {
    setCards(getStoredPageCards('employees', DEFAULT_EMPLOYEE_CARDS));
    const handleUpdate = (e: any) => {
      setCards(e.detail || getStoredPageCards('employees', DEFAULT_EMPLOYEE_CARDS));
    };
    window.addEventListener('superadmin_cards_update_employees', handleUpdate);
    return () => window.removeEventListener('superadmin_cards_update_employees', handleUpdate);
  }, []);

  const handleSaveCards = (updated: PageStatCardConfig[]) => {
    const saved = saveStoredPageCards('employees', updated);
    setCards(saved);
    setNotification({ type: 'success', message: 'Cards priority and names updated successfully.' });
  };

  const handleResetCards = () => {
    const reset = resetStoredPageCards('employees', DEFAULT_EMPLOYEE_CARDS);
    setCards(reset);
    setNotification({ type: 'info', message: 'Cards reset to default layout.' });
  };

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
    fetchCompaniesFromBackend()
      .then((list) => {
        setCompanies(list);
      })
      .catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
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
        showToast('info', 'Employee profile deleted successfully.');
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
      (emp.master_admin_name && emp.master_admin_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                Staff &amp; Workforce Management
              </h1>
              <span className="bg-blue-100 text-[#0b4da2] text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                {employees.length} Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0 leading-relaxed max-w-2xl">
              Manage employee accounts, supervise master admin assignments, employer clearances, and granular module permissions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={() => setIsCardModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal size={14} />
              <span>Manage Cards &amp; Priority</span>
            </button>

            <Link
              href="/superadmin/employees/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083a7c] text-white shadow-sm transition-all cursor-pointer border-0 no-underline whitespace-nowrap active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Add New Employee</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards (Exact Dashboard Card Design, Dynamic from Card Priority Config) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => {
          let value: number = 0;
          let themeColor = 'text-slate-900';
          let iconBg = 'bg-blue-50 text-[#0b4da2]';

          if (card.id === 'total_accounts') {
            value = employees.length;
            themeColor = 'text-slate-900';
            iconBg = 'bg-blue-50 text-[#0b4da2]';
          } else if (card.id === 'active_logins') {
            value = activeCount;
            themeColor = 'text-emerald-600';
            iconBg = 'bg-emerald-50 text-emerald-600';
          } else if (card.id === 'available_companies') {
            value = companies.length;
            themeColor = 'text-slate-900';
            iconBg = 'bg-indigo-50 text-indigo-600';
          }

          return (
            <div
              key={card.id}
              className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight truncate">
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

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, User ID, email, supervisor..."
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
              <th className="py-3 px-4 border-r border-green-600/60 w-[24%]">
                Employee Profile
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[18%]">
                Supervisor (Master Admin)
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[26%]">
                Assigned Company Access
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 text-center w-[20%]">
                Module Permissions
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
              const perms = emp.module_permissions || {
                companies: { view: true, edit: emp.can_edit, delete: emp.can_delete },
                customers: { view: true, create: emp.can_create, edit: emp.can_edit, delete: emp.can_delete },
                services: { view: true },
                passwords: { view: false },
              };

              return (
                <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                  {/* Name, Code, Email */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0b4da2] font-bold flex items-center justify-center text-xs shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 block text-[13px]">
                            {emp.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                              emp.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] font-bold text-[#0b4da2] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {emp.employee_code}
                          </span>
                          <span className="text-slate-500 text-[11px] truncate max-w-[130px]" title={emp.email}>
                            {emp.email}
                          </span>
                        </div>
                        {Array.isArray(emp.documents) && emp.documents.length > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold inline-flex items-center gap-1">
                              <FileText size={10} />
                              <span>{emp.documents.length} {emp.documents.length === 1 ? 'doc' : 'docs'}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Supervisor (Master Admin) */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    {emp.master_admin_name ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        <div>
                          <span className="font-bold text-purple-900 text-xs block leading-tight">
                            {emp.master_admin_name}
                          </span>
                          <span className="text-[10px] text-purple-600 font-medium">Assigned Supervisor</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
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

                  {/* Module Permissions Matrix Badges */}
                  <td className="py-3.5 px-4 border-r border-slate-200 text-center align-middle">
                    <div className="flex flex-col gap-1 items-start justify-center max-w-[200px] mx-auto text-[10px]">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-500 font-semibold">Companies:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded ${
                            perms.companies?.view
                              ? perms.companies?.delete
                                ? 'bg-red-50 text-red-700'
                                : perms.companies?.edit
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {perms.companies?.view
                            ? perms.companies?.delete
                              ? 'Full'
                              : perms.companies?.edit
                              ? 'Edit'
                              : 'View'
                            : 'None'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-500 font-semibold">Customers:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded ${
                            perms.customers?.view
                              ? perms.customers?.delete
                                ? 'bg-red-50 text-red-700'
                                : perms.customers?.create || perms.customers?.edit
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {perms.customers?.view
                            ? perms.customers?.delete
                              ? 'Full'
                              : perms.customers?.create && perms.customers?.edit
                              ? 'Create/Edit'
                              : perms.customers?.edit
                              ? 'Edit'
                              : 'View'
                            : 'None'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-500 font-semibold">Services:</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded ${
                            perms.services?.view
                              ? perms.services?.delete
                                ? 'bg-red-50 text-red-700'
                                : perms.services?.edit
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {perms.services?.view ? (perms.services?.edit ? 'Edit' : 'View') : 'None'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/superadmin/employees/edit?id=${emp.id}`}
                        title="Edit Employee & Permissions"
                        className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors no-underline shadow-2xs"
                      >
                        <Edit2 size={14} />
                      </Link>

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
                {isLoading ? 'Deleting...' : 'Delete'}
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
        pageTitle="Staff & Workforce Management"
      />
    </div>
  );
}
