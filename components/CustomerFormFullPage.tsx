'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
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
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import {
  CustomerDocument,
  CustomerRecord,
  WorkingSector,
  createCustomer,
  createWorkingSector,
  fetchCustomerById,
  fetchWorkingSectors,
  getFileUrl,
  updateCustomer,
} from '@/lib/customerStorage';
import { getMasterAdminUser } from '@/lib/auth';

interface CustomerFormFullPageProps {
  portalType: 'superadmin' | 'masteradmin';
  backUrl: string;
}

function CustomerFormContent({ portalType, backUrl }: CustomerFormFullPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditing = Boolean(editId);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(Boolean(editId));

  // Form states strictly matching user requirements
  const [fullName, setFullName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [passportFile, setPassportFile] = useState<string>('');
  const [passportFileName, setPassportFileName] = useState('');
  const [nidNo, setNidNo] = useState('');
  const [nidFile, setNidFile] = useState<string>('');
  const [nidFileName, setNidFileName] = useState('');
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
  const [overtime, setOvertime] = useState('RM 15.00 / hr'); // "our time"
  const [profilePic, setProfilePic] = useState<string>('');
  const [profilePicName, setProfilePicName] = useState('');
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [status, setStatus] = useState<'active' | 'pending' | 'inactive'>('active');

  // Sector management states
  const [isAddingNewSector, setIsAddingNewSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [isSavingSector, setIsSavingSector] = useState(false);

  // UI feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const profilePicInputRef = useRef<HTMLInputElement | null>(null);
  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const nidInputRef = useRef<HTMLInputElement | null>(null);

  // Load companies & sectors
  useEffect(() => {
    async function init() {
      try {
        const [allComps, secList] = await Promise.all([
          fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
          fetchWorkingSectors(),
        ]);

        let finalComps = allComps;
        if (portalType === 'masteradmin') {
          const user = getMasterAdminUser();
          const allowed = Array.isArray(user?.assigned_companies) ? user!.assigned_companies : [];
          finalComps = allComps.filter((c) =>
            allowed.some((id) => id.toLowerCase() === c.id.toLowerCase())
          );
        }

        setCompanies(finalComps);
        setSectors(secList);

        if (!companyId && finalComps.length > 0) {
          setCompanyId(finalComps[0].id);
        }
        if (!workingSector && secList.length > 0) {
          setWorkingSector(secList[0].name);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, [portalType]);

  // Load customer if editing
  useEffect(() => {
    if (!editId) return;

    setIsLoadingCustomer(true);
    fetchCustomerById(editId)
      .then((cust) => {
        if (cust) {
          setFullName(cust.full_name || '');
          setCompanyId(cust.company_id || '');
          setPassportNo(cust.passport_no || '');
          setPassportFile(cust.passport_file || '');
          setPassportFileName(cust.passport_file ? 'Existing Passport Document' : '');
          setNidNo(cust.nid_no || '');
          setNidFile(cust.nid_file || '');
          setNidFileName(cust.nid_file ? 'Existing NID Document' : '');
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
          setProfilePic(cust.profile_pic || cust.profile_image || '');
          setProfilePicName(cust.profile_pic || cust.profile_image ? 'Existing Profile Image' : '');
          setDocuments(Array.isArray(cust.documents) ? cust.documents : []);
          setStatus(cust.status || 'active');
        }
      })
      .catch((err) => {
        setFeedback({ type: 'error', message: 'Failed to load customer profile.' });
      })
      .finally(() => {
        setIsLoadingCustomer(false);
      });
  }, [editId]);

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

  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPassportFile(dataUrl);
      setPassportFileName(file.name);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to process passport file.' });
    }
  };

  const handleNidUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setNidFile(dataUrl);
      setNidFileName(file.name);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to process NID file.' });
    }
  };

  // Add Document row to multiple documents list
  const handleAddDocumentRow = () => {
    setDocuments((prev) => [
      ...prev,
      {
        name: `Document ${prev.length + 1}`,
        url: '',
        dataUrl: '',
        size: '',
        type: 'application/pdf',
      },
    ]);
  };

  const handleDocumentFileChange = async (index: number, file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const sizeStr = file.size < 1024 * 1024 
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

  const handleDocumentNameChange = (index: number, name: string) => {
    setDocuments((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name };
      return copy;
    });
  };

  const handleRemoveDocumentRow = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Add new working sector to backend
  const handleAddNewSector = async () => {
    if (!newSectorName.trim()) return;
    setIsSavingSector(true);
    try {
      const created = await createWorkingSector(newSectorName.trim());
      setSectors((prev) => [...prev, created]);
      setWorkingSector(created.name);
      setNewSectorName('');
      setIsAddingNewSector(false);
      setFeedback({ type: 'success', message: `New sector "${created.name}" created and selected!` });
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
      profile_pic: profilePic,
      profile_image: profilePic,
      documents: documents,
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
              <div className="relative">
                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-[#0b4da2] focus:bg-white cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roc || 'Verified'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Passport & NID with Dedicated File Uploads */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileCheck2 size={15} className="text-[#0b4da2]" />
            <span>Passport &amp; National Identity (NID)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Passport Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Passport Number
              </label>
              <input
                type="text"
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value)}
                placeholder="e.g. A01234567"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
              />

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Passport Upload (Image / PDF)
                </label>
                <input
                  type="file"
                  ref={passportInputRef}
                  onChange={handlePassportUpload}
                  accept="image/*,.pdf"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => passportInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#0b4da2] text-slate-700 hover:text-[#0b4da2] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>{passportFile ? 'Replace Passport File' : 'Choose Passport File'}</span>
                  </button>
                  {passportFile && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 truncate max-w-[160px]">
                      <Check size={12} className="shrink-0" />
                      <span className="truncate">{passportFileName || 'Uploaded'}</span>
                    </div>
                  )}
                  {passportFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setPassportFile('');
                        setPassportFileName('');
                      }}
                      className="text-red-500 hover:text-red-700 p-1 bg-transparent border-0 cursor-pointer"
                      title="Remove passport upload"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* NID Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                National ID (NID / IC No.) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nidNo}
                onChange={(e) => setNidNo(e.target.value)}
                placeholder="e.g. 1988269123456"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#0b4da2]"
              />

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  NID Upload (Image / PDF)
                </label>
                <input
                  type="file"
                  ref={nidInputRef}
                  onChange={handleNidUpload}
                  accept="image/*,.pdf"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => nidInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#0b4da2] text-slate-700 hover:text-[#0b4da2] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>{nidFile ? 'Replace NID File' : 'Choose NID File'}</span>
                  </button>
                  {nidFile && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 truncate max-w-[160px]">
                      <Check size={12} className="shrink-0" />
                      <span className="truncate">{nidFileName || 'Uploaded'}</span>
                    </div>
                  )}
                  {nidFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setNidFile('');
                        setNidFileName('');
                      }}
                      className="text-red-500 hover:text-red-700 p-1 bg-transparent border-0 cursor-pointer"
                      title="Remove NID upload"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dates & Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#0b4da2]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Bangladesh, Indonesia"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#0b4da2]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Passport Issue Date
              </label>
              <input
                type="date"
                value={passportIssueDate}
                onChange={(e) => setPassportIssueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#0b4da2]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Passport Expire Date
              </label>
              <input
                type="date"
                value={passportExpireDate}
                onChange={(e) => setPassportExpireDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#0b4da2]"
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

        {/* Card 4: Working Sector & Compensation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-[#0b4da2]" />
              <span>Working Sector &amp; Compensation</span>
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
              {sectors.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
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
                Our Time (Overtime Rate / Work Hours)
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

        {/* Card 5: Multiple Upload Documents (Name + File) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText size={15} className="text-[#0b4da2]" />
              <span>Upload Documents (Multiple with Document Name)</span>
            </div>
            <button
              type="button"
              onClick={handleAddDocumentRow}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b4da2] hover:text-[#072a6b] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Document Attachment</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400 bg-slate-50/50">
              <FileText size={28} className="mx-auto text-slate-300 mb-1.5" />
              <p className="text-xs font-medium m-0">No additional document attachments added.</p>
              <button
                type="button"
                onClick={handleAddDocumentRow}
                className="mt-2 text-xs font-bold text-[#0b4da2] hover:underline bg-transparent border-0 cursor-pointer"
              >
                + Add Document with Custom Name &amp; File
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  {/* Document Name */}
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Document Name #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={doc.name}
                      onChange={(e) => handleDocumentNameChange(idx, e.target.value)}
                      placeholder="e.g. Medical Fitness Certificate, Police Clearance, Visa Copy"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#0b4da2]"
                    />
                  </div>

                  {/* File Upload Button */}
                  <div className="sm:w-72">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Attachment File
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#0b4da2] text-slate-700 hover:text-[#0b4da2] text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0">
                        <Upload size={12} />
                        <span>{doc.url ? 'Replace File' : 'Choose File'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleDocumentFileChange(idx, f);
                          }}
                        />
                      </label>
                      {doc.url ? (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 truncate flex-1 font-mono">
                          {doc.size || 'Ready'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No file chosen</span>
                      )}
                    </div>
                  </div>

                  {/* Delete Row */}
                  <div className="sm:pt-5">
                    <button
                      type="button"
                      onClick={() => handleRemoveDocumentRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                      title="Remove document row"
                    >
                      <Trash2 size={15} />
                    </button>
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
