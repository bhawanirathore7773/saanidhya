import { extractYoutubeId } from '../common/utils';
import { sanitize } from '../common/richtext';
import { mediaUrl } from '../common/images';
import { PrismaService } from '../prisma/prisma.service';
import { Field } from './resources';

export interface UploadedFile { fieldname: string; originalname: string; buffer: Buffer; size: number; mimetype: string }
export interface ParsedForm {
  data: Record<string, any>; errors: Record<string, string>;
  uploads: { field: string; file: UploadedFile }[]; removals: string[];
}

const IST_MINUTES = 330;
const REQUIRED = 'This field is required.';
const pad = (n: number) => String(n).padStart(2, '0');

export const toDateInput = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : '');
export function toDatetimeInput(d?: Date | null) {
  if (!d) return '';
  const x = new Date(d.getTime() + IST_MINUTES * 60000);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}T${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`;
}
function fromDatetimeInput(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - IST_MINUTES * 60000);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Read and check every submitted field of a form. Nothing is saved here. */
export async function parseForm(
  fields: Field[], names: string[], input: { body: Record<string, any>; files: UploadedFile[] }, prisma: PrismaService, isNew: boolean, existing?: Record<string, any>,
): Promise<ParsedForm> {
  const out: ParsedForm = { data: {}, errors: {}, uploads: [], removals: [] };
  const body = input.body ?? {};
  for (const name of names) {
    const f = fields.find((x) => x.name === name);
    if (!f) continue;
    const raw = body[name];
    const str = typeof raw === 'string' ? raw.trim() : '';
    const fail = (msg: string) => { out.errors[name] = msg; };
    switch (f.type) {
      case 'bool': out.data[name] = ['on', 'true', '1'].includes(String(raw)); break;
      case 'text': case 'email': case 'url': case 'slug': case 'youtube': case 'textarea': {
        let v = f.type === 'textarea' ? (typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : '') : str.split(/\s+/).filter(Boolean).join(' ');
        if (f.type === 'youtube') { if (v) { const id = extractYoutubeId(v); if (!id) { fail('Enter a valid YouTube link or 11-character video ID.'); break; } v = id; } }
        if (!v && f.required) { fail(REQUIRED); break; }
        if (f.max && v.length > f.max) { fail(`Ensure this value has at most ${f.max} characters (it has ${v.length}).`); break; }
        if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { fail('Enter a valid email address.'); break; }
        if (v && f.type === 'url' && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(v)) { fail('Enter a valid URL starting with http:// or https://'); break; }
        if (v && f.type === 'slug' && !/^[a-z0-9_-]+$/.test(v)) { fail('Use only lowercase letters, numbers, hyphens and underscores.'); break; }
        out.data[name] = v; break;
      }
      case 'richtext': {
        const v = sanitize(typeof raw === 'string' ? raw : '');
        const empty = !v.replace(/<[^>]*>/g, '').trim() && !/<img\b/.test(v);
        if (empty && f.required) { fail(REQUIRED); break; }
        out.data[name] = empty ? '' : v; break;
      }
      case 'int': {
        if (!str) { if (f.required) fail(REQUIRED); else out.data[name] = f.default !== undefined ? f.default : null; break; }
        if (!/^-?\d+$/.test(str)) { fail('Enter a whole number.'); break; }
        const n = parseInt(str, 10);
        if (f.min !== undefined && n < f.min) { fail(`Ensure this value is greater than or equal to ${f.min}.`); break; }
        if (f.max !== undefined && n > f.max) { fail(`Ensure this value is less than or equal to ${f.max}.`); break; }
        out.data[name] = n; break;
      }
      case 'decimal': {
        if (!str) { if (f.required) fail(REQUIRED); else out.data[name] = null; break; }
        const n = Number(str);
        if (!Number.isFinite(n)) { fail('Enter a number.'); break; }
        if (f.min !== undefined && n < f.min) { fail(`Ensure this value is greater than or equal to ${f.min}.`); break; }
        if (f.max !== undefined && n > f.max) { fail(`Ensure this value is less than or equal to ${f.max}.`); break; }
        out.data[name] = str; break;
      }
      case 'select': {
        if (!str) { if (f.required) fail(REQUIRED); else out.data[name] = f.options?.[0]?.[0] ?? ''; break; }
        if (!f.options?.some(([k]) => k === str)) { fail('Select a valid choice.'); break; }
        out.data[name] = f.name === 'rating' ? parseInt(str, 10) : str; break;
      }
      case 'fk': {
        if (!str) { if (f.required) fail(REQUIRED); else out.data[name] = null; break; }
        const id = /^\d+$/.test(str) ? parseInt(str, 10) : 0;
        const found = id ? await (prisma as any)[f.fk!.model].findUnique({ where: { id }, select: { id: true } }) : null;
        if (!found) { fail('Select a valid choice.'); break; }
        out.data[name] = id; break;
      }
      case 'date': {
        if (!str) { if (f.required) fail(REQUIRED); else out.data[name] = null; break; }
        const d = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(str + 'T00:00:00Z') : null;
        if (!d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== str) { fail('Enter a valid date.'); break; }
        out.data[name] = d; break;
      }
      case 'datetime': {
        if (!str) { if (f.required) fail(REQUIRED); else out.data[name] = null; break; }
        const d = fromDatetimeInput(str);
        if (!d) { fail('Enter a valid date and time.'); break; }
        out.data[name] = d; break;
      }
      case 'image': case 'video': {
        const file = input.files.find((x) => x.fieldname === name && x.size > 0);
        const remove = ['on', 'true', '1'].includes(String(body[`remove_${name}`]));
        if (file) out.uploads.push({ field: name, file });
        else if (remove && !f.required) out.removals.push(name);
        else if (f.required && !(existing && existing[name])) fail(REQUIRED);
        break;
      }
    }
  }
  return out;
}

export interface FieldVm {
  name: string; label: string; type: string; value: any; required: boolean; help: string; error: string; max?: number; min?: number; placeholder?: string; rows?: number;
  options?: [string, string][]; half: boolean; current?: { url: string; name: string } | null; emptyLabel: string; accept?: string;
}
export interface FieldsetVm { title: string; collapsed: boolean; fields: FieldVm[] }

export async function fkOptions(prisma: PrismaService, fields: Field[]): Promise<Record<string, [string, string][]>> {
  const out: Record<string, [string, string][]> = {};
  for (const f of fields.filter((x) => x.type === 'fk')) {
    const rows = await (prisma as any)[f.fk!.model].findMany({ orderBy: f.fk!.order ?? [{ id: 'asc' }], select: { id: true, [f.fk!.label]: true } });
    out[f.name] = rows.map((r: any) => [String(r.id), String(r[f.fk!.label])]);
  }
  return out;
}

export function buildFieldsets(
  fields: Field[], fieldsets: { title: string; fields: string[]; collapsed?: boolean }[], values: Record<string, any>,
  errors: Record<string, string>, fk: Record<string, [string, string][]>, source: 'row' | 'post',
): FieldsetVm[] {
  const vm = (f: Field): FieldVm => {
    let value = values[f.name];
    if (source === 'row') {
      if (f.type === 'date') value = toDateInput(value);
      else if (f.type === 'datetime') value = toDatetimeInput(value);
      else if (f.type === 'fk') value = value == null ? '' : String(value);
      else if (f.type === 'decimal') value = value == null ? '' : String(value);
      else if (f.type === 'int' || f.type === 'select') value = value == null ? '' : String(value);
    } else if (f.type === 'bool') value = ['on', 'true', '1'].includes(String(value));
    const isFile = f.type === 'image' || f.type === 'video';
    const currentName = source === 'row' || isFile ? (values[`__current_${f.name}`] ?? (source === 'row' ? values[f.name] : '')) : '';
    return {
      name: f.name, label: f.label, type: f.type, value: value ?? (f.type === 'bool' ? false : ''), required: Boolean(f.required), help: f.help ?? '', error: errors[f.name] ?? '',
      max: f.max, min: f.min, placeholder: f.placeholder, rows: f.rows, options: f.type === 'fk' ? fk[f.name] : f.options, half: Boolean(f.half), emptyLabel: f.emptyLabel ?? '---------',
      current: isFile && currentName ? { url: mediaUrl(currentName), name: currentName } : null,
      accept: f.type === 'video' ? 'video/mp4,video/webm' : f.type === 'image' ? 'image/*' : undefined,
    };
  };
  return fieldsets.map((s) => ({
    title: s.title, collapsed: Boolean(s.collapsed) && !s.fields.some((n) => errors[n]),
    fields: s.fields.map((n) => fields.find((f) => f.name === n)).filter((f): f is Field => Boolean(f)).map(vm),
  }));
}
