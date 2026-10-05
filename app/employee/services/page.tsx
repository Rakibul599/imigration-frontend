'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  ExternalLink,
  FileText,
  Building2,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import {
  ServiceCard,
  getStoredServices,
  fetchServiceCards,
} from '@/lib/serviceStorage';
import { fetchCustomers, CustomerRecord } from '@/lib/customerStorage';
import { getCurrentUser, AuthUser, hasServiceCardAccess } from '@/lib/auth';
import { getStoredCompanies, fetchCompaniesFromBackend } from '@/lib/companyStorage';
import { Company } from '@/lib/companies';
import {
  getStoredThemeSettings,
  fetchThemeSettings,
  subscribeToThemeChanges,
  getServiceCardAnimationClass,
  getServiceCardAnimationStyle,
  ServiceCardsAnimationType,
} from '@/lib/themeSettings';

export default function EmployeeServicesPage() {
  const [services, setServices] = useState<ServiceCard[]>(() => {
    return typeof window !== 'undefined' ? getStoredServices() : [];
  });
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [cardAnimation, setCardAnimation] = useState<ServiceCardsAnimationType>(() => {
    return typeof window !== 'undefined'
      ? getStoredThemeSettings().service_cards_animation || 'from-bottom'
      : 'from-bottom';
  });
  const [cardDuration, setCardDuration] = useState<number>(() => {
    return typeof window !== 'undefined'
      ? getStoredThemeSettings().service_cards_duration || 1000
      : 1000;
  });
  const [cardStagger, setCardStagger] = useState<number>(() => {
    return typeof window !== 'undefined'
      ? getStoredThemeSettings().service_cards_stagger || 120
      : 120;
  });

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    if (user && user.role === 'Employee' && (user.id || user.employee_code)) {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';
      fetch(`${apiBase}/employees/${user.id || user.employee_code}`, {
        headers: { Accept: 'application/json' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh && fresh.id) {
            let freshCards: string[] = ['*'];
            if (Array.isArray(fresh.assigned_service_cards)) {
              freshCards = fresh.assigned_service_cards;
            } else if (typeof fresh.assigned_service_cards === 'string') {
              try {
                const parsed = JSON.parse(fresh.assigned_service_cards);
                if (Array.isArray(parsed)) freshCards = parsed;
                else if (fresh.assigned_service_cards === '*') freshCards = ['*'];
                else freshCards = [fresh.assigned_service_cards];
              } catch {
                freshCards = fresh.assigned_service_cards === '*' ? ['*'] : [fresh.assigned_service_cards];
              }
            } else if (fresh.assigned_service_cards === null || fresh.assigned_service_cards === undefined) {
              freshCards = ['*'];
            }

            const updatedUser: AuthUser = {
              ...user,
              assigned_companies: Array.isArray(fresh.assigned_companies)
                ? fresh.assigned_companies
                : user.assigned_companies,
              assigned_service_cards: freshCards,
              permissions: {
                can_create: fresh.can_create !== undefined ? Boolean(fresh.can_create) : user.permissions.can_create,
                can_edit: fresh.can_edit !== undefined ? Boolean(fresh.can_edit) : user.permissions.can_edit,
                can_delete: fresh.can_delete !== undefined ? Boolean(fresh.can_delete) : user.permissions.can_delete,
              },
            };
            setCurrentUser(updatedUser);
            try {
              localStorage.setItem('portal_current_user', JSON.stringify(updatedUser));
            } catch {}
          }
        })
        .catch(() => {});
    }

    loadData();
    fetchCompaniesFromBackend()
      .then((comps) => setAllCompanies(comps))
      .catch(() => setAllCompanies(getStoredCompanies()));

    fetchThemeSettings()
      .then((theme) => {
        if (theme?.service_cards_animation) {
          setCardAnimation(theme.service_cards_animation);
        }
        if (typeof theme?.service_cards_duration === 'number') {
          setCardDuration(theme.service_cards_duration);
        }
        if (typeof theme?.service_cards_stagger === 'number') {
          setCardStagger(theme.service_cards_stagger);
        }
      })
      .catch(() => {});

    const unsub = subscribeToThemeChanges((theme) => {
      if (theme?.service_cards_animation) {
        setCardAnimation(theme.service_cards_animation);
      }
      if (typeof theme?.service_cards_duration === 'number') {
        setCardDuration(theme.service_cards_duration);
      }
      if (typeof theme?.service_cards_stagger === 'number') {
        setCardStagger(theme.service_cards_stagger);
      }
    });

    return unsub;
  }, []);

  const assignedList = useMemo(() => {
    return (currentUser && Array.isArray(currentUser.assigned_companies))
      ? currentUser.assigned_companies
      : [];
  }, [currentUser]);

  const permittedCompanies = useMemo(() => {
    if (assignedList.length === 0) return [];
    if (assignedList.includes('*')) return allCompanies;
    return allCompanies.filter((c) =>
      assignedList.some((id) => id.toLowerCase() === c.id.toLowerCase())
    );
  }, [allCompanies, assignedList]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedCards, fetchedCustomers] = await Promise.all([
        fetchServiceCards(),
        fetchCustomers(),
      ]);
      setServices(fetchedCards);
      setCustomers(fetchedCustomers);
    } catch (err) {
      console.error('Failed to load services data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter customers within assigned scope
  const scopedCustomers = useMemo(() => {
    if (assignedList.length === 0) return [];
    let list = customers;
    if (!assignedList.includes('*')) {
      list = list.filter((c) =>
        c.company_id && assignedList.some((id) => id.toLowerCase() === c.company_id?.toLowerCase())
      );
    }
    if (selectedCompanyId !== 'ALL') {
      list = list.filter((c) => c.company_id?.toLowerCase() === selectedCompanyId.toLowerCase());
    }
    return list;
  }, [customers, assignedList, selectedCompanyId]);

  // Compute attached documents count per service card
  const docCountsPerCard = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedCustomers.forEach((cust) => {
      if (Array.isArray(cust.documents)) {
        cust.documents.forEach((doc) => {
          if (doc.service_id) {
            counts[doc.service_id] = (counts[doc.service_id] || 0) + 1;
          } else if (doc.service_name) {
            const matched = services.find(
              (s) => s.title.toLowerCase() === doc.service_name?.toLowerCase()
            );
            if (matched) {
              counts[matched.id] = (counts[matched.id] || 0) + 1;
            }
          }
        });
      }
    });
    return counts;
  }, [scopedCustomers, services]);

  const permittedServices = useMemo(() => {
    if (!currentUser || currentUser.role !== 'Employee') {
      return services;
    }
    return services.filter((s) => hasServiceCardAccess(s.id, s.title, currentUser));
  }, [services, currentUser]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return permittedServices;
    return permittedServices.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.tag && s.tag.toLowerCase().includes(q))
    );
  }, [permittedServices, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0b4da2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Staff Operations
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">
                Clearance: Permitted Service Cards
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0">
              Employer Service Cards &amp; Attached Files
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl m-0">
              Review active service cards and monitor uploaded documentation submitted across your assigned employer companies.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/companies"
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-xs no-underline"
            >
              <Sparkles size={15} />
              <span>Launch Live Services Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service cards by name or keyword..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Building2 size={14} className="text-slate-400 shrink-0 hidden sm:inline" />
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Authorized Companies ({permittedCompanies.length})</option>
            {permittedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredServices.map((card, index) => {
          const docCount = docCountsPerCard[card.id] || 0;
          const isSystemCard = card.id === 'customer' || card.id === 'document-download';
          const animClass = getServiceCardAnimationClass(cardAnimation, index);

          return (
            <div
              key={card.id}
              style={getServiceCardAnimationStyle(index, cardDuration, cardStagger)}
              className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all ${animClass}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50/70 p-2 flex items-center justify-center border border-blue-100">
                    <img
                      src={card.image}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      docCount > 0
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {docCount} {docCount === 1 ? 'Doc' : 'Docs'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 m-0">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400">
                  {isSystemCard ? 'System Module' : 'Attached Files'}
                </span>

                <Link
                  href={
                    isSystemCard
                      ? card.id === 'customer'
                        ? '/employee/customers'
                        : '/services'
                      : `/services?serviceModal=${card.id}${
                          selectedCompanyId !== 'ALL' ? `&company=${selectedCompanyId}` : ''
                        }`
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0b4da2] hover:text-[#083a7c] no-underline"
                >
                  <span>Open Card</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && !isLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800 m-0">No Service Cards Available</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'No service cards matched your search keywords.'
              : 'You do not currently have permission to access any service cards. Please contact your administrator.'}
          </p>
        </div>
      )}
    </div>
  );
}
