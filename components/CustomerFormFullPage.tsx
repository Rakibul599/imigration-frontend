'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Globe2,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Briefcase,
  BookOpen,
  Edit2,
  Target,
  User,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend, updateStoredCompany } from '@/lib/companyStorage';
import { AgentRecord, fetchAgents, getStoredAgents } from '@/lib/agentStorage';
import { ProgramRecord, fetchPrograms, getStoredPrograms } from '@/lib/programStorage';
import {
  CustomerDocument,
  CustomerRecord,
  WorkingSector,
  createCustomer,
  createWorkingSector,
  fetchCustomerById,
  fetchWorkingSectors,
  getCustomerFromCache,
  getFileUrl,
  updateCustomer,
} from '@/lib/customerStorage';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
} from '@/lib/serviceStorage';
import { getMasterAdminUser, getCurrentUser, getSuperAdminUser, AuthUser } from '@/lib/auth';
import Select2Search, { Select2Option } from '@/components/Select2Search';
import {
  CustomerFinanceBalance,
  TARGET_CATEGORIES,
  PAYMENT_TERMS,
  getStoredCustomerTargets,
  fetchCustomerTargets,
  fetchCustomerDeposits,
  saveCustomerTarget,
  getCustomerFinanceBalance,
} from '@/lib/customerFinanceStorage';

interface CustomerFormFullPageProps {
  portalType: 'superadmin' | 'masteradmin' | 'employee';
  backUrl: string;
  initialMode?: 'create' | 'edit' | 'view';
}

function filterPermittedCompanies(allComps: Company[], portalType: 'superadmin' | 'masteradmin' | 'employee'): Company[] {
  if (portalType === 'superadmin') return allComps;
  if (portalType === 'masteradmin') {
    const user = getMasterAdminUser();
    const allowed = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
    if (allowed.length === 0) return [];
    if (allowed.includes('*')) return allComps;
    return allComps.filter((c) =>
      allowed.some(
        (id) =>
          id.toLowerCase() === c.id.toLowerCase() ||
          id.toLowerCase() === c.name.toLowerCase() ||
          (c.roc && id.toLowerCase() === c.roc.toLowerCase())
      )
    );
  }
  if (portalType === 'employee') {
    const user = getCurrentUser();
    const allowed = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
    if (allowed.length === 0) return [];
    if (allowed.includes('*')) return allComps;
    return allComps.filter((c) =>
      allowed.some(
        (id) =>
          id.toLowerCase() === c.id.toLowerCase() ||
          id.toLowerCase() === c.name.toLowerCase() ||
          (c.roc && id.toLowerCase() === c.roc.toLowerCase())
      )
    );
  }
  return allComps;
}

