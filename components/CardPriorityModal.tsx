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
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageStatCardConfig, STAT_ICON_OPTIONS } from '@/lib/pageCardStorage';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';

export interface MetricSourceOption {
  id: string;
  label: string;
}

interface CardPriorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: PageStatCardConfig[];
  onSave: (updatedCards: PageStatCardConfig[]) => void;
  onReset: () => void;
  pageTitle?: string;
  availableMetrics?: MetricSourceOption[];
  initialShowAdd?: boolean;
}

export default function CardPriorityModal({
  isOpen,
  onClose,
  cards,
  onSave,
  onReset,
  pageTitle = 'Dashboard Cards',
  availableMetrics,
  initialShowAdd = false,
}: CardPriorityModalProps) {
  const [list, setList] = useState<PageStatCardConfig[]>([]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editMetricType, setEditMetricType] = useState('custom');
  const [editCustomValue, setEditCustomValue] = useState<string | number>('0');
  const [isSaving, setIsSaving] = useState(false);

  // Add Card State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newIcon, setNewIcon] = useState('Users');
  const [newMetricType, setNewMetricType] = useState(
    availableMetrics && availableMetrics.length > 0 ? availableMetrics[0].id : 'custom'
  );
  const [newCustomValue, setNewCustomValue] = useState<string | number>('0');
  const [newIconFile, setNewIconFile] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setList([...cards].sort((a, b) => a.order_num - b.order_num));
      setEditingCardId(null);
      setShowAddForm(initialShowAdd);
      resetNewCardForm();
    }
  }, [isOpen, cards, initialShowAdd]);

  if (!isOpen) return null;

  const resetNewCardForm = () => {
    setNewTitle('');
    setNewSubtitle('');
    setNewIcon('Users');
    setNewMetricType(availableMetrics && availableMetrics.length > 0 ? availableMetrics[0].id : 'custom');
    setNewCustomValue('0');
    setNewIconFile(null);
  };

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
    setEditSubtitle(card.subtitle || '');
    setEditIcon(card.icon);
    setEditMetricType(card.metric_type || card.id || 'custom');
    setEditCustomValue(card.custom_value !== undefined ? card.custom_value : '0');
  };

  const applyEdit = (id: string) => {
    setList((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              title: editTitle.trim() || c.title,
              subtitle: editSubtitle.trim() || c.subtitle,
              icon: editIcon || c.icon,
              metric_type: editMetricType,
              custom_value: editMetricType === 'custom' ? editCustomValue : undefined,
            }
          : c
      )
    );
    setEditingCardId(null);
  };

  const handleDeleteCard = (cardId: string) => {
    if (list.length <= 1) {
      alert('You must keep at least 1 card on the dashboard.');
      return;
    }
    setList((prev) => prev.filter((c) => c.id !== cardId));
    if (editingCardId === cardId) {
      setEditingCardId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isForNewCard = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          if (isForNewCard) {
            setNewIcon(reader.result);
            setNewIconFile(reader.result);
          } else {
            setEditIcon(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewCard = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter a card title.');
      return;
    }

    const uniqueId = `custom_card_${Date.now()}`;
    const newCard: PageStatCardConfig = {
      id: uniqueId,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
      icon: newIcon || 'Users',
      order_num: list.length + 1,
      metric_type: newMetricType,
      custom_value: newMetricType === 'custom' ? newCustomValue : undefined,
      is_custom: true,
      visible: true,
    };

    setList((prev) => [...prev, newCard]);
    setShowAddForm(false);
    resetNewCardForm();
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center border border-blue-100 shadow-2xs">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                Manage Cards &amp; Priority — {pageTitle}
              </h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Add new cards, customize titles/icons, and reorder card priorities (#1 to #{list.length}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs cursor-pointer border-0"
            >
              <Plus size={14} />
              <span>{showAddForm ? 'Close Add Form' : 'Add New Card'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Collapsible Add New Card Section */}
        {showAddForm && (
          <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border-b border-indigo-100/80 animate-in slide-in-from-top-3 duration-200 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 m-0">
                  Create New Stat Card
                </h3>
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold">
                Will be added as Rank #{list.length + 1}
              </span>
            </div>

            <form onSubmit={handleAddNewCard} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Title */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Card Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Quota Allocation, Medical Passed..."
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Subtitle / Helper Text
                  </label>
                  <input
                    type="text"
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    placeholder="e.g. Approved foreign worker quota..."
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Metric Source / Type */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Metric Value Source
                  </label>
                  <select
                    value={newMetricType}
                    onChange={(e) => setNewMetricType(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    {availableMetrics && availableMetrics.length > 0 ? (
                      availableMetrics.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="custom">Custom Fixed Value (Enter Below)</option>
                        <option value="total_customers">Total Customers Count</option>
                        <option value="active_permits">Active Permits Count</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Custom Value (if custom metric) */}
                {newMetricType === 'custom' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Custom Number or Text Value
                    </label>
                    <input
                      type="text"
                      value={newCustomValue}
                      onChange={(e) => setNewCustomValue(e.target.value)}
                      placeholder="e.g. 500, RM 25,000, 95%..."
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Icon selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Select Card Icon
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-24 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
                  {STAT_ICON_OPTIONS.map((opt) => {
                    const isSelected = newIcon === opt.icon;
                    return (
                      <button
                        key={opt.icon}
                        type="button"
                        onClick={() => setNewIcon(opt.icon)}
                        className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs font-bold'
                            : 'border-transparent hover:border-slate-200 bg-transparent text-slate-600 hover:bg-slate-50'
                        }`}
                        title={opt.label}
                      >
                        <DynamicCardIcon icon={opt.icon} size={16} />
                        <span className="text-[9px] truncate max-w-full">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-white cursor-pointer shadow-2xs bg-white/80">
                    <Upload size={12} />
                    <span>Upload Custom Icon / Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                  {newIconFile && (
                    <span className="text-[11px] text-emerald-600 font-medium">
                      ✓ Custom image loaded
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs cursor-pointer border-0"
                >
                  <Plus size={13} />
                  <span>Add Card</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Card List Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {list.map((card, index) => {
            const isEditing = editingCardId === card.id;

            return (
              <div
                key={card.id}
                className={`border rounded-xl transition-all ${
                  isEditing
                    ? 'border-indigo-500 bg-indigo-50/30 shadow-xs'
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
                        title="Move Priority Up"
                        className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-25 disabled:pointer-events-none cursor-pointer border-0 bg-transparent"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === list.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        title="Move Priority Down"
                        className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-25 disabled:pointer-events-none cursor-pointer border-0 bg-transparent"
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
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
                      <DynamicCardIcon icon={card.icon} size={18} />
                    </div>

                    {/* Card Title & Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {card.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold font-mono">
                          Rank #{index + 1}
                        </span>
                        {card.is_custom && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold uppercase tracking-wider">
                            Custom Card
                          </span>
                        )}
                      </div>
                      {card.subtitle && (
                        <p className="text-[11px] text-slate-400 m-0 truncate">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(card)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                        isEditing
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
                      }`}
                    >
                      <Edit2 size={12} />
                      <span>{isEditing ? 'Close' : 'Edit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      title="Delete / Remove Card"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline Edit Form */}
                {isEditing && (
                  <div className="p-4 border-t border-indigo-100 bg-white space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Card Display Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Card title..."
                          className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-400 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Card Subtitle
                        </label>
                        <input
                          type="text"
                          value={editSubtitle}
                          onChange={(e) => setEditSubtitle(e.target.value)}
                          placeholder="Card subtitle..."
                          className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    </div>

                    {availableMetrics && availableMetrics.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Metric Source
                          </label>
                          <select
                            value={editMetricType}
                            onChange={(e) => setEditMetricType(e.target.value)}
                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer"
                          >
                            {availableMetrics.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {editMetricType === 'custom' && (
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              Custom Value
                            </label>
                            <input
                              type="text"
                              value={editCustomValue}
                              onChange={(e) => setEditCustomValue(e.target.value)}
                              placeholder="e.g. 100, 250..."
                              className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-600"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
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
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
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
                            onChange={(e) => handleFileUpload(e, false)}
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-2xs border-0"
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 border-0"
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
