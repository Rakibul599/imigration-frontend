'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  Globe2,
  Hourglass,
  LogOut,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Company } from '@/lib/companies';
import {
  AuthUser,
  getCurrentUser,
  getMasterAdminUser,
  logoutUser,
  logoutMasterAdmin,
} from '@/lib/auth';
import {
  addCompanyWalletBalance,
  deleteStoredCompany,
  fetchCompaniesFromBackend,
  getStoredCompanies,
  subscribeToCompanyChanges,
  updateStoredCompany,
} from '@/lib/companyStorage';
import {
  fetchInvoices,
  createInvoice,
  markInvoicePaid,
  CompanyInvoice,
} from '@/lib/companyTrialAndFinanceStorage';
import { fetchCustomerPendings, CustomerPendingAmountRecord } from '@/lib/customerFinanceStorage';

// Background Constellation & Ambient Mesh Animation
type Node = { x: number; y: number; vx: number; vy: number };

function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    const MAX_DIST = 140;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const initNodes = () => {
      const count = Math.floor((width * height) / 22000);
      nodes = Array.from({ length: Math.max(count, 22) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    initNodes();
    draw();
    window.addEventListener('resize', () => {
      resize();
      initNodes();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', () => {
        resize();
        initNodes();
      });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-70"
      aria-hidden="true"
    />
  );
}

export default function CompaniesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    return getCurrentUser() || getMasterAdminUser();
  });
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyList, setCompanyList] = useState<Company[]>(() => {
    if (typeof window === 'undefined') return [];
    return getStoredCompanies();
  });
  const [sortField, setSortField] = useState<'name' | 'due' | 'balance'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [invoices, setInvoices] = useState<CompanyInvoice[]>([]);
  const [customerPendings, setCustomerPendings] = useState<CustomerPendingAmountRecord[]>([]);
  const [viewingDueCompany, setViewingDueCompany] = useState<Company | null>(null);
  const [payingCompany, setPayingCompany] = useState<Company | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('Bank Transfer');
  const [payReference, setPayReference] = useState<string>('');
  const [payBankName, setPayBankName] = useState<string>('Maybank');
  const [payNotes, setPayNotes] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Wallet Balance Top-up Modal State
  const [walletTargetCompany, setWalletTargetCompany] = useState<Company | null>(null);
  const [walletAddAmount, setWalletAddAmount] = useState<string>('');
  const [walletPaymentMethod, setWalletPaymentMethod] = useState<string>('Bank Transfer');
  const [walletReference, setWalletReference] = useState<string>('');
  const [walletNotes, setWalletNotes] = useState<string>('');
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState<Company | null>(null);
  const [showSubscriptionAlert, setShowSubscriptionAlert] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Edit / Settings Form State
  const [editName, setEditName] = useState('');
  const [editRoc, setEditRoc] = useState('');
  const [editSector, setEditSector] = useState('');

  // Real-time live countdown ticker (ticks every 1 second)
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdownInfo = (expiresAtStr?: string | null) => {
    if (!expiresAtStr) {
      return {
        hasExpiry: false,
        isExpired: false,
        isExpiringSoon: false,
        label: 'No Expiry Set',
      };
    }

    const expireTime = new Date(expiresAtStr).getTime();
    if (isNaN(expireTime)) {
      return {
        hasExpiry: false,
        isExpired: false,
        isExpiringSoon: false,
        label: 'Invalid Date',
      };
    }

    const diff = expireTime - currentTime;
    const isExpired = diff <= 0;

    if (isExpired) {
      const pastSeconds = Math.abs(Math.floor(diff / 1000));
      const pastDays = Math.floor(pastSeconds / 86400);
      const pastHours = Math.floor((pastSeconds % 86400) / 3600);
      return {
        hasExpiry: true,
        isExpired: true,
        isExpiringSoon: false,
        label: pastDays > 0 ? `Expired (${pastDays}d ago)` : `Expired (${pastHours}h ago)`,
      };
    }

    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const isExpiringSoon = days <= 7;

    let label = '';
    if (days > 0) {
      label = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      label = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      label = `${minutes}m ${seconds}s`;
    }

    return {
      hasExpiry: true,
      isExpired: false,
      isExpiringSoon,
      label,
    };
  };

  const getPlanLabel = (key?: string | null, isTrial?: boolean) => {
    if (isTrial) return '3-Day Free Trial';
    if (!key) return 'Standard Plan';
    if (key === '1_month') return '1 Month Plan';
    if (key === '3_months') return '3 Months Plan';
    if (key === '6_months') return '6 Months Plan';
    if (key === '10_months') return '10 Months Plan';
    return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Sync with persistent company storage, backend MySQL, and auth
  useEffect(() => {
    const user = getCurrentUser() || getMasterAdminUser();
    const loggedIn =
      typeof window !== 'undefined' &&
      (localStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isMasterAdminLoggedIn') === 'true');

    if (!user || !loggedIn) {
      router.replace('/login?redirect=/companies&error=auth_required');
      return;
    }

    setCurrentUser(user);
    setIsAuthChecking(false);
    setCompanyList(getStoredCompanies());
    fetchCompaniesFromBackend()
      .then((list) => {
        setCompanyList(list);
      })
      .catch(() => { });

    fetchInvoices()
      .then((list) => setInvoices(list))
      .catch(() => {});

    fetchCustomerPendings()
      .then((list) => setCustomerPendings(list))
      .catch(() => {});

    const unsubscribe = subscribeToCompanyChanges(() => {
      setCompanyList(getStoredCompanies());
    });

    const handleAuth = () => {
      const updatedUser = getCurrentUser() || getMasterAdminUser();
      if (!updatedUser) {
        router.replace('/login?redirect=/companies&error=auth_required');
        return;
      }
      setCurrentUser(updatedUser);
    };
    window.addEventListener('portal-auth-change', handleAuth);
    window.addEventListener('storage', handleAuth);

    return () => {
      unsubscribe();
      window.removeEventListener('portal-auth-change', handleAuth);
      window.removeEventListener('storage', handleAuth);
    };
  }, [router]);

  // Permission evaluation
  const isEmployeeRole = currentUser?.role === 'Employee';
  const isCustomerRole = currentUser?.role === 'Customer' || currentUser?.role === 'Worker';
  const isMasterAdminRole = currentUser?.role === 'MasterAdmin';
  const isRestrictedRole = isEmployeeRole || isMasterAdminRole || isCustomerRole;

  const userCanCreate = !isMasterAdminRole && !isCustomerRole && (!isEmployeeRole || Boolean(currentUser?.permissions?.can_create));
  const userCanEdit = isMasterAdminRole ? true : (!isCustomerRole && (!isEmployeeRole || Boolean(currentUser?.permissions?.can_edit)));
  const userCanDelete = !isMasterAdminRole && !isCustomerRole && (!isEmployeeRole || Boolean(currentUser?.permissions?.can_delete));

  // Filter companies: strictly restrict for employees and master admins to their assigned_companies
  const accessibleCompanies = isRestrictedRole
    ? companyList.filter((c) => {
      const assigned = Array.isArray(currentUser?.assigned_companies)
        ? currentUser.assigned_companies
        : [];
      if (assigned.length === 0) return false;
      if (assigned.includes('*')) return true;

      const cleanCompId = (c.id || '').trim().toLowerCase();
      const cleanCompName = (c.name || '').trim().toLowerCase();
      const cleanCompRoc = (c.roc || '').trim().toLowerCase();
      const cleanDbId = String(c.db_id || '').trim().toLowerCase();
      const cleanCompNormalized = cleanCompName.replace(/[^a-z0-9]/g, '');

      const workerCompId = (currentUser as any)?.company_id ? String((currentUser as any).company_id).trim().toLowerCase() : '';
      if (workerCompId && (workerCompId === cleanCompId || workerCompId === cleanDbId)) {
        return true;
      }

      return assigned.some((raw) => {
        const id = (raw || '').trim().toLowerCase();
        if (!id) return false;
        const idNormalized = id.replace(/[^a-z0-9]/g, '');
        return (
          id === cleanCompId ||
          id === cleanCompName ||
          (cleanCompRoc && id === cleanCompRoc) ||
          (cleanDbId && id === cleanDbId) ||
          (idNormalized && cleanCompNormalized && idNormalized === cleanCompNormalized)
        );
      });
    })
    : companyList;


  const openSettingsModal = (company: Company) => {
    setShowSettingsModal(company);
    setEditName(company.name);
    setEditRoc(company.roc);
    setEditSector(company.sector);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSettingsModal || !userCanEdit) return;

    const updatedCompany: Company = {
      ...showSettingsModal,
      name: editName.trim() || showSettingsModal.name,
      roc: editRoc.trim() || showSettingsModal.roc,
      sector: editSector.trim() || showSettingsModal.sector,
    };

    const updated = await updateStoredCompany(updatedCompany);
    setCompanyList(updated);
    setShowSettingsModal(null);
    setActionFeedback({
      type: 'success',
      message: `Company "${updatedCompany.name}" updated successfully.`,
    });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!userCanDelete) {
      alert('Permission Denied: You do not have permission to delete companies.');
      return;
    }
    if (!confirm(`Are you sure you want to remove "${companyName}"? This action is permanent.`)) {
      return;
    }

    const updated = await deleteStoredCompany(companyId);
    setCompanyList(updated);
    setShowSettingsModal(null);
    setActionFeedback({
      type: 'info',
      message: `Company "${companyName}" has been deleted.`,
    });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const getCompanyDueInfo = (comp: Company) => {
    // 1. Direct Invoice Dues (from backend invoices)
    const compInvs = invoices.filter((inv) => {
      const matchId =
        inv.company_id && comp.id && String(inv.company_id).toLowerCase() === String(comp.id).toLowerCase();
      const matchDbId =
        inv.company_id && comp.db_id && String(inv.company_id) === String(comp.db_id);
      const matchName =
        inv.company_name &&
        comp.name &&
        inv.company_name.toLowerCase().trim() === comp.name.toLowerCase().trim();
      return Boolean(matchId || matchDbId || matchName);
    });

    const liveInvoiceDue = compInvs
      .filter((inv) => inv.payment_status !== 'Paid')
      .reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0);

    const invoiceDue = compInvs.length > 0 ? liveInvoiceDue : (Number(comp.invoice_due) || 0);

    // 2. Direct Customer / Worker Pending Ledger
    const compPendings = customerPendings.filter((rec) => {
      const matchId =
        rec.company_id && comp.id && String(rec.company_id).toLowerCase() === String(comp.id).toLowerCase();
      const matchDbId =
        rec.company_id && comp.db_id && String(rec.company_id) === String(comp.db_id);
      const matchName =
        rec.company_name &&
        comp.name &&
        rec.company_name.toLowerCase().trim() === comp.name.toLowerCase().trim();
      return Boolean(matchId || matchDbId || matchName);
    });

    const liveCustomerDue = compPendings.reduce((sum, rec) => sum + (Number(rec.pending_amount) || 0), 0);
    const customerDue = compPendings.length > 0 ? liveCustomerDue : (Number(comp.customer_due) || 0);

    // 3. Foreign Worker Pending Wallet (only real recorded pending)
    const walletPending = typeof comp.pendingWallet === 'number' ? comp.pendingWallet : 0;

    // 4. Combined Due
    const recordedDue = invoiceDue + customerDue;
    const totalDue = recordedDue + walletPending;

    return {
      invoiceDue,
      customerDue,
      walletPending,
      recordedDue,
      totalDue,
      hasDirectDue: totalDue > 0,
      invoices: compInvs,
      pendings: compPendings,
    };
  };

  const openPaymentModal = (company: Company) => {
    const dueInfo = getCompanyDueInfo(company);
    setPayingCompany(company);
    setPayAmount(dueInfo.totalDue > 0 ? String(dueInfo.totalDue) : '');
    setPayMethod('Bank Transfer');
    setPayReference(`PAY-${Date.now().toString().slice(-6)}`);
    setPayBankName(company.bankName || 'Maybank');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes(`Due settlement payment for ${company.name}`);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCompany) return;

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive payment amount in RM.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const dueInfo = getCompanyDueInfo(payingCompany);

      // 1. If there are unpaid invoices, settle them first
      const unpaidInvoices = dueInfo.invoices.filter((i) => i.payment_status !== 'Paid');

      if (unpaidInvoices.length > 0) {
        let remainingPayment = amount;
        for (const inv of unpaidInvoices) {
          if (remainingPayment <= 0) break;
          const balance = Number(inv.balance_due) || 0;
          const currentPaid = Number(inv.amount_paid) || 0;
          const paymentForThisInvoice = Math.min(remainingPayment, balance);
          const newPaid = currentPaid + paymentForThisInvoice;

          await markInvoicePaid(inv.id, {
            amount_paid: newPaid,
            payment_method: payMethod,
            payment_reference: payReference,
            bank_name: payBankName,
            notes: payNotes || `Payment of RM ${paymentForThisInvoice.toFixed(2)} recorded on ${payDate}.`,
          });
          remainingPayment -= paymentForThisInvoice;
        }
      } else {
        // 2. If no unpaid invoices exist, create a new settlement invoice in the database
        await createInvoice({
          company_id: payingCompany.id,
          company_name: payingCompany.name,
          customer_name: payingCompany.name,
          customer_email: payingCompany.email || undefined,
          customer_phone: payingCompany.phone || undefined,
          customer_address: payingCompany.address || undefined,
          package_name: 'Due Settlement & Agency Services',
          invoice_date: payDate,
          items: [
            {
              description: `Due Balance Settlement Payment for ${payingCompany.name}`,
              qty: 1,
              unit_price: amount,
              total: amount,
            },
          ],
          total_amount: amount,
          amount_paid: amount,
          balance_due: 0,
          currency: 'MYR',
          payment_status: 'Paid',
          payment_method: payMethod,
          payment_reference: payReference,
          bank_name: payBankName,
          notes: payNotes || `Due payment recorded directly from Companies Directory on ${payDate}.`,
        });
      }

      // Clear pendingWallet / dues on payingCompany in local storage as well
      const updatedCompanyData: Company = {
        ...payingCompany,
        pendingWallet: 0,
        invoice_due: 0,
        customer_due: 0,
        total_due: 0,
      };
      await updateStoredCompany(updatedCompanyData);

      // Refresh live invoices and companies from backend
      const updatedInvoices = await fetchInvoices();
      setInvoices(updatedInvoices);

      const updatedCompanies = await fetchCompaniesFromBackend();
      setCompanyList(updatedCompanies);

      setPayingCompany(null);
      setActionFeedback({
        type: 'success',
        message: `Payment of RM ${amount.toFixed(2)} successfully recorded for ${payingCompany.name}!`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Payment settlement failed. Please try again.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openWalletModal = (company: Company) => {
    setWalletTargetCompany(company);
    setWalletAddAmount('');
    setWalletPaymentMethod('Bank Transfer');
    setWalletReference(`TOPUP-${Date.now().toString().slice(-6)}`);
    setWalletNotes(`Wallet top-up for ${company.name}`);
  };

  const handleConfirmAddWalletBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletTargetCompany) return;

    const amount = parseFloat(walletAddAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive top-up amount in RM.');
      return;
    }

    setIsSubmittingWallet(true);
    try {
      const result = await addCompanyWalletBalance(walletTargetCompany.id, {
        amount,
        payment_method: walletPaymentMethod,
        reference: walletReference,
        notes: walletNotes || `Balance top-up of RM ${amount.toFixed(2)} on ${new Date().toISOString().slice(0, 10)}.`,
      });

      // Refresh live companies from backend
      const updatedCompanies = await fetchCompaniesFromBackend();
      setCompanyList(updatedCompanies);

      const newBalance = result.wallet_balance ?? (Number(walletTargetCompany.wallet_balance || 0) + amount);
      const companyName = walletTargetCompany.name;
      setWalletTargetCompany(null);
      setActionFeedback({
        type: 'success',
        message: `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })} successfully added to ${companyName}'s wallet! New Balance: RM ${newBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
      });
      setTimeout(() => setActionFeedback(null), 4500);
    } catch (err: any) {
      alert(err.message || 'Failed to add wallet balance. Please try again.');
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  const toggleSort = (field: 'name' | 'due' | 'balance' = 'name') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'name');
    }
  };

  const filtered = accessibleCompanies
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.roc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.sector.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'due') {
        const dueA = getCompanyDueInfo(a).totalDue;
        const dueB = getCompanyDueInfo(b).totalDue;
        return sortAsc ? dueA - dueB : dueB - dueA;
      }
      if (sortField === 'balance') {
        const balA = Number(a.wallet_balance) || 0;
        const balB = Number(b.wallet_balance) || 0;
        return sortAsc ? balA - balB : balB - balA;
      }
      if (sortAsc) return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

  const handleLogOut = () => {
    logoutUser();
    logoutMasterAdmin();
    router.push('/login');
  };

  const primaryCompany = accessibleCompanies[0] || companyList[0] || null;
  const primaryExpiry = primaryCompany?.subscription_expires_at || currentUser?.subscription_ends_at || currentUser?.trial_ends_at || null;
  const primaryCountdown = getCountdownInfo(primaryExpiry);
  const isPrimaryTrial = primaryCompany?.subscription_status === 'trial_active' || currentUser?.trial_status === 'trial_active';
  const primaryPlanLabel = getPlanLabel(primaryCompany?.subscription_plan_key || currentUser?.subscription_package, isPrimaryTrial);

  if (isAuthChecking || !currentUser) {
    return (
      <main className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center text-slate-800 p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200/80 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 m-0">Verifying Security Clearance...</h2>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Authentication required to access Company Directory. Redirecting to login...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Background Animated Elements */}
      <BackgroundCanvas />

      {/* Floating Animated Gradient Orbs in Background */}
      <div
        className="fixed top-12 left-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '8s' }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-10 right-10 w-[420px] h-[420px] bg-emerald-200/20 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '10s' }}
        aria-hidden="true"
      />

      {/* Shared Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <div className="w-full max-w-[1200px] mx-auto px-6 py-8 sm:py-10 flex-1 relative z-10">
        {/* Page Title with Underline */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-normal text-slate-800 tracking-tight m-0">
            Please select a company
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorized employer entities registered with Malaysian Foreign Worker Portal.
          </p>
        </div>
        <div className="w-full border-b border-slate-200 mb-6" />

        {/* Company Activation Information Card */}
        <div className="admin-stat-card mb-6 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-500/20">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                  Company Activation Information
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Activation Active
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Subscription license and enterprise access details for your authorized employer entities.
              </p>
            </div>
          </div>

          {/* Quick Metrics / Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
            {/* 1. Plan Package */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Plan Package
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600 shrink-0" />
                <span className="font-bold text-slate-800 text-sm">
                  {primaryPlanLabel}
                </span>
              </div>
            </div>

            {/* 2. Expire Date */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Expire Date
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <CalendarClock size={16} className="text-indigo-600 shrink-0" />
                <span className="font-bold text-slate-800 text-sm font-mono">
                  {primaryExpiry ? (
                    new Date(primaryExpiry).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  ) : (
                    <span className="text-slate-400 font-sans font-normal text-xs">Active License</span>
                  )}
                </span>
              </div>
            </div>

            {/* 3. Live Countdown */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Remaining Duration
              </span>
              <div className="mt-1.5">
                {primaryCountdown.hasExpiry ? (
                  <div
                    suppressHydrationWarning
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-tight shadow-2xs ${primaryCountdown.isExpired
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : primaryCountdown.isExpiringSoon
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                  >
                    {primaryCountdown.isExpired ? (
                      <AlertCircle size={13} className="text-rose-600 shrink-0" />
                    ) : primaryCountdown.isExpiringSoon ? (
                      <Hourglass size={13} className="text-amber-600 shrink-0" />
                    ) : (
                      <Clock size={13} className="text-emerald-600 shrink-0" />
                    )}
                    <span suppressHydrationWarning>{primaryCountdown.label}</span>
                  </div>
                ) : (
                  <span className="font-bold text-emerald-600 text-sm flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Fully Active
                  </span>
                )}
              </div>
            </div>

            {/* 4. Logged in Identity */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Authorized Account
              </span>
              <div className="mt-1 text-xs">
                <div className="font-bold text-slate-800 truncate" title={currentUser?.name}>
                  {currentUser?.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  ID: {currentUser?.employee_code || currentUser?.username || 'masteradmin'} • {accessibleCompanies.length} {accessibleCompanies.length === 1 ? 'Company' : 'Companies'}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            className={`mb-5 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${actionFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border border-blue-200 text-blue-900'
              }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Subscription Alert (if clicked) */}
        {showSubscriptionAlert && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 flex items-center justify-between gap-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <Sparkles className="text-blue-600 shrink-0" size={18} />
              <span>
                <strong>Subscription Portal Active:</strong> Enterprise multi-entity license valid through 2026. All company workforce allocations and foreign worker biometric records verified.
              </span>
            </div>
            <button
              onClick={() => setShowSubscriptionAlert(false)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Controls Row: Search Bar & Count Indicator */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company name, ROC, sector..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* The Table Matching User Screenshot */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1f9343] text-white text-xs font-semibold select-none">
                <th
                  onClick={() => toggleSort('name')}
                  className="py-2.5 px-3 border-r border-green-600/60 cursor-pointer hover:bg-[#1a7f39] transition-colors min-w-[190px]"
                  title="Click to sort by Company Name"
                >
                  <div className="flex items-center justify-between">
                    <span>Company Name</span>
                    <span className="text-xs leading-none font-bold opacity-80">
                      {sortField === 'name' ? (sortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-green-600/60 font-semibold min-w-[110px]">
                  Remark
                </th>
                <th
                  onClick={() => toggleSort('balance')}
                  className="py-2.5 px-3 border-r border-green-600/60 cursor-pointer hover:bg-[#1a7f39] transition-colors min-w-[150px]"
                  title="Click to sort by Account Balance"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Wallet size={12} className="opacity-90" />
                      <span>Account Balance</span>
                    </span>
                    <span className="text-xs leading-none font-bold opacity-80">
                      {sortField === 'balance' ? (sortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('due')}
                  className="py-2.5 px-3 border-r border-green-600/60 cursor-pointer hover:bg-[#1a7f39] transition-colors min-w-[140px]"
                  title="Click to sort by Due Amount"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard size={12} className="opacity-90" />
                      <span>Due Amount</span>
                    </span>
                    <span className="text-xs leading-none font-bold opacity-80">
                      {sortField === 'due' ? (sortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
                <th className="py-2.5 px-3 border-r border-green-600/60 font-semibold min-w-[125px]">
                  Expire Date
                </th>
                <th className="py-2.5 px-3 border-r border-green-600/60 font-semibold min-w-[155px] text-center">
                  <span className="inline-flex items-center justify-center gap-1">
                    <Clock size={12} className="opacity-90" />
                    <span>Countdown</span>
                  </span>
                </th>
                <th className="py-2.5 px-3 text-right font-semibold min-w-[130px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.map((company) => {
                const compExpiry = company.subscription_expires_at || currentUser?.subscription_ends_at || currentUser?.trial_ends_at;
                const compCountdown = getCountdownInfo(compExpiry);
                const compIsTrial = company.subscription_status === 'trial_active';
                const compPlan = getPlanLabel(company.subscription_plan_key, compIsTrial);
                const dueInfo = getCompanyDueInfo(company);

                return (
                  <tr
                    key={company.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* 1. Company Name & ROC */}
                    <td className="py-2 px-3 border-r border-slate-200 align-middle">
                      <div className="flex flex-col">
                        <Link
                          href={`/services?company=${encodeURIComponent(company.id)}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-xs leading-tight tracking-tight block truncate max-w-[220px]"
                          title={company.name}
                        >
                          {company.name}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {company.roc ? `ROC: ${company.roc}` : 'No ROC'}
                        </span>
                      </div>
                    </td>

                    {/* 2. Remark (Sector) */}
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-600 align-middle">
                      <span className="text-xs font-medium text-slate-700 block truncate max-w-[120px]" title={company.sector || '—'}>
                        {company.sector || '—'}
                      </span>
                    </td>

                    {/* 3. Account Balance */}
                    <td className="py-2 px-3 border-r border-slate-200 align-middle">
                      <div className="flex items-center justify-between gap-1.5">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">RM</span>
                            <span className="font-mono font-bold text-xs text-emerald-700">
                              {(Number(company.wallet_balance) || 0).toLocaleString('en-MY', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <span
                            className="text-[10px] text-slate-400 font-mono leading-none block mt-0.5 truncate max-w-[110px]"
                            title={company.wallet_account_no || `ID: ${company.id}`}
                          >
                            {company.wallet_account_no
                              ? `Acc: ${company.wallet_account_no}`
                              : `ID: ${company.id}`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openWalletModal(company)}
                          title={`Add Balance for ${company.name}`}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shrink-0"
                        >
                          + Top Up
                        </button>
                      </div>
                    </td>

                    {/* 4. Due Amount */}
                    <td className="py-2 px-3 border-r border-slate-200 align-middle">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] text-slate-400 font-mono font-semibold">RM</span>
                          <span
                            className={`font-mono font-bold text-xs ${
                              dueInfo.totalDue > 0
                                ? 'text-rose-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {dueInfo.totalDue.toLocaleString('en-MY', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        {dueInfo.totalDue > 0 ? (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(company)}
                            title={`Pay Due RM ${dueInfo.totalDue.toFixed(2)}`}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer shrink-0"
                          >
                            Pay Due
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200/80 shrink-0">
                            Cleared
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Expire Date */}
                    <td className="py-2 px-3 border-r border-slate-200 align-middle">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {compExpiry
                            ? new Date(compExpiry).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Active'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {compPlan}
                        </span>
                      </div>
                    </td>

                    {/* 6. Countdown (Dedicated Column) */}
                    <td className="py-2 px-3 border-r border-slate-200 align-middle text-center whitespace-nowrap">
                      {compCountdown.hasExpiry ? (
                        <span
                          suppressHydrationWarning
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                            compCountdown.isExpired
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : compCountdown.isExpiringSoon
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {compCountdown.isExpired ? (
                            <AlertCircle size={10} className="text-rose-500 shrink-0" />
                          ) : (
                            <Clock size={10} className="text-emerald-500 shrink-0" />
                          )}
                          <span suppressHydrationWarning>{compCountdown.label}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>

                    {/* 7. Actions */}
                    <td className="py-2 px-3 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openWalletModal(company)}
                          title={`Add Wallet Balance for ${company.name}`}
                          className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-emerald-50 flex items-center justify-center text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          <Wallet size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openPaymentModal(company)}
                          title={
                            dueInfo.totalDue > 0
                              ? `Pay Due (RM ${dueInfo.totalDue.toLocaleString('en-MY', { minimumFractionDigits: 2 })})`
                              : 'Record Due Payment'
                          }
                          className={`w-7 h-7 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                            dueInfo.totalDue > 0
                              ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >
                          <CreditCard size={13} />
                        </button>

                        <Link
                          href={`/services?company=${encodeURIComponent(company.id)}`}
                          title="View Digital Service Cards"
                          className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-500 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          <BookOpen size={13} />
                        </Link>

                        {userCanEdit ? (
                          <button
                            type="button"
                            onClick={() => openSettingsModal(company)}
                            title="Company Details"
                            className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <Settings size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openSettingsModal(company)}
                            title="View Company Information (Read Only)"
                            className="w-7 h-7 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            <Settings size={13} />
                          </button>
                        )}

                        {userCanDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCompany(company.id, company.name)}
                            title="Delete Company"
                            className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-slate-500 font-medium bg-slate-50/50"
                  >
                    {isRestrictedRole && accessibleCompanies.length === 0 ? (
                      <div className="max-w-md mx-auto flex flex-col items-center gap-2">
                        <ShieldAlert size={32} className="text-amber-500" />
                        <div className="font-bold text-slate-800 text-sm">
                          No Companies Assigned
                        </div>
                        <p className="text-xs text-slate-500 m-0">
                          Your {isMasterAdminRole ? 'Master Admin' : 'employee'} profile ({currentUser?.name}) currently has no assigned companies. Please contact your Super Administrator to grant you access.
                        </p>
                      </div>
                    ) : (
                      <div>No company found matching &quot;{searchTerm}&quot;.</div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Settings / Edit Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowSettingsModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer bg-transparent border-0"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Settings size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  {showSettingsModal.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {showSettingsModal.roc}
                </p>
              </div>
            </div>

            {userCanEdit ? (
              <form onSubmit={handleUpdateCompany} className="space-y-3.5 mb-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ROC Registration Number
                  </label>
                  <input
                    type="text"
                    value={editRoc}
                    onChange={(e) => setEditRoc(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Industry Sector
                  </label>
                  <input
                    type="text"
                    value={editSector}
                    onChange={(e) => setEditSector(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  {userCanDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCompany(showSettingsModal.id, showSettingsModal.name)}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(null)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-[#0b4da2] hover:bg-[#083c80] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Industry Sector:</span>
                  <strong className="text-slate-800">{showSettingsModal.sector}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Permit Status:</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded">
                    {showSettingsModal.tag || 'Verified JIM'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Workers:</span>
                  <strong className="text-slate-800">
                    {showSettingsModal.totalWorkers.toLocaleString()}
                  </strong>
                </div>
                <div className="text-[11px] text-slate-400 italic pt-1">
                  * Note: Edit permission is not granted to your employee profile.
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSettingsModal(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/services?company=${encodeURIComponent(showSettingsModal.id)}`}
                className="px-4 py-2 bg-[#0b4da2] hover:bg-[#083c80] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer no-underline"
              >
                Open Service Cards
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Company Due Breakdown Modal */}
      {viewingDueCompany && (() => {
        const dueInfo = getCompanyDueInfo(viewingDueCompany);
        const hasInvoices = dueInfo.invoices.length > 0;
        const hasPendings = dueInfo.pendings.length > 0;

        // Determine target routes based on user role
        const isSuperAdmin = !currentUser?.role || currentUser?.role === 'SuperAdmin';
        const invoicesHref = isSuperAdmin ? '/superadmin/companies/invoices' : `/services?company=${encodeURIComponent(viewingDueCompany.id)}`;
        const customerPendingHref = isSuperAdmin
          ? '/superadmin/customers/pending-amount'
          : currentUser?.role === 'MasterAdmin'
          ? '/masteradmin/customers/pending-amount'
          : '/employee/customers/pending-amount';

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 to-[#0b4da2] text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <CreditCard size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold m-0 leading-tight">
                      {viewingDueCompany.name}
                    </h3>
                    <p className="text-[11px] text-white/70 m-0 font-mono">
                      {viewingDueCompany.roc || 'No ROC'} • Financial Due Ledger
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingDueCompany(null)}
                  className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer bg-transparent border-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                      Total Outstanding Due
                    </span>
                    <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                      RM {dueInfo.totalDue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    {dueInfo.invoiceDue > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle size={13} className="text-rose-600" />
                        <span>Action Required</span>
                      </span>
                    ) : dueInfo.totalDue > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <Clock size={13} className="text-amber-600" />
                        <span>Pending Settlement</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>Fully Cleared</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 1: Invoices Due */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <FileText size={14} className="text-blue-600" />
                      <span>Company Invoices &amp; Subscriptions</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900">
                      RM {dueInfo.invoiceDue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {hasInvoices ? (
                    <div className="space-y-2 mt-2">
                      {dueInfo.invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="bg-slate-50 border border-slate-100 rounded p-2 text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">
                              {inv.invoice_no} • {inv.package_name || 'Service Package'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Due: {inv.due_date || 'No Date'} • Status: {inv.payment_status}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-rose-600">
                              RM {Number(inv.balance_due).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Total: RM {Number(inv.total_amount).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 m-0 italic">
                      {dueInfo.invoiceDue > 0
                        ? `Recorded balance due: RM ${dueInfo.invoiceDue.toFixed(2)}`
                        : 'No unpaid invoices logged. All billed subscriptions and packages are settled.'}
                    </p>
                  )}

                  {isSuperAdmin && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end">
                      <Link
                        href={invoicesHref}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        <span>Manage Company Invoices</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Section 2: Worker / Customer Pending Ledger */}
                <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <Wallet size={14} className="text-amber-600" />
                      <span>Foreign Worker Pending Dues</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900">
                      RM {(dueInfo.customerDue > 0 ? dueInfo.customerDue : dueInfo.walletPending).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {hasPendings ? (
                    <div className="space-y-2 mt-2">
                      {dueInfo.pendings.map((rec) => (
                        <div
                          key={rec.id}
                          className="bg-slate-50 border border-slate-100 rounded p-2 text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">
                              {rec.customer_name} ({rec.passport_no || 'Worker'})
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Target: RM {Number(rec.target_amount).toFixed(2)} • Deposited: RM {Number(rec.total_deposited).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-amber-700">
                            RM {Number(rec.pending_amount).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 m-0">
                      Foreign worker pending ledger allocation based on active/inactive quota and recorded worker metrics (RM {dueInfo.walletPending.toLocaleString()}).
                    </p>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end">
                    <Link
                      href={customerPendingHref}
                      className="text-xs text-amber-700 hover:text-amber-900 font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Inspect Pending Amounts Ledger</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {dueInfo.totalDue > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const comp = viewingDueCompany;
                        setViewingDueCompany(null);
                        openPaymentModal(comp);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <CreditCard size={14} />
                      <span>Settle Due Payment (RM {dueInfo.totalDue.toLocaleString('en-MY', { minimumFractionDigits: 2 })})</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingDueCompany(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Due Payment / Settlement Modal */}
      {payingCompany && (() => {
        const dueInfo = getCompanyDueInfo(payingCompany);
        const parsedAmount = parseFloat(payAmount) || 0;
        const currentTotalDue = dueInfo.totalDue;
        const remainingDueAfter = Math.max(0, currentTotalDue - parsedAmount);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
                    <CreditCard size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold m-0 leading-tight">
                      Record Due Payment
                    </h3>
                    <p className="text-xs text-emerald-100/90 m-0 mt-0.5 font-medium">
                      {payingCompany.name} • {payingCompany.roc || 'Entity'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPayingCompany(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer bg-transparent border-0 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
                {/* Live Balance Overview Card */}
                <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Current Outstanding Due
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-900">
                      RM {currentTotalDue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Remaining After Payment
                    </span>
                    <span className={`text-sm font-bold font-mono ${remainingDueAfter === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                      RM {remainingDueAfter.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Amount to Pay */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Payment Amount (RM) <span className="text-rose-500">*</span>
                    </label>
                    {currentTotalDue > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPayAmount(String(currentTotalDue))}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200 cursor-pointer border-0 transition-colors"
                        >
                          Full (RM {currentTotalDue.toFixed(2)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayAmount((currentTotalDue / 2).toFixed(2))}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 cursor-pointer border-0 transition-colors"
                        >
                          50%
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                      RM
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-11 pr-4 py-2.5 text-sm font-bold font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Payment Method & Date (2 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Payment Method
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Bank Transfer">Bank Transfer (FPX / Interbank)</option>
                      <option value="Cash Deposit">Cash Deposit (CDM)</option>
                      <option value="Online Payment Gateway">Online Gateway / Card</option>
                      <option value="Company Cheque">Company Cheque</option>
                      <option value="Direct Wallet Settlement">Direct Wallet Settlement</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Reference No & Bank Name (2 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Transaction Ref / Receipt No
                    </label>
                    <input
                      type="text"
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                      placeholder="e.g. TRX-20261103"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={payBankName}
                      onChange={(e) => setPayBankName(e.target.value)}
                      placeholder="e.g. Maybank, CIMB"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Notes / Remarks */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Settlement Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Monthly subscription due clearance"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPayingCompany(null)}
                    disabled={isSubmittingPayment}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    <span>
                      {isSubmittingPayment
                        ? 'Processing Payment...'
                        : `Confirm & Record Payment (RM ${parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'})`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Add Company Wallet Balance Modal */}
      {walletTargetCompany && (() => {
        const parsedAddAmount = parseFloat(walletAddAmount) || 0;
        const currentBalance = Number(walletTargetCompany.wallet_balance) || 0;
        const newBalanceAfter = currentBalance + parsedAddAmount;
        const accountDisplay = walletTargetCompany.wallet_account_no
          || walletTargetCompany.bankAccountNo
          || `WAL-${String(walletTargetCompany.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;

        const quickPresets = [100, 500, 1000, 5000, 10000];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
                    <Wallet size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold m-0 leading-tight">
                      Add Wallet Balance / Top Up
                    </h3>
                    <p className="text-xs text-emerald-100/90 m-0 mt-0.5 font-medium">
                      {walletTargetCompany.name} • {accountDisplay}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWalletTargetCompany(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer bg-transparent border-0 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleConfirmAddWalletBalance} className="p-6 space-y-4">
                {/* Account & Live Balance Overview Card */}
                <div className="bg-gradient-to-br from-emerald-50/60 via-slate-50 to-teal-50/40 border border-emerald-200/80 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Current Account Balance
                    </span>
                    <span className="text-2xl font-black font-mono text-emerald-800">
                      RM {currentBalance.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <Wallet size={11} className="text-slate-400" />
                      <span>Account No: {accountDisplay}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Balance After Top-Up
                    </span>
                    <span className="text-base font-extrabold font-mono text-emerald-700 block">
                      RM {newBalanceAfter.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {parsedAddAmount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded font-mono">
                        +RM {parsedAddAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount to Add */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Top-Up Amount (RM) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Select preset or enter custom</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                      RM
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      autoFocus
                      value={walletAddAmount}
                      onChange={(e) => setWalletAddAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-11 pr-4 py-2.5 text-base font-bold font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const currentVal = parseFloat(walletAddAmount) || 0;
                          setWalletAddAmount(String(currentVal + preset));
                        }}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 cursor-pointer transition-colors shadow-2xs"
                      >
                        +RM {preset.toLocaleString()}
                      </button>
                    ))}
                    {parsedAddAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => setWalletAddAmount('')}
                        className="text-[10px] text-slate-400 hover:text-rose-600 px-1.5 py-1 underline cursor-pointer bg-transparent border-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Payment / Deposit Method & Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Payment / Deposit Method
                    </label>
                    <select
                      value={walletPaymentMethod}
                      onChange={(e) => setWalletPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Bank Transfer">Bank Transfer (FPX / Interbank)</option>
                      <option value="Online Banking Gateway">Online Banking / DuitNow</option>
                      <option value="Cash Deposit">Cash Deposit (CDM)</option>
                      <option value="Company Cheque">Company Cheque</option>
                      <option value="Credit / Debit Card">Credit / Debit Card</option>
                      <option value="Direct Admin Adjustment">Direct Admin Adjustment</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Reference / Receipt No
                    </label>
                    <input
                      type="text"
                      value={walletReference}
                      onChange={(e) => setWalletReference(e.target.value)}
                      placeholder="e.g. TOPUP-849201"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Notes / Remarks */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Notes / Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={walletNotes}
                    onChange={(e) => setWalletNotes(e.target.value)}
                    placeholder="e.g. Agency operating account wallet top-up"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setWalletTargetCompany(null)}
                    disabled={isSubmittingWallet}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWallet || parsedAddAmount <= 0}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Coins size={14} />
                    <span>
                      {isSubmittingWallet
                        ? 'Adding Balance...'
                        : `Confirm & Add RM ${parsedAddAmount > 0 ? parsedAddAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 }) : '0.00'}`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Shared Footer */}
      <Footer />
    </main>
  );
}
