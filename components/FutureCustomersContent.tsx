'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  FutureCustomerRecord,
  getStoredFutureCustomers,
  fetchFutureCustomers,
  saveFutureCustomer,
  updateFutureCustomer,
  deleteFutureCustomer,
  subscribeToFutureCustomers,
} from '@/lib/futureCustomerStorage';

interface FutureCustomersContentProps {
  portalType?: 'superadmin' | 'masteradmin' | 'employee';
  baseRoute?: string;
}

export default function FutureCustomersContent({
  portalType = 'superadmin',
  baseRoute = '/customers',
}: FutureCustomersContentProps) {
  const [customers, setCustomers] = useState<FutureCustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'lead' | 'contacted' | 'ready' | 'converted'>('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<FutureCustomerRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form states strictly matching user request:
  // "Customer name Phone No Email No Leaving Address ay feild golo diba"
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState<'lead' | 'contacted' | 'ready' | 'converted'>('lead');

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchFutureCustomers();
      setCustomers(list);
    } catch {
      setCustomers(getStoredFutureCustomers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToFutureCustomers((updated) => {
      setCustomers(updated);
    });
    return unsub;
  }, []);

  const openCreateModal = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormStatus('lead');
    setEditingCustomer(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (cust: FutureCustomerRecord) => {
    setEditingCustomer(cust);
    setFormName(cust.customer_name);
    setFormPhone(cust.phone_no);
    setFormEmail(cust.email_no);
    setFormAddress(cust.leaving_address);
    setFormStatus(cust.status);
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showToast('error', 'Customer Name is required.');
      return;
    }
    if (!formPhone.trim()) {
      showToast('error', 'Phone No is required.');
      return;
    }
    if (!formEmail.trim()) {
      showToast('error', 'Email No is required.');
      return;
    }
    if (!formAddress.trim()) {
      showToast('error', 'Leaving Address is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCustomer) {
        await updateFutureCustomer(editingCustomer.id, {
          customer_name: formName,
          phone_no: formPhone,
          email_no: formEmail,
          leaving_address: formAddress,
          status: formStatus,
        });
        showToast('success', `Future customer "${formName}" updated successfully.`);
      } else {
        await saveFutureCustomer({
          customer_name: formName,
          phone_no: formPhone,
          email_no: formEmail,
          leaving_address: formAddress,
          status: formStatus,
        });
        showToast('success', `Future customer "${formName}" created successfully.`);
      }
      setIsCreateModalOpen(false);
      setEditingCustomer(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save future customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteFutureCustomer(id);
      setDeleteConfirmId(null);
      showToast('info', 'Future customer record deleted.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete record');
    }
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        cust.customer_name.toLowerCase().includes(q) ||
        cust.phone_no.toLowerCase().includes(q) ||
        cust.email_no.toLowerCase().includes(q) ||
        cust.leaving_address.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || cust.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  // Statistics
  const totalCount = customers.length;
  const readyCount = customers.filter((c) => c.status === 'ready').length;
  const contactedCount = customers.filter((c) => c.status === 'contacted').length;
  const leadCount = customers.filter((c) => c.status === 'lead').length;
  const convertedCount = customers.filter((c) => c.status === 'converted').length;

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldCheck size={12} className="text-yellow-400" />
              <span>Candidate &amp; Prospective Registry</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              Future Customer Management
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Upcoming prospective workers and future customers scheduled for visa intake, biometrics verification, and foreign permit registration.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer border-0 whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Add Future Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Total Future Customers
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{totalCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Prospective worker candidates</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Ready for Permit
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">{readyCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Screening passed &amp; ready</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              In Contact / Follow-Up
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 tracking-tight">{contactedCount + leadCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Active leads &amp; inquiries</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 hover:border-purple-400 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Converted to Full
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-600 tracking-tight">{convertedCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Onboarded into worker directory</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone, email, or address..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Prospect Status</option>
              <option value="lead">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="ready">Ready for Permit</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Customer Name</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">Phone No</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px]">Email No</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[240px]">Leaving Address</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">Date Added</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No future customers found</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchQuery
                        ? 'Try clearing the search query or changing filters'
                        : 'Click "Add Future Customer" to register your first candidate'}
                    </p>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-xs"
                    >
                      <Plus size={14} />
                      <span>Add Future Customer</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const createFullUrl = `${baseRoute}/create?name=${encodeURIComponent(
                    cust.customer_name
                  )}&phone=${encodeURIComponent(cust.phone_no)}&email=${encodeURIComponent(
                    cust.email_no
                  )}&address=${encodeURIComponent(cust.leaving_address)}`;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Customer Name */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-[#0b4da2] flex items-center justify-center font-bold text-xs shrink-0">
                            {cust.customer_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase() || 'FC'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {cust.customer_name}
                            </div>
                            <div className="text-[11px] text-slate-400">ID #{cust.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone No */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span>{cust.phone_no}</span>
                        </div>
                      </td>

                      {/* Email No */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail size={13} className="text-slate-400 shrink-0" />
                          <span>{cust.email_no}</span>
                        </div>
                      </td>

                      {/* Leaving Address */}
                      <td className="py-4 px-4 align-middle text-xs">
                        <div className="flex items-start gap-1.5 text-slate-700 max-w-xs line-clamp-2">
                          <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                          <span>{cust.leaving_address}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.status === 'ready'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cust.status === 'contacted'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : cust.status === 'converted'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cust.status === 'ready'
                                ? 'bg-emerald-500'
                                : cust.status === 'contacted'
                                ? 'bg-amber-500'
                                : cust.status === 'converted'
                                ? 'bg-purple-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <span className="capitalize">{cust.status || 'Lead'}</span>
                        </span>
                      </td>

                      {/* Date Added */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap text-slate-500 text-xs">
                        {cust.created_at ? new Date(cust.created_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Convert to Full Customer button */}
                          <Link
                            href={createFullUrl}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors no-underline"
                            title="Convert candidate to full customer permit application"
                          >
                            <span>Convert</span>
                            <ArrowRight size={12} />
                          </Link>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(cust)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors cursor-pointer border-0 bg-transparent"
                            title="Edit customer details"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                            title="Delete customer"
                          >
                            <Trash2 size={14} />
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

      {/* Create / Edit Future Customer Modal strictly with requested fields:
          "Customer name Phone No Email No Leaving Address" */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#072a6b] to-[#0c4da2] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <UserPlus size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white m-0">
                    {editingCustomer ? 'Edit Future Customer' : 'Create Future Customer'}
                  </h3>
                  <p className="text-[11px] text-blue-100/80 m-0">
                    Fill the candidate details to register for upcoming permit intake
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Field 1: Customer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Mohammad Rafiqul Islam"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-1 focus:ring-[#0b4da2] transition-all font-medium"
                />
              </div>

              {/* Field 2: Phone No */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Phone No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. +60 11-2345 6789"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-1 focus:ring-[#0b4da2] transition-all font-medium"
                />
              </div>

              {/* Field 3: Email No */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Email No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. rafiqul.islam@example.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-1 focus:ring-[#0b4da2] transition-all font-medium"
                />
              </div>

              {/* Field 4: Leaving Address */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Leaving Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. No 45, Jalan Putra Permai, Seri Kembangan, 43300 Selangor"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:ring-1 focus:ring-[#0b4da2] transition-all font-medium resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#22a34a] hover:bg-[#1b843c] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer border-0"
                >
                  {editingCustomer ? 'Update Future Customer' : 'Save Future Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Future Customer</h3>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to delete this prospective customer record? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors border-0 cursor-pointer shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

