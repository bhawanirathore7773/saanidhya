import { addHeadingIds, sanitize } from '../src/common/richtext';
import { buildSeo, composeTitle } from '../src/common/seo';

describe('rich text', () => {
  it('removes anything dangerous and keeps normal formatting', () => {
    const out = sanitize('<h2 onclick="x()">Title</h2><p style="color:red">Hi <a href="javascript:alert(1)">bad</a> <a href="https://a.com">ok</a></p><script>x()</script><iframe src="y"></iframe><img src="/media/none.jpg" onerror="z()">');
    expect(out).not.toMatch(/script|iframe|onclick|onerror|style=|javascript:/i);
    expect(out).toContain('<h2>Title</h2>'); expect(out).toContain('rel="noopener noreferrer"'); expect(out).toContain('loading="lazy"');
  });
  it('adds heading ids and a contents list', () => {
    const { html, toc } = addHeadingIds('<h2>Plan your budget</h2><p>x</p><h2>Plan your budget</h2><h3>Detail</h3>');
    expect(toc.map((t) => t.id)).toEqual(['plan-your-budget', 'plan-your-budget-2']);
    expect(html).toContain('<h3 id="detail">');
  });
});

describe('seo', () => {
  it('keeps titles within 60 characters and adds the brand when it fits', () => {
    expect(composeTitle('Wedding Decoration', 'Saanidhya Events')).toBe('Wedding Decoration | Saanidhya Events');
    expect(composeTitle('A very long page title that goes on and on and on forever', 'Saanidhya Events').length).toBeLessThanOrEqual(60);
  });
  it('builds absolute canonical and image URLs', () => {
    const seo = buildSeo('/about/', { business_name: 'Saanidhya Events', tagline: 'Decor', city: 'Jaipur', default_og_image: null }, { title: 'About' });
    expect(seo.canonical).toBe('https://example.com/about/'); expect(seo.image.startsWith('https://example.com/static/img/')).toBe(true); expect(seo.description.length).toBeLessThanOrEqual(155);
  });
});
