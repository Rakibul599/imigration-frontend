export interface CompanyStatCard {
  id: number;
  card_key: string;
  name: string;
  icon: string;
  subtitle?: string;
  order_num: number;
  custom_value?: number;
  status: string;
}

export const DEFAULT_COMPANY_STAT_CARDS: CompanyStatCard[] = [
  {
    id: 1,
    card_key: 'registered_companies',
    name: 'REGISTERED COMPANIES',
    icon: 'Building2',
    subtitle: 'View Company List →',
    order_num: 1,
    custom_value: 0,
    status: 'active',
  },
  {
    id: 2,
    card_key: 'active_workers',
    name: 'TOTAL ACTIVE FOREIGN WORKER',
    icon: 'UserCheck',
    subtitle: 'Approved & Active Permits',
    order_num: 2,
    custom_value: 0,
    status: 'active',
  },
  {
    id: 3,
    card_key: 'inactive_workers',
    name: 'TOTAL INACTIVE FOREIGN WORKER',
    icon: 'UserX',
    subtitle: 'Expired / Renewal Pending',
    order_num: 3,
    custom_value: 0,
    status: 'active',
  },
  {
    id: 4,
    card_key: 'target_wallet',
    name: 'TOTAL TARGET FOREIGNER WALLET',
    icon: 'Wallet',
    subtitle: 'Total Worker Target Pool',
    order_num: 4,
    custom_value: 0,
    status: 'active',
  },
  {
    id: 5,
    card_key: 'deposit_wallet',
    name: 'TOTAL DEPOSIT WALLET',
    icon: 'ArrowUpRight',
    subtitle: 'Total Received Inflow',
    order_num: 5,
    custom_value: 0,
    status: 'active',
  },
  {
    id: 6,
    card_key: 'cost_wallet',
    name: 'TOTAL FOREIGNER COST WALLET',
    icon: 'ArrowDownRight',
    subtitle: 'Operational & Levy Outflow',
    order_num: 6,
    custom_value: 0,
    status: 'active',
  },
  {
    id: 7,
    card_key: 'others_cost',
    name: 'TOTAL OTHERS COST/EXPENSE',
    icon: 'Receipt',
    subtitle: 'Miscellaneous / Other Expenses',
    order_num: 7,
    custom_value: 45000,
    status: 'active',
  },
  {
    id: 8,
    card_key: 'profit_wallet',
    name: 'TOTAL FOREIGNER PROFIT WALLET',
    icon: 'TrendingUp',
    subtitle: 'Net Retained Margin',
    order_num: 8,
    custom_value: 0,
    status: 'active',
  },
  {
    id: 9,
    card_key: 'others_profit',
    name: 'TOTAL OTHERS PROFIT',
    icon: 'Coins',
    subtitle: 'Auxiliary & Service Profits',
    order_num: 9,
    custom_value: 32500,
    status: 'active',
  },
  {
    id: 10,
    card_key: 'pending_wallet',
    name: 'TOTAL FOREIGNER PENDING WALLET',
    icon: 'Clock',
    subtitle: 'Pending Approvals & Dues',
    order_num: 10,
    custom_value: 0,
    status: 'active',
  },
  {
    id: 11,
    card_key: 'others_pending',
    name: 'TOTAL OTHERS PENDING WALLET',
    icon: 'CreditCard',
    subtitle: 'Other Pending Invoices & Dues',
    order_num: 11,
    custom_value: 18200,
    status: 'active',
  },
  {
    id: 12,
    card_key: 'total_profit',
    name: 'TOTAL PROFIT',
    icon: 'Sparkles',
    subtitle: 'Foreigner Profit + Others Profit',
    order_num: 12,
    custom_value: 0,
    status: 'active',
  },
];

const STORAGE_KEY = 'agency_company_stat_cards_v2';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export function getStoredCompanyStatCards(): CompanyStatCard[] {
  if (typeof window === 'undefined') return DEFAULT_COMPANY_STAT_CARDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COMPANY_STAT_CARDS));
      return DEFAULT_COMPANY_STAT_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Retain all stored cards preserving their real DB id, custom values, and newly added cards
      const cardList: CompanyStatCard[] = [...parsed];

      // Ensure any default card key exists even if upgrading from an older version
      DEFAULT_COMPANY_STAT_CARDS.forEach((def) => {
        const found = cardList.find(
          (p) => p.card_key === def.card_key || (def.card_key === 'others_cost' && p.card_key === 'others_expense')
        );
        if (!found) {
          cardList.push(def);
        }
      });
      return cardList.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
    }
    return DEFAULT_COMPANY_STAT_CARDS;
  } catch (err) {
    console.error('Error reading company stat cards from storage:', err);
    return DEFAULT_COMPANY_STAT_CARDS;
  }
}

export function saveStoredCompanyStatCards(cards: CompanyStatCard[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sorted = [...cards].sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    window.dispatchEvent(new Event('companyStatCardsUpdated'));
  } catch (err) {
    console.error('Error writing company stat cards to storage:', err);
  }
}

export function subscribeToCompanyStatCardsChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('companyStatCardsUpdated', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('companyStatCardsUpdated', handler);
    window.removeEventListener('storage', handler);
  };
}

