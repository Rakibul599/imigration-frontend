'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUp,
  ArrowDown,
  Edit2,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  Sparkles,
} from 'lucide-react';
import { PageStatCardConfig, STAT_ICON_OPTIONS } from '@/lib/pageCardStorage';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';

interface CardPriorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: PageStatCardConfig[];
  onSave: (updatedCards: PageStatCardConfig[]) => void;
  onReset: () => void;
  pageTitle?: string;
}

export default function CardPriorityModal({
  isOpen,
  onClose,
  cards,
  onSave,
  onReset,
  pageTitle = 'Dashboard Cards',
}: CardPriorityModalProps) {
  const [list, setList] = useState<PageStatCardConfig[]>([]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setList([...cards].sort((a, b) => a.order_num - b.order_num));
      setEditingCardId(null);
    }
  }, [isOpen, cards]);

  if (!isOpen) return null;

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const updated = [...list];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setList(updated);
  };

  const handleSetRank = (currentIndex: number, newRank: number) => {
    const targetIdx = Math.max(0, Math.min(list.length - 1, newRank - 1));
    if (targetIdx === currentIndex) return;
    const updated = [...list];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(targetIdx, 0, moved);
    setList(updated);
  };

  const startEdit = (card: PageStatCardConfig) => {
    if (editingCardId === card.id) {
      setEditingCardId(null);
      return;
    }
    setEditingCardId(card.id);
    setEditTitle(card.title);
    setEditIcon(card.icon);
  };

  const applyEdit = (id: string) => {
    setList((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              title: editTitle.trim() || c.title,
              icon: editIcon || c.icon,
            }
          : c
      )
    );
    setEditingCardId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setEditIcon(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    const finalized = list.map((c, idx) => ({
      ...c,
      order_num: idx + 1,
    }));
    onSave(finalized);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center border border-blue-100 shadow-2xs">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                Manage Cards &amp; Priority — {pageTitle}
              </h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Reorder priority (1 to {list.length}), customize card labels, and assign distinct icons.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Card List Scrollable */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {list.map((card, index) => {
            const isEditing = editingCardId === card.id;

            return (
              <div
                key={card.id}
                className={`border rounded-xl transition-all ${
                  isEditing
                    ? 'border-blue-500 bg-blue-50/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {/* Main Row */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Priority Selector & Up/Down Arrows */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        title="Move Up"
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-25 disabled:pointer-events-none cursor-pointer border-0 bg-transparent"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === list.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        title="Move Down"
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-25 disabled:pointer-events-none cursor-pointer border-0 bg-transparent"
                      >
                        <ArrowDown size={14} />
                      </button>

                      {/* Rank Dropdown */}
                      <select
                        value={index + 1}
                        onChange={(e) => handleSetRank(index, Number(e.target.value))}
                        className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-md px-1.5 py-0.5 cursor-pointer text-slate-800"
                        title="Set exact priority rank"
                      >
                        {list.map((_, rIdx) => (
                          <option key={rIdx} value={rIdx + 1}>
                            #{rIdx + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Icon Box */}
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0b4da2] border border-blue-100 flex items-center justify-center shrink-0">
                      <DynamicCardIcon icon={card.icon} size={18} />
                    </div>

                    {/* Card Title & Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {card.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold font-mono">
                          Rank #{index + 1}
                        </span>
                      </div>
                      {card.subtitle && (
                        <p className="text-[11px] text-slate-400 m-0 truncate">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Edit Toggle Button */}
                  <button
                    type="button"
                    onClick={() => startEdit(card)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                      isEditing
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
                    }`}
                  >
                    <Edit2 size={13} />
                    <span>{isEditing ? 'Close Edit' : 'Edit'}</span>
                  </button>
                </div>

                {/* Inline Edit Form */}
                {isEditing && (
                  <div className="p-4 border-t border-blue-100 bg-white space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Card Display Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Card title..."
                        className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Card Icon (Pick Preset or Upload Custom)
                      </label>

                      {/* Icon Preset Grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                        {STAT_ICON_OPTIONS.map((opt) => {
                          const isSelected = editIcon === opt.icon;
                          return (
                            <button
                              key={opt.icon}
                              type="button"
                              onClick={() => setEditIcon(opt.icon)}
                              className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                              }`}
                              title={opt.label}
                            >
                              <DynamicCardIcon icon={opt.icon} size={18} />
                              <span className="text-[10px] truncate max-w-full">
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Upload */}
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs bg-white">
                          <Upload size={13} />
                          <span>Upload Custom Icon / Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                        {editIcon.startsWith('data:') && (
                          <span className="text-[11px] text-emerald-600 font-medium">
                            ✓ Custom image loaded
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => applyEdit(card.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#0b4da2] hover:bg-blue-800 text-white cursor-pointer transition-colors shadow-2xs border-0"
                      >
                        <CheckCircle2 size={13} />
                        <span>Done Editing</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 transition-colors cursor-pointer border-0"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 bg-white border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-blue-800 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 border-0"
            >
              <CheckCircle2 size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
