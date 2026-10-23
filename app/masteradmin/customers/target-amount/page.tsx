'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Filter,
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
import {
  CustomerRecord,
  getStoredCustomers,
  fetchCustomersFromBackend,
} from '@/lib/customerStorage';
import {
  CustomerTargetAmountRecord,
  getStoredCustomerTargets,
  fetchCustomerTargets,
  fetchCustomerDeposits,
  saveCustomerTarget,
  deleteCustomerTarget,
  getCustomerFinanceBalance,
  CustomerFinanceBalance,
  TARGET_CATEGORIES,
  PAYMENT_TERMS,
} from '@/lib/customerFinanceStorage';
import { getMasterAdminUser, AuthUser } from '@/lib/auth';

export interface CustomerTargetListItem {
  id: string | number;
  targetRecordId?: string | number;
  customerId: string | number;
  customerName: string;
  passportNo?: string;
  nidNo?: string;
  companyId?: string;
  companyName?: string;
  targetAmount: number;
  targetCategory: string;
  targetDate?: string;
  paymentTerms?: string;
  status: 'In Progress' | 'Achieved' | 'On Hold' | 'Cancelled' | 'Not Set';
  remarks?: string;
  createdAt?: string;
  hasTarget: boolean;
}

export default function MasterAdminCustomerTargetAmountPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [records, setRecords] = useState<CustomerTargetAmountRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Edit form states (Only opens when an admin clicks "Edit Target" on a customer)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState<number | ''>(3500);
  const [formCategory, setFormCategory] = useState(TARGET_CATEGORIES[0]);
  const [formDate, setFormDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formTerms, setFormTerms] = useState(PAYMENT_TERMS[0]);
  const [formStatus, setFormStatus] = useState<'In Progress' | 'Achieved' | 'On Hold' | 'Cancelled'>('In Progress');
  const [formRemarks, setFormRemarks] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const user = getMasterAdminUser();
    setCurrentUser(user);

    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setCustomers(list);
      })
      .catch(() => {});

    setRecords(getStoredCustomerTargets());
    Promise.all([
      fetchCustomerTargets().catch(() => []),
      fetchCustomerDeposits().catch(() => []),
    ])
      .then(([tList]) => {
        if (Array.isArray(tList) && tList.length > 0) setRecords(tList);
      })
      .catch(() => {});

    const handler = () => {
      setRecords(getStoredCustomerTargets());
      setCustomers(getStoredCustomers());
    };
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
    return currentUser && Array.isArray(currentUser.assigned_companies)
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  // Scoped customers by assigned companies
  const permittedCustomers = useMemo(() => {
    if (assignedList.length === 0) return [];
    if (assignedList.includes('*')) return customers;
    return customers.filter((c) => {
      const cId = (c.company_id || '').trim().toLowerCase();
      return assignedList.some((id) => id.trim().toLowerCase() === cId);
    });
  }, [customers, assignedList]);

  // Scoped records
  const permittedRecords = useMemo(() => {
    if (assignedList.includes('*')) return records;
    return records.filter((r) => {
      const rComp = (r.company_id || '').trim().toLowerCase();
      return assignedList.some((id) => id.trim().toLowerCase() === rComp);
    });
  }, [records, assignedList]);

  // Unified Customer Target List (Shows all customers and their set target amount)
  const customerTargetList: CustomerTargetListItem[] = useMemo(() => {
    const list: CustomerTargetListItem[] = [];
    const processedCustIds = new Set<string>();

    permittedCustomers.forEach((cust) => {
      const cIdStr = String(cust.id);
      processedCustIds.add(cIdStr);

      const targetRec = permittedRecords.find((r) => String(r.customer_id) === cIdStr);
      const bal = getCustomerFinanceBalance(cust.id);

      if (targetRec) {
        list.push({
          id: targetRec.id,
          targetRecordId: targetRec.id,
          customerId: cust.id,
          customerName: cust.full_name || targetRec.customer_name,
          passportNo: cust.passport_no || targetRec.passport_no,
          nidNo: cust.nid_no || targetRec.nid_no,
          companyId: cust.company_id || targetRec.company_id,
          companyName: cust.company_id || targetRec.company_name,
          targetAmount: Number(targetRec.target_amount) || 0,
          targetCategory: targetRec.target_category || TARGET_CATEGORIES[0],
          targetDate: targetRec.target_date,
          paymentTerms: targetRec.payment_terms || PAYMENT_TERMS[0],
          status: targetRec.status,
          remarks: targetRec.remarks,
          createdAt: targetRec.created_at,
          hasTarget: true,
        });
      } else {
        list.push({
          id: `cust_${cust.id}`,
          targetRecordId: undefined,
          customerId: cust.id,
          customerName: cust.full_name,
          passportNo: cust.passport_no,
          nidNo: cust.nid_no,
          companyId: cust.company_id,
          companyName: cust.company_id,
          targetAmount: bal.total_target > 0 ? bal.total_target : 0,
          targetCategory: 'Migration Package',
          targetDate: undefined,
          paymentTerms: PAYMENT_TERMS[0],
          status: bal.total_target > 0 ? (bal.status === 'Settled' ? 'Achieved' : 'In Progress') : 'Not Set',
          remarks: undefined,
          createdAt: cust.created_at,
          hasTarget: bal.total_target > 0,
        });
      }
    });

    permittedRecords.forEach((r) => {
      const rCId = String(r.customer_id);
      if (!processedCustIds.has(rCId)) {
        processedCustIds.add(rCId);
        list.push({
          id: r.id,
          targetRecordId: r.id,
          customerId: r.customer_id,
          customerName: r.customer_name,
          passportNo: r.passport_no,
          nidNo: r.nid_no,
          companyId: r.company_id,
          companyName: r.company_name,
          targetAmount: Number(r.target_amount) || 0,
          targetCategory: r.target_category || TARGET_CATEGORIES[0],
          targetDate: r.target_date,
          paymentTerms: r.payment_terms || PAYMENT_TERMS[0],
          status: r.status,
          remarks: r.remarks,
          createdAt: r.created_at,
          hasTarget: true,
        });
      }
    });

    return list;
  }, [permittedCustomers, permittedRecords, records]);

  // Filtered customer target rows
  const filteredRecords = useMemo(() => {
    return customerTargetList.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.customerName.toLowerCase().includes(term) ||
        (item.passportNo && item.passportNo.toLowerCase().includes(term)) ||
        (item.nidNo && item.nidNo.toLowerCase().includes(term)) ||
        (item.companyName && item.companyName.toLowerCase().includes(term)) ||
        item.targetCategory.toLowerCase().includes(term);

      const matchCategory = filterCategory === 'ALL' || item.targetCategory === filterCategory;
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'Not Set' ? !item.hasTarget || item.status === 'Not Set' : item.status === filterStatus);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [customerTargetList, searchTerm, filterCategory, filterStatus]);

  // Selected customer object for editing
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return (
      permittedCustomers.find((c) => String(c.id) === String(selectedCustomerId)) ||
      customerTargetList.find((item) => String(item.customerId) === String(selectedCustomerId)) ||
      null
    );
  }, [permittedCustomers, customerTargetList, selectedCustomerId]);

  // Selected customer balance
  const customerBalance: CustomerFinanceBalance | null = useMemo(() => {
    if (!selectedCustomerId) return null;
    return getCustomerFinanceBalance(selectedCustomerId);
  }, [selectedCustomerId, records]);

  // Live calculation preview during edit
  const editPreviewCalculation = useMemo(() => {
    const targetVal = formAmount === '' ? 0 : Number(formAmount) || 0;
    const depositedVal = customerBalance ? Number(customerBalance.total_deposited) || 0 : 0;
    const remainingPending = Math.max(0, targetVal - depositedVal);
    const progressPercent = targetVal > 0 ? Math.min(100, Math.round((depositedVal / targetVal) * 100)) : 0;
    const isSettled = targetVal > 0 && remainingPending === 0;

    return {
      targetVal,
      depositedVal,
      remainingPending,
      progressPercent,
      isSettled,
    };
  }, [formAmount, customerBalance]);

  // KPI Calculations
  const totalTargetPipeline = useMemo(() => {
    return customerTargetList.reduce((sum, item) => sum + (item.targetAmount || 0), 0);
  }, [customerTargetList]);

  const achievedTarget = useMemo(() => {
    return customerTargetList
      .filter((item) => item.status === 'Achieved')
      .reduce((sum, item) => sum + (item.targetAmount || 0), 0);
  }, [customerTargetList]);

  const inProgressTarget = useMemo(() => {
    return customerTargetList
      .filter((item) => item.status === 'In Progress')
      .reduce((sum, item) => sum + (item.targetAmount || 0), 0);
  }, [customerTargetList]);

  const targetCoverageCount = useMemo(() => {
    return customerTargetList.filter((item) => item.hasTarget && item.targetAmount > 0).length;
  }, [customerTargetList]);

  // Open edit for a specific customer
  const handleEditCustomer = (item: CustomerTargetListItem) => {
    setSelectedCustomerId(String(item.customerId));
    setEditingId(item.targetRecordId ? String(item.targetRecordId) : null);
    setFormAmount(item.targetAmount > 0 ? item.targetAmount : 3500);
    setFormCategory(
      item.targetCategory && item.targetCategory !== 'Migration Package'
        ? item.targetCategory
        : TARGET_CATEGORIES[0]
    );
    setFormDate(
      item.targetDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    setFormTerms(item.paymentTerms || PAYMENT_TERMS[0]);
    setFormStatus(item.status === 'Not Set' ? 'In Progress' : (item.status as any));
    setFormRemarks(item.remarks || '');
    setIsFormOpen(true);

    setTimeout(() => {
      document.getElementById('edit-target-form-card')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedCustomer) {
      showToast('info', 'Customer not selected for editing.');
      return;
    }
    if (formAmount === '' || Number(formAmount) < 0) {
      showToast('info', 'Please enter a valid target amount.');
      return;
    }

    const sc = selectedCustomer as any;
    const targetCustomerName = sc.full_name || sc.customerName || '';
    const targetPassport = sc.passport_no || sc.passportNo || '';
    const targetNid = sc.nid_no || sc.nidNo || '';
    const targetComp = sc.company_name || sc.company_id || sc.companyId || '';

    const newRecord: CustomerTargetAmountRecord = {
      id: editingId || `target_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: selectedCustomer.id || selectedCustomerId,
      customer_name: targetCustomerName,
      passport_no: targetPassport,
      nid_no: targetNid,
      company_id: targetComp,
      company_name: targetComp,
      target_amount: Number(formAmount),
      target_category: formCategory,
      target_date: formDate,
      quota_workers_count: 1,
      payment_terms: formTerms,
      status: formStatus,
      remarks: formRemarks.trim(),
      created_at: editingId
        ? records.find((r) => String(r.id) === String(editingId))?.created_at || new Date().toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCustomerTarget(newRecord);
    showToast('success', `Target amount for "${targetCustomerName}" updated successfully!`);

    setIsFormOpen(false);
    setEditingId(null);
    setSelectedCustomerId('');
    setFormRemarks('');
  };

  const handleDelete = (id: string) => {
    deleteCustomerTarget(id);
    setDeleteConfirmId(null);
    showToast('info', 'Customer target record removed successfully.');
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#0b4da2] via-[#0d59ba] to-[#1268d8] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 text-indigo-100 border border-white/20 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldCheck size={12} className="text-emerald-300" />
              <span>Admin Customer Financial Target Ledger</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
              Customer Target Amount
            </h1>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl leading-relaxed m-0">
              Review all foreign workers and their established target amounts. Click <strong>Edit Target</strong> to update any worker&apos;s financial quota and payment schedule.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/masteradmin/customers"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap no-underline"
            >
              <Users size={14} />
              <span>Customer Directory</span>
            </Link>
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
              Total Target Volume
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              RM {totalTargetPipeline.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold">
              {targetCoverageCount} of {customerTargetList.length} workers set
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Achieved Targets
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
              RM {achievedTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              RM {inProgressTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              RM{' '}
              {targetCoverageCount > 0
                ? Math.round(totalTargetPipeline / targetCoverageCount).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : '0.00'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">For established targets</div>
          </div>
        </div>
      </div>

      {/* EDIT TARGET AMOUNT FORM MODAL / PANEL (Only visible when clicking "Edit Target") */}
      {isFormOpen && selectedCustomer && (
        <div id="edit-target-form-card" className="bg-white border-2 border-[#0b4da2]/30 rounded-2xl p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold">
                <Edit2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  Edit Target Amount:{' '}
                  <span className="text-[#0b4da2]">
                    {(selectedCustomer as any).full_name || (selectedCustomer as any).customerName}
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                  <span>
                    Passport: {(selectedCustomer as any).passport_no || (selectedCustomer as any).passportNo || 'N/A'}
                  </span>
                  <span>•</span>
                  <span>
                    Company: {(selectedCustomer as any).company_name || (selectedCustomer as any).company_id || (selectedCustomer as any).companyId || 'Individual'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingId(null);
                setSelectedCustomerId('');
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer border-0 transition-colors"
              title="Close edit form"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live Calculation Preview Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Live Calculation Preview
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                    (Target − Deposited = Pending)
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    editPreviewCalculation.isSettled
                      ? 'bg-emerald-100 text-emerald-800'
                      : editPreviewCalculation.depositedVal > 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {editPreviewCalculation.isSettled
                    ? 'Settled'
                    : editPreviewCalculation.depositedVal > 0
                    ? 'Partially Paid'
                    : 'Pending'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
                <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-blue-700 block uppercase font-bold">New Target</span>
                  <span className="font-black text-blue-900 text-xs sm:text-sm">
                    RM {editPreviewCalculation.targetVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 block uppercase font-bold">Total Deposited</span>
                  <span className="font-black text-emerald-900 text-xs sm:text-sm">
                    RM {editPreviewCalculation.depositedVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-100">
                  <span className="text-[10px] text-amber-700 block uppercase font-bold">Remaining Pending</span>
                  <span className="font-black text-amber-900 text-xs sm:text-sm">
                    RM {editPreviewCalculation.remainingPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
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
                    className="w-full pl-10 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:border-[#0b4da2] focus:outline-hidden"
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-[#0b4da2] focus:outline-hidden bg-white"
                >
                  {TARGET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-[#0b4da2] focus:outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-[#0b4da2] focus:outline-hidden bg-white"
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-[#0b4da2] focus:outline-hidden bg-white"
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-[#0b4da2] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingId(null);
                  setSelectedCustomerId('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083c80] text-white shadow-xs transition-all cursor-pointer border-0"
              >
                Save Target Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOMER TARGET AMOUNT LIST TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by worker name, passport, company..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#0b4da2] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Categories</option>
              {TARGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Achieved">Achieved</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Not Set">Not Set</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-5 min-w-[260px] w-[260px]">Customer / Foreign Worker</th>
                <th className="py-4 px-4 min-w-[190px] w-[190px]">Employer Company</th>
                <th className="py-4 px-4 min-w-[220px] w-[220px]">Target Category &amp; Terms</th>
                <th className="py-4 px-5 min-w-[200px] w-[200px] text-right">Set Target Amount</th>
                <th className="py-4 px-4 min-w-[130px] w-[130px] text-center">Due Date</th>
                <th className="py-4 px-4 min-w-[170px] w-[170px] text-center">Status</th>
                <th className="py-4 px-5 min-w-[140px] w-[140px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Target size={36} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    <div className="font-semibold text-slate-600">No customers found.</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search or category filter.</div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const bal = getCustomerFinanceBalance(item.customerId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-sm">{item.customerName}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {item.passportNo ? `Passport: ${item.passportNo}` : 'No Passport'}
                          {item.nidNo ? ` • NID: ${item.nidNo}` : ''}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-700 text-xs">
                        {item.companyName || item.companyId || 'Individual'}
                      </td>

                      <td className="py-4 px-4">
                        {item.hasTarget ? (
                          <>
                            <span className="font-semibold text-slate-800 text-xs block">{item.targetCategory}</span>
                            {item.paymentTerms && (
                              <span className="text-[11px] text-slate-500 block mt-0.5">{item.paymentTerms}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No target package set</span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        {item.hasTarget && item.targetAmount > 0 ? (
                          <>
                            <div className="font-black font-mono text-[#0b4da2] text-sm sm:text-base">
                              RM {item.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs font-mono text-slate-500 mt-1 flex items-center justify-end gap-1.5 flex-wrap">
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Dep: RM {bal.total_deposited.toLocaleString()}
                              </span>
                              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                Due: RM {bal.net_pending.toLocaleString()}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div>
                            <span className="font-mono text-slate-400 font-semibold text-xs">RM 0.00</span>
                            <div className="text-[11px] text-slate-400">Unset</div>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center text-slate-600 font-mono text-xs">
                        {item.targetDate || '—'}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide border shadow-2xs whitespace-nowrap ${
                            item.status === 'Achieved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : item.status === 'On Hold'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : item.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.status === 'Achieved'
                                ? 'bg-emerald-500'
                                : item.status === 'In Progress'
                                ? 'bg-blue-500 animate-pulse'
                                : item.status === 'On Hold'
                                ? 'bg-amber-500'
                                : item.status === 'Cancelled'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{item.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditCustomer(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#0b4da2] hover:text-white bg-blue-50 hover:bg-[#0b4da2] border border-blue-200 hover:border-transparent transition-all cursor-pointer shadow-2xs"
                            title="Edit customer target amount"
                          >
                            <Edit2 size={13} />
                            <span>Edit Target</span>
                          </button>

                          {item.hasTarget && item.targetRecordId && (
                            deleteConfirmId === item.targetRecordId ? (
                              <div className="inline-flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(String(item.targetRecordId))}
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
                                onClick={() => setDeleteConfirmId(String(item.targetRecordId))}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-0"
                                title="Reset/Delete target"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
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
    </div>
  );
}
