'use client';

import { services as defaultServices, Service } from './services';

export interface ServiceCard {
  id: string; // slug / unique identifier
  title: string;
  description: string;
  image: string;
  tag?: string;
  is_core?: boolean;
  order_num?: number;
  db_id?: number;
  status?: string;
}

const STORAGE_KEY = 'agency_service_cards_cache';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Sorts service cards by priority order_num ascending
 */
export function sortCards(cards: ServiceCard[]): ServiceCard[] {
  return [...cards].sort((a, b) => {
    const orderA = typeof a.order_num === 'number' && !isNaN(a.order_num) ? a.order_num : 9999;
    const orderB = typeof b.order_num === 'number' && !isNaN(b.order_num) ? b.order_num : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.title || '').localeCompare(b.title || '');
  });
}

/**
 * Initial fallback list mapping static default services
 */
const initialDefaultCards: ServiceCard[] = defaultServices.map((s, index) => ({
  id: s.id,
  title: s.title,
  description: s.description,
  image: s.image,
  tag: s.tag,
  is_core: s.id === 'customer' || s.id === 'document-download',
  order_num: index + 1,
  status: 'active',
}));

/**
 * Synchronously retrieves cached service cards or defaults, sorted by order_num
 */
export function getStoredServices(): ServiceCard[] {
  if (typeof window === 'undefined') {
    return sortCards(initialDefaultCards);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure core cards are always present and properly tagged
        const hasCustomer = parsed.some((c: ServiceCard) => c.id === 'customer');
        const hasDocDownload = parsed.some((c: ServiceCard) => c.id === 'document-download');
        
        let result = [...parsed];
        if (!hasCustomer) {
          result.unshift(initialDefaultCards[0]);
        }
        if (!hasDocDownload) {
          result.splice(1, 0, initialDefaultCards[1]);
        }
        return sortCards(result);
      }
    }
  } catch (err) {
    console.warn('Error reading stored service cards:', err);
  }

  return sortCards(initialDefaultCards);
}

/**
 * Saves service cards list to localStorage and triggers custom change event
 */
export function saveServicesToCache(cards: ServiceCard[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sorted = sortCards(cards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    window.dispatchEvent(new Event('agency_services_updated'));
  } catch (err) {
    console.warn('Error caching service cards:', err);
  }
}

/**
 * Fetch service cards from backend API with fallback to local storage
 */
export async function fetchServiceCards(): Promise<ServiceCard[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${API_BASE}/service-cards`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const formatted: ServiceCard[] = data.map((item: any, idx: number) => ({
          id: item.slug || `service-${item.id}`,
          title: item.title,
          description: item.description || '',
          image: item.image || '/images/registration-document.svg',
          tag: item.tag || undefined,
          is_core: Boolean(item.is_core) || item.slug === 'customer' || item.slug === 'document-download',
          order_num: typeof item.order_num === 'number' ? item.order_num : (idx + 1),
          db_id: item.id,
          status: item.status || 'active',
        }));

        const sorted = sortCards(formatted);
        saveServicesToCache(sorted);
        return sorted;
      }
    }
  } catch (err) {
    console.warn('Backend service-cards API unavailable, using cached services:', err);
  }

  return getStoredServices();
}

/**
 * Create a new service card in backend and local cache
 */
export async function createServiceCard(
  cardData: Omit<ServiceCard, 'is_core'>
): Promise<ServiceCard> {
  const current = getStoredServices();

  try {
    const res = await fetch(`${API_BASE}/service-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: cardData.title,
        slug: cardData.id,
        description: cardData.description,
        image: cardData.image,
        tag: cardData.tag,
        order_num: cardData.order_num ?? (current.length + 1),
      }),
    });

    if (res.ok) {
      const created = await res.json();
      const newCard: ServiceCard = {
        id: created.slug || cardData.id,
        title: created.title,
        description: created.description || '',
        image: created.image || cardData.image,
        tag: created.tag || cardData.tag,
        is_core: false,
        order_num: created.order_num ?? (cardData.order_num ?? (current.length + 1)),
        db_id: created.id,
        status: created.status || 'active',
      };

      const updated = sortCards([...current, newCard]);
      saveServicesToCache(updated);
      return newCard;
    }
  } catch (err) {
    console.warn('Backend create service card error, saving locally:', err);
  }

  // Local fallback
  const newCard: ServiceCard = {
    ...cardData,
    is_core: false,
    order_num: cardData.order_num ?? (current.length + 1),
    status: 'active',
  };

  const updated = sortCards([...current, newCard]);
  saveServicesToCache(updated);
  return newCard;
}

