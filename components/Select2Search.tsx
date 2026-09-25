'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export type Select2Option = {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
};

interface Select2SearchProps {
  label?: string;
  options: Select2Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function Select2Search({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  icon,
  disabled = false,
  className = '',
}: Select2SearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected Option Object
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

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

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-800 mb-1">
          {label}
        </label>
      )}

      {/* Main Trigger Box (Select2 Look) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-slate-50 hover:bg-white border rounded-xl pl-3.5 pr-3 py-2.5 text-xs text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? 'border-[#0b4da2] ring-2 ring-blue-100 bg-white'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-800 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                  ({selectedOption.subLabel})
                </span>
              )}
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold font-mono shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          size={15}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#0b4da2]' : ''
          }`}
        />
      </button>

      {/* Floating Select2 Search Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-300 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0b4da2] focus:ring-1 focus:ring-blue-400 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer bg-transparent border-0"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-slate-400 font-medium">
              <span>{filteredOptions.length} available</span>
              {searchTerm && <span>Filtered by &quot;{searchTerm}&quot;</span>}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3.5 py-2 text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer border-0 ${
                      isSelected
                        ? 'bg-blue-50/80 text-[#0b4da2] font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[11px] text-slate-400 truncate font-normal">
                          • {opt.subLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            isSelected
                              ? 'bg-[#0b4da2] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} className="text-[#0b4da2]" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                <p className="m-0 font-medium">No results found</p>
                <p className="m-0 text-[10px] text-slate-400 mt-0.5">
                  Try searching with a different keyword
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
