'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, CheckSquare, Square, Building2 } from 'lucide-react';
import { resolveFileUrl } from '@/lib/companies';

export type Select2MultiOption = {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  logo?: string;
};

interface Select2MultiSearchProps {
  label?: string;
  options: Select2MultiOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  helpText?: string;
}

export default function Select2MultiSearch({
  label,
  options,
  values = [],
  onChange,
  placeholder = 'Select one or more companies...',
  searchPlaceholder = 'Search companies by name or ROC...',
  disabled = false,
  className = '',
  helpText,
}: Select2MultiSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected Option Objects
  const selectedOptions = useMemo(() => {
    return options.filter((opt) => values.includes(opt.value));
  }, [options, values]);

  // Filtered Options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(term);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(term) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
      const matchVal = opt.value.toLowerCase().includes(term);
      return matchLabel || matchSub || matchBadge || matchVal;
    });
  }, [options, searchTerm]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const toggleOption = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const removeOption = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter((v) => v !== val));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(options.map((o) => o.value));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-800">
            {label}
          </label>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[#0b4da2] hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0"
            >
              Select All ({options.length})
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-500 hover:text-red-600 font-semibold bg-transparent border-0 cursor-pointer p-0"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Trigger Box (Select2 Multi Look) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full min-h-[44px] bg-slate-50 hover:bg-white border rounded-xl p-2 text-xs text-left flex flex-wrap items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? 'border-[#0b4da2] ring-2 ring-blue-100 bg-white'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-slate-400 py-1 px-1 font-medium">{placeholder}</span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0b4da2] border border-blue-200 px-2 py-1 rounded-lg text-xs font-semibold shadow-2xs animate-in fade-in zoom-in duration-100"
            >
              {opt.logo ? (
                <img
                  src={resolveFileUrl(opt.logo)}
                  alt=""
                  className="w-4 h-4 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Building2 size={13} className="text-[#0b4da2]" />
              )}
              <span className="max-w-[140px] truncate">{opt.label}</span>
              <button
                type="button"
                onClick={(e) => removeOption(opt.value, e)}
                className="hover:bg-blue-200/70 p-0.5 rounded text-blue-700 hover:text-red-600 transition-colors bg-transparent border-0 cursor-pointer"
                title="Remove"
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}

        <div className="ml-auto flex items-center gap-2 pl-2">
          {selectedOptions.length > 0 && (
            <span className="text-[10px] font-bold bg-[#0b4da2] text-white px-2 py-0.5 rounded-full shrink-0">
              {selectedOptions.length}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-[#0b4da2]' : ''
            }`}
          />
        </div>
      </div>

      {helpText && <p className="text-[11px] text-slate-500 mt-1">{helpText}</p>}

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-0 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 bg-transparent border-0 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Select Bar */}
          <div className="px-3 py-1.5 bg-slate-100/60 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-semibold">
              {values.length} of {options.length} companies selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#0b4da2] hover:underline font-bold bg-transparent border-0 cursor-pointer p-0"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-red-600 hover:underline font-bold bg-transparent border-0 cursor-pointer p-0"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching companies found for &quot;{searchTerm}&quot;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = values.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer border-0 ${
                      isSelected
                        ? 'bg-blue-50/70 text-slate-900 font-semibold'
                        : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-[#0b4da2] border-[#0b4da2] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>

                      {opt.logo ? (
                        <img
                          src={resolveFileUrl(opt.logo)}
                          alt=""
                          className="w-5 h-5 object-contain rounded shrink-0 bg-white p-0.5 border border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center shrink-0">
                          <Building2 size={12} className="text-slate-400" />
                        </div>
                      )}

                      <div className="truncate">
                        <div className="truncate font-semibold text-slate-900">
                          {opt.label}
                        </div>
                        {opt.subLabel && (
                          <div className="text-[10px] text-slate-500 truncate">
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {opt.badge && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
