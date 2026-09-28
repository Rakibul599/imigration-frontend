'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  Edit2,
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
  ShieldAlert,
  ShieldCheck,
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
import { getMasterAdminUser, hasCompanyAccess } from '@/lib/auth';

export default function MasterAdminCompanyDetailsPage() {
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

  const currentUser = getMasterAdminUser();
  const isAuthorized = hasCompanyAccess(companyId);

  // Load Company Data
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const loadData = () => {
      const found = getCompanyById(companyId);
      if (found) {
        setCompany(found);
        setLoading(false);
      }

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
        <div className="w-10 h-10 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading corporate profile &amp; records...</p>
      </div>
    );
  }

  // Permission Check
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your Master Administrator profile does not have permission to view or manage &quot;
          <span className="font-mono font-semibold">{companyId}</span>&quot;. You can only access companies assigned to your scope by Super Admin.
        </p>
        <div className="pt-2">
          <Link
            href="/masteradmin/companies"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b4da2] text-white hover:bg-[#083c80] transition-colors shadow-xs no-underline"
          >
            <ArrowLeft size={14} />
            <span>Return to Permitted Companies</span>
          </Link>
        </div>
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
          The requested company ID &quot;<span className="font-mono font-semibold">{companyId}</span>&quot; does not exist in the employer registry.
        </p>
        <div className="pt-2">
          <Link
            href="/masteradmin/companies"
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link
              href="/masteradmin/companies"
              className="hover:text-[#0b4da2] transition-colors no-underline font-medium text-slate-600"
            >
              Permitted Companies
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 truncate max-w-xs">{company.name}</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 m-0">
            <span>{company.name}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0b4da2] border border-blue-200">
              {company.tag || 'Permitted Scope'}
            </span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/masteradmin/companies"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors no-underline"
          >
            <ArrowLeft size={14} />
            <span>Back to Companies</span>
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Profile</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Foreign Workers
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {company.totalWorkers ? company.totalWorkers.toLocaleString() : '0'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Approved Workforce</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Board Directors
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {directors.length}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Registered Executives</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Briefcase size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Industry Sector
            </span>
            <span className="text-xs font-bold text-slate-900 block truncate max-w-[150px]">
              {company.sector}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Verified Scope</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              ROC Registration
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono block">
              {company.roc || 'ROC-PENDING'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">SSM Malaysia Record</span>
          </div>
        </div>
      </div>

      {/* Corporate Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 m-0">Corporate Overview</h2>
            <p className="text-xs text-slate-600 leading-relaxed m-0">
              {company.description || 'No corporate description entered for this company.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5 font-medium">Registered Address</span>
                <span className="text-slate-800 font-semibold">{company.address || 'Address not registered.'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5 font-medium">Contact Phone</span>
                <span className="text-slate-800 font-semibold">{company.phone || 'Phone not registered.'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5 font-medium">Official Email</span>
                <span className="text-slate-800 font-semibold">{company.email || 'Email not registered.'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5 font-medium">Banking Details</span>
                <span className="text-slate-800 font-semibold font-mono">
                  {company.bankName ? `${company.bankName} - ${company.bankAccountNo || ''}` : 'No bank account added.'}
                </span>
              </div>
            </div>
          </div>

          {/* Board of Directors */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 m-0">Board of Directors ({directors.length})</h2>
            </div>

            {directors.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No corporate directors registered for this employer.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {directors.map((dir) => (
                  <div key={dir.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="font-bold text-slate-900">{dir.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">NID: {dir.nidNo}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Phone: {dir.phone || '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Documents */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 m-0">Corporate Documents</h2>
            <p className="text-xs text-slate-500 m-0">
              Word &amp; Excel sheets associated with this employer
            </p>

            {(() => {
              const allDocs: DirectorExcelDocument[] = directors.flatMap((d) => d.excelDocuments || []);
              if (allDocs.length === 0) {
                return (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No Excel or Word documents uploaded yet.
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {allDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        if (doc.category === 'word') setSelectedWordDoc(doc);
                        else setSelectedExcelDoc(doc);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {doc.category === 'word' ? (
                          <FileText size={16} className="text-blue-600 shrink-0" />
                        ) : (
                          <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                        )}
                        <span className="font-bold text-slate-800 truncate">{doc.name}</span>
                      </div>
                      <Eye size={14} className="text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Excel Sheet Viewer Modal */}
      {selectedExcelDoc && (
        <ExcelSheetEditorModal
          isOpen={true}
          onClose={() => setSelectedExcelDoc(null)}
          onSave={() => setSelectedExcelDoc(null)}
          initialDocument={selectedExcelDoc}
        />
      )}

      {/* Word Document Viewer Modal */}
      {selectedWordDoc && (
        <WordDocumentEditorModal
          isOpen={true}
          onClose={() => setSelectedWordDoc(null)}
          onSave={() => setSelectedWordDoc(null)}
          initialDocument={selectedWordDoc}
        />
      )}
    </div>
  );
}