function CustomerFormContent({ portalType, backUrl, initialMode }: CustomerFormFullPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditing = Boolean(editId);
  const isViewMode = initialMode === 'view' || searchParams.get('mode') === 'view';

  // Synchronous cache-first state initialization for 0ms instant page opening
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window === 'undefined') return [];
    return filterPermittedCompanies(getStoredCompanies(), portalType);
  });

  const [sectors, setSectors] = useState<WorkingSector[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('agency_working_sectors_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [
      { id: 1, name: 'Construction & Infrastructure' },
      { id: 2, name: 'Manufacturing & Factory' },
      { id: 3, name: 'Plantation & Agriculture' },
      { id: 4, name: 'Services & Cleaning' },
      { id: 5, name: 'Engineering & Technical' },
      { id: 6, name: 'Hospitality & Tourism' },
      { id: 7, name: 'Logistics & Warehousing' },
    ];
  });

  const [isLoadingCustomer, setIsLoadingCustomer] = useState(() => {
    if (!editId) return false;
    // If found in local cache, no loading delay needed!
    if (typeof window !== 'undefined' && getCustomerFromCache(editId)) {
      return false;
    }
    return Boolean(editId);
  });

  // Form states strictly matching user requirements
  const [fullName, setFullName] = useState('');
  const [companyId, setCompanyId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const initialComps = filterPermittedCompanies(getStoredCompanies(), portalType);
    return initialComps[0]?.id || '';
  });
  const [agents, setAgents] = useState<AgentRecord[]>(() => {
    return typeof window !== 'undefined' ? getStoredAgents() : [];
  });
  const [agentId, setAgentId] = useState<string>('');
  const [programs, setPrograms] = useState<ProgramRecord[]>(() => {
    return typeof window !== 'undefined' ? getStoredPrograms() : [];
  });
  const [programId, setProgramId] = useState<string>('');
  const [passportNo, setPassportNo] = useState('');
  const [passportFile, setPassportFile] = useState<string>('');
  const [nidNo, setNidNo] = useState('');
  const [nidFile, setNidFile] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [passportIssueDate, setPassportIssueDate] = useState('');
  const [passportExpireDate, setPassportExpireDate] = useState('');
  const [leavingAddress, setLeavingAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [workingSector, setWorkingSector] = useState('');
  const [workingAddress, setWorkingAddress] = useState('');
  const [basicSalary, setBasicSalary] = useState('RM 2,500');
  const [overtime, setOvertime] = useState('RM 15.00 / hr'); // OT(Over time)
  const [otherCompanyName, setOtherCompanyName] = useState('');
  const [otherCompanyBossPhone, setOtherCompanyBossPhone] = useState('');
  const [otherCompanyAddress, setOtherCompanyAddress] = useState('');
  const [profilePic, setProfilePic] = useState<string>('');
  const [profilePicName, setProfilePicName] = useState('');
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [status, setStatus] = useState<'active' | 'pending' | 'inactive' | 'absent'>('active');

  // Target Amount states
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [targetCategory, setTargetCategory] = useState<string>(TARGET_CATEGORIES[0]);
  const [targetDate, setTargetDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [targetTerms, setTargetTerms] = useState<string>(PAYMENT_TERMS[0]);
  const [targetStatus, setTargetStatus] = useState<'In Progress' | 'Achieved' | 'On Hold' | 'Cancelled'>('In Progress');
  const [targetRemarks, setTargetRemarks] = useState<string>('');
  const [existingTargetId, setExistingTargetId] = useState<string | number | null>(null);
  const [existingTargetCreatedAt, setExistingTargetCreatedAt] = useState<string | null>(null);
  const [customerBalance, setCustomerBalance] = useState<CustomerFinanceBalance | null>(null);

  // Service cards for tagging uploaded documents & foreign worker portal clearance
  const [availableServices, setAvailableServices] = useState<ServiceCard[]>(() => {
    return typeof window !== 'undefined' ? getStoredServices() : [];
  });

  // Customer Login Access & Clearances
  const [canLogin, setCanLogin] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [customerAssignedCards, setCustomerAssignedCards] = useState<string[]>(['*']);

  const isAllCustomerServicesSelected =
    customerAssignedCards.includes('*') ||
    (availableServices.length > 0 &&
      availableServices.every((s) => customerAssignedCards.includes(s.id)));

  const handleToggleAllCustomerServices = () => {
    if (isAllCustomerServicesSelected) {
      setCustomerAssignedCards([]);
    } else {
      setCustomerAssignedCards(['*']);
    }
  };

  const handleToggleCustomerServiceCard = (cardId: string) => {
    if (customerAssignedCards.includes('*')) {
      const allIds = availableServices.map((s) => s.id);
      setCustomerAssignedCards(allIds.filter((id) => id !== cardId));
      return;
    }

    setCustomerAssignedCards((prev) => {
      const exists = prev.includes(cardId);
      if (exists) {
        return prev.filter((id) => id !== cardId);
      } else {
        const next = [...prev, cardId];
        if (availableServices.length > 0 && next.length >= availableServices.length) {
          return ['*'];
        }
        return next;
      }
    });
  };

  const isCustomerCardChecked = (cardId: string) => {
    return customerAssignedCards.includes('*') || customerAssignedCards.includes(cardId);
  };

  const selectableServices = useMemo(() => {
    return availableServices.filter(
      (s) => s.id !== 'customer' && s.id !== 'document-download'
    );
  }, [availableServices]);

  // Sector management states
  const [isAddingNewSector, setIsAddingNewSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [isSavingSector, setIsSavingSector] = useState(false);

  // UI feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadedCustomer, setLoadedCustomer] = useState<CustomerRecord | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (portalType === 'employee') {
        setCurrentUser(getCurrentUser());
      } else if (portalType === 'masteradmin') {
        setCurrentUser(getMasterAdminUser());
      } else {
        setCurrentUser(getSuperAdminUser());
      }
    }
  }, [portalType]);

  const canView = useMemo(() => {
    if (portalType !== 'employee') return true;
    if (!currentUser) return true;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'Admin' || currentUser.role === 'MasterAdmin') return true;
    return currentUser.module_permissions?.customers?.view !== false;
  }, [portalType, currentUser]);

  const canEdit = useMemo(() => {
    if (portalType !== 'employee') return true;
    if (!currentUser) return true;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'Admin' || currentUser.role === 'MasterAdmin') return true;
    return Boolean(currentUser.module_permissions?.customers?.edit);
  }, [portalType, currentUser]);

  const canCreate = useMemo(() => {
    if (portalType !== 'employee') return true;
    if (!currentUser) return true;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'Admin' || currentUser.role === 'MasterAdmin') return true;
    return Boolean(currentUser.module_permissions?.customers?.create);
  }, [portalType, currentUser]);

  const canManageTarget = useMemo(() => {
    if (portalType !== 'employee') return true;
    if (!currentUser) return true;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'Admin' || currentUser.role === 'MasterAdmin') return true;
    return currentUser.module_permissions?.customers?.target_amount !== false;
  }, [portalType, currentUser]);

  const effectiveIsViewMode = isViewMode || (portalType === 'employee' && isEditing && !canEdit);

  const editBaseUrl =
    portalType === 'superadmin'
      ? '/superadmin/customers/create'
      : portalType === 'masteradmin'
      ? '/masteradmin/customers/create'
      : '/employee/customers/create';

  const profilePicInputRef = useRef<HTMLInputElement | null>(null);

  // Background refresh of companies & sectors (non-blocking)
  useEffect(() => {
    let isMounted = true;
    async function refreshBackgroundData() {
      try {
        const [allComps, secList, svcList, agentList, progList] = await Promise.all([
          fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
          fetchWorkingSectors(),
          fetchServiceCards().catch(() => getStoredServices()),
          fetchAgents().catch(() => getStoredAgents()),
          fetchPrograms().catch(() => getStoredPrograms()),
        ]);

        if (!isMounted) return;
        const permitted = filterPermittedCompanies(allComps, portalType);
        setCompanies(permitted);
        setSectors(secList);
        if (Array.isArray(agentList)) {
          setAgents(agentList);
        }
        if (Array.isArray(progList)) {
          setPrograms(progList);
        }
        if (svcList && svcList.length > 0) {
          setAvailableServices(svcList);
        }

        const defaultCompId = permitted[0]?.id || '';
        setCompanyId((prev) => {
          if (prev && permitted.some((c) => c.id.toLowerCase() === prev.toLowerCase())) {
            return prev;
          }
          return defaultCompId;
        });

        const activeComp = permitted.find((c) => c.id.toLowerCase() === defaultCompId.toLowerCase());
        setWorkingSector((prev) => prev || activeComp?.sector || secList[0]?.name || '');
      } catch (err) {
        console.error('Background initialization error:', err);
      }
    }
    refreshBackgroundData();
    return () => {
      isMounted = false;
    };
  }, [portalType]);

  const populateCustomerFields = (cust: CustomerRecord) => {
    setLoadedCustomer(cust);
    setFullName(cust.full_name || '');
    if (cust.company_id) {
      setCompanyId(cust.company_id);
    }
    if (cust.agent_id) {
      setAgentId(String(cust.agent_id));
    }
    if (cust.program_id) {
      setProgramId(String(cust.program_id));
    }
    setPassportNo(cust.passport_no || '');
    setPassportFile(cust.passport_file || '');
    setNidNo(cust.nid_no || '');
    setNidFile(cust.nid_file || '');
    setDateOfBirth(cust.date_of_birth || '');
    setCountry(cust.country || 'Bangladesh');
    setPassportIssueDate(cust.passport_issue_date || '');
    setPassportExpireDate(cust.passport_expire_date || '');
    setLeavingAddress(cust.leaving_address || '');
    setPhone(cust.phone || cust.worker_phone || '');
    setEmail(cust.email || '');
    setWorkingSector(cust.working_sector || '');
    setWorkingAddress(cust.working_address || '');
    setBasicSalary(cust.basic_salary || 'RM 2,500');
    setOvertime(cust.overtime || 'RM 15.00 / hr');
    setOtherCompanyName(cust.other_company_name || '');
    setOtherCompanyBossPhone(cust.other_company_boss_phone || '');
    setOtherCompanyAddress(cust.other_company_address || '');
    setProfilePic(cust.profile_pic || cust.profile_image || '');
    setProfilePicName(cust.profile_pic || cust.profile_image ? 'Existing Profile Image' : '');
    setDocuments(Array.isArray(cust.documents) ? cust.documents : []);
    setStatus(cust.status || 'active');
    setCanLogin(Boolean(cust.can_login));
    setLoginUsername(cust.username || '');
    setLoginPassword(cust.plain_password || cust.password || 'password123');
    if (Array.isArray(cust.assigned_service_cards)) {
      setCustomerAssignedCards(cust.assigned_service_cards);
    } else {
      setCustomerAssignedCards(['*']);
    }
  };

  // Load customer if editing (immediate from cache, then background fetch)
  useEffect(() => {
    if (!editId) return;

    const cached = getCustomerFromCache(editId);
    if (cached) {
      populateCustomerFields(cached);
      setIsLoadingCustomer(false);
    } else {
      setIsLoadingCustomer(true);
    }

    fetchCustomerById(editId)
      .then((cust) => {
        if (cust) {
          populateCustomerFields(cust);
        }
      })
      .catch((err) => {
        if (!cached) {
          setFeedback({ type: 'error', message: 'Failed to load customer profile.' });
        }
      })
      .finally(() => {
        setIsLoadingCustomer(false);
      });
  }, [editId]);

  // Load customer target amount and ledger balance if editing
  useEffect(() => {
    if (!editId) return;

    const refreshBalance = () => {
      const bal = getCustomerFinanceBalance(editId);
      if (bal) setCustomerBalance(bal);
    };

    try {
      const localTargets = getStoredCustomerTargets();
      const foundLocal = localTargets.find((t) => String(t.customer_id) === String(editId));
      if (foundLocal) {
        setExistingTargetId(foundLocal.id);
        setTargetAmount(foundLocal.target_amount);
        if (foundLocal.target_category) setTargetCategory(foundLocal.target_category);
        if (foundLocal.target_date) setTargetDate(foundLocal.target_date);
        if (foundLocal.payment_terms) setTargetTerms(foundLocal.payment_terms);
        if (foundLocal.status) setTargetStatus(foundLocal.status);
        if (foundLocal.remarks) setTargetRemarks(foundLocal.remarks);
        if (foundLocal.created_at) setExistingTargetCreatedAt(foundLocal.created_at);
      }
      refreshBalance();
    } catch {}

    Promise.all([
      fetchCustomerTargets().catch(() => []),
      fetchCustomerDeposits().catch(() => []),
    ])
      .then(([targetList]) => {
        if (Array.isArray(targetList)) {
          const found = targetList.find((t) => String(t.customer_id) === String(editId));
          if (found) {
            setExistingTargetId(found.id);
            setTargetAmount(found.target_amount);
            if (found.target_category) setTargetCategory(found.target_category);
            if (found.target_date) setTargetDate(found.target_date);
            if (found.payment_terms) setTargetTerms(found.payment_terms);
            if (found.status) setTargetStatus(found.status);
            if (found.remarks) setTargetRemarks(found.remarks);
            if (found.created_at) setExistingTargetCreatedAt(found.created_at);
          }
        }
        refreshBalance();
      })
      .catch(() => {});

    const updateListener = () => refreshBalance();
    window.addEventListener('customerTargetsUpdated', updateListener);
    window.addEventListener('customerDepositsUpdated', updateListener);
    window.addEventListener('customerPendingsUpdated', updateListener);
    return () => {
      window.removeEventListener('customerTargetsUpdated', updateListener);
      window.removeEventListener('customerDepositsUpdated', updateListener);
      window.removeEventListener('customerPendingsUpdated', updateListener);
    };
  }, [editId]);

  // Dynamic live financial calculation for Target Amount
  const liveFinancialCalculation = useMemo(() => {
    const inputTarget = targetAmount === '' ? 0 : Number(targetAmount) || 0;
    const totalDeposited = customerBalance ? Number(customerBalance.total_deposited) || 0 : 0;

    // In case this customer has other targets established
    const existingTargetObj = existingTargetId
      ? getStoredCustomerTargets().find((t) => String(t.id) === String(existingTargetId))
      : null;
    const oldTargetAmt = existingTargetObj ? Number(existingTargetObj.target_amount) || 0 : 0;
    const otherTargetsTotal = Math.max(0, (customerBalance?.total_target || 0) - oldTargetAmt);

    const calculatedTotalTarget = otherTargetsTotal + inputTarget;
    const calculatedPending = Math.max(0, calculatedTotalTarget - totalDeposited);
    const progressPercent =
      calculatedTotalTarget > 0
        ? Math.min(100, Math.round((totalDeposited / calculatedTotalTarget) * 100))
        : 0;

    let status: 'Pending' | 'Partially Paid' | 'Settled' = 'Pending';
    if (calculatedTotalTarget > 0 && totalDeposited >= calculatedTotalTarget) {
      status = 'Settled';
    } else if (totalDeposited > 0) {
      status = 'Partially Paid';
    }

    return {
      inputTarget,
      totalDeposited,
      calculatedTotalTarget,
      calculatedPending,
      progressPercent,
      status,
      hasFinancialData: calculatedTotalTarget > 0 || totalDeposited > 0,
    };
  }, [targetAmount, customerBalance, existingTargetId]);

  // Select2 options for employer companies
  const companyOptions: Select2Option[] = useMemo(() => {
    return companies.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: `${c.sector || 'Employer'} • ROC: ${c.roc || 'Verified'}`,
      badge: c.tag || 'Verified',
    }));
  }, [companies]);

  // Select2 options for recruitment agents
  const agentOptions: Select2Option[] = useMemo(() => {
    return [
      {
        value: '',
        label: 'No Agent / Direct Recruitment',
        subLabel: 'Self-applied / Direct onboarding',
        badge: 'Direct',
      },
      ...agents.map((a) => ({
        value: String(a.id),
        label: a.name,
        subLabel: a.phone ? `Phone: ${a.phone}` : 'No phone recorded',
        badge: a.notes ? 'With Note' : 'Agent',
      })),
    ];
  }, [agents]);

  // Select2 options for programs
  const programOptions: Select2Option[] = useMemo(() => {
    return [
      {
        value: '',
        label: 'No Program (General / Unassigned)',
        subLabel: 'Standard foreign worker deployment',
        badge: 'General',
      },
      ...programs.map((p) => ({
        value: String(p.id),
        label: `${p.name}${p.code ? ` (${p.code})` : ''}`,
        subLabel: [p.category, p.duration, p.fees ? `Fee: RM ${p.fees}` : null].filter(Boolean).join(' • ') || 'Standard program',
        badge: p.status === 'active' ? 'Active' : p.status,
      })),
    ];
  }, [programs]);

  // File Upload Helper
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setProfilePic(dataUrl);
      setProfilePicName(file.name);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to process profile image.' });
    }
  };

  // Add Document row to multiple documents list
  const handleAddDocumentRow = () => {
    setDocuments((prev) => [
      ...prev,
      {
        name: '',
        issue_date: '',
        expire_date: '',
        url: '',
        dataUrl: '',
        size: '',
        type: 'application/pdf',
        service_id: '',
        service_name: '',
      },
    ]);
  };

  const handleDocumentFieldChange = (
    index: number,
    field: keyof CustomerDocument,
    value: string
  ) => {
    setDocuments((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
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
      };
      return copy;
    });
  };

  const handleDocumentFileChange = async (index: number, file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const sizeStr =
        file.size < 1024 * 1024
          ? `${Math.round(file.size / 1024)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      setDocuments((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          url: dataUrl,
          dataUrl,
          size: sizeStr,
          type: file.type || 'application/pdf',
          name: copy[index].name || file.name,
        };
        return copy;
      });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to read document attachment.' });
    }
  };

  const handleRemoveDocumentRow = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Add new working sector to backend & selected company
  const handleAddNewSector = async () => {
    if (!newSectorName.trim()) return;
    setIsSavingSector(true);
    try {
      const created = await createWorkingSector(newSectorName.trim());
      setSectors((prev) => [...prev, created]);
      const addedName = created.name;

      if (companyId) {
        const comp = companies.find((c) => c.id.toLowerCase() === companyId.toLowerCase());
        if (comp) {
          const currentSectors = comp.sectors && Array.isArray(comp.sectors)
            ? [...comp.sectors]
            : (comp.sector ? comp.sector.split(',').map((s) => s.trim()).filter(Boolean) : []);
          if (!currentSectors.includes(addedName)) {
            currentSectors.push(addedName);
            comp.sectors = currentSectors;
            comp.sector = currentSectors.join(', ');
            updateStoredCompany(comp).catch(() => {});
          }
        }
      }

      setWorkingSector(addedName);
      setNewSectorName('');
      setIsAddingNewSector(false);
      setFeedback({ type: 'success', message: `New sector "${addedName}" created and assigned to selected company!` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create sector.' });
    } finally {
      setIsSavingSector(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !nidNo.trim()) {
      setFeedback({ type: 'error', message: 'Full Name and NID No. are required.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const selectedAgent = agents.find((a) => String(a.id) === agentId);
    const selectedProgram = programs.find((p) => String(p.id) === programId);
    const payload: Partial<CustomerRecord> = {
      full_name: fullName.trim(),
      company_id: companyId || (companies[0]?.id || ''),
      agent_id: agentId || undefined,
      agent_name: selectedAgent ? selectedAgent.name : undefined,
      program_id: programId || undefined,
      program_name: selectedProgram ? selectedProgram.name : undefined,
      passport_no: passportNo.trim(),
      passport_file: passportFile,
      nid_no: nidNo.trim(),
      nid_file: nidFile,
      date_of_birth: dateOfBirth,
      country: country.trim(),
      passport_issue_date: passportIssueDate,
      passport_expire_date: passportExpireDate,
      leaving_address: leavingAddress.trim(),
      phone: phone.trim(),
      email: email.trim(),
      working_sector: workingSector.trim(),
      working_address: workingAddress.trim(),
      basic_salary:
        portalType === 'employee'
          ? (isEditing && loadedCustomer?.basic_salary ? loadedCustomer.basic_salary : '')
          : basicSalary.trim(),
      overtime:
        portalType === 'employee'
          ? (isEditing && loadedCustomer?.overtime ? loadedCustomer.overtime : '')
          : overtime.trim(),
      other_company_name: otherCompanyName.trim() || undefined,
      other_company_boss_phone: otherCompanyBossPhone.trim() || undefined,
      other_company_address: otherCompanyAddress.trim() || undefined,
      profile_pic: profilePic,
      profile_image: profilePic,
      documents: documents.map((doc) => ({
        ...doc,
        issue_date: doc.issue_date && doc.issue_date.trim() ? doc.issue_date.trim() : null as any,
        expire_date: doc.expire_date && doc.expire_date.trim() ? doc.expire_date.trim() : null as any,
      })),
      role: 'Worker',
      status: status,
      can_login: canLogin,
      username: canLogin ? loginUsername.trim() : undefined,
      password: canLogin ? loginPassword : undefined,
      assigned_service_cards: canLogin ? customerAssignedCards : undefined,
    };

    try {
      if (isEditing && editId) {
        await updateCustomer(editId, payload);
        if (canManageTarget && targetAmount !== '' && Number(targetAmount) >= 0) {
          try {
            await saveCustomerTarget({
              id: existingTargetId || `target_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              customer_id: editId,
              customer_name: fullName.trim(),
              passport_no: passportNo.trim(),
              nid_no: nidNo.trim(),
              company_id: companyId || undefined,
              company_name: companies.find((c) => c.id === companyId)?.name || companyId || undefined,
              target_amount: Number(targetAmount),
              target_category: targetCategory,
              target_date: targetDate || undefined,
              quota_workers_count: 1,
              payment_terms: targetTerms,
              status: targetStatus,
              remarks: targetRemarks.trim(),
              created_at: existingTargetCreatedAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          } catch (tErr) {
            console.warn('Failed to update target amount:', tErr);
          }
        }
        setFeedback({ type: 'success', message: 'Customer record updated successfully!' });
      } else {
        const created = await createCustomer(payload);
        if (created && created.id && canManageTarget && targetAmount !== '' && Number(targetAmount) > 0) {
          try {
            await saveCustomerTarget({
              id: `target_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              customer_id: created.id,
              customer_name: created.full_name || fullName.trim(),
              passport_no: created.passport_no || passportNo.trim(),
              nid_no: created.nid_no || nidNo.trim(),
              company_id: created.company_id || companyId || undefined,
              company_name: companies.find((c) => c.id === companyId)?.name || created.company_id || undefined,
              target_amount: Number(targetAmount),
              target_category: targetCategory,
              target_date: targetDate || undefined,
              quota_workers_count: 1,
              payment_terms: targetTerms,
              status: targetStatus,
              remarks: targetRemarks.trim(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          } catch (tErr) {
            console.warn('Failed to save initial target amount:', tErr);
          }
        }
        setFeedback({ type: 'success', message: 'Customer profile registered successfully!' });
      }

      setTimeout(() => {
        router.push(backUrl);
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save customer profile.' });
      setIsSubmitting(false);
    }
  };

  if (isLoadingCustomer) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading customer record...</span>
        </div>
      </div>
    );
  }

  if (portalType === 'employee' && currentUser && !canView) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-red-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 m-0">Access Denied</h2>
          <p className="text-xs text-slate-500 mt-1 m-0">
            You do not have clearance to view customer records.
          </p>
        </div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors no-underline"
        >
          <ArrowLeft size={14} />
          <span>Return to Staff Portal</span>
        </Link>
      </div>
    );
  }

  if (portalType === 'employee' && currentUser && !isEditing && !effectiveIsViewMode && !canCreate) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-amber-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 m-0">Registration Clearance Required</h2>
          <p className="text-xs text-slate-500 mt-1 m-0">
            You do not have permission to register new customer profiles.
          </p>
        </div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors no-underline"
        >
          <ArrowLeft size={14} />
          <span>Back to Customer Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0b4da2] transition-colors no-underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Customer Directory</span>
        </Link>

        <span className="text-xs text-slate-400 font-mono">
          {portalType === 'superadmin'
            ? 'Super Admin Module'
            : portalType === 'masteradmin'
            ? 'Master Admin Scope'
            : 'Staff Desk Scope'}
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              {effectiveIsViewMode ? (
                <>
                  <Eye size={12} className="text-yellow-400" />
                  <span>Customer Profile Dossier (View Mode)</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={12} className="text-yellow-400" />
                  <span>Full Page Registry Form</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0">
              {effectiveIsViewMode
                ? `Customer Dossier: ${fullName || 'Worker Profile'}`
                : isEditing
                ? `Edit Customer Profile: ${fullName}`
                : 'Register New Customer Profile'}
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              {effectiveIsViewMode
                ? 'Read-only detailed overview of foreign worker credentials, passport and NID records, sponsor details, working sector, and uploaded document dossiers.'
                : 'Complete foreign worker biometrics, passport documentation, NID records, living address, working sectors, and multi-file document dossiers.'}
            </p>
          </div>
          {effectiveIsViewMode && canEdit && editId && (
            <Link
              href={`${editBaseUrl}?id=${editId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0b4da2] hover:bg-blue-50 text-xs font-bold transition-all shadow-sm no-underline shrink-0 self-start sm:self-auto"
            >
              <Edit2 size={15} />
              <span>Edit Profile</span>
            </Link>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 bg-transparent border-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Full Page Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image Upload Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Camera size={15} className="text-[#0b4da2]" />
            <span>Customer Profile Image / Worker Photograph</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-xs flex items-center justify-center relative">
                {profilePic ? (
                  <img
                    src={getFileUrl(profilePic)}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                    <User size={36} className="text-slate-300" />
                    <span className="text-[10px] font-semibold text-slate-400">No Photo</span>
                  </div>
                )}
              </div>
              {profilePic && !effectiveIsViewMode && (
                <button
                  type="button"
                  onClick={() => {
                    setProfilePic('');
                    setProfilePicName('');
                    if (profilePicInputRef.current) profilePicInputRef.current.value = '';
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer border-2 border-white"
                  title="Remove Profile Image"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {!effectiveIsViewMode && (
                  <>
                    <input
                      type="file"
                      ref={profilePicInputRef}
                      accept="image/*"
                      onChange={handleProfilePicUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => profilePicInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer border-0"
                    >
                      <Upload size={14} />
                      <span>{profilePic ? 'Change Profile Image' : 'Upload Profile Image'}</span>
                    </button>

                    {profilePic && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePic('');
                          setProfilePicName('');
                          if (profilePicInputRef.current) profilePicInputRef.current.value = '';
                        }}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer border border-rose-200 bg-white"
                      >
                        <Trash2 size={13} />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </>
                )}

                {effectiveIsViewMode && profilePic && (
                  <a
                    href={getFileUrl(profilePic)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#0b4da2] hover:underline font-bold px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 no-underline"
                  >
                    <Eye size={13} />
                    <span>View Full Photograph</span>
                  </a>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed m-0">
                Official biometric portrait photograph of the customer / foreign worker. Recommended format: Square JPG, PNG, or WebP up to 5MB.
              </p>
              {profilePicName && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <Check size={12} className="text-emerald-600" />
                  <span>{profilePicName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 1: Identity & Employer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User size={15} className="text-[#0b4da2]" />
            <span>Personal Identity &amp; Employer Assignment</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Customer / Worker Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={effectiveIsViewMode}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Mohammad Rafiqul Islam"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Assigned Employer Company <span className="text-red-500">*</span>
              </label>
              <Select2Search
                options={companyOptions}
                value={companyId}
                disabled={effectiveIsViewMode}
                onChange={(val) => {
                  setCompanyId(val);
                  const matched = companies.find((c) => c.id.toLowerCase() === val.toLowerCase());
                  const compSectors: string[] = [];
                  if (matched?.sectors && Array.isArray(matched.sectors)) {
                    matched.sectors.forEach((s) => {
                      const trimmed = s.trim();
                      if (trimmed && !compSectors.includes(trimmed)) compSectors.push(trimmed);
                    });
                  }
                  if (matched?.sector) {
                    matched.sector.split(',').forEach((s) => {
                      const trimmed = s.trim();
                      if (trimmed && !compSectors.includes(trimmed)) compSectors.push(trimmed);
                    });
                  }
                  if (compSectors.length > 0) {
                    setWorkingSector(compSectors[0]);
                  } else {
                    setWorkingSector('');
                  }
                }}
                placeholder="Search & select employer company..."
                searchPlaceholder="Type company name, ROC or sector..."
                icon={<Building2 size={15} className="text-slate-400" />}
              />
              {portalType === 'masteradmin' && (
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-blue-700 font-medium">
                    {companies.length > 0
                      ? `Showing ${companies.length} permitted ${companies.length === 1 ? 'company' : 'companies'}`
                      : 'No company access assigned.'}
                  </span>
                  {companies.length > 1 && (
                    <span className="text-slate-400">Searchable Select2</span>
                  )}
                </div>
              )}
            </div>

            {/* Select Recruitment Agent - Placed below Assigned Employer Company */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Select Recruitment Agent
              </label>
              <Select2Search
                options={agentOptions}
                value={agentId}
                disabled={effectiveIsViewMode}
                onChange={(val) => setAgentId(val)}
                placeholder="Search & select recruitment agent..."
                searchPlaceholder="Type agent name, phone or note..."
                icon={<Briefcase size={15} className="text-slate-400" />}
              />
              {agentId ? (
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-blue-700 font-medium truncate">
                    Selected Agent: <strong className="font-semibold text-slate-800">{agents.find((a) => String(a.id) === agentId)?.name}</strong>
                  </span>
                  {agents.find((a) => String(a.id) === agentId)?.phone && (
                    <span className="font-mono text-slate-600 shrink-0">
                      {agents.find((a) => String(a.id) === agentId)?.phone}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 text-[11px] text-slate-400">
                  Optional: Associate this foreign worker with a recruitment agent
                </div>
              )}
            </div>

            {/* Select Program - Placed directly below Select Recruitment Agent */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Select Program
                </label>
                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Program Scheme
                </span>
              </div>
              <Select2Search
                options={programOptions}
                value={programId}
                disabled={effectiveIsViewMode}
                onChange={(val) => setProgramId(val)}
                placeholder="Search & select recruitment program..."
                searchPlaceholder="Type program name, code or category..."
                icon={<BookOpen size={15} className="text-slate-400" />}
              />
              {programId ? (
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-indigo-700 font-medium truncate">
                    Selected Program: <strong className="font-semibold text-slate-800">{programs.find((p) => String(p.id) === programId)?.name}</strong>
                  </span>
                  {programs.find((p) => String(p.id) === programId)?.code && (
                    <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] shrink-0 font-semibold">
                      {programs.find((p) => String(p.id) === programId)?.code}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 text-[11px] text-slate-400">
                  Optional: Select a specific foreign worker recruitment / deployment program
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Passport & National Identity (NID) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileCheck2 size={15} className="text-[#0b4da2]" />
            <span>Passport &amp; National Identity (NID)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Passport Number
              </label>
              <input
                type="text"
                disabled={effectiveIsViewMode}
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value)}
                placeholder="e.g. A01234567"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                National ID (NID / IC No.) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={effectiveIsViewMode}
                value={nidNo}
                onChange={(e) => setNidNo(e.target.value)}
                placeholder="e.g. 1988269123456"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
              />
            </div>
          </div>

          {/* Dates & Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                disabled={effectiveIsViewMode}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Origin Country
              </label>
              <input
                type="text"
                disabled={effectiveIsViewMode}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Bangladesh, Indonesia"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Contact & Leaving Address */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone size={15} className="text-[#0b4da2]" />
            <span>Contact Information &amp; Leaving Address</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  disabled={effectiveIsViewMode}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+60 12-345 6789"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  disabled={effectiveIsViewMode}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="worker@agency.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Leaving Address / Living Address
            </label>
            <textarea
              rows={2}
              disabled={effectiveIsViewMode}
              value={leavingAddress}
              onChange={(e) => setLeavingAddress(e.target.value)}
              placeholder="Enter worker's residential living address in home country or current location..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
            />
          </div>
        </div>

        {/* Card 4: Working Sector & (Optional for Employee) Salary & OT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-[#0b4da2]" />
              <span>
                {portalType === 'employee'
                  ? 'Working Sector & Official Worksite'
                  : 'Working Sector, Basic Salary & OT(Over time)'}
              </span>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold">Admin Panel Manageable Sectors</span>
          </div>

          {/* Working Sector (with admin panel ability to add new sector) */}
          <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Working Sector <span className="text-red-500">*</span>
              </label>
              {!effectiveIsViewMode && portalType !== 'employee' && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewSector(!isAddingNewSector)}
                  className="text-xs font-bold text-[#0b4da2] hover:text-[#072a6b] hover:underline inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{isAddingNewSector ? 'Cancel' : '+ Add New Sector'}</span>
                </button>
              )}
            </div>

            {/* Inline Add New Sector Form */}
            {isAddingNewSector && !effectiveIsViewMode && (
              <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-blue-300 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={newSectorName}
                  onChange={(e) => setNewSectorName(e.target.value)}
                  placeholder="Enter new sector name (e.g. Oil & Gas, Security Services)..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
                <button
                  type="button"
                  disabled={isSavingSector || !newSectorName.trim()}
                  onClick={handleAddNewSector}
                  className="px-3.5 py-1.5 bg-[#0b4da2] text-white rounded-md text-xs font-bold cursor-pointer border-0 disabled:opacity-50"
                >
                  {isSavingSector ? 'Saving...' : 'Save Sector'}
                </button>
              </div>
            )}

            <select
              value={workingSector}
              disabled={effectiveIsViewMode}
              onChange={(e) => setWorkingSector(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#0b4da2] cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
            >
              {(() => {
                const selectedComp = companies.find((c) => c.id.toLowerCase() === (companyId || '').toLowerCase());
                const compSectors: string[] = [];
                if (selectedComp?.sectors && Array.isArray(selectedComp.sectors)) {
                  selectedComp.sectors.forEach((s) => {
                    const trimmed = s.trim();
                    if (trimmed && !compSectors.includes(trimmed)) compSectors.push(trimmed);
                  });
                }
                if (selectedComp?.sector) {
                  selectedComp.sector.split(',').forEach((s) => {
                    const trimmed = s.trim();
                    if (trimmed && !compSectors.includes(trimmed)) compSectors.push(trimmed);
                  });
                }

                if (compSectors.length === 0) {
                  return (
                    <option value="">
                      {selectedComp
                        ? `-- No sector assigned to ${selectedComp.name} (Use "+ Add New Sector" above) --`
                        : '-- Please select an employer company first --'}
                    </option>
                  );
                }

                return compSectors.map((s) => (
                  <option key={s} value={s}>
                    {s} ({selectedComp?.name})
                  </option>
                ));
              })()}
            </select>
          </div>

          {/* Working Address */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Working Address / Official Worksite
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <textarea
                rows={2}
                disabled={effectiveIsViewMode}
                value={workingAddress}
                onChange={(e) => setWorkingAddress(e.target.value)}
                placeholder="Enter work site / manufacturing plant / project location address..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
              />
            </div>
          </div>

          {/* Basic Salary & OT(Over time) - Hidden completely for Employees */}
          {portalType !== 'employee' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Basic Salary
                </label>
                <div className="relative">
                  <Coins size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    disabled={effectiveIsViewMode}
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    placeholder="e.g. RM 2,500"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  OT(Over time)
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    disabled={effectiveIsViewMode}
                    value={overtime}
                    onChange={(e) => setOvertime(e.target.value)}
                    placeholder="e.g. 1.5x / RM 15.00/hr / 8 hrs"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card: Target Amount (Under Working Sector, Basic Salary & OT) */}
        {canManageTarget && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-[#0b4da2]" />
                <span>Target Amount</span>
              </div>
              <span className="text-[11px] text-blue-600 font-semibold">Customer Financial Target</span>
            </div>

            <p className="text-[11px] text-slate-500 m-0">
              Establish financial target milestone, service package value, payment terms, and collection schedule for this worker.
            </p>

            {/* Live Financial Ledger Balance Overview */}
            {liveFinancialCalculation.hasFinancialData ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Live Financial Balance Calculation
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      (Target − Deposited = Pending)
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      liveFinancialCalculation.status === 'Settled'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : liveFinancialCalculation.status === 'Partially Paid'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {liveFinancialCalculation.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
                  <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-blue-700 block uppercase font-bold">Total Target</span>
                    <span className="font-black text-blue-900 text-xs sm:text-sm">
                      RM {liveFinancialCalculation.calculatedTotalTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block uppercase font-bold">Total Deposited</span>
                    <span className="font-black text-emerald-900 text-xs sm:text-sm">
                      RM {liveFinancialCalculation.totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    liveFinancialCalculation.calculatedPending === 0 && liveFinancialCalculation.calculatedTotalTarget > 0
                      ? 'bg-emerald-100/70 border-emerald-300'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}>
                    <span className={`text-[10px] block uppercase font-bold ${
                      liveFinancialCalculation.calculatedPending === 0 && liveFinancialCalculation.calculatedTotalTarget > 0
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}>
                      Remaining Pending
                    </span>
                    <span className={`font-black text-xs sm:text-sm ${
                      liveFinancialCalculation.calculatedPending === 0 && liveFinancialCalculation.calculatedTotalTarget > 0
                        ? 'text-emerald-800'
                        : 'text-amber-900'
                    }`}>
                      RM {liveFinancialCalculation.calculatedPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Progress bar if target is set */}
                {liveFinancialCalculation.calculatedTotalTarget > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Collection Progress</span>
                      <span className="font-bold text-slate-700">{liveFinancialCalculation.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          liveFinancialCalculation.status === 'Settled'
                            ? 'bg-emerald-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${liveFinancialCalculation.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>Enter a target amount below to automatically calculate financial dues and ledger balances.</span>
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase shrink-0">Formula: Target − Deposit = Pending</span>
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Target Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Target Amount (RM)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    RM
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={effectiveIsViewMode}
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 3500.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                  />
                </div>
              </div>

              {/* Target Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Target Category
                </label>
                <select
                  disabled={effectiveIsViewMode}
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70 bg-white"
                >
                  {TARGET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Completion Date */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Target Due Date
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    disabled={effectiveIsViewMode}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70 bg-white"
                  />
                </div>
              </div>

              {/* Target Status */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Target Status
                </label>
                <select
                  disabled={effectiveIsViewMode}
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70 bg-white"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Achieved">Achieved</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Payment Terms */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Payment Terms
                </label>
                <select
                  disabled={effectiveIsViewMode}
                  value={targetTerms}
                  onChange={(e) => setTargetTerms(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70 bg-white"
                >
                  {PAYMENT_TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks / Case Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Remarks / Financial Notes
                </label>
                <input
                  type="text"
                  disabled={effectiveIsViewMode}
                  value={targetRemarks}
                  onChange={(e) => setTargetRemarks(e.target.value)}
                  placeholder="Additional terms or package notes for this worker..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                />
              </div>
            </div>
          </div>
        )}

        {/* Card: Others Company Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold text-xs">
              <Building2 size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 m-0">
                Others Company Information
              </h3>
              <p className="text-[11px] text-slate-500 m-0">
                Secondary employer or external subcontracting firm details for this foreign worker.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Company Name
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  disabled={effectiveIsViewMode}
                  value={otherCompanyName}
                  onChange={(e) => setOtherCompanyName(e.target.value)}
                  placeholder="e.g. Subcontractor or Partner Enterprise"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                />
              </div>
            </div>

            {/* Boss Phone No */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Boss Phone No
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  disabled={effectiveIsViewMode}
                  value={otherCompanyBossPhone}
                  onChange={(e) => setOtherCompanyBossPhone(e.target.value)}
                  placeholder="e.g. +60 12-345 6789"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                />
              </div>
            </div>

            {/* Company Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Company Address
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  rows={2}
                  disabled={effectiveIsViewMode}
                  value={otherCompanyAddress}
                  onChange={(e) => setOtherCompanyAddress(e.target.value)}
                  placeholder="Enter other company premises or office address..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card: Customer / Foreign Worker Login Access & Clearances */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <KeyRound size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 m-0">
                  Login Access &amp; Foreign Worker Portal Credentials
                </h3>
                <p className="text-[11px] text-slate-500 m-0">
                  Enable login access for this worker to access their company&apos;s authorized service cards at <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#0b4da2]">/login</code>.
                </p>
              </div>
            </div>

            {/* Main Checkbox / Toggle */}
            <label className={`relative inline-flex items-center ${effectiveIsViewMode ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} select-none`}>
              <input
                type="checkbox"
                disabled={effectiveIsViewMode}
                checked={canLogin}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCanLogin(checked);
                  if (checked && !loginUsername) {
                    setLoginUsername(passportNo.trim() || `WORKER-${Math.floor(1000 + Math.random() * 9000)}`);
                  }
                  if (checked && !loginPassword) {
                    setLoginPassword('password123');
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4da2]"></div>
              <span className="ml-3 text-xs font-bold text-slate-800">
                {canLogin ? 'Login Access Enabled' : 'Login Access Disabled'}
              </span>
            </label>
          </div>

          {!canLogin ? (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
              <p className="text-xs text-slate-500 m-0">
                Login access is currently <strong className="text-slate-700">disabled</strong>.
                Credentials will <strong className="text-slate-700">not</strong> be created and this worker will not be able to log in to the system.
              </p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Credentials Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                {/* User ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      User ID / Login ID <span className="text-red-500">*</span>
                    </label>
                    {passportNo && !effectiveIsViewMode && (
                      <button
                        type="button"
                        onClick={() => setLoginUsername(passportNo.trim())}
                        className="text-[10px] font-bold text-[#0b4da2] hover:underline bg-transparent border-0 cursor-pointer p-0"
                      >
                        Use Passport ({passportNo.trim()})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled={effectiveIsViewMode}
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="e.g. Passport number or custom User ID"
                      required={canLogin}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono font-semibold focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Portal Password <span className="text-red-500">*</span>
                    </label>
                    {!effectiveIsViewMode && (
                      <button
                        type="button"
                        onClick={() => setLoginPassword('password123')}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-transparent border-0 cursor-pointer p-0"
                      >
                        Default: password123
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      disabled={effectiveIsViewMode}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password"
                      required={canLogin}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-0"
                    >
                      {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Service Cards Access & Clearances Section */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 m-0">
                      Service Cards Clearance ({customerAssignedCards.includes('*') ? availableServices.length : customerAssignedCards.length} Selected)
                    </h4>
                    <p className="text-[11px] text-slate-500 m-0">
                      Select which digital service cards this foreign worker can view in the portal.
                    </p>
                  </div>

                  {!effectiveIsViewMode && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setCustomerAssignedCards(['*'])}
                        className="text-[11px] font-bold text-[#0b4da2] hover:underline bg-transparent border-0 cursor-pointer p-0"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setCustomerAssignedCards([])}
                        className="text-[11px] font-bold text-slate-500 hover:underline bg-transparent border-0 cursor-pointer p-0"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                {/* Service Cards Checkbox Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableServices.map((card) => {
                    const checked = isCustomerCardChecked(card.id);
                    return (
                      <div
                        key={card.id}
                        onClick={!effectiveIsViewMode ? () => handleToggleCustomerServiceCard(card.id) : undefined}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none ${
                          effectiveIsViewMode ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          checked
                            ? 'border-[#0b4da2] bg-blue-50/70 shadow-2xs ring-1 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            checked ? 'bg-[#0b4da2] text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="w-10 h-10 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                          <img src={card.image} alt="" className="max-h-full max-w-full object-contain" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="text-xs font-bold text-slate-900 truncate">{card.title}</div>
                            {card.tag && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase shrink-0">
                                {card.tag}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {card.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 5: Multiple Upload Documents (Name + Date of Issue + Date of Expire + Attachment) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <FileText size={15} className="text-[#0b4da2]" />
                <span>Upload Documents (Passports, NID, Visa, Medical &amp; Certs)</span>
              </div>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                {effectiveIsViewMode
                  ? `Uploaded document dossiers for this worker (${documents.length} files attached).`
                  : 'Attach customer records with document name, date of issue, date of expire, and file attachment.'}
              </p>
            </div>
            {!effectiveIsViewMode && (
              <button
                type="button"
                onClick={handleAddDocumentRow}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b4da2] hover:text-[#072a6b] bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Plus size={14} />
                <span>Add Document Attachment</span>
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 bg-slate-50/50">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600 m-0">No document attachments uploaded for this worker.</p>
              {!effectiveIsViewMode && (
                <>
                  <p className="text-[11px] text-slate-400 mt-1 mb-3">
                    Upload passport copy, national ID, visa, work permit, medical reports, or certificates.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddDocumentRow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083a7c] px-3.5 py-1.5 rounded-lg border-0 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Add First Document</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-4 transition-all"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                    {/* 1. Document Name */}
                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Document Name #{idx + 1}
                      </label>
                      <input
                        type="text"
                        disabled={effectiveIsViewMode}
                        value={doc.name}
                        onChange={(e) => handleDocumentFieldChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Passport, NID, Medical"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                      />
                    </div>

                    {/* 2. Select Service Card */}
                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                        <span>Select Service Card</span>
                        <span className="text-[10px] text-blue-600 font-semibold">Service Tag</span>
                      </label>
                      <select
                        value={doc.service_id || ''}
                        disabled={effectiveIsViewMode}
                        onChange={(e) => handleDocumentServiceChange(idx, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                      >
                        <option value="">-- General Document (None) --</option>
                        {selectableServices.map((svc) => (
                          <option key={svc.id} value={svc.id}>
                            {svc.title} {svc.tag ? `[${svc.tag}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Date of Issue */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Date of Issue
                      </label>
                      <input
                        type="date"
                        disabled={effectiveIsViewMode}
                        value={doc.issue_date || ''}
                        onChange={(e) => handleDocumentFieldChange(idx, 'issue_date', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                      />
                    </div>

                    {/* 4. Date of Expire */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Date of Expire
                      </label>
                      <input
                        type="date"
                        disabled={effectiveIsViewMode}
                        value={doc.expire_date || ''}
                        onChange={(e) => handleDocumentFieldChange(idx, 'expire_date', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                      />
                    </div>

                    {/* 5. Attachment & Delete */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Attachment
                      </label>
                      <div className="flex items-center gap-1.5">
                        {!effectiveIsViewMode ? (
                          <>
                            <label className="inline-flex items-center gap-1 px-2.5 py-2 bg-white border border-slate-300 hover:border-[#0b4da2] text-slate-700 hover:text-[#0b4da2] text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0">
                              <Upload size={12} />
                              <span>{doc.url || doc.dataUrl ? 'Replace' : 'Upload'}</span>
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
                            {doc.url || doc.dataUrl ? (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-1.5 rounded border border-emerald-200 truncate flex-1 font-mono">
                                <Check size={11} className="shrink-0 text-emerald-600" />
                                <span className="truncate" title={doc.size || 'Attached'}>
                                  {doc.size || 'Attached'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic flex-1 truncate">No file</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveDocumentRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                              title="Remove document row"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          doc.url || doc.dataUrl ? (
                            <a
                              href={getFileUrl(doc.url || doc.dataUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#0b4da2] text-xs font-bold rounded-lg transition-colors no-underline flex-1 truncate"
                            >
                              <Eye size={13} className="shrink-0" />
                              <span className="truncate">View File</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic flex-1 truncate">No file attached</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 6: Account Status & Submit Actions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-800">
              Customer Permit Status:
            </span>
            <div className="flex items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  disabled={effectiveIsViewMode}
                  name="status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-[#0b4da2] focus:ring-[#0b4da2] disabled:opacity-75"
                />
                <span className="text-emerald-700 font-semibold">Active</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  disabled={effectiveIsViewMode}
                  name="status"
                  value="pending"
                  checked={status === 'pending'}
                  onChange={() => setStatus('pending')}
                  className="text-amber-600 focus:ring-amber-500 disabled:opacity-75"
                />
                <span className="text-amber-700 font-semibold">Pending</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  disabled={effectiveIsViewMode}
                  name="status"
                  value="inactive"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  className="text-rose-600 focus:ring-rose-500 disabled:opacity-75"
                />
                <span className="text-rose-700 font-semibold">Inactive</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  disabled={effectiveIsViewMode}
                  name="status"
                  value="absent"
                  checked={status === 'absent'}
                  onChange={() => setStatus('absent')}
                  className="text-purple-600 focus:ring-purple-500 disabled:opacity-75"
                />
                <span className="text-purple-700 font-semibold">Absent</span>
              </label>
            </div>
          </div>

          {effectiveIsViewMode ? (
            <div className="flex items-center gap-3 justify-end">
              <Link
                href={backUrl}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors no-underline inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Back to Customer Directory</span>
              </Link>

              {canEdit && editId && (
                <Link
                  href={`${editBaseUrl}?id=${editId}`}
                  className="px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm no-underline inline-flex items-center gap-2"
                >
                  <Edit2 size={15} />
                  <span>Edit Customer Profile</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 justify-end">
              <Link
                href={backUrl}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors no-underline"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#0b4da2] hover:bg-[#083a7c] text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                <span>{isEditing ? 'Save Changes' : 'Create Customer'}</span>
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default function CustomerFormFullPage(props: CustomerFormFullPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center text-slate-500 text-xs font-semibold">
          Loading Form...
        </div>
      }
    >
      <CustomerFormContent {...props} />
    </Suspense>
  );
}
