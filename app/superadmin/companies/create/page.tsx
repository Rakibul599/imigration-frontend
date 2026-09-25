'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileUp,
  Globe2,
  Image as ImageIcon,
  Languages,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Company, CompanyDirector, DirectorDocument, UploadedFileInfo, resolveFileUrl } from '@/lib/companies';
import {
  fileToBase64,
  getCompanyById,
  getStoredCompanies,
  saveStoredCompany,
  updateStoredCompany,
} from '@/lib/companyStorage';
import Select2Search from '@/components/Select2Search';
import { ALL_WORLD_LANGUAGES } from '@/lib/languages';
import { ALL_WORLD_CURRENCIES } from '@/lib/currencies';

const SECTOR_OPTIONS = [
  'Civil & Building Construction',
  'Agriculture & Plantation',
  'Manufacturing & Healthcare',
  'Hospitality & Services',
  'Agri-Commodity & Processing',
  'Engineering & Development',
  'Logistics & Supply Chain',
  'General Commercial & Services',
  'Information Technology & Telecom',
  'Finance & Corporate Services',
];

const CURRENCY_OPTIONS = [
  { code: 'MYR', name: 'Malaysian Ringgit (RM)', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' },
  { code: 'EUR', name: 'Euro (€)', symbol: '€' },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'BDT', name: 'Bangladeshi Taka (৳)', symbol: '৳' },
  { code: 'IDR', name: 'Indonesian Rupiah (Rp)', symbol: 'Rp' },
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
];

const LANGUAGE_OPTIONS = [
  'English (Default)',
  'Bahasa Melayu (Malay)',
  'Chinese (Mandarin)',
  'Tamil',
  'Bengali',
  'Arabic',
];

const BANK_PRESETS = [
  'Maybank (Malayan Banking Berhad)',
  'CIMB Bank Berhad',
  'Public Bank Berhad',
  'RHB Bank Berhad',
  'Hong Leong Bank Berhad',
  'AmBank Group',
  'Standard Chartered Bank Malaysia',
  'HSBC Bank Malaysia',
  'United Overseas Bank (UOB)',
  'Other Corporate Bank',
];

const LOGO_PRESETS = [
  { label: 'Gamuda', path: '/images/companies/gamuda.svg' },
  { label: 'Sime Darby', path: '/images/companies/sime-darby.svg' },
  { label: 'Top Glove', path: '/images/companies/top-glove.svg' },
  { label: 'Genting', path: '/images/companies/genting.svg' },
  { label: 'IOI Group', path: '/images/companies/ioi-group.svg' },
  { label: 'Sunway', path: '/images/companies/sunway.svg' },
];

function createEmptyDirector(index = 1): CompanyDirector {
  return {
    id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: '',
    nidNo: '',
    passportNo: '',
    phone: '',
    email: '',
    socsoNo: '',
    epfNo: '',
    carPlateNo: '',
    carPurchaseType: 'emi',
    carAmount: '',
    basicSalary: '',
    otherDocuments: [],
  };
}

function CreateCompanyFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  // Company core states
  const [name, setName] = useState('');
  const [roc, setRoc] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState<string>(LOGO_PRESETS[0].path);
  const [currency, setCurrency] = useState('MYR');
  const [language, setLanguage] = useState('English');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [sector, setSector] = useState(SECTOR_OPTIONS[0]);
  const [totalWorkers, setTotalWorkers] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('Verified JIM');

  // Directors state (multiple directors / CEOs)
  const [directors, setDirectors] = useState<CompanyDirector[]>([createEmptyDirector(1)]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type?: string } | null>(null);

  // Generate random default ROC on new company
  useEffect(() => {
    if (!editId) {
      setRoc(`ROC-${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 90000000)}`);
    }
  }, [editId]);

  // Load existing data in Edit mode
  useEffect(() => {
    if (editId) {
      const comp = getCompanyById(editId);
      if (comp) {
        setName(comp.name);
        setRoc(comp.roc);
        setAddress(comp.address || '');
        setPhone(comp.phone || '');
        setEmail(comp.email || '');
        setLogo(comp.logo || LOGO_PRESETS[0].path);
        setCurrency(comp.currency || 'MYR');
        setLanguage(comp.language || 'English');
        setBankName(comp.bankName || '');
        setBankAccountNo(comp.bankAccountNo || '');
        setSector(comp.sector || SECTOR_OPTIONS[0]);
        setTotalWorkers(comp.totalWorkers || 0);
        setDescription(comp.description || '');
        setTag(comp.tag || 'Verified JIM');

        if (comp.directors && comp.directors.length > 0) {
          setDirectors(comp.directors);
        }
      }
    }
  }, [editId]);

  // Handle Logo File Upload (Save to LocalStorage via Base64)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size should be less than 2MB for optimal storage.');
    }

    try {
      const converted = await fileToBase64(file);
      setLogo(converted.fileData);
    } catch (err) {
      console.error('Error reading logo file:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Add a new Director / CEO
  const handleAddDirector = () => {
    setDirectors((prev) => [...prev, createEmptyDirector(prev.length + 1)]);
  };

  // Remove a Director / CEO
  const handleRemoveDirector = (index: number) => {
    if (directors.length <= 1) {
      alert('At least one Director/CEO is required for registration.');
      return;
    }
    setDirectors((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a specific Director's field
  const handleUpdateDirector = (index: number, field: keyof CompanyDirector, value: any) => {
    setDirectors((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Upload file for a Director (NID or Passport)
  const handleDirectorFileUpload = async (
    directorIndex: number,
    type: 'nidFile' | 'passportFile',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const converted = await fileToBase64(file);
      handleUpdateDirector(directorIndex, type, converted);
    } catch (err) {
      console.error(`Error uploading director ${type}:`, err);
    } finally {
      e.target.value = '';
    }
  };

  // Add an "Other Document" to a Director
  const handleAddOtherDocument = (directorIndex: number) => {
    setDirectors((prev) => {
      const copy = [...prev];
      const dir = copy[directorIndex];
      const newDoc: DirectorDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        fileName: '',
        fileData: '',
        uploadedAt: new Date().toISOString(),
      };
      dir.otherDocuments = [...(dir.otherDocuments || []), newDoc];
      return copy;
    });
  };

  // Update Other Document Title / Name
  const handleUpdateOtherDocName = (directorIndex: number, docIndex: number, newName: string) => {
    setDirectors((prev) => {
      const copy = [...prev];
      const docs = [...(copy[directorIndex].otherDocuments || [])];
      docs[docIndex] = { ...docs[docIndex], name: newName };
      copy[directorIndex].otherDocuments = docs;
      return copy;
    });
  };

  // Upload file for Other Document
  const handleOtherDocFileUpload = async (
    directorIndex: number,
    docIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const converted = await fileToBase64(file);
      setDirectors((prev) => {
        const copy = [...prev];
        const docs = [...(copy[directorIndex].otherDocuments || [])];
        docs[docIndex] = {
          ...docs[docIndex],
          fileName: converted.fileName,
          fileSize: converted.fileSize,
          fileType: converted.fileType,
          fileData: converted.fileData,
          name: docs[docIndex].name || converted.fileName,
        };
        copy[directorIndex].otherDocuments = docs;
        return copy;
      });
    } catch (err) {
      console.error('Error uploading other document:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Remove Other Document
  const handleRemoveOtherDoc = (directorIndex: number, docIndex: number) => {
    setDirectors((prev) => {
      const copy = [...prev];
      copy[directorIndex].otherDocuments = copy[directorIndex].otherDocuments.filter((_, i) => i !== docIndex);
      return copy;
    });
  };

  // Submit Handler: Saves to LocalStorage & navigates to list page
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter the Company Name.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!roc.trim()) {
      setErrorMessage('Please enter the Registration Number (ROC).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const sanitizedId = editId
        ? editId
        : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      const companyData: Company = {
        id: sanitizedId,
        name: name.trim().toUpperCase(),
        roc: roc.trim(),
        sector,
        tag,
        totalWorkers: Number(totalWorkers) || 0,
        logo: logo || LOGO_PRESETS[0].path,
        description: description.trim() || 'Verified registered employer organization within the Malaysian Immigration portal.',
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        currency,
        language,
        bankName,
        bankAccountNo: bankAccountNo.trim(),
        directors: directors.map((dir) => ({
          ...dir,
          name: dir.name.trim(),
          nidNo: dir.nidNo.trim(),
          passportNo: dir.passportNo.trim(),
          phone: dir.phone.trim(),
          email: dir.email.trim(),
          socsoNo: dir.socsoNo.trim(),
          epfNo: dir.epfNo.trim(),
          carPlateNo: dir.carPlateNo.trim(),
          carAmount: dir.carAmount || '0',
          basicSalary: dir.basicSalary || '0',
        })),
      };

      if (editId) {
        await updateStoredCompany(companyData);
      } else {
        await saveStoredCompany(companyData);
      }

      // Successfully saved to localStorage, navigate to registered company list page
      router.push('/superadmin/companies/registered');
    } catch (err: any) {
      console.error('Error saving company:', err);
      setErrorMessage(err.message || 'Failed to save company to storage.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/superadmin" className="hover:text-[#0b4da2] transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link href="/superadmin/companies" className="hover:text-[#0b4da2] transition-colors">
          Companies Management
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <Link href="/superadmin/companies/registered" className="hover:text-[#0b4da2] transition-colors">
          Registered Companies
        </Link>
        <ChevronRight size={13} className="text-slate-400" />
        <span className="font-semibold text-slate-800">
          {editId ? 'Edit Employer Organization' : 'Create Company'}
        </span>
      </div>

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                  {editId ? 'Edit Registered Company' : 'Register New Corporate Entity'}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Page View
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Complete company profile, bank account, and appointed Directors/CEOs with document uploads. Stored persistently in LocalStorage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/superadmin/companies/registered"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors no-underline"
            >
              <ArrowLeft size={14} />
              <span>Back to List</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs animate-in fade-in">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* THE COMPREHENSIVE FORM */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: COMPANY IDENTIFICATION & CONTACT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Company Profile &amp; Registration</h2>
              <p className="text-[11px] text-slate-500 m-0">Official business registration details, ROC, and contact coordinates.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NATASHA CONSTRUCTION SDN. BHD."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all uppercase"
                />
              </div>
            </div>

            {/* Registration No (ROC) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Registration No (ROC) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={roc}
                  onChange={(e) => setRoc(e.target.value)}
                  placeholder="ROC-202401045921"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Phone No */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+60 3-8942 9900"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Email No */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="corporate@company.com.my"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Company Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Company Registered Address
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Level 18, Menara Gamuda, PJ Trade Centre, No. 8 Jalan PJU 8/8A, Bandar Damansara Perdana, 47820 Petaling Jaya, Selangor."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: COMPANY LOGO & BRANDING */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Company Logo Upload</h2>
              <p className="text-[11px] text-slate-500 m-0">Upload official company crest/logo. Stored in browser LocalStorage.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Logo Preview Box */}
            <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center p-2 shrink-0 shadow-2xs relative overflow-hidden group">
              <img
                src={resolveFileUrl(logo) || '/images/companies/gamuda.svg'}
                alt="Logo Preview"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).setAttribute('src', '/images/companies/gamuda.svg');
                }}
              />
            </div>

            {/* Upload Button & Presets */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <button
                  type="button"
                  onClick={() => document.getElementById('company-logo-upload-input')?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083c80] text-white shadow-2xs transition-colors cursor-pointer border-0"
                >
                  <UploadCloud size={16} />
                  <span>Upload Logo from Computer</span>
                </button>
                <input
                  id="company-logo-upload-input"
                  type="file"
                  accept="image/*"
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <span className="text-[11px] text-slate-400 ml-3">PNG, JPG, or SVG up to 2MB</span>
              </div>

              {/* Preset Selector */}
              <div>
                <span className="text-[11px] text-slate-500 block mb-1.5 font-medium">Or pick a standard corporate preset:</span>
                <div className="flex flex-wrap gap-2">
                  {LOGO_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setLogo(preset.path)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] border transition-all cursor-pointer ${
                        logo === preset.path
                          ? 'border-[#0b4da2] bg-blue-50 text-[#0b4da2] font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: BANKING, CURRENCY & LANGUAGE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Banking, Currency &amp; Language</h2>
              <p className="text-[11px] text-slate-500 m-0">Corporate bank account number, transactional currency, and operating language.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Currency Selection (Select2 Searchable) */}
            <div>
              <Select2Search
                label="Currency Selection"
                options={ALL_WORLD_CURRENCIES}
                value={currency}
                onChange={(val) => setCurrency(val)}
                placeholder="Select Currency..."
                searchPlaceholder="Search currency or country..."
                icon={<Coins size={16} />}
              />
            </div>

            {/* Language Selection (Select2 Searchable with all countries) */}
            <div>
              <Select2Search
                label="Language Selection"
                options={ALL_WORLD_LANGUAGES}
                value={language}
                onChange={(val) => setLanguage(val)}
                placeholder="Select Language..."
                searchPlaceholder="Search language or country..."
                icon={<Languages size={16} />}
              />
            </div>

            {/* Bank Name (Text Input) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Company Bank Name
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Maybank, CIMB Bank, Public Bank"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Company Bank Account No */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Company Bank Account No
              </label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="5140 1234 5678"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: COMPANY DIRECTORS (CEOs) - MULTIPLE ADD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 m-0">Company Director(s) &amp; CEO(s)</h2>
                <p className="text-[11px] text-slate-500 m-0">
                  Multiple directors can be added. Includes NID, Passport, Car, Salary, and other uploaded documents.
                </p>
              </div>
            </div>

            {/* + Add Director Button */}
            <button
              type="button"
              onClick={handleAddDirector}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <UserPlus size={14} />
              <span>+ Add Director / CEO</span>
            </button>
          </div>

          {/* Director Cards List */}
          <div className="space-y-6">
            {directors.map((director, dIndex) => (
              <div
                key={director.id || dIndex}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 relative"
              >
                {/* Director Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                      {dIndex + 1}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wide">
                      {director.name ? director.name : `Director / CEO #${dIndex + 1}`}
                    </h3>
                  </div>

                  {directors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDirector(dIndex)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 bg-white transition-colors cursor-pointer"
                      title="Remove Director"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Director Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Director Name */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Director Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={director.name}
                      onChange={(e) => handleUpdateDirector(dIndex, 'name', e.target.value)}
                      placeholder="e.g. Tan Sri Dato' Seri Lim"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Director Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={director.phone}
                      onChange={(e) => handleUpdateDirector(dIndex, 'phone', e.target.value)}
                      placeholder="+60 12-345 6789"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Director Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={director.email}
                      onChange={(e) => handleUpdateDirector(dIndex, 'email', e.target.value)}
                      placeholder="director@company.com"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* NID No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NID / National ID (IC) No
                    </label>
                    <input
                      type="text"
                      value={director.nidNo}
                      onChange={(e) => handleUpdateDirector(dIndex, 'nidNo', e.target.value)}
                      placeholder="850101-14-5567"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* NID Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NID Document Upload
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById(`nid-file-input-${dIndex}`)?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer w-full justify-center"
                      >
                        <FileUp size={14} className="text-blue-600" />
                        <span className="truncate">
                          {director.nidFile ? director.nidFile.fileName : 'Choose NID File'}
                        </span>
                      </button>
                      <input
                        id={`nid-file-input-${dIndex}`}
                        type="file"
                        accept="image/*,application/pdf"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleDirectorFileUpload(dIndex, 'nidFile', e)}
                        className="hidden"
                      />
                      {director.nidFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ name: director.nidFile!.fileName, url: director.nidFile!.fileData, type: director.nidFile!.fileType })}
                          className="p-2 rounded-lg bg-blue-50 text-[#0b4da2] hover:bg-blue-100 border border-blue-200 cursor-pointer shrink-0"
                          title="Preview Uploaded NID"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Passport No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Passport No
                    </label>
                    <input
                      type="text"
                      value={director.passportNo}
                      onChange={(e) => handleUpdateDirector(dIndex, 'passportNo', e.target.value)}
                      placeholder="A52981034"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Passport Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Passport Document Upload
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById(`passport-file-input-${dIndex}`)?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer w-full justify-center"
                      >
                        <FileCheck size={14} className="text-emerald-600" />
                        <span className="truncate">
                          {director.passportFile ? director.passportFile.fileName : 'Choose Passport File'}
                        </span>
                      </button>
                      <input
                        id={`passport-file-input-${dIndex}`}
                        type="file"
                        accept="image/*,application/pdf"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleDirectorFileUpload(dIndex, 'passportFile', e)}
                        className="hidden"
                      />
                      {director.passportFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ name: director.passportFile!.fileName, url: director.passportFile!.fileData, type: director.passportFile!.fileType })}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer shrink-0"
                          title="Preview Uploaded Passport"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SOCSO No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      SOCSO No
                    </label>
                    <input
                      type="text"
                      value={director.socsoNo}
                      onChange={(e) => handleUpdateDirector(dIndex, 'socsoNo', e.target.value)}
                      placeholder="SOCSO-890123"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* EPF No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      EPF No
                    </label>
                    <input
                      type="text"
                      value={director.epfNo}
                      onChange={(e) => handleUpdateDirector(dIndex, 'epfNo', e.target.value)}
                      placeholder="EPF-23456789"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Basic Salary */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Basic Monthly Salary ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={director.basicSalary}
                      onChange={(e) => handleUpdateDirector(dIndex, 'basicSalary', e.target.value)}
                      placeholder="18000"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Car Plate No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Car Plate No
                    </label>
                    <div className="relative">
                      <Car size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={director.carPlateNo}
                        onChange={(e) => handleUpdateDirector(dIndex, 'carPlateNo', e.target.value)}
                        placeholder="WYY 8888"
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Car EMI or Cash Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Car Purchase Scheme
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateDirector(dIndex, 'carPurchaseType', 'emi')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          director.carPurchaseType === 'emi'
                            ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        EMI (Installment)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDirector(dIndex, 'carPurchaseType', 'cash')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          director.carPurchaseType === 'cash'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Cash (Paid)
                      </button>
                    </div>
                  </div>

                  {/* Car Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Car {director.carPurchaseType === 'cash' ? 'Cash Total' : 'Monthly EMI'} Amount ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={director.carAmount}
                      onChange={(e) => handleUpdateDirector(dIndex, 'carAmount', e.target.value)}
                      placeholder={director.carPurchaseType === 'cash' ? '250000' : '3800'}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* OTHER DOCUMENTS UPLOAD (MULTIPLE NAME + FILE UPLOAD) */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 m-0">Other Documents Upload</h4>
                      <p className="text-[11px] text-slate-500 m-0">
                        Upload additional supporting documents for this director (Appointment letter, board resolution, tax clearance, etc.).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddOtherDocument(dIndex)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>+ Add Document</span>
                    </button>
                  </div>

                  {director.otherDocuments && director.otherDocuments.length > 0 ? (
                    <div className="space-y-2.5">
                      {director.otherDocuments.map((doc, docIndex) => (
                        <div
                          key={doc.id || docIndex}
                          className="flex flex-col sm:flex-row items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-200"
                        >
                          {/* Document Name / Title */}
                          <div className="w-full sm:w-1/3">
                            <input
                              type="text"
                              value={doc.name}
                              onChange={(e) => handleUpdateOtherDocName(dIndex, docIndex, e.target.value)}
                              placeholder="Document Title (e.g. Board Resolution)"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                            />
                          </div>

                          {/* File Upload */}
                          <div className="w-full sm:flex-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => document.getElementById(`other-doc-file-input-${dIndex}-${docIndex}`)?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer flex-1 truncate text-left"
                            >
                              <FileSpreadsheet size={14} className="text-purple-600 shrink-0" />
                              <span className="truncate">
                                {doc.fileName ? `${doc.fileName} (${doc.fileSize || 'File'})` : 'Upload File (PDF/Image)'}
                              </span>
                            </button>
                            <input
                              id={`other-doc-file-input-${dIndex}-${docIndex}`}
                              type="file"
                              accept="image/*,application/pdf,.doc,.docx"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleOtherDocFileUpload(dIndex, docIndex, e)}
                              className="hidden"
                            />

                            {doc.fileData && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({ name: doc.fileName || doc.name, url: doc.fileData, type: doc.fileType })}
                                className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer"
                                title="Preview Document"
                              >
                                <Eye size={13} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveOtherDoc(dIndex, docIndex)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border-0 bg-transparent cursor-pointer"
                              title="Delete Document"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic bg-white/60 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                      No additional documents uploaded for this director. Click &quot;+ Add Document&quot; if needed.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM FORM ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <Link
            href="/superadmin/companies/registered"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center no-underline"
          >
            Cancel &amp; Return
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-md hover:shadow-lg transition-all cursor-pointer border-0 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving to LocalStorage...' : editId ? 'Save & Update Company' : 'Register & Save Company'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* FILE PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-300 relative flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#0b4da2]" />
                <h3 className="text-sm font-bold text-slate-900 m-0 truncate max-w-md">
                  {previewFile.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 flex-1 overflow-auto flex items-center justify-center min-h-[300px] bg-slate-100 rounded-xl my-3">
              {previewFile.url.startsWith('data:image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : previewFile.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[60vh] rounded-lg border-0"
                />
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <FileText size={48} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-xs text-slate-700 m-0">{previewFile.name}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Binary document file stored locally.</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Document stored in LocalStorage</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#22a34a] hover:bg-[#1b843c] text-white shadow-xs transition-colors no-underline cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download File</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateCompanyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CreateCompanyFormContent />
    </Suspense>
  );
}
