'use client';

import { useEffect, useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  ChevronRight,
  ExternalLink,
  Globe2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  fetchCompaniesFromBackend,
  getStoredCompanies,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';
import { getCurrentUser, logoutUser, AuthUser } from '@/lib/auth';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [permittedCompanyCount, setPermittedCompanyCount] = useState<number>(0);
  const [customerCount, setCustomerCount] = useState<number>(0);

  // Strictly verify employee authorization
  useEffect(() => {
    try {
      const user = getCurrentUser();
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

      if (!isLoggedIn || !user) {
        setIsAuth(false);
        router.replace('/login');
        return;
      }

      // Check role
      if (user.role === 'SUPER_ADMIN') {
        router.replace('/superadmin');
        return;
      }
      if (user.role === 'MasterAdmin') {
        router.replace('/masteradmin');
        return;
      }

      // User is confirmed Employee
      setIsAuth(true);
      setCurrentUser(user);
    } catch {
      setIsAuth(false);
      router.replace('/login');
    }
  }, [pathname, router]);

  // Load companies and calculate permitted count
  useEffect(() => {
    const calculatePermitted = () => {
      const all = getStoredCompanies();
      const user = getCurrentUser();
      if (!user) {
        setPermittedCompanyCount(0);
        return;
      }
      const allowed = Array.isArray(user.assigned_companies) ? user.assigned_companies : [];
      if (allowed.includes('*')) {
        setPermittedCompanyCount(all.length);
        return;
      }
      const permitted = all.filter((c) =>
        allowed.some((id) => id.toLowerCase() === c.id.toLowerCase())
      );
      setPermittedCompanyCount(permitted.length);
    };

    calculatePermitted();
    fetchCompaniesFromBackend()
      .then(() => calculatePermitted())
      .catch(() => {});

    const unsub = subscribeToCompanyChanges(calculatePermitted);
    return unsub;
  }, []);

  // Fetch permitted customers count
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    fetch(`${apiBase}/customers`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const user = getCurrentUser();
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
  }, [pathname]);

  const handleLogout = () => {
    logoutUser();
    router.push('/login');
  };

  // Extract module permissions
  const perms = useMemo(() => {
    if (!currentUser) return null;
    return (
      currentUser.module_permissions || {
        companies: { view: true },
        customers: { view: true },
        services: { view: true },
        passwords: { view: false },
      }
    );
  }, [currentUser]);

  // Build dynamic sidebar navigation links based on granular module permissions!
  const navLinks = useMemo(() => {
    interface EmployeeNavItem {
      name: string;
      href: string;
      icon: any;
      badge?: string;
    }

    const items: EmployeeNavItem[] = [
      {
        name: 'Dashboard Overview',
        href: '/employee',
        icon: LayoutDashboard,
        badge: 'Desk',
      },
    ];

    if (perms?.companies?.view !== false) {
      items.push({
        name: 'Companies Management',
        href: '/employee/companies',
        icon: Building2,
        badge: permittedCompanyCount > 0 ? `${permittedCompanyCount}` : undefined,
      });
    }

    if (perms?.customers?.view !== false) {
      items.push({
        name: 'Customer Management',
        href: '/employee/customers',
        icon: UserCheck,
        badge: customerCount > 0 ? `${customerCount}` : undefined,
      });
    }

    if (perms?.services?.view !== false) {
      items.push({
        name: 'Service Cards',
        href: '/employee/services',
        icon: Sparkles,
        badge: 'Clearance',
      });
    }

    items.push({
      name: 'Services Portal',
      href: '/companies',
      icon: ExternalLink,
      badge: 'Live',
    });

    return items;
  }, [perms, permittedCompanyCount, customerCount]);

  if (isAuth === false) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-700">
            Verifying Employee Authorization...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans overflow-x-hidden">
      {/* Top Strip matching official frontend */}
      <div className="top-strip z-50">
        <span>Employee Operational Portal • Foreign Workers &amp; Employer Desk</span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Clearance: {currentUser?.employee_code || 'EMP'}</span>
          <Link
            href="/companies"
            className="inline-flex items-center gap-1 text-amber-300 hover:text-white font-bold transition-colors no-underline text-xs"
          >
            <Sparkles size={12} />
            <span>Employer Services</span>
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-red-200 hover:text-white font-semibold transition-colors bg-transparent border-0 cursor-pointer text-xs p-0"
          >
            <LogOut size={12} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 relative">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-30 shrink-0 sticky top-0 h-[calc(100vh-36px)] ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <Link
              href="/employee"
              className="flex items-center gap-3 no-underline text-inherit overflow-hidden"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0b4da2] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Users size={18} />
              </div>
              {sidebarOpen && (
                <div className="truncate">
                  <div className="text-xs font-black tracking-tight text-slate-900 truncate">
                    Staff Portal
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase truncate">
                    Workforce Desk
                  </div>
                </div>
              )}
            </Link>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg border-0 bg-transparent cursor-pointer hidden md:block"
              title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          </div>

          {/* User Profile Card */}
          {sidebarOpen && currentUser && (
            <div className="mx-3 mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono font-bold text-[#0b4da2] bg-white px-1.5 py-0.2 rounded border border-blue-200">
                      {currentUser.employee_code}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Employee</span>
                  </div>
                </div>
              </div>

              {currentUser.master_admin_name && (
                <div className="mt-2 pt-2 border-t border-blue-100 flex items-center gap-1 text-[10px] text-purple-700">
                  <ShieldCheck size={11} className="shrink-0" />
                  <span className="truncate">
                    Supervisor: <strong>{currentUser.master_admin_name}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sidebarOpen && (
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Permitted Modules
              </div>
            )}

            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/employee'
                  ? pathname === '/employee'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all no-underline ${
                    isActive
                      ? 'bg-[#0b4da2] text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  <Icon size={17} className="shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-50 text-[#0b4da2] border border-blue-100'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer ${
                !sidebarOpen && 'justify-center'
              }`}
              title="Sign Out"
            >
              <LogOut size={16} className="shrink-0" />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* MOBILE TOP BAR & DRAWER */}
        <div className="md:hidden w-full flex flex-col">
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <Link href="/employee" className="flex items-center gap-2.5 no-underline">
              <div className="w-8 h-8 rounded-lg bg-[#0b4da2] text-white flex items-center justify-center font-black">
                <Users size={16} />
              </div>
              <span className="font-bold text-xs text-slate-900">Staff Portal</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="bg-white border-b border-slate-200 p-4 space-y-1 shadow-lg animate-in slide-in-from-top duration-150">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/employee'
                    ? pathname === '/employee'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold no-underline ${
                      isActive
                        ? 'bg-[#0b4da2] text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              <div className="pt-2 mt-2 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 bg-transparent border-0 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
          {/* Subheader / Breadcrumbs */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/employee" className="hover:text-blue-600 transition-colors no-underline text-slate-500 font-medium">
                Employee Panel
              </Link>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="font-bold text-slate-800 capitalize">
                {pathname === '/employee'
                  ? 'Dashboard Overview'
                  : pathname.split('/').pop()?.replace(/-/g, ' ')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                Signed in as: <strong className="text-slate-700">{currentUser?.name}</strong>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
