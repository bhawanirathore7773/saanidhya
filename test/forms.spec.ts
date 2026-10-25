import { normalizeLeadPhone, validateEnquiry, spamReason, makeFormToken } from '../src/leads/enquiry-form';
import { parseForm } from '../src/admin/forms';
import { RESOURCES } from '../src/admin/resources';

describe('enquiry form', () => {
  it('accepts Indian mobile numbers in common shapes', () => {
    expect(normalizeLeadPhone('98765 43210')).toBe('+919876543210');
    expect(normalizeLeadPhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalizeLeadPhone('09876543210')).toBe('+919876543210');
    expect(normalizeLeadPhone('+44 7911 123456')).toBe('+447911123456');
  });
  it('rejects fake numbers', () => {
    for (const bad of ['1234567890', '9999999999', '12345', 'abc', '+91 12345 67890']) expect(() => normalizeLeadPhone(bad)).toThrow();
  });
  const cats = [{ id: 3, name: 'Wedding' }];
  it('validates a good enquiry', () => {
    const r = validateEnquiry({ name: 'Riya Sharma', phone: '9876543210', event_type: '3', city: 'Jaipur', budget: '1l-2.5l', event_date: '' }, cats);
    expect(r.valid).toBe(true); expect(r.cleaned.event_type_id).toBe(3); expect(r.cleaned.phone).toBe('+919876543210');
  });
  it('reports problems with the original messages', () => {
    const r = validateEnquiry({ name: '', phone: '', event_type: '99', city: 'http://spam.com', budget: 'zzz', event_date: '2001-01-01' }, cats);
    expect(r.errors.name).toBe('This field is required.'); expect(r.errors.phone).toBe('This field is required.');
    expect(r.errors.event_type).toMatch(/valid choice/); expect(r.errors.city).toBe('Please enter a valid value.'); expect(r.errors.event_date).toMatch(/already passed/);
  });
  it('spam checks', () => {
    expect(spamReason({ company_url: 'x' })).toBe('honeypot');
    expect(spamReason({})).toBe('no_token');
    expect(spamReason({ form_token: makeFormToken() })).toBe('too_fast');
  });
});

describe('admin form parsing', () => {
  const service = RESOURCES.find((r) => r.key === 'services')!;
  const names = service.fieldsets.flatMap((f) => f.fields);
  const fakePrisma: any = { eventCategory: { findUnique: async ({ where }: any) => (where.id === 1 ? { id: 1 } : null) } };
  it('applies defaults, sanitizes html and checks required fields', async () => {
    const ok = await parseForm(service.fields, names, { body: { category_id: '1', title: '  Mandap  Decor ', short_description: 'Nice', description: '<p>Hi</p><script>x()</script>', starting_price: '', is_published: 'on' }, files: [] }, fakePrisma, true);
    expect(ok.errors).toEqual({});
    expect(ok.data.title).toBe('Mandap Decor'); expect(ok.data.description).toBe('<p>Hi</p>'); expect(ok.data.ordering).toBe(0); expect(ok.data.starting_price).toBeNull(); expect(ok.data.show_in_packages).toBe(false);
    const bad = await parseForm(service.fields, names, { body: { category_id: '7', title: '', short_description: 'x'.repeat(300), starting_price: '-4' }, files: [] }, fakePrisma, true);
    expect(bad.errors.category_id).toMatch(/valid choice/); expect(bad.errors.title).toMatch(/required/); expect(bad.errors.short_description).toMatch(/at most 220/); expect(bad.errors.starting_price).toMatch(/greater than or equal to 0/);
  });
});