export async function fetchCompanyStatCards(): Promise<CompanyStatCard[]> {
  try {
    const res = await fetch(`${API_BASE}/company-stat-cards`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveStoredCompanyStatCards(data);
        return data.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
      }
    }
  } catch (err) {
    console.warn('Backend API for company stat cards unreachable, using local storage:', err);
  }
  return getStoredCompanyStatCards();
}

export async function updateCompanyStatCard(
  id: number | string,
  updates: Partial<CompanyStatCard> & { icon_file?: File }
): Promise<CompanyStatCard[]> {
  const current = getStoredCompanyStatCards();
  const index = current.findIndex((c) => c.id === Number(id) || c.card_key === String(id));
  
  // Optimistic local update
  if (index !== -1) {
    current[index] = {
      ...current[index],
      ...updates,
    };
    saveStoredCompanyStatCards(current);
  }

  try {
    const formData = new FormData();
    if (updates.name !== undefined) formData.append('name', updates.name);
    if (updates.icon !== undefined) formData.append('icon', updates.icon);
    if (updates.subtitle !== undefined) formData.append('subtitle', updates.subtitle);
    if (updates.order_num !== undefined) formData.append('order_num', String(updates.order_num));
    if (updates.custom_value !== undefined) formData.append('custom_value', String(updates.custom_value));
    if (updates.icon_file) formData.append('icon_file', updates.icon_file);

    const res = await fetch(`${API_BASE}/company-stat-cards/${id}`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.card && index !== -1) {
        current[index] = json.card;
        saveStoredCompanyStatCards(current);
      }
    }
  } catch (err) {
    console.error('Failed to sync updated stat card with backend:', err);
  }

  return getStoredCompanyStatCards();
}

export async function createCompanyStatCard(
  cardData: Partial<CompanyStatCard> & { icon_file?: File }
): Promise<{ card: CompanyStatCard; cards: CompanyStatCard[] }> {
  const current = getStoredCompanyStatCards();
  const maxOrder = current.reduce((max, c) => Math.max(max, c.order_num ?? 0), 0);
  
  const generatedId = Date.now();
  const cardKey = cardData.card_key || `custom_${Date.now()}`;
  
  let newCard: CompanyStatCard = {
    id: generatedId,
    card_key: cardKey,
    name: cardData.name?.trim() || 'NEW CARD',
    icon: cardData.icon || 'Wallet',
    subtitle: cardData.subtitle || 'Custom Card',
    order_num: cardData.order_num ?? (maxOrder + 1),
    custom_value: cardData.custom_value ?? 0,
    status: 'active',
  };

  try {
    const formData = new FormData();
    formData.append('name', newCard.name);
    if (newCard.card_key) formData.append('card_key', newCard.card_key);
    if (newCard.icon) formData.append('icon', newCard.icon);
    if (newCard.subtitle) formData.append('subtitle', newCard.subtitle);
    formData.append('order_num', String(newCard.order_num));
    formData.append('custom_value', String(newCard.custom_value));
    if (cardData.icon_file) formData.append('icon_file', cardData.icon_file);

    const res = await fetch(`${API_BASE}/company-stat-cards`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.card) {
        newCard = json.card;
      }
    }
  } catch (err) {
    console.warn('Backend create unreachable, saving locally:', err);
  }

  const updatedCards = [...current.filter((c) => c.id !== newCard.id && c.card_key !== newCard.card_key), newCard];
  saveStoredCompanyStatCards(updatedCards);

  return { card: newCard, cards: getStoredCompanyStatCards() };
}

export async function deleteCompanyStatCard(id: number | string): Promise<CompanyStatCard[]> {
  const current = getStoredCompanyStatCards().filter((c) => c.id !== Number(id) && c.card_key !== String(id));
  saveStoredCompanyStatCards(current);

  try {
    await fetch(`${API_BASE}/company-stat-cards/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Backend delete unreachable:', err);
  }

  return getStoredCompanyStatCards();
}

export async function uploadCompanyStatCardIcon(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/company-stat-cards/upload-icon`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn('Failed to upload icon to backend:', err);
  }
  return null;
}

export async function reorderCompanyStatCards(orderedCards: CompanyStatCard[]): Promise<CompanyStatCard[]> {
  const formatted = orderedCards.map((card, idx) => ({
    ...card,
    order_num: idx + 1,
  }));

  saveStoredCompanyStatCards(formatted);

  try {
    const res = await fetch(`${API_BASE}/company-stat-cards/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: formatted.map((c) => ({
          id: c.id,
          card_key: c.card_key,
          order_num: c.order_num,
          name: c.name,
          subtitle: c.subtitle,
          icon: c.icon,
          custom_value: c.custom_value,
        })),
        ids: formatted.map((c) => c.id),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        saveStoredCompanyStatCards(data.cards);
        return data.cards;
      }
    }
  } catch (err) {
    console.warn('Failed to sync reorder with backend:', err);
  }

  return formatted;
}

export async function resetCompanyStatCards(): Promise<CompanyStatCard[]> {
  try {
    const res = await fetch(`${API_BASE}/company-stat-cards/reset`, {
      method: 'POST',
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.cards)) {
        saveStoredCompanyStatCards(json.cards);
        return json.cards;
      }
    }
  } catch (err) {
    console.warn('Failed to reset stat cards on backend:', err);
  }

  saveStoredCompanyStatCards(DEFAULT_COMPANY_STAT_CARDS);
  return DEFAULT_COMPANY_STAT_CARDS;
}
