'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Layers,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
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
import {
  ProgramRecord,
  fetchPrograms,
  deleteProgram,
} from '@/lib/programStorage';

const DEFAULT_PROGRAM_CARDS: PageStatCardConfig[] = [
  { id: 'total_programs', title: 'Total Programs', subtitle: 'All recruitment & deployment schemes', icon: 'BookOpen', order_num: 1 },
  { id: 'total_sectors', title: 'Active Sectors', subtitle: 'Distinct industry sectors covered', icon: 'Sparkles', order_num: 2 },
  { id: 'assigned_workers', title: 'Enrolled Workers', subtitle: 'Foreign workers assigned to schemes', icon: 'Users', order_num: 3 },
];

export default function SuperAdminProgramsListPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Manage Cards Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cards, setCards] = useState<PageStatCardConfig[]>(DEFAULT_PROGRAM_CARDS);

  // Delete modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load cards layout & purge unwanted cards
  useEffect(() => {
    const stored = getStoredPageCards('programs', DEFAULT_PROGRAM_CARDS).filter(
      (c) => c.id !== 'avg_program_fee' && c.id !== 'active_programs'
    );
    setCards(stored);
    try {
      localStorage.setItem('superadmin_cards_programs', JSON.stringify(stored));
    } catch {}

    const handleCardsUpdate = (e: any) => {
      const updated = (e.detail || getStoredPageCards('programs', DEFAULT_PROGRAM_CARDS)).filter(
        (c: PageStatCardConfig) => c.id !== 'avg_program_fee' && c.id !== 'active_programs'
      );
      setCards(updated);
    };
    window.addEventListener('superadmin_cards_update_programs', handleCardsUpdate);
    return () => window.removeEventListener('superadmin_cards_update_programs', handleCardsUpdate);
  }, []);

  const handleSaveCards = (updated: PageStatCardConfig[]) => {
    const saved = saveStoredPageCards('programs', updated);
    setCards(saved);
    showToast('success', 'Cards priority and labels updated successfully.');
  };

  const handleResetCards = () => {
    const reset = resetStoredPageCards('programs', DEFAULT_PROGRAM_CARDS);
    setCards(reset);
    showToast('info', 'Cards reset to default layout.');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPrograms();
      setPrograms(data);
    } catch (err) {
      console.error('Failed to load programs:', err);
      showToast('error', 'Failed to load programs list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    programs.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [programs]);

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchesSearch =
        searchTerm === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [programs, searchTerm, categoryFilter]);

  // Metrics (Cleaned: only total, sectors, workers)
  const metrics = useMemo(() => {
    const total = programs.length;
    const uniqueSectors = new Set(programs.map((p) => p.category?.trim()).filter(Boolean)).size;
    const enrolledWorkers = programs.reduce((acc, p) => acc + (p.customers_count || 0), 0);

    return { total, uniqueSectors, enrolledWorkers };
  }, [programs]);

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const ok = await deleteProgram(id);
      if (ok) {
        setPrograms((prev) => prev.filter((p) => p.id !== id));
        setDeleteConfirmId(null);
        showToast('success', 'Program deleted successfully.');
        window.dispatchEvent(new CustomEvent('superadmin_programs_updated', { detail: programs.filter((p) => p.id !== id) }));
      } else {
        showToast('error', 'Failed to delete program.');
      }
    } catch {
      showToast('error', 'Error occurred while deleting program.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getMetricValue = (cardId: string) => {
    switch (cardId) {
      case 'total_programs':
        return metrics.total;
      case 'total_sectors':
        return metrics.uniqueSectors;
      case 'assigned_workers':
        return metrics.enrolledWorkers;
      default:
        return 0;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Upcoming
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Closed
          </span>
        );
      case 'inactive':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <BookOpen size={14} className="shrink-0" />
            <span>Recruitment &amp; Deployment Schemes</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Program Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 max-w-2xl leading-relaxed">
            Configure foreign worker recruitment programs, government schemes, quotas, and worker assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsCardModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-10 px-3.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-all shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <SlidersHorizontal size={14} className="text-slate-500 shrink-0" />
            <span>Manage Cards</span>
          </button>

          <Link
            href="/superadmin/programs/customers"
            className="inline-flex items-center justify-center gap-2 h-10 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Users size={14} className="text-slate-500 shrink-0" />
            <span>Program Customers</span>
          </Link>

          <Link
            href="/superadmin/programs/create"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-sm hover:shadow whitespace-nowrap cursor-pointer"
          >
            <Plus size={15} className="shrink-0" />
            <span>Create Program</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards
          .slice()
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
          .map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 shrink-0">
                  <DynamicCardIcon icon={card.icon} size={18} />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {getMetricValue(card.id)}
                </div>
                {card.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {card.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Search, Filter, and Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by program name or sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-9 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Sector Filter Dropdown */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Sectors</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadData}
            title="Refresh List"
            className="h-10 w-10 flex items-center justify-center text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shrink-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Program Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading programs directory...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching programs and customer statistics</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <BookOpen size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Programs Found</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {searchTerm || categoryFilter !== 'all'
                ? 'No programs match the specified filter criteria. Try adjusting search or sector filter.'
                : 'Get started by creating your first workforce recruitment and deployment program.'}
            </p>
            <div className="mt-5">
              <Link
                href="/superadmin/programs/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
              >
                <Plus size={14} />
                Create New Program
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4">Program Name</th>
                  <th className="py-3.5 px-4">Sector</th>
                  <th className="py-3.5 px-4">Enrolled Workers</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPrograms.map((program) => (
                  <tr
                    key={program.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Program Name */}
                    <td className="py-4 px-4 align-middle">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {program.name}
                      </div>
                    </td>

                    {/* Sector */}
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {program.category || 'General'}
                      </div>
                    </td>

                    {/* Enrolled Workers */}
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <Link
                        href={`/superadmin/programs/customers?program_id=${program.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 transition-colors"
                        title="View workers assigned to this program"
                      >
                        <Users size={12} className="shrink-0" />
                        <span>{program.customers_count ?? 0} Workers</span>
                        <ExternalLink size={10} className="opacity-60 shrink-0" />
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      {statusBadge(program.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/superadmin/programs/customers?program_id=${program.id}`}
                          title="View Program Customers"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </Link>

                        <Link
                          href={`/superadmin/programs/edit?id=${program.id}`}
                          title="Edit Program"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </Link>

                        <button
                          onClick={() => setDeleteConfirmId(program.id)}
                          title="Delete Program"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete Program?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to delete this recruitment program? Assigned customers will not be deleted, but their program association will be cleared.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm"
              >
                {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Priority Customization Modal */}
      <CardPriorityModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cards={cards}
        onSave={handleSaveCards}
        onReset={handleResetCards}
        pageTitle="Program Schemes Cards"
      />
    </div>
  );
}
