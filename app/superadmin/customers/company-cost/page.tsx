'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
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
  Paperclip,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Upload,
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
  fetchCustomerCompanyCosts,
  saveCompanyCost,
  deleteCompanyCost,
  getFileUrl,
} from '@/lib/customerFinanceStorage';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
} from '@/lib/serviceStorage';

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

export default function CustomerCompanyCostPage() {
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

  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<CustomerCompanyCostRecord | null>(null);

  useEffect(() => {
    setCustomers(getStoredCustomers());
    fetchCustomersFromBackend().then((list) => {
      if (Array.isArray(list) && list.length > 0) setCustomers(list);
    }).catch(() => {});

    fetchServiceCards().then((svcList) => {
      if (Array.isArray(svcList) && svcList.length > 0) setAvailableServices(svcList);
    }).catch(() => {});

    setRecords(getStoredCompanyCosts());
    fetchCustomerCompanyCosts().then((list) => {
      if (Array.isArray(list) && list.length > 0) setRecords(list);
    }).catch(() => {});

    const handler = () => setRecords(getStoredCompanyCosts());
    window.addEventListener('companyCostsUpdated', handler);
    return () => window.removeEventListener('companyCostsUpdated', handler);
  }, []);

  const showToast = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => String(c.id) === String(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  const customerOptions: Select2Option[] = useMemo(() => {
    return customers.map((c) => ({
      value: String(c.id),
      label: c.full_name,
      subLabel: `${c.passport_no || 'No Passport'} • ${c.company_id || 'Individual'}`,
      badge: c.working_sector || c.status,
    }));
  }, [customers]);

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

  // Total Company Cost calculated automatically as sum of all document value amounts
  const calculatedTotalCost = useMemo(() => {
    return documents.reduce((acc, doc) => acc + (Number(doc.value) || 0), 0);
  }, [documents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedCustomer) {
      showToast('info', 'Please select a customer first.');
      return;
    }
    if (documents.length === 0) {
      showToast('info', 'Please add at least one document cost row.');
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
      payment_source: formSource,
      reference_no: formRefNo.trim(),
      documents: documents,
      status: formStatus,
      remarks: formRemarks.trim(),
      created_at: editingId
        ? records.find((r) => r.id === editingId)?.created_at || new Date().toISOString()
        : new Date().toISOString(),
    };

    await saveCompanyCost(newRecord);
    showToast(
      'success',
      editingId
        ? `Company cost record for "${selectedCustomer.full_name}" updated in database!`
        : `Company cost of RM ${calculatedTotalCost.toLocaleString()} saved to database with files in storage!`
    );

    // Reset
    setEditingId(null);
    setFormRefNo(`COST-${Date.now().toString().slice(-6)}`);
    setFormRemarks('');
    setDocuments([
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
  };

  const handleEdit = (r: CustomerCompanyCostRecord) => {
    setEditingId(String(r.id));
    setSelectedCustomerId(String(r.customer_id));
    setFormCategory(r.expense_category);
    setFormDate(r.expense_date);
    setFormSource(r.payment_source || 'Company Treasury');
    setFormRefNo(r.reference_no || '');
    setFormStatus(r.status);
    setFormRemarks(r.remarks || '');
    setDocuments(Array.isArray(r.documents) && r.documents.length > 0 ? r.documents : []);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDelete = async (id: string | number) => {
    await deleteCompanyCost(id);
    setDeleteConfirmId(null);
    showToast('info', 'Company cost record removed from database.');
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchTerm ||
        r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.passport_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reference_no?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === 'ALL' || r.expense_category === filterCategory;
      const matchStat = filterStatus === 'ALL' || r.status === filterStatus;
      return matchSearch && matchCat && matchStat;
    });
  }, [records, searchTerm, filterCategory, filterStatus]);

  const grandTotalCost = records.reduce((acc, r) => acc + (r.total_cost_amount || 0), 0);
  const totalDocumentsCount = records.reduce((acc, r) => acc + (r.documents?.length || 0), 0);
  const paidCount = records.filter((r) => r.status === 'Paid').length;

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Toast */}
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

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1.5">
                <FileSpreadsheet size={12} className="text-indigo-600" />
                Customer Finance Hub
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">Corporate Cost &amp; Document Ledger</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight m-0">
              Company Cost Amount Management
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed m-0">
              Attach company expense documents, Levi receipts, and fee vouchers per worker with document values (amount) breakdown.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/superadmin/customers/pending-amount"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors no-underline"
            >
              <span>← Pending Amount</span>
            </Link>
            <Link
              href="/superadmin/customers"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors no-underline"
            >
              <Users size={14} />
              <span>Customer Directory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Building2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Company Cost
            </span>
            <div className="text-2xl font-black text-indigo-900 mt-0.5 font-mono">
              RM {grandTotalCost.toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold">{records.length} cost records</div>
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
              RM {records.length > 0 ? Math.round(grandTotalCost / records.length).toLocaleString() : '0'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Per foreign worker</div>
          </div>
        </div>
      </div>

      {/* FORM: Record Company Cost Amount with Document Upload & Value Column */}
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
                placeholder="Search by customer name, passport number, NID..."
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
                      <span>Employer: {selectedCustomer.company_id || 'Direct'}</span>
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
                            href={getFileUrl(doc.fileUrl || doc.dataUrl || doc.url)}
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

          {/* Status & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cost Settlement Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white font-semibold"
              >
                <option value="Paid">Paid &amp; Settled</option>
                <option value="Incurred">Incurred (Pending Reimbursement)</option>
                <option value="Reconciled">Reconciled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Remarks / Expense Allocation Notes
              </label>
              <input
                type="text"
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="e.g. Paid directly via immigration gateway e-Services"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-500">
              Total Cost: <strong className="text-indigo-900 font-mono text-sm">RM {calculatedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> ({documents.length} documents)
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-[#22a34a] hover:bg-[#1b843c] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer border-0"
            >
              <CheckCircle2 size={15} />
              <span>{editingId ? 'Update Company Cost Record' : 'Save Company Cost Record'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Company Cost Records ({filteredRecords.length})
            </h3>
            <p className="text-xs text-slate-500 m-0">
              Corporate expense entries with itemized documents and value amounts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer, ref..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden w-48 sm:w-56"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Incurred">Incurred</option>
              <option value="Reconciled">Reconciled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date &amp; Ref</th>
                <th className="py-3 px-4">Expense Category</th>
                <th className="py-3 px-4 text-center">Attached Documents</th>
                <th className="py-3 px-4 text-right">Total Cost Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No company cost records logged yet.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {r.passport_no || 'No Passport'} • {r.company_id || 'Individual'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{r.expense_date}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.reference_no || 'NO-REF'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">{r.expense_category}</div>
                      <div className="text-[10px] text-slate-400">{r.payment_source}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setPreviewRecord(r)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 cursor-pointer"
                      >
                        <Paperclip size={12} />
                        <span>{r.documents?.length || 0} Docs (View Values)</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-indigo-950 text-sm">
                      RM {r.total_cost_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'Reconciled'
                            ? 'bg-blue-100 text-[#0b4da2]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(r)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                          title="Edit record"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(String(r.id))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: View Documents Breakdown with Values (Amount) */}
      {previewRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Itemized Cost Documents — {previewRecord.customer_name}
                </h3>
                <p className="text-xs text-slate-400 m-0 font-mono mt-0.5">
                  Ref: {previewRecord.reference_no} • Total: RM {previewRecord.total_cost_amount.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Document Name</th>
                    <th className="py-2.5 px-3">Tagged Service Card</th>
                    <th className="py-2.5 px-3 text-right">Value (Amount RM)</th>
                    <th className="py-2.5 px-3">Issue Date</th>
                    <th className="py-2.5 px-3">Expire Date</th>
                    <th className="py-2.5 px-3 text-center">Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRecord.documents?.map((d, i) => (
                    <tr key={d.id || i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{d.name}</td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {d.service_name ? (
                          <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] border border-blue-200">
                            {d.service_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {d.service_category || 'General Document'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950">
                        RM {(Number(d.value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{d.issue_date || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{d.expire_date || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-center">
                        {d.fileUrl || d.dataUrl || d.url ? (
                          <a
                            href={getFileUrl(d.fileUrl || d.dataUrl || d.url)}
                            download={d.fileName || `${d.name}.pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 no-underline"
                          >
                            <Download size={11} />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[10px]">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <h3 className="text-base font-bold text-slate-900 m-0 mb-1">Delete Company Cost Record?</h3>
            <p className="text-xs text-slate-500 mb-5">
              This action will delete the expense record and its attached documents.
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
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer border-0 shadow-xs"
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
