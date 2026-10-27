'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FolderPlus,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { createProgram } from '@/lib/programStorage';
import { WorkingSector, fetchAllWorkingSectors, createWorkingSector } from '@/lib/customerStorage';

export default function CreateProgramPage() {
  const router = useRouter();

  // ONLY 2 fields required by user: name and sector
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');

  // Working Sectors state
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);

  // Inline Add New Sector state
  const [isAddingSector, setIsAddingSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [isSavingSector, setIsSavingSector] = useState(false);

  // Form submission state
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
          if (data.length > 0 && !sector) {
            setSector(data[0].name);
          }
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
      const result = await createProgram({
        name: name.trim(),
        category: sector.trim(),
        status: 'active',
      });

      if (result) {
        setFeedback({ type: 'success', message: 'Program created successfully! Redirecting...' });
        window.dispatchEvent(new CustomEvent('superadmin_programs_updated'));
        setTimeout(() => {
          router.push('/superadmin/programs');
        }, 700);
      } else {
        setFeedback({ type: 'error', message: 'Failed to create program. Please try again.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/superadmin/programs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Programs List</span>
        </Link>
        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-full">
          Program Management
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
              <BookOpen size={14} />
              <span>Program Setup</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Create New Program
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Enter the program name and select or add its sector.
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Sparkles size={20} />
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
            <span className="flex-1">{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Form - Only 2 Fields: Name & Sector */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-5">
            {/* Field 1: Program Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Program Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. General Construction Workforce Program 2026"
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder:text-slate-400"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Official name of the recruitment scheme, project, or workforce program.
              </p>
            </div>

            {/* Field 2: Sector (with + Add Sector capability) */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-800">
                  Sector <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingSector(!isAddingSector);
                    setNewSectorName('');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-all cursor-pointer"
                >
                  {isAddingSector ? (
                    <>
                      <X size={13} />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Add Sector</span>
                    </>
                  )}
                </button>
              </div>

              {/* Inline Add Sector Box */}
              {isAddingSector && (
                <div className="p-3 bg-white border border-indigo-200 rounded-xl shadow-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <FolderPlus size={14} className="text-indigo-600" />
                    <span>Add New Working Sector</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSectorName}
                      onChange={(e) => setNewSectorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveSector();
                        }
                      }}
                      placeholder="Enter new sector name (e.g. Oil & Gas, Aviation)..."
                      className="flex-1 px-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={isSavingSector || !newSectorName.trim()}
                      onClick={() => handleSaveSector()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isSavingSector ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save size={13} />
                          <span>Save Sector</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Sector Dropdown */}
              <div className="relative">
                <select
                  value={sector}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsAddingSector(true);
                    } else {
                      setSector(e.target.value);
                    }
                  }}
                  disabled={loadingSectors}
                  className="w-full px-4 py-3 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer disabled:opacity-60 transition-all"
                >
                  <option value="">-- Select a Sector --</option>
                  {sectors.map((s) => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  <option value="__add_new__" className="text-indigo-600 font-bold">
                    + Add New Sector...
                  </option>
                </select>
              </div>

              <p className="text-[11px] text-slate-400">
                Choose an existing working sector from the dropdown or click <span className="font-semibold text-indigo-600">+ Add Sector</span> to add a new one.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <Link
              href="/superadmin/programs"
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Creating Program...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Program</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
