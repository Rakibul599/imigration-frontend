'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Edit2,
  Eye,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  WorkingSector,
  fetchAllWorkingSectors,
  createWorkingSector,
  updateWorkingSector,
  deleteWorkingSector,
} from '@/lib/customerStorage';
import { fetchCompaniesFromBackend, getStoredCompanies } from '@/lib/companyStorage';

export default function CompanySectorsPage() {
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<WorkingSector | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sectorsData, comps] = await Promise.all([
        fetchAllWorkingSectors(),
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
      ]);
      setSectors(sectorsData);
      setCompanies(comps || []);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load company sectors',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('working_sectors_updated', handleUpdate);
    return () => {
      window.removeEventListener('working_sectors_updated', handleUpdate);
    };
  }, []);

  // Filtered Sectors
  const filteredSectors = useMemo(() => {
    return sectors.filter((s) => {
      const status = s.status || 'active';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = s.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [sectors, statusFilter, searchTerm]);

  // Sector company counts
  const sectorCompanyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((comp) => {
      const secStr = comp.sector || '';
      const secArr = comp.sectors && Array.isArray(comp.sectors) ? comp.sectors : [];
      const allSecs = new Set([secStr, ...secArr].filter(Boolean));
      allSecs.forEach((secName) => {
        counts[secName] = (counts[secName] || 0) + 1;
      });
    });
    return counts;
  }, [companies]);

  // Counts
  const totalCount = sectors.length;
  const activeCount = sectors.filter((s) => (s.status || 'active') === 'active').length;
  const inactiveCount = sectors.filter((s) => s.status === 'inactive').length;

  const handleOpenCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormStatus('active');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (sector: WorkingSector) => {
    setEditingSector(sector);
    setFormName(sector.name);
    setFormDescription(sector.description || '');
    setFormStatus((sector.status as any) || 'active');
    setFormError(null);
  };

  const handleSaveSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Sector name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingSector) {
        await updateWorkingSector(editingSector.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          status: formStatus,
        });
        setNotification({
          type: 'success',
          message: `Sector "${formName.trim()}" updated successfully!`,
        });
        setEditingSector(null);
      } else {
        await createWorkingSector(
          formName.trim(),
          formDescription.trim() || undefined,
          formStatus
        );
        setNotification({
          type: 'success',
          message: `Sector "${formName.trim()}" created successfully!`,
        });
        setIsCreateOpen(false);
      }
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sector: WorkingSector) => {
    const currentStatus = sector.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateWorkingSector(sector.id, {
        name: sector.name,
        status: newStatus,
      });
      setNotification({
        type: 'info',
        message: `Sector "${sector.name}" marked as ${newStatus}.`,
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update status',
      });
    }
  };

  const handleDeleteSector = async (sector: WorkingSector) => {
    const count = sectorCompanyCounts[sector.name] || 0;
    const confirmMsg =
      count > 0
        ? `Warning: "${sector.name}" is assigned to ${count} company/companies. Are you sure you want to delete it?`
        : `Are you sure you want to delete sector "${sector.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      await deleteWorkingSector(sector.id);
      setNotification({
        type: 'info',
        message: `Sector "${sector.name}" deleted successfully.`,
      });
      loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to delete sector',
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/companies" className="hover:text-[#0b4da2] no-underline">
              Company Management
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Company Sectors</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="text-[#0b4da2]" size={24} />
            <span>Company Sectors Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Configure business and working sectors. These sectors will automatically appear as selectable options when creating or editing companies, and in employee/worker registrations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer border-0"
          >
            <Plus size={15} />
            <span>Add New Sector</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Sectors
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Available across all companies</div>
        </div>

        <div
          onClick={() => setStatusFilter('active')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'active'
              ? 'border-emerald-400 ring-2 ring-emerald-400/20'
              : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Active Sectors
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{activeCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Selectable in Company Create form</div>
        </div>

        <div
          onClick={() => setStatusFilter('inactive')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'inactive'
              ? 'border-slate-400 ring-2 ring-slate-400/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Inactive Sectors
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-600 mt-2">{inactiveCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Hidden from registration forms</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search sectors by name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Sectors Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-14 text-center">#</th>
                <th className="py-3.5 px-4 w-[280px]">Sector Name</th>
                <th className="py-3.5 px-4">Description / Scope</th>
                <th className="py-3.5 px-4 w-40 text-center">Assigned Companies</th>
                <th className="py-3.5 px-4 w-32 text-center">Status</th>
                <th className="py-3.5 px-4 w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-7 h-7 border-2 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium text-slate-600">Loading company sectors...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSectors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <Layers size={38} className="mx-auto text-slate-300 mb-2" />
                    <div className="font-bold text-slate-700 text-sm">No sectors found</div>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Try clearing search terms or status filters.'
                        : 'Click "Add New Sector" above to create your first company sector.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSectors.map((sector, index) => {
                  const isActive = (sector.status || 'active') === 'active';
                  const companyCount = sectorCompanyCounts[sector.name] || 0;

                  return (
                    <tr key={sector.id} className="hover:bg-blue-50/35 transition-colors">
                      {/* ID */}
                      <td className="py-3.5 px-4 text-center align-middle font-mono font-bold text-slate-400">
                        #{sector.id}
                      </td>

                      {/* Sector Name */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] border border-blue-100 flex items-center justify-center shrink-0">
                            <Building2 size={15} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{sector.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 align-middle text-slate-600">
                        {sector.description ? (
                          <span>{sector.description}</span>
                        ) : (
                          <span className="text-slate-400 italic">No description provided</span>
                        )}
                      </td>

                      {/* Assigned Companies */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 size={12} className="text-slate-400" />
                          <span>{companyCount} {companyCount === 1 ? 'Company' : 'Companies'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(sector)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={isActive ? 'Deactivate sector' : 'Activate sector'}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sector)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors border border-slate-200 bg-white cursor-pointer"
                            title="Edit Sector"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSector(sector)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent bg-transparent cursor-pointer"
                            title="Delete Sector"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Sector Modal */}
      {(isCreateOpen || editingSector) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#0b4da2] font-bold text-base">
                <Layers size={20} />
                <span>{editingSector ? 'Edit Company Sector' : 'Add New Company Sector'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingSector(null);
                }}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSector} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sector Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Information Technology, Construction & Engineering..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Business Scope (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what businesses fall under this sector..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-white text-slate-800"
                >
                  <option value="active">Active (Available for company creation)</option>
                  <option value="inactive">Inactive (Hidden from creation dropdown)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingSector(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{editingSector ? 'Update Sector' : 'Save Sector'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
