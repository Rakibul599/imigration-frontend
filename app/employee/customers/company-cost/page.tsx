'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Edit2,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Lock,
  Paperclip,
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
  CustomerCompanyCostRecord,
  CompanyCostDocument,
  getStoredCompanyCosts,
  saveCompanyCost,
  deleteCompanyCost,
} from '@/lib/customerFinanceStorage';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
} from '@/lib/serviceStorage';
import { getCurrentUser, AuthUser } from '@/lib/auth';

const EXPENSE_CATEGORIES = [
  'Immigration Levi (JIM Direct)',
  'FOMEMA Medical Examination',
  'Foreign Worker Insurance & Security Bond',
  'Calling Visa & Stamping Fees',
  'Airport Clearance & Logistics',
  'Worker Quarantine / Hostel Setup',
  'Agent Commission & Processing',
  'Corporate Employer Operational Expense',
];

export default function EmployeeCustomerCompanyCostPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [records, setRecords] = useState<CustomerCompanyCostRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Service cards for tagging uploaded documents (matching CustomerFormFullPage "kon card kon document jave")
  const [availableServices, setAvailableServices] = useState<ServiceCard[]>(() => {
    return typeof window !== 'undefined' ? getStoredServices() : [];
  });

  const selectableServices = useMemo(() => {
    return availableServices.filter(
      (s) => s.id !== 'customer' && s.id !== 'document-download'
    );
  }, [availableServices]);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formSource, setFormSource] = useState('Company Treasury');
  const [formRefNo, setFormRefNo] = useState(`COST-${Date.now().toString().slice(-6)}`);
  const [formStatus, setFormStatus] = useState<'Paid' | 'Incurred' | 'Reconciled'>('Paid');
  const [formRemarks, setFormRemarks] = useState('');

  // Multiple Documents list (exact fields as Customer Create + Value (Amount) column)
  const [documents, setDocuments] = useState<CompanyCostDocument[]>([
    {
      id: `doc_1`,
      name: 'Passport Copy & Clearance',
      service_id: '',
      service_name: '',
      service_category: 'General Document',
      value: 1200,
      issue_date: new Date().toISOString().split('T')[0],
      expire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ]);

  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<CustomerCompanyCostRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) setCustomers(list);
    }).catch(() => {});

    fetchServiceCards().then((svcList) => {
      if (Array.isArray(svcList) && svcList.length > 0) setAvailableServices(svcList);
    }).catch(() => {});

    setRecords(getStoredCompanyCosts());
    const handler = () => setRecords(getStoredCompanyCosts());
    window.addEventListener('companyCostsUpdated', handler);
    return () => window.removeEventListener('companyCostsUpdated', handler);
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
      company_cost: true,
    };
  }, [currentUser]);

  const hasViewAccess = custPerms.view !== false && custPerms.company_cost !== false;
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

  // Document rows management (matching CustomerFormFullPage)
  const handleAddDocumentRow = () => {
    setDocuments((prev) => [
      ...prev,
      {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Document Attachment #${prev.length + 1}`,
        service_id: '',
        service_name: '',
        service_category: 'General Document',
        value: 0,
        issue_date: new Date().toISOString().split('T')[0],
        expire_date: '',
      },
    ]);
  };

  const handleDocumentFieldChange = (
    index: number,
    field: keyof CompanyCostDocument,
    val: any
  ) => {
    setDocuments((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleDocumentServiceChange = (index: number, serviceId: string) => {
    const matched = selectableServices.find((s) => s.id === serviceId);
    setDocuments((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        service_id: serviceId,
        service_name: matched ? matched.title : '',
        service_category: matched ? matched.title : 'General Document',
      };
      return copy;
    });
  };

  const handleDocumentFileChange = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const sizeStr =
        file.size < 1024 * 1024
          ? `${Math.round(file.size / 1024)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      setDocuments((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          fileName: file.name,
          fileSize: sizeStr,
          fileType: file.type,
          fileUrl: dataUrl,
          dataUrl: dataUrl,
          url: dataUrl,
          size: sizeStr,
          type: file.type,
        };
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocumentRow = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Import existing documents from customer profile (with service cards pre-tagged)
  const handleImportCustomerDocuments = () => {
    if (!selectedCustomer?.documents || selectedCustomer.documents.length === 0) {
      showToast('info', 'This customer does not have any profile documents to import.');
      return;
    }
    const imported: CompanyCostDocument[] = selectedCustomer.documents.map((d, i) => ({
      id: `doc_import_${Date.now()}_${i}`,
      name: d.name || `Document #${i + 1}`,
      service_id: d.service_id || '',
      service_name: d.service_name || '',
      service_category: d.service_name || 'General Document',
      value: 0,
      issue_date: d.issue_date || '',
      expire_date: d.expire_date || '',
      fileName: d.name || 'document',
      fileSize: d.size || '',
      fileType: d.type || '',
      fileUrl: d.dataUrl || d.url || '',
      url: d.url || d.dataUrl || '',
      dataUrl: d.dataUrl || d.url || '',
      size: d.size || '',
      type: d.type || '',
    }));
    setDocuments(imported);
    showToast(
      'success',
      `Imported ${imported.length} document(s) from "${selectedCustomer.full_name}". Please enter Value (Amount) for each.`
    );
  };

  // Real-time calculated sum of all document values
  const calculatedTotalCost = useMemo(() => {
    return documents.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  }, [documents]);

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
        (rec.reference_no && rec.reference_no.toLowerCase().includes(term)) ||
        (rec.company_name && rec.company_name.toLowerCase().includes(term)) ||
        rec.expense_category.toLowerCase().includes(term);

      const matchCategory = filterCategory === 'ALL' || rec.expense_category === filterCategory;
      const matchStatus = filterStatus === 'ALL' || rec.status === filterStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [permittedRecords, searchTerm, filterCategory, filterStatus]);

  // KPI Calculations
  const grandTotalCost = useMemo(() => {
    return permittedRecords.reduce((sum, r) => sum + (Number(r.total_cost_amount) || 0), 0);
  }, [permittedRecords]);

  const totalDocumentsCount = useMemo(() => {
    return permittedRecords.reduce((sum, r) => sum + (r.documents?.length || 0), 0);
  }, [permittedRecords]);

  const paidCount = useMemo(() => {
    return permittedRecords.filter((r) => r.status === 'Paid').length;
  }, [permittedRecords]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate && !editingId) {
      showToast('error', 'You do not have permission to create company cost records.');
      return;
    }
    if (!canEdit && editingId) {
      showToast('error', 'You do not have permission to edit company cost records.');
      return;
    }
    if (!selectedCustomerId || !selectedCustomer) {
      showToast('info', 'Please select a customer first.');
      return;
    }
    if (documents.length === 0) {
      showToast('info', 'Please attach at least one expense document.');
      return;
    }
    if (calculatedTotalCost <= 0) {
      showToast('info', 'Total cost must be greater than RM 0.');
      return;
    }

    const newRecord: CustomerCompanyCostRecord = {
      id: editingId || `cost_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.full_name,
      passport_no: selectedCustomer.passport_no,
      nid_no: selectedCustomer.nid_no,
      company_id: selectedCustomer.company_id,
      company_name: selectedCustomer.company_id,
      total_cost_amount: calculatedTotalCost,
      expense_category: formCategory,
      expense_date: formDate,
      payment_source: formSource.trim(),
      reference_no: formRefNo.trim(),
      documents: [...documents],
      status: formStatus,
      remarks: formRemarks.trim(),
      created_at: editingId
        ? records.find((r) => r.id === editingId)?.created_at || new Date().toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCompanyCost(newRecord);
    showToast(
      'success',
      editingId
        ? `Company cost record for "${selectedCustomer.full_name}" updated!`
        : `Company cost of RM ${calculatedTotalCost.toLocaleString()} recorded for "${selectedCustomer.full_name}"!`
    );

    setEditingId(null);
    setFormRemarks('');
    setFormRefNo(`COST-${Date.now().toString().slice(-6)}`);
    setDocuments([
      {
        id: `doc_1`,
        name: 'Immigration Levi Receipt Slip',
        service_category: 'Immigration Levi',
        value: 1850,
        issue_date: new Date().toISOString().split('T')[0],
        expire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ]);
  };

  const handleEdit = (rec: CustomerCompanyCostRecord) => {
    if (!canEdit) {
      showToast('error', 'Edit permission is restricted for your employee profile.');
      return;
    }
    setEditingId(rec.id);
    setSelectedCustomerId(String(rec.customer_id));
    setFormCategory(rec.expense_category);
    setFormDate(rec.expense_date);
    if (rec.payment_source) setFormSource(rec.payment_source);
    if (rec.reference_no) setFormRefNo(rec.reference_no);
    setFormStatus(rec.status);
    setFormRemarks(rec.remarks || '');
    if (Array.isArray(rec.documents) && rec.documents.length > 0) {
      setDocuments(rec.documents);
    }
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      showToast('error', 'Delete permission is restricted for your employee profile.');
      return;
    }
    deleteCompanyCost(id);
    setDeleteConfirmId(null);
    showToast('info', 'Company cost record removed successfully.');
  };

  // Access Denied Screen
  if (!hasViewAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-200">
          <Lock size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-800 m-0">Access Denied: Company Cost Module</h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
          Your employee role has not been granted authorization to access the Customer Company Cost module. Please contact your Master Admin or Super Administrator.
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
              <span>Employee Expense Desk • Clearance: {currentUser?.employee_code || 'EMP'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
              Customer Company Cost &amp; Expense Dossiers
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Record corporate expenses, immigration levies, and attach itemized document dossiers with Value (Amount in RM) for assigned workers.
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
                  setIsFormOpen(!isFormOpen);
                }}
                className="inline-flex items-center gap-1.5 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer border-0 whitespace-nowrap"
              >
                <Plus size={15} />
                <span>{isFormOpen ? 'Collapse Form' : 'New Company Cost'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Wallet size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Incurred Cost
            </span>
            <div className="text-2xl font-black text-indigo-900 mt-0.5 font-mono">
              RM {grandTotalCost.toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold">{permittedRecords.length} cost records</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0 border border-blue-100">
            <Paperclip size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Attached Documents
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              {totalDocumentsCount}
            </div>
            <div className="text-[10px] text-blue-600 font-medium">Verified vouchers &amp; slips</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Paid &amp; Cleared Costs
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
              {paidCount}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">Disbursed from treasury</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avg Cost / Worker
            </span>
            <div className="text-2xl font-black text-purple-700 mt-0.5 font-mono">
              RM {permittedRecords.length > 0 ? Math.round(grandTotalCost / permittedRecords.length).toLocaleString() : '0'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Per foreign worker</div>
          </div>
        </div>
      </div>

      {/* FORM: Record Company Cost with Document Dossier & Value Column */}
      {isFormOpen && (canCreate || editingId) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Plus size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  {editingId ? 'Edit Company Cost Record' : 'Record Company Cost with Document Dossier'}
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  Select customer, upload expense documents with <strong>Value (Amount in RM)</strong> per document.
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
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
                  Customer Snapshot
                </label>
                {selectedCustomer ? (
                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-indigo-950 text-sm block">
                        {selectedCustomer.full_name}
                      </span>
                      <div className="flex items-center gap-2 text-slate-600 text-[11px] mt-0.5 font-mono">
                        <span>Passport: {selectedCustomer.passport_no || 'N/A'}</span>
                        <span>•</span>
                        <span>Employer: {selectedCustomer.company_id || 'Individual'}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {selectedCustomer.status}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                    Select a customer to attribute these company cost documents.
                  </div>
                )}
              </div>
            </div>

            {/* General Expense Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cost Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Expense Incurred Date <span className="text-red-500">*</span>
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
                  Payment Source
                </label>
                <input
                  type="text"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="e.g. Company Treasury / Corporate Debit"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reference / Claim ID
                </label>
                <input
                  type="text"
                  value={formRefNo}
                  onChange={(e) => setFormRefNo(e.target.value)}
                  placeholder="COST-123456"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* Card 5: Multiple Upload Documents with Value (Amount) Column */}
            {/* (Exact fields & layout from Customer Create + Value (Amount) Column!) */}
            {/* ========================================================================= */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <FileText size={15} className="text-[#0b4da2]" />
                    <span>Upload Documents with Value (Amount) Column</span>
                  </div>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    Attach customer records with document name, assigned service card, <strong>Value (Amount in RM)</strong>, date of issue, date of expire, and file attachment.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
                  {/* Total Calculated Amount Highlight */}
                  <div className="bg-indigo-50/70 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-right shadow-2xs shrink-0">
                    <div className="text-[9px] font-bold uppercase text-slate-500">Total Calculated Cost</div>
                    <div className="text-sm font-black font-mono text-indigo-900">
                      RM {calculatedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {selectedCustomer?.documents && selectedCustomer.documents.length > 0 && (
                    <button
                      type="button"
                      onClick={handleImportCustomerDocuments}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                      title="Import documents previously uploaded in Customer Profile"
                    >
                      <ArrowRight size={13} />
                      <span>Import Profile Docs ({selectedCustomer.documents.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAddDocumentRow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b4da2] hover:text-[#072a6b] bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Document Attachment</span>
                  </button>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 bg-slate-50/50">
                  <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600 m-0">No document attachments added yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1 mb-3">
                    Upload passport copy, national ID, visa, work permit, medical reports, or certificates with value (amount).
                  </p>
                  <button
                    type="button"
                    onClick={handleAddDocumentRow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083a7c] px-3.5 py-1.5 rounded-lg border-0 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Add First Document</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition-all"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                        {/* 1. Document Name */}
                        <div className="lg:col-span-3">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 h-5 flex items-center">
                            Document Name #{idx + 1}
                          </label>
                          <input
                            type="text"
                            value={doc.name}
                            onChange={(e) => handleDocumentFieldChange(idx, 'name', e.target.value)}
                            placeholder="e.g. Passport, NID, Medical, Levi"
                            className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#0b4da2]"
                          />
                        </div>

                        {/* 2. Select Service Card ("kon card kon document jave") */}
                        <div className="lg:col-span-3">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 h-5 flex items-center justify-between">
                            <span>Select Service Card</span>
                            <span className="text-[10px] text-blue-600 font-semibold">Service Tag</span>
                          </label>
                          <select
                            value={doc.service_id || ''}
                            onChange={(e) => handleDocumentServiceChange(idx, e.target.value)}
                            className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#0b4da2]"
                          >
                            <option value="">-- General Document (None) --</option>
                            {selectableServices.map((svc) => (
                              <option key={svc.id} value={svc.id}>
                                {svc.title} {svc.tag ? `[${svc.tag}]` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 3. VALUE (AMOUNT) COLUMN */}
                        <div className="lg:col-span-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1 h-5 flex items-center justify-between">
                            <span>Value (Amount)</span>
                            <span className="text-[10px] font-black text-indigo-600 font-mono">RM</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none select-none">
                              RM
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={doc.value !== undefined ? doc.value : ''}
                              onChange={(e) =>
                                handleDocumentFieldChange(
                                  idx,
                                  'value',
                                  e.target.value === '' ? 0 : Number(e.target.value)
                                )
                              }
                              placeholder="0.00"
                              className="w-full h-[38px] pl-9 pr-2.5 py-2 text-xs font-black font-mono text-indigo-950 bg-white border border-indigo-300 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>
                        </div>

                        {/* 4. Date of Issue */}
                        <div className="lg:col-span-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 h-5 flex items-center">
                            Date of Issue
                          </label>
                          <input
                            type="date"
                            value={doc.issue_date || ''}
                            onChange={(e) => handleDocumentFieldChange(idx, 'issue_date', e.target.value)}
                            className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                          />
                        </div>

                        {/* 5. Date of Expire */}
                        <div className="lg:col-span-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 h-5 flex items-center">
                            Date of Expire
                          </label>
                          <input
                            type="date"
                            value={doc.expire_date || ''}
                            onChange={(e) => handleDocumentFieldChange(idx, 'expire_date', e.target.value)}
                            className="w-full h-[38px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                          />
                        </div>
                      </div>

                      {/* Attachment Row (matching CustomerFormFullPage) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#0b4da2] text-slate-700 hover:text-[#0b4da2] text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs">
                            <Upload size={12} />
                            <span>{doc.url || doc.dataUrl || doc.fileUrl ? 'Replace' : 'Upload'}</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleDocumentFileChange(idx, f);
                              }}
                            />
                          </label>

                          {doc.url || doc.dataUrl || doc.fileUrl ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 truncate font-mono">
                              <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                              <span className="truncate max-w-[200px]" title={doc.fileName || doc.size || 'Attached'}>
                                {doc.fileName || doc.size || 'Attached'}
                              </span>
                              {(doc.fileSize || doc.size) && (
                                <span className="text-[10px] text-emerald-600">({doc.fileSize || doc.size})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No file attached</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {(doc.url || doc.dataUrl || doc.fileUrl) && (
                            <a
                              href={doc.fileUrl || doc.dataUrl || doc.url}
                              download={doc.fileName || `${doc.name}.pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold no-underline"
                            >
                              <Download size={13} />
                              <span>Preview / Download</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveDocumentRow(idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="Remove document row"
                          >
                            <Trash2 size={14} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Remarks & Submission */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  General Expense Remarks
                </label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Audit reference, invoice breakdown, or treasury reconciliation notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cost Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
                >
                  <option value="Paid">Paid / Settled</option>
                  <option value="Incurred">Incurred / Pending</option>
                  <option value="Reconciled">Reconciled</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083c80] text-white shadow-xs transition-all cursor-pointer border-0"
              >
                {editingId ? 'Save Changes' : `Save Company Cost (RM ${calculatedTotalCost.toLocaleString()})`}
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
                placeholder="Search by worker, reference, category..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
            >
              <option value="ALL">All Expense Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
            >
              <option value="ALL">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Incurred">Incurred</option>
              <option value="Reconciled">Reconciled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Ref ID &amp; Date</th>
                <th className="py-3 px-4">Customer / Worker</th>
                <th className="py-3 px-4">Cost Category</th>
                <th className="py-3 px-4">Document Dossier</th>
                <th className="py-3 px-4 text-right">Total Cost (RM)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-30" />
                    <div>No customer company cost records found.</div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-indigo-700">{rec.reference_no || 'NO-REF'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{rec.expense_date}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{rec.customer_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {rec.company_name || rec.company_id || 'Individual'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{rec.expense_category}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Source: {rec.payment_source || 'Treasury'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setPreviewRecord(rec)}
                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200 transition-colors cursor-pointer text-[10px]"
                        >
                          <Paperclip size={11} />
                          <span>{rec.documents?.length || 0} Docs Attached</span>
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black font-mono text-indigo-900 text-sm">
                      RM {Number(rec.total_cost_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          rec.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'Incurred'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEdit(rec)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer border-0"
                            title="Edit cost record"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {canDelete && (
                          deleteConfirmId === rec.id ? (
                            <div className="inline-flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                              <button
                                type="button"
                                onClick={() => handleDelete(rec.id)}
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
                              onClick={() => setDeleteConfirmId(rec.id)}
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

      {/* PREVIEW MODAL FOR DOCUMENTS DOSSIER */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Paperclip size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 m-0">
                    Expense Document Dossier • {previewRecord.customer_name}
                  </h3>
                  <p className="text-[11px] text-slate-500 m-0 font-mono">
                    {previewRecord.reference_no} • Total RM {previewRecord.total_cost_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer border-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {previewRecord.documents.map((doc, i) => (
                <div
                  key={doc.id || i}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{doc.name}</span>
                      {(doc.service_name || doc.service_category) && (
                        <span className="text-[10px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-md border border-blue-200">
                          {doc.service_name || doc.service_category}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      {doc.issue_date && <span>Issued: {doc.issue_date}</span>}
                      {doc.expire_date && <span>Expires: {doc.expire_date}</span>}
                      {doc.fileName && (
                        <span className="text-slate-400 font-mono">({doc.fileName})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Value (Amount)</div>
                      <div className="text-sm font-black font-mono text-indigo-900">
                        RM {Number(doc.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg no-underline"
                      >
                        <FileText size={12} />
                        <span>View</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                {previewRecord.documents.length} itemized dossier documents
              </span>
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer border-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
