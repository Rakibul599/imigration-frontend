'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Building2,
  ChevronRight,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Shield,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  fetchCompaniesFromBackend,
  getStoredCompanies,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/superadmin/login';

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [companyCount, setCompanyCount] = useState<number>(0);
  const [employeeCount, setEmployeeCount] = useState<number>(0);

  // Check superadmin authentication
  useEffect(() => {
    if (isLoginPage) {
      setIsAuthenticated(true);
      return;
    }

    try {
      const loggedIn = localStorage.getItem('isSuperAdminLoggedIn');
      if (loggedIn === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push('/superadmin/login');
      }
    } catch {
      setIsAuthenticated(true);
    }
  }, [pathname, isLoginPage, router]);

  // Load companies & backend data
  useEffect(() => {
    const updateCount = () => {
      const list = getStoredCompanies();
      setCompanyCount(list.length);
    };
    updateCount();
    fetchCompaniesFromBackend().then((list) => {
      setCompanyCount(list.length);
    }).catch(() => {});

    const unsub = subscribeToCompanyChanges(updateCount);
    return unsub;
  }, []);

  // Fetch employee count
  useEffect(() => {
    if (isLoginPage) return;
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    fetch(`${apiBase}/employees`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployeeCount(data.length);
        }
      })
      .catch(() => {});
  }, [pathname, isLoginPage]);

  // If this is the login page, render children directly without admin sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state while checking auth
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-700">
            Verifying Super Admin Authorization...
          </span>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('isSuperAdminLoggedIn');
      localStorage.removeItem('superAdminUser');
    } catch {}
    router.push('/superadmin/login');
  };

  const navLinks = [
    {
      name: 'Companies Management',
      href: '/superadmin/companies',
      icon: Building2,
      badge: companyCount > 0 ? `${companyCount}` : undefined,
    },
    {
      name: 'Employees & Permissions',
      href: '/superadmin/employees',
      icon: Users,
      badge: employeeCount > 0 ? `${employeeCount}` : undefined,
    },
    {
      name: 'Dashboard Overview',
      href: '/superadmin',
      icon: LayoutDashboard,
      badge: 'Live',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Strip matching official frontend */}
      <div className="top-strip z-50">
        <span>Official Super Administrator Portal</span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Server: Laravel 11 API (MySQL Connected)</span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-yellow-300 hover:text-white font-semibold transition-colors cursor-pointer border-0 bg-transparent text-xs"
          >
            <LogOut size={12} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Pure WHITE Sidebar */}
        <aside
          className={`fixed top-[32px] bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shadow-sm ${
            sidebarOpen ? 'w-64' : 'w-20'
          } ${
            mobileMenuOpen
              ? 'translate-x-0 w-64'
              : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Top Header */}
          <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4 bg-white">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-[#0b4da2] text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck size={22} className="text-yellow-400" />
              </div>
              {sidebarOpen && (
                <div className="truncate">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight m-0 leading-tight">
                    Super Admin
                  </h2>
                  <p className="text-[11px] text-[#0b4da2] font-semibold m-0 leading-tight">
                    Control Console
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer bg-transparent border-0 transition-colors"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6 bg-white">
            <div>
              {sidebarOpen && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                  Management
                </p>
              )}
              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    pathname === link.href ||
                    (link.href !== '/superadmin' && pathname.startsWith(link.href));

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      title={!sidebarOpen ? link.name : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all no-underline ${
                        isActive
                          ? 'bg-blue-50 text-[#0b4da2] border-l-4 border-[#0b4da2] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={isActive ? 'text-[#0b4da2] shrink-0' : 'text-slate-400 shrink-0'}
                      />
                      {sidebarOpen && (
                        <div className="flex-1 flex items-center justify-between truncate">
                          <span className="truncate">{link.name}</span>
                          {link.badge && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                isActive
                                  ? 'bg-[#0b4da2] text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {link.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Public Links */}
            <div>
              {sidebarOpen && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                  Public Portals
                </p>
              )}
              <nav className="space-y-1">
                <Link
                  href="/customers"
                  target="_blank"
                  title={!sidebarOpen ? 'Customers & Workers Directory' : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-[#0b4da2] hover:bg-slate-50 transition-all no-underline border-l-4 border-transparent"
                >
                  <Users size={18} className="text-slate-400 shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">Customer Directory</span>
                      <ExternalLink size={12} className="text-slate-400" />
                    </div>
                  )}
                </Link>

                <Link
                  href="/companies"
                  target="_blank"
                  title={!sidebarOpen ? 'Public Employers Directory' : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-[#0b4da2] hover:bg-slate-50 transition-all no-underline border-l-4 border-transparent"
                >
                  <Globe2 size={18} className="text-slate-400 shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">Public Employers</span>
                      <ExternalLink size={12} className="text-slate-400" />
                    </div>
                  )}
                </Link>

                <Link
                  href="/mypass"
                  target="_blank"
                  title={!sidebarOpen ? 'MYPASS Immigration System' : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-[#0b4da2] hover:bg-slate-50 transition-all no-underline border-l-4 border-transparent"
                >
                  <Shield size={18} className="text-slate-400 shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">MYPASS Portal</span>
                      <ExternalLink size={12} className="text-slate-400" />
                    </div>
                  )}
                </Link>
              </nav>
            </div>
          </div>

          {/* User Profile & Sign Out at Bottom */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <div
              className={`flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200 shadow-xs ${
                !sidebarOpen ? 'justify-center' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center font-bold text-xs shrink-0">
                SA
              </div>
              {sidebarOpen && (
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 m-0 truncate">
                      Super Admin
                    </p>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 rounded">
                      ROOT
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 m-0 truncate">
                    superadmin@admin.com
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className={`mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent transition-all cursor-pointer ${
                !sidebarOpen ? 'justify-center' : ''
              }`}
            >
              <LogOut size={15} className="shrink-0" />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-h-[calc(100vh-32px)] transition-all duration-300 ${
            sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
          }`}
        >
          {/* White Header Top Bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-[32px] z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 cursor-pointer bg-transparent border-0"
              >
                <Menu size={20} />
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Super Admin Console</span>
                <ChevronRight size={13} className="text-slate-400" />
                <span className="text-[#0b4da2] font-bold capitalize">
                  {pathname === '/superadmin'
                    ? 'Dashboard Overview'
                    : pathname.replace('/superadmin/', '').replace('-', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Backend MySQL Active</span>
              </div>

              <Link
                href="/companies"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-[#0b4da2] bg-slate-50 hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors font-semibold no-underline"
              >
                <span>Live Employer Portal</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </header>

          {/* White/Light Page Body */}
          <main className="flex-1 p-4 sm:p-8 bg-[#f8fafc]">{children}</main>

          {/* White Footer */}
          <footer className="border-t border-slate-200 bg-white py-4 px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Super Administrator Management Portal</span>
            <span className="font-mono text-[11px] text-slate-400">Laravel 11 REST API • MySQL Connected</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
