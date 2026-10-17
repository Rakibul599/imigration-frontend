'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  FileText,
  HelpCircle,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import { createProgram } from '@/lib/programStorage';

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

export default function CreateProgramPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Construction & Infrastructure');
  const [customCategory, setCustomCategory] = useState('');
  const [duration, setDuration] = useState('2 Years');
  const [fees, setFees] = useState('3500.00');
  const [status, setStatus] = useState<'active' | 'inactive' | 'upcoming' | 'closed'>('active');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Program Name is required.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const effectiveCategory = category === 'custom' ? customCategory.trim() : category;

    try {
      const result = await createProgram({
        name: name.trim(),
        code: code.trim() || undefined,
        category: effectiveCategory || undefined,
        duration: duration.trim() || undefined,
        fees: fees ? parseFloat(fees) : 0,
        status,
        description: description.trim() || undefined,
      });

      if (result) {
        setFeedback({ type: 'success', message: 'Program created successfully! Redirecting...' });
        window.dispatchEvent(new CustomEvent('superadmin_programs_updated'));
        setTimeout(() => {
          router.push('/superadmin/programs');
        }, 800);
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
        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-full">
          New Scheme Setup
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
              <BookOpen size={14} />
              <span>Program Setup &amp; Definition</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Create New Program
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Establish a new recruitment, deployment, or government workforce scheme.
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
                placeholder="e.g. General Construction Workforce Program 2026"
                className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Official name of the foreign worker scheme, bilateral recruitment project, or agency initiative.
              </p>
            </div>

            {/* Program Code */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Program Code</span>
                <span className="text-[11px] font-normal text-slate-400">Optional (Auto-generated)</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. PROG-CONST-2026"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Unique identifier for contracts and worker records. Leave blank to auto-generate.
              </p>
            </div>

            {/* Program Status */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="active">Active (Available for customer selection)</option>
                <option value="upcoming">Upcoming (Planned scheme)</option>
                <option value="inactive">Inactive (Temporarily suspended)</option>
                <option value="closed">Closed (Quota completed)</option>
              </select>
            </div>

            {/* Program Category */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Sector / Category
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
                Scheme Duration / Contract Period
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 2 Years, 18 Months"
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
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
              <p className="text-[11px] text-slate-400 mt-1">
                Standard levy, processing, or agency placement fee per worker.
              </p>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Program Description, Eligibility &amp; Objectives
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a comprehensive summary of this program, including government approval references, quota details, visa requirements, and medical examination criteria..."
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Creating Program...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save &amp; Publish Program</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
