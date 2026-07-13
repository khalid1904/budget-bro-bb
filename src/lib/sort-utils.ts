export type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'added_desc'
  | 'added_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'title_asc'
  | 'title_desc';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date_desc', label: 'Date — newest first' },
  { value: 'date_asc', label: 'Date — oldest first' },
  { value: 'added_desc', label: 'Time added — newest' },
  { value: 'added_asc', label: 'Time added — oldest' },
  { value: 'amount_desc', label: 'Amount — high to low' },
  { value: 'amount_asc', label: 'Amount — low to high' },
  { value: 'title_asc', label: 'Title — A to Z' },
  { value: 'title_desc', label: 'Title — Z to A' },
];

interface SortableItem {
  title: string;
  amount: number;
  date: string;
  created_at?: string | null;
}

export function sortItems<T extends SortableItem>(items: T[], sort: SortOption): T[] {
  const arr = [...items];
  const t = (s?: string | null) => (s ? new Date(s).getTime() : 0);
  switch (sort) {
    case 'date_desc': return arr.sort((a, b) => t(b.date) - t(a.date));
    case 'date_asc': return arr.sort((a, b) => t(a.date) - t(b.date));
    case 'added_desc': return arr.sort((a, b) => t(b.created_at) - t(a.created_at));
    case 'added_asc': return arr.sort((a, b) => t(a.created_at) - t(b.created_at));
    case 'amount_desc': return arr.sort((a, b) => b.amount - a.amount);
    case 'amount_asc': return arr.sort((a, b) => a.amount - b.amount);
    case 'title_asc': return arr.sort((a, b) => a.title.localeCompare(b.title));
    case 'title_desc': return arr.sort((a, b) => b.title.localeCompare(a.title));
  }
}

export function formatAddedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
