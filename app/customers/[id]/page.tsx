'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Globe,
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
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CustomerRecord, fetchCustomerById } from '@/lib/customerStorage';
import { getStoredCompanies } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';

function CustomerDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const customerId = (params?.id as string) || searchParams.get('id');
  const companyParam = searchParams.get('company');

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url?: string } | null>(null);

  useEffect(() => {
    if (customerId) {
      setLoading(true);
      fetchCustomerById(customerId)
        .then((data) => {
          setCustomer(data);
          const comps = getStoredCompanies();
          if (data?.company_id) {
            const found = comps.find((c) => c.id.toLowerCase() === data.company_id?.toLowerCase());
            if (found) setActiveCompany(found);
          } else if (companyParam) {
            const found = comps.find((c) => c.id.toLowerCase() === companyParam.toLowerCase());
            if (found) setActiveCompany(found);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [customerId, companyParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-600">
              Loading customer dossier from database...
            </span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Customer Record Not Found</h2>
            <p className="text-xs text-slate-500 mb-6">
              The customer profile with ID #{customerId} could not be retrieved from the database.
            </p>
            <Link
              href={`/customers?company=${encodeURIComponent(companyParam || 'gamuda')}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0b4da2] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#083c80] transition-all no-underline"
            >
              <ArrowLeft size={14} />
              <span>Return to Customer Directory</span>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between font-sans">
      <Navbar />

      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-9">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-5 print:hidden">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <ChevronRight size={13} />
          <Link href="/companies" className="hover:text-blue-600 transition-colors">
            Employers
          </Link>
          <ChevronRight size={13} />
          {activeCompany && (
            <>
              <Link
                href={`/services?company=${encodeURIComponent(activeCompany.id)}`}
                className="hover:text-blue-600 transition-colors truncate max-w-[150px]"
              >
                {activeCompany.name}
              </Link>
              <ChevronRight size={13} />
            </>
          )}
          <Link
            href={`/customers?company=${encodeURIComponent(activeCompany?.id || companyParam || 'gamuda')}`}
            className="hover:text-blue-600 transition-colors"
          >
            Customer Management
          </Link>
          <ChevronRight size={13} />
          <span className="text-[#0b4da2] font-bold truncate max-w-[200px]">
            {customer.full_name}
          </span>
        </div>

        {/* Top Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <Link
              href={`/customers?company=${encodeURIComponent(activeCompany?.id || companyParam || 'gamuda')}`}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-blue-700 transition-colors shadow-xs"
              title="Return to Customer Directory"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                  ID #{customer.id}
                </span>
                <span className="text-xs text-slate-400 font-medium">• Standard Dossier View</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
                Customer Profile &amp; Biometric Records
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Dossier</span>
            </button>

            <Link
              href={`/customers/create?id=${customer.id}&company=${encodeURIComponent(activeCompany?.id || companyParam || 'gamuda')}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0b4da2] hover:bg-[#083c80] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer no-underline"
            >
              <Edit2 size={14} />
              <span>Edit Customer</span>
            </Link>
          </div>
        </div>

        {/* Hero Customer Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-5">
              {/* Profile Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center shrink-0 overflow-hidden font-extrabold text-2xl text-[#0b4da2] shadow-md">
                {customer.profile_pic ? (
                  <img
                    src={customer.profile_pic}
                    alt={customer.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  customer.full_name.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      customer.role.toLowerCase() === 'sales'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : customer.role.toLowerCase() === 'worker'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    Role: {customer.role}
                  </span>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      customer.status === 'active'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {customer.status === 'active' ? '● Active & Verified' : '● ' + customer.status}
                  </span>

                  {activeCompany && (
                    <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 font-medium">
                      <Building2 size={12} className="text-slate-500" />
                      <span>{activeCompany.name}</span>
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight m-0">
                  {customer.full_name}
                </h2>

                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500">
                  {customer.username && (
                    <span className="font-mono text-slate-600">@{customer.username}</span>
                  )}
                  {customer.email && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-blue-700 font-medium">{customer.email}</span>
                    </>
                  )}
                  {customer.worker_phone && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-700 font-medium">{customer.worker_phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Total Payment Highlight Box */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl p-5 shrink-0 flex flex-col justify-center min-w-[200px]">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Landmark size={14} className="text-emerald-700" />
                <span>Total Payment</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono tracking-tight">
                {customer.total_payment ? (
                  customer.total_payment.startsWith('RM') ? customer.total_payment : `RM ${customer.total_payment}`
                ) : (
                  <span className="text-slate-400 text-lg font-normal">Not Specified</span>
                )}
              </div>
              <span className="text-[10px] text-emerald-700/90 mt-1 font-medium">
                Verified Bank Transaction Status
              </span>
            </div>
          </div>
        </div>

        {/* 4 Standard Dossier Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card 1: Personal & Identification Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Identification &amp; Personal Info</h3>
                <p className="text-[11px] text-slate-400 m-0">National identity and passport credentials.</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Full Legal Name:</span>
                <strong className="text-slate-900 text-right">{customer.full_name}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">National ID (NID) No:</span>
                <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                  {customer.nid_no}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Passport Number:</span>
                <span className="font-mono font-bold text-slate-800">
                  {customer.passport_no || '—'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">System Username:</span>
                <span className="font-mono text-slate-700">@{customer.username || 'user'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Role Designation:</span>
                <span className="font-semibold text-purple-700">{customer.role}</span>
              </div>

              <div className="py-1.5">
                <span className="text-slate-500 font-medium block mb-1">Leaving / Residential Address:</span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                  {customer.leaving_address || 'No residential address specified.'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Phone size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Contact &amp; Communications</h3>
                <p className="text-[11px] text-slate-400 m-0">Worker and guardian emergency phone lines.</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Worker Direct Phone:</span>
                <strong className="text-slate-900 text-right">{customer.worker_phone || '—'}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Guardian / Emergency Phone:</span>
                <strong className="text-slate-900 text-right">{customer.guardian_phone || '—'}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <span className="font-mono text-blue-700 font-semibold">{customer.email}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Associated Employer Entity:</span>
                <span className="text-slate-800 font-semibold">{activeCompany?.name || 'General Employer'}</span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Employer Registration (ROC):</span>
                <span className="font-mono text-slate-600">{activeCompany?.roc || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Banking & Financial Credentials */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Landmark size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Banking &amp; Financial Information</h3>
                <p className="text-[11px] text-slate-400 m-0">Disbursement and account verification credentials.</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Bank Account Name:</span>
                <strong className="text-slate-900 text-right">{customer.bank_account_name || '—'}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Bank Account Number:</span>
                <span className="font-mono font-bold text-slate-800 text-sm bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  {customer.bank_account_number || '—'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Agreed Total Payment:</span>
                <span className="font-mono font-bold text-emerald-800 text-base">
                  {customer.total_payment ? (
                    customer.total_payment.startsWith('RM') ? customer.total_payment : `RM ${customer.total_payment}`
                  ) : (
                    '—'
                  )}
                </span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Payment Verification:</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>Authorized for digital payroll</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Uploaded NID & Passport Documents */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 m-0">
                    Uploaded Documents ({customer.documents?.length || 0})
                  </h3>
                  <p className="text-[11px] text-slate-400 m-0">NID front/back, passport and visa attachments.</p>
                </div>
              </div>
            </div>

            {Array.isArray(customer.documents) && customer.documents.length > 0 ? (
              <div className="space-y-2.5">
                {customer.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 rounded-xl transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3 truncate">
                      {doc.dataUrl && doc.type?.startsWith('image/') ? (
                        <img
                          src={doc.dataUrl}
                          alt=""
                          className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#0b4da2] flex items-center justify-center shrink-0 font-bold">
                          <FileText size={17} />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="font-bold text-slate-800 block truncate" title={doc.name}>
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {doc.size || 'Verified file attachment'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {doc.dataUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ name: doc.name, url: doc.dataUrl })}
                          className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      )}
                      {doc.url && (
                        <a
                          href={doc.url}
                          download={doc.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200"
                        >
                          <Download size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                <FileCheck size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="m-0 font-medium">No biometric documents attached to this profile.</p>
                <Link
                  href={`/customers/create?id=${customer.id}&company=${encodeURIComponent(activeCompany?.id || companyParam || 'gamuda')}`}
                  className="mt-2 inline-block text-blue-600 hover:underline font-semibold"
                >
                  Upload Documents Now
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Return Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-500 print:hidden">
          <Link
            href={`/customers?company=${encodeURIComponent(activeCompany?.id || companyParam || 'gamuda')}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold no-underline"
          >
            <ArrowLeft size={14} />
            <span>Return to Customer Directory</span>
          </Link>

          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Official Digital Immigration Portal • 256-bit Encrypted</span>
          </span>
        </div>
      </main>

      {/* Document Image Lightbox Preview if clicked */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="font-bold text-xs text-slate-800 truncate">{previewDoc.name}</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-50 rounded-xl">
              <img src={previewDoc.url} alt={previewDoc.name} className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm" />
            </div>
            <div className="flex justify-end pt-3">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function CustomerDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500">
          Loading Customer Profile...
        </div>
      }
    >
      <CustomerDetailsContent />
    </Suspense>
  );
}
