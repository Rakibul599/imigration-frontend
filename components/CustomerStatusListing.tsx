'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx-js-style';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  DollarSign,
  Download,
  Edit2,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Layers,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import {
  CustomerRecord,
  WorkingSector,
  deleteCustomer,
  fetchCustomers,
  fetchWorkingSectors,
  getFileUrl,
} from '@/lib/customerStorage';
import { Company } from '@/lib/companies';

export type CustomerStatusType = 'active' | 'inactive' | 'runaway' | 'blacklist';

interface CustomerStatusListingProps {
  status: CustomerStatusType;
  portalType?: 'superadmin' | 'masteradmin' | 'employee';
  baseRoute?: string;
}

const STATUS_METADATA: Record<
  CustomerStatusType,
  {
    title: string;
    badge: string;
    subtitle: string;
    headerGradient: string;
    badgeBg: string;
    badgeColor: string;
    icon: any;
    accentColor: string;
  }
> = {
  active: {
    title: 'Active Customers Registry',
    badge: 'Authorized & Active Worker Permits',
    subtitle: 'Authorized foreign workers with active permits, valid visas, and verified employer sponsorship.',
    headerGradient: 'from-[#064e3b] via-[#047857] to-[#059669]',
    badgeBg: 'bg-emerald-400/20',
    badgeColor: 'text-emerald-300 border-emerald-400/30',
    icon: UserCheck,
    accentColor: 'text-emerald-600',
  },
  inactive: {
    title: 'Inactive Customers Registry',
    badge: 'Suspended & Inactive Records',
    subtitle: 'Suspended, expired, or non-active worker permits and pending foreign dossiers.',
    headerGradient: 'from-[#881337] via-[#9f1239] to-[#be123c]',
    badgeBg: 'bg-rose-400/20',
    badgeColor: 'text-rose-300 border-rose-400/30',
    icon: UserX,
    accentColor: 'text-rose-600',
  },
  runaway: {
    title: 'Runaway Customers & Workers',
    badge: 'Runaway & Absentee Alert Registry',
    subtitle: 'Reported runaway foreign workers, unauthorized absentees, and JIM immigration notification tracking.',
    headerGradient: 'from-[#7c2d12] via-[#9a3412] to-[#c2410c]',
    badgeBg: 'bg-orange-400/20',
    badgeColor: 'text-orange-300 border-orange-400/30',
    icon: UserMinus,
    accentColor: 'text-orange-600',
  },
  blacklist: {
    title: 'Black List Customers Registry',
    badge: 'Blacklisted & Barred Registry',
    subtitle: 'Barred candidates, foreign workers with immigration violations, security flags, or blacklist sanctions.',
    headerGradient: 'from-[#0f172a] via-[#1e293b] to-[#334155]',
    badgeBg: 'bg-rose-500/20',
    badgeColor: 'text-rose-300 border-rose-400/30',
    icon: ShieldAlert,
    accentColor: 'text-slate-900',
  },
};

