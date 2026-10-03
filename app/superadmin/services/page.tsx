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
  SlidersHorizontal,
  FileCheck,
  FolderOpen,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ChevronsUp,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  GripVertical,
} from 'lucide-react';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
  createServiceCard,
  updateServiceCard,
  deleteServiceCard,
  reorderServiceCards,
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
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderList, setReorderList] = useState<ServiceCard[]>([]);
  const [editingCard, setEditingCard] = useState<ServiceCard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<ServiceCard | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    tag: '',
    description: '',
    image: '/images/registration-document.svg',
    order_num: 1,
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
      order_num: services.length + 1,
    });
    setUploadedFileName('');
    setEditingCard(null);
    setIsCreateModalOpen(true);
    setFeedback(null);
  };

  const handleOpenEditModal = (card: ServiceCard) => {
    const currentIndex = services.findIndex((s) => s.id === card.id);
    const actualOrder = typeof card.order_num === 'number' && card.order_num > 0 ? card.order_num : currentIndex + 1;

    setEditingCard(card);
    setFormData({
      title: card.title,
      slug: card.id,
      tag: card.tag || '',
      description: card.description || '',
      image: card.image || '/images/registration-document.svg',
      order_num: actualOrder,
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
        const updatedDetails = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          tag: formData.tag.trim() || undefined,
          image: formData.image.trim() || '/images/registration-document.svg',
          order_num: Number(formData.order_num) || 1,
        };

        const targetRank = Math.max(1, Math.min(services.length, Number(formData.order_num) || 1));
        const currentIndex = services.findIndex((s) => s.id === editingCard.id);

        if (currentIndex !== -1 && currentIndex !== targetRank - 1) {
          // Priority position changed! Reorder list smoothly so all ranks stay clean & sequential
          const remaining = services.filter((s) => s.id !== editingCard.id);
          const updatedCard = { ...editingCard, ...updatedDetails, order_num: targetRank };
          remaining.splice(targetRank - 1, 0, updatedCard);
          await reorderServiceCards(remaining);
          await updateServiceCard(editingCard.id, updatedDetails);
        } else {
          await updateServiceCard(editingCard.id, updatedDetails);
        }

        setFeedback({ type: 'success', message: `Service Card "${formData.title}" updated successfully!` });
      } else {
        // Create new card
        const baseSlug = formData.slug.trim()
          ? formData.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
          : formData.title.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

        const targetRank = Math.max(1, Math.min(services.length + 1, Number(formData.order_num) || (services.length + 1)));

        const newCard = await createServiceCard({
          id: baseSlug,
          title: formData.title.trim(),
          description: formData.description.trim(),
          tag: formData.tag.trim() || undefined,
          image: formData.image.trim() || '/images/registration-document.svg',
          order_num: targetRank,
        });

        if (targetRank <= services.length) {
          const current = getStoredServices();
          const withoutNew = current.filter((s) => s.id !== newCard.id);
          withoutNew.splice(targetRank - 1, 0, newCard);
          await reorderServiceCards(withoutNew);
        }

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

  // Reorder Handlers for Card Grid (Left/Right horizontal sequence and Row Up/Down)
  const handleMoveLeft = async (card: ServiceCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = services.findIndex((s) => s.id === card.id);
    if (currentIndex <= 0) return;

    const newCards = [...services];
    const prevCard = newCards[currentIndex - 1];
    newCards[currentIndex - 1] = card;
    newCards[currentIndex] = prevCard;

    setServices(newCards);
    setIsSubmitting(true);
    try {
      const saved = await reorderServiceCards(newCards);
      setServices(saved);
      setFeedback({
        type: 'success',
        message: `Priority updated: "${card.title}" moved Left (now #${currentIndex} priority).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update priority order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveRight = async (card: ServiceCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = services.findIndex((s) => s.id === card.id);
    if (currentIndex < 0 || currentIndex >= services.length - 1) return;

    const newCards = [...services];
    const nextCard = newCards[currentIndex + 1];
    newCards[currentIndex + 1] = card;
    newCards[currentIndex] = nextCard;

    setServices(newCards);
    setIsSubmitting(true);
    try {
      const saved = await reorderServiceCards(newCards);
      setServices(saved);
      setFeedback({
        type: 'success',
        message: `Priority updated: "${card.title}" moved Right (now #${currentIndex + 2} priority).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update priority order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveRowUp = async (card: ServiceCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = services.findIndex((s) => s.id === card.id);
    if (currentIndex <= 0) return;

    const newCards = [...services];
    const targetIndex = currentIndex >= 3 ? currentIndex - 3 : 0;
    const [removed] = newCards.splice(currentIndex, 1);
    newCards.splice(targetIndex, 0, removed);

    setServices(newCards);
    setIsSubmitting(true);
    try {
      const saved = await reorderServiceCards(newCards);
      setServices(saved);
      setFeedback({
        type: 'success',
        message: `Priority updated: "${card.title}" moved Up (now #${targetIndex + 1} priority).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update priority order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveRowDown = async (card: ServiceCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = services.findIndex((s) => s.id === card.id);
    if (currentIndex < 0 || currentIndex >= services.length - 1) return;

    const newCards = [...services];
    const targetIndex = Math.min(services.length - 1, currentIndex + 3);
    const [removed] = newCards.splice(currentIndex, 1);
    newCards.splice(targetIndex, 0, removed);

    setServices(newCards);
    setIsSubmitting(true);
    try {
      const saved = await reorderServiceCards(newCards);
      setServices(saved);
      setFeedback({
        type: 'success',
        message: `Priority updated: "${card.title}" moved Down (now #${targetIndex + 1} priority).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update priority order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveToTop = async (card: ServiceCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = services.findIndex((s) => s.id === card.id);
    if (currentIndex <= 0) return;

    const remaining = services.filter((s) => s.id !== card.id);
    const newCards = [card, ...remaining];

    setServices(newCards);
    setIsSubmitting(true);
    try {
      const saved = await reorderServiceCards(newCards);
      setServices(saved);
      setFeedback({
        type: 'success',
        message: `Priority updated: "${card.title}" is now #1 Priority (Shows First on Portal).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update priority order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveToLast = async (card: ServiceCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = services.findIndex((s) => s.id === card.id);
    if (currentIndex < 0 || currentIndex >= services.length - 1) return;

    const remaining = services.filter((s) => s.id !== card.id);
    const newCards = [...remaining, card];

    setServices(newCards);
    setIsSubmitting(true);
    try {
      const saved = await reorderServiceCards(newCards);
      setServices(saved);
      setFeedback({
        type: 'success',
        message: `Priority updated: "${card.title}" moved to Last position (#${newCards.length}).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update priority order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Backwards compatibility aliases
  const handleMoveUp = handleMoveLeft;
  const handleMoveDown = handleMoveRight;

  // Reorder Manager Modal Handlers
  const handleOpenReorderModal = () => {
    setReorderList([...services]);
    setIsReorderModalOpen(true);
  };

  const handleModalMoveItem = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const list = [...reorderList];
    const item = list[index];
    if (!item) return;

    if (direction === 'up' && index > 0) {
      list[index] = list[index - 1];
      list[index - 1] = item;
    } else if (direction === 'down' && index < list.length - 1) {
      list[index] = list[index + 1];
      list[index + 1] = item;
    } else if (direction === 'top' && index > 0) {
      list.splice(index, 1);
      list.unshift(item);
    } else if (direction === 'bottom' && index < list.length - 1) {
      list.splice(index, 1);
      list.push(item);
    }
    setReorderList(list);
  };

  const handleModalSetRank = (index: number, newRank: number) => {
    const targetIdx = Math.max(0, Math.min(reorderList.length - 1, newRank - 1));
    if (targetIdx === index) return;
    const list = [...reorderList];
    const [item] = list.splice(index, 1);
    list.splice(targetIdx, 0, item);
    setReorderList(list);
  };

  const handleSaveReorderModal = async () => {
    setIsSubmitting(true);
    try {
      const saved = await reorderServiceCards(reorderList);
      setServices(saved);
      setIsReorderModalOpen(false);
      setFeedback({
        type: 'success',
        message: 'Priority sequence updated successfully! Portal now reflects the new order.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to save priority order.' });
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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Super Administrator</span>
            <span>•</span>
            <span className="text-[#0b4da2]">Services Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 m-0 whitespace-nowrap">
            <Sparkles className="text-amber-500 shrink-0" size={26} />
            <span>Service Cards Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed m-0">
            Configure dynamic service cards shown on the Employer Services Portal. Use Priority controls to determine which cards appear first or later.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
          <Link
            href="/services"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs whitespace-nowrap"
          >
            <ExternalLink size={14} />
            <span>Preview Portal</span>
          </Link>
          <button
            type="button"
            onClick={handleOpenReorderModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 text-[#0b4da2] text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal size={14} />
            <span>Manage Cards &amp; Priority</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
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

      {/* Metric Cards Row (Exact Dashboard Card Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Active Cards */}
        <div className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight">
              Total Cards
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono my-0.5">
            {totalCards}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Active on /services portal
          </div>
        </div>

        {/* 2. Permanent Core Cards */}
        <div className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-[#0b4da2] transition-colors leading-tight">
              Core Modules
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Lock size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0b4da2] tracking-tight font-mono my-0.5">
            {coreCards}
          </div>
          <div className="text-[11px] text-blue-600 mt-1 truncate">
            Customer &amp; Doc Download
          </div>
        </div>

        {/* 3. Priority Sequence */}
        <div className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-amber-700 transition-colors leading-tight">
              Priority Order
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <ArrowUpDown size={15} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 tracking-tight font-mono my-0.5">
            1 to {totalCards}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Custom Left/Right sequence
          </div>
        </div>

        {/* 4. Tagged Customer Documents */}
        <div className="bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group min-h-[120px]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide group-hover:text-purple-700 transition-colors leading-tight">
              Worker Docs
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700 tracking-tight font-mono my-0.5">
            {totalTaggedDocs}
          </div>
          <div className="text-[11px] text-purple-600 mt-1 truncate">
            Customer file attachments
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service cards by title, tag, or slug..."
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0b4da2] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 font-medium outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium shrink-0">
          <button
            type="button"
            onClick={handleOpenReorderModal}
            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100/80 text-[#0b4da2] px-3 py-1.5 rounded-xl border border-blue-200 font-semibold cursor-pointer transition-all shadow-2xs"
            title="Reorder priority of cards"
          >
            <ArrowUpDown size={13} />
            <span>Priority Order Manager</span>
          </button>
          <div className="flex items-center gap-1.5 pl-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-600">Synced</span>
          </div>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredServices.map((card) => {
          const isCore = card.is_core || card.id === 'customer' || card.id === 'document-download';
          const attachedDocsCount = docCountsByService[card.id] || 0;
          const cardIndex = services.findIndex((s) => s.id === card.id);
          const rank = typeof card.order_num === 'number' && card.order_num > 0 ? card.order_num : cardIndex + 1;
          const isFirst = cardIndex === 0;
          const isLast = cardIndex === services.length - 1;

          return (
            <div
              key={card.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                isCore ? 'border-blue-200 bg-gradient-to-b from-blue-50/20 to-white' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Unified Card Header */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  {/* Left: Icon with Rank Badge overlay */}
                  <div className="relative">
                    <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={getFileUrl(card.image)}
                        alt={card.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    {/* Rank Badge */}
                    <span
                      className={`absolute -top-2 -left-2 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs border flex items-center gap-1 ${
                        rank === 1
                          ? 'bg-amber-500 text-white border-amber-400 ring-2 ring-amber-100'
                          : 'bg-slate-900 text-white border-slate-700'
                      }`}
                      title={`Priority #${rank}`}
                    >
                      {rank === 1 && <Crown size={10} className="fill-white" />}
                      #{rank}
                    </span>
                  </div>

                  {/* Right: Badges & Left/Right Action Controls */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isCore ? (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-blue-200 uppercase tracking-wider">
                          <Lock size={10} /> Core Module
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wider">
                          Dynamic Service
                        </span>
                      )}
                      {card.tag && (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {card.tag}
                        </span>
                      )}
                    </div>

                    {/* 4 Directional Arrow Icon Controls: Left, Right, Up, Down (No text names) */}
                    <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        disabled={isFirst || isSubmitting}
                        onClick={(e) => handleMoveLeft(card, e)}
                        title="Move Left (বামে সরান)"
                        aria-label="Move Left"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-white hover:shadow-xs disabled:opacity-25 disabled:bg-transparent disabled:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={isLast || isSubmitting}
                        onClick={(e) => handleMoveRight(card, e)}
                        title="Move Right (ডানে সরান)"
                        aria-label="Move Right"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-white hover:shadow-xs disabled:opacity-25 disabled:bg-transparent disabled:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ArrowRight size={13} />
                      </button>
                      <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
                      <button
                        type="button"
                        disabled={isFirst || isSubmitting}
                        onClick={(e) => handleMoveRowUp(card, e)}
                        title="Move Up (উপরে সরান)"
                        aria-label="Move Up"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-white hover:shadow-xs disabled:opacity-25 disabled:bg-transparent disabled:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={isLast || isSubmitting}
                        onClick={(e) => handleMoveRowDown(card, e)}
                        title="Move Down (নিচে সরান)"
                        aria-label="Move Down"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-white hover:shadow-xs disabled:opacity-25 disabled:bg-transparent disabled:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Title, Slug & Description */}
                <div className="mt-1">
                  <h3 className="text-base font-extrabold text-slate-900 m-0 leading-snug">
                    {card.title}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 mt-1.5 flex items-center justify-between gap-2 flex-wrap">
                    <span className="truncate max-w-[190px]">Slug: <span className="text-slate-600 font-semibold">{card.id}</span></span>
                    <span className="text-[10px] text-[#0b4da2] font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shrink-0">Priority #{rank}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {card.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Bottom Info & Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <FileText size={13} className="text-slate-400" />
                  <span className="font-semibold text-slate-700">{attachedDocsCount}</span> docs
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(card)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Edit size={12} />
                    <span>Edit</span>
                  </button>
                  {!isCore && (
                    <button
                      type="button"
                      onClick={() => setCardToDelete(card)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all cursor-pointer"
                      title="Delete Service Card"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  <Link
                    href={`/services?verifiedService=${encodeURIComponent(card.id)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0b4da2] text-xs font-bold transition-colors no-underline"
                    title="Test on Portal"
                  >
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

      {/* PRIORITY ORDER MANAGER MODAL */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
                  <ArrowUpDown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 m-0">
                    Priority &amp; Display Order Architecture (প্রাধান্য ও ক্রম সাজান)
                  </h3>
                  <p className="text-xs text-slate-400 m-0">
                    Arrange which cards appear before or after on the Employer Services Portal (/services).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Ordered List */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-2.5 overscroll-contain">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-[#0b4da2] shrink-0" />
                  <span>
                    Card <strong>#1</strong> appears <strong>first</strong> on the services portal. Click Up/Down arrows or enter rank to move.
                  </span>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                  {reorderList.length} Cards
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {reorderList.map((card, idx) => {
                  const rank = idx + 1;
                  const isCore = card.is_core || card.id === 'customer' || card.id === 'document-download';
                  const isFirst = idx === 0;
                  const isLast = idx === reorderList.length - 1;

                  return (
                    <div
                      key={card.id}
                      className={`flex items-center justify-between p-3.5 gap-3 transition-colors ${
                        rank === 1 ? 'bg-amber-50/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Left: Grip & Rank Badge & Icon & Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-slate-300 shrink-0 hidden sm:block">
                          <GripVertical size={16} />
                        </div>

                        {/* Rank Badge */}
                        <div className="shrink-0 w-8 text-center">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500 text-white font-black text-xs shadow-xs">
                              1
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs border border-slate-200">
                              {rank}
                            </span>
                          )}
                        </div>

                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={getFileUrl(card.image)}
                            alt={card.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">{card.title}</span>
                            {isCore && (
                              <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full uppercase">
                                Core
                              </span>
                            )}
                            {card.tag && (
                              <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md">
                                {card.tag}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {rank === 1 ? '★ Shows First on Portal' : `Position ${rank} on Portal`}
                          </span>
                        </div>
                      </div>

                      {/* Right: Direct Rank Input & Up/Down/Top/Bottom Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Direct Rank Jump Input */}
                        <div className="flex items-center gap-1 mr-1">
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Rank:</span>
                          <input
                            type="number"
                            min={1}
                            max={reorderList.length}
                            value={rank}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1 && val <= reorderList.length) {
                                handleModalSetRank(idx, val);
                              }
                            }}
                            className="w-11 text-center bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0b4da2] rounded-lg py-1 text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleModalMoveItem(idx, 'top')}
                          title="Move to Start (#1 Priority / সবার প্রথমে)"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ChevronsLeft size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleModalMoveItem(idx, 'up')}
                          title="Move Left / Earlier (বামে / আগে)"
                          aria-label="Move Left"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#0b4da2] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowLeft size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleModalMoveItem(idx, 'down')}
                          title="Move Right / Later (ডানে / পরে)"
                          aria-label="Move Right"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#0b4da2] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowRight size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleModalMoveItem(idx, 'bottom')}
                          title="Move to End (Last Priority / সবার শেষে)"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ChevronsRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs shrink-0">
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Saves order sequentially from 1 to {reorderList.length}.
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsReorderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveReorderModal}
                  className="px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSubmitting ? 'Saving Sequence...' : 'Save Priority Order'}</span>
                </button>
              </div>
            </div>
          </div>
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
                    {editingCard ? 'Update card details, priority rank and presentation.' : 'Add a new digital service card to the employer portal.'}
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

                {/* Priority / Display Order Position */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                    <span>Display Priority (ক্রম অবস্থান / Priority Rank) *</span>
                    <span className="text-[10px] text-blue-600 font-semibold">1 = First, 2 = Second...</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={services.length + (editingCard ? 0 : 1)}
                      required
                      value={formData.order_num}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          order_num: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-24 bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#0b4da2] rounded-xl px-3.5 py-2 text-xs text-slate-900 font-black outline-none text-center"
                    />
                    <span className="text-xs font-semibold text-slate-600">
                      {formData.order_num === 1 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                          <Crown size={14} /> Shows #1 First on Portal
                        </span>
                      ) : (
                        <span>Shows at position #{formData.order_num} on Portal</span>
                      )}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 m-0">
                    Cards with lower numbers show earlier on the public Employer Services Portal (/services).
                  </p>
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
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                        Priority #{formData.order_num}
                      </span>
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
