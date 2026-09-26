'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Globe2,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Printer,
  Sparkles,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Company, CompanyDirector, DirectorDocument, DirectorExcelDocument, resolveFileUrl } from '@/lib/companies';
import {
  fetchCompaniesFromBackend,
  getCompanyById,
  getStoredCompanies,
  subscribeToCompanyChanges,
} from '@/lib/companyStorage';
import ExcelSheetEditorModal from '@/components/ExcelSheetEditorModal';
import WordDocumentEditorModal from '@/components/WordDocumentEditorModal';

export default function SuperAdminCompanyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id ? decodeURIComponent(params.id as string) : '';

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExcelDoc, setSelectedExcelDoc] = useState<DirectorExcelDocument | null>(null);
  const [selectedWordDoc, setSelectedWordDoc] = useState<DirectorExcelDocument | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string;
    type?: string;
  } | null>(null);

  // Load Company Data
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const loadData = () => {
      // 1. Try local storage first
      const found = getCompanyById(companyId);
      if (found) {
        setCompany(found);
        setLoading(false);
      }

      // 2. Fetch fresh from backend and update if matched
      fetchCompaniesFromBackend()
        .then((list) => {
          const fresh = list.find(
            (c) =>
              c.id.toLowerCase() === companyId.toLowerCase() ||
              c.roc.toLowerCase() === companyId.toLowerCase() ||
              c.id === companyId ||
              c.roc === companyId
          );
          if (fresh) {
            setCompany(fresh);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    loadData();

    // Listen to updates from other pages
    const unsubscribe = subscribeToCompanyChanges(() => {
      const match = getCompanyById(companyId);
      if (match) {
        setCompany(match);
      }
    });

    return () => unsubscribe();
  }, [companyId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading corporate profile &amp; directors...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Building2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Company Record Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The requested company ID &quot;<span className="font-mono font-semibold">{companyId}</span>&quot; does not exist in the employer registry or may have been deleted.
        </p>
        <div className="pt-2">
          <Link
            href="/superadmin/companies"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] text-white hover:bg-[#083c80] transition-colors shadow-xs no-underline"
          >
            <ArrowLeft size={14} />
            <span>Return to Companies Management</span>
          </Link>
        </div>
      </div>
    );
  }

  const directors = company.directors || [];
  const currency = company.currency || 'MYR';
  const language = company.language || 'English';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link
              href="/superadmin/companies"
              className="hover:text-[#0b4da2] transition-colors no-underline font-medium text-slate-600"
            >
              Companies Management
            </Link>
            <span>/</span>
            <Link
              href="/superadmin/companies/registered"
              className="hover:text-[#0b4da2] transition-colors no-underline font-medium text-slate-600"
            >
              Registered Directory
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 truncate max-w-xs">{company.name}</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 m-0">
            <span>{company.name}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {company.tag || 'Verified JIM'}
            </span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/superadmin/companies/registered"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors no-underline"
          >
            <ArrowLeft size={14} />
            <span>Back to List</span>
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Print Company Profile"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print</span>
          </button>

          <Link
            href={`/superadmin/companies/create?id=${encodeURIComponent(company.id)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0b4da2] hover:bg-[#083c80] text-white shadow-2xs transition-colors no-underline cursor-pointer"
          >
            <Edit2 size={14} />
            <span>Edit Company</span>
          </Link>
        </div>
      </div>

      {/* Corporate Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Foreign Worker */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Foreign Worker
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {company.totalWorkers ? company.totalWorkers.toLocaleString() : '0'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Approved Workforce</span>
          </div>
        </div>

        {/* Directors & CEOs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Company Directors
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {directors.length}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Registered Executives</span>
          </div>
        </div>

        {/* Currency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Operating Currency
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {currency}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Transactional Code</span>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Globe2 size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              System Language
            </span>
            <span className="text-xl font-bold text-slate-900 truncate block">
              {language}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Default Interface</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Company Details (Left) + Banking & Profile Info (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Organization Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Corporate Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100">
              <div className="w-20 h-20 rounded-2xl bg-white p-2.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                <img
                  src={resolveFileUrl(company.logo) || '/images/companies/gamuda.svg'}
                  alt={company.name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', '/images/companies/gamuda.svg');
                  }}
                />
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 m-0">{company.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {company.tag || 'Verified JIM'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>ROC / Registration: <strong className="font-mono text-slate-800">{company.roc}</strong></span>
                  <span>•</span>
                  <span>Sector: <strong className="text-slate-800">{company.sector}</strong></span>
                  <span>•</span>
                  <span>ID: <code className="text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{company.id}</code></span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Corporate Profile &amp; Mission</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 m-0">
                {company.description || 'Authorized corporate entity registered with the Malaysian Department of Immigration (JIM).'}
              </p>
            </div>

            {/* Address & Contact Information */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Official Registered Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Physical Address</span>
                    <span className="text-slate-800 font-medium leading-relaxed block mt-0.5">
                      {company.address || 'No physical corporate address recorded.'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <Phone size={16} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Official Phone</span>
                      <span className="text-slate-800 font-medium block mt-0.5 font-mono">
                        {company.phone || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <Mail size={16} className="text-purple-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Official Email</span>
                      <span className="text-slate-800 font-medium block mt-0.5">
                        {company.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Banking, Treasury & Governance */}
        <div className="space-y-6">
          {/* Corporate Banking Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Landmark size={18} className="text-[#0b4da2]" />
              <h3 className="text-sm font-bold text-slate-900 m-0">Corporate Treasury &amp; Banking</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
                <span className="text-[10px] text-blue-800 font-semibold uppercase block">Company Bank Name</span>
                <span className="text-sm font-bold text-blue-950 mt-0.5 block">
                  {company.bankName || 'Not specified'}
                </span>
              </div>

              {company.bankAccountName && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Company Account Name</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {company.bankAccountName}
                  </span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Bank Account Number</span>
                <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block tracking-wider">
                  {company.bankAccountNo || 'Not specified'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Currency</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block font-mono">
                    {currency}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Language</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                    {language}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULL COMPANY DIRECTORS & CEOS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck size={20} className="text-purple-600" />
              <h2 className="text-base font-bold text-slate-900 m-0">
                Registered Company Directors &amp; CEOs ({directors.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Complete executive profiles, identification records, vehicle allocations, and legal documentation.
            </p>
          </div>

          <Link
            href={`/superadmin/companies/create?id=${encodeURIComponent(company.id)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors no-underline"
          >
            <Edit2 size={13} />
            <span>Manage Directors</span>
          </Link>
        </div>

        {directors.length > 0 ? (
          <div className="space-y-5">
            {directors.map((dir, idx) => (
              <div
                key={dir.id || idx}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 hover:border-purple-300 transition-colors"
              >
                {/* Director Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 m-0">
                        {dir.name || 'Unnamed Director'}
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        Corporate Director / Chief Executive Officer
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                      <span className="text-slate-400 font-normal mr-1">Basic Salary:</span>
                      <span className="font-mono text-purple-700">
                        {currency} {dir.basicSalary ? Number(dir.basicSalary).toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Director Detailed Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Contact Phone</span>
                    <span className="text-slate-800 font-mono font-medium block mt-0.5">{dir.phone || 'N/A'}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Email Address</span>
                    <span className="text-slate-800 font-medium truncate block mt-0.5">{dir.email || 'N/A'}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">SOCSO Number</span>
                    <span className="text-slate-800 font-mono font-medium block mt-0.5">{dir.socsoNo || 'N/A'}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">EPF Number</span>
                    <span className="text-slate-800 font-mono font-medium block mt-0.5">{dir.epfNo || 'N/A'}</span>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Car Plate Number(s)</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {dir.carPlates && dir.carPlates.filter(Boolean).length > 0 ? (
                        dir.carPlates.filter(Boolean).map((plate, pIdx) => (
                          <span
                            key={pIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono font-bold text-xs text-slate-800"
                          >
                            <Car size={12} className="text-slate-500" />
                            {plate}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-800 font-mono font-bold block">{dir.carPlateNo || 'N/A'}</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Car Purchase Type</span>
                    <span className="text-slate-800 font-semibold capitalize block mt-0.5">
                      {dir.carPurchaseType === 'cash' ? 'Cash (Paid)' : 'Monthly EMI'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      {dir.carPurchaseType === 'cash' ? 'Car Cash Total' : 'Monthly EMI Amount'}
                    </span>
                    <span className="text-slate-800 font-bold font-mono block mt-0.5">
                      {dir.carAmount ? `${currency} ${Number(dir.carAmount).toLocaleString()}` : 'N/A'}
                    </span>
                  </div>

                  {dir.carPurchaseType === 'emi' && (
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                      <span className="text-[10px] text-blue-600 font-semibold uppercase block">
                        Total Payment (EMI Commitment)
                      </span>
                      <span className="text-blue-900 font-bold font-mono block mt-0.5">
                        {dir.carTotalPayment ? `${currency} ${Number(dir.carTotalPayment).toLocaleString()}` : 'N/A'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Uploaded Documents for this Director */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 m-0">Identity &amp; Supporting Files</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* NID Card */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText size={18} className="text-blue-600 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold block text-slate-800 truncate">
                            NID: {dir.nidNo || 'Not specified'}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {dir.nidFile ? dir.nidFile.fileName : 'No file uploaded'}
                          </span>
                        </div>
                      </div>

                      {dir.nidFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ name: dir.nidFile!.fileName, url: resolveFileUrl(dir.nidFile!.fileData), type: dir.nidFile!.fileType })}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 border border-blue-200"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      )}
                    </div>

                    {/* Passport */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileCheck size={18} className="text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold block text-slate-800 truncate">
                            Passport: {dir.passportNo || 'Not specified'}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {dir.passportFile ? dir.passportFile.fileName : 'No file uploaded'}
                          </span>
                        </div>
                      </div>

                      {dir.passportFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ name: dir.passportFile!.fileName, url: resolveFileUrl(dir.passportFile!.fileData), type: dir.passportFile!.fileType })}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 border border-emerald-200"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      )}
                    </div>

                    {/* Other Supporting Documents */}
                    {dir.otherDocuments && dir.otherDocuments.map((doc, docIdx) => (
                      <div
                        key={doc.id || docIdx}
                        className="p-3 rounded-xl bg-purple-50/50 border border-purple-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileSpreadsheet size={18} className="text-purple-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold block text-slate-800 truncate">
                              {doc.name || 'Additional Document'}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {doc.fileName ? `${doc.fileName} (${doc.fileSize || 'File'})` : 'No file'}
                            </span>
                          </div>
                        </div>

                        {doc.fileData && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile({ name: doc.fileName || doc.name, url: resolveFileUrl(doc.fileData), type: doc.fileType })}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 border border-purple-300"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Excel Spreadsheets & Word Documents */}
                    {dir.excelDocuments &&
                      dir.excelDocuments.map((xDoc, xIdx) => {
                        const isWord =
                          xDoc.category === 'word' ||
                          xDoc.fileName?.toLowerCase().endsWith('.docx') ||
                          xDoc.fileName?.toLowerCase().endsWith('.doc');

                        return (
                          <div
                            key={xDoc.id || xIdx}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              isWord ? 'bg-blue-50/60 border-blue-200' : 'bg-emerald-50/70 border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {isWord ? (
                                <div className="w-6 h-6 rounded bg-[#2b579a] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                                  W
                                </div>
                              ) : (
                                <FileSpreadsheet size={18} className="text-emerald-700 shrink-0" />
                              )}
                              <div className="truncate">
                                <span className="font-semibold block text-slate-800 truncate">
                                  {xDoc.name || (isWord ? 'Word Document' : 'Excel Spreadsheet')}
                                </span>
                                <span className="text-[11px] text-slate-500 block truncate">
                                  {xDoc.fileName} {xDoc.fileSize ? `(${xDoc.fileSize})` : ''}{' '}
                                  {isWord ? '• Word Document' : '• Spreadsheet'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Eye Icon to View Document */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isWord) {
                                    setSelectedWordDoc(xDoc);
                                  } else {
                                    setSelectedExcelDoc(xDoc);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 border ${
                                  isWord
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300'
                                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300'
                                }`}
                                title={isWord ? 'View Document in Microsoft Word' : 'View Spreadsheet in Microsoft Excel'}
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </button>

                              {xDoc.fileData && (
                                <a
                                  href={resolveFileUrl(xDoc.fileData)}
                                  download={xDoc.fileName}
                                  className={`px-2.5 py-1.5 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 border no-underline bg-white ${
                                    isWord
                                      ? 'text-blue-800 hover:bg-blue-50 border-blue-300'
                                      : 'text-emerald-800 hover:bg-emerald-50 border-emerald-300'
                                  }`}
                                >
                                  <Download size={12} />
                                  <span>Download</span>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
            <User size={36} className="text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 m-0">No Directors or CEOs Registered</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto m-0">
              This company currently does not have any executive directors or CEOs recorded in the system.
            </p>
            <div className="pt-2">
              <Link
                href={`/superadmin/companies/create?id=${encodeURIComponent(company.id)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0b4da2] text-white hover:bg-[#083c80] transition-colors no-underline"
              >
                <Edit2 size={13} />
                <span>Add Directors</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* DOCUMENT FULLSCREEN / POPUP PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 truncate">
                <FileText size={18} className="text-blue-600 shrink-0" />
                <span className="font-bold text-sm text-slate-900 truncate">
                  {previewFile.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200"
                  title="Download File"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-0 bg-transparent cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50 rounded-xl my-3">
              {previewFile.url.startsWith('data:image/') || previewFile.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(previewFile.url) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : previewFile.url.startsWith('data:application/pdf') || previewFile.type?.includes('pdf') || /\.pdf(\?.*)?$/i.test(previewFile.url) ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[65vh] rounded-lg border border-slate-300"
                />
              ) : (
                <div className="text-center py-10 space-y-3">
                  <FileSpreadsheet size={48} className="text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-semibold">{previewFile.name}</p>
                  <a
                    href={previewFile.url}
                    download={previewFile.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0b4da2] text-white hover:bg-[#083c80] transition-colors no-underline"
                  >
                    <Download size={14} />
                    <span>Download File to View</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
              <span>Previewing uploaded document attachment</span>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Sheet Viewer Modal */}
      {selectedExcelDoc && (
        <ExcelSheetEditorModal
          isOpen={!!selectedExcelDoc}
          onClose={() => setSelectedExcelDoc(null)}
          onSave={() => setSelectedExcelDoc(null)}
          initialDocument={selectedExcelDoc}
        />
      )}

      {/* Word Document Viewer Modal */}
      {selectedWordDoc && (
        <WordDocumentEditorModal
          isOpen={!!selectedWordDoc}
          onClose={() => setSelectedWordDoc(null)}
          onSave={() => setSelectedWordDoc(null)}
          initialDocument={selectedWordDoc}
        />
      )}
    </div>
  );
}
