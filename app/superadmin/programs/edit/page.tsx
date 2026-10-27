'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Edit2,
  FolderPlus,
  Plus,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { fetchProgramById, updateProgram } from '@/lib/programStorage';
import { WorkingSector, fetchAllWorkingSectors, createWorkingSector } from '@/lib/customerStorage';

function EditProgramForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'upcoming' | 'closed'>('active');

  // Working Sectors state
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);

  // Inline Add New Sector state
  const [isAddingSector, setIsAddingSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [isSavingSector, setIsSavingSector] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load existing working sectors
  useEffect(() => {
    let mounted = true;
    async function loadSectors() {
      setLoadingSectors(true);
      try {
        const data = await fetchAllWorkingSectors();
        if (mounted && Array.isArray(data)) {
          setSectors(data);
        }
      } catch (err) {
        console.error('Failed to load working sectors:', err);
      } finally {
        if (mounted) setLoadingSectors(false);
      }
    }
    loadSectors();

    const handleSectorsUpdated = () => {
      loadSectors();
    };
    window.addEventListener('working_sectors_updated', handleSectorsUpdated);
    return () => {
      mounted = false;
      window.removeEventListener('working_sectors_updated', handleSectorsUpdated);
    };
  }, []);

  // Load program details
  useEffect(() => {
    if (!programId) {
      setLoading(false);
      return;
    }

    fetchProgramById(programId)
      .then((prog) => {
        if (prog) {
          setName(prog.name || '');
          setSector(prog.category || '');
          setStatus(prog.status || 'active');
        } else {
          setFeedback({ type: 'error', message: 'Program not found.' });
        }
      })
      .catch((err) => {
        setFeedback({ type: 'error', message: err.message || 'Failed to load program details.' });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [programId]);

  // Handle adding new sector inline
  const handleSaveSector = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSectorName.trim();
    if (!trimmed) {
      setFeedback({ type: 'error', message: 'Please enter a sector name.' });
      return;
    }

    setIsSavingSector(true);
    try {
      const created = await createWorkingSector(trimmed);
      const createdName = created.name || trimmed;

      setSectors((prev) => {
        const exists = prev.some((s) => s.name.toLowerCase() === createdName.toLowerCase());
        if (exists) return prev;
        return [...prev, created];
      });

      setSector(createdName);
      setNewSectorName('');
      setIsAddingSector(false);
      setFeedback({
        type: 'success',
        message: `New sector "${createdName}" created and selected successfully!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to create sector. Please try again.',
      });
    } finally {
      setIsSavingSector(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!programId) {
      setFeedback({ type: 'error', message: 'Invalid program ID.' });
      return;
    }

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Program Name is required.' });
      return;
    }

    if (!sector.trim()) {
      setFeedback({ type: 'error', message: 'Sector is required. Please select or add a sector.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await updateProgram(programId, {
        name: name.trim(),
        category: sector.trim(),
        status,
      });

      if (result) {
        setFeedback({ type: 'success', message: 'Program updated successfully! Redirecting...' });
        window.dispatchEvent(new CustomEvent('superadmin_programs_updated'));
        setTimeout(() => {
          router.push('/superadmin/programs');
        }, 800);
      } else {
        setFeedback({ type: 'error', message: 'Failed to update program.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-700">Loading program details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/superadmin/programs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Programs List</span>
        </Link>
        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-full">
          Editing Program #{programId}
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
              <BookOpen size={14} />
              <span>Program Management</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Edit Program
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Update the program name, sector, and availability status.
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Edit2 size={20} />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-6 p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Program Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Program Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. General Construction Workforce Program"
              className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Sector with Inline Add Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Sector <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingSector((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Sector</span>
              </button>
            </div>

            {/* Inline Add New Sector Input Box */}
            {isAddingSector && (
              <div className="mb-3 p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                    <FolderPlus size={13} className="text-indigo-600" />
                    Create New Working Sector
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSector(false);
                      setNewSectorName('');
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSectorName}
                    onChange={(e) => setNewSectorName(e.target.value)}
                    placeholder="Enter sector name (e.g. Plantation & Agriculture)..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveSector();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={isSavingSector || !newSectorName.trim()}
                    onClick={() => handleSaveSector()}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {isSavingSector ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sector Select Dropdown */}
            <div className="relative">
              <select
                required
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={loadingSectors}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="" disabled>
                  {loadingSectors ? 'Loading sectors...' : '-- Select a Sector --'}
                </option>
                {sectors.map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheme Status */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Program Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <Link
              href="/superadmin/programs"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Updating Program...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditProgramPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-2xl mx-auto">
          <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading edit interface...</p>
        </div>
      }
    >
      <EditProgramForm />
    </Suspense>
  );
}
