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
  FileCheck2,
  FileText,
  Globe2,
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
  User,
  X,
} from 'lucide-react';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend, updateStoredCompany } from '@/lib/companyStorage';
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
import { getMasterAdminUser } from '@/lib/auth';
import Select2Search, { Select2Option } from '@/components/Select2Search';

interface CustomerFormFullPageProps {
  portalType: 'superadmin' | 'masteradmin';
  backUrl: string;
}

function filterPermittedCompanies(allComps: Company[], portalType: 'superadmin' | 'masteradmin'): Company[] {
  if (portalType !== 'masteradmin') return allComps;
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

function CustomerFormContent({ portalType, backUrl }: CustomerFormFullPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditing = Boolean(editId);

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

  // Service cards for tagging uploaded documents
  const [availableServices, setAvailableServices] = useState<ServiceCard[]>(() => {
    return typeof window !== 'undefined' ? getStoredServices() : [];
  });

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

  const profilePicInputRef = useRef<HTMLInputElement | null>(null);

  // Background refresh of companies & sectors (non-blocking)
  useEffect(() => {
    let isMounted = true;
    async function refreshBackgroundData() {
      try {
        const [allComps, secList, svcList] = await Promise.all([
          fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
          fetchWorkingSectors(),
          fetchServiceCards().catch(() => getStoredServices()),
        ]);

        if (!isMounted) return;
        const permitted = filterPermittedCompanies(allComps, portalType);
        setCompanies(permitted);
        setSectors(secList);
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
    setFullName(cust.full_name || '');
    if (cust.company_id) {
      setCompanyId(cust.company_id);
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

  // Select2 options for employer companies
  const companyOptions: Select2Option[] = useMemo(() => {
    return companies.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: `${c.sector || 'Employer'} • ROC: ${c.roc || 'Verified'}`,
      badge: c.tag || 'Verified',
    }));
  }, [companies]);

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

    const payload: Partial<CustomerRecord> = {
      full_name: fullName.trim(),
      company_id: companyId || (companies[0]?.id || ''),
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
      basic_salary: basicSalary.trim(),
      overtime: overtime.trim(),
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
    };

    try {
      if (isEditing && editId) {
        await updateCustomer(editId, payload);
        setFeedback({ type: 'success', message: 'Customer record updated successfully!' });
      } else {
        await createCustomer(payload);
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
          {portalType === 'superadmin' ? 'Super Admin Module' : 'Master Admin Scope'}
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#072a6b] via-[#093a8e] to-[#0c4da2] text-white rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2">
              <ShieldCheck size={12} className="text-yellow-400" />
              <span>Full Page Registry Form</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0">
              {isEditing ? `Edit Customer Profile: ${fullName}` : 'Register New Customer Profile'}
            </h1>
            <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed m-0">
              Complete foreign worker biometrics, passport documentation, NID records, living address, working sectors, and multi-file document dossiers.
            </p>
          </div>
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
              {profilePic && (
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Mohammad Rafiqul Islam"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Assigned Employer Company <span className="text-red-500">*</span>
              </label>
              <Select2Search
                options={companyOptions}
                value={companyId}
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
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value)}
                placeholder="e.g. A01234567"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                National ID (NID / IC No.) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nidNo}
                onChange={(e) => setNidNo(e.target.value)}
                placeholder="e.g. 1988269123456"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
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
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Origin Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Bangladesh, Indonesia"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white"
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+60 12-345 6789"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="worker@agency.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
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
              value={leavingAddress}
              onChange={(e) => setLeavingAddress(e.target.value)}
              placeholder="Enter worker's residential living address in home country or current location..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
            />
          </div>
        </div>

        {/* Card 4: Working Sector, Basic Salary & OT(Over time) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-[#0b4da2]" />
              <span>Working Sector, Basic Salary &amp; OT(Over time)</span>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold">Admin Panel Manageable Sectors</span>
          </div>

          {/* Working Sector (with admin panel ability to add new sector) */}
          <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Working Sector <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewSector(!isAddingNewSector)}
                className="text-xs font-bold text-[#0b4da2] hover:text-[#072a6b] hover:underline inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer"
              >
                <Plus size={13} />
                <span>{isAddingNewSector ? 'Cancel' : '+ Add New Sector'}</span>
              </button>
            </div>

            {/* Inline Add New Sector Form */}
            {isAddingNewSector && (
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
              onChange={(e) => setWorkingSector(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#0b4da2] cursor-pointer"
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
                value={workingAddress}
                onChange={(e) => setWorkingAddress(e.target.value)}
                placeholder="Enter work site / manufacturing plant / project location address..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
              />
            </div>
          </div>

          {/* Basic Salary & Our Time (Overtime) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Basic Salary
              </label>
              <div className="relative">
                <Coins size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(e.target.value)}
                  placeholder="e.g. RM 2,500"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
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
                  value={overtime}
                  onChange={(e) => setOvertime(e.target.value)}
                  placeholder="e.g. 1.5x / RM 15.00/hr / 8 hrs"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>
            </div>
          </div>
        </div>

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
                  value={otherCompanyName}
                  onChange={(e) => setOtherCompanyName(e.target.value)}
                  placeholder="e.g. Subcontractor or Partner Enterprise"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
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
                  value={otherCompanyBossPhone}
                  onChange={(e) => setOtherCompanyBossPhone(e.target.value)}
                  placeholder="e.g. +60 12-345 6789"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
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
                  value={otherCompanyAddress}
                  onChange={(e) => setOtherCompanyAddress(e.target.value)}
                  placeholder="Enter other company premises or office address..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                />
              </div>
            </div>
          </div>
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
                Attach customer records with document name, date of issue, date of expire, and file attachment.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddDocumentRow}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b4da2] hover:text-[#072a6b] bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus size={14} />
              <span>Add Document Attachment</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 bg-slate-50/50">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600 m-0">No document attachments added yet.</p>
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
                        value={doc.name}
                        onChange={(e) => handleDocumentFieldChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Passport, NID, Medical"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#0b4da2]"
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
                        onChange={(e) => handleDocumentServiceChange(idx, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#0b4da2]"
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
                        value={doc.issue_date || ''}
                        onChange={(e) => handleDocumentFieldChange(idx, 'issue_date', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                      />
                    </div>

                    {/* 4. Date of Expire */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Date of Expire
                      </label>
                      <input
                        type="date"
                        value={doc.expire_date || ''}
                        onChange={(e) => handleDocumentFieldChange(idx, 'expire_date', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
                      />
                    </div>

                    {/* 5. Attachment & Delete */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Attachment
                      </label>
                      <div className="flex items-center gap-1.5">
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
                  name="status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-[#0b4da2] focus:ring-[#0b4da2]"
                />
                <span className="text-emerald-700 font-semibold">Active</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="pending"
                  checked={status === 'pending'}
                  onChange={() => setStatus('pending')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-amber-700 font-semibold">Pending</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="text-rose-700 font-semibold">Inactive</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="absent"
                  checked={status === 'absent'}
                  onChange={() => setStatus('absent')}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-purple-700 font-semibold">Absent</span>
              </label>
            </div>
          </div>

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
