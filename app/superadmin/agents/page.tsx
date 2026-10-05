'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  FileText,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import CardPriorityModal from '@/components/CardPriorityModal';
import { DynamicCardIcon } from '@/components/DynamicCardIcon';
import {
  PageStatCardConfig,
  getStoredPageCards,
  saveStoredPageCards,
  resetStoredPageCards,
} from '@/lib/pageCardStorage';
import {
  AgentRecord,
  fetchAgents,
  createAgent,
  updateAgent,
  deleteAgent,
} from '@/lib/agentStorage';

const DEFAULT_AGENT_CARDS: PageStatCardConfig[] = [
  { id: 'total_agents', title: 'Total Agents', subtitle: 'All registered recruitment agents', icon: 'Users', order_num: 1 },
  { id: 'phone_contacts', title: 'Phone Contacts', subtitle: 'Direct phone & WhatsApp', icon: 'Phone', order_num: 2 },
  { id: 'notes_recorded', title: 'Notes & Remarks', subtitle: 'Documented agent remarks', icon: 'FileText', order_num: 3 },
];

export default function SuperAdminAgentManagementPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Manage Cards Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cards, setCards] = useState<PageStatCardConfig[]>(DEFAULT_AGENT_CARDS);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copied phone tooltip state
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null);

  // Form State (strictly Name, Phone, Note)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
  });

  // Load cards layout and data
  useEffect(() => {
    setCards(getStoredPageCards('agents', DEFAULT_AGENT_CARDS));
    const handleCardsUpdate = (e: any) => {
      setCards(e.detail || getStoredPageCards('agents', DEFAULT_AGENT_CARDS));
    };
    window.addEventListener('superadmin_cards_update_agents', handleCardsUpdate);
    return () => window.removeEventListener('superadmin_cards_update_agents', handleCardsUpdate);
  }, []);

  const handleSaveCards = (updated: PageStatCardConfig[]) => {
    const saved = saveStoredPageCards('agents', updated);
    setCards(saved);
    showToast('success', 'Cards priority and names updated successfully.');
  };

  const handleResetCards = () => {
    const reset = resetStoredPageCards('agents', DEFAULT_AGENT_CARDS);
    setCards(reset);
    showToast('info', 'Cards reset to default layout.');
  };

  const loadAgentsData = async () => {
    setLoading(true);
    try {
      const data = await fetchAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents:', err);
      showToast('error', 'Failed to load agent directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgentsData();
  }, []);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Card stats computation
  const stats = useMemo(() => {
    const total = agents.length;
    const withPhone = agents.filter((a) => a.phone && a.phone.trim().length > 0).length;
    const withNotes = agents.filter((a) => a.notes && a.notes.trim().length > 0).length;

    return {
      total_agents: total,
      phone_contacts: withPhone,
      notes_recorded: withNotes,
    };
  }, [agents]);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const matchName = agent.name?.toLowerCase().includes(term);
      const matchPhone = agent.phone?.toLowerCase().includes(term);
      const matchNotes = agent.notes?.toLowerCase().includes(term);
      return matchName || matchPhone || matchNotes;
    });
  }, [agents, searchTerm]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      phone: '',
      notes: '',
    });
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (agent: AgentRecord) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name || '',
      phone: agent.phone || '',
      notes: agent.notes || '',
    });
    setIsAddEditModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Agent Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      showToast('error', 'Phone Number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAgent) {
        const updated = await updateAgent(editingAgent.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          notes: formData.notes.trim() || undefined,
        });
        setAgents((prev) => prev.map((a) => (a.id === editingAgent.id ? updated : a)));
        showToast('success', `Agent "${updated.name}" updated successfully`);
      } else {
        const created = await createAgent({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          notes: formData.notes.trim() || undefined,
        });
        setAgents((prev) => [created, ...prev]);
        showToast('success', `Agent "${created.name}" created successfully`);
      }
      setIsAddEditModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteAgent = async (id: number) => {
    try {
      await deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirmId(null);
      showToast('info', 'Agent record was successfully deleted.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete agent');
    }
  };

  // Copy phone number to clipboard
  const handleCopyPhone = (id: number, phoneStr: string) => {
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : notification.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : notification.type === 'error' ? (
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          ) : (
            <Users size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner - Standard Super Admin UI Structure */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldCheck size={12} className="text-yellow-400" />
              <span>Super Administrator Master Registry</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              Agent Management Directory
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Centralized administrative directory for recruitment agents, direct phone contact, and internal notes.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={() => setIsCardModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal size={14} />
              <span>Manage Cards &amp; Priority</span>
            </button>

            <button
              onClick={loadAgentsData}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap"
              title="Refresh agent directory"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer border-0 no-underline whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Create Agent</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards - Standard Super Admin UI Structure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          let value: number | string = 0;
          let themeColor = 'text-slate-900';
          let iconBg = 'bg-blue-50 text-[#0b4da2]';

          if (card.id === 'total_agents') {
            value = stats.total_agents;
            themeColor = 'text-slate-900';
            iconBg = 'bg-blue-50 text-[#0b4da2]';
          } else if (card.id === 'phone_contacts') {
            value = stats.phone_contacts;
            themeColor = 'text-emerald-600';
            iconBg = 'bg-emerald-50 text-emerald-600';
          } else if (card.id === 'notes_recorded') {
            value = stats.notes_recorded;
            themeColor = 'text-[#0b4da2]';
            iconBg = 'bg-blue-50 text-[#0b4da2]';
          }

          return (
            <div
              key={card.id}
              className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight truncate">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                  <DynamicCardIcon icon={card.icon} size={16} />
                </div>
              </div>
              <div className={`text-2xl font-bold tracking-tight font-mono my-0.5 ${themeColor}`}>
                {value}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">{card.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Main Table Card - Standard Super Admin UI Structure */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by agent name, phone number, or notes..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{filteredAgents.length}</strong> of {agents.length} agents
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[220px]">Agent Name</th>
                <th className="py-3 px-4 min-w-[200px]">Phone Number</th>
                <th className="py-3 px-4 min-w-[320px]">Note / Remarks</th>
                <th className="py-3 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#0b4da2]" />
                    <p className="text-xs text-slate-500 m-0">Loading agent directory...</p>
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 m-0">
                      No Agents Found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm
                        ? 'No agents match your search query.'
                        : 'No recruitment agents registered yet.'}
                    </p>
                    {!searchTerm && (
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22a34a] hover:bg-[#1b843c] text-white text-xs font-bold transition-colors cursor-pointer border-0"
                      >
                        <Plus size={14} />
                        <span>Create Agent</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent, index) => {
                  const rawPhone = agent.phone ? agent.phone.replace(/[^0-9]/g, '') : '';
                  return (
                    <tr
                      key={agent.id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-mono">
                        {index + 1}
                      </td>

                      {/* Agent Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] border border-blue-200 font-bold flex items-center justify-center text-xs shrink-0">
                            {agent.name ? agent.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {agent.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Agent ID #{agent.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${agent.phone}`}
                            className="font-mono text-xs font-semibold text-slate-800 hover:text-[#0b4da2] transition-colors"
                          >
                            {agent.phone}
                          </a>

                          {/* Quick WhatsApp Action */}
                          {rawPhone && (
                            <a
                              href={`https://wa.me/${rawPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}

                          {/* Copy Phone */}
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(agent.id, agent.phone)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0"
                            title="Copy Phone Number"
                          >
                            {copiedPhoneId === agent.id ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Note / Remarks */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-600 max-w-lg leading-relaxed">
                          {agent.notes ? (
                            <span>{agent.notes}</span>
                          ) : (
                            <span className="text-slate-400 italic">No notes recorded</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(agent)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#0b4da2] hover:bg-blue-50 border border-blue-200 transition-all cursor-pointer bg-white"
                            title="Edit Agent"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(agent.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer bg-white"
                            title="Delete Agent"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Agent (Strictly Name, Phone, Note) */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#072a6b] to-[#0c4da2] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <User size={18} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold m-0 leading-tight">
                    {editingAgent ? 'Edit Agent' : 'Create New Agent'}
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0">
                    {editingAgent
                      ? 'Update agent name, phone, and notes'
                      : 'Register a new recruitment agent in the registry'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAgent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Agent Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Md. Rafiqul Islam"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +880 1712-345678"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Include country code for direct WhatsApp messaging support
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Note / Remarks
                </label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Enter notes, agency details, or remarks..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{editingAgent ? 'Save Changes' : 'Create Agent'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Delete Agent?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this agent record? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAgent(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0"
              >
                Delete Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Priority & Customization Modal */}
      <CardPriorityModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cards={cards}
        onSave={handleSaveCards}
        onReset={handleResetCards}
        pageTitle="Agent Management Directory"
      />
    </div>
  );
}
