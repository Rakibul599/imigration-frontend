'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  FileCheck,
  FileText,
  Filter,
  Lock,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Upload,
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
  CustomerDepositAmountRecord,
  getStoredCustomerDeposits,
  fetchCustomerDeposits,
  saveCustomerDeposit,
  deleteCustomerDeposit,
  getCustomerFinanceBalance,
  CustomerFinanceBalance,
  getFileUrl,
} from '@/lib/customerFinanceStorage';
import { getCurrentUser, AuthUser } from '@/lib/auth';

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Cash',
  'CDM',
  'Cheque',
  'Online FPX',
  'Direct Debit',
] as const;

const DEPOSIT_PURPOSES = [
  'Levi Quota Deposit',
  'Visa Processing Advance',
  'FOMEMA Medical Payment',
  'Work Permit Renewal Deposit',
  'Security Bond & Insurance',
  'Flight & Transportation Fee',
  'General Account Balance Deposit',
];

const MALAYSIAN_BANKS = [
  'Maybank (Malayan Banking Berhad)',
  'CIMB Bank',
  'Public Bank Berhad',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam',
  'Other / Direct Cash CDM',
];

export default function EmployeeCustomerDepositAmountPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [records, setRecords] = useState<CustomerDepositAmountRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState<number | ''>(1200);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formMethod, setFormMethod] = useState<typeof PAYMENT_METHODS[number]>('Bank Transfer');
  const [formBank, setFormBank] = useState(MALAYSIAN_BANKS[0]);
  const [formReceiptNo, setFormReceiptNo] = useState(`REC-${Date.now().toString().slice(-6)}`);
  const [formDepositedBy, setFormDepositedBy] = useState('');
  const [formDepositorPhone, setFormDepositorPhone] = useState('');
  const [formPurpose, setFormPurpose] = useState(DEPOSIT_PURPOSES[0]);
  const [formReceiptUrl, setFormReceiptUrl] = useState<string | null>(null);
  const [formReceiptFilename, setFormReceiptFilename] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Verified' | 'Pending Verification' | 'Reconciled'>('Verified');
  const [formRemarks, setFormRemarks] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) setCustomers(list);
    }).catch(() => {});

    setRecords(getStoredCustomerDeposits());
    fetchCustomerDeposits().then((list) => {
      if (Array.isArray(list) && list.length > 0) setRecords(list);
    }).catch(() => {});

    const handler = () => setRecords(getStoredCustomerDeposits());
    window.addEventListener('customerDepositsUpdated', handler);
    window.addEventListener('customerTargetsUpdated', handler);
    window.addEventListener('customerPendingsUpdated', handler);
    // Read URL query params for pre-selected customer from pending-amount page
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cid = params.get('customerId');
      const amt = params.get('amount');
      if (cid) {
        setSelectedCustomerId(cid);
        setIsFormOpen(true);
      }
      if (amt && Number(amt) > 0) {
        setFormAmount(Number(amt));
      }
    }

    return () => {
      window.removeEventListener('customerDepositsUpdated', handler);
      window.removeEventListener('customerTargetsUpdated', handler);
      window.removeEventListener('customerPendingsUpdated', handler);
    };
  }, []);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Permissions & Company Scope
  const assignedList = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  const custPerms = useMemo(() => {
    return currentUser?.module_permissions?.customers || {
      view: true,
      create: true,
      edit: true,
      delete: false,
      deposit_amount: true,
    };
  }, [currentUser]);

  const hasViewAccess = custPerms.view !== false && custPerms.deposit_amount !== false;
  const canCreate = custPerms.create !== false;
  const canEdit = custPerms.edit !== false;
  const canDelete = Boolean(custPerms.delete);

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
        (rec.receipt_no && rec.receipt_no.toLowerCase().includes(term)) ||
        (rec.company_name && rec.company_name.toLowerCase().includes(term)) ||
        rec.purpose.toLowerCase().includes(term);

      const matchMethod = filterMethod === 'ALL' || rec.payment_method === filterMethod;
      const matchStatus = filterStatus === 'ALL' || rec.verification_status === filterStatus;

      return matchSearch && matchMethod && matchStatus;
    });
  }, [permittedRecords, searchTerm, filterMethod, filterStatus]);

  // KPI Calculations
  const totalDepositsCollected = useMemo(() => {
    return permittedRecords.reduce((sum, r) => sum + (Number(r.deposit_amount) || 0), 0);
  }, [permittedRecords]);

  const verifiedDeposits = useMemo(() => {
    return permittedRecords
      .filter((r) => r.verification_status === 'Verified')
      .reduce((sum, r) => sum + (Number(r.deposit_amount) || 0), 0);
  }, [permittedRecords]);

  const bankTransferCount = useMemo(() => {
    return permittedRecords.filter((r) => r.payment_method === 'Bank Transfer').length;
  }, [permittedRecords]);

  // Customer Financial Balance & Dynamic Calculation Preview
  const customerBalance: CustomerFinanceBalance | null = useMemo(() => {
    if (!selectedCustomerId) return null;
    return getCustomerFinanceBalance(selectedCustomerId);
  }, [selectedCustomerId, records]);

  const depositCalculationPreview = useMemo(() => {
    if (!customerBalance) return null;
    const inputAmount = Number(formAmount) || 0;
    const targetAmount = customerBalance.total_target;
    const editingRecord = editingId ? records.find((r) => r.id === editingId) : null;
    const oldAmount = editingRecord ? Number(editingRecord.deposit_amount) || 0 : 0;
    const baseDeposited = Math.max(0, customerBalance.total_deposited - oldAmount);
    const newTotalDeposited = baseDeposited + inputAmount;
    const remainingPending = Math.max(0, targetAmount - newTotalDeposited);
    const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((newTotalDeposited / targetAmount) * 100)) : 0;

    return {
      targetAmount,
      baseDeposited,
      inputAmount,
      newTotalDeposited,
      remainingPending,
      progressPercent,
      isFullySettled: targetAmount > 0 && remainingPending === 0,
      hasTarget: targetAmount > 0,
    };
  }, [customerBalance, formAmount, editingId, records]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormReceiptFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFormReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate && !editingId) {
      showToast('error', 'You do not have permission to create deposit records.');
      return;
    }
    if (!canEdit && editingId) {
      showToast('error', 'You do not have permission to edit deposit records.');
      return;
    }
    if (!selectedCustomerId || !selectedCustomer) {
      showToast('info', 'Please select a customer.');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      showToast('info', 'Please enter a valid deposit amount.');
      return;
    }

    const targetSnapshot = depositCalculationPreview?.targetAmount || 0;
    const remainingPendingSnapshot = depositCalculationPreview?.remainingPending !== undefined
      ? depositCalculationPreview.remainingPending
      : Math.max(0, targetSnapshot - Number(formAmount));

    const newRecord: CustomerDepositAmountRecord = {
      id: editingId || `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.full_name,
      passport_no: selectedCustomer.passport_no,
      nid_no: selectedCustomer.nid_no,
      company_id: selectedCustomer.company_id,
      company_name: selectedCustomer.company_id,
      deposit_amount: Number(formAmount),
      target_amount: targetSnapshot,
      remaining_pending: remainingPendingSnapshot,
      deposit_date: formDate,
      payment_method: formMethod,
      bank_name: formMethod === 'Cash' || formMethod === 'CDM' ? undefined : formBank,
      receipt_no: formReceiptNo.trim(),
      deposited_by: formDepositedBy.trim() || selectedCustomer.full_name,
      depositor_phone: formDepositorPhone.trim() || selectedCustomer.phone,
      purpose: formPurpose,
      receipt_url: formReceiptUrl || undefined,
      receipt_filename: formReceiptFilename || undefined,
      verification_status: formStatus,
      remarks: formRemarks.trim(),
      created_at: editingId
        ? records.find((r) => r.id === editingId)?.created_at || new Date().toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCustomerDeposit(newRecord);
    showToast(
      'success',
      editingId
        ? `Deposit record for "${selectedCustomer.full_name}" updated! Remaining Pending: RM ${remainingPendingSnapshot.toLocaleString()}`
        : `Deposit of RM ${Number(formAmount).toLocaleString()} recorded! Remaining Pending: RM ${remainingPendingSnapshot.toLocaleString()}`
    );

    setEditingId(null);
    setFormReceiptUrl(null);
    setFormReceiptFilename('');
    setFormRemarks('');
    setFormReceiptNo(`REC-${Date.now().toString().slice(-6)}`);
  };

  const handleEdit = (rec: CustomerDepositAmountRecord) => {
    if (!canEdit) {
      showToast('error', 'Edit permission is restricted for your employee profile.');
      return;
    }
    setEditingId(String(rec.id));
    setSelectedCustomerId(String(rec.customer_id));
    setFormAmount(rec.deposit_amount);
    setFormDate(rec.deposit_date);
    setFormMethod(rec.payment_method);
    if (rec.bank_name) setFormBank(rec.bank_name);
    setFormReceiptNo(rec.receipt_no || '');
    setFormDepositedBy(rec.deposited_by || '');
    setFormDepositorPhone(rec.depositor_phone || '');
    setFormPurpose(rec.purpose);
    setFormReceiptUrl(rec.receipt_url || null);
    setFormReceiptFilename(rec.receipt_filename || '');
    setFormStatus(rec.verification_status as any);
    setFormRemarks(rec.remarks || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      showToast('error', 'Delete permission is restricted for your employee profile.');
      return;
    }
    deleteCustomerDeposit(id);
    setDeleteConfirmId(null);
    showToast('info', 'Customer deposit record removed successfully.');
  };

  // Access Denied Screen
  if (!hasViewAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-200">
          <Lock size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-800 m-0">Access Denied: Deposit Amount Module</h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
          Your employee role has not been granted authorization to access the Customer Deposit Amount module. Please contact your Master Admin or Super Administrator.
        </p>
        <Link
          href="/employee/customers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083c80] px-4 py-2 rounded-xl transition-all no-underline"
        >
          <ArrowLeft size={14} />
          <span>Back to Customers</span>
        </Link>
      </div>
    );
  }

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
          ) : (
            <ShieldAlert size={16} className="text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0b4da2] via-[#0d59ba] to-[#1268d8] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 text-blue-100 border border-white/20 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <UserCheck size={12} className="text-emerald-300" />
              <span>Employee Collections Desk • Clearance: {currentUser?.employee_code || 'EMP'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
              Customer Deposit &amp; Payment Receipts
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Record inbound customer deposits, bank transfer slips, cash CDM payments, and official payment receipts for assigned workers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/employee/customers"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap no-underline"
            >
              <ArrowLeft size={14} />
              <span>Customer Directory</span>
            </Link>

            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setSelectedCustomerId('');
                  setFormAmount(1200);
                  setIsFormOpen(!isFormOpen);
                }}
                className="inline-flex items-center gap-1.5 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer border-0 whitespace-nowrap"
              >
                <Plus size={15} />
                <span>{isFormOpen ? 'Collapse Form' : 'New Deposit'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Deposits Collected
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              RM {totalDepositsCollected.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">{permittedRecords.length} deposit records</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Verified In Bank
            </span>
            <div className="text-2xl font-black text-blue-900 mt-0.5 font-mono">
              RM {verifiedDeposits.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-600 font-medium">Bank confirmed receipts</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <CreditCard size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Bank Transfers
            </span>
            <div className="text-2xl font-black text-purple-700 mt-0.5 font-mono">
              {bankTransferCount}
            </div>
            <div className="text-[10px] text-purple-600 font-medium">Direct electronic wires</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Wallet size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avg Deposit / Record
            </span>
            <div className="text-2xl font-black text-amber-700 mt-0.5 font-mono">
              RM {permittedRecords.length > 0 ? Math.round(totalDepositsCollected / permittedRecords.length).toLocaleString() : '0'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Per inbound transaction</div>
          </div>
        </div>
      </div>

      {/* FORM: Record Customer Deposit Amount */}
      {isFormOpen && (canCreate || editingId) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Plus size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  {editingId ? 'Edit Customer Deposit Record' : 'Record Inbound Deposit / Bank Slip'}
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  Select customer, input deposit amount and attach payment verification slip.
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
                        <span className="text-[10px] text-blue-700 block uppercase font-bold">Target</span>
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
                    Select a customer to view target, deposited, and remaining pending balances.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposit Amount (RM) <span className="text-red-500">*</span>
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
                    placeholder="1200.00"
                    className="w-full pl-10 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposit Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Receiving Bank
                </label>
                <select
                  value={formBank}
                  onChange={(e) => setFormBank(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                >
                  {MALAYSIAN_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Receipt / Voucher Ref No
                </label>
                <input
                  type="text"
                  value={formReceiptNo}
                  onChange={(e) => setFormReceiptNo(e.target.value)}
                  placeholder="REC-123456"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposit Purpose
                </label>
                <select
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                >
                  {DEPOSIT_PURPOSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposited By
                </label>
                <input
                  type="text"
                  value={formDepositedBy}
                  onChange={(e) => setFormDepositedBy(e.target.value)}
                  placeholder="Name of depositor or worker"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Verification Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                >
                  <option value="Verified">Verified</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Reconciled">Reconciled</option>
                </select>
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            {selectedCustomer && depositCalculationPreview && (
              <div className="bg-gradient-to-r from-blue-50/80 via-emerald-50/80 to-teal-50/80 border border-blue-200/80 rounded-xl p-3.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/50 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Live Balance Calculation: Target − Deposit = Pending
                    </span>
                  </div>
                  {depositCalculationPreview.hasTarget ? (
                    <span className="text-[11px] font-bold text-blue-700">
                      Payment Progress: {depositCalculationPreview.progressPercent}%
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      ⚠️ No Target set yet for this customer
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white/90 p-2 rounded-lg border border-slate-200/70">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Target Amount</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-blue-900">
                      RM {depositCalculationPreview.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-white/90 p-2 rounded-lg border border-slate-200/70">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">This Deposit (+)</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-700">
                      RM {depositCalculationPreview.inputAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-white/90 p-2 rounded-lg border border-slate-200/70">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Deposited</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-900">
                      RM {depositCalculationPreview.newTotalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className={`p-2 rounded-lg border ${depositCalculationPreview.remainingPending === 0 && depositCalculationPreview.hasTarget ? 'bg-emerald-100 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
                    <span className="text-[10px] font-bold text-slate-600 block uppercase">Remaining Pending (−)</span>
                    <span className={`text-xs sm:text-sm font-black font-mono ${depositCalculationPreview.remainingPending === 0 && depositCalculationPreview.hasTarget ? 'text-emerald-700' : 'text-amber-800'}`}>
                      RM {depositCalculationPreview.remainingPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {depositCalculationPreview.isFullySettled && (
                  <div className="mt-2 text-center text-xs font-bold text-emerald-800 bg-emerald-100/90 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>This deposit will fully settle all pending dues for {selectedCustomer.full_name}!</span>
                  </div>
                )}
              </div>
            )}

            {/* File Upload for Bank Slip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Attach Deposit Voucher / Bank Slip
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer transition-colors">
                    <Upload size={14} />
                    <span>Upload Slip File</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {formReceiptFilename && (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 truncate">
                      <FileCheck size={14} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{formReceiptFilename}</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deposit Remarks
                </label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Transaction reference, notes or CDM machine info..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083c80] text-white shadow-xs transition-all cursor-pointer border-0"
              >
                {editingId ? 'Save Changes' : 'Confirm Deposit Entry'}
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
                placeholder="Search by worker, receipt no, purpose..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
            >
              <option value="ALL">All Payment Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
            >
              <option value="ALL">All Status</option>
              <option value="Verified">Verified</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Reconciled">Reconciled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Receipt Ref &amp; Date</th>
                <th className="py-3 px-4">Customer / Worker</th>
                <th className="py-3 px-4">Purpose &amp; Method</th>
                <th className="py-3 px-4 text-right">Deposit Amount</th>
                <th className="py-3 px-4 text-center">Slip / Proof</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                    <div>No customer deposit amount records found.</div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-[#0b4da2]">{rec.receipt_no || 'NO-REF'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{rec.deposit_date}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{rec.customer_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {rec.company_name || rec.company_id || 'Individual'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{rec.purpose}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {rec.payment_method} {rec.bank_name ? `• ${rec.bank_name}` : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-black font-mono text-emerald-700 text-sm">
                        RM {Number(rec.deposit_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      {rec.target_amount !== undefined && rec.target_amount > 0 ? (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>Target: RM {Number(rec.target_amount).toLocaleString()}</span>
                          {rec.remaining_pending !== undefined && (
                            <span className="block text-amber-700 font-semibold">
                              Pending Left: RM {Number(rec.remaining_pending).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {rec.receipt_url ? (
                        <a
                          href={getFileUrl(rec.receipt_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded-md"
                        >
                          <FileText size={12} />
                          <span>View Slip</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No file</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          rec.verification_status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.verification_status === 'Pending Verification'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {rec.verification_status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEdit(rec)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer border-0"
                            title="Edit deposit record"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {canDelete && (
                          deleteConfirmId === rec.id ? (
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
                          )
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
