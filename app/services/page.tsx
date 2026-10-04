'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Company } from '@/lib/companies';
import { getStoredCompanies } from '@/lib/companyStorage';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
  subscribeToServiceChanges,
} from '@/lib/serviceStorage';
import {
  getStoredThemeSettings,
  fetchThemeSettings,
  subscribeToThemeChanges,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
  ServiceCardsAnimationType,
} from '@/lib/themeSettings';
import {
  fetchCustomers,
  CustomerRecord,
  CustomerDocument,
  getFileUrl,
} from '@/lib/customerStorage';
import {
  AuthUser,
  getCurrentUser,
  getMasterAdminUser,
  getSuperAdminUser,
  hasCompanyAccess,
  isAuthenticated,
  getUserPanelInfo,
  logoutUser,
  hasServiceCardAccess,
} from '@/lib/auth';

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');
  const verifiedServiceParam = searchParams.get('verifiedService');

  const allCompanies = typeof window !== 'undefined' ? getStoredCompanies() : [];

  const [query, setQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Dynamic Service Cards State
  const [serviceList, setServiceList] = useState<ServiceCard[]>(() => {
    return typeof window !== 'undefined' ? getStoredServices() : [];
  });

  // Company Customers & Document Modal State
  const [companyCustomers, setCompanyCustomers] = useState<CustomerRecord[]>([]);
  const [selectedServiceModal, setSelectedServiceModal] = useState<ServiceCard | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    name: string;
    type?: string;
    customerName?: string;
  } | null>(null);

  useEffect(() => {
    const user = getCurrentUser() || getSuperAdminUser() || getMasterAdminUser();
    const loggedIn = isAuthenticated();

    if (!user || !loggedIn) {
      router.replace('/login?redirect=/companies&error=auth_required');
      return;
    }
    setCurrentUser(user);
    setIsAuthChecking(false);

    // If no company query parameter is provided, enforce company list selection first
    if (!companyParam) {
      router.replace('/companies');
      return;
    }
  }, [router, companyParam]);

  // Load and subscribe to service card updates
  useEffect(() => {
    fetchServiceCards()
      .then((cards) => {
        if (cards && cards.length > 0) setServiceList(cards);
      })
      .catch(() => {});

    const unsub = subscribeToServiceChanges(() => {
      setServiceList(getStoredServices());
    });
    return unsub;
  }, []);

  // Service Card Animation Setting State
  const [cardAnimation, setCardAnimation] = useState<ServiceCardsAnimationType>(() => {
    return typeof window !== 'undefined'
      ? getStoredThemeSettings().service_cards_animation || 'from-bottom'
      : 'from-bottom';
  });
  const [cardDuration, setCardDuration] = useState<number>(() => {
    return typeof window !== 'undefined'
      ? getStoredThemeSettings().service_cards_duration || 1000
      : 1000;
  });
  const [cardStagger, setCardStagger] = useState<number>(() => {
    return typeof window !== 'undefined'
      ? getStoredThemeSettings().service_cards_stagger || 120
      : 120;
  });

  // Load and listen to active service card animation theme changes
  useEffect(() => {
    fetchThemeSettings()
      .then((theme) => {
        if (theme?.service_cards_animation) {
          setCardAnimation(theme.service_cards_animation);
        }
        if (typeof theme?.service_cards_duration === 'number') {
          setCardDuration(theme.service_cards_duration);
        }
        if (typeof theme?.service_cards_stagger === 'number') {
          setCardStagger(theme.service_cards_stagger);
        }
      })
      .catch(() => {});

    const unsubTheme = subscribeToThemeChanges((theme) => {
      if (theme?.service_cards_animation) {
        setCardAnimation(theme.service_cards_animation);
      }
      if (typeof theme?.service_cards_duration === 'number') {
        setCardDuration(theme.service_cards_duration);
      }
      if (typeof theme?.service_cards_stagger === 'number') {
        setCardStagger(theme.service_cards_stagger);
      }
    });

    return unsubTheme;
  }, []);

  const isEmployee =
    currentUser?.role === 'Employee' ||
    (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'MasterAdmin');
  const isMasterAdmin = currentUser?.role === 'MasterAdmin';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isRestrictedRole = !isSuperAdmin;

  // Resolve activeCompany: priority to companyParam, then stored activeCompany, then first permitted company
  let targetCompany: Company | undefined;
  if (companyParam) {
    targetCompany = allCompanies.find(
      (c) =>
        c.id.toLowerCase() === companyParam.toLowerCase() ||
        c.name.toLowerCase().includes(companyParam.toLowerCase())
    );
  }

  if (!targetCompany && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('activeCompany');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (!isRestrictedRole || hasCompanyAccess(parsed.id, parsed.name, parsed.roc))) {
          targetCompany = allCompanies.find((c) => c.id === parsed.id) || parsed;
        }
      }
    } catch {}
  }

  if (!targetCompany && isRestrictedRole) {
    targetCompany = allCompanies.find((c) => hasCompanyAccess(c.id, c.name, c.roc));
  }

  const activeCompany = targetCompany || allCompanies[0] || {
    id: 'default-company',
    name: 'AUTHORIZED EMPLOYER ENTITY',
    roc: 'ROC-202600000000',
    sector: 'General Services',
    description: 'Authorized registered company.',
    logo: '/images/companies/gamuda.svg',
    tag: 'Verified JIM',
    totalWorkers: 1000,
  };

  const hasAccess =
    !isRestrictedRole || hasCompanyAccess(activeCompany.id, activeCompany.name, activeCompany.roc);
  const panelInfo = getUserPanelInfo();

  // Load active company's customers to display documents
  useEffect(() => {
    if (!activeCompany?.id) return;
    fetchCustomers(activeCompany.id)
      .then((records) => {
        setCompanyCustomers(records);
      })
      .catch(() => {});
  }, [activeCompany?.id]);

  // Open modal if URL query specifies serviceModal
  useEffect(() => {
    const modalParam = searchParams.get('serviceModal');
    if (modalParam && serviceList.length > 0) {
      const matched = serviceList.find((s) => s.id === modalParam);
      if (matched && matched.id !== 'customer' && matched.id !== 'document-download') {
        if (!currentUser || currentUser.role !== 'Employee' || hasServiceCardAccess(matched.id, matched.title)) {
          setSelectedServiceModal(matched);
        }
      }
    }
  }, [searchParams, serviceList, currentUser]);

  // Compute document count per service card for the active company
  const activeCompanyDocCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    companyCustomers.forEach((cust) => {
      if (Array.isArray(cust.documents)) {
        cust.documents.forEach((doc) => {
          if (doc.service_id) {
            counts[doc.service_id] = (counts[doc.service_id] || 0) + 1;
          } else if (doc.service_name) {
            const matched = serviceList.find(
              (s) => s.title.toLowerCase() === doc.service_name?.toLowerCase()
            );
            if (matched) {
              counts[matched.id] = (counts[matched.id] || 0) + 1;
            }
          }
        });
      }
    });
    return counts;
  }, [companyCustomers, serviceList]);

  // Compute documents list matching currently opened service card modal
  const modalDocuments = useMemo(() => {
    if (!selectedServiceModal) return [];
    const q = docSearchQuery.toLowerCase().trim();
    const result: Array<{
      customer: CustomerRecord;
      doc: CustomerDocument;
      docIndex: number;
    }> = [];

    companyCustomers.forEach((cust) => {
      if (Array.isArray(cust.documents)) {
        cust.documents.forEach((d, idx) => {
          const isMatch =
            d.service_id === selectedServiceModal.id ||
            (d.service_name &&
              d.service_name.toLowerCase() === selectedServiceModal.title.toLowerCase());

          if (isMatch) {
            const matchesSearch =
              !q ||
              cust.full_name.toLowerCase().includes(q) ||
              (cust.passport_no && cust.passport_no.toLowerCase().includes(q)) ||
              (cust.nid_no && cust.nid_no.toLowerCase().includes(q)) ||
              (d.name && d.name.toLowerCase().includes(q));

            if (matchesSearch) {
              result.push({
                customer: cust,
                doc: d,
                docIndex: idx,
              });
            }
          }
        });
      }
    });

    return result;
  }, [selectedServiceModal, companyCustomers, docSearchQuery]);

  const allowedServiceList = useMemo(() => {
    if (!currentUser || currentUser.role !== 'Employee') {
      return serviceList;
    }
    return serviceList.filter((s) => hasServiceCardAccess(s.id, s.title));
  }, [serviceList, currentUser]);

  const verifiedService = allowedServiceList.find(
    (s) => s.id.toLowerCase() === (verifiedServiceParam || '').toLowerCase()
  );

  const filteredServices = allowedServiceList.filter(
    (service) =>
      service.title.toLowerCase().includes(query.toLowerCase()) ||
      service.description.toLowerCase().includes(query.toLowerCase())
  );

  if (isAuthChecking || !currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center text-slate-800 p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200/80 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 m-0">Verifying Authorization...</h2>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Authentication required to access Employer Services. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Access Restriction Warning for unauthorized employee / master admin */}
      {!hasAccess && (
        <div className="bg-rose-600 text-white py-3 px-6 shadow-md">
          <div className="max-w-[1180px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 font-semibold">
              <ShieldAlert size={18} className="shrink-0" />
              <span>
                Access Restricted: Your {isMasterAdmin ? 'Master Admin' : 'employee'} profile (
                {currentUser?.name}) does not have clearance for &quot;{activeCompany.name}&quot;. You
                only have access to your assigned companies.
              </span>
            </div>
            <Link
              href="/companies"
              className="bg-white text-rose-700 hover:bg-rose-50 px-3.5 py-1.5 rounded-lg font-bold transition-colors shrink-0 text-center no-underline"
            >
              Switch to Assigned Company
            </Link>
          </div>
        </div>
      )}

      {/* Active Employer Banner Bar */}
      <section className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white py-8 sm:py-10 shadow-md">
        <div className="w-full max-w-[1180px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-lg border border-white/20">
                <img
                  src={activeCompany.logo}
                  alt={activeCompany.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Authenticated Employer
                  </span>
                  <span className="text-blue-200 text-xs font-mono">{activeCompany.roc}</span>
                </div>
                <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
                  {activeCompany.name}
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-1 font-medium">
                  Sector: {activeCompany.sector} • Active Registered Foreign Workers:{' '}
                  {activeCompany.totalWorkers.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {panelInfo.hasPanel && (
                <Link
                  href={panelInfo.panelUrl}
                  id="services-your-panel-btn"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5 no-underline border border-amber-300 ring-2 ring-amber-400/30"
                  title={`Open ${panelInfo.panelBadge} Panel`}
                >
                  <LayoutDashboard size={16} className="text-slate-950" />
                  <span className="tracking-wide">Your Panel</span>
                  <span className="text-[10px] bg-slate-950/15 text-slate-950 px-1.5 py-0.5 rounded font-extrabold uppercase">
                    {panelInfo.panelBadge}
                  </span>
                </Link>
              )}
              <Link
                href="/companies"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/25 transition-all cursor-pointer"
              >
                <Building2 size={15} />
                <span>Switch Company</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logoutUser();
                  router.push('/login');
                }}
                className="inline-flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-red-400/30 transition-all cursor-pointer"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className="bg-[#f7f9fb] py-12 sm:py-16" id="services">
        <div className="w-full max-w-[1180px] mx-auto px-6">
          {/* Authenticated Service Alert Callout */}
          {verifiedService && (
            <div className="mb-8 bg-emerald-50/95 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-emerald-950 shadow-xs animate-in fade-in slide-in-from-top-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold m-0 text-emerald-950 flex items-center gap-2">
                    <span>Authenticated Session Active: {verifiedService.title}</span>
                    <span className="text-[10px] font-mono bg-emerald-200/90 text-emerald-950 px-2 py-0.5 rounded-full uppercase font-bold">
                      Connected
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-800 m-0 mt-0.5">
                    Digital workforce documents and customer records synchronized for{' '}
                    {activeCompany.name} ({activeCompany.roc}).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/services?company=${encodeURIComponent(activeCompany.id)}`}
                  className="text-xs bg-emerald-200/70 hover:bg-emerald-200 text-emerald-950 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  Dismiss Banner
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <Link href="/" className="hover:text-blue-600 transition-colors">
                  Home
                </Link>
                <ChevronRight size={13} />
                <Link href="/#companies" className="hover:text-blue-600 transition-colors">
                  Employers
                </Link>
                <ChevronRight size={13} />
                <span className="text-[#2b74c9] font-bold uppercase tracking-wider">
                  {activeCompany.name} Services
                </span>
              </div>
              <h2 className="text-[#1a283c] text-3xl md:text-4xl font-extrabold tracking-tight m-0">
                Digital Immigration &amp; Employer Services ({allowedServiceList.length})
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Select any digital service below to view tagged customer documents, passports, and
                worker dossiers for {activeCompany.name}.
              </p>
            </div>
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 w-full sm:w-72 text-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services..."
                aria-label="Search services"
                className="border-0 bg-transparent text-slate-800 text-xs outline-none w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 3-Column Service Cards Grid or Restricted Notice */}
          {!hasAccess ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-6">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <ShieldAlert size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 m-0">Clearance Required</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                You do not have clearance to access services for <strong>{activeCompany.name}</strong>.
                Your account is restricted to your assigned companies only.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                {panelInfo.hasPanel && (
                  <Link
                    href={panelInfo.panelUrl}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors no-underline inline-flex items-center justify-center gap-2 shadow-sm"
                  >
                    <LayoutDashboard size={14} />
                    <span>Your Panel ({panelInfo.panelBadge})</span>
                  </Link>
                )}
                <Link
                  href="/companies"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-colors no-underline"
                >
                  View Your Authorized Companies
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {filteredServices.map((service, index) => {
                const isCoreCustomer = service.id === 'customer';
                const isCoreDocDownload = service.id === 'document-download';
                const isCardVerified = verifiedServiceParam === service.id;
                const docCount = activeCompanyDocCounts[service.id] || 0;

                // Core cards preserve exact routing structure!
                const cardHref = isCoreCustomer
                  ? `/customers?company=${encodeURIComponent(activeCompany.id)}`
                  : isCoreDocDownload
                  ? `/document-download?company=${encodeURIComponent(activeCompany.id)}`
                  : '#';

                const actionText = isCoreCustomer
                  ? 'Open Customers'
                  : isCoreDocDownload
                  ? 'Download Documents'
                  : docCount > 0
                  ? `View ${docCount} Document${docCount > 1 ? 's' : ''}`
                  : 'View Documents';

                const CardElement = isCoreCustomer || isCoreDocDownload ? Link : 'div';
                const animClass = getServiceCardAnimationClass(cardAnimation, index);

                return (
                  <CardElement
                    href={cardHref}
                    id={`service-card-${index}`}
                    key={service.id || service.title}
                    onClick={(e: React.MouseEvent) => {
                      if (!isCoreCustomer && !isCoreDocDownload) {
                        e.preventDefault();
                        setSelectedServiceModal(service);
                        setDocSearchQuery('');
                      }
                    }}
                    style={getServiceCardAnimationStyle(index, cardDuration, cardStagger)}
                    className={`group relative flex flex-col items-center text-center bg-white border rounded-[20px] p-8 md:p-9 shadow-[0_4px_20px_rgba(18,38,70,0.05)] hover:shadow-[0_16px_36px_rgba(18,55,110,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer min-h-[300px] outline-none font-inherit no-underline select-none ${animClass} ${
                      isCardVerified
                        ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                        : 'border-slate-200/90 hover:border-blue-400'
                    }`}
                  >
                    {/* Service Image */}
                    <div className="flex items-center justify-center h-[120px] w-full mb-4 pointer-events-none">
                      <img
                        src={getFileUrl(service.image)}
                        alt={service.title}
                        className="max-h-[110px] max-w-[170px] w-auto h-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                        loading="lazy"
                      />
                    </div>

                    {/* Service Info */}
                    <div className="flex flex-col items-center flex-1 justify-start w-full pointer-events-none">
                      <div className="flex flex-col items-center gap-1.5 justify-center pointer-events-none">
                        <h3 className="text-[17px] font-bold text-slate-900 leading-snug m-0 pointer-events-none group-hover:text-[#0b4da2] transition-colors">
                          {service.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                          {service.tag && (
                            <span className="inline-block bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase pointer-events-none">
                              {service.tag}
                            </span>
                          )}
                          {!isCoreCustomer && !isCoreDocDownload && docCount > 0 && (
                            <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase pointer-events-none">
                              <FileText size={10} /> {docCount} Files Attached
                            </span>
                          )}
                          {isCardVerified && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase pointer-events-none">
                              <CheckCircle2 size={10} className="text-emerald-600" /> Active
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[13px] text-slate-500 leading-relaxed mt-2.5 max-w-[280px] pointer-events-none">
                        {service.description}
                      </p>
                    </div>

                    {/* Card Action Link */}
                    <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-xs text-slate-500 pointer-events-none">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {isCoreCustomer || isCoreDocDownload ? 'Official Portal' : 'Employer Dossier'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0b4da2] group-hover:translate-x-1 transition-transform">
                        {actionText} <ArrowRight size={14} />
                      </span>
                    </div>
                  </CardElement>
                );
              })}
            </div>
          )}

          {hasAccess && filteredServices.length === 0 && (
            <div className="text-slate-500 py-12 text-center text-sm w-full">
              No service found matching your search.
            </div>
          )}
        </div>
      </section>

      {/* SERVICE CARD DOCUMENT DOSSIER MODAL */}
      {selectedServiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl p-2.5 flex items-center justify-center shrink-0 shadow-md">
                  <img
                    src={getFileUrl(selectedServiceModal.image)}
                    alt={selectedServiceModal.title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Service Document Dossier
                    </span>
                    {selectedServiceModal.tag && (
                      <span className="text-xs bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold uppercase">
                        {selectedServiceModal.tag}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white m-0">
                    {selectedServiceModal.title}
                  </h2>
                  <p className="text-xs text-blue-100/90 m-0 mt-1">
                    Worker documents attached for employer entity: <strong>{activeCompany.name}</strong> ({activeCompany.roc})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setSelectedServiceModal(null)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close dossier"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Filter by worker name, passport, NID, or file name..."
                  className="w-full bg-white border border-slate-300 focus:border-[#0b4da2] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 font-medium outline-none shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                  {modalDocuments.length} Document{modalDocuments.length === 1 ? '' : 's'} Found
                </span>
                <Link
                  href={`/customers?company=${encodeURIComponent(activeCompany.id)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083a7c] px-3.5 py-1.5 rounded-xl transition-all shadow-2xs no-underline"
                >
                  <Plus size={14} />
                  <span>Attach In Customer Form</span>
                </Link>
              </div>
            </div>

            {/* Modal Body: Documents Grid / List */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {modalDocuments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalDocuments.map(({ customer, doc, docIndex }) => {
                    const resolvedUrl = getFileUrl(doc.url || doc.dataUrl);
                    const isImage =
                      doc.type?.startsWith('image/') ||
                      /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.name || '') ||
                      /\.(jpg|jpeg|png|webp|gif)$/i.test(resolvedUrl);

                    return (
                      <div
                        key={`${customer.id}-${docIndex}-${doc.name}`}
                        className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Worker Header Info */}
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {customer.profile_pic ? (
                                  <img
                                    src={getFileUrl(customer.profile_pic)}
                                    alt={customer.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User size={18} className="text-[#0b4da2]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-900 truncate m-0">
                                  {customer.full_name}
                                </h4>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                                  Passport: <span className="text-slate-700 font-semibold">{customer.passport_no || 'N/A'}</span> • NID: <span className="text-slate-700 font-semibold">{customer.nid_no}</span>
                                </div>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                              Verified
                            </span>
                          </div>

                          {/* Document Details */}
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              <FileText size={16} className="text-[#0b4da2] shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-800 break-words">
                                  {doc.name || 'Unnamed Document'}
                                </span>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                                  {doc.size && (
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                      {doc.size}
                                    </span>
                                  )}
                                  {doc.type && (
                                    <span className="text-slate-400 text-[10px] truncate max-w-[130px]">
                                      {doc.type}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {(doc.issue_date || doc.expire_date) && (
                              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1.5">
                                {doc.issue_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} className="text-slate-400" />
                                    <span>Issued: <strong>{doc.issue_date}</strong></span>
                                  </span>
                                )}
                                {doc.expire_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} className="text-slate-400" />
                                    <span>Expires: <strong>{doc.expire_date}</strong></span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Document Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Link
                            href={`/customers?company=${encodeURIComponent(activeCompany.id)}&edit=${customer.id}`}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            Edit Customer
                          </Link>

                          <div className="flex items-center gap-2">
                            {resolvedUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewDoc({
                                    url: resolvedUrl,
                                    name: doc.name || 'Document',
                                    type: doc.type,
                                    customerName: customer.full_name,
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0b4da2] text-xs font-bold transition-colors cursor-pointer border border-blue-200"
                              >
                                <Eye size={13} />
                                <span>Preview</span>
                              </button>
                            )}

                            {resolvedUrl && (
                              <a
                                href={resolvedUrl}
                                download={doc.name || 'document'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors no-underline"
                              >
                                <Download size={13} />
                                <span>Download</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center bg-slate-50/50">
                  <FolderOpen size={48} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="text-base font-extrabold text-slate-800 m-0">
                    No documents attached under &quot;{selectedServiceModal.title}&quot;
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                    When adding or editing customer profiles for <strong>{activeCompany.name}</strong>, select &quot;{selectedServiceModal.title}&quot; in the <strong>&quot;Select Service Card&quot;</strong> dropdown during document upload. Attached files will automatically appear here!
                  </p>
                  <div className="mt-5">
                    <Link
                      href={`/customers?company=${encodeURIComponent(activeCompany.id)}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm no-underline"
                    >
                      <Plus size={15} />
                      <span>Go to Customer Management to Attach Files</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="font-mono text-[11px]">
                Active Service ID: {selectedServiceModal.id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedServiceModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILE PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate m-0">
                  {previewDoc.name}
                </h3>
                {previewDoc.customerName && (
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    Customer: {previewDoc.customerName}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-colors no-underline"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex-1 overflow-auto flex items-center justify-center bg-slate-100 min-h-[350px]">
              {previewDoc.type?.startsWith('image/') ||
              /\.(jpg|jpeg|png|webp|gif)$/i.test(previewDoc.name) ||
              /\.(jpg|jpeg|png|webp|gif)$/i.test(previewDoc.url) ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-md"
                />
              ) : previewDoc.type?.includes('pdf') || /\.pdf$/i.test(previewDoc.name) ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[70vh] rounded-xl border border-slate-300 bg-white"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 max-w-sm">
                  <FileText size={48} className="mx-auto text-blue-600 mb-3" />
                  <h4 className="text-sm font-bold text-slate-900 m-0">Direct File Preview</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    This file format is best viewed or downloaded directly.
                  </p>
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-colors no-underline"
                  >
                    <Download size={14} />
                    <span>Download File ({previewDoc.name})</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#f1f4f8] flex flex-col justify-between text-slate-900">
      <Navbar />

      <Suspense
        fallback={
          <div className="w-full max-w-[1180px] mx-auto py-20 text-center text-slate-500 font-medium">
            Loading employer services...
          </div>
        }
      >
        <ServicesContent />
      </Suspense>
    </main>
  );
}
