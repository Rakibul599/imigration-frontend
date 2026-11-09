'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Hash,
  Hourglass,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Timer,
  Trash2,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  CompanyTrialApplication,
  PLAN_PACKAGES,
  PlanPackageKey,
  fetchTrialApplications,
  approveTrialApplication,
  activateTrialPackage,
  rejectTrialApplication,
  deleteTrialApplication,
  updateTrialApplication,
  updateTrialDuration,
  updateTrialStatus,
} from '@/lib/companyTrialAndFinanceStorage';

export default function TrialApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<CompanyTrialApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved_trial' | 'paid_active' | 'active' | 'inactive' | 'expired' | 'rejected'
  >('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Application Details Drawer/Modal
  const [viewingApp, setViewingApp] = useState<CompanyTrialApplication | null>(null);

  // Approval Credentials Modal
  const [approvedDetails, setApprovedDetails] = useState<{
    application: CompanyTrialApplication;
    company: any;
    master_admin: any;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Payment & Package Activation Modal
  const [activatingApp, setActivatingApp] = useState<CompanyTrialApplication | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [bankName, setBankName] = useState<string>('Maybank');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isActivating, setIsActivating] = useState(false);

  // Duration Modal
  const [durationApp, setDurationApp] = useState<CompanyTrialApplication | null>(null);
  const [durationDaysInput, setDurationDaysInput] = useState<number>(3);
  const [packageDaysInput, setPackageDaysInput] = useState<number>(30);
  const [customEndDateInput, setCustomEndDateInput] = useState<string>('');
  const [isSavingDuration, setIsSavingDuration] = useState(false);

  // Edit Modal
  const [editingApp, setEditingApp] = useState<CompanyTrialApplication | null>(null);
  const [editFormData, setEditFormData] = useState<{
    company_name: string;
    roc: string;
    sector: string;
    applicant_name: string;
    email: string;
    phone: string;
    address: string;
    plan_package: string;
    package_price: number;
    master_admin_username: string;
    status: any;
    notes: string;
  }>({
    company_name: '',
    roc: '',
    sector: 'General Business',
    applicant_name: '',
    email: '',
    phone: '',
    address: '',
    plan_package: '1_month',
    package_price: 199,
    master_admin_username: '',
    status: 'pending',
    notes: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTrialApplications();
      setApplications(data);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load applications' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (!['active', 'approved_trial', 'paid_active'].includes(app.status)) return false;
        } else if (statusFilter === 'inactive') {
          if (app.status !== 'inactive') return false;
        } else if (app.status !== statusFilter) {
          return false;
        }
      }
      if (planFilter !== 'all' && app.plan_package !== planFilter) return false;
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesName = app.company_name?.toLowerCase().includes(s);
        const matchesApplicant = app.applicant_name?.toLowerCase().includes(s);
        const matchesEmail = app.email?.toLowerCase().includes(s);
        const matchesUser = app.master_admin_username?.toLowerCase().includes(s);
        const matchesRoc = app.roc?.toLowerCase().includes(s);
        const matchesPhone = app.phone?.toLowerCase().includes(s);
        const matchesSector = app.sector?.toLowerCase().includes(s);
        if (
          !matchesName &&
          !matchesApplicant &&
          !matchesEmail &&
          !matchesUser &&
          !matchesRoc &&
          !matchesPhone &&
          !matchesSector
        ) {
          return false;
        }
      }
      return true;
    });
  }, [applications, statusFilter, planFilter, searchTerm]);

  // Counts for stat cards
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const activeCount = applications.filter((a) =>
    ['active', 'approved_trial', 'paid_active'].includes(a.status)
  ).length;
  const activeTrialCount = applications.filter((a) => a.status === 'approved_trial').length;
  const paidCount = applications.filter((a) => a.status === 'paid_active').length;
  const inactiveCount = applications.filter((a) => a.status === 'inactive').length;
  const expiredCount = applications.filter((a) => a.status === 'expired').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  const handleApprove = async (app: CompanyTrialApplication) => {
    if (
      !confirm(
        `Approve 3-Day Free Trial for "${app.company_name}"? This will create the Company and Master Admin account.`
      )
    ) {
      return;
    }
    try {
      const res = await approveTrialApplication(app.id);
      if (res.success) {
        setApprovedDetails(res);
        setNotification({
          type: 'success',
          message: `Application approved! Company and Master Admin created with 3-day free trial.`,
        });
        loadData();
        window.dispatchEvent(new Event('company_trials_updated'));
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Approval failed' });
    }
  };

  const handleToggleActive = async (app: CompanyTrialApplication) => {
    const isCurrentlyInactive = app.status === 'inactive';
    const newStatus = isCurrentlyInactive ? 'active' : 'inactive';
    const actionText = isCurrentlyInactive ? 'activate' : 'deactivate';

    if (
      !confirm(
        `Are you sure you want to ${actionText} "${app.company_name}"? ${isCurrentlyInactive
          ? 'Their Master Admin portal access will be enabled.'
          : 'Their Master Admin portal access will be temporarily disabled.'
        }`
      )
    ) {
      return;
    }

    try {
      const res = await updateTrialStatus(app.id, newStatus);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Company "${app.company_name}" status set to ${isCurrentlyInactive ? 'Active' : 'Inactive'}.`,
        });
        loadData();
        window.dispatchEvent(new Event('company_trials_updated'));
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update status' });
    }
  };

  const handleOpenDurationModal = (app: CompanyTrialApplication) => {
    setDurationApp(app);
    setDurationDaysInput(app.trial_days || 3);
    setPackageDaysInput(app.package_duration_days || 30);
    if (app.trial_ends_at) {
      try {
        const d = new Date(app.trial_ends_at);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setCustomEndDateInput(d.toISOString().slice(0, 16));
      } catch {
        setCustomEndDateInput('');
      }
    } else {
      const d = new Date();
      d.setDate(d.getDate() + (app.trial_days || 3));
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setCustomEndDateInput(d.toISOString().slice(0, 16));
    }
  };

  const handleSaveDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!durationApp) return;

    setIsSavingDuration(true);
    try {
      const res = await updateTrialDuration(durationApp.id, {
        trial_days: durationDaysInput,
        package_duration_days: packageDaysInput,
        trial_ends_at: customEndDateInput ? new Date(customEndDateInput).toISOString() : undefined,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Duration updated for "${durationApp.company_name}"!`,
        });
        setDurationApp(null);
        loadData();
        window.dispatchEvent(new Event('company_trials_updated'));
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update duration' });
    } finally {
      setIsSavingDuration(false);
    }
  };

  const handleQuickExtend = (days: number) => {
    setDurationDaysInput((prev) => (prev || 0) + days);
    if (customEndDateInput) {
      try {
        const d = new Date(customEndDateInput);
        d.setDate(d.getDate() + days);
        setCustomEndDateInput(d.toISOString().slice(0, 16));
      } catch { }
    } else {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setCustomEndDateInput(d.toISOString().slice(0, 16));
    }
  };

  const handleSetPresetDays = (days: number) => {
    setDurationDaysInput(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setCustomEndDateInput(d.toISOString().slice(0, 16));
  };

  const handleOpenEditModal = (app: CompanyTrialApplication) => {
    setEditingApp(app);
    setEditFormData({
      company_name: app.company_name || '',
      roc: app.roc || '',
      sector: app.sector || 'General Business',
      applicant_name: app.applicant_name || '',
      email: app.email || '',
      phone: app.phone || '',
      address: app.address || '',
      plan_package: app.plan_package || '1_month',
      package_price: app.package_price || 199,
      master_admin_username: app.master_admin_username || '',
      status: app.status || 'pending',
      notes: app.notes || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    setIsSavingEdit(true);
    try {
      const res = await updateTrialApplication(editingApp.id, editFormData);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Application for "${editFormData.company_name}" updated successfully!`,
        });
        setEditingApp(null);
        loadData();
        window.dispatchEvent(new Event('company_trials_updated'));
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update application' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenPaymentModal = (app: CompanyTrialApplication) => {
    setActivatingApp(app);
    const pkg = PLAN_PACKAGES.find((p) => p.key === app.plan_package);
    setPaymentAmount(app.package_price || pkg?.price || 199);
    setPaymentRef(`PAY-${Date.now().toString().slice(-6)}`);
    setPaymentMethod('Bank Transfer');
    setBankName('Maybank');
    setPaymentNotes('');
  };

  const handleActivatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activatingApp) return;

    setIsActivating(true);
    try {
      const res = await activateTrialPackage(activatingApp.id, {
        payment_amount: paymentAmount,
        payment_method: paymentMethod,
        payment_reference: paymentRef,
        bank_name: bankName,
        notes: paymentNotes,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Payment registered! ${activatingApp.company_name} subscription activated. Invoice #${res.invoice?.invoice_no} created.`,
        });
        setActivatingApp(null);
        if (viewingApp && viewingApp.id === activatingApp.id) {
          setViewingApp(null);
        }
        loadData();
        window.dispatchEvent(new Event('company_trials_updated'));
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Activation failed' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return;

    try {
      await rejectTrialApplication(id, reason);
      setNotification({ type: 'info', message: 'Application rejected.' });
      if (viewingApp && viewingApp.id === id) {
        setViewingApp(null);
      }
      loadData();
      window.dispatchEvent(new Event('company_trials_updated'));
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to reject application' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this application record?')) return;
    try {
      await deleteTrialApplication(id);
      setNotification({ type: 'info', message: 'Application deleted.' });
      if (viewingApp && viewingApp.id === id) {
        setViewingApp(null);
      }
      loadData();
      window.dispatchEvent(new Event('company_trials_updated'));
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete' });
    }
  };

  const copyCredentialsText = () => {
    if (!approvedDetails) return;
    const admin = approvedDetails.master_admin;
    const comp = approvedDetails.company;
    const text = `Master Admin Portal Access Granted!\n--------------------------------------\nCompany: ${comp.name}\nCompany ID: ${comp.company_id}\nUsername: ${admin.username}\nPassword: ${admin.plain_password || 'Set during application'}\nTrial Duration: 3 Days Free Trial\nTrial Expiry: ${new Date(admin.trial_ends_at).toLocaleString()}\nLogin URL: ${window.location.origin.replace(':3002', ':3000')}/masteradmin/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formatPackageName = (key: PlanPackageKey) => {
    switch (key) {
      case '1_month':
        return '1 Month Plan';
      case '3_months':
        return '3 Months Plan';
      case '6_months':
        return '6 Months Plan';
      case '10_months':
        return '10 Months Plan';
      case '1_year':
        return '1 Year Pro';
      default:
        return key ? key.replace(/_/g, ' ').toUpperCase() : '-';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: CompanyTrialApplication['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Inactive
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending Review
          </span>
        );
      case 'approved_trial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Trial Active
          </span>
        );
      case 'paid_active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0b4da2] border border-blue-200 whitespace-nowrap shadow-2xs">
            <ShieldCheck size={12} className="text-[#0b4da2]" />
            Paid &amp; Subscribed
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            Expired
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
            Rejected
          </span>
        );
      default:
        return <span className="text-slate-500 text-xs">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1750px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/companies" className="hover:text-[#0b4da2] no-underline">
              Company Management
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Trial Applications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="text-amber-500" size={24} />
            <span>Company Trial Applications &amp; Subscriptions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Review incoming free trial requests. Approve to grant free trial access with instant Master Admin credentials. Set or extend duration, toggle active/inactive status, and activate packages upon payment.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            href="/companies/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold shadow-sm hover:shadow transition-all no-underline"
          >
            <Plus size={14} />
            <span>Create Company</span>
          </Link>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Applications */}
        <div className="admin-stat-card bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Applications
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Submitted via Home Page</div>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`admin-stat-card bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${statusFilter === 'pending'
              ? 'border-amber-400 ring-2 ring-amber-400/20'
              : 'border-slate-200/90 hover:border-amber-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
            {pendingCount > 0 ? 'Action required: Approve Trial' : 'All up to date'}
          </div>
        </div>

        {/* Active Companies / Trials */}
        <div
          onClick={() => setStatusFilter('active')}
          className={`admin-stat-card bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${statusFilter === 'active'
              ? 'border-emerald-400 ring-2 ring-emerald-400/20'
              : 'border-slate-200/90 hover:border-emerald-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Active Total
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{activeCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {activeTrialCount} Trials, {paidCount} Subscribed
          </div>
        </div>

        {/* Inactive Companies */}
        <div
          onClick={() => setStatusFilter('inactive')}
          className={`admin-stat-card bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${statusFilter === 'inactive'
              ? 'border-rose-400 ring-2 ring-rose-400/20'
              : 'border-slate-200/90 hover:border-rose-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Inactive
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <PowerOff size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">{inactiveCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Deactivated access</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, applicant, username, ROC, email, phone, sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Package filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2]"
            >
              <option value="all">All Packages</option>
              <option value="1_month">1 Month Plan</option>
              <option value="3_months">3 Months Plan</option>
              <option value="6_months">6 Months Plan</option>
              <option value="10_months">10 Months Plan</option>
              <option value="1_year">1 Year Pro</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
          {[
            { key: 'all', label: `All (${totalCount})` },
            { key: 'pending', label: `Pending (${pendingCount})` },
            { key: 'active', label: `Active (${activeCount})` },
            { key: 'inactive', label: `Inactive (${inactiveCount})` },
            { key: 'approved_trial', label: `Trial Active (${activeTrialCount})` },
            { key: 'paid_active', label: `Paid Active (${paidCount})` },
            { key: 'expired', label: `Expired (${expiredCount})` },
            { key: 'rejected', label: `Rejected (${rejectedCount})` },
          ].map((st) => {
            const isSelected = statusFilter === st.key;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${isSelected
                    ? 'bg-[#0b4da2] text-white border-[#0b4da2] shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table with Dedicated Columns - Horizontal Scroll Including Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse text-xs min-w-[2000px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-3 text-center w-[55px] min-w-[55px]">#</th>
                <th className="py-3.5 px-4 w-[230px] min-w-[230px]">Company Name</th>
                <th className="py-3.5 px-4 w-[140px] min-w-[140px]">ROC Number</th>
                <th className="py-3.5 px-4 w-[130px] min-w-[130px]">Sector</th>
                <th className="py-3.5 px-4 w-[160px] min-w-[160px]">Applicant Name</th>
                <th className="py-3.5 px-4 w-[210px] min-w-[210px]">Email</th>
                <th className="py-3.5 px-4 w-[140px] min-w-[140px]">Phone</th>
                <th className="py-3.5 px-4 w-[160px] min-w-[160px]">Admin Username</th>
                <th className="py-3.5 px-4 w-[150px] min-w-[150px]">Requested Plan</th>
                <th className="py-3.5 px-4 w-[120px] min-w-[120px]">Price</th>
                <th className="py-3.5 px-4 w-[120px] min-w-[120px]">Trial Period</th>
                <th className="py-3.5 px-4 w-[180px] min-w-[180px]">Status</th>
                <th className="py-3.5 px-4 w-[150px] min-w-[150px]">Applied Date</th>
                <th className="py-3.5 px-4 text-center w-[250px] min-w-[250px] bg-slate-50/90">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-7 h-7 border-2 border-[#0b4da2] border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium text-slate-600">Loading trial applications...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-500">
                    <Building2 size={40} className="mx-auto text-slate-300 mb-2.5" />
                    <div className="font-bold text-slate-700 text-sm">No applications found</div>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || statusFilter !== 'all' || planFilter !== 'all'
                        ? 'Try clearing your search terms or filters.'
                        : 'New applications submitted through the homepage will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isPending = app.status === 'pending';
                  const isTrialActive = app.status === 'approved_trial';
                  const isPaidActive = app.status === 'paid_active';

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-blue-50/35 transition-colors group"
                    >
                      {/* 1. ID */}
                      <td className="py-3.5 px-3 text-center align-middle font-mono font-bold text-slate-400">
                        #{app.id}
                      </td>

                      {/* 2. Company Name */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b4da2] border border-blue-100 flex items-center justify-center shrink-0">
                            <Building2 size={15} />
                          </div>
                          <div>
                            <div
                              className="font-bold text-slate-900 text-xs truncate max-w-[180px] group-hover:text-[#0b4da2] transition-colors"
                              title={app.company_name}
                            >
                              {app.company_name}
                            </div>
                            {app.created_company_id && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: <span className="text-slate-600">{app.created_company_id}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. ROC Number */}
                      <td className="py-3.5 px-4 align-middle font-mono text-xs text-slate-700 font-medium">
                        {app.roc ? (
                          <span className="bg-slate-100/90 border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-800">
                            {app.roc}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* 4. Sector / Industry */}
                      <td className="py-3.5 px-4 align-middle">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          {app.sector || 'General'}
                        </span>
                      </td>

                      {/* 5. Applicant Name */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                          <Users size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={app.applicant_name}>
                            {app.applicant_name}
                          </span>
                        </div>
                      </td>

                      {/* 6. Email */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                          <Mail size={13} className="text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${app.email}`}
                            className="text-slate-700 hover:text-[#0b4da2] truncate max-w-[180px] no-underline transition-colors"
                            title={app.email}
                          >
                            {app.email}
                          </a>
                        </div>
                      </td>

                      {/* 7. Phone */}
                      <td className="py-3.5 px-4 align-middle font-mono text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <a
                            href={`tel:${app.phone}`}
                            className="text-slate-700 hover:text-[#0b4da2] no-underline transition-colors"
                          >
                            {app.phone}
                          </a>
                        </div>
                      </td>

                      {/* 8. Admin Username */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          <KeyRound size={12} className="text-[#0b4da2] shrink-0" />
                          <code className="bg-blue-50 text-[#0b4da2] border border-blue-200 font-bold px-1.5 py-0.5 rounded text-[11px] font-mono">
                            {app.master_admin_username}
                          </code>
                        </div>
                      </td>

                      {/* 9. Requested Plan */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                          <Calendar size={13} className="text-[#0b4da2]" />
                          <span className="font-bold text-slate-800 text-xs">
                            {formatPackageName(app.plan_package)}
                          </span>
                        </div>
                      </td>

                      {/* 10. Price */}
                      <td className="py-3.5 px-4 align-middle font-mono font-extrabold text-[#0b4da2] text-xs">
                        RM {app.package_price ? Number(app.package_price).toFixed(2) : '-'}
                      </td>

                      {/* 11. Trial Period */}
                      <td className="py-3.5 px-4 align-middle">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
                          <Sparkles size={11} className="text-emerald-600" />
                          <span>{app.trial_days || 3} Days</span>
                        </span>
                      </td>

                      {/* 12. Status & Expiration */}
                      <td className="py-3.5 px-4 align-middle">
                        <div>
                          {renderStatusBadge(app.status)}
                          {isTrialActive && app.trial_ends_at && (
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                              <Clock size={10} />
                              <span>Ends: {formatDate(app.trial_ends_at)}</span>
                            </div>
                          )}
                          {isPaidActive && app.package_ends_at && (
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                              <Calendar size={10} />
                              <span>Valid: {formatDate(app.package_ends_at)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 13. Applied Date */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap" suppressHydrationWarning>
                        <div className="text-slate-800 font-medium text-xs">
                          {formatDate(app.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono" suppressHydrationWarning>
                          {new Date(app.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* 14. Actions (Scrolls smoothly along with table) */}
                      <td className="py-3.5 px-4 align-middle text-center bg-transparent">
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                          {/* Primary Accept Action for Pending */}
                          {isPending && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleApprove(app)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer border-0 whitespace-nowrap"
                                title="Accept / Approve Trial"
                              >
                                <Check size={11} strokeWidth={2.5} />
                                <span>Accept</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(app.id)}
                                className="px-1.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[11px] transition-colors cursor-pointer border border-rose-200 whitespace-nowrap"
                                title="Reject Application"
                              >
                                <X size={11} strokeWidth={2.5} />
                              </button>
                            </div>
                          )}

                          {/* Quick Payment Action for Active Trial */}
                          {isTrialActive && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(app)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0b4da2] hover:bg-[#083877] text-white font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer border-0 whitespace-nowrap"
                              title="Receive payment & activate full package"
                            >
                              <DollarSign size={11} />
                              <span>Payment</span>
                            </button>
                          )}

                          {/* Active / Inactive Status Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(app)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${app.status === 'inactive'
                                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                            title={
                              app.status === 'inactive'
                                ? 'Status: Inactive (Click to Activate)'
                                : 'Status: Active (Click to Deactivate)'
                            }
                          >
                            {app.status === 'inactive' ? <PowerOff size={13} /> : <Power size={13} />}
                          </button>

                          {/* Duration Set / Extend Icon */}
                          <button
                            type="button"
                            onClick={() => handleOpenDurationModal(app)}
                            className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer border border-amber-200 bg-white"
                            title="Set / Extend Duration"
                          >
                            <Clock size={13} />
                          </button>

                          {/* View Full Application Details Icon */}
                          <button
                            type="button"
                            onClick={() => setViewingApp(app)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors cursor-pointer border border-slate-200 bg-white"
                            title="View Full Application Details"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Edit Application Details Icon */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(app)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors cursor-pointer border border-slate-200 bg-white"
                            title="Edit Application"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete Record Icon */}
                          <button
                            type="button"
                            onClick={() => handleDelete(app.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent bg-transparent"
                            title="Delete record"
                          >
                            <Trash2 size={13} />
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

      {/* Set / Extend Duration Modal */}
      {durationApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
                <Clock size={20} />
                <span>Set / Extend Duration</span>
              </div>
              <button
                type="button"
                onClick={() => setDurationApp(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Company:</span>
                <strong className="text-slate-900">{durationApp.company_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                {renderStatusBadge(durationApp.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trial Period:</span>
                <span className="font-semibold text-slate-800">{durationApp.trial_days || 3} Days</span>
              </div>
              {durationApp.trial_ends_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Expiry:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {new Date(durationApp.trial_ends_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveDuration} className="space-y-4 text-xs">
              {/* Quick Preset Days */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Set Trial Days (Presets)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handleSetPresetDays(days)}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${durationDaysInput === days
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Extend Buttons */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Quick Extend Duration (+ Days)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handleQuickExtend(days)}
                      className="py-1 px-2 rounded-lg font-semibold text-xs border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      +{days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Trial Days input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trial Days Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    required
                    value={durationDaysInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      handleSetPresetDays(val);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Package Days (Subscription)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={730}
                    value={packageDaysInput}
                    onChange={(e) => setPackageDaysInput(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Exact Date & Time Picker */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Specific Expiry Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={customEndDateInput}
                  onChange={(e) => setCustomEndDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  The client will retain access until this exact moment.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDurationApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDuration}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingDuration ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Duration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Application Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2.5">
              <div className="flex items-center gap-2 text-[#0b4da2] font-bold text-base">
                <Edit2 size={18} />
                <span>Edit Application Details (#{editingApp.id})</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/companies/quotations/create?company_name=${encodeURIComponent(
                    editFormData.company_name || editingApp.company_name
                  )}&customer_name=${encodeURIComponent(
                    editFormData.applicant_name || editingApp.applicant_name
                  )}&email=${encodeURIComponent(
                    editFormData.email || editingApp.email
                  )}&phone=${encodeURIComponent(
                    editFormData.phone || editingApp.phone
                  )}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold no-underline transition-colors shadow-2xs"
                  title="Create Quotation for this applicant"
                >
                  <FileSpreadsheet size={13} className="text-[#0b4da2]" />
                  <span>Create Quotation</span>
                </Link>
                <Link
                  href={`/companies/invoices/create?company_name=${encodeURIComponent(
                    editFormData.company_name || editingApp.company_name
                  )}&customer_name=${encodeURIComponent(
                    editFormData.applicant_name || editingApp.applicant_name
                  )}&email=${encodeURIComponent(
                    editFormData.email || editingApp.email
                  )}&phone=${encodeURIComponent(
                    editFormData.phone || editingApp.phone
                  )}&package=${encodeURIComponent(
                    formatPackageName(editFormData.plan_package || editingApp.plan_package)
                  )}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold no-underline transition-colors shadow-2xs"
                  title="Create Invoice for this applicant"
                >
                  <FileText size={13} className="text-[#0b4da2]" />
                  <span>Create Invoice</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Company Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.company_name}
                    onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-semibold"
                  />
                </div>

                {/* ROC */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ROC Number</label>
                  <input
                    type="text"
                    value={editFormData.roc}
                    onChange={(e) => setEditFormData({ ...editFormData, roc: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-mono"
                  />
                </div>

                {/* Sector */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sector</label>
                  <input
                    type="text"
                    value={editFormData.sector}
                    onChange={(e) => setEditFormData({ ...editFormData, sector: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                  />
                </div>

                {/* Applicant Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Applicant Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.applicant_name}
                    onChange={(e) => setEditFormData({ ...editFormData, applicant_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-mono"
                  />
                </div>

                {/* Admin Username */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Master Admin Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.master_admin_username}
                    onChange={(e) => setEditFormData({ ...editFormData, master_admin_username: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-mono font-bold text-[#0b4da2]"
                  />
                </div>

                {/* Status Dropdown (Active, Inactive, etc.) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-bold bg-white"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="approved_trial">3-Day Trial Active</option>
                    <option value="paid_active">Paid &amp; Subscribed</option>
                    <option value="expired">Expired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Plan Package */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Plan</label>
                  <select
                    value={editFormData.plan_package}
                    onChange={(e) => {
                      const val = e.target.value;
                      const pkg = PLAN_PACKAGES.find((p) => p.key === val);
                      setEditFormData({
                        ...editFormData,
                        plan_package: val,
                        package_price: pkg?.price || editFormData.package_price,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-white"
                  >
                    <option value="1_month">1 Month Plan</option>
                    <option value="3_months">3 Months Plan</option>
                    <option value="6_months">6 Months Plan</option>
                    <option value="10_months">10 Months Plan</option>
                    <option value="1_year">1 Year Pro</option>
                  </select>
                </div>

                {/* Package Price */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Package Price (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.package_price}
                    onChange={(e) => setEditFormData({ ...editFormData, package_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
                <textarea
                  rows={2}
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes &amp; Internal Remarks</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/companies/quotations/create?company_name=${encodeURIComponent(
                      editFormData.company_name || editingApp.company_name
                    )}&customer_name=${encodeURIComponent(
                      editFormData.applicant_name || editingApp.applicant_name
                    )}&email=${encodeURIComponent(
                      editFormData.email || editingApp.email
                    )}&phone=${encodeURIComponent(
                      editFormData.phone || editingApp.phone
                    )}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold no-underline transition-colors shadow-2xs"
                  >
                    <FileSpreadsheet size={13} className="text-[#0b4da2]" />
                    <span>Create Quotation</span>
                  </Link>
                  <Link
                    href={`/companies/invoices/create?company_name=${encodeURIComponent(
                      editFormData.company_name || editingApp.company_name
                    )}&customer_name=${encodeURIComponent(
                      editFormData.applicant_name || editingApp.applicant_name
                    )}&email=${encodeURIComponent(
                      editFormData.email || editingApp.email
                    )}&phone=${encodeURIComponent(
                      editFormData.phone || editingApp.phone
                    )}&package=${encodeURIComponent(
                      formatPackageName(editFormData.plan_package || editingApp.plan_package)
                    )}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold no-underline transition-colors shadow-2xs"
                  >
                    <FileText size={13} className="text-[#0b4da2]" />
                    <span>Create Invoice</span>
                  </Link>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingApp(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Application Details Modal */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {viewingApp.logo ? (
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={viewingApp.logo}
                      alt={viewingApp.company_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b4da2] border border-blue-100 flex items-center justify-center shrink-0">
                    <Building2 size={20} />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 m-0">
                      {viewingApp.company_name}
                    </h3>
                    {viewingApp.tag && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0b4da2] border border-blue-200">
                        {viewingApp.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Application #{viewingApp.id}</span>
                    <span>•</span>
                    <span>{formatDate(viewingApp.created_at)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingApp(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status & Package Highlight Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                {renderStatusBadge(viewingApp.status)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Package:</span>
                <span className="font-bold text-[#0b4da2] text-xs">
                  {formatPackageName(viewingApp.plan_package)}
                </span>
                <span className="text-xs font-bold text-slate-700 font-mono">
                  (RM {viewingApp.package_price ? Number(viewingApp.package_price).toFixed(2) : '-'})
                </span>
              </div>
            </div>

            {/* Detailed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Company Profile */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Building2 size={14} className="text-[#0b4da2]" />
                  <span>Company Profile</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ROC Number:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingApp.roc || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Primary Sector:</span>
                  <span className="font-semibold text-slate-800">{viewingApp.sector || 'General'}</span>
                </div>
                {viewingApp.sectors && Array.isArray(viewingApp.sectors) && viewingApp.sectors.length > 0 && (
                  <div>
                    <span className="text-slate-500 block mb-1">Working Sectors:</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingApp.sectors.map((sec, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Initial Workers:</span>
                  <span className="font-bold text-slate-800">{viewingApp.total_workers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Office Address:</span>
                  <span className="font-medium text-slate-700 text-right max-w-[200px]">
                    {viewingApp.address || '-'}
                  </span>
                </div>
                {viewingApp.description && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block mb-1">Overview:</span>
                    <p className="text-slate-700 italic text-[11px] bg-slate-50 p-2 rounded-lg">
                      {viewingApp.description}
                    </p>
                  </div>
                )}
                {viewingApp.created_company_id && (
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Created Company ID:</span>
                    <strong className="text-[#0b4da2] font-mono">{viewingApp.created_company_id}</strong>
                  </div>
                )}
              </div>

              {/* Localization & Bank Details */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Coins size={14} className="text-[#0b4da2]" />
                  <span>Localization &amp; Banking</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Currency:</span>
                  <strong className="text-slate-800 font-mono">{viewingApp.currency || 'MYR'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Language:</span>
                  <span className="font-semibold text-slate-800">{viewingApp.language || 'English'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Name:</span>
                  <span className="font-medium text-slate-800">{viewingApp.bank_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Name:</span>
                  <span className="font-medium text-slate-800">{viewingApp.bank_account_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account / IBAN:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingApp.bank_account_no || '-'}</span>
                </div>
              </div>

              {/* Applicant & Admin Info */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Users size={14} className="text-[#0b4da2]" />
                  <span>Applicant &amp; Master Admin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant Name:</span>
                  <strong className="text-slate-800">{viewingApp.applicant_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <a href={`mailto:${viewingApp.email}`} className="text-[#0b4da2] font-medium no-underline">
                    {viewingApp.email}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <a href={`tel:${viewingApp.phone}`} className="text-slate-800 font-mono font-medium no-underline">
                    {viewingApp.phone}
                  </a>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Admin Username:</span>
                  <code className="text-[#0b4da2] font-bold bg-blue-50 px-2 py-0.5 rounded font-mono">
                    {viewingApp.master_admin_username}
                  </code>
                </div>
                {viewingApp.master_admin_password && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Admin Password:</span>
                    <code className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono">
                      {viewingApp.master_admin_password}
                    </code>
                  </div>
                )}
              </div>

              {/* Subscription Timeline & Payment */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Calendar size={14} className="text-[#0b4da2]" />
                  <span>Timeline &amp; Free Trial</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trial Period:</span>
                  <span className="font-bold text-emerald-700">{viewingApp.trial_days || 3} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trial Starts:</span>
                  <span className="text-slate-700">{formatDate(viewingApp.trial_starts_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trial Ends:</span>
                  <span className="font-bold text-amber-700">{formatDate(viewingApp.trial_ends_at)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold uppercase text-xs">
                    {viewingApp.payment_status === 'paid' ? (
                      <span className="text-emerald-600">PAID</span>
                    ) : (
                      <span className="text-amber-600">UNPAID</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Package Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    RM {viewingApp.package_price ? Number(viewingApp.package_price).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              {/* Managing Directors List */}
              <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-[#0b4da2]" />
                    <span>Managing Director(s) &amp; Executive Officers</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {Array.isArray(viewingApp.directors) ? viewingApp.directors.length : 1} Record(s)
                  </span>
                </div>

                {Array.isArray(viewingApp.directors) && viewingApp.directors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingApp.directors.map((d: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px]"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200/80 pb-1">
                          <span>
                            {idx + 1}. {d.name || viewingApp.applicant_name}
                          </span>
                          {d.basicSalary && (
                            <span className="text-[#0b4da2] font-mono">
                              Salary: {viewingApp.currency || 'MYR'} {d.basicSalary}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-slate-600">
                          <div>
                            <span className="text-slate-400">NID: </span>
                            <span className="font-mono font-medium">{d.nidNo || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Passport: </span>
                            <span className="font-mono font-medium">{d.passportNo || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Phone: </span>
                            <span className="font-medium">{d.phone || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Email: </span>
                            <span className="font-medium truncate block">{d.email || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">SOCSO: </span>
                            <span className="font-mono">{d.socsoNo || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">EPF: </span>
                            <span className="font-mono">{d.epfNo || '-'}</span>
                          </div>
                        </div>

                        {d.carPlateNo && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-700 bg-white p-1.5 rounded">
                            <span className="font-bold">
                              Car: {d.carPlateNo} ({d.carPurchaseType === 'cash' ? 'Cash' : 'EMI'})
                            </span>
                            {d.carAmount && <span>Value: RM {d.carAmount}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs">
                    <p>
                      <strong>Director Name:</strong> {viewingApp.applicant_name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {viewingApp.phone} | <strong>Email:</strong> {viewingApp.email}
                    </p>
                  </div>
                )}
              </div>

              {/* Inquiries / Notes */}
              {viewingApp.notes && (
                <div className="md:col-span-2 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-amber-800 font-bold block mb-1">Applicant Notes &amp; Requests:</span>
                  <p className="text-amber-900 text-[11px] leading-relaxed whitespace-pre-line">
                    {viewingApp.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Link
                  href={`/companies/quotations/create?company_name=${encodeURIComponent(
                    viewingApp.company_name
                  )}&customer_name=${encodeURIComponent(
                    viewingApp.applicant_name
                  )}&email=${encodeURIComponent(viewingApp.email)}&phone=${encodeURIComponent(
                    viewingApp.phone
                  )}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold no-underline"
                >
                  <FileSpreadsheet size={13} />
                  <span>Create Quotation</span>
                </Link>
                <Link
                  href={`/companies/invoices/create?company_name=${encodeURIComponent(
                    viewingApp.company_name
                  )}&customer_name=${encodeURIComponent(
                    viewingApp.applicant_name
                  )}&email=${encodeURIComponent(viewingApp.email)}&phone=${encodeURIComponent(
                    viewingApp.phone
                  )}&package=${encodeURIComponent(formatPackageName(viewingApp.plan_package))}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold no-underline"
                >
                  <FileText size={13} />
                  <span>Create Invoice</span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                {viewingApp.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewingApp(null);
                      handleApprove(viewingApp);
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer border-0"
                  >
                    <Check size={14} />
                    <span>Approve Trial</span>
                  </button>
                )}

                {viewingApp.status === 'approved_trial' && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewingApp(null);
                      handleOpenPaymentModal(viewingApp);
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white font-bold text-xs shadow-xs cursor-pointer border-0"
                  >
                    <DollarSign size={14} />
                    <span>Receive Payment &amp; Activate</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingApp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer border border-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Credentials Modal */}
      {approvedDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                <CheckCircle2 size={20} />
                <span>Trial Activated Successfully!</span>
              </div>
              <button
                type="button"
                onClick={() => setApprovedDetails(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Company <strong className="text-slate-900">{approvedDetails.company?.name}</strong> and Master Admin account have been created. Copy and share these credentials with the client:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Portal</span>
                <span className="font-bold text-slate-800">Master Admin Control Center</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Company Name</span>
                <strong className="text-slate-800">{approvedDetails.company?.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Username</span>
                <code className="text-[#0b4da2] font-extrabold bg-blue-50 px-2 py-0.5 rounded text-xs font-mono">
                  {approvedDetails.master_admin?.username}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Password</span>
                <code className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded text-xs font-mono">
                  {approvedDetails.master_admin?.plain_password || 'As set by applicant'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Trial Ends</span>
                <span className="font-bold text-amber-700">
                  {new Date(approvedDetails.master_admin?.trial_ends_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-400 text-[11px]">Login URL</span>
                <span className="text-[#0b4da2] font-mono text-[11px]">/masteradmin/login</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={copyCredentialsText}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer border border-slate-300"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
              </button>
              <button
                type="button"
                onClick={() => setApprovedDetails(null)}
                className="px-5 py-2 rounded-xl bg-[#0b4da2] hover:bg-[#083877] text-white text-xs font-bold shadow-xs cursor-pointer border-0"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment & Package Activation Modal */}
      {activatingApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#0b4da2] font-bold text-base">
                <DollarSign size={20} />
                <span>Receive Payment &amp; Activate Full Package</span>
              </div>
              <button
                type="button"
                onClick={() => setActivatingApp(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Activating full subscription for <strong className="text-slate-900">{activatingApp.company_name}</strong>. This upgrades their trial to the complete <strong>{formatPackageName(activatingApp.plan_package)}</strong> ({activatingApp.package_duration_days} days) and generates a paid invoice.
            </p>

            <form onSubmit={handleActivatePackage} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount (RM) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-bold text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer (IBG/DuitNow)</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                    <option value="Cash / Cheque">Cash / Cheque</option>
                    <option value="Online Payment Gateway">Online Payment Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Maybank, CIMB, Public Bank..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. DUITNOW-98765432"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Treasury Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Verified by finance team..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0b4da2] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivatingApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActivating}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-[#0b4da2] to-[#083877] text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {isActivating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Activating Package...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirm Payment &amp; Activate Package</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
