'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Accessibility,
  ArrowUpRight,
  Building2,
  ChevronDown,
  FileLock2,
  Fingerprint,
  Globe2,
  Menu,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { companies } from '@/lib/companies';

function WebLogo({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className} bg-white rounded-xl shadow-xs border border-slate-200/80 p-1 shrink-0 overflow-hidden`}>
      <img
        src="/images/registration-document.svg"
        alt="Official Portal Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

type Node = { x: number; y: number; vx: number; vy: number };

function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    const MAX_DIST = 120;

    const resize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || 300;
      height = canvas.height = canvas.parentElement?.clientHeight || 300;
    };

    const initNodes = () => {
      const count = Math.floor((width * height) / 16000);
      nodes = Array.from({ length: Math.max(count, 18) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.35;
            ctx.strokeStyle = `rgba(140, 200, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(170, 215, 255, 0.75)';
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    initNodes();
    draw();
    window.addEventListener('resize', () => { resize(); initNodes(); });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', () => { resize(); initNodes(); });
    };
  }, []);

  return <canvas ref={canvasRef} className="constellation" aria-hidden="true" />;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.sector.toLowerCase().includes(query.toLowerCase()) ||
      c.roc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="portal-shell">
      <div className="accessibility-tab" aria-label="Accessibility options"><Accessibility size={21} /></div>
      <div className="top-strip"><span>Official portal of the Malaysian Immigration Department</span><span>Last updated: 06 September 2026</span></div>

      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="Immigration Department home">
            <WebLogo />
            <span className="brand-copy"><strong>JABATAN IMIGRESEN MALAYSIA</strong><small>IMMIGRATION DEPARTMENT OF MALAYSIA</small></span>
          </Link>
          <nav className={menuOpen ? 'main-nav main-nav--open' : 'main-nav'} aria-label="Main navigation">
            <a className="active" href="#home" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#companies" onClick={() => setMenuOpen(false)}>Employers</a>
            <a href="#information" onClick={() => setMenuOpen(false)}>Information</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
            >
              Log In
            </Link>
            <button className="language-button" type="button"><Globe2 size={16} /> EN <ChevronDown size={14} /></button>
          </nav>
          <button className="menu-button" type="button" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-grid" />
        <div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" />
        <Constellation />
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> WELCOME TO THE OFFICIAL SHORTLINK PORTAL</p>
            <h1>Malaysian Immigration<br /><em>Department</em></h1>
            <p className="hero-subtitle">Official Foreign Workers Management Portal & Employer Directory</p>
            <div className="hero-actions">
              <a href="#companies" className="button button--yellow">
                Choose Employer <ArrowUpRight size={18} />
              </a>
              <a href="#information" className="text-link">
                Learn more <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="passport-stack">
              <div className="passport-card passport-card--back" />
              <div className="passport-card passport-card--front">
                <div className="passport-header">
                  <WebLogo className="w-10 h-10" />
                  <div className="passport-title"><strong>PASPORT</strong><small>MALAYSIA</small></div>
                </div>
                <div className="passport-chip"><Fingerprint size={20} /></div>
                <div className="passport-lines"><i /><i /><i /></div>
                <div className="passport-mrz">P&lt;MYS&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
              </div>
              <div className="passport-photo">
                <img
                  src="https://images.pexels.com/photos/32081456/pexels-photo-32081456.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                  alt="Passport documents"
                  loading="lazy"
                />
              </div>
              <div className="floating-pass"><Fingerprint size={32} /><small>Secure access</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="intro-section" id="information">
        <div className="container intro-content">
          <div className="section-kicker">EMPLOYER & AGENCY DIRECTORY</div>
          <h2>Verified Employers.<br /><span>Direct Quota Access.</span></h2>
          <p>Select your registered Malaysian company to sign in and manage foreign worker permits, special passes, and medical records.</p>
        </div>
        <div className="intro-stat">
          <strong>6</strong>
          <span>registered employers</span>
        </div>
      </section>

      {/* 6 Company Cards in 3-column Tailwind CSS grid */}
      <section className="bg-[#f7f9fb] py-16 md:py-20" id="companies">
        <div className="w-full max-w-[1180px] mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
            <div>
              <p className="text-[#2b74c9] text-[11px] font-bold tracking-[0.15em] mb-2 uppercase">
                REGISTERED EMPLOYERS & AGENCIES
              </p>
              <h2 className="text-[#1a283c] text-3xl md:text-4xl font-extrabold tracking-tight m-0">
                Choose your company
              </h2>
            </div>
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 w-full sm:w-72 text-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by company or sector"
                aria-label="Search companies"
                className="border-0 bg-transparent text-slate-800 text-xs outline-none w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {filteredCompanies.map((company, index) => (
              <Link
                href={`/login?company=${encodeURIComponent(company.id)}`}
                id={`company-card-${index}`}
                key={company.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="group relative flex flex-col items-center text-center bg-white border border-slate-200/90 rounded-[20px] p-8 md:p-9 shadow-[0_4px_20px_rgba(18,38,70,0.05)] hover:shadow-[0_16px_36px_rgba(18,55,110,0.12)] hover:border-blue-400 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer min-h-[310px] outline-none focus-visible:ring-2 focus-visible:ring-blue-600 no-underline"
              >
                {/* Company Logo Wrap */}
                <div className="flex items-center justify-center h-[115px] w-full mb-4 pointer-events-none">
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="max-h-[105px] max-w-[160px] w-auto h-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                    loading="lazy"
                  />
                </div>

                {/* Company Info */}
                <div className="flex flex-col items-center flex-1 justify-start w-full pointer-events-none">
                  <div className="flex flex-col items-center gap-1.5 justify-center pointer-events-none">
                    <h3 className="text-[17px] font-bold text-slate-900 leading-snug m-0 pointer-events-none group-hover:text-[#0b4da2] transition-colors">
                      {company.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                      <span className="inline-block bg-blue-50 border border-blue-200 text-[#0b4da2] text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase pointer-events-none">
                        {company.sector}
                      </span>
                      {company.tag && (
                        <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase pointer-events-none">
                          {company.tag}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[13px] text-slate-500 leading-relaxed mt-2.5 max-w-[280px] pointer-events-none">
                    {company.description}
                  </p>

                  <div className="mt-auto pt-4 flex items-center justify-between w-full border-t border-slate-100 text-xs text-slate-500">
                    <span className="font-mono text-[11px] text-slate-400">
                      {company.roc}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0b4da2] group-hover:translate-x-1 transition-transform">
                      Login Portal <ArrowUpRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredCompanies.length === 0 && (
            <div className="text-slate-500 py-12 text-center text-sm w-full">
              No registered employer found matching your search.
            </div>
          )}
        </div>
      </section>

      <section className="trust-section">
        <div className="container trust-inner">
          <div className="trust-icon"><FileLock2 size={28} /></div>
          <div>
            <p className="section-kicker">OFFICIAL AND SECURE</p>
            <h2>Your company records are protected.</h2>
            <p>Direct integration with the Malaysian Immigration Department (Jabatan Imigresen Malaysia) for verified employer quota & foreign worker processing.</p>
          </div>
          <a href="#contact" className="button button--outline">Security information <ArrowUpRight size={17} /></a>
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div className="container footer-top">
          <div className="footer-brand">
            <Link className="brand brand--footer" href="/">
              <WebLogo />
              <span className="brand-copy">
                <strong>JABATAN IMIGRESEN MALAYSIA</strong>
                <small>IMMIGRATION DEPARTMENT OF MALAYSIA</small>
              </span>
            </Link>
            <p>Official digital access to the Immigration Department of Malaysia.</p>
          </div>
          <div className="footer-links">
            <div>
              <h3>Employers</h3>
              <a href="#companies">All Companies</a>
              <a href="#information">Information</a>
              <a href="#home">Accessibility</a>
            </div>
            <div>
              <h3>Need help?</h3>
              <a href="#contact">Contact support</a>
              <a href="#contact">FAQ</a>
              <a href="#contact">Privacy policy</a>
            </div>
          </div>
          <div className="jobs-card">
            <div className="jobs-icon"><Building2 size={22} /></div>
            <div>
              <span>CAREERS</span>
              <h3>Join our team</h3>
              <p>Explore opportunities with us.</p>
            </div>
            <a href="#contact" aria-label="Apply for a job"><ArrowUpRight size={18} /></a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Immigration Department of Malaysia. All rights reserved.</span>
          <span>Built for a safer, simpler digital experience.</span>
        </div>
      </footer>
    </main>
  );
}
