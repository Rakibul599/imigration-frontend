'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Search,
  Lock,
  Trash2,
  Edit,
  ExternalLink,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Layers,
  FileCheck,
  FolderOpen,
  Upload,
} from 'lucide-react';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
  createServiceCard,
  updateServiceCard,
  deleteServiceCard,
  subscribeToServiceChanges,
} from '@/lib/serviceStorage';
import { fetchCustomers, CustomerRecord, getFileUrl } from '@/lib/customerStorage';

const ICON_PRESETS = [
  { label: 'Document / File', url: '/images/registration-document.svg' },
  { label: 'Special Pass', url: '/images/special-pass.png' },
  { label: 'Medical Info', url: '/images/medical-information.svg' },
  { label: 'Insurance', url: '/images/insurance-information.svg' },
  { label: 'SOCSO / Perkeso', url: '/images/socso.png' },
  { label: 'EPF / KWSP', url: '/images/epf-kwsp.svg' },
  { label: 'Work Agreement', url: '/images/work-agreement.svg' },
  { label: 'Payment / Fees', url: '/images/payment-information.svg' },
  { label: 'Your Profile', url: '/images/your-information.svg' },
  { label: 'Work / JIM Pass', url: '/images/work-information.svg' },
];

export default function SuperAdminServicesPage() {
  const [services, setServices] = useState<ServiceCard[]>(() => {
    return typeof window !== 'undefined' ? getStoredServices() : [];
  });
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ServiceCard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<ServiceCard | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    tag: '',
    description: '',
    image: '/images/registration-document.svg',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedCards, fetchedCustomers] = await Promise.all([
        fetchServiceCards(),
        fetchCustomers(),
      ]);
      setServices(fetchedCards);
      setCustomers(fetchedCustomers);
    } catch (err) {
      console.warn('Error loading services in Super Admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToServiceChanges(() => {
      setServices(getStoredServices());
    });
    return unsub;
  }, []);

  // Compute document count per service card
  const docCountsByService = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach((c) => {
      if (Array.isArray(c.documents)) {
        c.documents.forEach((doc) => {
          if (doc.service_id) {
            counts[doc.service_id] = (counts[doc.service_id] || 0) + 1;
          } else if (doc.service_name) {
            const matched = services.find(
              (s) => s.title.toLowerCase() === doc.service_name?.toLowerCase()
            );
            if (matched) {
              counts[matched.id] = (counts[matched.id] || 0) + 1;
            }
          }
        });
      }
    });
    return counts;
  }, [customers, services]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.tag && s.tag.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image file size should be less than 5MB.' });
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        image: result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      title: '',
      slug: '',
      tag: '',
      description: '',
      image: '/images/registration-document.svg',
    });
    setUploadedFileName('');
    setEditingCard(null);
    setIsCreateModalOpen(true);
    setFeedback(null);
  };

  const handleOpenEditModal = (card: ServiceCard) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      slug: card.id,
      tag: card.tag || '',
      description: card.description || '',
      image: card.image || '/images/registration-document.svg',
    });
    setUploadedFileName('');
    setIsCreateModalOpen(true);
    setFeedback(null);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFeedback({ type: 'error', message: 'Service Card Title is required.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (editingCard) {
        // Update existing card
        await updateServiceCard(editingCard.id, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          tag: formData.tag.trim() || undefined,
          image: formData.image.trim() || '/images/registration-document.svg',
        });
        setFeedback({ type: 'success', message: `Service Card "${formData.title}" updated successfully!` });
      } else {
        // Create new card
        const baseSlug = formData.slug.trim()
          ? formData.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
          : formData.title.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

        await createServiceCard({
          id: baseSlug,
          title: formData.title.trim(),
          description: formData.description.trim(),
          tag: formData.tag.trim() || undefined,
          image: formData.image.trim() || '/images/registration-document.svg',
        });
        setFeedback({ type: 'success', message: `New Service Card "${formData.title}" created successfully!` });
      }

      setIsCreateModalOpen(false);
      setServices(getStoredServices());
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save service card.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteServiceCard(cardToDelete.id);
      setFeedback({ type: 'success', message: `Service Card "${cardToDelete.title}" removed successfully.` });
      setCardToDelete(null);
      setServices(getStoredServices());
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Cannot delete this card.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCards = services.length;
  const coreCards = services.filter((s) => s.is_core || s.id === 'customer' || s.id === 'document-download').length;
  const customCards = totalCards - coreCards;
  const totalTaggedDocs = Object.values(docCountsByService).reduce((acc, n) => acc + n, 0);

  return (
    <div className="p-6 sm:p-8 max-w-[1240px] mx-auto w-full space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Super Administrator</span>
            <span>•</span>
            <span className="text-[#0b4da2]">Services Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 m-0">
            <Sparkles className="text-amber-500" size={28} />
            <span>Service Cards Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Configure dynamic service cards shown on the Employer Services Portal. Core modules (Customer &amp; Document Download) remain locked to maintain system integrity.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Link
            href="/services"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <ExternalLink size={14} />
            <span>Preview Services Portal</span>
          </Link>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Service Card</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Cards</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCards}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Rendered on /services</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Lock size={12} />
            <span>Permanent Core Cards</span>
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">{coreCards}</div>
          <div className="text-[11px] text-blue-700/80 mt-0.5">Customer &amp; Doc Download</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Custom &amp; Configurable</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{customCards}</div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Fully editable cards</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Tagged Worker Docs</div>
          <div className="text-2xl font-black text-purple-900 mt-1">{totalTaggedDocs}</div>
          <div className="text-[11px] text-purple-700/80 mt-0.5">Linked customer attachments</div>
        </div>
      </div>

      {/* Control Bar: Search & Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service cards by title, tag, or slug..."
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0b4da2] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 font-medium outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time MySQL &amp; LocalStorage Synchronized</span>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredServices.map((card, idx) => {
          const isCore = card.is_core || card.id === 'customer' || card.id === 'document-download';
          const attachedDocsCount = docCountsByService[card.id] || 0;

          return (
            <div
              key={card.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                isCore ? 'border-blue-200 bg-gradient-to-b from-blue-50/20 to-white' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Card Top: Badges & Icon */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-center shrink-0">
                    <img
                      src={getFileUrl(card.image)}
                      alt={card.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {isCore ? (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                        <Lock size={10} /> Core Module
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                        Dynamic Service
                      </span>
                    )}

                    {card.tag && (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Tag: {card.tag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 m-0 leading-tight">
                    {card.title}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Slug ID: <span className="text-slate-600">{card.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {card.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Bottom Info & Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <FileText size={13} className="text-slate-400" />
                    <span>Customer Docs:</span>
                  </span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                    {attachedDocsCount} attached
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {isCore ? (
                    <div className="text-[11px] text-slate-400 italic flex items-center gap-1">
                      <Lock size={12} className="text-slate-400" />
                      <span>Permanent core routing</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(card)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Edit size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardToDelete(card)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}

                  <Link
                    href={`/services?verifiedService=${encodeURIComponent(card.id)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0b4da2] hover:text-[#083a7c] transition-colors ml-auto no-underline"
                  >
                    <span>Test on Portal</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800 m-0">No matching service cards</h3>
          <p className="text-xs text-slate-400 mt-1">Try refining your search query above.</p>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header (Pinned) */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 m-0">
                    {editingCard ? 'Edit Service Card' : 'Create New Service Card'}
                  </h3>
                  <p className="text-xs text-slate-400 m-0">
                    {editingCard ? 'Update card details and presentation.' : 'Add a new digital service card to the employer portal.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Form Body */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4.5 overscroll-contain">
                {/* Title & Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Card Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        title: val,
                        slug: !editingCard && !prev.slug ? val.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : prev.slug,
                      }));
                    }}
                    placeholder="e.g. Police Clearance, Attestation"
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
                    placeholder="e.g. Popular, Urgent, Verification"
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium outline-none"
                  />
                </div>
              </div>

              {/* Slug ID (only editable on create) */}
              {!editingCard && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                    <span>Slug Identifier (System ID)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Auto-generated</span>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g. police-clearance"
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Card Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description displayed on the employer services portal card."
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium outline-none resize-none"
                />
              </div>

              {/* Icon Upload & Presets */}
              <div className="space-y-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span>Card Icon / Graphic</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Upload File or Pick Preset</span>
                </label>

                {/* Direct File Upload Box */}
                <div className="flex items-center gap-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 hover:border-[#0b4da2] transition-colors">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                    <img
                      src={getFileUrl(formData.image)}
                      alt="Selected Icon"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs">
                        <Upload size={13} />
                        <span>Upload Icon File</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                          onChange={handleImageFileUpload}
                        />
                      </label>

                      {formData.image.startsWith('data:') && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, image: '/images/registration-document.svg' }));
                            setUploadedFileName('');
                          }}
                          className="text-[11px] text-red-600 hover:text-red-700 font-semibold cursor-pointer border-0 bg-transparent"
                        >
                          Remove Upload
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 m-0 mt-1 truncate">
                      {uploadedFileName
                        ? `Selected: ${uploadedFileName}`
                        : 'Choose an icon or logo from your computer (PNG, SVG, JPG, WebP).'}
                    </p>
                  </div>
                </div>

                {/* Or Presets Selection */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Or Pick From System Presets:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {ICON_PRESETS.map((preset) => {
                      const isSelected = formData.image === preset.url;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, image: preset.url }));
                            setUploadedFileName('');
                          }}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                            isSelected
                              ? 'border-[#0b4da2] bg-blue-50/80 ring-1 ring-[#0b4da2]'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="w-7 h-7 flex items-center justify-center">
                            <img src={preset.url} alt={preset.label} className="max-h-6 max-w-6 object-contain" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 truncate w-full">
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Custom Image URL */}
                <div>
                  <input
                    type="text"
                    value={formData.image.startsWith('data:') ? 'Custom uploaded file' : formData.image}
                    onChange={(e) => {
                      if (!e.target.value.startsWith('data:')) {
                        setFormData((prev) => ({ ...prev, image: e.target.value }));
                        setUploadedFileName('');
                      }
                    }}
                    placeholder="Or enter custom image URL: /images/..."
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none"
                  />
                </div>
              </div>

              {/* Preview Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl p-1.5 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                  <img src={getFileUrl(formData.image)} alt="Preview" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {formData.title || 'Service Card Title'}
                    </span>
                    {formData.tag && (
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase">
                        {formData.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate m-0 mt-0.5">
                    {formData.description || 'Description will appear here on portal card.'}
                  </p>
                </div>
              </div>

              </div>

              {/* Action Buttons (Pinned Footer) */}
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingCard ? 'Update Card' : 'Create Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {cardToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900 m-0">Delete Service Card?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to delete <strong>{cardToDelete.title}</strong>? Any customer documents previously tagged with this card will remain in customer records as general documents.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setCardToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteCard}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
