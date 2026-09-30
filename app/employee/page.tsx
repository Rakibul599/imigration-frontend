'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Eye,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import { getCurrentUser, AuthUser } from '@/lib/auth';

export default function EmployeeDashboardPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [customerCount, setCustomerCount] = useState<number>(0);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    setAllCompanies(getStoredCompanies());
    fetchCompaniesFromBackend()
      .then((comps) => setAllCompanies(comps))
      .catch(() => {});

    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    fetch(`${apiBase}/customers`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const allowed = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
          if (allowed.includes('*')) {
            setCustomerCount(data.length);
          } else {
            const inScope = data.filter((c) =>
              c.company_id && allowed.some((id: string) => id.toLowerCase() === c.company_id.toLowerCase())
            );
            setCustomerCount(inScope.length);
          }
        }
      })
      .catch(() => {});
  }, []);

  const permittedCompanies = useMemo(() => {
    if (!currentUser) return [];
    const allowed = Array.isArray(currentUser.assigned_companies) ? currentUser.assigned_companies : [];
    if (allowed.includes('*')) return allCompanies;
    return allCompanies.filter((c) =>
      allowed.some((id) => id.toLowerCase() === c.id.toLowerCase())
    );
  }, [allCompanies, currentUser]);

  const perms = useMemo(() => {
    return (
      currentUser?.module_permissions || {
        companies: { view: true },
        customers: { view: true },
        services: { view: true },
        passwords: { view: false },
      }
    );
  }, [currentUser]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Staff Operations Desk
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono font-bold">
                {currentUser?.employee_code || 'EMP'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight m-0">
              Welcome back, {currentUser?.name || 'Staff Member'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              You are authenticated to perform operational tasks across your authorized employer companies and manage customer documentation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/companies"
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-xs no-underline"
            >
              <Sparkles size={15} />
              <span>Launch Employer Services</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Permitted Companies */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
              Assigned Companies
            </p>
            <h3 className="text-2xl font-black text-slate-900 m-0 mt-0.5">
              {permittedCompanies.length}
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold">Active Clearance</span>
          </div>
        </div>

        {/* Customer Records */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
              Worker Records
            </p>
            <h3 className="text-2xl font-black text-slate-900 m-0 mt-0.5">
              {customerCount}
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">Under Authorized Companies</span>
          </div>
        </div>

        {/* Supervisor Master Admin */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
            <ShieldCheck size={24} />
          </div>
          <div className="truncate">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
              Supervisor
            </p>
            <h3 className="text-sm font-bold text-slate-900 m-0 mt-0.5 truncate">
              {currentUser?.master_admin_name || 'Standard Oversight'}
            </h3>
            <span className="text-[10px] text-purple-600 font-bold">Master Administrator</span>
          </div>
        </div>

        {/* System Access Level */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
              Operational Access
            </p>
            <h3 className="text-sm font-bold text-slate-900 m-0 mt-0.5">
              Role: Employee
            </h3>
            <span className="text-[10px] text-blue-600 font-bold">Granular Clearance</span>
          </div>
        </div>
      </div>

      {/* Permitted Modules Access Cards */}
      <div>
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-3">
          Authorized Operational Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Module 1: Companies */}
          {perms.companies?.view !== false && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      perms.companies?.delete
                        ? 'bg-red-50 text-red-700'
                        : perms.companies?.edit
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {perms.companies?.delete
                      ? 'Full Control'
                      : perms.companies?.edit
                      ? 'View + Edit'
                      : 'View Only'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 m-0">
                  Companies Management
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Access employer company registries, overview workforce quotas, ROC numbers, and corporate credentials.
                </p>
              </div>

              <Link
                href="/employee/companies"
                className="inline-flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0b4da2] text-xs font-bold transition-colors no-underline"
              >
                <span>View {permittedCompanies.length} Authorized Companies</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Module 2: Customers */}
          {perms.customers?.view !== false && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserCheck size={20} />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      perms.customers?.delete
                        ? 'bg-red-50 text-red-700'
                        : perms.customers?.create || perms.customers?.edit
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {perms.customers?.delete
                      ? 'Full Control'
                      : perms.customers?.create && perms.customers?.edit
                      ? 'Create + Edit'
                      : perms.customers?.edit
                      ? 'Edit Records'
                      : 'View Only'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 m-0">
                  Customer &amp; Worker Management
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Manage worker profiles, passport numbers, uploaded clearance documents, and employment verification.
                </p>
              </div>

              <Link
                href="/employee/customers"
                className="inline-flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold transition-colors no-underline"
              >
                <span>Manage Worker Database</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Module 3: Services Cards */}
          {perms.services?.view !== false && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-50 text-amber-800">
                    Service Clearance
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 m-0">
                  Employer Service Cards
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Browse operational service cards, view attached customer documents, and perform work information tasks.
                </p>
              </div>

              <Link
                href="/employee/services"
                className="inline-flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-bold transition-colors no-underline"
              >
                <span>Review Service Clearances</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Authorized Companies List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Authorized Employer Companies ({permittedCompanies.length})
            </h3>
            <p className="text-xs text-slate-400 m-0">
              Only companies authorized for your login account are listed here.
            </p>
          </div>

          {perms.companies?.view !== false && (
            <Link
              href="/employee/companies"
              className="text-xs font-bold text-[#0b4da2] hover:underline no-underline"
            >
              View Full Directory &rarr;
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {permittedCompanies.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-all bg-slate-50/50 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 border border-slate-200">
                <img src={c.logo} alt="" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 truncate m-0">{c.name}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">{c.roc}</span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[10px] text-blue-600 truncate">{c.sector}</span>
                </div>
              </div>
              <Link
                href={`/services?company=${encodeURIComponent(c.id)}`}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center shrink-0 transition-colors"
                title="Open in Services Portal"
              >
                <ExternalLink size={13} />
              </Link>
            </div>
          ))}

          {permittedCompanies.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs">
              No employer companies currently assigned to your account. Please contact your Master Admin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
