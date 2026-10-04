'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Image as ImageIcon,
  Layers,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import {
  CustomerRecord,
  CustomerDocument,
  fetchCustomers,
  getFileUrl,
} from '@/lib/customerStorage';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
} from '@/lib/serviceStorage';
import { AuthUser, getCurrentUser, getMasterAdminUser, hasCompanyAccess } from '@/lib/auth';

// Standardized flat document structure for the repository table
export interface RepositoryDocument {
  id: string;
  customerId: number;
  customerName: string;
  passportNo: string;
  country: string;
  profilePic?: string;
  workingSector?: string;
  documentName: string;
  documentCategory: string;
  documentUrl: string;
  documentType: string; // 'epass' | 'pdf' | 'image' | 'file'
  documentSize: string;
  issueDate?: string;
  expireDate?: string;
  referenceNo: string;
  status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';
  serviceId?: string;
  serviceName?: string;
}

// Select2 Custom Searchable Dropdown for Customer with "All Customers"
function CustomerSelect2({
  customers,
  selectedCustomerId,
  totalDocsCount,
  onSelect,
}: {
  customers: CustomerRecord[];
  selectedCustomerId: number | 'ALL';
  totalDocsCount: number;
  onSelect: (customerId: number | 'ALL') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'ALL') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

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
        className="w-full min-h-[42px] px-3.5 py-2 bg-white border border-slate-300 hover:border-blue-500 rounded-xl flex items-center justify-between cursor-pointer transition-all text-xs shadow-xs hover:shadow-sm"
      >
        {selectedCustomerId === 'ALL' ? (
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <Users size={14} />
            </div>
            <div className="truncate text-left">
              <span className="font-extrabold text-blue-900">All Customers</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-[10px] text-blue-800 font-bold">
                {customers.length} workers • {totalDocsCount} docs
              </span>
            </div>
          </div>
        ) : selectedCustomer ? (
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden border border-blue-200">
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
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600 border border-slate-200">
                  🛂 {selectedCustomer.passport_no}
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
          <span className="text-slate-400 font-normal">-- Select Customer --</span>
        )}
        <ChevronDown size={15} className="text-slate-400 shrink-0 ml-1" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[320px] bg-white border border-blue-400 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by worker name, passport, country..."
              className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Option: "All Customers" */}
          <div className="p-1 border-b border-slate-100 bg-blue-50/40">
            <div
              onClick={() => {
                onSelect('ALL');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`p-2.5 rounded-lg flex items-center justify-between hover:bg-blue-100/70 cursor-pointer transition-colors ${
                selectedCustomerId === 'ALL'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-blue-900 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    selectedCustomerId === 'ALL' ? 'bg-white text-blue-600' : 'bg-blue-200/80 text-blue-800'
                  }`}
                >
                  <Users size={15} />
                </div>
                <div>
                  <div className="text-xs leading-tight">All Customers</div>
                  <div
                    className={`text-[10px] ${
                      selectedCustomerId === 'ALL' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    View all workers &amp; documents of {customers.length} employees
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedCustomerId === 'ALL'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {customers.length} Workers
              </span>
            </div>
          </div>

          {/* Customer List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs p-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs italic">
                No matching worker found
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = cust.id === selectedCustomerId;
                const docCount = cust.documents?.length || 0;
                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      onSelect(cust.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`p-2.5 rounded-lg flex items-center justify-between hover:bg-blue-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden border border-slate-200">
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
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
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

// Compute status of a document
function computeExpiryStatus(expireDate?: string): {
  status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';
  label: string;
  badgeClass: string;
} {
  if (!expireDate || expireDate.trim() === '') {
    return {
      status: 'no_expiry',
      label: 'Permanent / Lifetime',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }

  const exp = new Date(expireDate);
  if (isNaN(exp.getTime())) {
    return {
      status: 'no_expiry',
      label: 'No Expiry',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }

  const now = new Date();
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `Expired (${Math.abs(diffDays)}d ago)`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  } else if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      label: `Expiring (${diffDays}d left)`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  } else {
    return {
      status: 'valid',
      label: `Active (${diffDays}d left)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
}

function DocumentDownloadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');
  const serviceParam = searchParams.get('service');

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Available services list for service-card scoping
  const [availableServices, setAvailableServices] = useState<ServiceCard[]>(() => {
    return typeof window !== 'undefined' ? getStoredServices() : [];
  });

  useEffect(() => {
    fetchServiceCards()
      .then((cards) => {
        if (cards && cards.length > 0) setAvailableServices(cards);
      })
      .catch(() => {});
  }, []);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(serviceParam || 'ALL');

  useEffect(() => {
    if (serviceParam) {
      setSelectedServiceId(serviceParam);
    } else {
      setSelectedServiceId('ALL');
    }
  }, [serviceParam]);

  // Find active service if scoped to a specific card
  const activeService = useMemo(() => {
    if (!selectedServiceId || selectedServiceId === 'ALL' || selectedServiceId === 'document-download') {
      return null;
    }
    return (
      availableServices.find(
        (s) =>
          s.id.toLowerCase() === selectedServiceId.toLowerCase() ||
          s.title.toLowerCase() === selectedServiceId.toLowerCase()
      ) || null
    );
  }, [selectedServiceId, availableServices]);

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

  const [companyCustomers, setCompanyCustomers] = useState<CustomerRecord[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Filters
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 'ALL'>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'valid' | 'expiring_soon' | 'expired'>('ALL');

  // Share modal state
  const [activeShareDoc, setActiveShareDoc] = useState<RepositoryDocument | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [downloadSuccessFeedback, setDownloadSuccessFeedback] = useState<string | null>(null);

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

    async function initCompanies() {
      const backendComps = await fetchCompaniesFromBackend();
      const stored = getStoredCompanies();
      const merged = [...backendComps, ...stored];
      setAllCompanies(merged);

      if (companyParam) {
        const found = merged.find(
          (c) =>
            c.id.toLowerCase() === companyParam.toLowerCase() ||
            c.name.toLowerCase().includes(companyParam.toLowerCase()) ||
            c.name.toLowerCase().replace(/[^a-z0-9]/g, '-').includes(companyParam.toLowerCase())
        );
        if (found) {
          setActiveCompany(found);
        } else {
          const formattedName = companyParam
            .split('-')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ');
          setActiveCompany({
            id: companyParam,
            name: formattedName,
            roc: `ROC-${Math.abs(companyParam.split('').reduce((a, b) => a + b.charCodeAt(0), 0))}`,
            sector: 'General Business & Services',
            description: `Employer entity ${formattedName}`,
            logo: '/images/companies/gamuda.svg',
            tag: 'Verified JIM',
            totalWorkers: 0,
          });
        }
      }
    }

    initCompanies();
  }, [companyParam]);

  // Fetch company customers
  useEffect(() => {
    if (!activeCompany?.id) return;
    let isCancelled = false;

    async function loadCustomers() {
      setLoadingCustomers(true);
      try {
        const list = await fetchCustomers(activeCompany.id);
        const filtered = list.filter(
          (c) =>
            !c.company_id ||
            c.company_id.toLowerCase() === activeCompany.id.toLowerCase() ||
            c.company_id.toLowerCase() === activeCompany.name.toLowerCase()
        );

        if (!isCancelled) {
          setCompanyCustomers(filtered);
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

  // Aggregate all documents across customers (scoped to selected service card if filtered)
  const allGeneratedDocuments: RepositoryDocument[] = useMemo(() => {
    const docList: RepositoryDocument[] = [];
    const isFilteredByService = Boolean(activeService);

    companyCustomers.forEach((cust) => {
      const refNo = `MYP-2026-${String(cust.id).padStart(6, '0')}`;
      const workerIssueDate = cust.created_at ? cust.created_at.split('T')[0] : '2024-01-15';
      const workerExpireDate = cust.passport_expire_date || '2026-12-31';

      // When NOT filtered by a specific service card (i.e. viewing ALL documents in general download):
      if (!isFilteredByService) {
        // 1. Official ePASS Digital Slip (Always present for every registered worker)
        const epassStatus = computeExpiryStatus(workerExpireDate);
        docList.push({
          id: `${cust.id}-epass`,
          customerId: cust.id,
          customerName: cust.full_name,
          passportNo: cust.passport_no || 'N/A',
          country: cust.country || 'BANGLADESH',
          profilePic: cust.profile_pic,
          workingSector: cust.working_sector || activeCompany.sector,
          documentName: 'ePASS Digital Slip (Official JIM)',
          documentCategory: 'Immigration & PLKS Permit',
          documentUrl: '',
          documentType: 'epass',
          documentSize: 'Official Digital Slip',
          issueDate: workerIssueDate,
          expireDate: workerExpireDate,
          referenceNo: refNo,
          status: epassStatus.status,
          serviceId: 'document-download',
          serviceName: 'Document Download',
        });

        // 2. Official Passport Scan (if available)
        if (cust.passport_file) {
          const passStatus = computeExpiryStatus(cust.passport_expire_date);
          docList.push({
            id: `${cust.id}-passport`,
            customerId: cust.id,
            customerName: cust.full_name,
            passportNo: cust.passport_no || 'N/A',
            country: cust.country || 'BANGLADESH',
            profilePic: cust.profile_pic,
            workingSector: cust.working_sector || activeCompany.sector,
            documentName: 'Passport Bio Page (Official Scan)',
            documentCategory: 'Passport & Identity',
            documentUrl: getFileUrl(cust.passport_file),
            documentType: 'image/pdf',
            documentSize: 'Official Scan',
            issueDate: cust.passport_issue_date || workerIssueDate,
            expireDate: cust.passport_expire_date || workerExpireDate,
            referenceNo: `PASS-${cust.passport_no || cust.id}`,
            status: passStatus.status,
            serviceId: 'passport',
            serviceName: 'Passport',
          });
        }

        // 3. National ID (if available)
        if (cust.nid_file) {
          docList.push({
            id: `${cust.id}-nid`,
            customerId: cust.id,
            customerName: cust.full_name,
            passportNo: cust.passport_no || 'N/A',
            country: cust.country || 'BANGLADESH',
            profilePic: cust.profile_pic,
            workingSector: cust.working_sector || activeCompany.sector,
            documentName: 'National ID / NID Card',
            documentCategory: 'Identity & Citizenship',
            documentUrl: getFileUrl(cust.nid_file),
            documentType: 'image/pdf',
            documentSize: 'Identity Document',
            issueDate: '',
            expireDate: '',
            referenceNo: `NID-${cust.nid_no || cust.id}`,
            status: 'no_expiry',
            serviceId: 'nid',
            serviceName: 'National ID',
          });
        }
      }

      // 4. Any dynamic uploaded documents
      if (Array.isArray(cust.documents)) {
        cust.documents.forEach((doc, idx) => {
          if (isFilteredByService && activeService) {
            const targetId = activeService.id.toLowerCase().trim();
            const targetTitle = activeService.title.toLowerCase().trim();
            const docSvcId = (doc.service_id || '').toLowerCase().trim();
            const docSvcName = (doc.service_name || '').toLowerCase().trim();

            const matches =
              (docSvcId && docSvcId === targetId) ||
              (targetTitle && docSvcName && docSvcName === targetTitle) ||
              (docSvcId && targetTitle && docSvcId === targetTitle) ||
              (targetId && docSvcName && targetId === docSvcName) ||
              (docSvcId && targetId && docSvcId.replace(/-/g, '') === targetId.replace(/-/g, '')) ||
              (docSvcName && targetTitle && docSvcName.replace(/\s+/g, '') === targetTitle.replace(/\s+/g, ''));

            if (!matches) {
              return; // Skip document if not tagged with this service card!
            }
          } else {
            // When viewing all, avoid duplicate epass/passport slips if already added
            if (
              doc.name.toLowerCase().includes('epass digital slip') ||
              doc.name.toLowerCase().includes('passport bio page')
            ) {
              return;
            }
          }

          const docExpiryStatus = computeExpiryStatus(doc.expire_date);
          docList.push({
            id: `${cust.id}-doc-${idx}`,
            customerId: cust.id,
            customerName: cust.full_name,
            passportNo: cust.passport_no || 'N/A',
            country: cust.country || 'BANGLADESH',
            profilePic: cust.profile_pic,
            workingSector: cust.working_sector || activeCompany.sector,
            documentName: doc.name || `Uploaded Document #${idx + 1}`,
            documentCategory: doc.service_name || (activeService ? activeService.title : 'Worker Clearance'),
            documentUrl: doc.url ? getFileUrl(doc.url) : '',
            documentType: doc.type || 'file',
            documentSize: doc.size || 'Attached File',
            issueDate: doc.issue_date || workerIssueDate,
            expireDate: doc.expire_date || '',
            referenceNo: `DOC-${cust.id}-${idx + 1}`,
            status: docExpiryStatus.status,
            serviceId: doc.service_id || activeService?.id,
            serviceName: doc.service_name || activeService?.title,
          });
        });
      }
    });

    return docList;
  }, [companyCustomers, activeCompany.sector, activeService, selectedServiceId]);

  // Unique document types for the "Select Document" filter
  const uniqueDocumentTypes = useMemo(() => {
    const set = new Set<string>();
    if (!activeService) {
      set.add('ePASS Digital Slip (Official JIM)');
      set.add('Passport Bio Page (Official Scan)');
      set.add('Work Permit / PLKS Certificate');
      set.add('Medical Screening Certificate (FOMEMA)');
    }

    allGeneratedDocuments.forEach((d) => {
      if (d.documentName) {
        set.add(d.documentName);
      }
    });

    return Array.from(set);
  }, [allGeneratedDocuments, activeService]);

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return allGeneratedDocuments.filter((doc) => {
      // 1. Customer Filter
      if (selectedCustomerId !== 'ALL' && doc.customerId !== selectedCustomerId) {
        return false;
      }

      // 2. Document Type Filter
      if (selectedDocType !== 'ALL' && doc.documentName !== selectedDocType) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) {
        return false;
      }

      // 4. Keyword Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = doc.documentName.toLowerCase().includes(query);
        const matchesWorker = doc.customerName.toLowerCase().includes(query);
        const matchesPassport = doc.passportNo.toLowerCase().includes(query);
        const matchesRef = doc.referenceNo.toLowerCase().includes(query);
        const matchesCategory = doc.documentCategory.toLowerCase().includes(query);
        const matchesCountry = doc.country.toLowerCase().includes(query);

        if (
          !matchesName &&
          !matchesWorker &&
          !matchesPassport &&
          !matchesRef &&
          !matchesCategory &&
          !matchesCountry
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allGeneratedDocuments, selectedCustomerId, selectedDocType, statusFilter, searchQuery]);

  // Document metrics summary
  const metrics = useMemo(() => {
    const total = allGeneratedDocuments.length;
    const valid = allGeneratedDocuments.filter((d) => d.status === 'valid' || d.status === 'no_expiry').length;
    const expiringSoon = allGeneratedDocuments.filter((d) => d.status === 'expiring_soon').length;
    const expired = allGeneratedDocuments.filter((d) => d.status === 'expired').length;
    return { total, valid, expiringSoon, expired };
  }, [allGeneratedDocuments]);

  // Trigger preview in dedicated new page / tab
  const handlePreviewInNewPage = (doc: RepositoryDocument) => {
    const previewUrl = `/document-download/preview?company=${encodeURIComponent(
      activeCompany.id
    )}&customerId=${doc.customerId}&docName=${encodeURIComponent(
      doc.documentName
    )}&docUrl=${encodeURIComponent(doc.documentUrl)}&docType=${encodeURIComponent(
      doc.documentType
    )}&issueDate=${encodeURIComponent(doc.issueDate || '')}&expireDate=${encodeURIComponent(
      doc.expireDate || ''
    )}${selectedServiceId && selectedServiceId !== 'ALL' ? `&service=${encodeURIComponent(selectedServiceId)}` : ''}`;
    window.open(previewUrl, '_blank');
  };

  // Download action
  const handleDownloadClick = (doc: RepositoryDocument) => {
    const fileName = `${doc.documentName.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.passportNo || 'doc'}`;
    setDownloadSuccessFeedback(`Downloading: ${doc.documentName}`);
    setTimeout(() => setDownloadSuccessFeedback(null), 3000);

    if (doc.documentUrl && doc.documentUrl !== '') {
      const link = document.createElement('a');
      link.href = doc.documentUrl;
      link.download = `${fileName}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Open preview page for print/download of ePASS digital slip
      handlePreviewInNewPage(doc);
    }
  };

  // Share action trigger
  const handleShareClick = (doc: RepositoryDocument) => {
    setActiveShareDoc(doc);
    setIsShareModalOpen(true);
  };

  // WhatsApp share message
  const shareText = useMemo(() => {
    if (!activeShareDoc) return '';
    const fileLink =
      activeShareDoc.documentUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/document-download/preview?company=${encodeURIComponent(
            activeCompany.id
          )}&customerId=${activeShareDoc.customerId}&docName=${encodeURIComponent(
            activeShareDoc.documentName
          )}`
        : '');

    return `🏛️ *JABATAN IMIGRESEN MALAYSIA (JIM)*\n━━━━━━━━━━━━━━━━━━━━━━━━\n📄 *Document:* ${activeShareDoc.documentName}\n👤 *Worker:* ${activeShareDoc.customerName}\n🛂 *Passport:* ${activeShareDoc.passportNo}\n🌍 *Nationality:* ${activeShareDoc.country}\n📋 *Ref No:* ${activeShareDoc.referenceNo}\n🏢 *Employer:* ${activeCompany.name} (${activeCompany.roc})\n📅 *Issued:* ${activeShareDoc.issueDate || 'N/A'} | *Expires:* ${activeShareDoc.expireDate || 'Permanent'}\n✅ *Status:* APPROVED & VERIFIED\n\n🔗 *Document Link:* ${fileLink}\n━━━━━━━━━━━━━━━━━━━━━━━━\n_Official Employer Services Portal_`;
  }, [activeShareDoc, activeCompany]);

  const handleWhatsAppSend = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Document: ${activeShareDoc?.documentName || 'Document'}`,
          text: shareText,
          url: activeShareDoc?.documentUrl || window.location.href,
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

  // Reset all filters
  const resetFilters = () => {
    setSelectedCustomerId('ALL');
    setSelectedDocType('ALL');
    setSearchQuery('');
    setStatusFilter('ALL');
    setSelectedServiceId('ALL');
    if (serviceParam) {
      router.push(`/document-download?company=${encodeURIComponent(activeCompany.id)}`);
    }
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
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors no-underline shadow-2xs"
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
                    <span className="text-slate-800 font-bold">
                      {activeService ? `${activeService.title} Documents` : 'Document Repository'}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0b4da2] tracking-tight mt-0.5 flex items-center gap-2 flex-wrap">
                    <FileDown className="text-blue-600 shrink-0" size={24} />
                    <span>{activeService ? `${activeService.title} Documents` : 'Document Download & Verification Portal'}</span>
                    {activeService && (
                      <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        {activeService.tag || 'Service Dossier'}
                      </span>
                    )}
                  </h1>
                </div>
              </div>

              {/* Company Identity Pill */}
              <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-200/70 px-4 py-2 rounded-xl shadow-2xs">
                <Building2 size={22} className="text-blue-700 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {activeCompany.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ROC: {activeCompany.roc} • {activeCompany.sector}
                  </div>
                </div>
                <span className="ml-2 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
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

              {/* Statistics & Quick Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Total Documents
                    </div>
                    <div className="text-lg font-black text-slate-900 leading-tight">
                      {metrics.total}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Total Workers
                    </div>
                    <div className="text-lg font-black text-slate-900 leading-tight">
                      {companyCustomers.length}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Active &amp; Valid
                    </div>
                    <div className="text-lg font-black text-emerald-700 leading-tight">
                      {metrics.valid}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Expiring / Expired
                    </div>
                    <div className="text-lg font-black text-amber-700 leading-tight">
                      {metrics.expiringSoon + metrics.expired}
                    </div>
                  </div>
                </div>
              </div>

              {/* FILTERS CARD: Select Customer, Select Document, Search & Status */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                  {/* Left Filters: Service Card, Customer & Document Select */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                    {/* 1. Select Service Card */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Layers size={14} className="text-blue-600" />
                        <span>Select Service Card</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedServiceId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedServiceId(val);
                            setSelectedDocType('ALL');
                            if (val === 'ALL' || val === 'document-download') {
                              router.push(`/document-download?company=${encodeURIComponent(activeCompany.id)}`);
                            } else {
                              router.push(
                                `/document-download?company=${encodeURIComponent(activeCompany.id)}&service=${encodeURIComponent(val)}`
                              );
                            }
                          }}
                          className="w-full min-h-[42px] px-3.5 py-2 bg-white border border-slate-300 hover:border-blue-500 focus:border-blue-600 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer transition-all shadow-xs appearance-none pr-9"
                        >
                          <option value="ALL">📁 All Services (Entire Repository)</option>
                          {availableServices
                            .filter((s) => s.id !== 'customer')
                            .map((svc) => (
                              <option key={svc.id} value={svc.id}>
                                {svc.id === 'document-download' ? '📥 Document Download (All)' : `📄 ${svc.title}`}
                              </option>
                            ))}
                        </select>
                        <ChevronDown
                          size={15}
                          className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* 2. Select Customer with "All Customers" */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Users size={14} className="text-blue-600" />
                        <span>Select Customer</span>
                      </label>
                      <CustomerSelect2
                        customers={companyCustomers}
                        selectedCustomerId={selectedCustomerId}
                        totalDocsCount={allGeneratedDocuments.length}
                        onSelect={(id) => setSelectedCustomerId(id)}
                      />
                    </div>

                    {/* 3. Select Document with "All Documents" */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-600" />
                        <span>Select Document</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedDocType}
                          onChange={(e) => setSelectedDocType(e.target.value)}
                          className="w-full min-h-[42px] px-3.5 py-2 bg-white border border-slate-300 hover:border-blue-500 focus:border-blue-600 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer transition-all shadow-xs appearance-none pr-9"
                        >
                          <option value="ALL">
                            📁 All Documents ({allGeneratedDocuments.length} total)
                          </option>
                          <optgroup label="Filter by Document Type:">
                            {uniqueDocumentTypes.map((type, idx) => (
                              <option key={idx} value={type}>
                                📄 {type}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <ChevronDown
                          size={15}
                          className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Filters: Search Box & Reset */}
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 lg:w-[400px]">
                    <div className="relative w-full">
                      <Search
                        size={15}
                        className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search document, worker, passport..."
                        className="w-full min-h-[42px] pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 hover:border-blue-500 focus:border-blue-600 focus:bg-white rounded-xl text-xs font-medium text-slate-800 outline-none transition-all shadow-2xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {(selectedCustomerId !== 'ALL' ||
                      selectedDocType !== 'ALL' ||
                      searchQuery ||
                      statusFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        title="Clear all filters"
                      >
                        <RefreshCw size={13} />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 font-semibold text-[11px] mr-1">Status:</span>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                        statusFilter === 'ALL'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      All ({metrics.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('valid')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                        statusFilter === 'valid'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Active ({metrics.valid})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('expiring_soon')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                        statusFilter === 'expiring_soon'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                      }`}
                    >
                      Expiring Soon ({metrics.expiringSoon})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('expired')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                        statusFilter === 'expired'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
                      }`}
                    >
                      Expired ({metrics.expired})
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Showing <strong>{filteredDocuments.length}</strong> of <strong>{metrics.total}</strong> documents
                  </div>
                </div>
              </div>

              {/* DOCUMENT LIST TABLE */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                {/* Table Top Header Bar */}
                <div className="bg-[#1872b2] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileDown size={18} className="text-blue-100" />
                    <span className="font-extrabold text-sm sm:text-base tracking-wide">
                      Document Repository &amp; Verified Clearances
                    </span>
                    <span className="text-[11px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-semibold">
                      {activeCompany.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-white/15 px-3 py-1 rounded-lg font-semibold text-white/90">
                      {selectedCustomerId === 'ALL'
                        ? 'All Workers Selected'
                        : `${companyCustomers.find((c) => c.id === selectedCustomerId)?.full_name || 'Worker'} Selected`}
                    </span>
                  </div>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-[#0f5385] text-white text-[12px] font-bold border-b border-blue-900">
                        <th className="py-3 px-3.5 text-center w-12 border-r border-blue-800/60">
                          #
                        </th>
                        <th className="py-3 px-4 border-r border-blue-800/60">
                          Document Name &amp; Format
                        </th>
                        <th className="py-3 px-4 border-r border-blue-800/60">
                          Customer / Worker Name
                        </th>
                        <th className="py-3 px-3.5 border-r border-blue-800/60">
                          Service / Category
                        </th>
                        <th className="py-3 px-3.5 border-r border-blue-800/60">
                          Date Issue
                        </th>
                        <th className="py-3 px-3.5 border-r border-blue-800/60">
                          Date Expire
                        </th>
                        <th className="py-3 px-3.5 border-r border-blue-800/60">
                          Document Ref
                        </th>
                        <th className="py-3 px-3.5 border-r border-blue-800/60">
                          File Size
                        </th>
                        <th className="py-3 px-4 text-center min-w-[230px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {loadingCustomers ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              <span className="font-semibold text-slate-700">Loading documents...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredDocuments.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                <FileText size={24} />
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 m-0">
                                {activeService
                                  ? `No documents found for ${activeService.title}`
                                  : 'No documents found'}
                              </h4>
                              <p className="text-xs text-slate-400 m-0">
                                {activeService
                                  ? `No uploaded documents have been tagged with "${activeService.title}" for ${activeCompany.name}. To attach files, edit or register a customer and select this service card tag.`
                                  : 'No document matched your selected customer, document type, or search query.'}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <Link
                                  href={`/customers?company=${encodeURIComponent(activeCompany.id)}`}
                                  className="px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white font-bold text-xs transition-colors shadow-xs no-underline inline-flex items-center gap-1.5"
                                >
                                  <Users size={14} />
                                  <span>Manage Customers</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={resetFilters}
                                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                >
                                  View All Documents
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredDocuments.map((doc, idx) => {
                          const expiryInfo = computeExpiryStatus(doc.expireDate);
                          const isEpass = doc.documentType === 'epass' || !doc.documentUrl;

                          return (
                            <tr
                              key={doc.id}
                              className="hover:bg-blue-50/40 transition-colors bg-white group"
                            >
                              {/* 1. Index # */}
                              <td className="py-3.5 px-3.5 text-center font-bold text-slate-600 bg-slate-50/60 border-r border-slate-200">
                                {idx + 1}
                              </td>

                              {/* 2. Document Name & Format */}
                              <td className="py-3.5 px-4 border-r border-slate-200">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      isEpass
                                        ? 'bg-blue-100 text-blue-700'
                                        : doc.documentUrl.match(/\.(jpeg|jpg|png|webp)$/i)
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {isEpass ? (
                                      <ShieldCheck size={18} />
                                    ) : doc.documentUrl.match(/\.(jpeg|jpg|png|webp)$/i) ? (
                                      <ImageIcon size={18} />
                                    ) : (
                                      <FileText size={18} />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight">
                                      {doc.documentName}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        {isEpass
                                          ? 'Official Slip'
                                          : (doc.documentUrl.split('.').pop() ? doc.documentUrl.split('.').pop()!.charAt(0).toUpperCase() + doc.documentUrl.split('.').pop()!.slice(1).toLowerCase() : 'Pdf')}
                                      </span>
                                      <span className="text-[10px] text-slate-400">•</span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        JIM Digital
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 3. Customer / Worker Name */}
                              <td className="py-3.5 px-4 border-r border-slate-200">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200">
                                    {doc.profilePic ? (
                                      <img
                                        src={getFileUrl(doc.profilePic)}
                                        alt={doc.customerName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      doc.customerName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div className="truncate">
                                    <div className="font-bold text-slate-900 leading-tight truncate">
                                      {doc.customerName}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                      <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-700 border border-slate-200">
                                        🛂 {doc.passportNo}
                                      </span>
                                      <span className="text-slate-400">•</span>
                                      <span>{doc.country}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 4. Service / Category */}
                              <td className="py-3.5 px-3.5 border-r border-slate-200">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200/70">
                                  {doc.documentCategory}
                                </span>
                              </td>

                              {/* 5. Date Issue */}
                              <td className="py-3.5 px-3.5 border-r border-slate-200">
                                <div className="flex items-center gap-1.5 text-slate-700 font-mono text-xs font-semibold">
                                  <Calendar size={13} className="text-slate-400" />
                                  <span>{doc.issueDate || '2024-01-15'}</span>
                                </div>
                              </td>

                              {/* 6. Date Expire with status indicator */}
                              <td className="py-3.5 px-3.5 border-r border-slate-200">
                                <div>
                                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800">
                                    <Clock size={13} className="text-slate-400" />
                                    <span>{doc.expireDate || 'Permanent'}</span>
                                  </div>
                                  <span
                                    className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${expiryInfo.badgeClass}`}
                                  >
                                    {expiryInfo.label}
                                  </span>
                                </div>
                              </td>

                              {/* 7. Document Ref Code */}
                              <td className="py-3.5 px-3.5 border-r border-slate-200">
                                <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/60 block text-center">
                                  {doc.referenceNo}
                                </span>
                              </td>

                              {/* 8. File Size */}
                              <td className="py-3.5 px-3.5 border-r border-slate-200 text-center">
                                <span className="text-[11px] font-mono text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {doc.documentSize}
                                </span>
                              </td>

                              {/* 9. Actions: Preview, Download, Share */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                                  {/* Preview Button (opens in dedicated preview page) */}
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewInNewPage(doc)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                    title="Open document preview in new tab"
                                  >
                                    <Eye size={13} />
                                    <span>Preview</span>
                                  </button>

                                  {/* Download Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadClick(doc)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                    title="Download this document"
                                  >
                                    <Download size={13} />
                                    <span>Download</span>
                                  </button>

                                  {/* Share Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleShareClick(doc)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                    title="Share to WhatsApp or Apps"
                                  >
                                    <Share2 size={13} />
                                    <span>Share</span>
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

                {/* Table Footer Summary */}
                <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>
                      Official digital repository endorsed under <strong>Jabatan Imigresen Malaysia (JIM)</strong> regulations.
                    </span>
                  </div>
                  <div className="font-semibold text-slate-700">
                    Total Records: {filteredDocuments.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Share Modal Dialog */}
      {isShareModalOpen && activeShareDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
              Share <strong>{activeShareDoc.documentName}</strong> for worker{' '}
              <strong>{activeShareDoc.customerName}</strong> via WhatsApp, native mobile apps, or copy verification summary.
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
                      Send directly to worker, employer, or agency chat
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
                      Includes worker, passport &amp; verification details
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
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
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
