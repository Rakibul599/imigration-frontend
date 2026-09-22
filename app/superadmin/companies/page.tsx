'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Filter,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import {
  deleteStoredCompany,
  fetchCompaniesFromBackend,
  getStoredCompanies,
  resetStoredCompanies,
  saveStoredCompany,
  subscribeToCompanyChanges,
  updateStoredCompany,
} from '@/lib/companyStorage';

const SECTOR_OPTIONS = [
  'Civil & Building Construction',
  'Agriculture & Plantation',
  'Manufacturing & Healthcare',
  'Hospitality & Services',
  'Agri-Commodity & Processing',
  'Engineering & Development',
  'Logistics & Supply Chain',
  'General Commercial & Services',
];

const TAG_OPTIONS = [
  'Verified JIM',
  'Active Quota',
  'Tier 1 Employer',
  'Govt Certified',
  'Major Sponsor',
  'New Registration',
];

const LOGO_PRESETS = [
  { label: 'Gamuda', path: '/images/companies/gamuda.svg' },
  { label: 'Sime Darby', path: '/images/companies/sime-darby.svg' },
  { label: 'Top Glove', path: '/images/companies/top-glove.svg' },
  { label: 'Genting', path: '/images/companies/genting.svg' },
  { label: 'IOI Group', path: '/images/companies/ioi-group.svg' },
  { label: 'Sunway', path: '/images/companies/sunway.svg' },
];

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states for Create & Edit
  const [formName, setFormName] = useState('');
  const [formRoc, setFormRoc] = useState('');
  const [formSector, setFormSector] = useState(SECTOR_OPTIONS[0]);
  const [formCustomSector, setFormCustomSector] = useState('');
  const [formTag, setFormTag] = useState(TAG_OPTIONS[0]);
  const [formWorkers, setFormWorkers] = useState<number>(1500);
  const [formLogo, setFormLogo] = useState(LOGO_PRESETS[0].path);
  const [formDescription, setFormDescription] = useState('');

  // Initial load from storage and sync from backend
  useEffect(() => {
    setCompanies(getStoredCompanies());
    fetchCompaniesFromBackend().then((list) => {
      setCompanies(list);
    }).catch(() => {});

    const unsub = subscribeToCompanyChanges(() => {
      setCompanies(getStoredCompanies());
    });
    return unsub;
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    setFormName('');
    setFormRoc(`ROC-${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 90000000)}`);
    setFormSector(SECTOR_OPTIONS[0]);
    setFormCustomSector('');
    setFormTag('Active Quota');
    setFormWorkers(1500);
    setFormLogo(LOGO_PRESETS[0].path);
    setFormDescription('Newly registered employer entity within the Malaysian Immigration portal.');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormName(company.name);
    setFormRoc(company.roc);
    if (SECTOR_OPTIONS.includes(company.sector)) {
      setFormSector(company.sector);
      setFormCustomSector('');
    } else {
      setFormSector('OTHER');
      setFormCustomSector(company.sector);
    }
    setFormTag(company.tag || 'Verified JIM');
    setFormWorkers(company.totalWorkers || 0);
    setFormLogo(company.logo || LOGO_PRESETS[0].path);
    setFormDescription(company.description || '');
    setIsCreateModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsLoading(true);
    const finalSector = formSector === 'OTHER' ? formCustomSector.trim() || 'General Services' : formSector;
    const finalId = editingCompany
      ? editingCompany.id
      : formName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const companyData: Company = {
      id: finalId,
      name: formName.trim().toUpperCase(),
      roc: formRoc.trim(),
      sector: finalSector,
      tag: formTag,
      totalWorkers: Number(formWorkers) || 0,
      logo: formLogo,
      description: formDescription.trim() || 'Newly registered employer entity within the Malaysian Immigration portal.',
    };

    if (editingCompany) {
      const updated = await updateStoredCompany(companyData);
      setCompanies(updated);
      showToast('success', `Company "${companyData.name}" has been updated in database.`);
    } else {
      const updated = await saveStoredCompany(companyData);
      setCompanies(updated);
      showToast('success', `Company "${companyData.name}" successfully created in Laravel & MySQL.`);
    }

    setIsLoading(false);
    setIsCreateModalOpen(false);
    setEditingCompany(null);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    const updated = await deleteStoredCompany(id);
    setCompanies(updated);
    setDeleteConfirmId(null);
    setIsLoading(false);
    showToast('info', 'Company record deleted from database.');
  };

  const handleResetDefaults = async () => {
    if (confirm('Are you sure you want to restore default companies in the database?')) {
      setIsLoading(true);
      const restored = await resetStoredCompanies();
      setCompanies(restored);
      setIsLoading(false);
      showToast('info', 'Company registry restored to default initial data in MySQL.');
    }
  };

  // Filtered List
  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.roc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tag && c.tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSector = selectedSector === 'ALL' || c.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const totalWorkersCount = companies.reduce((acc, c) => acc + (c.totalWorkers || 0), 0);
  const distinctSectors = new Set(companies.map((c) => c.sector)).size;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 text-xs animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-3 text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header with Title and Underline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
                Super Admin — Employer Companies Registry
              </h1>
              <span className="bg-blue-100 text-[#0b4da2] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {companies.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0">
              Create, edit, and manage registered employer organizations. Stored in Laravel MySQL database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Reset companies to default dataset in MySQL"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-sm transition-all cursor-pointer border-0"
            >
              <Plus size={16} />
              <span>Create New Company</span>
            </button>
          </div>
        </div>
      </div>

      {/* White KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Registered Companies
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {companies.length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Foreign Worker Quota
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {totalWorkersCount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Covered Sectors
            </p>
            <p className="text-xl font-bold text-slate-900 m-0 mt-0.5">
              {distinctSectors}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider m-0">
              Backend Database
            </p>
            <p className="text-xs font-bold text-emerald-700 m-0 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Laravel API • MySQL Connected
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company, ROC, sector..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 bg-transparent border-0 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={15} className="text-slate-500 shrink-0" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer w-full sm:w-auto shadow-xs"
            >
              <option value="ALL">All Sectors ({companies.length})</option>
              {SECTOR_OPTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* The Signature Table Matching User's Frontend Screenshot */}
      <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#22a34a] text-white text-xs font-bold">
              <th className="py-3 px-4 border-r border-green-600/60 w-[45%]">
                Company Name
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 w-[20%]">
                ROC &amp; Sector Remark
              </th>
              <th className="py-3 px-4 border-r border-green-600/60 text-center w-[15%]">
                Workers Quota
              </th>
              <th className="py-3 px-4 text-right w-[20%]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredCompanies.map((company) => (
              <tr
                key={company.id}
                className="hover:bg-blue-50/40 transition-colors group"
              >
                {/* Company Name with Logo */}
                <td className="py-3.5 px-4 border-r border-slate-200 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                      <img
                        src={company.logo || '/images/companies/gamuda.svg'}
                        alt={company.name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', '/images/companies/gamuda.svg');
                        }}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setViewingCompany(company)}
                        className="text-[#2563eb] hover:text-[#1d4ed8] hover:underline font-semibold text-[13px] tracking-tight block text-left bg-transparent border-0 p-0 cursor-pointer"
                      >
                        {company.name}
                      </button>
                      <span className="inline-block text-[11px] font-mono text-slate-500 mt-0.5">
                        {company.roc}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Sector Remark & Tag */}
                <td className="py-3.5 px-4 border-r border-slate-200 align-middle text-slate-600">
                  <div className="space-y-1">
                    <span className="text-slate-700 text-[11px] font-medium block">
                      {company.sector}
                    </span>
                    <span className="inline-block text-[10px] font-semibold bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded">
                      {company.tag || 'Verified JIM'}
                    </span>
                  </div>
                </td>

                {/* Quota */}
                <td className="py-3.5 px-4 border-r border-slate-200 text-center align-middle">
                  <strong className="text-slate-800 text-xs block font-mono">
                    {company.totalWorkers ? company.totalWorkers.toLocaleString() : '0'}
                  </strong>
                  <span className="text-[10px] text-slate-400">workers</span>
                </td>

                {/* Action Buttons matching screenshot style */}
                <td className="py-3 px-4 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* View Company Card inside Admin */}
                    <button
                      type="button"
                      onClick={() => setViewingCompany(company)}
                      title="View Company Details Card"
                      className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      <BookOpen size={15} />
                    </button>

                    {/* Edit Company */}
                    <button
                      type="button"
                      onClick={() => openEditModal(company)}
                      title="Edit Company Details"
                      className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* Delete Company */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(company.id)}
                      title="Delete Company Record"
                      className="w-8 h-8 rounded border border-slate-300 bg-white hover:bg-red-50 flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredCompanies.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                  No company found matching &quot;{searchTerm}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL matching companies/page.tsx Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingCompany(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 m-0">
                  {editingCompany ? 'Edit Employer Company' : 'Create New Company'}
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  {editingCompany
                    ? 'Update registered organization details and quota.'
                    : 'Register a new employer organization in the Malaysian Immigration database.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCompany} className="flex flex-col gap-3.5 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NATASHA CONSTRUCTION SDN. BHD."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 uppercase font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ROC Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ROC-202601099234"
                    value={formRoc}
                    onChange={(e) => setFormRoc(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Foreign Worker Quota
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formWorkers}
                    onChange={(e) => setFormWorkers(Number(e.target.value))}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Industry / Sector
                </label>
                <select
                  value={formSector}
                  onChange={(e) => setFormSector(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 cursor-pointer bg-white"
                >
                  {SECTOR_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="OTHER">Other (Specify Below)</option>
                </select>
                {formSector === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="e.g. Telecommunications & Networks"
                    value={formCustomSector}
                    onChange={(e) => setFormCustomSector(e.target.value)}
                    className="mt-2 w-full h-10 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Verification Status Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormTag(tag)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                        formTag === tag
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Corporate Logo
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {LOGO_PRESETS.map((lp) => (
                    <button
                      key={lp.path}
                      type="button"
                      onClick={() => setFormLogo(lp.path)}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                        formLogo === lp.path
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center">
                        <img src={lp.path} alt={lp.label} className="max-h-full max-w-full object-contain" />
                      </div>
                      <span className="text-[10px] text-slate-600 truncate w-full text-center">
                        {lp.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Official registered notes or business activities..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingCompany(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0 shadow-xs disabled:opacity-50"
                >
                  {isLoading ? 'Saving to Database...' : editingCompany ? 'Save Changes' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 m-0 mb-1">
              Delete Company Record?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              This action will remove the company from the MySQL database and public employer directory.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-xs"
              >
                {isLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-ADMIN COMPANY DETAILS VIEW CARD MODAL */}
      {viewingCompany && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingCompany(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>

            {/* Header: Company Avatar & Identifiers */}
            <div className="flex items-start gap-4 mb-5 pb-5 border-b border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                <img
                  src={viewingCompany.logo || '/images/companies/gamuda.svg'}
                  alt={viewingCompany.name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', '/images/companies/gamuda.svg');
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    {viewingCompany.tag || 'Verified JIM'}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {viewingCompany.roc}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 m-0 leading-tight">
                  {viewingCompany.name}
                </h2>
                <p className="text-xs text-[#0b4da2] font-semibold m-0 mt-0.5">
                  {viewingCompany.sector}
                </p>
              </div>
            </div>

            {/* Two Column Metric Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">
                  Foreign Worker Quota
                </span>
                <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                  {viewingCompany.totalWorkers ? viewingCompany.totalWorkers.toLocaleString() : '0'}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">Active Authorized Permits</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">
                  Database Identifier
                </span>
                <span className="text-xs font-bold text-slate-900 mt-1 block truncate font-mono">
                  {viewingCompany.id}
                </span>
                <span className="text-[10px] text-blue-600 font-semibold">MySQL Record Connected</span>
              </div>
            </div>

            {/* Scope & Description Card */}
            <div className="mb-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                Company Scope &amp; Remarks
              </span>
              <p className="text-xs text-slate-600 m-0 leading-relaxed">
                {viewingCompany.description || 'Newly registered employer entity within the portal.'}
              </p>
            </div>

            {/* Actions inside Modal */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const toEdit = viewingCompany;
                  setViewingCompany(null);
                  openEditModal(toEdit);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Edit2 size={13} />
                <span>Edit Company</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingCompany(null)}
                className="px-5 py-2 bg-[#0b4da2] hover:bg-[#083c80] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0 shadow-xs"
              >
                Close Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
