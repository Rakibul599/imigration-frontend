'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  Globe2,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { companies, Company } from '@/lib/companies';

// Background Constellation & Ambient Mesh Animation
type Node = { x: number; y: number; vx: number; vy: number };

function BackgroundCanvas() {
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
    const MAX_DIST = 140;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const initNodes = () => {
      const count = Math.floor((width * height) / 22000);
      nodes = Array.from({ length: Math.max(count, 22) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
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
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
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
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    initNodes();
    draw();
    window.addEventListener('resize', () => {
      resize();
      initNodes();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', () => {
        resize();
        initNodes();
      });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-70"
      aria-hidden="true"
    />
  );
}

export default function CompaniesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [companyList, setCompanyList] = useState<Company[]>(companies);
  const [sortAsc, setSortAsc] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState<Company | null>(null);
  const [showSubscriptionAlert, setShowSubscriptionAlert] = useState(false);

  // New company form state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyRoc, setNewCompanyRoc] = useState('');
  const [newCompanySector, setNewCompanySector] = useState('');

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    const newComp: Company = {
      id: newCompanyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: newCompanyName.toUpperCase(),
      roc: newCompanyRoc.trim() || `ROC-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      sector: newCompanySector.trim() || 'General Commercial & Services',
      description: 'Newly registered employer entity within the Malaysian Immigration portal.',
      logo: '/images/companies/gamuda.svg',
      tag: 'New Registration',
      totalWorkers: 0,
    };

    setCompanyList((prev) => [newComp, ...prev]);
    setNewCompanyName('');
    setNewCompanyRoc('');
    setNewCompanySector('');
    setShowCreateModal(false);
  };

  const toggleSort = () => {
    setSortAsc(!sortAsc);
  };

  const filtered = companyList
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.roc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.sector.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortAsc) return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

  const handleLogOut = () => {
    try {
      localStorage.removeItem('isLoggedIn');
    } catch {}
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Background Animated Elements */}
      <BackgroundCanvas />

      {/* Floating Animated Gradient Orbs in Background */}
      <div
        className="fixed top-12 left-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '8s' }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-10 right-10 w-[420px] h-[420px] bg-emerald-200/20 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '10s' }}
        aria-hidden="true"
      />

      {/* Shared Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <div className="w-full max-w-[1200px] mx-auto px-6 py-8 sm:py-10 flex-1 relative z-10">
        {/* Page Title with Underline */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-normal text-slate-800 tracking-tight m-0">
            Please select a company
          </h1>
          <div className="w-full border-b border-slate-200 mt-4" />
        </div>

        {/* Subscription Alert (if clicked) */}
        {showSubscriptionAlert && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 flex items-center justify-between gap-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <Sparkles className="text-blue-600 shrink-0" size={18} />
              <span>
                <strong>Subscription Portal Active:</strong> Enterprise multi-entity license valid through 2026. All company quotas and foreign worker biometric records verified.
              </span>
            </div>
            <button
              onClick={() => setShowSubscriptionAlert(false)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search Row */}
        <div className="flex items-center justify-end mb-5">

          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* The Table Matching User Screenshot */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#22a34a] text-white text-xs font-bold">
                <th
                  onClick={toggleSort}
                  className="py-3 px-4 border-r border-green-600/60 cursor-pointer select-none hover:bg-[#1f9343] transition-colors w-[60%]"
                >
                  <div className="flex items-center justify-between">
                    <span>Company Name</span>
                    <span className="text-sm leading-none font-bold">
                      {sortAsc ? '↑' : '↓'}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-green-600/60 font-bold w-[25%]">
                  Remark
                </th>
                <th className="py-3 px-4 text-center font-bold w-[15%]">
                  {/* Empty header matching screenshot */}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-blue-50/40 transition-colors group"
                >
                  {/* Company Name as Blue Clickable Link */}
                  <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                    <Link
                      href={`/services?company=${encodeURIComponent(company.id)}`}
                      className="text-[#2563eb] hover:text-[#1d4ed8] hover:underline font-semibold text-[13px] tracking-tight block"
                    >
                      {company.name}
                    </Link>
                  </td>

                  {/* Remark Column */}
                  <td className="py-3.5 px-4 border-r border-slate-200 text-slate-500 align-middle">
                    {company.sector ? (
                      <span className="text-slate-600 text-[11px] font-medium">
                        {company.sector}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Action Buttons: Details & Settings matching screenshot icons */}
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/services?company=${encodeURIComponent(company.id)}`}
                        title="View Digital Service Cards"
                        className="w-9 h-8 rounded border border-slate-400/80 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        <BookOpen size={16} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(company)}
                        title="Company Settings"
                        className="w-9 h-8 rounded border border-slate-400/80 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-10 text-center text-slate-400 font-medium"
                  >
                    No company found matching &quot;{searchTerm}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Create New Company
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Register a new employer organization in the digital portal.
            </p>
            <form onSubmit={handleCreateCompany} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NATASHA ENGINEERING SDN. BHD."
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ROC Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ROC-202601099234"
                  value={newCompanyRoc}
                  onChange={(e) => setNewCompanyRoc(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Industry / Sector
                </label>
                <input
                  type="text"
                  placeholder="e.g. Civil & Building Construction"
                  value={newCompanySector}
                  onChange={(e) => setNewCompanySector(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0"
                >
                  Add Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowSettingsModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Settings size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  {showSettingsModal.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {showSettingsModal.roc}
                </p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Industry Sector:</span>
                <strong className="text-slate-800">{showSettingsModal.sector}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quota Status:</span>
                <span className="text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded">
                  {showSettingsModal.tag || 'Verified JIM'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Workers:</span>
                <strong className="text-slate-800">
                  {showSettingsModal.totalWorkers.toLocaleString()}
                </strong>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/services?company=${encodeURIComponent(showSettingsModal.id)}`}
                className="px-4 py-2 bg-[#0b4da2] hover:bg-[#083c80] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer no-underline"
              >
                Open Service Cards
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Shared Footer */}
      <Footer />
    </main>
  );
}
