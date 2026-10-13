'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Filter,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  CustomerRecord,
  getStoredCustomers,
  fetchCustomersFromBackend,
} from '@/lib/customerStorage';
import {
  CustomerTargetAmountRecord,
  getStoredCustomerTargets,
  fetchCustomerTargets,
  saveCustomerTarget,
  deleteCustomerTarget,
  getCustomerFinanceBalance,
  CustomerFinanceBalance,
} from '@/lib/customerFinanceStorage';
import { getMasterAdminUser, AuthUser } from '@/lib/auth';

const TARGET_CATEGORIES = [
  'Complete Migration Package',
  'Foreign Worker Permit (Calling Visa)',
  'Annual Levi Quota Fee',
  'FOMEMA Medical Clearance',
  'Insurance & Security Bond',
  'Work Permit Renewal',
  'Visa Extension & Stamping',
  'Custom Employer Package',
];

const PAYMENT_TERMS = [
  'Full Upfront Payment',
  '2 Installments (50% / 50%)',
  '3 Installments',
  'Monthly Salary Deduction',
  'Employer Sponsored',
];

export default function MasterAdminCustomerTargetAmountPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [records, setRecords] = useState<CustomerTargetAmountRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState<number | ''>(3500);
  const [formCategory, setFormCategory] = useState(TARGET_CATEGORIES[0]);
  const [formDate, setFormDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formTerms, setFormTerms] = useState(PAYMENT_TERMS[0]);
  const [formStatus, setFormStatus] = useState<'In Progress' | 'Achieved' | 'On Hold' | 'Cancelled'>('In Progress');
  const [formRemarks, setFormRemarks] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const user = getMasterAdminUser();
    setCurrentUser(user);

    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) setCustomers(list);
    }).catch(() => {});

    setRecords(getStoredCustomerTargets());
    fetchCustomerTargets().then((list) => {
      if (Array.isArray(list) && list.length > 0) setRecords(list);
    }).catch(() => {});

    const handler = () => setRecords(getStoredCustomerTargets());
    window.addEventListener('customerTargetsUpdated', handler);
    window.addEventListener('customerDepositsUpdated', handler);
    window.addEventListener('customerPendingsUpdated', handler);
    return () => {
      window.removeEventListener('customerTargetsUpdated', handler);
      window.removeEventListener('customerDepositsUpdated', handler);
      window.removeEventListener('customerPendingsUpdated', handler);
    };
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Assigned companies
  const assignedList = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  // Customer Financial Balance
  const customerBalance: CustomerFinanceBalance | null = useMemo(() => {
    if (!selectedCustomerId) return null;
    return getCustomerFinanceBalance(selectedCustomerId);
  }, [selectedCustomerId, records]);

  // Scoped customers
  const permittedCustomers = useMemo(() => {
    if (assignedList.length === 0) return [];
    if (assignedList.includes('*')) return customers;
    return customers.filter((c) => {
      const cId = (c.company_id || '').trim().toLowerCase();
      return assignedList.some((id) => id.trim().toLowerCase() === cId);
    });
  }, [customers, assignedList]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return permittedCustomers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [permittedCustomers, selectedCustomerId]);

  // Customer options for Select2
  const customerOptions: Select2Option[] = useMemo(() => {
    return permittedCustomers.map((c) => ({
      value: String(c.id),
      label: c.full_name,
      subLabel: `${c.passport_no || 'No Passport'} • ${c.company_id || 'Individual'}`,
      badge: c.working_sector || c.status,
    }));
  }, [permittedCustomers]);

  // Scoped records
  const permittedRecords = useMemo(() => {
    if (assignedList.includes('*')) return records;
    return records.filter((r) => {
      const rComp = (r.company_id || '').trim().toLowerCase();
      return assignedList.some((id) => id.trim().toLowerCase() === rComp);
    });
  }, [records, assignedList]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return permittedRecords.filter((rec) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        rec.customer_name.toLowerCase().includes(term) ||
        (rec.passport_no && rec.passport_no.toLowerCase().includes(term)) ||
        (rec.nid_no && rec.nid_no.toLowerCase().includes(term)) ||
        (rec.company_name && rec.company_name.toLowerCase().includes(term)) ||
        rec.target_category.toLowerCase().includes(term);

      const matchCategory = filterCategory === 'ALL' || rec.target_category === filterCategory;
      const matchStatus = filterStatus === 'ALL' || rec.status === filterStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [permittedRecords, searchTerm, filterCategory, filterStatus]);

  // KPI Calculations
  const totalTargetPipeline = useMemo(() => {
    return permittedRecords.reduce((sum, r) => sum + (Number(r.target_amount) || 0), 0);
  }, [permittedRecords]);

  const achievedTarget = useMemo(() => {
    return permittedRecords
      .filter((r) => r.status === 'Achieved')
      .reduce((sum, r) => sum + (Number(r.target_amount) || 0), 0);
  }, [permittedRecords]);

  const inProgressTarget = useMemo(() => {
    return permittedRecords
      .filter((r) => r.status === 'In Progress')
      .reduce((sum, r) => sum + (Number(r.target_amount) || 0), 0);
  }, [permittedRecords]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedCustomer) {
      showToast('info', 'Please select a customer first.');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      showToast('info', 'Please enter a valid target amount.');
      return;
    }

    const newRecord: CustomerTargetAmountRecord = {
      id: editingId || `target_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.full_name,
      passport_no: selectedCustomer.passport_no,
      nid_no: selectedCustomer.nid_no,
      company_id: selectedCustomer.company_id,
      company_name: selectedCustomer.company_id,
      target_amount: Number(formAmount),
      target_category: formCategory,
      target_date: formDate,
      quota_workers_count: 1,
      payment_terms: formTerms,
      status: formStatus,
      remarks: formRemarks.trim(),
      created_at: editingId
        ? records.find((r) => r.id === editingId)?.created_at || new Date().toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCustomerTarget(newRecord);
    showToast(
      'success',
      editingId
        ? `Target amount for "${selectedCustomer.full_name}" updated!`
        : `Target amount for "${selectedCustomer.full_name}" registered!`
    );

    setEditingId(null);
    setFormRemarks('');
  };

  const handleEdit = (rec: CustomerTargetAmountRecord) => {
    setEditingId(String(rec.id));
    setSelectedCustomerId(String(rec.customer_id));
    setFormAmount(rec.target_amount);
    setFormCategory(rec.target_category || TARGET_CATEGORIES[0]);
    if (rec.target_date) setFormDate(rec.target_date);
    if (rec.payment_terms) setFormTerms(rec.payment_terms);
    setFormStatus(rec.status);
    setFormRemarks(rec.remarks || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    deleteCustomerTarget(id);
    setDeleteConfirmId(null);
    showToast('info', 'Customer target record removed successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldCheck size={12} className="text-yellow-400" />
              <span>Master Administrator Console • Regional Authority</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
              Customer Target Amount Management
            </h1>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl leading-relaxed m-0">
              Manage financial target allocations, quota commitments, and payment schedules for assigned employer accounts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/masteradmin/customers"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap no-underline"
            >
              <ArrowLeft size={14} />
              <span>Customer Directory</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setSelectedCustomerId('');
                setFormAmount(3500);
                setIsFormOpen(!isFormOpen);
              }}
              className="inline-flex items-center gap-1.5 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer border-0 whitespace-nowrap"
            >
              <Plus size={15} />
              <span>{isFormOpen ? 'Collapse Form' : 'New Target'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <Target size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Target Amount
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              RM {totalTargetPipeline.toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold">{permittedRecords.length} records in scope</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Achieved Target
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
              RM {achievedTarget.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">Fully settled commitments</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              In Progress Target
            </span>
            <div className="text-2xl font-black text-amber-700 mt-0.5 font-mono">
              RM {inProgressTarget.toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-600 font-medium">Active ongoing collections</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avg Target / Worker
            </span>
            <div className="text-2xl font-black text-purple-700 mt-0.5 font-mono">
              RM {permittedRecords.length > 0 ? Math.round(totalTargetPipeline / permittedRecords.length).toLocaleString() : '0'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Per foreign worker</div>
          </div>
        </div>
      </div>

      {/* FORM: Create or Edit Target Amount */}
      {isFormOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Target size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  {editingId ? 'Edit Target Amount Record' : 'Record New Customer Target Amount'}
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  Select customer from your assigned companies and establish financial targets.
                </p>
              </div>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormRemarks('');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Customer / Worker <span className="text-red-500">*</span>
                </label>
                <Select2Search
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={(val) => setSelectedCustomerId(val)}
                  placeholder="Search by worker name, passport, company..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Customer &amp; Financial Ledger Balance
                </label>
                {selectedCustomer ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {selectedCustomer.full_name}
                        </span>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5 font-mono">
                          <span>Passport: {selectedCustomer.passport_no || 'N/A'}</span>
                          <span>•</span>
                          <span>Employer: {selectedCustomer.company_id || 'Individual'}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        customerBalance?.status === 'Settled'
                          ? 'bg-emerald-100 text-emerald-800'
                          : customerBalance?.status === 'Partially Paid'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {customerBalance?.status || selectedCustomer.status}
                      </span>
                    </div>

                    {/* Financial balance breakdown */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 font-mono text-center">
                      <div className="bg-blue-50/70 p-1.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] text-blue-700 block uppercase font-bold">Total Target</span>
                        <span className="font-black text-blue-900 text-xs">
                          RM {customerBalance ? customerBalance.total_target.toLocaleString() : '0'}
                        </span>
                      </div>
                      <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 block uppercase font-bold">Deposited</span>
                        <span className="font-black text-emerald-900 text-xs">
                          RM {customerBalance ? customerBalance.total_deposited.toLocaleString() : '0'}
                        </span>
                      </div>
                      <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-amber-700 block uppercase font-bold">Pending Dues</span>
                        <span className="font-black text-amber-900 text-xs">
                          RM {customerBalance ? customerBalance.net_pending.toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                    Select a customer from the dropdown to review financial balance &amp; target.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Amount (RM) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">RM</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="3500.00"
                    className="w-full pl-10 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
                >
                  {TARGET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Achieved">Achieved</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Terms
                </label>
                <select
                  value={formTerms}
                  onChange={(e) => setFormTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden bg-white"
                >
                  {PAYMENT_TERMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Remarks / Case Notes
                </label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Additional terms or notes for this worker..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083c80] text-white shadow-xs transition-all cursor-pointer border-0"
              >
                {editingId ? 'Save Changes' : 'Establish Target Amount'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by worker, passport, company..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
            >
              <option value="ALL">All Categories</option>
              {TARGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
            >
              <option value="ALL">All Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Achieved">Achieved</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Customer / Worker</th>
                <th className="py-3 px-4">Employer Company</th>
                <th className="py-3 px-4">Target Category</th>
                <th className="py-3 px-4 text-right">Target Amount</th>
                <th className="py-3 px-4">Target Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Target size={32} className="mx-auto mb-2 opacity-30" />
                    <div>No customer target amount records found.</div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{rec.customer_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {rec.passport_no || rec.nid_no || 'No Passport'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {rec.company_name || rec.company_id || 'Individual'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{rec.target_category}</span>
                      {rec.payment_terms && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{rec.payment_terms}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-black font-mono text-[#0b4da2] text-sm">
                        RM {Number(rec.target_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      {(() => {
                        const bal = getCustomerFinanceBalance(rec.customer_id);
                        return (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            <span className="text-emerald-700 font-semibold">
                              Dep: RM {bal.total_deposited.toLocaleString()}
                            </span>
                            {' • '}
                            <span className="text-amber-700 font-semibold">
                              Pending: RM {bal.net_pending.toLocaleString()}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {rec.target_date || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          rec.status === 'Achieved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : rec.status === 'On Hold'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(rec)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer border-0"
                          title="Edit target record"
                        >
                          <Edit2 size={14} />
                        </button>

                        {deleteConfirmId === rec.id ? (
                          <div className="inline-flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                            <button
                              type="button"
                              onClick={() => handleDelete(String(rec.id))}
                              className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer border-0"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-[10px] text-slate-500 hover:text-slate-800 px-1 cursor-pointer border-0 bg-transparent"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(String(rec.id))}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-0"
                            title="Delete record"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
