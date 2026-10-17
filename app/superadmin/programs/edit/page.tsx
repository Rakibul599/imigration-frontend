'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { fetchProgramById, updateProgram, deleteProgram, ProgramRecord } from '@/lib/programStorage';

const COMMON_CATEGORIES = [
  'Construction & Infrastructure',
  'Manufacturing & Factories',
  'Agriculture & Plantation',
  'Hospitality & Tourism',
  'Cleaning & Facility Management',
  'Security & Safety Services',
  'Logistics & Warehousing',
  'Healthcare & Elderly Care',
  'IT & Technical Services',
];

const DURATION_PRESETS = [
  '6 Months',
  '1 Year',
  '2 Years',
  '3 Years',
  '5 Years',
  'Permanent / Indefinite',
];

function EditProgramForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Construction & Infrastructure');
  const [customCategory, setCustomCategory] = useState('');
  const [duration, setDuration] = useState('2 Years');
  const [fees, setFees] = useState('0.00');
  const [status, setStatus] = useState<'active' | 'inactive' | 'upcoming' | 'closed'>('active');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!programId) {
      setLoading(false);
      return;
    }

    fetchProgramById(programId)
      .then((prog) => {
        if (prog) {
          setName(prog.name || '');
          setCode(prog.code || '');
          if (prog.category && !COMMON_CATEGORIES.includes(prog.category)) {
            setCategory('custom');
            setCustomCategory(prog.category);
          } else {
            setCategory(prog.category || 'Construction & Infrastructure');
          }
          setDuration(prog.duration || '2 Years');
          setFees(prog.fees !== undefined && prog.fees !== null ? String(prog.fees) : '0.00');
          setStatus(prog.status || 'active');
          setDescription(prog.description || '');
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

    setIsSubmitting(true);
    setFeedback(null);

    const effectiveCategory = category === 'custom' ? customCategory.trim() : category;

    try {
      const result = await updateProgram(programId, {
        name: name.trim(),
        code: code.trim() || undefined,
        category: effectiveCategory || undefined,
        duration: duration.trim() || undefined,
        fees: fees ? parseFloat(fees) : 0,
        status,
        description: description.trim() || undefined,
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
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
              <span>Program Customization</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Edit Program
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Modify program terms, fees, categories, status, and description.
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Program Name */}
            <div className="sm:col-span-2">
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

            {/* Program Code */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Program Code</span>
                <span className="text-[11px] font-normal text-slate-400">Unique Code</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. PROG-CONST-01"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Program Status */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Scheme Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="active">Active (Available for foreign workers)</option>
                <option value="upcoming">Upcoming (Planned scheme)</option>
                <option value="inactive">Inactive (Temporarily suspended)</option>
                <option value="closed">Closed (Quota full / Concluded)</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Category / Sector
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              >
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom">+ Other / Custom Sector</option>
              </select>

              {category === 'custom' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom sector name..."
                  className="w-full mt-2 px-3.5 py-2 text-xs text-slate-900 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Duration / Contract Period
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2 Years, 18 Months"
                className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      duration === d
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Program Fees */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Program Fee / Package Rate (MYR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  RM
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-11 pr-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Description &amp; Terms
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Program summary, eligibility criteria, required clearances..."
                className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
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
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-4xl mx-auto">
          <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading edit interface...</p>
        </div>
      }
    >
      <EditProgramForm />
    </Suspense>
  );
}
