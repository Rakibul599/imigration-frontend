'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Globe2,
  Lock,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AuthUser,
  getCurrentUser,
  isAuthenticated,
  logoutUser,
} from '@/lib/auth';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isLoginActive =
    pathname === '/login' || pathname.startsWith('/superadmin/login');

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 180);
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setDropdownOpen(false);
    setMenuOpen(false);
    router.push('/login');
  };

  // Sync real authentication state across navigation and storage events
  useEffect(() => {
    const syncAuth = () => {
      const user = getCurrentUser();
      const authed = isAuthenticated();
      setIsLoggedIn(authed);
      setCurrentUser(user);
    };

    syncAuth();
    window.addEventListener('portal-auth-change', syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener('portal-auth-change', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Top Strip */}
      <div className="top-strip">
        <span>Official portal for Foreign Workers &amp; Employer Services</span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Last updated: 06 September 2026</span>
          <Link
            href="/superadmin/login"
            className="inline-flex items-center gap-1 text-emerald-300 hover:text-white font-semibold transition-colors no-underline text-xs"
          >
            <ShieldCheck size={12} />
            <span>Super Admin</span>
          </Link>
          {isLoggedIn && currentUser && (
            <div className="flex items-center gap-2 border-l border-white/20 pl-3">
              <span className="text-emerald-300 font-semibold text-xs">
                {currentUser.name} ({currentUser.role})
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-yellow-300 hover:text-white font-semibold transition-colors cursor-pointer border-0 bg-transparent text-xs"
              >
                <LogOut size={12} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Header */}
      <header className="site-header">
        <div className="container header-inner">
          {/* Left Side is Completely Blank as Requested */}
          <div className="w-8 shrink-0 pointer-events-none" aria-hidden="true" />

          {/* Right Side Navigation */}
          <nav
            className={menuOpen ? 'main-nav main-nav--open' : 'main-nav'}
            aria-label="Main navigation"
          >
            <Link
              className={pathname === '/' ? 'active' : ''}
              href="/"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              className={pathname.startsWith('/companies') ? 'active' : ''}
              href={isLoggedIn ? '/companies' : '/login?redirect=/companies&error=auth_required'}
              onClick={() => setMenuOpen(false)}
            >
              Companies
            </Link>
            <Link
              className={pathname.startsWith('/services') ? 'active' : ''}
              href={isLoggedIn ? '/services' : '/login?redirect=/services&error=auth_required'}
              onClick={() => setMenuOpen(false)}
            >
              Services
            </Link>
            <a href="/#information" onClick={() => setMenuOpen(false)}>
              Information
            </a>
            <a href="/#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>

            {/* Authentication state in navbar */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100/90 px-3 py-1.5 rounded-full border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-800 max-w-[140px] truncate">
                    {currentUser?.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    ({currentUser?.role})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200/80 transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Hover Dropdown */}
                <div
                  ref={dropdownRef}
                  className="relative hidden min-[701px]:flex items-center h-full group"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className={`nav-dropdown-trigger ${isLoginActive ? 'active' : ''}`}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                  >
                    <span>Log In</span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${
                        dropdownOpen ? 'rotate-180 text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
                      }`}
                    />
                  </button>

                  {/* Dropdown Card */}
                  <div
                    className={`nav-dropdown absolute top-[calc(100%-6px)] right-0 w-[320px] bg-white rounded-xl shadow-[0_16px_40px_rgba(8,38,87,0.16)] border border-slate-200/80 p-2.5 z-50 transition-all duration-200 ${
                      dropdownOpen
                        ? 'opacity-100 visible translate-y-0 pointer-events-auto'
                        : 'opacity-0 invisible -translate-y-2 pointer-events-none'
                    }`}
                  >
                    {/* Transparent hover bridge */}
                    <div className="absolute -top-3 left-0 w-full h-3" />

                    {/* Header */}
                    <div className="px-3 pt-1.5 pb-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center justify-between border-b border-slate-100 mb-1.5">
                      <span>Portal Access</span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold lowercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        online
                      </span>
                    </div>

                    {/* 1. Employer & Worker Portal (Normal Login) */}
                    <Link
                      href="/login"
                      onClick={() => {
                        setDropdownOpen(false);
                        setMenuOpen(false);
                      }}
                      className="nav-dropdown-item flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50/70 transition-all duration-150 group/item border border-transparent hover:border-blue-100/80 no-underline"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors shadow-sm">
                        <Users size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-bold text-slate-800 group-hover/item:text-blue-700 transition-colors">
                            Employer &amp; Worker Portal
                          </span>
                          <ChevronRight
                            size={13}
                            className="text-slate-300 group-hover/item:text-blue-600 group-hover/item:translate-x-0.5 transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-tight font-normal">
                          For foreign workers, employers &amp; agency staff
                        </p>
                      </div>
                    </Link>

                    <div className="my-1 border-t border-slate-100" />

                    {/* 2. Super Admin Console */}
                    <Link
                      href="/superadmin/login"
                      onClick={() => {
                        setDropdownOpen(false);
                        setMenuOpen(false);
                      }}
                      className="nav-dropdown-item flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50/70 transition-all duration-150 group/item border border-transparent hover:border-emerald-100/80 no-underline"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors shadow-sm">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-bold text-slate-800 group-hover/item:text-emerald-700 transition-colors">
                            Super Admin Console
                          </span>
                          <ChevronRight
                            size={13}
                            className="text-slate-300 group-hover/item:text-emerald-600 group-hover/item:translate-x-0.5 transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-tight font-normal">
                          Master administrative control &amp; system governance
                        </p>
                      </div>
                    </Link>

                    {/* Dropdown Footer */}
                    <div className="mt-2 pt-2 px-3 pb-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Lock size={10} className="text-slate-400" /> 256-bit SSL Encrypted
                      </span>
                      <span className="text-slate-400 font-medium">Official Access</span>
                    </div>
                  </div>
                </div>

                {/* Mobile View Navigation Items for Login */}
                <div className="min-[701px]:hidden border-t border-slate-100 pt-3 pb-2 mt-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    Portal Login
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className={`nav-dropdown-item flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                        pathname === '/login'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-slate-50/80 border-slate-200/60 text-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Users size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold leading-tight">Employer &amp; Worker Portal</div>
                        <div className="text-[10px] text-slate-500 leading-tight">Clients, workers &amp; employers</div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </Link>

                    <Link
                      href="/superadmin/login"
                      onClick={() => setMenuOpen(false)}
                      className={`nav-dropdown-item flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                        pathname.startsWith('/superadmin')
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50/80 border-slate-200/60 text-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold leading-tight">Super Admin Console</div>
                        <div className="text-[10px] text-slate-500 leading-tight">Master administration</div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* Mobile View: if logged in, show user info and logout inside mobile drawer */}
            {isLoggedIn && (
              <div className="min-[701px]:hidden border-t border-slate-100 pt-3 pb-2 mt-2">
                <div className="flex items-center justify-between px-1 mb-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{currentUser?.name}</div>
                    <div className="text-[10px] text-slate-500">{currentUser?.email} ({currentUser?.role})</div>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded border border-rose-200"
                  >
                    <LogOut size={12} /> Log Out
                  </button>
                </div>
              </div>
            )}

            <button className="language-button" type="button">
              <Globe2 size={16} /> EN <ChevronDown size={14} />
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="menu-button"
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
    </>
  );
}
