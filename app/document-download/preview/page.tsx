'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  Globe2,
  Maximize2,
  Minimize2,
  Printer,
  QrCode,
  Share2,
  ShieldCheck,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Company } from '@/lib/companies';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import {
  CustomerRecord,
  CustomerDocument,
  fetchCustomers,
  getFileUrl,
} from '@/lib/customerStorage';
import { getCurrentUser, getMasterAdminUser } from '@/lib/auth';

function DocumentPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const companyParam = searchParams.get('company') || '';
  const customerIdParam = searchParams.get('customerId') || '';
  const docNameParam = searchParams.get('docName') || 'Official Document';
  const docUrlParam = searchParams.get('docUrl') || '';
  const docTypeParam = searchParams.get('docType') || 'epass';
  const issueDateParam = searchParams.get('issueDate') || '';
  const expireDateParam = searchParams.get('expireDate') || '';
  const serviceParam = searchParams.get('service') || '';

  const backUrl = `/document-download?company=${encodeURIComponent(companyParam || 'gamuda')}${serviceParam ? `&service=${encodeURIComponent(serviceParam)}` : ''}`;

  const [activeCompany, setActiveCompany] = useState<Company>({
    id: companyParam || 'gamuda',
    name: companyParam
      ? companyParam.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      : 'Gamuda Berhad',
    roc: 'ROC-197601003632',
    sector: 'Engineering & Construction',
    description: 'Premier infrastructure and engineering company in Malaysia.',
    logo: '/images/companies/gamuda.svg',
    tag: 'Verified JIM',
    totalWorkers: 14200,
  });

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  // Load company & customer details
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        // Fetch companies
        const backendComps = await fetchCompaniesFromBackend();
        const stored = getStoredCompanies();
        const allComps = [...backendComps, ...stored];

        if (companyParam) {
          const comp = allComps.find(
            (c) =>
              c.id.toLowerCase() === companyParam.toLowerCase() ||
              c.name.toLowerCase().includes(companyParam.toLowerCase()) ||
              c.name.toLowerCase().replace(/[^a-z0-9]/g, '-').includes(companyParam.toLowerCase())
          );
          if (comp && !isCancelled) {
            setActiveCompany(comp);
          }
        }

        // Fetch customer
        const targetCompId = companyParam || 'gamuda';
        const customersList = await fetchCustomers(targetCompId);
        if (!isCancelled) {
          if (customerIdParam) {
            const foundCust = customersList.find((c) => String(c.id) === String(customerIdParam));
            if (foundCust) {
              setCustomer(foundCust);
            } else if (customersList.length > 0) {
              setCustomer(customersList[0]);
            }
          } else if (customersList.length > 0) {
            setCustomer(customersList[0]);
          }
        }
      } catch (err) {
        console.error('Error loading preview data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [companyParam, customerIdParam]);

  // Determine document URL and type
  const docUrl = useMemo(() => {
    if (docUrlParam) return getFileUrl(docUrlParam);
    if (customer?.documents && customer.documents.length > 0) {
      const match = customer.documents.find((d) => d.name === docNameParam);
      if (match?.url) return getFileUrl(match.url);
    }
    return '';
  }, [docUrlParam, customer, docNameParam]);

  const isImage = useMemo(() => {
    if (!docUrl) return false;
    return (
      docUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i) !== null ||
      docTypeParam.toLowerCase().includes('image')
    );
  }, [docUrl, docTypeParam]);

  const isEpassSlip = useMemo(() => {
    return (
      docTypeParam === 'epass' ||
      docNameParam.toLowerCase().includes('epass') ||
      !docUrl
    );
  }, [docTypeParam, docNameParam, docUrl]);

  const workerName = customer?.full_name || 'REGISTERED WORKER';
  const passportNo = customer?.passport_no || 'N/A';
  const nationality = customer?.country || 'BANGLADESH';
  const refNo = `MYP-2026-${String(customer?.id || 1).padStart(6, '0')}`;
  const issueDate = issueDateParam || (customer?.created_at ? customer.created_at.split('T')[0] : '2024-01-15');
  const expireDate = expireDateParam || customer?.passport_expire_date || '2026-12-31';

  // Share message text
  const shareText = useMemo(() => {
    return `🏛️ *JABATAN IMIGRESEN MALAYSIA (JIM)*\n━━━━━━━━━━━━━━━━━━━━━━━━\n📄 *Document:* ${docNameParam}\n👤 *Worker:* ${workerName}\n🛂 *Passport:* ${passportNo}\n🌍 *Nationality:* ${nationality}\n📋 *Reference:* ${refNo}\n🏢 *Employer:* ${activeCompany.name} (${activeCompany.roc})\n📅 *Issued:* ${issueDate} | *Expires:* ${expireDate}\n✅ *Status:* APPROVED & VERIFIED\n\n🔗 *Document Link:* ${docUrl || (typeof window !== 'undefined' ? window.location.href : '')}\n━━━━━━━━━━━━━━━━━━━━━━━━\n_Official JIM Employer Document Verification Portal_`;
  }, [docNameParam, workerName, passportNo, nationality, refNo, activeCompany, issueDate, expireDate, docUrl]);

  const handleWhatsAppSend = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Document: ${docNameParam}`,
          text: shareText,
          url: docUrl || window.location.href,
        });
      } catch (err) {
        console.log('Share dismissed:', err);
      }
    } else {
      handleWhatsAppSend();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDownload = () => {
    const fileName = `${docNameParam.replace(/[^a-zA-Z0-9]/g, '_')}_${passportNo}`;
    setDownloadFeedback(`Downloading: ${docNameParam}`);
    setTimeout(() => setDownloadFeedback(null), 3000);

    if (docUrl && docUrl !== '') {
      const link = document.createElement('a');
      link.href = docUrl;
      link.download = `${fileName}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Trigger browser print for dynamic ePASS Slip
      setTimeout(() => window.print(), 200);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f5f9] flex flex-col justify-between font-sans text-slate-800">
      <Navbar />

      <main className="w-full flex-1 pb-16">
        {/* Top Header & Navigation Bar */}
        <section className="bg-white border-b border-slate-200 shadow-xs print:hidden">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href={backUrl}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors no-underline shadow-2xs"
                  title="Back to Document Download Portal"
                >
                  <ArrowLeft size={18} />
                </Link>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Link
                      href={backUrl}
                      className="hover:text-blue-600 no-underline text-slate-500"
                    >
                      Document Repository
                    </Link>
                    <span>/</span>
                    <span className="text-slate-800 font-bold">Document Preview</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0b4da2] tracking-tight mt-0.5 flex items-center gap-2">
                    <Eye className="text-blue-600" size={24} />
                    {docNameParam}
                  </h1>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Zoom Controls */}
                <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.max(60, z - 10))}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 cursor-pointer transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <span className="px-2 font-mono font-bold text-[11px] text-slate-700">
                    {previewZoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.min(140, z + 10))}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 cursor-pointer transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>

                {/* Print Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                  title="Print Document"
                >
                  <Printer size={15} />
                  <span className="hidden sm:inline">Print</span>
                </button>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  title="Download Document"
                >
                  <Download size={15} />
                  <span>Download</span>
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  title="Share Document"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => setIsFullScreen((f) => !f)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer shadow-2xs"
                  title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                >
                  {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Feedback Alert */}
        {downloadFeedback && (
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-4 print:hidden">
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{downloadFeedback}</span>
            </div>
          </div>
        )}

        {/* Worker Summary Banner */}
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-4 pb-2 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm overflow-hidden border border-blue-200 shrink-0 shadow-2xs">
                {customer?.profile_pic ? (
                  <img
                    src={getFileUrl(customer.profile_pic)}
                    alt={workerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 m-0">
                    {workerName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Verified JIM
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200">
                    🛂 {passportNo}
                  </span>
                  <span>🌍 {nationality}</span>
                  <span>🏢 {activeCompany.name}</span>
                  <span className="font-mono text-blue-600">Ref: {refNo}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 block">Date of Issue</span>
                <span className="font-mono font-bold text-slate-700">{issueDate || '2024-01-15'}</span>
              </div>
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 block">Date of Expiry</span>
                <span className="font-mono font-bold text-emerald-700">{expireDate || '2026-12-31'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Preview Canvas Area */}
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-4">
          <div
            className={`w-full flex justify-center items-start overflow-x-auto py-6 bg-slate-200/60 rounded-2xl border border-slate-300/80 min-h-[700px] ${
              isFullScreen ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-900/90 p-8 min-h-screen' : ''
            }`}
          >
            {/* If uploaded file is an Image */}
            {isImage && docUrl ? (
              <div
                style={{
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="bg-white shadow-2xl rounded-2xl border border-slate-300 p-6 flex flex-col items-center max-w-[900px] w-full"
              >
                <img
                  src={docUrl}
                  alt={docNameParam}
                  className="max-h-[750px] w-auto object-contain rounded-xl border border-slate-200 shadow-md"
                />
                <div className="mt-4 flex items-center justify-between w-full text-xs border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-800">{docNameParam}</span>
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink size={13} /> Open Original in New Tab
                  </a>
                </div>
              </div>
            ) : !isEpassSlip && docUrl ? (
              /* If uploaded file is a PDF */
              <div
                style={{
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="bg-white shadow-2xl rounded-2xl border border-slate-300 p-6 flex flex-col items-center max-w-[950px] w-full"
              >
                <iframe
                  src={`${docUrl}#toolbar=0`}
                  title={docNameParam}
                  className="w-full h-[750px] rounded-xl border border-slate-300 shadow-inner"
                />
                <div className="mt-4 flex items-center justify-between w-full text-xs border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-800">{docNameParam}</span>
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink size={13} /> Open Raw PDF
                  </a>
                </div>
              </div>
            ) : (
              /* Official Jabatan Imigresen Malaysia (JIM) ePASS Digital Slip */
              <div
                style={{
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="w-full max-w-[850px] bg-white shadow-2xl rounded-2xl border border-slate-300 p-8 sm:p-12 relative overflow-hidden text-slate-800"
              >
                {/* Background Official Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.035] -rotate-45">
                  <div className="text-center">
                    <div className="text-7xl font-black tracking-widest text-slate-900">
                      Jabatan Imigresen
                    </div>
                    <div className="text-5xl font-black tracking-widest text-slate-900 mt-4">
                      Kerajaan Malaysia
                    </div>
                  </div>
                </div>

                {/* Official Document Header */}
                <div className="relative border-b-2 border-slate-900 pb-5 mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                      <img
                        src="/images/malaysia-crest.svg"
                        alt="Malaysia Crest"
                        className="max-h-16 w-auto object-contain"
                        onError={(e) => {
                          // Fallback to stylized crest icon if svg missing
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="text-center flex-1">
                      <h4 className="text-xs font-bold tracking-widest text-slate-600 m-0">
                        Kerajaan Malaysia
                      </h4>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight m-0 mt-0.5">
                        Jabatan Imigresen Malaysia
                      </h2>
                      <div className="inline-block mt-1 px-3.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-xs font-black tracking-wider">
                        {docNameParam || 'ePASS Digital Slip (Official JIM)'}
                      </div>
                    </div>

                    {/* Barcode & Security Stamp */}
                    <div className="w-28 text-right shrink-0">
                      <div className="font-mono text-[9px] text-slate-500 font-bold">
                        DOC-REF: {refNo}
                      </div>
                      <div className="w-24 h-6 bg-slate-800 ml-auto mt-1 flex items-center justify-center text-[7px] text-white font-mono tracking-widest rounded-xs">
                        |||||||||||||||||
                      </div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">
                        Secure Digital Token
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative">
                  {/* Left: Worker Photo & QR Code */}
                  <div className="md:col-span-4 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
                    {/* Worker Photo Frame */}
                    <div className="w-36 h-44 bg-slate-100 rounded-xl border-2 border-slate-300 shadow-inner overflow-hidden flex items-center justify-center relative">
                      {customer?.profile_pic ? (
                        <img
                          src={getFileUrl(customer.profile_pic)}
                          alt={workerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <User size={52} />
                          <span className="text-[10px] font-bold mt-1 text-slate-500">
                            Official Photo
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-[8px] text-white font-bold py-0.5 tracking-wider text-center">
                        JIM Verified
                      </div>
                    </div>

                    {/* Digital Verification QR Code */}
                    <div className="mt-4 p-2 bg-white rounded-xl border border-slate-300 shadow-xs flex flex-col items-center">
                      <div className="w-22 h-22 bg-slate-100 flex items-center justify-center rounded-lg border border-slate-200">
                        <QrCode size={68} className="text-slate-800" />
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 mt-1 font-bold">
                        Scan to Verify
                      </span>
                    </div>
                  </div>

                  {/* Right: Worker & Permit Information */}
                  <div className="md:col-span-8 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Full Name (Nama Pekerja)
                        </span>
                        <span className="font-black text-slate-900 text-sm block">
                          {workerName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Status
                        </span>
                        <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Approved &amp; Active
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Passport Number (No. Pasport)
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm block">
                          {passportNo}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Nationality (Warganegara)
                        </span>
                        <span className="font-bold text-slate-900 text-xs block">
                          {nationality}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          ePASS Reference No.
                        </span>
                        <span className="font-mono font-bold text-blue-700 text-xs block">
                          {refNo}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Pass Category
                        </span>
                        <span className="font-semibold text-slate-800 text-xs block">
                          Pas Lawatan Kerja Sementara (PLKS)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Employer Entity (Majikan)
                        </span>
                        <span className="font-bold text-slate-900 text-xs block">
                          {activeCompany.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          ROC: {activeCompany.roc}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Working Sector (Sektor)
                        </span>
                        <span className="font-semibold text-slate-800 text-xs block">
                          {customer?.working_sector || activeCompany.sector}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Issue Date (Tarikh Dikeluarkan)
                        </span>
                        <span className="font-mono font-bold text-slate-700 text-xs block">
                          {issueDate}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Expiry Date (Tarikh Luput)
                        </span>
                        <span className="font-mono font-bold text-emerald-700 text-xs block">
                          {expireDate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Official Footer Endorsement */}
                <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-3">
                  <div>
                    Dokumen rasmi yang dikeluarkan oleh Jabatan Imigresen Malaysia.
                    <br />
                    Sebarang pemalsuan adalah tertakluk di bawah Seksyen 55D Akta Imigresen 1959/63.
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-700">Ketua Pengarah Imigresen</div>
                    <div className="font-mono text-[9px] text-slate-400">Digitally Signed &amp; Sealed</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Share2 size={16} />
                </div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Share Official Document
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 mb-4 leading-relaxed">
              Share <strong>{docNameParam}</strong> for worker{' '}
              <strong>{workerName}</strong> via WhatsApp, native mobile apps, or copy link.
            </p>

            <div className="space-y-3">
              {/* WhatsApp Direct Share Button */}
              <button
                type="button"
                onClick={handleWhatsAppSend}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-base">
                    W
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Share to WhatsApp</div>
                    <div className="text-[10px] text-white/80 font-normal">
                      Send directly to worker, employer, or agency chat
                    </div>
                  </div>
                </div>
                <ExternalLink size={16} />
              </button>

              {/* Native App Share (Mobile / Desktop) */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Share2 size={16} />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Share via Device Apps</div>
                    <div className="text-[10px] text-white/80 font-normal">
                      Telegram, Gmail, AirDrop, Bluetooth &amp; Files
                    </div>
                  </div>
                </div>
                <ExternalLink size={16} />
              </button>

              {/* Copy Share Text / Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-xs">
                    {copyFeedback ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">
                      {copyFeedback ? 'Copied to Clipboard!' : 'Copy Verification Summary'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Includes worker, passport &amp; verification details
                    </div>
                  </div>
                </div>
                {copyFeedback && <span className="text-[10px] font-bold text-emerald-600">Copied!</span>}
              </button>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function DocumentPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center text-slate-800 p-6 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200/80 max-w-sm w-full text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 m-0">Loading Preview...</h2>
              <p className="text-xs text-slate-500 m-0 mt-1">
                Retrieving official document certificate.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <DocumentPreviewContent />
    </Suspense>
  );
}
