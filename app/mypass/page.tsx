'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileCheck,
  FileDown,
  FileText,
  Filter,
  Home,
  Info,
  LogOut,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import { companies, Company } from '@/lib/companies';

function WebLogo({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className} bg-white rounded-xl shadow-xs border border-slate-200/80 p-1 shrink-0 overflow-hidden`}>
      <img
        src="/images/registration-document.svg"
        alt="Official Portal Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

// Malaysian Immigration Worker Record
export type WorkerPassRecord = {
  id: string;
  batchNumber: string;
  applicationNumber: string;
  name: string;
  passportNumber: string;
  nationality: 'MYANMAR' | 'BANGLADESH' | 'INDONESIA' | 'NEPAL';
  applicationDate: string;
  applicationStatus: string;
  passType: string;
  expiryDate: string;
  sector: string;
  feePaid: string;
};

const INITIAL_RECORDS: WorkerPassRecord[] = [
  {
    id: 'rec-1',
    batchNumber: 'BATCH5048002PMAHR54',
    applicationNumber: 'BPA/EPLKS/5048002PLAZ0330621',
    name: 'AUNG KO OO',
    passportNumber: 'MF236895',
    nationality: 'MYANMAR',
    applicationDate: '08/12/2024 16:54:16 PM',
    applicationStatus: 'Digital Pass Printed',
    passType: 'e-PLKS (Foreign Worker Permit)',
    expiryDate: '07/12/2025',
    sector: 'Manufacturing',
    feePaid: 'RM 145.00',
  },
  {
    id: 'rec-2',
    batchNumber: 'BATCH5048002PJBGX59',
    applicationNumber: 'BPA/EPLKS/5048002PJAKW010255',
    name: 'MOHIBUR RAHAMAN',
    passportNumber: 'EK0697270',
    nationality: 'BANGLADESH',
    applicationDate: '30/09/2024 21:59:56 PM',
    applicationStatus: 'Digital Pass Printed',
    passType: 'e-PLKS (Foreign Worker Permit)',
    expiryDate: '29/09/2025',
    sector: 'Construction & Civil',
    feePaid: 'RM 145.00',
  },
  {
    id: 'rec-3',
    batchNumber: 'BATCH5048002PJAWN09',
    applicationNumber: 'BPA/EPLKS/5048002PJAVV372862',
    name: 'NYEIN CHAN AUNG',
    passportNumber: 'MI596727',
    nationality: 'MYANMAR',
    applicationDate: '20/09/2024 13:09:57 PM',
    applicationStatus: 'Digital Pass Printed',
    passType: 'e-PLKS (Foreign Worker Permit)',
    expiryDate: '19/09/2025',
    sector: 'Agriculture / Plantation',
    feePaid: 'RM 145.00',
  },
  {
    id: 'rec-4',
    batchNumber: 'BATCH5048002PJAWN09',
    applicationNumber: 'BPA/EPLKS/5048002PJAVV373197',
    name: 'LIN YOUNG SOE',
    passportNumber: 'MI596729',
    nationality: 'MYANMAR',
    applicationDate: '20/09/2024 13:09:57 PM',
    applicationStatus: 'Digital Pass Printed',
    passType: 'e-PLKS (Foreign Worker Permit)',
    expiryDate: '19/09/2025',
    sector: 'Agriculture / Plantation',
    feePaid: 'RM 145.00',
  },
  {
    id: 'rec-5',
    batchNumber: 'BATCH5048002PJAKW12',
    applicationNumber: 'BPA/EPLKS/5048002PJAKW010386',
    name: 'MD SHAHINUR ISLAM',
    passportNumber: 'EE0841923',
    nationality: 'BANGLADESH',
    applicationDate: '02/09/2024 11:22:45 AM',
    applicationStatus: 'Digital Pass Printed',
    passType: 'e-PLKS (Foreign Worker Permit)',
    expiryDate: '01/09/2025',
    sector: 'Services & Operations',
    feePaid: 'RM 145.00',
  },
  {
    id: 'rec-6',
    batchNumber: 'BATCH5048002PJAKW12',
    applicationNumber: 'BPA/EPLKS/5048002PJAKW010412',
    name: 'MD AL AMIN HOSSAIN',
    passportNumber: 'EK0981244',
    nationality: 'BANGLADESH',
    applicationDate: '02/09/2024 11:25:10 AM',
    applicationStatus: 'Digital Pass Printed',
    passType: 'e-PLKS (Foreign Worker Permit)',
    expiryDate: '01/09/2025',
    sector: 'Engineering & Development',
    feePaid: 'RM 145.00',
  },
  {
    id: 'rec-7',
    batchNumber: 'BATCH5048002PMRTG81',
    applicationNumber: 'BPA/EPLKS/5048002PLAZ0331089',
    name: 'KYAW ZIN HTET',
    passportNumber: 'MN482019',
    nationality: 'MYANMAR',
    applicationDate: '15/08/2024 09:14:30 AM',
    applicationStatus: 'Digital Pass Printed',
    passType: 'e-PLKS (Foreign Worker Permit)',
    expiryDate: '14/08/2025',
    sector: 'Manufacturing',
    feePaid: 'RM 145.00',
  },
  {
    id: 'rec-8',
    batchNumber: 'BATCH5048002PMRTG81',
    applicationNumber: 'BPA/EPLKS/5048002PLAZ0331102',
    name: 'MD BIPUL HOSSAIN',
    passportNumber: 'EE0931882',
    nationality: 'BANGLADESH',
    applicationDate: '15/08/2024 09:18:42 AM',
    applicationStatus: 'Digital Pass Printed',
    passType: 'e-PLKS (Foreign Worker Permit)',
    expiryDate: '14/08/2025',
    sector: 'Manufacturing',
    feePaid: 'RM 145.00',
  },
];

function MyPassDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyParam = searchParams.get('company');

  const activeCompany =
    companies.find(
      (c) =>
        c.id.toLowerCase() === (companyParam || '').toLowerCase() ||
        c.name.toLowerCase().includes((companyParam || '').toLowerCase())
    ) || companies[0];

  // Dynamic live clock matching Malaysian time
  const [currentDateTime, setCurrentDateTime] = useState('Wednesday, September 16, 2026 | 02:42:17 PM');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format options: Wednesday, September 16, 2026 | 02:42:17 PM
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const dateNum = now.getDate();
      const year = now.getFullYear();

      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');

      setCurrentDateTime(`${dayName}, ${monthName} ${dateNum}, ${year} | ${formattedHours}:${minutes}:${seconds} ${ampm}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('status');

  // Modals for Actions
  const [viewingRecord, setViewingRecord] = useState<WorkerPassRecord | null>(null);
  const [receiptRecord, setReceiptRecord] = useState<WorkerPassRecord | null>(null);
  const [epassRecord, setEPassRecord] = useState<WorkerPassRecord | null>(null);

  const filteredRecords = INITIAL_RECORDS.filter((rec) => {
    const q = query.toLowerCase();
    return (
      rec.name.toLowerCase().includes(q) ||
      rec.passportNumber.toLowerCase().includes(q) ||
      rec.batchNumber.toLowerCase().includes(q) ||
      rec.applicationNumber.toLowerCase().includes(q) ||
      rec.nationality.toLowerCase().includes(q) ||
      rec.applicationStatus.toLowerCase().includes(q)
    );
  });

  const allSelected =
    filteredRecords.length > 0 && selectedIds.length === filteredRecords.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map((r) => r.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="w-full bg-[#f4f6f9] min-h-screen text-slate-800 font-sans">
      {/* 1. Official Header matching screenshot */}
      <header className="bg-gradient-to-r from-[#5173a9] via-[#5b7db5] to-[#6587be] text-white shadow-md">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left logos & title */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Web Official Logo */}
            <WebLogo className="w-12 h-12 sm:w-14 sm:h-14 shadow-md" />

            {/* Yellow Bold Header Texts */}
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl sm:text-3xl font-black text-[#ffd200] tracking-tight m-0 leading-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.55)] uppercase">
                MYPASS@JIM
              </h1>
              <p className="text-[10.5px] sm:text-[12px] font-extrabold text-[#ffea00] tracking-wider uppercase m-0 mt-1 leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                JABATAN IMIGRESEN MALAYSIA
              </p>
            </div>
          </div>

          {/* Right Live Timestamp */}
          <div className="text-xs sm:text-sm font-medium text-white/95 tracking-wide sm:text-right font-mono">
            {currentDateTime}
          </div>
        </div>
      </header>

      {/* 2. Top Navigation Bar (White Background with links) */}
      <nav className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-40">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between text-[12.5px] font-bold uppercase tracking-wider text-slate-700">
          <div className="flex items-center gap-6 overflow-x-auto py-1 scrollbar-none">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#0b4da2] transition-colors whitespace-nowrap"
            >
              <Home size={15} />
              <span>Home</span>
            </Link>

            <button
              type="button"
              className="inline-flex items-center gap-1 text-slate-700 hover:text-[#0b4da2] transition-colors bg-transparent border-0 font-bold uppercase cursor-pointer whitespace-nowrap"
            >
              <FileText size={15} />
              <span>ESP</span>
              <ChevronDown size={14} />
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1 text-slate-700 hover:text-[#0b4da2] transition-colors bg-transparent border-0 font-bold uppercase cursor-pointer whitespace-nowrap"
            >
              <FileCheck size={15} />
              <span>MYSTEMP</span>
              <ChevronDown size={14} />
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1 text-slate-700 hover:text-[#0b4da2] transition-colors bg-transparent border-0 font-bold uppercase cursor-pointer whitespace-nowrap"
            >
              <FileDown size={15} />
              <span>ECOM</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[#0b4da2] border-b-2 border-[#0b4da2] pb-0.5 bg-transparent font-extrabold uppercase cursor-pointer whitespace-nowrap"
            >
              <Info size={15} />
              <span>Application Status</span>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* User Account / Employer Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/services?company=${encodeURIComponent(activeCompany.id)}`}
              className="hidden sm:inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#0b4da2] border border-blue-200 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Back to Services</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold cursor-pointer">
              <User size={15} className="text-slate-600" />
              <span className="hidden md:inline truncate max-w-[150px]">{activeCompany.name}</span>
              <ChevronDown size={13} />
            </div>
          </div>
        </div>
      </nav>

      {/* 3. Main Data Table Container */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        {/* Employer Context Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 mb-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
              <img src={activeCompany.logo} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-slate-900 text-sm font-bold">{activeCompany.name}</strong>
                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {activeCompany.roc}
                </span>
              </div>
              <p className="text-slate-500 m-0 mt-0.5">
                Active Employer Quota: Foreign Worker Temporary Employment Pass (e-PLKS) Records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  alert(`Generating batch receipt and ePass bundle for ${selectedIds.length} workers...`);
                }}
                className="inline-flex items-center gap-1.5 bg-[#0b4da2] hover:bg-[#083c80] text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-colors border-0 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Selected ({selectedIds.length})</span>
              </button>
            )}
            <Link
              href={`/login?service=work-information&company=${encodeURIComponent(activeCompany.id)}`}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
            >
              <LogOut size={13} />
              <span>Re-login</span>
            </Link>
          </div>
        </div>

        {/* Controls: "Show 10 data" and "Search: [input]" */}
        <div className="bg-white rounded-t-xl border-t border-x border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold text-slate-700">
          {/* Show [ 10 ▾ ] entries */}
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
            <span className="font-bold text-slate-700">Search:</span>
            <div className="relative flex items-center w-full sm:w-64">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search worker, passport..."
                className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. The Table with English Columns matching screenshot */}
        <div className="overflow-x-auto bg-white border-x border-b border-slate-200 shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            {/* Table Header Row in screenshot blue */}
            <thead>
              <tr className="bg-[#5c7eb5] text-white font-bold text-center border-b border-[#4d6ea4]">
                {/* 1. Select (Pilih) */}
                <th className="py-3 px-3 border-r border-[#6f8ebf] w-12 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>Select</span>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-white/60 cursor-pointer"
                      title="Select all"
                    />
                  </div>
                </th>

                {/* 2. Batch Number (Nombor Kelompok) */}
                <th className="py-3 px-3.5 border-r border-[#6f8ebf] font-bold tracking-wide">
                  Batch Number
                </th>

                {/* 3. Application Number (Nombor Permohonan) */}
                <th className="py-3 px-4 border-r border-[#6f8ebf] font-bold tracking-wide">
                  Application Number
                </th>

                {/* 4. Name (Nama) */}
                <th className="py-3 px-4 border-r border-[#6f8ebf] font-bold tracking-wide">
                  Name
                </th>

                {/* 5. Passport Number (Nombor Passport) */}
                <th className="py-3 px-3.5 border-r border-[#6f8ebf] font-bold tracking-wide">
                  Passport Number
                </th>

                {/* 6. Nationality (Warganegara) */}
                <th className="py-3 px-3.5 border-r border-[#6f8ebf] font-bold tracking-wide">
                  Nationality
                </th>

                {/* 7. Application Date (Tarikh Permohonan) */}
                <th className="py-3 px-3.5 border-r border-[#6f8ebf] font-bold tracking-wide">
                  Application Date
                </th>

                {/* 8. Application Status (Status Permohonan) */}
                <th className="py-3 px-3.5 border-r border-[#6f8ebf] font-bold tracking-wide">
                  Application Status
                </th>

                {/* 9. Action (Tindakan) */}
                <th className="py-3 px-4 font-bold tracking-wide">
                  Action
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredRecords.slice(0, pageSize).map((record, index) => {
                const isSelected = selectedIds.includes(record.id);
                return (
                  <tr
                    key={record.id}
                    className={`transition-colors hover:bg-blue-50/40 ${
                      isSelected ? 'bg-blue-50/70' : index % 2 === 1 ? 'bg-[#fafbfe]' : 'bg-white'
                    }`}
                  >
                    {/* 1. Select Checkbox */}
                    <td className="py-3.5 px-3 border-r border-slate-200 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(record.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* 2. Batch Number */}
                    <td className="py-3.5 px-3.5 border-r border-slate-200 font-mono text-[11.5px] text-slate-700 whitespace-nowrap">
                      {record.batchNumber}
                    </td>

                    {/* 3. Application Number (Clickable Link in blue) */}
                    <td className="py-3.5 px-4 border-r border-slate-200 font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setViewingRecord(record)}
                        className="text-[#1a66b8] hover:text-[#0b4da2] hover:underline font-mono text-[11.5px] bg-transparent border-0 p-0 text-left cursor-pointer transition-colors inline-flex items-center gap-1 group"
                        title={`View status: ${record.applicationNumber}`}
                      >
                        <span>{record.applicationNumber}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>

                    {/* 4. Name */}
                    <td className="py-3.5 px-4 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                      {record.name}
                    </td>

                    {/* 5. Passport Number */}
                    <td className="py-3.5 px-3.5 border-r border-slate-200 font-mono text-[12px] text-slate-800 text-center whitespace-nowrap">
                      {record.passportNumber}
                    </td>

                    {/* 6. Nationality */}
                    <td className="py-3.5 px-3.5 border-r border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">
                      {record.nationality}
                    </td>

                    {/* 7. Application Date */}
                    <td className="py-3.5 px-3.5 border-r border-slate-200 text-center font-mono text-[11.5px] text-slate-600 whitespace-nowrap">
                      {record.applicationDate}
                    </td>

                    {/* 8. Application Status */}
                    <td className="py-3.5 px-3.5 border-r border-slate-200 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>{record.applicationStatus}</span>
                      </span>
                      <small className="block text-[10px] text-slate-400">
                        Cetakan Pas Digital Telah Dibuat
                      </small>
                    </td>

                    {/* 9. Action (Print Receipt / Download ePass) */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setReceiptRecord(record)}
                          className="text-[#1a66b8] hover:text-[#0a3875] font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer transition-colors"
                        >
                          Print Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => setEPassRecord(record)}
                          className="text-[#1a66b8] hover:text-[#0a3875] font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer transition-colors"
                        >
                          Download ePass
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    No foreign worker pass records found matching "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Footer */}
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing 1 to {Math.min(pageSize, filteredRecords.length)} of {filteredRecords.length} entries
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              type="button"
              disabled
              className="px-3 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded font-semibold text-xs cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1 bg-[#5c7eb5] text-white border border-[#5c7eb5] rounded font-bold text-xs"
            >
              1
            </button>
            <button
              type="button"
              disabled
              className="px-3 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded font-semibold text-xs cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {/* Footer Security Notice */}
        <div className="mt-8 text-center text-[11px] text-slate-500">
          <p className="m-0">
            Official Portal Jabatan Imigresen Malaysia (JIM) • Sistem MyPass Pekerja Asing e-Services
          </p>
          <p className="m-0 text-slate-400 mt-0.5 font-mono">
            Direct Server Gateway: https://imigresen-online.imi.gov.my/mypass/status
          </p>
        </div>
      </main>

      {/* MODAL 1: APPLICATION DETAILS MODAL */}
      {viewingRecord && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setViewingRecord(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#5c7eb5] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WebLogo className="w-9 h-9" />
                <div>
                  <h3 className="text-base font-bold m-0 leading-tight">
                    Application Status Details
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0 font-mono">
                    {viewingRecord.applicationNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center border-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <div>
                  <strong className="text-emerald-950 font-bold block text-sm">
                    {viewingRecord.applicationStatus}
                  </strong>
                  <span className="text-emerald-800 text-[11px]">
                    Cetakan Pas Digital Telah Dibuat (Verified on JIM Immigration Gateway)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10.5px]">Worker Name</span>
                  <strong className="text-slate-900 text-[13px]">{viewingRecord.name}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10.5px]">Passport Number</span>
                  <strong className="text-slate-900 text-[13px] font-mono">{viewingRecord.passportNumber}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10.5px]">Nationality</span>
                  <strong className="text-slate-900">{viewingRecord.nationality}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10.5px]">Pass Category</span>
                  <strong className="text-slate-900">{viewingRecord.passType}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10.5px]">Batch Reference</span>
                  <strong className="text-slate-900 font-mono text-[11px]">{viewingRecord.batchNumber}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10.5px]">Valid Until</span>
                  <strong className="text-slate-900 font-mono text-emerald-700">{viewingRecord.expiryDate}</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10.5px]">Assigned Registered Employer</span>
                <strong className="text-slate-900">{activeCompany.name} ({activeCompany.roc})</strong>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setViewingRecord(null);
                    setEPassRecord(viewingRecord);
                  }}
                  className="flex-1 h-10 bg-[#0b4da2] hover:bg-[#083c80] text-white font-bold text-xs rounded-xl transition-colors border-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Digital ePass</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingRecord(null);
                    setReceiptRecord(viewingRecord);
                  }}
                  className="px-4 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: OFFICIAL RECEIPT MODAL */}
      {receiptRecord && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setReceiptRecord(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-slate-800">
              {/* Receipt Header */}
              <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <WebLogo className="w-10 h-10" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase m-0">
                      JABATAN IMIGRESEN MALAYSIA
                    </h4>
                    <p className="text-[10px] text-slate-500 m-0">RESIT RASMI KERAJAAN MALAYSIA</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptRecord(null)}
                  className="text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Receipt Body */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-bold">REC-JIM-{receiptRecord.passportNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date/Time:</span>
                  <span>{receiptRecord.applicationDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Application:</span>
                  <span className="font-bold">{receiptRecord.applicationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payer/Employer:</span>
                  <span className="truncate max-w-[180px] font-bold">{activeCompany.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Worker:</span>
                  <span className="font-bold">{receiptRecord.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Passport:</span>
                  <span>{receiptRecord.passportNumber} ({receiptRecord.nationality})</span>
                </div>
                <div className="border-t border-dashed border-slate-300 my-3" />
                <div className="flex justify-between text-sm font-bold text-slate-900">
                  <span>TOTAL AMOUNT PAID:</span>
                  <span>{receiptRecord.feePaid}</span>
                </div>
                <div className="text-[10.5px] text-slate-500 text-center pt-2">
                  Status: <strong className="text-emerald-700">BAYARAN BERJAYA (PAID)</strong>
                </div>
              </div>

              {/* Receipt Actions */}
              <div className="mt-5 pt-4 border-t border-slate-200 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 h-10 bg-[#5c7eb5] hover:bg-[#4a6b9f] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border-0 cursor-pointer transition-colors"
                >
                  <Printer size={14} />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptRecord(null)}
                  className="px-4 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: OFFICIAL DIGITAL ePASS PREVIEW */}
      {epassRecord && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setEPassRecord(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ePass Card Frame */}
            <div className="bg-gradient-to-r from-[#072a6b] via-[#0b4da2] to-[#1264c7] text-white p-5 relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <WebLogo className="w-10 h-10" />
                  <div>
                    <h3 className="text-base font-extrabold tracking-wide m-0">
                      MALAYSIA DIGITAL e-PASS
                    </h3>
                    <p className="text-[10px] text-blue-200 font-semibold tracking-widest uppercase m-0">
                      IMMIGRATION DEPARTMENT OF MALAYSIA
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEPassRecord(null)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center border-0 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ePass Card Content */}
            <div className="p-6 bg-[#fafcff] space-y-4">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                {/* Photo Placeholder */}
                <div className="w-24 h-32 rounded-xl bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0 overflow-hidden shadow-xs">
                  <User size={40} className="text-slate-300" />
                  <span className="text-[9px] font-mono mt-1 font-bold text-slate-400 uppercase">OFFICIAL</span>
                </div>

                {/* Worker Identity Details */}
                <div className="flex-1 space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">NAME OF WORKER</span>
                    <strong className="text-sm font-extrabold text-slate-900">{epassRecord.name}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">PASSPORT NO</span>
                      <strong className="font-mono text-slate-800">{epassRecord.passportNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">NATIONALITY</span>
                      <strong className="text-slate-800">{epassRecord.nationality}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">PASS EXPIRY</span>
                      <strong className="font-mono text-emerald-700 font-bold">{epassRecord.expiryDate}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">SECTOR</span>
                      <strong className="text-slate-800">{epassRecord.sector}</strong>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">EMPLOYER</span>
                    <span className="text-slate-700 text-[11px] font-semibold">{activeCompany.name}</span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="w-20 h-20 bg-white p-1 rounded-xl border border-slate-200 flex flex-col items-center justify-center shrink-0">
                  <QrCode size={56} className="text-slate-800" />
                  <span className="text-[8px] font-mono text-slate-500 font-bold">VERIFIED</span>
                </div>
              </div>

              {/* Status footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 font-medium">
                <span className="flex items-center gap-1 text-emerald-800 font-bold">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  AUTHENTICATED & ISSUED BY JIM PUTRAJAYA
                </span>
                <span className="font-mono text-emerald-950 font-bold">ACTIVE</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    alert(`Downloading official ePass PDF for ${epassRecord.name} (${epassRecord.passportNumber})...`);
                  }}
                  className="flex-1 h-11 bg-[#0b4da2] hover:bg-[#083c80] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-0 cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download ePass (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEPassRecord(null)}
                  className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-200 cursor-pointer"
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

export default function MyPassPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-[#f4f6f9] flex items-center justify-center text-slate-500 font-semibold">
          Loading MYPASS@JIM Portal...
        </div>
      }
    >
      <MyPassDashboard />
    </Suspense>
  );
}
