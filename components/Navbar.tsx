'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  Globe2,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage =
    pathname === '/companies' ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/mypass');

  const handleLogout = () => {
    try {
      localStorage.removeItem('isLoggedIn');
    } catch {}
    router.push('/login');
  };

  return (
    <>
      {/* Top Strip */}
      <div className="top-strip">
        <span>Official portal for Foreign Workers &amp; Employer Services</span>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Last updated: 06 September 2026</span>
          {isAuthPage && (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-yellow-300 hover:text-white font-semibold transition-colors cursor-pointer border-0 bg-transparent text-xs"
            >
              <LogOut size={12} />
              <span>Log Out</span>
            </button>
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
              href="/companies"
              onClick={() => setMenuOpen(false)}
            >
              Employers
            </Link>
            <Link
              className={pathname.startsWith('/services') ? 'active' : ''}
              href="/services"
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
            {isAuthPage ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-transparent border-0 cursor-pointer p-0"
              >
                Log Out
              </button>
            ) : (
              <Link
                className={pathname === '/login' ? 'active' : ''}
                href="/login"
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
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
