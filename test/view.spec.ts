import * as nunjucks from 'nunjucks';
import { truthy, wrapConditions } from '../src/common/view';

describe('django-style truthiness', () => {
  it('empty list, empty object and empty string are false', () => {
    expect(truthy([])).toBe(false); expect(truthy({})).toBe(false); expect(truthy('')).toBe(false); expect(truthy(null)).toBe(false);
    expect(truthy([1])).toBe(true); expect(truthy({ a: 1 })).toBe(true); expect(truthy('x')).toBe(true); expect(truthy(0)).toBe(false);
    expect(truthy(new nunjucks.runtime.SafeString(''))).toBe(false);
  });
  it('wraps only bare variables in if / elif', () => {
    expect(wrapConditions('{% if items %}x{% endif %}')).toContain('truthy(items)');
    expect(wrapConditions('{% if not items and a.b %}')).toContain('not truthy(items) and truthy(a.b)');
    expect(wrapConditions('{% elif n|length > 1 %}')).not.toContain('truthy');
    expect(wrapConditions('{% if x == "a" %}')).not.toContain('truthy');
    expect(wrapConditions('{% if true %}')).not.toContain('truthy');
  });
  it('renders like the original templates', () => {
    const env = new nunjucks.Environment(undefined, { autoescape: true });
    env.addGlobal('truthy', truthy);
    expect(env.renderString(wrapConditions('{% if list %}yes{% else %}no{% endif %}'), { list: [] })).toBe('no');
    expect(env.renderString(wrapConditions('{% if list %}yes{% else %}no{% endif %}'), { list: [1] })).toBe('yes');
  });
});
