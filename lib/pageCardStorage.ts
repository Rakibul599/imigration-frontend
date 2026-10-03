export interface PageStatCardConfig {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  order_num: number;
  visible?: boolean;
}

export const STAT_ICON_OPTIONS = [
  { label: 'Building', icon: 'Building2' },
  { label: 'Users', icon: 'Users' },
  { label: 'User Check', icon: 'UserCheck' },
  { label: 'Shield Check', icon: 'ShieldCheck' },
  { label: 'Shield Alert', icon: 'ShieldAlert' },
  { label: 'Briefcase', icon: 'Briefcase' },
  { label: 'Coins', icon: 'Coins' },
  { label: 'Globe', icon: 'Globe2' },
  { label: 'Trending Up', icon: 'TrendingUp' },
  { label: 'File Text', icon: 'FileText' },
  { label: 'File Check', icon: 'FileCheck' },
  { label: 'File Check 2', icon: 'FileCheck2' },
  { label: 'Folder Open', icon: 'FolderOpen' },
  { label: 'Layers', icon: 'Layers' },
  { label: 'Lock', icon: 'Lock' },
  { label: 'Key Round', icon: 'KeyRound' },
  { label: 'Wallet', icon: 'Wallet' },
  { label: 'Clock', icon: 'Clock' },
  { label: 'Receipt', icon: 'Receipt' },
  { label: 'Sparkles', icon: 'Sparkles' },
];

export function getStoredPageCards(pageKey: string, defaultCards: PageStatCardConfig[]): PageStatCardConfig[] {
  if (typeof window === 'undefined') return defaultCards;
  try {
    const raw = localStorage.getItem(`superadmin_cards_${pageKey}`);
    if (!raw) return defaultCards;
    const parsed: PageStatCardConfig[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultCards;

    const map = new Map(parsed.map((c) => [c.id, c]));
    const merged: PageStatCardConfig[] = [];

    parsed.forEach((c) => {
      const def = defaultCards.find((d) => d.id === c.id);
      if (def) {
        merged.push({
          ...def,
          ...c,
          title: c.title || def.title,
          icon: c.icon || def.icon,
          order_num: typeof c.order_num === 'number' ? c.order_num : def.order_num,
        });
      }
    });

    defaultCards.forEach((def) => {
      if (!map.has(def.id)) {
        merged.push(def);
      }
    });

    return merged.sort((a, b) => a.order_num - b.order_num);
  } catch (e) {
    return defaultCards;
  }
}

export function saveStoredPageCards(pageKey: string, cards: PageStatCardConfig[]): PageStatCardConfig[] {
  if (typeof window === 'undefined') return cards;
  const ordered = cards.map((c, idx) => ({ ...c, order_num: idx + 1 }));
  localStorage.setItem(`superadmin_cards_${pageKey}`, JSON.stringify(ordered));
  window.dispatchEvent(new CustomEvent(`superadmin_cards_update_${pageKey}`, { detail: ordered }));
  return ordered;
}

export function resetStoredPageCards(pageKey: string, defaultCards: PageStatCardConfig[]): PageStatCardConfig[] {
  if (typeof window === 'undefined') return defaultCards;
  localStorage.removeItem(`superadmin_cards_${pageKey}`);
  window.dispatchEvent(new CustomEvent(`superadmin_cards_update_${pageKey}`, { detail: defaultCards }));
  return defaultCards;
}
