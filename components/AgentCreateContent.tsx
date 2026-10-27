'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Camera,
  CheckCircle2,
  FileText,
  Phone,
  Save,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { createAgent, AgentRecord } from '@/lib/agentStorage';

interface AgentCreateContentProps {
  portalType: 'superadmin' | 'frontend_superadmin';
  backUrl: string;
}

export default function AgentCreateContent({ portalType, backUrl }: AgentCreateContentProps) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size must be under 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setImageName(file.name);
    };
    reader.onerror = () => {
      setFeedback({ type: 'error', message: 'Failed to read image file.' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setImage('');
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Please enter the agent name.' });
      return;
    }
    if (!phone.trim()) {
      setFeedback({ type: 'error', message: 'Please enter the agent phone number.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await createAgent({
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        image: image || undefined,
      });

      setFeedback({ type: 'success', message: `Agent "${name}" created successfully!` });

      setTimeout(() => {
        router.push(backUrl);
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create agent.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Agent Directory</span>
        </Link>

        <span className="text-xs text-slate-400 font-mono">
          Agent Management • Registration
        </span>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
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
            className="text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0b4da2]">
            <Briefcase size={16} />
            <span>Create Recruitment Agent</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 m-0">
            Register New Agency Partner
          </h2>
          <p className="text-xs text-slate-500 mt-1 m-0">
            Register authorized recruitment agents, attach official contact info, portrait picture, and specialization remarks.
          </p>
        </div>

        {/* Agent Photo Upload Section */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group shrink-0">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 shadow-2xs flex items-center justify-center p-0.5 overflow-hidden cursor-pointer hover:border-[#0b4da2] transition-colors"
              title="Click to Upload Photo"
            >
              {image ? (
                <img src={image} alt="Agent Preview" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-[#0b4da2] font-black text-2xl flex items-center justify-center">
                  <User size={32} className="text-[#0b4da2]" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0b4da2] hover:bg-[#083a7c] text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-110"
              title="Upload Agent Photo"
            >
              <Camera size={12} />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer border-0"
              >
                <Upload size={12} />
                <span>{image ? 'Change Photo' : 'Upload Agent Photo'}</span>
              </button>

              {image && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                  title="Remove Photo"
                >
                  <X size={12} />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 m-0">
              Agent portrait or agency representative photograph. Recommended format: Square JPG, PNG, or WebP up to 5MB.
            </p>
            {imageName && (
              <span className="inline-block text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {imageName}
              </span>
            )}
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          {/* Agent Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Agent Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={15} />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Md. Rafiqul Islam / Ahmad Farhan"
                className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Phone / WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Phone / WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Phone size={15} />
              </span>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +880 1712-345678 or +60 19-876 5432"
                className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-semibold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 m-0">
              Include country code (e.g. +880, +60, +62) for WhatsApp quick-chat integration.
            </p>
          </div>

          {/* Notes & Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Recruitment Remarks &amp; Specialization <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Primary recruitment partner for construction workforce, plantation workers, or specific countries..."
                className="w-full bg-slate-50/70 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href={backUrl}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors no-underline cursor-pointer"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#22a34a] hover:bg-[#1b843c] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            <span>{isSubmitting ? 'Registering Agent...' : 'Save Agent Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
