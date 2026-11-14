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
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Layers,
  User,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import { Company } from '@/lib/companies';
import {
  getStoredCompanies,
  fetchCompaniesFromBackend,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
  subscribeToServiceChanges,
} from '@/lib/serviceStorage';
import {
  ProgramRecord,
  fetchPrograms,
  getStoredPrograms,
} from '@/lib/programStorage';
import {
  getStoredThemeSettings,
  fetchThemeSettings,
  subscribeToThemeChanges,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
  ServiceCardsAnimationType,
  useDashboardCardDesign,
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

function matchesProgram(
  cust: CustomerRecord,
  selectedProg?: string,
  progsList?: ProgramRecord[]
): boolean {
  if (!selectedProg || selectedProg === 'ALL') return true;
  const target = String(selectedProg).trim().toLowerCase();

  if (cust.program_id && String(cust.program_id).trim().toLowerCase() === target) return true;
  if (cust.program_name && cust.program_name.trim().toLowerCase() === target) return true;

  if (progsList && progsList.length > 0) {
    const matched = progsList.find(
      (p) =>
        String(p.id).toLowerCase() === target ||
        p.name.toLowerCase() === target ||
        (p.code && p.code.toLowerCase() === target)
    );
    if (matched) {
      if (cust.program_id && String(cust.program_id) === String(matched.id)) return true;
      if (cust.program_name && cust.program_name.toLowerCase() === matched.name.toLowerCase()) return true;
      if (matched.code && cust.program_name && cust.program_name.toLowerCase() === matched.code.toLowerCase()) return true;
    }
  }
  return false;
}

function matchesYear(
  cust: CustomerRecord,
  doc?: { issue_date?: string; expire_date?: string; issueDate?: string; expireDate?: string },
  selectedYr?: string
): boolean {
  if (!selectedYr || selectedYr === 'ALL') return true;
  const target = String(selectedYr).trim();

  if (doc) {
    const issue = doc.issue_date || doc.issueDate;
    if (issue && String(issue).startsWith(target)) return true;
    const exp = doc.expire_date || doc.expireDate;
    if (exp && String(exp).startsWith(target)) return true;
  }

  if (cust.created_at && String(cust.created_at).startsWith(target)) return true;
  if (cust.passport_issue_date && String(cust.passport_issue_date).startsWith(target)) return true;
  if (cust.passport_expire_date && String(cust.passport_expire_date).startsWith(target)) return true;

  return false;
}

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');
  const verifiedServiceParam = searchParams.get('verifiedService');
  const programParam = searchParams.get('program') || 'ALL';
  const yearParam = searchParams.get('year') || 'ALL';

  const [selectedProgram, setSelectedProgram] = useState<string>(programParam);
  const [selectedYear, setSelectedYear] = useState<string>(yearParam);

  useEffect(() => {
    setSelectedProgram(searchParams.get('program') || 'ALL');
  }, [searchParams]);

  useEffect(() => {
    setSelectedYear(searchParams.get('year') || 'ALL');
  }, [searchParams]);

  const [allPrograms, setAllPrograms] = useState<ProgramRecord[]>(() => {
    return typeof window !== 'undefined' ? getStoredPrograms() : [];
  });

  useEffect(() => {
    fetchPrograms()
      .then((progs) => {
        if (progs && progs.length > 0) setAllPrograms(progs);
      })
      .catch(() => {});
  }, []);

  const [allCompanies, setAllCompanies] = useState<Company[]>(() => {
    return typeof window !== 'undefined' ? getStoredCompanies() : [];
  });

  useEffect(() => {
    fetchCompaniesFromBackend()
      .then((comps) => {
        if (comps && comps.length > 0) setAllCompanies(comps);
      })
      .catch(() => {});

    const unsubComp = subscribeToCompanyChanges(() => {
      setAllCompanies(getStoredCompanies());
    });
    return unsubComp;
  }, []);

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

    // If Employee, refresh live permissions & assigned_service_cards from backend to ensure real-time accuracy!
    if (user.role === 'Employee' && (user.id || user.employee_code)) {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
      fetch(`${apiBase}/employees/${user.id || user.employee_code}`, {
        headers: { Accept: 'application/json' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh && fresh.id) {
            let freshCards: string[] = ['*'];
            if (Array.isArray(fresh.assigned_service_cards)) {
              freshCards = fresh.assigned_service_cards;
            } else if (typeof fresh.assigned_service_cards === 'string') {
              try {
                const parsed = JSON.parse(fresh.assigned_service_cards);
                if (Array.isArray(parsed)) freshCards = parsed;
                else if (fresh.assigned_service_cards === '*') freshCards = ['*'];
                else freshCards = [fresh.assigned_service_cards];
              } catch {
                freshCards = fresh.assigned_service_cards === '*' ? ['*'] : [fresh.assigned_service_cards];
              }
            } else if (fresh.assigned_service_cards === null || fresh.assigned_service_cards === undefined) {
              freshCards = ['*'];
            }

            const updatedUser: AuthUser = {
              ...user,
              assigned_companies: Array.isArray(fresh.assigned_companies)
                ? fresh.assigned_companies
                : user.assigned_companies,
              assigned_service_cards: freshCards,
              permissions: {
                can_create: fresh.can_create !== undefined ? Boolean(fresh.can_create) : user.permissions.can_create,
                can_edit: fresh.can_edit !== undefined ? Boolean(fresh.can_edit) : user.permissions.can_edit,
                can_delete: fresh.can_delete !== undefined ? Boolean(fresh.can_delete) : user.permissions.can_delete,
              },
            };
            setCurrentUser(updatedUser);
            try {
              localStorage.setItem('portal_current_user', JSON.stringify(updatedUser));
            } catch {}
          }
        })
        .catch(() => {});
    } else if (user.role === 'Customer' && user.id) {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
      fetch(`${apiBase}/customers/${user.id}`, {
        headers: { Accept: 'application/json' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh && fresh.id) {
            let freshCards: string[] = ['*'];
            if (Array.isArray(fresh.assigned_service_cards)) {
              freshCards = fresh.assigned_service_cards;
            } else if (typeof fresh.assigned_service_cards === 'string') {
              try {
                const parsed = JSON.parse(fresh.assigned_service_cards);
                if (Array.isArray(parsed)) freshCards = parsed;
                else if (fresh.assigned_service_cards === '*') freshCards = ['*'];
                else freshCards = [fresh.assigned_service_cards];
              } catch {
                freshCards = fresh.assigned_service_cards === '*' ? ['*'] : [fresh.assigned_service_cards];
              }
            } else if (fresh.assigned_service_cards === null || fresh.assigned_service_cards === undefined) {
              freshCards = ['*'];
            }

            const updatedUser: AuthUser = {
              ...user,
              assigned_companies: fresh.company_id ? [fresh.company_id] : user.assigned_companies,
              assigned_service_cards: freshCards,
            };
            setCurrentUser(updatedUser);
            try {
              localStorage.setItem('portal_current_user', JSON.stringify(updatedUser));
            } catch {}
          }
        })
        .catch(() => {});
    } else if (user.role === 'MasterAdmin' && (user.id || (user as any).username)) {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
      fetch(`${apiBase}/master-admins/${user.id || (user as any).username}`, {
        headers: { Accept: 'application/json' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh && fresh.id) {
            let freshComps: string[] = [];
            if (Array.isArray(fresh.assigned_companies)) {
              freshComps = fresh.assigned_companies;
            } else if (typeof fresh.assigned_companies === 'string') {
              try {
                const parsed = JSON.parse(fresh.assigned_companies);
                if (Array.isArray(parsed)) freshComps = parsed;
                else if (fresh.assigned_companies === '*') freshComps = ['*'];
                else freshComps = [fresh.assigned_companies];
              } catch {
                freshComps = fresh.assigned_companies === '*' ? ['*'] : [fresh.assigned_companies];
              }
            } else if (fresh.assigned_companies === null || fresh.assigned_companies === undefined) {
              freshComps = [];
            }

            const updatedUser: AuthUser = {
              ...user,
              assigned_companies: freshComps.length > 0 ? freshComps : user.assigned_companies,
            };
            setCurrentUser(updatedUser);
            try {
              localStorage.setItem('master_admin_user', JSON.stringify(updatedUser));
              localStorage.setItem('portal_current_user', JSON.stringify(updatedUser));
            } catch {}
          }
        })
        .catch(() => {});
    }

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

  // Card Design Theme (Default or Glassmorphism)
  const cardDesign = useDashboardCardDesign();
  const isGlass = cardDesign === 'glassmorphism';

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
  const [animTriggerKey, setAnimTriggerKey] = useState<number>(0);

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
        setAnimTriggerKey((k) => k + 1);
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
      setAnimTriggerKey((k) => k + 1);
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
  if (companyParam && companyParam.toUpperCase() === 'ALL') {
    targetCompany = {
      id: 'ALL',
      name: 'All Companies (All Employers)',
      roc: 'ALL-ENTITIES',
      sector: 'All Business Sectors',
      description: 'Unified view across all authorized employer companies.',
      logo: '/images/companies/gamuda.svg',
      tag: 'All Companies',
      totalWorkers: allCompanies.reduce((acc, c) => acc + (c.totalWorkers || 0), 0),
    };
  } else if (companyParam) {
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
        if (parsed && (parsed.id === 'ALL' || !isRestrictedRole || hasCompanyAccess(parsed.id, parsed.name, parsed.roc))) {
          targetCompany = parsed.id === 'ALL' ? {
            id: 'ALL',
            name: 'All Companies (All Employers)',
            roc: 'ALL-ENTITIES',
            sector: 'All Business Sectors',
            description: 'Unified view across all authorized employer companies.',
            logo: '/images/companies/gamuda.svg',
            tag: 'All Companies',
            totalWorkers: allCompanies.reduce((acc, c) => acc + (c.totalWorkers || 0), 0),
          } : (allCompanies.find((c) => c.id === parsed.id) || parsed);
        }
      }
    } catch {}
  }

  if (!targetCompany && isRestrictedRole) {
    targetCompany = allCompanies.find((c) => hasCompanyAccess(c.id, c.name, c.roc));
  }

  const activeCompany = targetCompany || (allCompanies.length > 0 ? allCompanies[0] : {
    id: 'ALL',
    name: 'All Companies (All Employers)',
    roc: 'ALL-ENTITIES',
    sector: 'All Business Sectors',
    description: 'Unified view across all authorized employer companies.',
    logo: '/images/companies/gamuda.svg',
    tag: 'All Companies',
    totalWorkers: 1000,
  });

  const hasAccess =
    activeCompany.id === 'ALL' ||
    !isRestrictedRole ||
    hasCompanyAccess(activeCompany.id, activeCompany.name, activeCompany.roc);
  const panelInfo = getUserPanelInfo();

  // Only companies accessible to the user (e.g. Master Admin assigned companies)
  const accessibleCompanies = useMemo(() => {
    const list =
      !currentUser || currentUser.role === 'SUPER_ADMIN'
        ? allCompanies
        : allCompanies.filter((c) => hasCompanyAccess(c.id, c.name, c.roc));

    const seen = new Set<string>();
    const result: Company[] = [];
    for (const comp of list) {
      const key = (comp.id || '').toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(comp);
      }
    }
    return result;
  }, [allCompanies, currentUser]);

  const finalAccessibleCompanies = useMemo(() => {
    if (accessibleCompanies.length === 0 && activeCompany) {
      return [activeCompany];
    }
    if (
      activeCompany &&
      !accessibleCompanies.some((c) => c.id.toLowerCase() === activeCompany.id.toLowerCase())
    ) {
      if (hasCompanyAccess(activeCompany.id, activeCompany.name, activeCompany.roc)) {
        return [activeCompany, ...accessibleCompanies];
      }
    }
    return accessibleCompanies;
  }, [accessibleCompanies, activeCompany]);

  // Dynamically extract available years from customers, documents, and recent year bounds
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
      years.add(String(y));
    }
    companyCustomers.forEach((cust) => {
      if (cust.created_at) {
        const y = cust.created_at.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
      if (cust.passport_issue_date) {
        const y = cust.passport_issue_date.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
      if (cust.passport_expire_date) {
        const y = cust.passport_expire_date.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
      if (Array.isArray(cust.documents)) {
        cust.documents.forEach((d) => {
          if (d.issue_date) {
            const y = d.issue_date.slice(0, 4);
            if (/^\d{4}$/.test(y)) years.add(y);
          }
          if (d.expire_date) {
            const y = d.expire_date.slice(0, 4);
            if (/^\d{4}$/.test(y)) years.add(y);
          }
        });
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [companyCustomers]);

  // Select2 Options for Company Filter
  const companyFilterOptions: Select2Option[] = useMemo(() => {
    const opts: Select2Option[] = [
      {
        value: 'ALL',
        label: 'All Companies',
        subLabel: 'All authorized employer companies',
        badge: `${finalAccessibleCompanies.filter((c) => c.id !== 'ALL').length} Orgs`,
      },
    ];

    finalAccessibleCompanies
      .filter((c) => c.id !== 'ALL')
      .forEach((comp) => {
        opts.push({
          value: comp.id,
          label: comp.name,
          subLabel: comp.sector || comp.roc,
          badge: comp.totalWorkers ? `${comp.totalWorkers.toLocaleString()} workers` : undefined,
        });
      });

    return opts;
  }, [finalAccessibleCompanies]);

  // Select2 Options for Program Filter
  const programFilterOptions: Select2Option[] = useMemo(() => {
    const opts: Select2Option[] = [
      {
        value: 'ALL',
        label: 'All Programs',
        subLabel: 'All government employment clearance programs',
        badge: `${allPrograms.length} Programs`,
      },
    ];

    allPrograms.forEach((prog) => {
      opts.push({
        value: String(prog.id),
        label: prog.name,
        subLabel: prog.description || prog.code,
        badge: prog.code || undefined,
      });
    });

    return opts;
  }, [allPrograms]);

  // Select2 Options for Year Filter
  const yearFilterOptions: Select2Option[] = useMemo(() => {
    const opts: Select2Option[] = [
      {
        value: 'ALL',
        label: 'All Years',
        subLabel: 'All registration & clearance years',
        badge: `${availableYears.length} Years`,
      },
    ];

    availableYears.forEach((yr) => {
      opts.push({
        value: yr,
        label: `Year ${yr}`,
        subLabel: `Clearances & documents for ${yr}`,
      });
    });

    return opts;
  }, [availableYears]);

  const handleCompanyChange = (newCompId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('company', newCompId);
    router.push(`/services?${params.toString()}`);
  };

  const handleProgramChange = (progId: string) => {
    setSelectedProgram(progId);
    const params = new URLSearchParams(searchParams.toString());
    if (progId === 'ALL') {
      params.delete('program');
    } else {
      params.set('program', progId);
    }
    router.push(`/services?${params.toString()}`);
  };

  const handleYearChange = (yr: string) => {
    setSelectedYear(yr);
    const params = new URLSearchParams(searchParams.toString());
    if (yr === 'ALL') {
      params.delete('year');
    } else {
      params.set('year', yr);
    }
    router.push(`/services?${params.toString()}`);
  };

  const handleResetFilters = () => {
    setQuery('');
    setSelectedProgram('ALL');
    setSelectedYear('ALL');
    const params = new URLSearchParams();
    if (activeCompany?.id) {
      params.set('company', activeCompany.id);
    }
    router.push(`/services?${params.toString()}`);
  };

  const getCardHref = (service: ServiceCard) => {
    const isCoreCustomer = service.id === 'customer';
    const isCoreDocDownload = service.id === 'document-download';

    const p = new URLSearchParams();
    p.set('company', activeCompany.id);
    if (!isCoreCustomer && !isCoreDocDownload) {
      p.set('service', service.id);
    }
    if (selectedProgram && selectedProgram !== 'ALL') {
      p.set('program', selectedProgram);
    }
    if (selectedYear && selectedYear !== 'ALL') {
      p.set('year', selectedYear);
    }

    if (isCoreCustomer) {
      return `/customers?${p.toString()}`;
    }
    return `/document-download?${p.toString()}`;
  };

  // Load active company's customers to display documents
  useEffect(() => {
    if (!activeCompany?.id) return;
    if (activeCompany.id === 'ALL') {
      fetchCustomers()
        .then((records) => {
          if (
            isRestrictedRole &&
            currentUser &&
            Array.isArray(currentUser.assigned_companies) &&
            !currentUser.assigned_companies.includes('*')
          ) {
            const allowed = currentUser.assigned_companies.map((a) => a.toLowerCase().trim());
            const filtered = records.filter(
              (r) => r.company_id && allowed.includes(r.company_id.toLowerCase().trim())
            );
            setCompanyCustomers(filtered);
          } else {
            setCompanyCustomers(records);
          }
        })
        .catch(() => {});
    } else {
      fetchCustomers(activeCompany.id)
        .then((records) => {
          setCompanyCustomers(records);
        })
        .catch(() => {});
    }
  }, [activeCompany?.id, isRestrictedRole, currentUser]);

  // Open modal if URL query specifies serviceModal
  useEffect(() => {
    const modalParam = searchParams.get('serviceModal');
    if (modalParam && serviceList.length > 0) {
      const matched = serviceList.find((s) => s.id === modalParam);
      if (matched && matched.id !== 'customer' && matched.id !== 'document-download') {
        if (!currentUser || (currentUser.role !== 'Employee' && currentUser.role !== 'Customer') || hasServiceCardAccess(matched.id, matched.title, currentUser)) {
          setSelectedServiceModal(matched);
        }
      }
    }
  }, [searchParams, serviceList, currentUser]);

  // Compute comma-separated list of sectors for active company
  const companySectorsDisplay = useMemo(() => {
    const list: string[] = [];

    // 1. Check activeCompany.sectors array
    if (activeCompany.sectors && Array.isArray(activeCompany.sectors)) {
      activeCompany.sectors.forEach((s) => {
        const trimmed = String(s).trim();
        if (trimmed && !list.includes(trimmed)) list.push(trimmed);
      });
    }

    // 2. Check activeCompany.sector string (may be comma-separated or JSON string)
    if (activeCompany.sector) {
      const raw = String(activeCompany.sector).trim();
      if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((s) => {
              const trimmed = String(s).trim();
              if (trimmed && !list.includes(trimmed)) list.push(trimmed);
            });
          }
        } catch {}
      } else {
        raw.split(',').forEach((s) => {
          const trimmed = s.trim();
          if (trimmed && !list.includes(trimmed)) list.push(trimmed);
        });
      }
    }

    // 3. Check workingSector from existing customers of this company
    if (companyCustomers && companyCustomers.length > 0) {
      companyCustomers.forEach((cust) => {
        const sec = (cust.working_sector || (cust as any).workingSector)?.trim();
        if (sec && !list.includes(sec)) {
          list.push(sec);
        }
      });
    }

    return list.length > 0 ? list.join(', ') : 'General Services';
  }, [activeCompany, companyCustomers]);

  // Compute document count per service card for the active company (filtered by program & year)
  const activeCompanyDocCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    companyCustomers.forEach((cust) => {
      // 1. Filter by Program
      if (!matchesProgram(cust, selectedProgram, allPrograms)) return;

      if (Array.isArray(cust.documents)) {
        cust.documents.forEach((doc) => {
          // 2. Filter by Year
          if (!matchesYear(cust, doc, selectedYear)) return;

          const docSvcId = (doc.service_id || '').toLowerCase().trim();
          const docSvcName = (doc.service_name || '').toLowerCase().trim();

          serviceList.forEach((s) => {
            const targetId = s.id.toLowerCase().trim();
            const targetTitle = s.title.toLowerCase().trim();

            const isMatch =
              (docSvcId && docSvcId === targetId) ||
              (targetTitle && docSvcName && docSvcName === targetTitle) ||
              (docSvcId && targetTitle && docSvcId === targetTitle) ||
              (targetId && docSvcName && targetId === docSvcName) ||
              (docSvcId && targetId && docSvcId.replace(/-/g, '') === targetId.replace(/-/g, '')) ||
              (docSvcName && targetTitle && docSvcName.replace(/\s+/g, '') === targetTitle.replace(/\s+/g, ''));

            if (isMatch) {
              counts[s.id] = (counts[s.id] || 0) + 1;
            }
          });
        });
      }
    });
    return counts;
  }, [companyCustomers, serviceList, selectedProgram, selectedYear, allPrograms]);

  // Compute documents list matching currently opened service card modal (filtered by program & year)
  const modalDocuments = useMemo(() => {
    if (!selectedServiceModal) return [];
    const q = docSearchQuery.toLowerCase().trim();
    const result: Array<{
      customer: CustomerRecord;
      doc: CustomerDocument;
      docIndex: number;
    }> = [];

    companyCustomers.forEach((cust) => {
      // 1. Filter by Program
      if (!matchesProgram(cust, selectedProgram, allPrograms)) return;

      if (Array.isArray(cust.documents)) {
        cust.documents.forEach((d, idx) => {
          // 2. Filter by Year
          if (!matchesYear(cust, d, selectedYear)) return;

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
  }, [selectedServiceModal, companyCustomers, docSearchQuery, selectedProgram, selectedYear, allPrograms]);

  const allowedServiceList = useMemo(() => {
    if (!currentUser || (currentUser.role !== 'Employee' && currentUser.role !== 'Customer')) {
      return serviceList;
    }
    return serviceList.filter((s) => hasServiceCardAccess(s.id, s.title, currentUser));
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
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Authenticated Employer
                  </span>
                </div>
                <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white m-0">
                  {activeCompany.name}
                </h1>
                <div className="mt-1.5 flex flex-col gap-0.5 text-xs sm:text-sm text-blue-100/90 font-medium">
                  {activeCompany.roc && (
                    <p className="m-0">
                      ROC No: <span className="font-mono font-semibold text-white tracking-wide">{activeCompany.roc}</span>
                    </p>
                  )}
                  <p className="m-0">
                    Sector: <span className="font-semibold text-white">{companySectorsDisplay}</span> • Active Registered Foreign Workers:{' '}
                    <strong className="text-white font-semibold">
                      {activeCompany.totalWorkers.toLocaleString()}
                    </strong>
                  </p>
                </div>
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
                  <span className="text-[10px] bg-slate-950/15 text-slate-950 px-1.5 py-0.5 rounded font-extrabold">
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
      <section className={`py-12 sm:py-16 transition-colors duration-300 ${isGlass ? 'bg-gradient-to-b from-[#f8fafc] via-[#eff6ff]/30 to-[#f8fafc]' : 'bg-[#f7f9fb]'}`} id="services">
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
                    <span className="text-[10px] font-mono bg-emerald-200/90 text-emerald-950 px-2 py-0.5 rounded-full font-bold">
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

          <div className="mb-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link href="/" className="hover:text-blue-600 transition-colors">
                Home
              </Link>
              <ChevronRight size={13} />
              <Link href="/#companies" className="hover:text-blue-600 transition-colors">
                Employers
              </Link>
              <ChevronRight size={13} />
              <span className="text-[#2b74c9] font-bold">
                {activeCompany.name} Services
              </span>
            </div>

            {/* Search and Filters Bar (Company, Program, Year) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search services input */}
              <div
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 w-full lg:w-72 transition-all shadow-xs ${
                  isGlass
                    ? 'bg-white/80 backdrop-blur-md border border-white/80 text-slate-400 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100'
                    : 'bg-white border border-slate-200 text-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
                }`}
              >
                <Search size={18} className="shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search services..."
                  aria-label="Search services"
                  className="border-0 bg-transparent text-slate-800 text-xs outline-none w-full placeholder:text-slate-400 font-medium"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters next to search (Select2 Searchable Dropdowns) */}
              <div className="flex items-center gap-2.5 flex-wrap flex-1 lg:justify-end">
                {/* 1. Company Filter (Select2) */}
                <div className="w-full sm:w-64 md:w-72">
                  <Select2Search
                    options={companyFilterOptions}
                    value={activeCompany.id}
                    onChange={(val) => handleCompanyChange(val)}
                    placeholder="Select Company..."
                    searchPlaceholder="Search company by name, ROC, sector..."
                    icon={<Building2 size={15} className="text-blue-600" />}
                    dropdownWidth="w-[calc(100vw-2rem)] sm:w-[340px] max-w-[360px]"
                    triggerClassName={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer ${
                      isGlass
                        ? 'bg-white/80 backdrop-blur-md border border-white/80 hover:border-sky-400'
                        : 'bg-white border border-slate-200 hover:border-blue-400'
                    }`}
                  />
                </div>

                {/* 2. Program Filter (Select2) */}
                <div className="w-full sm:w-56 md:w-60">
                  <Select2Search
                    options={programFilterOptions}
                    value={selectedProgram}
                    onChange={(val) => handleProgramChange(val)}
                    placeholder="Select Program..."
                    searchPlaceholder="Search program name or code..."
                    icon={<Layers size={15} className="text-indigo-600" />}
                    dropdownAlign="right"
                    dropdownWidth="w-[calc(100vw-2rem)] sm:w-[320px] max-w-[340px]"
                    triggerClassName={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer ${
                      isGlass
                        ? 'bg-white/80 backdrop-blur-md border border-white/80 hover:border-sky-400'
                        : 'bg-white border border-slate-200 hover:border-blue-400'
                    }`}
                  />
                </div>

                {/* 3. Year Filter (Select2) */}
                <div className="w-full sm:w-48 md:w-52">
                  <Select2Search
                    options={yearFilterOptions}
                    value={selectedYear}
                    onChange={(val) => handleYearChange(val)}
                    placeholder="Select Year..."
                    searchPlaceholder="Search year (e.g. 2026)..."
                    icon={<Calendar size={15} className="text-amber-600" />}
                    dropdownAlign="right"
                    dropdownWidth="w-[calc(100vw-2rem)] sm:w-[220px] max-w-[240px]"
                    triggerClassName={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer ${
                      isGlass
                        ? 'bg-white/80 backdrop-blur-md border border-white/80 hover:border-sky-400'
                        : 'bg-white border border-slate-200 hover:border-blue-400'
                    }`}
                  />
                </div>

                {/* Reset Filters button */}
                {(query || activeCompany.id !== 'ALL' || selectedProgram !== 'ALL' || selectedYear !== 'ALL') && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                    title="Reset all filters"
                  >
                    <RefreshCw size={13} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Filter Badges */}
            {(activeCompany.id !== 'ALL' || selectedProgram !== 'ALL' || selectedYear !== 'ALL') && (
              <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                <span className="text-[11px] font-semibold text-slate-500">Active Filters:</span>
                {activeCompany.id !== 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                    <Building2 size={11} />
                    <span>Company: {activeCompany.name}</span>
                    <button
                      type="button"
                      onClick={() => handleCompanyChange('ALL')}
                      className="hover:text-blue-900 cursor-pointer ml-0.5"
                      title="Show All Companies"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedProgram !== 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                    <Layers size={11} />
                    <span>
                      Program: {allPrograms.find((p) => String(p.id) === selectedProgram)?.name || selectedProgram}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleProgramChange('ALL')}
                      className="hover:text-indigo-900 cursor-pointer ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedYear !== 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                    <Calendar size={11} />
                    <span>Year: {selectedYear}</span>
                    <button
                      type="button"
                      onClick={() => handleYearChange('ALL')}
                      className="hover:text-amber-950 cursor-pointer ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}
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

                // Routing:
                // Carries selected Company, Service, Program, and Year to target page
                const cardHref = getCardHref(service);

                const actionText = isCoreCustomer
                  ? 'Open Customers'
                  : isCoreDocDownload
                  ? 'Download Documents'
                  : docCount > 0
                  ? `Download Documents (${docCount})`
                  : 'Download Documents';

                const CardElement = Link;
                const animClass = getServiceCardAnimationClass(cardAnimation, index);

                return (
                  <CardElement
                    href={cardHref}
                    id={`service-card-${index}`}
                    key={`${service.id || service.title}-${cardAnimation}-${animTriggerKey}-${isGlass ? 'glass' : 'default'}`}
                    style={getServiceCardAnimationStyle(index, cardDuration, cardStagger)}
                    className={`service-card-item group relative flex flex-col items-center text-center rounded-[20px] p-8 md:p-9 cursor-pointer min-h-[300px] outline-none font-inherit no-underline select-none transition-all duration-300 ${animClass} ${
                      isGlass
                        ? `dashboard-card-glass ${
                            isCardVerified
                              ? 'ring-2 ring-emerald-400/50 border-emerald-400'
                              : ''
                          }`
                        : `bg-white border shadow-[0_4px_20px_rgba(18,38,70,0.05)] hover:shadow-[0_16px_36px_rgba(18,55,110,0.12)] hover:-translate-y-1.5 ${
                            isCardVerified
                              ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                              : 'border-slate-200/90 hover:border-blue-400'
                          }`
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
                        <h3 className={`text-[17px] font-bold leading-snug m-0 pointer-events-none transition-colors ${
                          isGlass ? 'text-slate-900 group-hover:text-[var(--glass-text-accent,#0284c7)]' : 'text-slate-900 group-hover:text-[#0b4da2]'
                        }`}>
                          {service.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                          {service.tag && (
                            <span className={`inline-block border text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded-full pointer-events-none ${
                              isGlass
                                ? 'bg-sky-500/10 border-sky-400/30 text-sky-700'
                                : 'bg-blue-50 border-blue-200 text-blue-600'
                            }`}>
                              {service.tag}
                            </span>
                          )}
                          {!isCoreCustomer && !isCoreDocDownload && docCount > 0 && (
                            <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full pointer-events-none">
                              <FileText size={10} /> {docCount} Files Attached
                            </span>
                          )}
                          {isCardVerified && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full pointer-events-none">
                              <CheckCircle2 size={10} className="text-emerald-600" /> Active
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`text-[13px] leading-relaxed mt-2.5 max-w-[280px] pointer-events-none ${
                        isGlass ? 'text-slate-600' : 'text-slate-500'
                      }`}>
                        {service.description}
                      </p>
                    </div>

                    {/* Card Action Link */}
                    <div className={`mt-4 pt-3 border-t w-full flex items-center justify-between text-xs pointer-events-none ${
                      isGlass ? 'border-white/50 text-slate-600' : 'border-slate-100 text-slate-500'
                    }`}>
                      <span className={`text-[11px] font-medium ${isGlass ? 'text-slate-500' : 'text-slate-400'}`}>
                        {isCoreCustomer ? 'Official Portal' : 'Download Service Repository'}
                      </span>
                      <span className={`inline-flex items-center gap-1 font-semibold group-hover:translate-x-1 transition-transform ${
                        isGlass ? 'text-[var(--glass-text-accent,#0b4da2)]' : 'text-[#0b4da2]'
                      }`}>
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
              {query
                ? 'No service found matching your search.'
                : 'No service cards currently accessible for your employee profile.'}
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
                    <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold tracking-wider">
                      Service Document Dossier
                    </span>
                    {selectedServiceModal.tag && (
                      <span className="text-xs bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold">
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
