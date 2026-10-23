'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Globe2,
  Layers,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { CustomerRecord, fetchCustomers, updateCustomer } from '@/lib/customerStorage';
import { ProgramRecord, fetchPrograms } from '@/lib/programStorage';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import { AgentRecord, fetchAgents } from '@/lib/agentStorage';

function ProgramCustomersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProgramId = searchParams.get('program_id') || 'all';

  const [selectedProgramId, setSelectedProgramId] = useState<string>(initialProgramId);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Quick program reassign modal state
  const [reassignWorker, setReassignWorker] = useState<CustomerRecord | null>(null);
  const [targetProgramId, setTargetProgramId] = useState<string>('');
  const [isUpdatingProgram, setIsUpdatingProgram] = useState(false);

  // Sync state if search params change
  useEffect(() => {
    const pId = searchParams.get('program_id');
    if (pId) {
      setSelectedProgramId(pId);
    }
  }, [searchParams]);

  // Load programs & customers
  const loadData = async () => {
    setLoading(true);
    try {
      const [progList, custList] = await Promise.all([
        fetchPrograms(),
        fetchCustomers(undefined, undefined, undefined, selectedProgramId === 'all' ? undefined : selectedProgramId),
      ]);
      setPrograms(progList);
      setCustomers(custList);
    } catch (err) {
      console.error('Failed to load data:', err);
      showToast('error', 'Failed to load program customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProgramId]);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Currently selected program details
  const currentProgram = useMemo(() => {
    if (selectedProgramId === 'all') return null;
    return programs.find((p) => String(p.id) === selectedProgramId) || null;
  }, [programs, selectedProgramId]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Program filter (in addition to backend query)
      if (selectedProgramId !== 'all' && String(c.program_id) !== selectedProgramId) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchesName = c.full_name?.toLowerCase().includes(s);
        const matchesPassport = c.passport_no?.toLowerCase().includes(s);
        const matchesNid = c.nid_no?.toLowerCase().includes(s);
        const matchesPhone = c.phone?.toLowerCase().includes(s) || c.worker_phone?.toLowerCase().includes(s);
        const matchesAgent = c.agent_name?.toLowerCase().includes(s);
        const matchesProg = c.program_name?.toLowerCase().includes(s);
        if (!matchesName && !matchesPassport && !matchesNid && !matchesPhone && !matchesAgent && !matchesProg) {
          return false;
        }
      }

      return true;
    });
  }, [customers, selectedProgramId, statusFilter, searchTerm]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalWorkers = filteredCustomers.length;
    const activeWorkers = filteredCustomers.filter((c) => c.status === 'active').length;
    const pendingWorkers = filteredCustomers.filter((c) => c.status === 'pending').length;
    const uniqueCompanies = new Set(filteredCustomers.map((c) => c.company_id).filter(Boolean)).size;
    const uniqueAgents = new Set(filteredCustomers.map((c) => c.agent_id).filter(Boolean)).size;

    return { totalWorkers, activeWorkers, pendingWorkers, uniqueCompanies, uniqueAgents };
  }, [filteredCustomers]);

  // Handle Quick Program Reassign
  const handleConfirmReassign = async () => {
    if (!reassignWorker) return;
    setIsUpdatingProgram(true);

    try {
      const selectedProg = programs.find((p) => String(p.id) === targetProgramId);
      const newProgramId = targetProgramId || undefined;
      const newProgramName = selectedProg ? selectedProg.name : undefined;

      const updated = await updateCustomer(reassignWorker.id, {
        program_id: newProgramId,
        program_name: newProgramName,
      });

      if (updated) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === reassignWorker.id
              ? { ...c, program_id: newProgramId, program_name: newProgramName }
              : c
          )
        );
        showToast('success', `Program for ${reassignWorker.full_name} updated successfully.`);
        setReassignWorker(null);
      } else {
        showToast('error', 'Failed to update worker program.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating worker program.');
    } finally {
      setIsUpdatingProgram(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Absent
          </span>
        );
      case 'inactive':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <BookOpen size={14} className="shrink-0" />
            <Link href="/superadmin/programs" className="hover:underline">
              Program Management
            </Link>
            <span>/</span>
            <span>Program Customers</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Program Customers Directory
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 max-w-2xl leading-relaxed">
            Filter, monitor, and manage foreign worker enrollments and deployment assignments by program.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <Link
            href="/superadmin/programs"
            className="inline-flex items-center justify-center gap-2 h-10 px-3.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs whitespace-nowrap"
          >
            <BookOpen size={14} className="text-slate-500 shrink-0" />
            <span>Programs List</span>
          </Link>

          <Link
            href="/superadmin/customers/create"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm whitespace-nowrap"
          >
            <Plus size={15} className="shrink-0" />
            <span>Add Foreign Worker</span>
          </Link>
        </div>
      </div>

      {/* Program Selector Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-indigo-200 border border-white/15">
              <Sparkles size={12} className="text-amber-400" />
              Active Filter By Program
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              {currentProgram ? currentProgram.name : 'All Programs & General Scheme Workers'}
            </h2>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              {currentProgram?.description
                ? currentProgram.description
                : 'Displaying foreign workers across all recruitment initiatives. Choose a program below to isolate workers belonging to that specific scheme.'}
            </p>

            {currentProgram && (
              <div className="flex items-center gap-3 pt-1 flex-wrap text-xs">
                {currentProgram.code && (
                  <span className="font-mono bg-white/15 px-2.5 py-1 rounded-lg text-white font-semibold">
                    {currentProgram.code}
                  </span>
                )}
                {currentProgram.category && (
                  <span className="bg-indigo-700/60 px-2.5 py-1 rounded-lg text-indigo-100 border border-indigo-400/30">
                    {currentProgram.category}
                  </span>
                )}
                {currentProgram.duration && (
                  <span className="bg-indigo-700/60 px-2.5 py-1 rounded-lg text-indigo-100 border border-indigo-400/30 flex items-center gap-1">
                    <Clock size={12} />
                    {currentProgram.duration}
                  </span>
                )}
                {currentProgram.fees && Number(currentProgram.fees) > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-lg font-mono font-semibold">
                    Fee: RM {Number(currentProgram.fees).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Program Select Dropdown */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 w-full lg:w-80 shrink-0">
            <label className="block text-xs font-semibold text-indigo-200 mb-1.5">
              Select Program / Scheme
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProgramId(val);
                if (val === 'all') {
                  router.push('/superadmin/programs/customers');
                } else {
                  router.push(`/superadmin/programs/customers?program_id=${val}`);
                }
              }}
              className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white rounded-lg focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="all">🌐 All Programs (Show All)</option>
              {programs.map((prog) => (
                <option key={prog.id} value={String(prog.id)}>
                  {prog.name} {prog.code ? `(${prog.code})` : ''}
                </option>
              ))}
            </select>

            {currentProgram && (
              <div className="mt-3 flex items-center justify-between text-[11px] text-indigo-200">
                <span>{filteredCustomers.length} workers enrolled</span>
                <Link
                  href={`/superadmin/programs/edit?id=${currentProgram.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-white hover:underline"
                >
                  <Edit2 size={11} />
                  Edit Scheme
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enrolled Workers
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.totalWorkers}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Matching current program</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Workers
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {metrics.activeWorkers}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Valid status &amp; permits</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Employers
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.uniqueCompanies}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Companies taking workers</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recruitment Agents
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.uniqueAgents}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Agents involved</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Briefcase size={20} />
          </div>
        </div>
      </div>

      {/* Controls & Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by worker name, passport, NID, phone, or agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'active', 'pending', 'absent', 'inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            title="Refresh List"
            className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading program customers...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching foreign worker enrollment records</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Users size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Customers Found</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {selectedProgramId !== 'all'
                ? `No foreign workers are currently enrolled in "${currentProgram?.name || 'this program'}". You can assign existing workers or create a new worker under this program.`
                : 'No foreign workers match your search or filter criteria.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                href="/superadmin/customers/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
              >
                <Plus size={14} />
                Create Customer
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4">Foreign Worker / Customer</th>
                  <th className="py-3.5 px-4">Assigned Program</th>
                  <th className="py-3.5 px-4">Employer Company</th>
                  <th className="py-3.5 px-4">Recruitment Agent</th>
                  <th className="py-3.5 px-4">Passport &amp; NID</th>
                  <th className="py-3.5 px-4">Sector &amp; Salary</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Worker Info */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {cust.profile_pic ? (
                            <img
                              src={cust.profile_pic}
                              alt={cust.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {cust.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            ID: #{cust.id} {cust.username ? `• @${cust.username}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Program Info */}
                    <td className="py-4 px-4 align-top">
                      {cust.program_id ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-lg text-xs">
                            <BookOpen size={11} />
                            {cust.program_name || 'Assigned Program'}
                          </span>
                          <button
                            onClick={() => {
                              setReassignWorker(cust);
                              setTargetProgramId(String(cust.program_id || ''));
                            }}
                            className="block text-[10px] text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            Change Program
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            General Scheme
                          </span>
                          <button
                            onClick={() => {
                              setReassignWorker(cust);
                              setTargetProgramId('');
                            }}
                            className="block text-[10px] text-indigo-600 hover:underline mt-1 font-semibold"
                          >
                            + Assign Program
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Employer Company */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-semibold text-slate-800">
                        {cust.company_id || cust.other_company_name || 'Direct / General'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {cust.country || 'Foreign Worker'}
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="py-4 px-4 align-top">
                      {cust.agent_name ? (
                        <div>
                          <div className="font-medium text-slate-800 flex items-center gap-1">
                            <Briefcase size={12} className="text-slate-400" />
                            <span>{cust.agent_name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">Recruitment Agent</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Direct / No Agent</span>
                      )}
                    </td>

                    {/* Passport & NID */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-mono font-medium text-slate-800">
                        {cust.passport_no || 'No Passport'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                        NID: {cust.nid_no}
                      </div>
                    </td>

                    {/* Sector & Salary */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-medium text-slate-800">
                        {cust.working_sector || 'General'}
                      </div>
                      <div className="font-mono text-[11px] font-semibold text-emerald-700 mt-0.5">
                        {cust.basic_salary || 'RM 2,500'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 align-top">
                      {statusBadge(cust.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/superadmin/customers/edit?id=${cust.id}&view=true`}
                          title="View Worker Details"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </Link>

                        <Link
                          href={`/superadmin/customers/edit?id=${cust.id}`}
                          title="Edit Customer"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reassign Program Modal */}
      {reassignWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <BookOpen size={18} />
                <h3 className="text-base font-bold text-slate-900">
                  Assign Program
                </h3>
              </div>
              <button
                onClick={() => setReassignWorker(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Target Worker
                </span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {reassignWorker.full_name}
                </div>
                <div className="text-xs text-slate-500">
                  Passport: {reassignWorker.passport_no || 'N/A'} • NID: {reassignWorker.nid_no}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Select Program / Scheme
                </label>
                <select
                  value={targetProgramId}
                  onChange={(e) => setTargetProgramId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">No Program (General / Unassigned)</option>
                  {programs.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} {p.code ? `(${p.code})` : ''} - Fee: RM {p.fees || 0}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReassignWorker(null)}
                disabled={isUpdatingProgram}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                disabled={isUpdatingProgram}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
              >
                {isUpdatingProgram ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminProgramCustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-7xl mx-auto">
          <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading program customers...</p>
        </div>
      }
    >
      <ProgramCustomersContent />
    </Suspense>
  );
}
