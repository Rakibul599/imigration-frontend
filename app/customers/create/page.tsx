'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  FileUp,
  Image as ImageIcon,
  KeyRound,
  Landmark,
  Mail,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getStoredCompanies } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import {
  CustomerDocument,
  CustomerRecord,
  createCustomer,
  fetchCustomerById,
  updateCustomer,
} from '@/lib/customerStorage';

function CreateCustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');
  const editId = searchParams.get('id');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields matching screenshot & requirements
  const [fullName, setFullName] = useState('');
  const [nidNo, setNidNo] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [leavingAddress, setLeavingAddress] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [role, setRole] = useState('Sales');
  const [passportNo, setPassportNo] = useState('');
  const [totalPayment, setTotalPayment] = useState('');
  const [companyId, setCompanyId] = useState(companyParam || '');
  const [status, setStatus] = useState<'active' | 'pending' | 'inactive'>('active');

  // Media & Files
  const [profilePic, setProfilePic] = useState<string>('');
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);

  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  // Load companies & existing customer if editing
  useEffect(() => {
    const comps = getStoredCompanies();
    setCompanies(comps);

    if (companyParam && comps.length > 0) {
      const match = comps.find(
        (c) =>
          c.id.toLowerCase() === companyParam.toLowerCase() ||
          c.name.toLowerCase().includes(companyParam.toLowerCase())
      );
      if (match) {
        setActiveCompany(match);
        setCompanyId(match.id);
      }
    } else if (comps.length > 0) {
      setActiveCompany(comps[0]);
      if (!companyId) setCompanyId(comps[0].id);
    }
  }, [companyParam]);

  useEffect(() => {
    if (editId) {
      fetchCustomerById(editId).then((cust) => {
        if (cust) {
          setFullName(cust.full_name || '');
          setNidNo(cust.nid_no || '');
          setWorkerPhone(cust.worker_phone || '');
          setGuardianPhone(cust.guardian_phone || '');
          setLeavingAddress(cust.leaving_address || '');
          setEmail(cust.email || '');
          setUsername(cust.username || '');
          setPassword(cust.password || '');
          setBankAccountName(cust.bank_account_name || '');
          setBankAccountNumber(cust.bank_account_number || '');
          setRole(cust.role || 'Sales');
          setPassportNo(cust.passport_no || '');
          setTotalPayment(cust.total_payment || '');
          setCompanyId(cust.company_id || companyParam || '');
          setProfilePic(cust.profile_pic || '');
          setDocuments(Array.isArray(cust.documents) ? cust.documents : []);
          setStatus(cust.status || 'active');
        }
      });
    }
  }, [editId, companyParam]);

  // Handle Profile Picture Upload
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfilePic(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Multiple File Upload for NID / Passport Documents
  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const sizeFormatted =
          file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(0)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        const newDoc: CustomerDocument = {
          name: file.name,
          size: sizeFormatted,
          type: file.type,
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        };

        setDocuments((prev) => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) {
      e.target.value = '';
    }
  };

  const removeDocument = (indexToRemove: number) => {
    setDocuments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFeedback({ type: 'error', message: 'Full Name is required.' });
      return;
    }
    if (!nidNo.trim()) {
      setFeedback({ type: 'error', message: 'NID No is required.' });
      return;
    }
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Email is required.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const payload: Partial<CustomerRecord> = {
      full_name: fullName.trim().toUpperCase(),
      nid_no: nidNo.trim(),
      worker_phone: workerPhone.trim(),
      guardian_phone: guardianPhone.trim(),
      leaving_address: leavingAddress.trim(),
      email: email.trim(),
      username: username.trim(),
      password: password.trim(),
      bank_account_name: bankAccountName.trim().toUpperCase(),
      bank_account_number: bankAccountNumber.trim(),
      role: role.trim() || 'Sales',
      passport_no: passportNo.trim().toUpperCase(),
      total_payment: totalPayment.trim(),
      company_id: companyId,
      profile_pic: profilePic,
      documents: documents,
      status: status,
    };

    try {
      if (editId) {
        await updateCustomer(editId, payload);
        setFeedback({
          type: 'success',
          message: `Customer profile for "${payload.full_name}" was updated successfully!`,
        });
      } else {
        await createCustomer(payload);
        setFeedback({
          type: 'success',
          message: `Customer "${payload.full_name}" created successfully in database!`,
        });
      }

      setTimeout(() => {
        router.push(`/customers?company=${encodeURIComponent(companyId || companyParam || 'gamuda')}`);
      }, 1000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save customer profile. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen flex flex-col justify-between">
      <Navbar />

      <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-4">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <ChevronRight size={13} />
          <Link href="/companies" className="hover:text-blue-600 transition-colors">
            Employers
          </Link>
          <ChevronRight size={13} />
          <Link
            href={`/customers?company=${encodeURIComponent(companyId || companyParam || 'gamuda')}`}
            className="hover:text-blue-600 transition-colors"
          >
            Customer Management
          </Link>
          <ChevronRight size={13} />
          <span className="text-[#0b4da2] font-bold">
            {editId ? 'Edit Customer' : 'Create Customer'}
          </span>
        </div>

        {/* Back Link and Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/customers?company=${encodeURIComponent(companyId || companyParam || 'gamuda')}`}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors shadow-xs"
              title="Return to Customer Directory"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                {editId ? 'Update Customer Profile' : 'Register New Customer'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete biometric worker records, banking credentials &amp; identification documents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-3 py-1.5 rounded-xl font-semibold">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Full Page Customer Form (Direct)</span>
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <CheckCircle2 size={18} className={feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* The Main Customer Form Container - Matching User Screenshot */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: User Details (Replicating exact layout from user screenshot) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            {/* Header matching screenshot */}
            <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">User Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter personal identification, phone contacts, and banking info.
                </p>
              </div>

              {/* Profile Avatar Quick Upload in header */}
              <div className="flex items-center gap-3">
                <div
                  onClick={() => profileInputRef.current?.click()}
                  className="w-12 h-12 rounded-full bg-blue-50 border-2 border-dashed border-blue-300 hover:border-blue-500 flex items-center justify-center cursor-pointer overflow-hidden transition-all shadow-xs group"
                  title="Upload profile picture"
                >
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={18} className="text-[#0b4da2] group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block">Profile Picture</span>
                  <button
                    type="button"
                    onClick={() => profileInputRef.current?.click()}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer border-0 bg-transparent p-0"
                  >
                    {profilePic ? 'Change Photo' : 'Upload Avatar'}
                  </button>
                </div>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Grid of Inputs exactly matching user screenshot fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
              {/* Row 1, Col 1: Full Name * */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="full_name">
                  Full Name <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  id="full_name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. MD TARIQUL ISLAM"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-medium"
                />
              </div>

              {/* Row 1, Col 2: NID No * */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="nid_no">
                  NID No <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  id="nid_no"
                  type="text"
                  required
                  value={nidNo}
                  onChange={(e) => setNidNo(e.target.value)}
                  placeholder="e.g. 19952691234567890"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-mono"
                />
              </div>

              {/* Row 1, Col 3: Worker Phone */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="worker_phone">
                  Worker Phone
                </label>
                <input
                  id="worker_phone"
                  type="text"
                  value={workerPhone}
                  onChange={(e) => setWorkerPhone(e.target.value)}
                  placeholder="e.g. +601123456789"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-medium"
                />
              </div>

              {/* Row 2, Col 1: Guardian Phone */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="guardian_phone">
                  Guardian Phone
                </label>
                <input
                  id="guardian_phone"
                  type="text"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="e.g. +8801711223344"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-medium"
                />
              </div>

              {/* Row 2, Col 2: Leaving Address */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="leaving_address">
                  Leaving Address
                </label>
                <input
                  id="leaving_address"
                  type="text"
                  value={leavingAddress}
                  onChange={(e) => setLeavingAddress(e.target.value)}
                  placeholder="e.g. House 14, Road 5, Sector 3, Uttara, Dhaka"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-medium"
                />
              </div>

              {/* Row 2, Col 3: Email * */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="email">
                  Email <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. worker@example.com"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-medium"
                />
              </div>

              {/* Row 3, Col 1: Username * */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="username">
                  Username <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. tariqul95"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-mono"
                />
              </div>

              {/* Row 3, Col 2: Password * */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="password">
                  Password <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  id="password"
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security password"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-medium"
                />
              </div>

              {/* Row 3, Col 3: Bank Account Name * */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="bank_account_name">
                  Bank Account Name <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  id="bank_account_name"
                  type="text"
                  required
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="e.g. MD TARIQUL ISLAM"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-medium"
                />
              </div>

              {/* Row 4, Col 1: Bank Account Number * */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="bank_account_number">
                  Bank Account Number <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  id="bank_account_number"
                  type="text"
                  required
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 1144789012345"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-mono"
                />
              </div>

              {/* Row 4, Col 2: Role * (Dropdown exactly matching screenshot) */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="role">
                  Role <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs cursor-pointer font-semibold"
                >
                  <option value="Sales">Sales</option>
                  <option value="Worker">Worker</option>
                  <option value="Customer">Customer</option>
                  <option value="Agent">Agent</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>

              {/* Row 4, Col 3: Passport No (Additional requested field) */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="passport_no">
                  Passport Number
                </label>
                <input
                  id="passport_no"
                  type="text"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value)}
                  placeholder="e.g. A04589231"
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-mono"
                />
              </div>

              {/* Row 5, Col 1: Total Payment (Right after Passport Number as requested) */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="total_payment">
                  Total Payment
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-400 pointer-events-none">
                    RM
                  </span>
                  <input
                    id="total_payment"
                    type="text"
                    value={totalPayment}
                    onChange={(e) => setTotalPayment(e.target.value)}
                    placeholder="e.g. 5,500.00"
                    className="w-full h-10 pl-10 pr-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Row 5, Col 1: Associated Employer / Company */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="company_id">
                  Assigned Employer Entity
                </label>
                <select
                  id="company_id"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs cursor-pointer font-medium"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roc})
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 5, Col 2: Account Status */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5" htmlFor="status">
                  Record Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-2xs cursor-pointer font-semibold"
                >
                  <option value="active">Active &amp; Verified</option>
                  <option value="pending">Pending Document Verification</option>
                  <option value="inactive">Inactive / On Hold</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: NID & Passport Multiple File Uploads (As requested by user) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                  <FileText size={18} className="text-[#0b4da2]" />
                  <span>NID &amp; Passport Documents (Multiple File Upload)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload NID Front &amp; Back images, Passport bio-page, visa slips, and work contracts (PDF, JPG, PNG).
                </p>
              </div>

              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#0b4da2] rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-200 self-start sm:self-auto"
              >
                <Upload size={14} />
                <span>Choose Multiple Files</span>
              </button>
              <input
                ref={docInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleDocumentsChange}
                className="hidden"
              />
            </div>

            {/* Drop Zone Area */}
            <div
              onClick={() => docInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 rounded-xl p-6 text-center cursor-pointer transition-all mb-4"
            >
              <FileUp size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700 m-0">
                Click or drag &amp; drop NID and Passport files here
              </p>
              <p className="text-[11px] text-slate-400 m-0 mt-1">
                Supports multiple uploads simultaneously (NID Front, NID Back, Passport, Visa)
              </p>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {doc.dataUrl && doc.type?.startsWith('image/') ? (
                        <img
                          src={doc.dataUrl}
                          alt=""
                          className="w-8 h-8 object-cover rounded-md border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="font-bold text-slate-800 block truncate" title={doc.name}>
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {doc.size || 'Uploaded'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer bg-transparent border-0"
                      title="Remove file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-slate-400 italic">
                No documents uploaded yet. Multiple files can be attached above.
              </div>
            )}
          </div>

          {/* Form Action Buttons Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href={`/customers?company=${encodeURIComponent(companyId || companyParam || 'gamuda')}`}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors no-underline cursor-pointer"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#22a34a] hover:bg-[#1b843c] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={15} />
              <span>{isSubmitting ? 'Saving Customer...' : editId ? 'Save Changes' : 'Create Customer'}</span>
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

export default function CreateCustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500">
          Loading Customer Form...
        </div>
      }
    >
      <CreateCustomerContent />
    </Suspense>
  );
}