/**
 * Update an existing service card
 */
export async function updateServiceCard(
  idOrSlug: string,
  updates: Partial<ServiceCard>
): Promise<ServiceCard | null> {
  const current = getStoredServices();
  const index = current.findIndex((c) => c.id === idOrSlug || (c.db_id && String(c.db_id) === String(idOrSlug)));
  if (index === -1) return null;

  const target = current[index];
  const targetId = target.db_id || target.id;

  try {
    const res = await fetch(`${API_BASE}/service-cards/${targetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: updates.title,
        description: updates.description,
        image: updates.image,
        tag: updates.tag,
        order_num: updates.order_num,
      }),
    });

    if (res.ok) {
      const updatedBackend = await res.json();
      const merged: ServiceCard = {
        ...target,
        title: updatedBackend.title ?? updates.title ?? target.title,
        description: updatedBackend.description ?? updates.description ?? target.description,
        image: updatedBackend.image ?? updates.image ?? target.image,
        tag: updatedBackend.tag ?? updates.tag ?? target.tag,
        order_num: updatedBackend.order_num ?? updates.order_num ?? target.order_num,
      };

      current[index] = merged;
      const sorted = sortCards(current);
      saveServicesToCache(sorted);
      return merged;
    }
  } catch (err) {
    console.warn('Backend update service card error, updating locally:', err);
  }

  // Local update fallback
  const merged: ServiceCard = {
    ...target,
    ...updates,
    is_core: target.is_core, // cannot override core status
  };

  current[index] = merged;
  const sorted = sortCards(current);
  saveServicesToCache(sorted);
  return merged;
}

/**
 * Bulk reorder service cards priority and sync with backend & local storage
 */
export async function reorderServiceCards(newOrderList: ServiceCard[]): Promise<ServiceCard[]> {
  const updatedList: ServiceCard[] = newOrderList.map((card, idx) => ({
    ...card,
    order_num: idx + 1,
  }));

  saveServicesToCache(updatedList);

  try {
    const payload = updatedList.map((card, idx) => ({
      id: card.db_id || card.id,
      slug: card.id,
      order_num: idx + 1,
    }));

    const res = await fetch(`${API_BASE}/service-cards/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ orders: payload }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        const backendFormatted: ServiceCard[] = data.cards.map((item: any, idx: number) => ({
          id: item.slug || `service-${item.id}`,
          title: item.title,
          description: item.description || '',
          image: item.image || '/images/registration-document.svg',
          tag: item.tag || undefined,
          is_core: Boolean(item.is_core) || item.slug === 'customer' || item.slug === 'document-download',
          order_num: typeof item.order_num === 'number' ? item.order_num : (idx + 1),
          db_id: item.id,
          status: item.status || 'active',
        }));
        const sorted = sortCards(backendFormatted);
        saveServicesToCache(sorted);
        return sorted;
      }
    }
  } catch (err) {
    console.warn('Backend reorder service cards error, keeping local order:', err);
  }

  return updatedList;
}

/**
 * Delete a custom service card (Core cards 'customer' and 'document-download' are strictly protected)
 */
export async function deleteServiceCard(idOrSlug: string): Promise<boolean> {
  const current = getStoredServices();
  const target = current.find((c) => c.id === idOrSlug || (c.db_id && String(c.db_id) === String(idOrSlug)));

  if (!target) return false;

  // STRICT PROTECTION: Customer and Document Download cannot be deleted
  if (target.is_core || target.id === 'customer' || target.id === 'document-download') {
    throw new Error('Core system cards (Customer and Document Download) cannot be deleted.');
  }

  const targetId = target.db_id || target.id;

  try {
    await fetch(`${API_BASE}/service-cards/${targetId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    console.warn('Backend delete service card error, deleting locally:', err);
  }

  const filtered = current.filter((c) => c.id !== target.id);
  saveServicesToCache(filtered);
  return true;
}

/**
 * Subscribe to service card changes across browser tabs and components
 */
export function subscribeToServiceChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => callback();
  window.addEventListener('storage', handleUpdate);
  window.addEventListener('agency_services_updated', handleUpdate);

  return () => {
    window.removeEventListener('storage', handleUpdate);
    window.removeEventListener('agency_services_updated', handleUpdate);
  };
}
