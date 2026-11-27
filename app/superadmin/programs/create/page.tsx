'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  FolderPlus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { createProgram } from '@/lib/programStorage';
import { WorkingSector, fetchAllWorkingSectors, createWorkingSector } from '@/lib/customerStorage';

export default function CreateProgramPage() {
  const router = useRouter();
  const pathname = usePathname();
  const rootPath = pathname.startsWith('/masteradmin')
    ? '/masteradmin'
    : pathname.startsWith('/superadmin')
    ? '/superadmin'
    : '';

  // Form Fields
  const [name, setName] = useState('');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  // Working Sectors state
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);

  // Multi-Select Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sectorSearch, setSectorSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inline Add New Sector state
  const [isAddingSector, setIsAddingSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [isSavingSector, setIsSavingSector] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Filtered sectors list for search
  const filteredSectorList = useMemo(() => {
    const q = sectorSearch.trim().toLowerCase();
    if (!q) return sectors;
    return sectors.filter((s) => s.name.toLowerCase().includes(q));
  }, [sectors, sectorSearch]);

  // Multi-select helpers
  const toggleSector = (sectorName: string) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sectorName)) {
        return prev.filter((s) => s !== sectorName);
      } else {
        return [...prev, sectorName];
      }
    });
  };

  const removeSector = (sectorName: string) => {
    setSelectedSectors((prev) => prev.filter((s) => s !== sectorName));
  };

  const handleSelectAll = () => {
    const allNames = sectors.map((s) => s.name);
    setSelectedSectors(allNames);
  };

  const handleClearAll = () => {
    setSelectedSectors([]);
  };

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

      // Automatically add to selected sectors
      setSelectedSectors((prev) => {
        if (!prev.includes(createdName)) {
          return [...prev, createdName];
        }
        return prev;
      });

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

    if (selectedSectors.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one sector.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await createProgram({
        name: name.trim(),
        category: selectedSectors.join(', '),
        year: year.trim() || undefined,
        status: 'active',
      });

      if (result) {
        setFeedback({ type: 'success', message: 'Program created successfully! Redirecting...' });
        window.dispatchEvent(new CustomEvent('superadmin_programs_updated'));
        setTimeout(() => {
          router.push(`${rootPath}/programs`);
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
          href={`${rootPath}/programs`}
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
              Enter the program name and select one or more sectors for this recruitment scheme.
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
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Form - Name & Multi-Sector */}
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

            {/* Field 2: Multi-Sector Selection (Dropdown + Tags + Search + Add Sector) */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Sectors (Multiple Selection) <span className="text-rose-500">*</span>
                  </label>
                  {selectedSectors.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      {selectedSectors.length} Selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedSectors.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer bg-transparent border-0"
                    >
                      Clear All
                    </button>
                  )}
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-xs border-0"
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

              {/* Multi-Select Dropdown Container */}
              <div className="relative" ref={dropdownRef}>
                {/* Trigger Button */}
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full min-h-[46px] p-2 bg-white border rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isDropdownOpen
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    {selectedSectors.length === 0 ? (
                      <span className="text-xs font-medium text-slate-400 px-2 py-1 select-none">
                        -- Select Sectors (Multiple Selection) --
                      </span>
                    ) : (
                      selectedSectors.map((sec) => (
                        <span
                          key={sec}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200/80 shadow-2xs group"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Briefcase size={11} className="text-indigo-600 shrink-0" />
                          <span className="truncate max-w-[200px]">{sec}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSector(sec);
                            }}
                            className="text-indigo-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors ml-0.5 cursor-pointer border-0 bg-transparent"
                            title={`Remove ${sec}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 shrink-0 pr-1">
                    {selectedSectors.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearAll();
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
                        title="Clear all selected"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search & Actions Header */}
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2">
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={sectorSearch}
                          onChange={(e) => setSectorSearch(e.target.value)}
                          placeholder="Search sectors..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        {sectorSearch && (
                          <button
                            type="button"
                            onClick={() => setSectorSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 border-0 bg-transparent cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1">
                        <span>
                          {filteredSectorList.length} sector{filteredSectorList.length !== 1 ? 's' : ''} available
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer bg-transparent border-0"
                          >
                            Select All
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-slate-500 hover:text-rose-600 transition-colors cursor-pointer bg-transparent border-0"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sector List with Checkboxes */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
                      {loadingSectors ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-indigo-600" />
                          <span>Loading sectors...</span>
                        </div>
                      ) : filteredSectorList.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          <p>No sectors found matching &quot;{sectorSearch}&quot;</p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewSectorName(sectorSearch);
                              setIsAddingSector(true);
                              setIsDropdownOpen(false);
                            }}
                            className="mt-2 text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Add &quot;{sectorSearch}&quot; as new sector</span>
                          </button>
                        </div>
                      ) : (
                        filteredSectorList.map((s) => {
                          const isSelected = selectedSectors.includes(s.name);
                          return (
                            <div
                              key={s.id || s.name}
                              onClick={() => toggleSector(s.name)}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50/70 text-indigo-900 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                    isSelected
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check size={11} strokeWidth={3} />}
                                </div>
                                <span className="truncate">{s.name}</span>
                              </div>

                              {isSelected && (
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider shrink-0 ml-2">
                                  Selected
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Bottom Add Sector Trigger */}
                    <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Need a sector not listed?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSector(true);
                          setIsDropdownOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-transparent border-0 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add New</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                You can select multiple sectors from the dropdown. Click a sector to check/uncheck it.
              </p>
            </div>

            {/* Field 3: Program Year */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Program Year
                </label>
                <span className="text-[11px] text-indigo-600 font-semibold">Select from calendar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 pointer-events-none" />
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2026"
                    className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
                {/* Native Calendar Picker Button */}
                <div className="relative">
                  <input
                    type="date"
                    id="createProgramYearPicker"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.value) {
                        const yr = e.target.value.split('-')[0];
                        if (yr) setYear(yr);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const picker = document.getElementById('createProgramYearPicker') as HTMLInputElement | null;
                      if (picker) {
                        if (typeof picker.showPicker === 'function') {
                          picker.showPicker();
                        } else {
                          picker.focus();
                          picker.click();
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-xs"
                    title="Open calendar to pick year"
                  >
                    <Calendar size={14} />
                    <span>Pick from Calendar</span>
                  </button>
                </div>
              </div>
              {/* Quick Year Selection Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 mr-1">Quick Select:</span>
                {[
                  new Date().getFullYear() - 1,
                  new Date().getFullYear(),
                  new Date().getFullYear() + 1,
                  new Date().getFullYear() + 2,
                  new Date().getFullYear() + 3,
                ].map((yVal) => (
                  <button
                    key={yVal}
                    type="button"
                    onClick={() => setYear(String(yVal))}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                      year === String(yVal)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {yVal}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Click "Pick from Calendar" to select year from calendar, or select a year pill above.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <Link
              href={`${rootPath}/programs`}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all no-underline"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer border-0"
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