export default function CustomerStatusListing({
  status,
  portalType = 'superadmin',
  baseRoute = '/customers',
}: CustomerStatusListingProps) {
  const meta = STATUS_METADATA[status] || STATUS_METADATA.active;
  const StatusIcon = meta.icon;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [sectors, setSectors] = useState<WorkingSector[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');

  // Live 1-second countdown ticker
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [mounted, setMounted] = useState(false);

  // Status Duration & Schedule Modal State
  const [statusModalCustomer, setStatusModalCustomer] = useState<CustomerRecord | null>(null);
  const [modalMode, setModalMode] = useState<'instant' | 'scheduled'>('instant');
  const [modalInstantStatus, setModalInstantStatus] = useState<string>('active');
  const [modalScheduledDate, setModalScheduledDate] = useState<string>('');
  const [modalScheduledTime, setModalScheduledTime] = useState<string>('23:59');
  const [modalScheduledAction, setModalScheduledAction] = useState<string>('inactive');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Export Dropdown State & Ref
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal & Toast
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [comps, secList, custList] = await Promise.all([
        fetchCompaniesFromBackend().catch(() => getStoredCompanies()),
        fetchWorkingSectors(),
        fetchCustomers(),
      ]);
      setCompanies(comps);
      setSectors(secList);
      setAllCustomers(custList);
    } catch (err) {
      console.error(`Failed to load ${status} customers:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id);
      setAllCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
      showToast('info', 'Customer record deleted successfully.');
    } catch {
      showToast('error', 'Failed to delete customer record.');
    }
  };

  const getCountdownInfo = (scheduledDateStr?: string | null, scheduledAction?: string | null) => {
    if (!scheduledDateStr) {
      return {
        status: 'none' as const,
        label: '',
        color: '',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isUrgent: false,
      };
    }

    let targetTime = new Date(scheduledDateStr).getTime();
    if (isNaN(targetTime)) {
      targetTime = new Date(scheduledDateStr.replace(' ', 'T')).getTime();
    }

    if (isNaN(targetTime)) {
      return {
        status: 'invalid' as const,
        label: 'Invalid Date',
        color: 'text-slate-400 bg-slate-50 border-slate-200',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isUrgent: false,
      };
    }

    const diffMs = targetTime - currentTime;
    if (diffMs <= 0) {
      return {
        status: 'expired' as const,
        label: 'Expired',
        color: 'text-rose-700 bg-rose-50 border-rose-300 font-bold',
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isUrgent: true,
      };
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    let label = '';
    if (days > 0) {
      label = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    } else if (hours > 0) {
      label = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    } else {
      label = `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }

    const isUrgent = days === 0 && hours < 24;
    const isAutoActive = scheduledAction === 'active';

    let color = '';
    if (isAutoActive) {
      color = isUrgent
        ? 'text-emerald-800 bg-emerald-100 border-emerald-400 ring-1 ring-emerald-300 animate-pulse'
        : 'text-emerald-700 bg-emerald-50 border-emerald-300';
    } else if (scheduledAction === 'runaway') {
      color = isUrgent
        ? 'text-orange-800 bg-orange-100 border-orange-400 ring-1 ring-orange-300 animate-pulse'
        : 'text-orange-700 bg-orange-50 border-orange-300';
    } else if (scheduledAction === 'blacklist') {
      color = isUrgent
        ? 'text-rose-950 bg-rose-200 border-rose-600 ring-1 ring-rose-400 animate-pulse'
        : 'text-rose-900 bg-rose-100 border-rose-300';
    } else {
      color = isUrgent
        ? 'text-rose-700 bg-rose-50 border-rose-300 ring-1 ring-rose-200 animate-pulse'
        : 'text-amber-800 bg-amber-50 border-amber-300';
    }

    return {
      status: 'active' as const,
      label,
      days,
      hours,
      minutes,
      seconds,
      color,
      isUrgent,
    };
  };

  const handleOpenStatusModal = (cust: CustomerRecord) => {
    setStatusModalCustomer(cust);
    setModalInstantStatus(cust.status || 'active');

    if (cust.status_scheduled_date) {
      setModalMode('scheduled');
      const d = new Date(cust.status_scheduled_date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setModalScheduledDate(`${yyyy}-${mm}-${dd}`);
      setModalScheduledTime(`${hh}:${min}`);
      setModalScheduledAction(cust.status_scheduled_action || (cust.status === 'active' ? 'inactive' : 'active'));
    } else {
      setModalMode('instant');
      setModalScheduledAction(cust.status === 'active' ? 'inactive' : 'active');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      const yyyy = defaultDate.getFullYear();
      const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const dd = String(defaultDate.getDate()).padStart(2, '0');
      setModalScheduledDate(`${yyyy}-${mm}-${dd}`);
      setModalScheduledTime('23:59');
    }
  };

  const handleSaveStatusModal = async () => {
    if (!statusModalCustomer) return;
    setIsSavingStatus(true);

    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    const payload: {
      status?: string;
      status_scheduled_date?: string | null;
      status_scheduled_action?: string | null;
    } = {};

    if (modalMode === 'instant') {
      payload.status = modalInstantStatus;
      payload.status_scheduled_date = null;
      payload.status_scheduled_action = null;
    } else {
      if (!modalScheduledDate) {
        showToast('error', 'Please select a date for the scheduled status transition.');
        setIsSavingStatus(false);
        return;
      }
      const timePart = modalScheduledTime ? `${modalScheduledTime}:00` : '23:59:59';
      payload.status_scheduled_date = `${modalScheduledDate} ${timePart}`;
      payload.status_scheduled_action = modalScheduledAction;
    }

    try {
      const res = await fetch(`${apiBase}/customers/${statusModalCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAllCustomers((prev) =>
          prev.map((c) => (c.id === statusModalCustomer.id ? ({ ...c, ...payload } as CustomerRecord) : c))
        );
        showToast(
          'success',
          modalMode === 'instant'
            ? `Customer status updated to ${modalInstantStatus.toUpperCase()}.`
            : `Status transition scheduled for ${modalScheduledDate} (${modalScheduledAction.toUpperCase()}).`
        );
        setStatusModalCustomer(null);
      } else {
        showToast('error', 'Failed to update customer status.');
      }
    } catch {
      showToast('error', 'Server error updating status.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleClearSchedule = async () => {
    if (!statusModalCustomer) return;
    setIsSavingStatus(true);
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
    try {
      const payload = {
        status_scheduled_date: null,
        status_scheduled_action: null,
      };
      const res = await fetch(`${apiBase}/customers/${statusModalCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setAllCustomers((prev) =>
          prev.map((c) => (c.id === statusModalCustomer.id ? ({ ...c, ...payload } as CustomerRecord) : c))
        );
        showToast('info', 'Scheduled status transition cancelled.');
        setStatusModalCustomer(null);
      }
    } catch {
      showToast('error', 'Failed to clear schedule.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Filter for this specific status
  const statusCustomers = useMemo(() => {
    return allCustomers.filter((c) => c.status === status);
  }, [allCustomers, status]);

  // Search and secondary filters
  const filteredCustomers = useMemo(() => {
    return statusCustomers.filter((cust) => {
      const term = searchQuery.toLowerCase().trim();
      const matchSearch =
        !term ||
        cust.full_name.toLowerCase().includes(term) ||
        cust.nid_no.toLowerCase().includes(term) ||
        (cust.passport_no && cust.passport_no.toLowerCase().includes(term)) ||
        (cust.phone && cust.phone.toLowerCase().includes(term)) ||
        (cust.email && cust.email.toLowerCase().includes(term)) ||
        (cust.working_sector && cust.working_sector.toLowerCase().includes(term)) ||
        (cust.working_address && cust.working_address.toLowerCase().includes(term));

      const matchCompany =
        selectedCompanyId === 'ALL' ||
        (cust.company_id && cust.company_id.toLowerCase() === selectedCompanyId.toLowerCase());

      const matchSector =
        selectedSector === 'ALL' ||
        (cust.working_sector && cust.working_sector === selectedSector);

      return matchSearch && matchCompany && matchSector;
    });
  }, [statusCustomers, searchQuery, selectedCompanyId, selectedSector]);

  const getCustomerExportRow = (cust: CustomerRecord, idx: number) => {
    const compMatch = companies.find(
      (c) => c.id.toLowerCase() === (cust.company_id || '').toLowerCase()
    );
    const companyName = compMatch ? compMatch.name : cust.company_id || cust.other_company_name || '—';
    const docCount = Array.isArray(cust.documents) ? cust.documents.length : 0;

    return {
      sl: idx + 1,
      name: cust.full_name || '',
      passport: cust.passport_no || '—',
      nid: cust.nid_no || '—',
      company: companyName,
      sector: cust.working_sector || 'General',
      salary: cust.basic_salary || '—',
      phone: cust.phone || cust.worker_phone || '—',
      email: cust.email || '—',
      country: cust.country || 'Malaysia / Expat',
      dossiers: docCount,
      status: (cust.status || 'active').toUpperCase(),
      agent: cust.agent_name || '—',
      program: cust.program_name || '—',
    };
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (!filteredCustomers || filteredCustomers.length === 0) {
      alert('No customers found to export.');
      return;
    }

    const data = filteredCustomers.map((cust, idx) => {
      const row = getCustomerExportRow(cust, idx);
      return {
        SL: row.sl,
        'Worker Name': row.name,
        'Country': row.country,
        'Passport No': row.passport,
        'NID No': row.nid,
        'Employer Company': row.company,
        'Sector': row.sector,
        'Basic Salary': row.salary,
        'Phone': row.phone,
        'Email': row.email,
        'Dossiers Count': row.dossiers,
        'Status': row.status,
        'Agent': row.agent,
        'Program': row.program,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Apply Premium Corporate Header Styling (Row 1)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headerStyle = {
      fill: {
        fgColor: { rgb: '0B4DA2' }, // Corporate Royal Blue
      },
      font: {
        name: 'Calibri',
        sz: 11,
        bold: true,
        color: { rgb: 'FFFFFF' }, // White
      },
      alignment: {
        vertical: 'center',
        horizontal: 'center',
        wrapText: true,
      },
      border: {
        top: { style: 'thin', color: { rgb: '083877' } },
        bottom: { style: 'medium', color: { rgb: '083877' } },
        left: { style: 'thin', color: { rgb: '083877' } },
        right: { style: 'thin', color: { rgb: '083877' } },
      },
    };

    // Apply header style to all cells in Row 0
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellRef]) continue;
      worksheet[cellRef].s = headerStyle;
    }

    // Apply data rows styling
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const isEven = row % 2 === 0;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellRef]) continue;

        const isSL = col === 0;
        worksheet[cellRef].s = {
          fill: isEven ? { fgColor: { rgb: 'F8FAFC' } } : undefined,
          font: {
            name: 'Calibri',
            sz: 10,
          },
          alignment: {
            vertical: 'center',
            horizontal: isSL ? 'center' : 'left',
          },
          border: {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } },
          },
        };
      }
    }

    // Set row heights: Row 0 (Header) = 28pt, data rows = 20pt
    const rowHeights: { hpt: number }[] = [{ hpt: 28 }];
    for (let r = 1; r <= range.e.r; r++) {
      rowHeights.push({ hpt: 20 });
    }
    worksheet['!rows'] = rowHeights;

    worksheet['!cols'] = [
      { wch: 6 },  // SL
      { wch: 25 }, // Worker Name
      { wch: 18 }, // Country
      { wch: 16 }, // Passport No
      { wch: 16 }, // NID No
      { wch: 28 }, // Company
      { wch: 18 }, // Sector
      { wch: 14 }, // Basic Salary
      { wch: 18 }, // Phone
      { wch: 24 }, // Email
      { wch: 14 }, // Dossiers
      { wch: 14 }, // Status
      { wch: 18 }, // Agent
      { wch: 18 }, // Program
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Foreign Customers');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `foreign_customers_${status}_${today}.xlsx`);
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (!filteredCustomers || filteredCustomers.length === 0) {
      alert('No customers found to export.');
      return;
    }

    const headers = [
      'SL',
      'Worker Name',
      'Country',
      'Passport No',
      'NID No',
      'Employer Company',
      'Sector',
      'Basic Salary',
      'Phone',
      'Email',
      'Dossiers Count',
      'Status',
      'Agent',
      'Program',
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredCustomers.map((cust, idx) => {
      const row = getCustomerExportRow(cust, idx);
      return [
        row.sl,
        escapeCSV(row.name),
        escapeCSV(row.country),
        escapeCSV(row.passport),
        escapeCSV(row.nid),
        escapeCSV(row.company),
        escapeCSV(row.sector),
        escapeCSV(row.salary),
        escapeCSV(row.phone),
        escapeCSV(row.email),
        row.dossiers,
        escapeCSV(row.status),
        escapeCSV(row.agent),
        escapeCSV(row.program),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `foreign_customers_${status}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setIsExportOpen(false);
    if (!filteredCustomers || filteredCustomers.length === 0) {
      alert('No customers found to export.');
      return;
    }

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const rowsHtml = filteredCustomers
      .map((cust, idx) => {
        const row = getCustomerExportRow(cust, idx);
        const isAct = row.status === 'ACTIVE';
        const isRunaway = row.status === 'RUNAWAY';
        const isBlacklist = row.status === 'BLACKLIST';
        const badgeClass = isAct
          ? 'badge-active'
          : isRunaway
          ? 'badge-runaway'
          : isBlacklist
          ? 'badge-blacklist'
          : 'badge-inactive';

        return `
          <tr>
            <td style="text-align: center;">${row.sl}</td>
            <td style="font-weight: 600;">
              <div>${row.name || '—'}</div>
              <div style="font-size: 9px; color: #64748b; font-weight: normal;">${row.country}</div>
            </td>
            <td style="font-family: monospace;">${row.passport}</td>
            <td style="font-family: monospace;">${row.nid}</td>
            <td style="font-weight: 500;">${row.company}</td>
            <td>${row.sector}</td>
            <td style="font-family: monospace;">${row.salary}</td>
            <td style="font-family: monospace;">${row.phone}</td>
            <td style="text-align: center; font-family: monospace;">${row.dossiers}</td>
            <td style="text-align: center;">
              <span class="badge ${badgeClass}">${row.status}</span>
            </td>
          </tr>
        `;
      })
      .join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Foreign Customer (${status.toUpperCase()}) Report - ${today}</title>
        <style>
          @page {
            size: landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 16px;
            font-size: 11px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0b4da2;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .title {
            font-size: 18px;
            font-weight: 800;
            color: #0b4da2;
            margin: 0;
          }
          .subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            color: #475569;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th {
            background: #0b4da2;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 6px 7px;
            border: 1px solid #083c7e;
            white-space: nowrap;
          }
          td {
            padding: 5px 7px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-active {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          .badge-inactive {
            background: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }
          .badge-runaway {
            background: #ffedd5;
            color: #c2410c;
            border: 1px solid #fed7aa;
          }
          .badge-blacklist {
            background: #0f172a;
            color: #f8fafc;
            border: 1px solid #020617;
          }
          .footer {
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94a3b8;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">FOREIGN CUSTOMER (${status.toUpperCase()}) REPORT</h1>
            <div class="subtitle">Filtered Category: ${status.toUpperCase()} Foreign Workers</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${today}</div>
            <div><strong>Total Filtered:</strong> ${filteredCustomers.length} Records</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">SL</th>
              <th>Worker Name</th>
              <th>Passport</th>
              <th>NID No</th>
              <th>Employer Company</th>
              <th>Sector</th>
              <th>Salary</th>
              <th>Contact</th>
              <th style="text-align: center;">Dossiers</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Generated by Foreign Customer Management System</span>
          <span>Confidential</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  // Statistics
  const totalInStatus = statusCustomers.length;
  const involvedCompanies = new Set(statusCustomers.map((c) => c.company_id).filter(Boolean)).size;
  const involvedSectors = new Set(statusCustomers.map((c) => c.working_sector).filter(Boolean)).size;
  const passportCount = statusCustomers.filter((c) => Boolean(c.passport_no || c.passport_file)).length;

  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : notification.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`bg-gradient-to-r ${meta.headerGradient} text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div
              className={`inline-flex items-center gap-1.5 ${meta.badgeBg} ${meta.badgeColor} border text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-2`}
            >
              <StatusIcon size={12} />
              <span>{meta.badge}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              {meta.title}
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed m-0">
              {meta.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3 py-2 rounded-xl border border-white/20 transition-all cursor-pointer whitespace-nowrap"
              title="Refresh database"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href={`${baseRoute}/dashboard`}
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all no-underline whitespace-nowrap border border-white/30"
            >
              <LayoutDashboard size={14} />
              <span>Customer Dashboard</span>
            </Link>

            <Link
              href={`${baseRoute}/create`}
              className="inline-flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all no-underline whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Register Customer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Total in this Status
            </span>
            <div className={`w-8 h-8 rounded-lg bg-slate-100 ${meta.accentColor} flex items-center justify-center shrink-0`}>
              <StatusIcon size={16} />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black ${meta.accentColor} tracking-tight`}>
              {totalInStatus}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 capitalize">
              {status} foreign workers
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Employer Companies
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{involvedCompanies}</div>
            <div className="text-[11px] text-slate-400 mt-1">Companies associated</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Working Sectors
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{involvedSectors}</div>
            <div className="text-[11px] text-slate-400 mt-1">Economic industries</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">
              Passports On Record
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-teal-600 tracking-tight">{passportCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Biometrics attached</div>
          </div>
        </div>
      </div>

      {/* Quick Status Navigation Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          <Link
            href={`${baseRoute}/dashboard`}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 no-underline transition-all"
          >
            All Customers ({allCustomers.length})
          </Link>

          <Link
            href={`${baseRoute}/active`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all no-underline border ${
              status === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-white' : 'bg-emerald-500'}`} />
            <span>Active Customers ({allCustomers.filter((c) => c.status === 'active').length})</span>
          </Link>

          <Link
            href={`${baseRoute}/inactive`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all no-underline border ${
              status === 'inactive'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === 'inactive' ? 'bg-white' : 'bg-rose-500'}`} />
            <span>Inactive Customers ({allCustomers.filter((c) => c.status === 'inactive').length})</span>
          </Link>

          <Link
            href={`${baseRoute}/runaway`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all no-underline border ${
              status === 'runaway'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === 'runaway' ? 'bg-white' : 'bg-orange-500'}`} />
            <span>Runaway Customers ({allCustomers.filter((c) => c.status === 'runaway').length})</span>
          </Link>

          <Link
            href={`${baseRoute}/blacklist`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all no-underline border ${
              status === 'blacklist'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status === 'blacklist' ? 'bg-rose-400' : 'bg-slate-900'}`} />
            <span>Black List Customers ({allCustomers.filter((c) => c.status === 'blacklist').length})</span>
          </Link>

          <Link
            href={`${baseRoute}/future`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 no-underline transition-all"
          >
            <Sparkles size={12} className="text-purple-600" />
            <span>Future Candidates</span>
          </Link>
        </div>
      </div>

      {/* Main Customers Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${status} workers by name, passport, NID, phone...`}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0b4da2] focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Company Filter */}
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Employer Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sector Filter */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-[#0b4da2]"
            >
              <option value="ALL">All Working Sectors</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Export Dropdown Button (Excel, CSV, PDF) */}
            <div className="relative inline-block text-left shrink-0" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer border border-emerald-700"
                title="Export Foreign Customer List"
              >
                <Download size={13} className="shrink-0" />
                <span>Export</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Export ({filteredCustomers.length} records)
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <FileText size={15} className="text-blue-600 shrink-0" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <Printer size={15} className="text-rose-600 shrink-0" />
                    <span>Export PDF (.pdf)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Worker Name</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Passport</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">NID No</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Employer Company</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">Sector</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[110px]">Salary</th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Contact</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[100px]">Dossiers</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <StatusIcon size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      No {status} customer records found
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {searchQuery
                        ? 'Try clearing the search query or changing filters'
                        : `No workers currently marked with "${status}" status`}
                    </p>
                    <Link
                      href={`${baseRoute}/create`}
                      className="inline-flex items-center gap-1.5 bg-[#0b4da2] text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-xs no-underline"
                    >
                      <Plus size={14} />
                      <span>Register Customer</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const compMatch = companies.find(
                    (c) => c.id.toLowerCase() === (cust.company_id || '').toLowerCase()
                  );
                  const docCount = Array.isArray(cust.documents) ? cust.documents.length : 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Worker Name */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {cust.profile_pic || cust.profile_image ? (
                            <img
                              src={getFileUrl(cust.profile_pic || cust.profile_image)}
                              alt={cust.full_name}
                              className="w-9 h-9 rounded-full object-cover shadow-xs shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {cust.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase() || 'CW'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {cust.full_name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {cust.country || 'Malaysia / Expat'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Passport */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="font-semibold text-slate-800">
                          {cust.passport_no || '—'}
                        </span>
                      </td>

                      {/* NID No */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="font-semibold text-slate-800">
                          {cust.nid_no || '—'}
                        </span>
                      </td>

                      {/* Employer Company */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {compMatch ? compMatch.name : cust.company_id || cust.other_company_name || '—'}
                        </span>
                      </td>

                      {/* Working Sector */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-medium text-slate-800">
                          {cust.working_sector || 'General'}
                        </span>
                      </td>

                      {/* Basic Salary */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="text-slate-800 font-semibold">
                          {cust.basic_salary || '—'}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap font-mono text-xs">
                        <span className="text-slate-800">
                          {cust.phone || cust.worker_phone || '—'}
                        </span>
                      </td>

                      {/* Documents */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            docCount > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <FileText size={11} />
                          <span>{docCount} files</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap" suppressHydrationWarning>
                        <div className="flex flex-col items-center justify-center gap-1.5 py-0.5" suppressHydrationWarning>
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(cust)}
                            className="group inline-flex items-center gap-2 p-1 px-2 rounded-lg hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                            title="Click to manage instant status or schedule duration status"
                          >
                            <span
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                cust.status === 'active' ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  cust.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                cust.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : cust.status === 'pending'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : cust.status === 'absent'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : cust.status === 'runaway'
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                  : cust.status === 'blacklist'
                                  ? 'bg-rose-950 text-rose-100 border border-rose-900'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span className="capitalize">{cust.status === 'blacklist' ? 'Black List' : cust.status || 'Active'}</span>
                            </span>
                          </button>

                          {/* Live Scheduled Transition Countdown Badge */}
                          {cust.status_scheduled_date && (() => {
                            const cd = getCountdownInfo(cust.status_scheduled_date, cust.status_scheduled_action);
                            if (cd.status === 'none') return null;
                            const actionLabel = cust.status_scheduled_action === 'active'
                              ? 'Auto Activates'
                              : cust.status_scheduled_action === 'runaway'
                              ? 'Auto Runaway'
                              : cust.status_scheduled_action === 'blacklist'
                              ? 'Auto Blacklist'
                              : 'Auto Deactivates';
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(cust)}
                                className={`inline-flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs group/cd hover:scale-[1.02] ${cd.color}`}
                                title={`Scheduled to ${actionLabel} on ${new Date(cust.status_scheduled_date).toLocaleString()} - Click to edit or clear`}
                                suppressHydrationWarning
                              >
                                <div className="inline-flex items-center gap-1 font-mono text-[11px] font-bold tabular-nums tracking-tight" suppressHydrationWarning>
                                  <Clock size={11} className="shrink-0 animate-pulse text-current" />
                                  <span>{mounted ? cd.label : '...'}</span>
                                </div>
                                <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-90">
                                  {actionLabel}
                                </div>
                              </button>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`${baseRoute}/view?id=${cust.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors"
                            title="View customer dossier"
                          >
                            <Eye size={15} />
                          </Link>

                          <Link
                            href={`${baseRoute}/create?id=${cust.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Edit customer details"
                          >
                            <Edit2 size={15} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                            title="Delete customer record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Customer Record</h3>
            <p className="text-xs text-slate-500 mb-5">
              Are you sure you want to delete this customer record? All target records and uploaded documents will be permanently removed.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors border-0 cursor-pointer shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Duration & Transition Schedule Modal */}
      {statusModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-8 p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 m-0">
                    Status Duration & Schedule
                  </h3>
                  <p className="text-[11px] text-slate-500 m-0">
                    {statusModalCustomer.full_name} ({statusModalCustomer.passport_no || `#${statusModalCustomer.id}`})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setModalMode('instant')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                  modalMode === 'instant'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${modalInstantStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span>Instant</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('scheduled')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
                  modalMode === 'scheduled'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <Calendar size={14} className={modalMode === 'scheduled' ? 'text-amber-600' : ''} />
                <span>Scheduled</span>
              </button>
            </div>

            {/* MODE 1: Instant Toggle */}
            {modalMode === 'instant' && (
              <div className="space-y-3 py-1">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'active', label: 'Active', color: 'bg-emerald-500', activeClass: 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-300 text-emerald-950' },
                    { id: 'inactive', label: 'Inactive', color: 'bg-slate-400', activeClass: 'border-rose-400 bg-rose-50/80 ring-1 ring-rose-200 text-rose-950' },
                    { id: 'pending', label: 'Pending', color: 'bg-amber-500', activeClass: 'border-amber-400 bg-amber-50/80 ring-1 ring-amber-200 text-amber-950' },
                    { id: 'absent', label: 'Absent', color: 'bg-purple-500', activeClass: 'border-purple-400 bg-purple-50/80 ring-1 ring-purple-200 text-purple-950' },
                    { id: 'runaway', label: 'Runaway', color: 'bg-orange-500', activeClass: 'border-orange-400 bg-orange-50/80 ring-1 ring-orange-200 text-orange-950' },
                    { id: 'blacklist', label: 'Black List', color: 'bg-rose-950', activeClass: 'border-rose-900 bg-rose-100 ring-1 ring-rose-500 text-rose-950' },
                  ].map((st) => (
                    <div
                      key={st.id}
                      onClick={() => setModalInstantStatus(st.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none text-xs font-semibold ${
                        modalInstantStatus === st.id
                          ? `${st.activeClass} font-bold shadow-xs`
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${st.color}`} />
                      <span>{st.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODE 2: Scheduled Status Change */}
            {modalMode === 'scheduled' && (
              <div className="space-y-3.5 py-1">
                {/* Target Action */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Action:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalScheduledAction('inactive')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        modalScheduledAction === 'inactive'
                          ? 'border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <UserMinus size={13} className="text-rose-600" />
                      <span className="text-[11px]">Deactivate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalScheduledAction('active')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        modalScheduledAction === 'active'
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck size={13} className="text-emerald-600" />
                      <span className="text-[11px]">Activate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalScheduledAction('runaway')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        modalScheduledAction === 'runaway'
                          ? 'border-orange-400 bg-orange-50 text-orange-800 ring-1 ring-orange-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <AlertCircle size={13} className="text-orange-600" />
                      <span className="text-[11px]">Runaway</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalScheduledAction('blacklist')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        modalScheduledAction === 'blacklist'
                          ? 'border-rose-900 bg-rose-100 text-rose-950 ring-1 ring-rose-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldAlert size={13} className="text-rose-800" />
                      <span className="text-[11px]">Blacklist</span>
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Presets:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '+7 Days', days: 7 },
                      { label: '+15 Days', days: 15 },
                      { label: '+30 Days', days: 30 },
                      { label: '+60 Days', days: 60 },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          const target = new Date();
                          target.setDate(target.getDate() + preset.days);
                          const yyyy = target.getFullYear();
                          const mm = String(target.getMonth() + 1).padStart(2, '0');
                          const dd = String(target.getDate()).padStart(2, '0');
                          setModalScheduledDate(`${yyyy}-${mm}-${dd}`);
                          setModalScheduledTime('23:59');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Date & Time Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Date:
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={modalScheduledDate}
                      onChange={(e) => setModalScheduledDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Time:
                    </label>
                    <input
                      type="time"
                      value={modalScheduledTime}
                      onChange={(e) => setModalScheduledTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    />
                  </div>
                </div>

                {/* Live Countdown Preview Banner */}
                {modalScheduledDate && (() => {
                  const targetStr = `${modalScheduledDate} ${modalScheduledTime || '23:59'}:00`;
                  const cd = getCountdownInfo(targetStr, modalScheduledAction);
                  if (cd.status === 'none') return null;
                  const isAutoActive = modalScheduledAction === 'active';
                  const actionText = modalScheduledAction === 'active'
                    ? 'Auto Activates'
                    : modalScheduledAction === 'runaway'
                    ? 'Auto Runaway'
                    : modalScheduledAction === 'blacklist'
                    ? 'Auto Blacklist'
                    : 'Auto Deactivates';
                  return (
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all shadow-2xs ${
                        isAutoActive
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-amber-50/70 border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={16} className={isAutoActive ? 'text-emerald-700 animate-pulse' : 'text-amber-700 animate-pulse'} />
                        <div>
                          <div className="text-[10px] font-bold text-slate-600 uppercase">
                            Countdown Preview:
                          </div>
                          <div className="text-xs font-mono font-bold text-slate-900">
                            {cd.label || 'Calculating...'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          isAutoActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {actionText}
                      </span>
                    </div>
                  );
                })()}

                {/* Existing Schedule Notice with Live Countdown */}
                {statusModalCustomer.status_scheduled_date && (
                  (() => {
                    const existingCd = getCountdownInfo(
                      statusModalCustomer.status_scheduled_date,
                      statusModalCustomer.status_scheduled_action
                    );
                    const isExistingAutoActive = statusModalCustomer.status_scheduled_action === 'active';
                    return (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="text-[11px] text-slate-600">
                          <span className="font-bold text-slate-800">Current Schedule:</span>{' '}
                          {new Date(statusModalCustomer.status_scheduled_date).toLocaleString()} (
                          {isExistingAutoActive ? 'Activate' : statusModalCustomer.status_scheduled_action || 'Deactivate'})
                          {existingCd.label && (
                            <span className="ml-1.5 font-mono font-bold text-slate-900">
                              [{existingCd.label}]
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleClearSchedule}
                          disabled={isSavingStatus}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer border-0 bg-transparent disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setStatusModalCustomer(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStatusModal}
                disabled={isSavingStatus}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0b4da2] hover:bg-[#083a7c] transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50"
              >
                {isSavingStatus ? 'Saving...' : 'Apply Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

