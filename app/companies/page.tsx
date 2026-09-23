'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Globe2,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Company } from '@/lib/companies';
import {
  AuthUser,
  getCurrentUser,
  logoutUser,
} from '@/lib/auth';
import {
  deleteStoredCompany,
  fetchCompaniesFromBackend,
  getStoredCompanies,
  saveStoredCompany,
  subscribeToCompanyChanges,
  updateStoredCompany,
} from '@/lib/companyStorage';

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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyList, setCompanyList] = useState<Company[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState<Company | null>(null);
  const [showSubscriptionAlert, setShowSubscriptionAlert] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Edit / Settings Form State
  const [editName, setEditName] = useState('');
  const [editRoc, setEditRoc] = useState('');
  const [editSector, setEditSector] = useState('');

  // Sync with persistent company storage, backend MySQL, and auth
  useEffect(() => {
    const user = getCurrentUser();
    const loggedIn =
      typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';

    if (!user || !loggedIn) {
      router.replace('/login?redirect=/companies&error=auth_required');
      return;
    }

    setCurrentUser(user);
    setIsAuthChecking(false);
    setCompanyList(getStoredCompanies());
    fetchCompaniesFromBackend()
      .then((list) => {
        setCompanyList(list);
      })
      .catch(() => {});

    const unsubscribe = subscribeToCompanyChanges(() => {
      setCompanyList(getStoredCompanies());
    });

    const handleAuth = () => {
      const updatedUser = getCurrentUser();
      if (!updatedUser) {
        router.replace('/login?redirect=/companies&error=auth_required');
        return;
      }
      setCurrentUser(updatedUser);
    };
    window.addEventListener('portal-auth-change', handleAuth);
    window.addEventListener('storage', handleAuth);

    return () => {
      unsubscribe();
      window.removeEventListener('portal-auth-change', handleAuth);
      window.removeEventListener('storage', handleAuth);
    };
  }, [router]);

  // Permission evaluation
  const isEmployeeRole = currentUser?.role === 'Employee';
  const userCanCreate = !isEmployeeRole || Boolean(currentUser?.permissions?.can_create);
  const userCanEdit = !isEmployeeRole || Boolean(currentUser?.permissions?.can_edit);
  const userCanDelete = !isEmployeeRole || Boolean(currentUser?.permissions?.can_delete);

  // Filter companies: strictly restrict for employees to their assigned_companies
  const accessibleCompanies = isEmployeeRole
    ? companyList.filter((c) => {
        const assigned = currentUser?.assigned_companies || [];
        return assigned.some(
          (id) =>
            id.toLowerCase() === c.id.toLowerCase() ||
            c.name.toLowerCase().includes(id.toLowerCase())
        );
      })
    : companyList;

  // New company form state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyRoc, setNewCompanyRoc] = useState('');
  const [newCompanySector, setNewCompanySector] = useState('');

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCanCreate) {
      alert('Permission Denied: You do not have permission to create companies.');
      return;
    }
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

    const updated = await saveStoredCompany(newComp);
    setCompanyList(updated);
    setNewCompanyName('');
    setNewCompanyRoc('');
    setNewCompanySector('');
    setShowCreateModal(false);
    setActionFeedback({
      type: 'success',
      message: `Company "${newComp.name}" registered successfully.`,
    });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const openSettingsModal = (company: Company) => {
    setShowSettingsModal(company);
    setEditName(company.name);
    setEditRoc(company.roc);
    setEditSector(company.sector);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSettingsModal || !userCanEdit) return;

    const updatedCompany: Company = {
      ...showSettingsModal,
      name: editName.trim() || showSettingsModal.name,
      roc: editRoc.trim() || showSettingsModal.roc,
      sector: editSector.trim() || showSettingsModal.sector,
    };

    const updated = await updateStoredCompany(updatedCompany);
    setCompanyList(updated);
    setShowSettingsModal(null);
    setActionFeedback({
      type: 'success',
      message: `Company "${updatedCompany.name}" updated successfully.`,
    });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!userCanDelete) {
      alert('Permission Denied: You do not have permission to delete companies.');
      return;
    }
    if (!confirm(`Are you sure you want to remove "${companyName}"? This action is permanent.`)) {
      return;
    }

    const updated = await deleteStoredCompany(companyId);
    setCompanyList(updated);
    setShowSettingsModal(null);
    setActionFeedback({
      type: 'info',
      message: `Company "${companyName}" has been deleted.`,
    });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const toggleSort = () => {
    setSortAsc(!sortAsc);
  };

  const filtered = accessibleCompanies
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
    logoutUser();
    router.push('/login');
  };

  if (isAuthChecking || !currentUser) {
    return (
      <main className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center text-slate-800 p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200/80 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 m-0">Verifying Security Clearance...</h2>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Authentication required to access Company Directory. Redirecting to login...
            </p>
          </div>
        </div>
      </main>
    );
  }

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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-normal text-slate-800 tracking-tight m-0">
              Please select a company
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authorized employer entities registered with Malaysian Foreign Worker Portal.
            </p>
          </div>

          {currentUser && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-600" />
                <span>{currentUser.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">({currentUser.role})</span>
              </span>
              <button
                onClick={handleLogOut}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer bg-white"
                title="Log out of session"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
        <div className="w-full border-b border-slate-200 mb-6" />

        {/* Employee Access Restriction Banner */}
        {isEmployeeRole && (
          <div className="mb-6 bg-white border border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    Employee Access Control Active
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-medium">
                    ID: {currentUser?.employee_code}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  Logged in as: {currentUser?.name}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    ({currentUser?.email})
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-600">
                  <span className="font-medium">
                    Assigned Clearance:{' '}
                    <strong className="text-emerald-700 font-bold">
                      {accessibleCompanies.length}
                    </strong>{' '}
                    of{' '}
                    <strong className="text-slate-700">
                      {companyList.length}
                    </strong>{' '}
                    total companies
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500">Your Permissions:</span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        userCanCreate
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400 line-through'
                      }`}
                    >
                      Create
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        userCanEdit
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-400 line-through'
                      }`}
                    >
                      Edit
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        userCanDelete
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-400 line-through'
                      }`}
                    >
                      Delete
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/superadmin/employees"
                className="text-xs text-slate-600 hover:text-blue-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors no-underline font-medium"
              >
                Admin Config
              </Link>
            </div>
          </div>
        )}

        {/* Administrator Full Access Banner */}
        {!isEmployeeRole && currentUser && (
          <div className="mb-6 bg-blue-50/90 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#0b4da2] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2.5 py-0.5 rounded-md">
                    Administrator Full Access Active
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-medium">
                    ID: {currentUser.employee_code || 'ADMIN'}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  Logged in as: {currentUser.name}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    ({currentUser.email})
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Viewing all <strong>{accessibleCompanies.length}</strong> employer companies. You have full create, edit, and delete permissions.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer border-0"
              >
                <Plus size={14} />
                <span>Create Company</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            className={`mb-5 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={15} />
            </button>
          </div>
        )}

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

        {/* Controls Row: Add Company (if permitted) & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            {userCanCreate ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer border-0"
              >
                <Plus size={15} />
                <span>Add Company</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                <ShieldAlert size={13} className="text-slate-400" />
                <span>Create Company (Restricted)</span>
              </span>
            )}

            <span className="text-xs text-slate-500 font-medium">
              Showing {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company name, ROC, sector..."
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
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/services?company=${encodeURIComponent(company.id)}`}
                        className="text-[#2563eb] hover:text-[#1d4ed8] hover:underline font-semibold text-[13px] tracking-tight block"
                      >
                        {company.name}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                        {company.roc}
                      </span>
                    </div>
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
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/services?company=${encodeURIComponent(company.id)}`}
                        title="View Digital Service Cards"
                        className="w-9 h-8 rounded border border-slate-400/80 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        <BookOpen size={16} />
                      </Link>

                      {userCanEdit ? (
                        <button
                          type="button"
                          onClick={() => openSettingsModal(company)}
                          title="Edit Company Details"
                          className="w-9 h-8 rounded border border-slate-400/80 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          <Settings size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openSettingsModal(company)}
                          title="View Company Information (Read Only)"
                          className="w-9 h-8 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <Settings size={16} />
                        </button>
                      )}

                      {userCanDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCompany(company.id, company.name)}
                          title="Delete Company"
                          className="w-9 h-8 rounded border border-rose-200 bg-rose-50/60 hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-12 text-center text-slate-500 font-medium bg-slate-50/50"
                  >
                    {isEmployeeRole && accessibleCompanies.length === 0 ? (
                      <div className="max-w-md mx-auto flex flex-col items-center gap-2">
                        <ShieldAlert size={32} className="text-amber-500" />
                        <div className="font-bold text-slate-800 text-sm">
                          No Companies Assigned
                        </div>
                        <p className="text-xs text-slate-500 m-0">
                          Your employee profile ({currentUser?.name}) currently has no assigned companies. Please contact your Super Administrator to grant you access in the Employees panel.
                        </p>
                      </div>
                    ) : (
                      <div>No company found matching &quot;{searchTerm}&quot;.</div>
                    )}
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

      {/* Company Settings / Edit Modal */}
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

            {userCanEdit ? (
              <form onSubmit={handleUpdateCompany} className="space-y-3.5 mb-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ROC Registration Number
                  </label>
                  <input
                    type="text"
                    value={editRoc}
                    onChange={(e) => setEditRoc(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Industry Sector
                  </label>
                  <input
                    type="text"
                    value={editSector}
                    onChange={(e) => setEditSector(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  {userCanDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCompany(showSettingsModal.id, showSettingsModal.name)}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(null)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-[#0b4da2] hover:bg-[#083c80] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            ) : (
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
                <div className="text-[11px] text-slate-400 italic pt-1">
                  * Note: Edit permission is not granted to your employee profile.
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
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
