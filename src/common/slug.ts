import { RESERVED_SLUGS } from './navigation';
import { slugify } from './utils';

type SlugModel = { findFirst(args: any): Promise<any> };

/** "Wedding Decoration in Jaipur" -> "wedding-decoration-in-jaipur"; "-2", "-3" ... is added if the slug is taken (or reserved). */
export async function uniqueSlug(model: SlugModel, text: string, opts: { fallback: string; reserved?: boolean; excludeId?: number; max?: number }): Promise<string> {
  const max = opts.max ?? 90;
  const base = slugify(text).slice(0, max).replace(/^-+|-+$/g, '') || opts.fallback;
  let slug = base; let n = 2;
  const taken = async (s: string) =>
    (opts.reserved && RESERVED_SLUGS.has(s)) || Boolean(await model.findFirst({ where: { slug: s, ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}) }, select: { id: true } }));
  while (await taken(slug)) {
    const suffix = `-${n}`;
    slug = `${base.slice(0, max - suffix.length)}${suffix}`;
    n += 1;
  }
  return slug;
}
