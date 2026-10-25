import { extractYoutubeId, formatDate, DateOnly, inr, normalizePhone, pyQuote, slugify, truncateChars, truncateWords, whatsappUrl, telUrl } from '../src/common/utils';

describe('utils', () => {
  it('slugify matches the original rules', () => {
    expect(slugify('Wedding Decoration in Jaipur')).toBe('wedding-decoration-in-jaipur');
    expect(slugify('  Haldi & Mehndi -- Ideas!  ')).toBe('haldi-mehndi-ideas');
    expect(slugify('वेडिंग')).toBe('');
  });
  it('truncateChars adds one ellipsis and leaves short text alone', () => {
    expect(truncateChars('short', 10)).toBe('short');
    const t = truncateChars('a'.repeat(100), 60);
    expect(t.length).toBe(60);
    expect(t.endsWith('…')).toBe(true);
  });
  it('truncateWords', () => { expect(truncateWords('one two three four', 2)).toBe('one two …'); expect(truncateWords('one two', 5)).toBe('one two'); });
  it('phone helpers', () => {
    expect(normalizePhone('98765 43210')).toBe('919876543210');
    expect(normalizePhone('09876543210')).toBe('919876543210');
    expect(telUrl('98765 43210')).toBe('tel:+919876543210');
    expect(whatsappUrl('98765 43210', "Hi, I'd like a quote")).toBe("https://wa.me/919876543210?text=Hi%2C%20I%27d%20like%20a%20quote".replace('%27', '%27'));
  });
  it('inr uses Indian grouping', () => { expect(inr(125000)).toBe('1,25,000'); expect(inr(999)).toBe('999'); expect(inr(12345678)).toBe('1,23,45,678'); });
  it('extractYoutubeId accepts links and ids', () => {
    expect(extractYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ?t=3')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=x')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBe('');
    expect(extractYoutubeId('nonsense')).toBe('');
  });
  it('formatDate shows IST for datetimes and no shift for event dates', () => {
    expect(formatDate(new DateOnly(new Date('2026-03-05T00:00:00Z')), 'j F Y')).toBe('5 March 2026');
    expect(formatDate(new Date('2026-03-05T20:00:00Z'), 'j M Y')).toBe('6 Mar 2026'); // 01:30 IST next day
  });
  it('pyQuote keeps slashes and escapes the rest', () => { expect(pyQuote('a b/c!')).toBe('a%20b/c%21'); });
});
