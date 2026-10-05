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
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  fetchCompaniesFromBackend,
  getStoredCompanies,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';
import { getMasterAdminUser, logoutMasterAdmin, AuthUser, getCurrentUser } from '@/lib/auth';
import {
  getStoredSettings,
  fetchSiteSettings,
  subscribeToSettingsChanges,
  applySidebarStyling,
  DEFAULT_SIDEBAR_STYLING,
  SiteSettings,
  isColorDark,
} from '@/lib/settingsStorage';

export default function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/masteradmin/login';

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [permittedCompanyCount, setPermittedCompanyCount] = useState<number>(0);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SIDEBAR_STYLING as any);

  // Subscribe to site and sidebar styling settings
  useEffect(() => {
    if (isLoginPage) return;
    const current = getStoredSettings();
    setSiteSettings(current);
    applySidebarStyling(current);

    fetchSiteSettings()
      .then((data) => {
        setSiteSettings(data);
        applySidebarStyling(data);
      })
      .catch(() => {});

    const unsub = subscribeToSettingsChanges((newSettings) => {
      setSiteSettings(newSettings);
      applySidebarStyling(newSettings);
    });
    return unsub;
  }, [isLoginPage]);

  // Check master admin auth
  useEffect(() => {
    if (isLoginPage) {
      setIsAuth(true);
      return;
    }

    try {
      const portalUser = getCurrentUser();
      if (portalUser?.role === 'Employee') {
        setIsAuth(false);
        router.replace('/companies?error=masteradmin_access_denied');
        return;
      }

      const loggedIn = localStorage.getItem('isMasterAdminLoggedIn');
      const user = getMasterAdminUser();

      if (loggedIn === 'true' && user && user.role === 'MasterAdmin') {
        setIsAuth(true);
        setCurrentUser(user);
      } else {
        setIsAuth(false);
        router.push('/masteradmin/login');
      }
    } catch {
      setIsAuth(false);
      router.push('/masteradmin/login');
    }
  }, [pathname, isLoginPage, router]);

  // Load companies and filter permitted count
  useEffect(() => {
    if (isLoginPage) return;

    const calculatePermitted = () => {
      const all = getStoredCompanies();
      const user = getMasterAdminUser();
      if (!user) {
        setPermittedCompanyCount(0);
        return;
      }
      const allowed = Array.isArray(user.assigned_companies) ? user.assigned_companies : [];
      const permitted = all.filter((c) =>
        allowed.some((id) => id.toLowerCase() === c.id.toLowerCase())
      );
      setPermittedCompanyCount(permitted.length);
    };

    calculatePermitted();
    fetchCompaniesFromBackend().then(() => {
      calculatePermitted();
    }).catch(() => {});

    const unsub = subscribeToCompanyChanges(calculatePermitted);
    return unsub;
  }, [isLoginPage]);

  // Fetch employees count in scope
  useEffect(() => {
    if (isLoginPage) return;
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    fetch(`${apiBase}/employees`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const user = getMasterAdminUser();
          const scope = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
          const inScope = data.filter((emp) => {
            const assigned = Array.isArray(emp.assigned_companies) ? emp.assigned_companies : [];
            return emp.role === 'Admin' || assigned.some((cId: string) => scope.some((sId) => sId.toLowerCase() === cId.toLowerCase()));
          });
          setEmployeeCount(inScope.length);
        }
      })
      .catch(() => {});

    // Fetch customers count in scope
    fetch(`${apiBase}/customers`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const user = getMasterAdminUser();
          const scope = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
          const inScope = data.filter((cust) => {
            const cId = cust.company_id;
            return Boolean(cId && scope.some((sId) => sId.toLowerCase() === cId.toLowerCase()));
          });
          setCustomerCount(inScope.length);
        }
      })
      .catch(() => {});
  }, [pathname, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state while checking auth
  if (isAuth === false) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-700">
            Verifying Master Administrator Authorization...
          </span>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logoutMasterAdmin();
    router.push('/masteradmin/login');
  };

  const navLinks = [
    {
      name: 'Dashboard Overview',
      href: '/masteradmin',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      name: 'Companies Management',
      href: '/masteradmin/companies',
      icon: Building2,
      badge: permittedCompanyCount > 0 ? `${permittedCompanyCount}` : undefined,
    },
    {
      name: 'Employees & Permissions',
      href: '/masteradmin/employees',
      icon: Users,
      badge: employeeCount > 0 ? `${employeeCount}` : undefined,
    },
    {
      name: 'Customer Management',
      href: '/masteradmin/customers',
      icon: UserCheck,
      badge: customerCount > 0 ? `${customerCount}` : undefined,
    },
    {
      name: 'Services Portal',
      href: '/companies',
      icon: Sparkles,
      badge: 'Cards',
    },
    {
      name: 'Change Password',
      href: '/masteradmin/change-password',
      icon: KeyRound,
      badge: 'Account',
    },
  ];

  const assignedList = currentUser?.assigned_companies || [];

  const sidebarBg = siteSettings.sidebar_bg_color || DEFAULT_SIDEBAR_STYLING.sidebar_bg_color;
  const sidebarText = siteSettings.sidebar_text_color || DEFAULT_SIDEBAR_STYLING.sidebar_text_color;
  const sidebarActiveBg = siteSettings.sidebar_active_bg_color || DEFAULT_SIDEBAR_STYLING.sidebar_active_bg_color;
  const sidebarActiveText = siteSettings.sidebar_active_text_color || DEFAULT_SIDEBAR_STYLING.sidebar_active_text_color;
  const sidebarBorder = siteSettings.sidebar_border_color || DEFAULT_SIDEBAR_STYLING.sidebar_border_color;
  const isDarkSidebar = isColorDark(sidebarBg);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans overflow-x-hidden">
      {/* Top Strip matching official frontend */}
      <div className="top-strip z-50">
        <span>Official Master Administrator Portal</span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Scope: {assignedList.length} Permitted Companies</span>
          <Link
            href="/companies"
            className="inline-flex items-center gap-1 text-amber-300 hover:text-white font-bold transition-colors no-underline text-xs"
          >
            <Sparkles size={12} />
            <span>Employer Services</span>
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-yellow-300 hover:text-white font-semibold transition-colors cursor-pointer border-0 bg-transparent text-xs"
          >
            <LogOut size={12} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex relative min-w-0 max-w-full">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Dynamic Styled Sidebar */}
        <aside
          style={{
            backgroundColor: sidebarBg,
            borderColor: sidebarBorder,
          }}
          className={`fixed top-[32px] bottom-0 left-0 z-50 flex flex-col border-r transition-all duration-300 shadow-sm ${
            sidebarOpen ? 'w-64' : 'w-20'
          } ${
            mobileMenuOpen
              ? 'translate-x-0 w-64'
              : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Top Header */}
          <div
            style={{
              backgroundColor: sidebarBg,
              borderBottomColor: sidebarBorder,
            }}
            className="h-16 border-b flex items-center justify-between px-4"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-[#0b4da2] text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldAlert size={22} className="text-yellow-400" />
              </div>
              {sidebarOpen && (
                <div className="truncate">
                  <h2
                    style={{ color: isDarkSidebar ? '#f8fafc' : '#0f172a' }}
                    className="text-xs font-bold uppercase tracking-tight m-0 leading-tight"
                  >
                    Master Admin
                  </h2>
                  <p
                    style={{ color: isDarkSidebar ? '#93c5fd' : '#0b4da2' }}
                    className="text-[11px] font-semibold m-0 leading-tight"
                  >
                    Control Console
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: sidebarText }}
              className="lg:hidden p-1 cursor-pointer bg-transparent border-0 opacity-70 hover:opacity-100"
            >
              <X size={18} />
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ color: sidebarText }}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer bg-transparent border-0 transition-colors opacity-70 hover:opacity-100"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
          </div>

          {/* Navigation Items */}
          <div
            style={{ backgroundColor: sidebarBg }}
            className="flex-1 overflow-y-auto py-5 px-3 space-y-6"
          >
            <div>
              {sidebarOpen && (
                <p
                  style={{
                    color: isDarkSidebar ? 'rgba(255,255,255,0.45)' : sidebarText,
                    opacity: isDarkSidebar ? 1 : 0.7,
                  }}
                  className="text-[10px] font-bold uppercase tracking-wider px-3 mb-2"
                >
                  Management
                </p>
              )}
              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    pathname === link.href ||
                    (link.href === '/masteradmin/companies' && pathname.startsWith('/masteradmin/companies')) ||
                    (link.href !== '/masteradmin' && pathname.startsWith(link.href));

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      title={!sidebarOpen ? link.name : undefined}
                      style={{
                        backgroundColor: isActive ? sidebarActiveBg : 'transparent',
                        color: isActive ? sidebarActiveText : sidebarText,
                        borderLeftColor: isActive ? sidebarActiveText : 'transparent',
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all no-underline border-l-4 shadow-2xs hover:opacity-90`}
                    >
                      <Icon
                        size={18}
                        style={{ color: isActive ? sidebarActiveText : sidebarText }}
                        className="shrink-0"
                      />
                      {sidebarOpen && (
                        <div className="flex-1 flex items-center justify-between truncate">
                          <span className="truncate">{link.name}</span>
                          {link.badge && (
                            <span
                              style={{
                                backgroundColor: isActive ? sidebarActiveText : isDarkSidebar ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                                color: isActive ? '#ffffff' : sidebarText,
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
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

            {/* Public Portals Link matching Super Admin */}
            <div>
              {sidebarOpen && (
                <p
                  style={{
                    color: isDarkSidebar ? 'rgba(255,255,255,0.45)' : sidebarText,
                    opacity: isDarkSidebar ? 1 : 0.7,
                  }}
                  className="text-[10px] font-bold uppercase tracking-wider px-3 mb-2"
                >
                  Public Portals
                </p>
              )}
              <nav className="space-y-1">
                <Link
                  href="/customers"
                  target="_blank"
                  title={!sidebarOpen ? 'Customers & Workers Directory' : undefined}
                  style={{ color: sidebarText }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium hover:opacity-80 transition-all no-underline border-l-4 border-transparent"
                >
                  <Users size={18} style={{ color: sidebarText, opacity: 0.8 }} className="shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">Customer Directory</span>
                      <ExternalLink size={12} style={{ color: sidebarText, opacity: 0.6 }} />
                    </div>
                  )}
                </Link>

                <Link
                  href="/companies"
                  target="_blank"
                  title={!sidebarOpen ? 'Public Employers Directory' : undefined}
                  style={{ color: sidebarText }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium hover:opacity-80 transition-all no-underline border-l-4 border-transparent"
                >
                  <Globe2 size={18} style={{ color: sidebarText, opacity: 0.8 }} className="shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">Public Employers</span>
                      <ExternalLink size={12} style={{ color: sidebarText, opacity: 0.6 }} />
                    </div>
                  )}
                </Link>

                <Link
                  href="/mypass"
                  target="_blank"
                  title={!sidebarOpen ? 'MYPASS Immigration System' : undefined}
                  style={{ color: sidebarText }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium hover:opacity-80 transition-all no-underline border-l-4 border-transparent"
                >
                  <Shield size={18} style={{ color: sidebarText, opacity: 0.8 }} className="shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">MYPASS Portal</span>
                      <ExternalLink size={12} style={{ color: sidebarText, opacity: 0.6 }} />
                    </div>
                  )}
                </Link>
              </nav>
            </div>
          </div>

          {/* User Profile & Sign Out at Bottom matching Super Admin */}
          <div
            style={{
              backgroundColor: sidebarBg,
              borderTopColor: sidebarBorder,
            }}
            className="p-3 border-t"
          >
            <div
              style={{
                backgroundColor: isDarkSidebar ? 'rgba(255,255,255,0.06)' : '#ffffff',
                borderColor: sidebarBorder,
              }}
              className={`flex items-center gap-3 p-2 rounded-xl border shadow-xs ${
                !sidebarOpen ? 'justify-center' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center font-bold text-xs shrink-0">
                MA
              </div>
              {sidebarOpen && (
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-1.5">
                    <p
                      style={{ color: isDarkSidebar ? '#f8fafc' : '#0f172a' }}
                      className="text-xs font-bold m-0 truncate"
                    >
                      {currentUser?.name || 'Master Admin'}
                    </p>
                    <span className="text-[9px] bg-blue-100 text-[#0b4da2] font-bold px-1 py-0.2 rounded">
                      SCOPE: {assignedList.length}
                    </span>
                  </div>
                  <p
                    style={{ color: sidebarText, opacity: 0.7 }}
                    className="text-[10px] m-0 truncate font-mono"
                  >
                    @{currentUser?.username || currentUser?.employee_code || 'masteradmin'}
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
          className={`flex-1 flex flex-col min-h-[calc(100vh-32px)] min-w-0 max-w-full overflow-x-hidden transition-all duration-300 ${
            sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
          }`}
        >
          {/* Header Bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-[32px] z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 cursor-pointer bg-transparent border-0"
              >
                <Menu size={20} />
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Master Admin Console</span>
                <ChevronRight size={13} className="text-slate-400" />
                <span className="text-[#0b4da2] font-bold capitalize">
                  {pathname === '/masteradmin'
                    ? 'Dashboard Overview'
                    : pathname.replace('/masteradmin/', '').replace('-', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-200 text-[#0b4da2] text-xs px-3 py-1.5 rounded-full font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#0b4da2] animate-pulse" />
                <span>{assignedList.length} Assigned Companies</span>
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

          {/* Main Page Content */}
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden p-4 sm:p-8 bg-[#f8fafc]">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white py-4 px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Master Administrator Management Console</span>
            <span className="font-mono text-[11px] text-slate-400">
              Restricted Multi-Tenant Access • Company Creation Disabled
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
