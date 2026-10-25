import { PrismaService } from '../prisma/prisma.service';
import { presentFaq, presentService, Vm } from './presenters';
import { inr } from './utils';

export const PUBLISHED = { is_published: true } as const;
/** Same default order the original site used: manual order first, newest next. */
export const BY_ORDER = [{ ordering: 'asc' as const }, { created_at: 'desc' as const }, { id: 'asc' as const }];
export const FEATURED_FIRST = [{ is_featured: 'desc' as const }, { ordering: 'asc' as const }, { created_at: 'desc' as const }, { id: 'asc' as const }];
export const livePosts = () => ({ is_published: true, published_at: { lte: new Date() } });

/** Python-style round(): halves go to the even number (4.5 -> 4). */
export function pyRound(n: number): number {
  const f = Math.floor(n); const diff = n - f;
  if (diff === 0.5) return f % 2 === 0 ? f : f + 1;
  return Math.round(n);
}

export function buildTrustItems(site: Vm): Vm[] {
  const items: Vm[] = [];
  if (site.events_completed) items.push({ value: `${inr(site.events_completed)}+`, label: 'Events delivered' });
  if (site.years_experience) items.push({ value: `${site.years_experience}+`, label: 'Years of experience' });
  if (site.google_rating) {
    let label = 'Google rating';
    if (site.google_review_count) label = `Google rating (${inr(site.google_review_count)} reviews)`;
    items.push({ value: site.google_rating_text, label, stars: pyRound(site.google_rating), href: site.google_business_profile_url || site.google_review_url });
  }
  return items;
}

export async function generalFaqs(prisma: PrismaService, limit = 8): Promise<Vm[]> {
  const rows = await prisma.faq.findMany({ where: { ...PUBLISHED, category_id: null, service_id: null }, orderBy: BY_ORDER, take: limit });
  return rows.map(presentFaq);
}

/** Rows that match `first` come before the others (like ORDER BY (condition) in SQL), then `limit` are kept. */
export function firstThen<T>(rows: T[], isFirst: (r: T) => boolean, limit: number): T[] {
  return [...rows.filter(isFirst), ...rows.filter((r) => !isFirst(r))].slice(0, limit);
}

export const presentServices = (rows: any[], city: string) => rows.map((r) => presentService(r, city));
