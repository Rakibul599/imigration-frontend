'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  Globe2,
  Maximize2,
  Minimize2,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Company } from '@/lib/companies';
import { getStoredCompanies } from '@/lib/companyStorage';
import {
  CustomerRecord,
  CustomerDocument,
  fetchCustomers,
  getFileUrl,
} from '@/lib/customerStorage';
import { AuthUser, getCurrentUser, getMasterAdminUser, hasCompanyAccess } from '@/lib/auth';

interface DocumentRowItem {
  id: string;
  rowNo: number;
  customerId: number | null;
  documentName: string;
  documentUrl: string;
  documentType: string; // 'epass' | 'pdf' | 'image' | 'file'
  documentSize?: string;
  issueDate?: string;
  expireDate?: string;
}

// Select2 Custom Searchable Dropdown for Customer
function CustomerSelect2({
  customers,
  selectedCustomerId,
  onSelect,
}: {
  customers: CustomerRecord[];
  selectedCustomerId: number | null;
  onSelect: (customer: CustomerRecord | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(term) ||
        (c.passport_no && c.passport_no.toLowerCase().includes(term)) ||
        (c.country && c.country.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[38px] px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-md flex items-center justify-between cursor-pointer transition-colors text-xs shadow-2xs"
      >
        {selectedCustomer ? (
          <div className="flex items-center gap-2 truncate">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden">
              {selectedCustomer.profile_pic ? (
                <img
                  src={getFileUrl(selectedCustomer.profile_pic)}
                  alt={selectedCustomer.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                selectedCustomer.full_name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="truncate text-left">
              <span className="font-bold text-slate-800">{selectedCustomer.full_name}</span>
              {selectedCustomer.passport_no && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono text-slate-600 border border-slate-200">
                  {selectedCustomer.passport_no}
                </span>
              )}
              {selectedCustomer.documents && selectedCustomer.documents.length > 0 && (
                <span className="ml-1 text-[10px] text-emerald-600 font-semibold">
                  ({selectedCustomer.documents.length} docs)
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 font-normal">-- Select Customer (Select2) --</span>
        )}
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-white border border-blue-400 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, passport, country..."
              className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Customer List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
            {filteredCustomers.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs italic">
                No matching customer found
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = cust.id === selectedCustomerId;
                const docCount = cust.documents?.length || 0;
                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      onSelect(cust);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`p-2.5 flex items-center justify-between hover:bg-blue-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/80 font-bold text-blue-700' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden border border-slate-200">
                        {cust.profile_pic ? (
                          <img
                            src={getFileUrl(cust.profile_pic)}
                            alt={cust.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          cust.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 leading-tight truncate">
                          {cust.full_name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {cust.passport_no && (
                            <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                              🛂 {cust.passport_no}
                            </span>
                          )}
                          {cust.country && (
                            <span className="text-slate-500">🌍 {cust.country}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          docCount > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {docCount} docs
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentDownloadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company>({
    id: 'gamuda',
    name: 'Gamuda Berhad',
    roc: 'ROC-197601003632',
    sector: 'Engineering & Construction',
    description: 'Premier infrastructure and engineering company in Malaysia.',
    logo: '/images/companies/gamuda.svg',
    tag: 'Verified JIM',
    totalWorkers: 14200,
  });

  // Filtered strictly to active company
  const [companyCustomers, setCompanyCustomers] = useState<CustomerRecord[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Table rows with columns: No. | Customer Select | Document Select | Action
  const [rows, setRows] = useState<DocumentRowItem[]>([
    {
      id: 'row-1',
      rowNo: 1,
      customerId: null,
      documentName: 'ePASS Digital Slip (Official JIM)',
      documentUrl: '',
      documentType: 'epass',
    },
  ]);

  // Preview state (focused row)
  const [previewRowId, setPreviewRowId] = useState<string>('row-1');
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Share state
  const [activeShareRow, setActiveShareRow] = useState<DocumentRowItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [downloadSuccessFeedback, setDownloadSuccessFeedback] = useState<string | null>(null);

  const previewSectionRef = useRef<HTMLDivElement>(null);

  // Auth verification
  useEffect(() => {
    const user = getCurrentUser() || getMasterAdminUser();
    const loggedIn =
      typeof window !== 'undefined' &&
      (localStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isMasterAdminLoggedIn') === 'true');

    if (!user || !loggedIn) {
      router.replace('/login?redirect=/document-download&error=auth_required');
      return;
    }
    setCurrentUser(user);
    setIsAuthChecking(false);
  }, [router]);

  // Load company info
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = getStoredCompanies();
    setAllCompanies(stored);

    if (companyParam) {
      const found = stored.find(
        (c) =>
          c.id.toLowerCase() === companyParam.toLowerCase() ||
          c.name.toLowerCase().includes(companyParam.toLowerCase())
      );
      if (found) {
        setActiveCompany(found);
      }
    }
  }, [companyParam]);

  // Fetch company customers
  useEffect(() => {
    if (!activeCompany?.id) return;
    let isCancelled = false;

    async function loadCustomers() {
      setLoadingCustomers(true);
      try {
        const list = await fetchCustomers(activeCompany.id);
        // Strictly filter to active company
        const filtered = list.filter(
          (c) =>
            !c.company_id ||
            c.company_id.toLowerCase() === activeCompany.id.toLowerCase() ||
            c.company_id.toLowerCase() === activeCompany.name.toLowerCase()
        );

        if (!isCancelled) {
          setCompanyCustomers(filtered);

          // If customers exist, populate row 1 with first customer and their first dynamic document
          if (filtered.length > 0) {
            const firstCust = filtered[0];
            const firstCustDocs = firstCust.documents || [];
            const defaultDoc =
              firstCustDocs.length > 0
                ? {
                    name: firstCustDocs[0].name || 'Document #1',
                    url: getFileUrl(firstCustDocs[0].url || ''),
                    type: firstCustDocs[0].type || 'file',
                    size: firstCustDocs[0].size || '',
                    issueDate: firstCustDocs[0].issue_date,
                    expireDate: firstCustDocs[0].expire_date,
                  }
                : {
                    name: 'ePASS Digital Slip (Official JIM)',
                    url: '',
                    type: 'epass',
                    size: 'Official Digital Slip',
                    issueDate: '',
                    expireDate: '',
                  };

            setRows((prev) => [
              {
                id: 'row-1',
                rowNo: 1,
                customerId: firstCust.id,
                documentName: defaultDoc.name,
                documentUrl: defaultDoc.url,
                documentType: defaultDoc.type,
                documentSize: defaultDoc.size,
                issueDate: defaultDoc.issueDate,
                expireDate: defaultDoc.expireDate,
              },
            ]);
            setPreviewRowId('row-1');
          }
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        if (!isCancelled) setLoadingCustomers(false);
      }
    }

    loadCustomers();
    return () => {
      isCancelled = true;
    };
  }, [activeCompany.id, activeCompany.name]);

  // When customer changes in a row, automatically populate their dynamic documents
  const handleCustomerChange = (rowId: string, customer: CustomerRecord | null) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (!customer) {
          return {
            ...row,
            customerId: null,
            documentName: 'ePASS Digital Slip (Official JIM)',
            documentUrl: '',
            documentType: 'epass',
            documentSize: '',
            issueDate: '',
            expireDate: '',
          };
        }

        // Dynamically grab customer's uploaded documents
        const docs = customer.documents || [];
        if (docs.length > 0) {
          const firstDoc = docs[0];
          return {
            ...row,
            customerId: customer.id,
            documentName: firstDoc.name || 'Document #1',
            documentUrl: getFileUrl(firstDoc.url || ''),
            documentType: firstDoc.type || 'file',
            documentSize: firstDoc.size || '',
            issueDate: firstDoc.issue_date,
            expireDate: firstDoc.expire_date,
          };
        }

        // If no documents uploaded yet, default to Official ePASS Slip
        return {
          ...row,
          customerId: customer.id,
          documentName: 'ePASS Digital Slip (Official JIM)',
          documentUrl: '',
          documentType: 'epass',
          documentSize: 'Official Digital Slip',
          issueDate: '',
          expireDate: '',
        };
      })
    );
  };

  // When document selection changes in a row
  const handleDocumentChange = (
    rowId: string,
    docName: string,
    docUrl: string,
    docType: string,
    docSize?: string,
    issueDate?: string,
    expireDate?: string
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              documentName: docName,
              documentUrl: docUrl,
              documentType: docType,
              documentSize: docSize,
              issueDate: issueDate,
              expireDate: expireDate,
            }
          : row
      )
    );
  };

  // Add new row to table
  const addRow = () => {
    const nextNo = rows.length + 1;
    const newId = `row-${Date.now()}`;
    const defaultCust = companyCustomers[0] || null;
    const custDocs = defaultCust?.documents || [];
    const firstDoc = custDocs[0];

    setRows((prev) => [
      ...prev,
      {
        id: newId,
        rowNo: nextNo,
        customerId: defaultCust ? defaultCust.id : null,
        documentName: firstDoc ? firstDoc.name : 'ePASS Digital Slip (Official JIM)',
        documentUrl: firstDoc ? getFileUrl(firstDoc.url || '') : '',
        documentType: firstDoc ? firstDoc.type || 'file' : 'epass',
        documentSize: firstDoc ? firstDoc.size : '',
        issueDate: firstDoc ? firstDoc.issue_date : '',
        expireDate: firstDoc ? firstDoc.expire_date : '',
      },
    ]);
  };

  // Delete row
  const removeRow = (rowId: string) => {
    if (rows.length === 1) {
      // Clear row 1 instead of removing
      setRows([
        {
          id: 'row-1',
          rowNo: 1,
          customerId: null,
          documentName: 'ePASS Digital Slip (Official JIM)',
          documentUrl: '',
          documentType: 'epass',
        },
      ]);
      return;
    }
    const updated = rows.filter((r) => r.id !== rowId).map((r, idx) => ({ ...r, rowNo: idx + 1 }));
    setRows(updated);
    if (previewRowId === rowId) {
      setPreviewRowId(updated[0]?.id || 'row-1');
    }
  };

  // Currently previewed row
  const activePreviewRow = useMemo(() => {
    return rows.find((r) => r.id === previewRowId) || rows[0] || null;
  }, [rows, previewRowId]);

  // Customer for active preview
  const activePreviewCustomer = useMemo(() => {
    if (!activePreviewRow?.customerId) return companyCustomers[0] || null;
    return companyCustomers.find((c) => c.id === activePreviewRow.customerId) || null;
  }, [activePreviewRow, companyCustomers]);

  // Trigger preview button action
  const handlePreviewClick = (rowId: string) => {
    setPreviewRowId(rowId);
    if (previewSectionRef.current) {
      previewSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Download action
  const handleDownloadClick = (row: DocumentRowItem) => {
    const cust = companyCustomers.find((c) => c.id === row.customerId);
    const fileName = `${row.documentName.replace(/[^a-zA-Z0-9]/g, '_')}_${cust?.passport_no || 'doc'}`;

    setDownloadSuccessFeedback(`Downloading: ${row.documentName}`);
    setTimeout(() => setDownloadSuccessFeedback(null), 3000);

    if (row.documentUrl && row.documentUrl !== '') {
      const link = document.createElement('a');
      link.href = row.documentUrl;
      link.download = `${fileName}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Print/PDF view for digital ePASS
      setPreviewRowId(row.id);
      setTimeout(() => window.print(), 300);
    }
  };

  // Share action trigger
  const handleShareClick = (row: DocumentRowItem) => {
    setActiveShareRow(row);
    setIsShareModalOpen(true);
  };

  // WhatsApp share message
  const shareText = useMemo(() => {
    const row = activeShareRow || activePreviewRow;
    const cust = row?.customerId ? companyCustomers.find((c) => c.id === row.customerId) : null;
    const workerName = cust?.full_name || 'REGISTERED WORKER';
    const passportNo = cust?.passport_no || 'N/A';
    const nationality = cust?.country || 'N/A';
    const docName = row?.documentName || 'Official Document';
    const epassRef = `MYP-2026-${String(cust?.id || 1).padStart(6, '0')}`;
    const fileLink = row?.documentUrl || (typeof window !== 'undefined' ? window.location.href : '');

    return `🏛️ *JABATAN IMIGRESEN MALAYSIA (JIM)*\n━━━━━━━━━━━━━━━━━━━━━━━━\n📄 *Document:* ${docName}\n👤 *Worker:* ${workerName}\n🛂 *Passport:* ${passportNo}\n🌍 *Nationality:* ${nationality}\n📋 *ePASS Ref:* ${epassRef}\n🏢 *Employer:* ${activeCompany.name} (${activeCompany.roc})\n✅ *Status:* APPROVED & VERIFIED\n\n🔗 *Document URL:* ${fileLink}\n━━━━━━━━━━━━━━━━━━━━━━━━\n_Sent via Official Employer Services Portal_`;
  }, [activeShareRow, activePreviewRow, companyCustomers, activeCompany]);

  // WhatsApp direct share
  const handleWhatsAppSend = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  // Native share
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Document: ${activeShareRow?.documentName || 'Document'}`,
          text: shareText,
          url: activeShareRow?.documentUrl || window.location.href,
        });
      } catch (err) {
        console.log('Share dismissed:', err);
      }
    } else {
      handleWhatsAppSend();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (isAuthChecking || !currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center text-slate-800 p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200/80 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 m-0">Verifying Clearance...</h2>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Validating employer credentials for document services.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isEmployee = currentUser?.role === 'Employee';
  const isMasterAdmin = currentUser?.role === 'MasterAdmin';
  const isRestrictedRole = isEmployee || isMasterAdmin;
  const hasAccess = !isRestrictedRole || hasCompanyAccess(activeCompany.id, activeCompany.name, activeCompany.roc);

  return (
    <div className="w-full min-h-screen bg-[#f1f5f9] flex flex-col justify-between font-sans text-slate-800">
      <Navbar />

      <main className="w-full flex-1 pb-16">
        {/* Access Warning if user lacks clearance for this company */}
        {!hasAccess && (
          <div className="bg-rose-600 text-white py-3 px-6 shadow-md">
            <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 font-semibold">
                <ShieldAlert size={18} className="shrink-0" />
                <span>
                  Access Restricted: Your account does not have clearance for &quot;{activeCompany.name}&quot;. You can only download documents for your assigned companies.
                </span>
              </div>
              <Link
                href="/companies"
                className="bg-white text-rose-700 hover:bg-rose-50 px-3.5 py-1.5 rounded-lg font-bold transition-colors shrink-0 text-center no-underline"
              >
                Switch Company
              </Link>
            </div>
          </div>
        )}

        {/* Company Header Bar */}
        <section className="bg-white border-b border-slate-200 shadow-xs">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href={`/services?company=${encodeURIComponent(activeCompany.id)}`}
                  className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors no-underline"
                  title="Back to Services"
                >
                  <ArrowLeft size={18} />
                </Link>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Link
                      href={`/services?company=${encodeURIComponent(activeCompany.id)}`}
                      className="hover:text-blue-600 no-underline text-slate-500"
                    >
                      Employer Services
                    </Link>
                    <span>/</span>
                    <span className="text-slate-800 font-bold">Document Download</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0b4da2] tracking-tight mt-0.5 flex items-center gap-2">
                    <FileDown className="text-blue-600" size={24} />
                    Document Download Portal
                  </h1>
                </div>
              </div>

              {/* Company Identity Pill */}
              <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-200/70 px-4 py-2 rounded-xl">
                <Building2 size={20} className="text-blue-700 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {activeCompany.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ROC: {activeCompany.roc} • {activeCompany.sector}
                  </div>
                </div>
                <span className="ml-2 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Verified JIM
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-6 pb-12">
          {!hasAccess ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-12">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <ShieldAlert size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 m-0">Clearance Required</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                You do not have clearance to access documents for <strong>{activeCompany.name}</strong>.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/companies"
                  className="px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-colors no-underline"
                >
                  View Your Authorized Companies
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Feedback toast */}
              {downloadSuccessFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{downloadSuccessFeedback}</span>
                </div>
              )}

              {/* Table exactly as requested:
                  Design is kept (blue header #1872b2 from screenshot).
                  Columns: No. | Select Customer (Select2) | Select Document (Dynamic files) | Action (Download, Preview, Share, Delete)
              */}
              <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-visible">
                {/* Table Top Header Bar */}
                <div className="bg-[#1872b2] text-white px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide">
                      CUSTOMER DOCUMENT DOWNLOAD &amp; VERIFICATION
                    </span>
                    <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">
                      Company: {activeCompany.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center gap-1.5 bg-white text-[#1872b2] hover:bg-blue-50 text-xs px-3 py-1 rounded-md font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    {/* Blue Table Header */}
                    <thead>
                      <tr className="bg-[#1872b2] text-white text-[12px] font-bold border-b border-blue-800">
                        <th className="py-2.5 px-3 text-center w-12 border-r border-blue-700/60">
                          No.
                        </th>
                        <th className="py-2.5 px-4 w-[42%] border-r border-blue-700/60">
                          Select Customer
                        </th>
                        <th className="py-2.5 px-4 w-[34%] border-r border-blue-700/60">
                          Select Document
                        </th>
                        <th className="py-2.5 px-3 text-center w-[22%]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {rows.map((row) => {
                        const currentCust = row.customerId
                          ? companyCustomers.find((c) => c.id === row.customerId)
                          : null;
                        const dynamicDocs = currentCust?.documents || [];

                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-blue-50/30 transition-colors ${
                              previewRowId === row.id ? 'bg-blue-50/50' : 'bg-white'
                            }`}
                          >
                            {/* 1. No. */}
                            <td className="py-3 px-3 text-center font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">
                              {row.rowNo}
                            </td>

                            {/* 2. Customer Select (Select2) */}
                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <CustomerSelect2
                                customers={companyCustomers}
                                selectedCustomerId={row.customerId}
                                onSelect={(cust) => handleCustomerChange(row.id, cust)}
                              />
                            </td>

                            {/* 3. Document Select (Auto dynamically populated from customer) */}
                            <td className="py-2.5 px-4 border-r border-slate-200">
                              <div className="relative">
                                <select
                                  value={row.documentName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'ePASS Digital Slip (Official JIM)') {
                                      handleDocumentChange(
                                        row.id,
                                        val,
                                        '',
                                        'epass',
                                        'Official Digital Slip'
                                      );
                                    } else {
                                      const matchedDoc = dynamicDocs.find((d) => d.name === val);
                                      if (matchedDoc) {
                                        handleDocumentChange(
                                          row.id,
                                          matchedDoc.name,
                                          getFileUrl(matchedDoc.url || ''),
                                          matchedDoc.type || 'file',
                                          matchedDoc.size,
                                          matchedDoc.issue_date,
                                          matchedDoc.expire_date
                                        );
                                      } else {
                                        handleDocumentChange(row.id, val, '', 'file');
                                      }
                                    }
                                  }}
                                  className="w-full min-h-[38px] px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 focus:border-blue-600 rounded-md text-xs font-semibold text-slate-800 outline-none cursor-pointer transition-colors shadow-2xs"
                                >
                                  {/* Dynamic documents uploaded for this customer */}
                                  {dynamicDocs.length > 0 ? (
                                    <optgroup label="Worker Uploaded Documents:">
                                      {dynamicDocs.map((doc, idx) => (
                                        <option key={idx} value={doc.name}>
                                          📄 {doc.name} {doc.size ? `(${doc.size})` : ''}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ) : (
                                    <optgroup label="Attached Files:">
                                      <option value="No documents uploaded" disabled>
                                        (No dynamic documents found for worker)
                                      </option>
                                    </optgroup>
                                  )}

                                  {/* Official Standard Immigration Documents */}
                                  <optgroup label="Official Government Permits:">
                                    <option value="ePASS Digital Slip (Official JIM)">
                                      🏛️ ePASS Digital Slip (Official JIM)
                                    </option>
                                    <option value="Work Permit / PLKS Certificate">
                                      📋 Work Permit / PLKS Certificate
                                    </option>
                                    <option value="Medical Screening Certificate (FOMEMA)">
                                      🏥 Medical Screening Certificate (FOMEMA)
                                    </option>
                                  </optgroup>
                                </select>
                              </div>

                              {/* Document Details hint */}
                              {row.issueDate && row.expireDate && (
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                  <span>Issue: {row.issueDate}</span>
                                  <span>•</span>
                                  <span>Exp: {row.expireDate}</span>
                                </div>
                              )}
                            </td>

                            {/* 4. Action: Download, Preview, Share & Remove */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {/* Preview Button */}
                                <button
                                  type="button"
                                  onClick={() => handlePreviewClick(row.id)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                                    previewRowId === row.id
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                  }`}
                                  title="View document preview below"
                                >
                                  <Eye size={13} />
                                  <span>Preview</span>
                                </button>

                                {/* Download Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDownloadClick(row)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  title="Download this document"
                                >
                                  <Download size={13} />
                                  <span>Download</span>
                                </button>

                                {/* Share Button */}
                                <button
                                  type="button"
                                  onClick={() => handleShareClick(row)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[#25D366] hover:bg-[#20ba59] text-white transition-colors cursor-pointer shadow-2xs"
                                  title="Share to WhatsApp / Apps"
                                >
                                  <Share2 size={13} />
                                </button>

                                {/* Remove Row (Red X) */}
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Remove / Clear row"
                                >
                                  <X size={16} strokeWidth={2.5} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DOCUMENT PREVIEW SECTION (niche oibabe file view hobe) */}
              <div
                ref={previewSectionRef}
                className={`bg-white rounded-xl shadow-md border border-slate-300 transition-all ${
                  isFullScreen ? 'fixed inset-4 z-50 overflow-y-auto bg-slate-100 p-6' : 'p-6'
                }`}
              >
                {/* Preview Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Eye size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 m-0">
                          Document Preview: {activePreviewRow?.documentName || 'Official Document'}
                        </h3>
                        {activePreviewRow?.documentSize && (
                          <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                            {activePreviewRow.documentSize}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                        Worker: <strong>{activePreviewCustomer?.full_name || 'Worker'}</strong>
                        {activePreviewCustomer?.passport_no && (
                          <span> • Passport: {activePreviewCustomer.passport_no}</span>
                        )}
                        {activePreviewCustomer?.country && (
                          <span> • {activePreviewCustomer.country}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Zoom Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewZoom((z) => Math.max(70, z - 10))}
                        className="p-1.5 hover:bg-white rounded text-slate-600 cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="px-2 font-mono font-bold text-[11px] text-slate-700">
                        {previewZoom}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom((z) => Math.min(130, z + 10))}
                        className="p-1.5 hover:bg-white rounded text-slate-600 cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFullScreen((f) => !f)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                      title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                    >
                      {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadClick(activePreviewRow)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Download size={13} /> Download
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareClick(activePreviewRow)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Share2 size={13} /> WhatsApp
                    </button>
                  </div>
                </div>

                {/* Preview Content Area */}
                <div className="w-full flex justify-center overflow-x-auto py-4 bg-slate-100/70 rounded-xl border border-slate-200/80">
                  {/* If selected file is an actual uploaded PDF or Image */}
                  {activePreviewRow?.documentUrl && activePreviewRow.documentUrl !== '' ? (
                    <div
                      style={{
                        transform: `scale(${previewZoom / 100})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="w-full max-w-[820px] bg-white shadow-xl rounded-xl border border-slate-300 p-6 flex flex-col items-center"
                    >
                      {/* Check if image or pdf */}
                      {activePreviewRow.documentUrl.match(/\.(jpeg|jpg|png|webp|gif)$/i) ||
                      activePreviewRow.documentType.includes('image') ? (
                        <div className="w-full flex flex-col items-center">
                          <img
                            src={activePreviewRow.documentUrl}
                            alt={activePreviewRow.documentName}
                            className="max-h-[600px] w-auto object-contain rounded-lg border border-slate-200 shadow-md"
                          />
                          <div className="mt-4 text-xs font-bold text-slate-700">
                            {activePreviewRow.documentName}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center">
                          <iframe
                            src={`${activePreviewRow.documentUrl}#toolbar=0`}
                            title={activePreviewRow.documentName}
                            className="w-full h-[600px] rounded-lg border border-slate-300 shadow-inner"
                          />
                          <div className="mt-3 flex items-center justify-between w-full text-xs">
                            <span className="font-bold text-slate-700">
                              {activePreviewRow.documentName}
                            </span>
                            <a
                              href={activePreviewRow.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink size={13} /> Open in New Tab
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Official Jabatan Imigresen Malaysia (JIM) ePASS Digital Slip */
                    <div
                      style={{
                        transform: `scale(${previewZoom / 100})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="w-full max-w-[820px] bg-white shadow-xl rounded-xl border border-slate-300 p-8 sm:p-10 relative overflow-hidden text-slate-800"
                    >
                      {/* Background Official Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.035] -rotate-45">
                        <div className="text-center">
                          <div className="text-7xl font-black tracking-widest text-slate-900">
                            JABATAN IMIGRESEN
                          </div>
                          <div className="text-5xl font-black tracking-widest text-slate-900 mt-4">
                            KERAJAAN MALAYSIA
                          </div>
                        </div>
                      </div>

                      {/* Official Document Header */}
                      <div className="relative border-b-2 border-slate-900 pb-5 mb-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                            <img
                              src="/images/malaysia-crest.svg"
                              alt="Malaysia Crest"
                              className="max-h-16 w-auto object-contain"
                            />
                          </div>

                          <div className="text-center flex-1">
                            <h4 className="text-xs font-bold tracking-widest text-slate-600 uppercase m-0">
                              KERAJAAN MALAYSIA
                            </h4>
                            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight m-0 mt-0.5">
                              JABATAN IMIGRESEN MALAYSIA
                            </h2>
                            <div className="inline-block mt-1 px-3 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-black tracking-wider uppercase">
                              {activePreviewRow?.documentName || 'ePASS Digital Slip (Official JIM)'}
                            </div>
                          </div>

                          {/* Barcode & Security Stamp */}
                          <div className="w-24 text-right shrink-0">
                            <div className="font-mono text-[9px] text-slate-500 font-bold">
                              DOC-REF: MYP-2026-{String(activePreviewCustomer?.id || 1).padStart(6, '0')}
                            </div>
                            <div className="w-20 h-5 bg-slate-800 ml-auto mt-1 flex items-center justify-center text-[7px] text-white font-mono tracking-widest">
                              |||||||||||||||||
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Document Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative">
                        {/* Left: Worker Photo & QR Code */}
                        <div className="md:col-span-4 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
                          {/* Worker Photo Frame */}
                          <div className="w-32 h-40 bg-slate-100 rounded-lg border-2 border-slate-300 shadow-inner overflow-hidden flex items-center justify-center relative">
                            {activePreviewCustomer?.profile_pic ? (
                              <img
                                src={getFileUrl(activePreviewCustomer.profile_pic)}
                                alt={activePreviewCustomer.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <User size={48} />
                                <span className="text-[10px] font-bold mt-1 text-slate-500">
                                  OFFICIAL PHOTO
                                </span>
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] text-white font-bold py-0.5 tracking-wider uppercase text-center">
                              JIM VERIFIED
                            </div>
                          </div>

                          {/* Digital Verification QR Code */}
                          <div className="mt-4 p-2 bg-white rounded-lg border border-slate-300 shadow-xs flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-100 flex items-center justify-center rounded border border-slate-200">
                              <QrCode size={64} className="text-slate-800" />
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 mt-1 font-bold">
                              SCAN TO VERIFY
                            </span>
                          </div>
                        </div>

                        {/* Right: Worker & Permit Information */}
                        <div className="md:col-span-8 space-y-3.5 text-xs">
                          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Full Name (Nama Pekerja)
                              </span>
                              <span className="font-black text-slate-900 text-sm block">
                                {activePreviewCustomer?.full_name?.toUpperCase() || 'MOHAMMAD TARIQUL ISLAM'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Status
                              </span>
                              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                                APPROVED &amp; ACTIVE
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Passport Number (No. Pasport)
                              </span>
                              <span className="font-mono font-bold text-slate-900 text-xs block">
                                {activePreviewCustomer?.passport_no || 'EN0263450'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Nationality (Warganegara)
                              </span>
                              <span className="font-bold text-slate-900 text-xs block">
                                {activePreviewCustomer?.country || 'BANGLADESH'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                ePASS Reference No.
                              </span>
                              <span className="font-mono font-bold text-blue-700 text-xs block">
                                MYP-2026-{String(activePreviewCustomer?.id || 1).padStart(6, '0')}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Pass Category
                              </span>
                              <span className="font-semibold text-slate-800 text-xs block">
                                Pas Lawatan Kerja Sementara (PLKS)
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Employer Entity (Majikan)
                              </span>
                              <span className="font-bold text-slate-900 text-xs block">
                                {activeCompany.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                ROC: {activeCompany.roc}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Working Sector (Sektor)
                              </span>
                              <span className="font-semibold text-slate-800 text-xs block">
                                {activePreviewCustomer?.working_sector || activeCompany.sector}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Issue Date (Tarikh Dikeluarkan)
                              </span>
                              <span className="font-mono text-slate-700 text-xs block">
                                {activePreviewRow?.issueDate || new Date().toISOString().split('T')[0]}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Expiry Date (Tarikh Luput)
                              </span>
                              <span className="font-mono text-slate-700 text-xs block">
                                {activePreviewRow?.expireDate ||
                                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Official Footer Endorsement */}
                      <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-3">
                        <div>
                          Dokumen rasmi yang dikeluarkan oleh Jabatan Imigresen Malaysia.
                          <br />
                          Sebarang pemalsuan adalah tertakluk di bawah Seksyen 55D Akta Imigresen 1959/63.
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-slate-700">KETUA PENGARAH IMIGRESEN</div>
                          <div className="font-mono text-[9px] text-slate-400">DIGITALLY CERTIFIED</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Share2 size={16} />
                </div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Share Official Document
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 mb-4 leading-relaxed">
              Share <strong>{activeShareRow?.documentName || 'Document'}</strong> for worker{' '}
              <strong>
                {companyCustomers.find((c) => c.id === activeShareRow?.customerId)?.full_name || 'Worker'}
              </strong>{' '}
              via WhatsApp, native mobile apps, or copy link.
            </p>

            <div className="space-y-3">
              {/* WhatsApp Direct Share Button */}
              <button
                type="button"
                onClick={handleWhatsAppSend}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-base">
                    W
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Share to WhatsApp</div>
                    <div className="text-[10px] text-white/80 font-normal">
                      Send directly to worker, employer, or agent chat
                    </div>
                  </div>
                </div>
                <ExternalLink size={16} />
              </button>

              {/* Native App Share (Mobile / Desktop) */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Share2 size={16} />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Share via Device Apps</div>
                    <div className="text-[10px] text-white/80 font-normal">
                      Telegram, Gmail, AirDrop, Bluetooth &amp; Files
                    </div>
                  </div>
                </div>
                <ExternalLink size={16} />
              </button>

              {/* Copy Share Text / Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-xs">
                    {copyFeedback ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">
                      {copyFeedback ? 'Copied to Clipboard!' : 'Copy Verification Summary'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Includes worker, passport &amp; ePASS reference details
                    </div>
                  </div>
                </div>
                {copyFeedback && <span className="text-[10px] font-bold text-emerald-600">Copied!</span>}
              </button>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function DocumentDownloadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center text-slate-800 p-6 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200/80 max-w-sm w-full text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 m-0">Loading Document Portal...</h2>
              <p className="text-xs text-slate-500 m-0 mt-1">
                Preparing official ePASS documents &amp; verification tables.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <DocumentDownloadContent />
    </Suspense>
  );
}
