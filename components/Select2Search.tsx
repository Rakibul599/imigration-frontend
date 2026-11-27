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
  dropdownAlign?: 'left' | 'right';
  minDropdownWidth?: string;
  dropdownWidth?: string;
  triggerClassName?: string;
  hideExtra?: boolean;
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
  dropdownAlign = 'left',
  minDropdownWidth = 'min-w-full',
  dropdownWidth,
  triggerClassName = '',
  hideExtra = false,
}: Select2SearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>(dropdownAlign);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const calculateAlign = () => {
    if (dropdownAlign === 'right') return 'right';
    if (containerRef.current && typeof window !== 'undefined') {
      const rect = containerRef.current.getBoundingClientRect();
      const estDropdownWidth = 340;
      if (rect.left + estDropdownWidth > window.innerWidth - 20) {
        return 'right';
      }
    }
    return 'left';
  };

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

  // Sync alignment whenever dropdownAlign prop or isOpen changes
  useEffect(() => {
    setEffectiveAlign(calculateAlign());
  }, [isOpen, dropdownAlign]);

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

  // Auto-focus search input when opened WITHOUT scrolling page or container
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setEffectiveAlign(calculateAlign());
      setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      setEffectiveAlign(calculateAlign());
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${isOpen ? 'z-[99]' : 'z-auto'} ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-800 mb-1">
          {label}
        </label>
      )}

      {/* Main Trigger Box (Select2 Look) */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full text-xs text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-2xs ${
          triggerClassName
            ? triggerClassName
            : `bg-slate-50 hover:bg-white border rounded-xl pl-3.5 pr-3 py-2.5 ${
                isOpen
                  ? 'border-[#0b4da2] ring-2 ring-blue-100 bg-white'
                  : 'border-slate-300 hover:border-slate-400'
              }`
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate min-w-0 flex-nowrap">
              <span className="font-bold text-slate-800 truncate">
                {selectedOption.label}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
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
        <div
          className={`absolute ${
            effectiveAlign === 'right' ? 'right-0 left-auto origin-top-right' : 'left-0 right-auto origin-top-left'
          } top-full mt-2 z-[100] ${
            dropdownWidth
              ? dropdownWidth
              : `${minDropdownWidth} sm:min-w-[340px] sm:max-w-[420px]`
          } max-w-[calc(100vw-2rem)] bg-white border border-blue-400/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150`}
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
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
                className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0b4da2] focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs"
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
            {searchTerm && (
              <div className="flex items-center justify-between px-1 pt-2 text-[10px] text-slate-400 font-medium">
                <span>Filtered by &quot;{searchTerm}&quot;</span>
              </div>
            )}
          </div>

          {/* Options List with comfortable spacing between items */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const isAll = opt.value === 'ALL';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-left flex items-center justify-between gap-3 transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-50 text-[#0b4da2] border-blue-200 font-semibold shadow-2xs'
                        : isAll
                        ? 'hover:bg-blue-50/70 bg-slate-50/80 border-slate-200 text-slate-800'
                        : 'hover:bg-slate-100/90 bg-white border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`truncate ${isAll ? 'font-black text-[#0b4da2]' : isSelected ? 'font-bold text-[#0b4da2]' : 'font-semibold text-slate-800'}`}>
                          {opt.label}
                        </span>
                      </div>
                      {opt.subLabel && !hideExtra && (
                        <span className="text-[10px] text-slate-500 truncate font-normal mt-0.5 leading-tight">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {opt.badge && !hideExtra && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                            isSelected
                              ? 'bg-[#0b4da2] text-white border-[#0b4da2]'
                              : isAll
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} className="text-[#0b4da2] shrink-0" />}
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
