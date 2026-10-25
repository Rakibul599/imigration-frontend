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
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
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
} from '@/lib/companyTrialAndFinanceStorage';

export default function TrialApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<CompanyTrialApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved_trial' | 'paid_active' | 'expired' | 'rejected'
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
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
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
  const activeTrialCount = applications.filter((a) => a.status === 'approved_trial').length;
  const paidCount = applications.filter((a) => a.status === 'paid_active').length;

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
            3-Day Trial Active
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
            Review incoming free trial requests. Approve to grant <strong>3 days free trial access</strong> with instant Master Admin credentials. When payment is received, activate their full package.
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
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            notification.type === 'success'
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
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
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
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'pending'
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
            {pendingCount > 0 ? 'Action required: Approve 3-Day Trial' : 'All up to date'}
          </div>
        </div>

        {/* Active 3-Day Trials */}
        <div
          onClick={() => setStatusFilter('approved_trial')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'approved_trial'
              ? 'border-emerald-400 ring-2 ring-emerald-400/20'
              : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Active 3-Day Trials
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{activeTrialCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Trial active in Master Admin</div>
        </div>

        {/* Paid & Subscribed */}
        <div
          onClick={() => setStatusFilter('paid_active')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'paid_active'
              ? 'border-blue-400 ring-2 ring-blue-400/20'
              : 'border-slate-200/90 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Paid &amp; Subscribed
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0b4da2] mt-2">{paidCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Package payment received</div>
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
            { key: 'approved_trial', label: `3-Day Trial Active (${activeTrialCount})` },
            { key: 'paid_active', label: `Paid Active (${paidCount})` },
            { key: 'expired', label: 'Expired' },
            { key: 'rejected', label: 'Rejected' },
          ].map((st) => {
            const isSelected = statusFilter === st.key;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
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

      {/* Main Table with Dedicated Columns and Broad Width */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[2050px]">
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
                <th className="py-3.5 px-4 text-right w-[270px] min-w-[270px] sticky right-0 bg-slate-50/95 backdrop-blur-xs shadow-[-8px_0_12px_rgba(0,0,0,0.03)] z-10">
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
                          <span>{app.trial_days || 3} Days Free</span>
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
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="text-slate-800 font-medium text-xs">
                          {formatDate(app.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(app.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* 14. Actions (Sticky column on the right) */}
                      <td className="py-3.5 px-4 align-middle text-right sticky right-0 bg-white group-hover:bg-blue-50/35 transition-colors shadow-[-8px_0_12px_rgba(0,0,0,0.03)] z-10">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {/* Primary Decision Action */}
                          {isPending && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleApprove(app)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer border-0 whitespace-nowrap"
                                title="Approve 3-Day Free Trial"
                              >
                                <Check size={12} />
                                <span>Approve Trial</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(app.id)}
                                className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-colors cursor-pointer border border-rose-200"
                                title="Reject application"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {isTrialActive && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(app)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b4da2] hover:bg-[#083877] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer border-0 whitespace-nowrap"
                              title="Receive payment & activate full package"
                            >
                              <DollarSign size={13} />
                              <span>Receive Payment</span>
                            </button>
                          )}

                          {/* Quick Icon Actions */}
                          <button
                            type="button"
                            onClick={() => setViewingApp(app)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors cursor-pointer border border-slate-200 bg-white"
                            title="View Full Application Details"
                          >
                            <Eye size={13} />
                          </button>

                          <Link
                            href={`/companies/quotations/create?company_name=${encodeURIComponent(
                              app.company_name
                            )}&customer_name=${encodeURIComponent(
                              app.applicant_name
                            )}&email=${encodeURIComponent(app.email)}&phone=${encodeURIComponent(
                              app.phone
                            )}`}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors no-underline border border-slate-200 bg-white inline-flex items-center justify-center"
                            title="Create Quotation"
                          >
                            <FileSpreadsheet size={13} />
                          </Link>

                          <Link
                            href={`/companies/invoices/create?company_name=${encodeURIComponent(
                              app.company_name
                            )}&customer_name=${encodeURIComponent(
                              app.applicant_name
                            )}&email=${encodeURIComponent(app.email)}&phone=${encodeURIComponent(
                              app.phone
                            )}&package=${encodeURIComponent(formatPackageName(app.plan_package))}`}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b4da2] hover:bg-blue-50 transition-colors no-underline border border-slate-200 bg-white inline-flex items-center justify-center"
                            title="Create Invoice"
                          >
                            <FileText size={13} />
                          </Link>

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

      {/* Comprehensive Application Details Modal */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0b4da2] border border-blue-100 flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">
                    {viewingApp.company_name}
                  </h3>
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
                  <span className="text-slate-500">Sector:</span>
                  <span className="font-semibold text-slate-800">{viewingApp.sector || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Office Address:</span>
                  <span className="font-medium text-slate-700 text-right max-w-[200px]">
                    {viewingApp.address || '-'}
                  </span>
                </div>
                {viewingApp.created_company_id && (
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Created Company ID:</span>
                    <strong className="text-[#0b4da2] font-mono">{viewingApp.created_company_id}</strong>
                  </div>
                )}
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
              </div>

              {/* Subscription Timeline */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Calendar size={14} className="text-[#0b4da2]" />
                  <span>Timeline &amp; Free Trial</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trial Period:</span>
                  <span className="font-bold text-emerald-700">{viewingApp.trial_days || 3} Days Free</span>
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
                  <span className="text-slate-500">Full Package Ends:</span>
                  <span className="font-bold text-blue-700">{formatDate(viewingApp.package_ends_at)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <DollarSign size={14} className="text-[#0b4da2]" />
                  <span>Payment Record</span>
                </div>
                <div className="flex justify-between">
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
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    RM {viewingApp.payment_amount ? Number(viewingApp.payment_amount).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="text-slate-700">{viewingApp.payment_method || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono text-slate-700">{viewingApp.payment_reference || '-'}</span>
                </div>
              </div>
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
                    <span>Approve 3-Day Trial</span>
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
                <span>3-Day Trial Activated Successfully!</span>
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
              Activating full subscription for <strong className="text-slate-900">{activatingApp.company_name}</strong>. This upgrades their 3-day trial to the complete <strong>{formatPackageName(activatingApp.plan_package)}</strong> ({activatingApp.package_duration_days} days) and generates a paid invoice.
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
