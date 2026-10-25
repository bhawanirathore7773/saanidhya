"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = exports.isoToday = exports.makeFormToken = exports.budgetLabel = exports.STATUSES = exports.BUDGETS = void 0;
exports.normalizeLeadPhone = normalizeLeadPhone;
exports.spamReason = spamReason;
exports.validateEnquiry = validateEnquiry;
exports.renderForm = renderForm;
const config_1 = require("../config/config");
const utils_1 = require("../common/utils");
Object.defineProperty(exports, "normalizePhone", { enumerable: true, get: function () { return utils_1.normalizePhone; } });
const http_1 = require("../common/http");
exports.BUDGETS = [
    ['under-25k', 'Under Rs. 25,000'], ['25k-50k', 'Rs. 25,000 - 50,000'], ['50k-1l', 'Rs. 50,000 - 1 lakh'],
    ['1l-2.5l', 'Rs. 1 - 2.5 lakh'], ['2.5l-5l', 'Rs. 2.5 - 5 lakh'], ['5l-plus', 'Rs. 5 lakh and above'], ['not-sure', 'Not sure yet'],
];
exports.STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['quote-sent', 'Quote sent'], ['booked', 'Booked'], ['lost', 'Lost / not interested']];
const budgetLabel = (v) => exports.BUDGETS.find(([k]) => k === v)?.[1] ?? '';
exports.budgetLabel = budgetLabel;
const SALT = 'saanidhya.lead-form';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 2;
const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const URL_LIKE = /(https?:|www\.|:\/\/|<|>)/i;
const PHONE_ERROR = 'Please enter a valid mobile number, for example 98765 43210.';
const makeFormToken = () => (0, http_1.sign)(String(Date.now() / 1000), SALT);
exports.makeFormToken = makeFormToken;
function normalizeLeadPhone(raw) {
    const text = (raw || '').trim();
    let digits = text.replace(/\D/g, '');
    const international = text.startsWith('+') || text.startsWith('00');
    if (text.startsWith('00'))
        digits = digits.slice(2);
    if (new Set(digits).size === 1)
        throw new Error(PHONE_ERROR);
    if (international) {
        if (digits.length < 8 || digits.length > 15 || digits.startsWith('0'))
            throw new Error(PHONE_ERROR);
        if (digits.startsWith('91') && !(digits.length === 12 && INDIAN_MOBILE.test(digits.slice(2))))
            throw new Error(PHONE_ERROR);
        return `+${digits}`;
    }
    if (INDIAN_MOBILE.test(digits))
        return `+91${digits}`;
    if (digits.length === 11 && digits.startsWith('0') && INDIAN_MOBILE.test(digits.slice(1)))
        return `+91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith('91') && INDIAN_MOBILE.test(digits.slice(2)))
        return `+${digits}`;
    throw new Error(PHONE_ERROR);
}
function spamReason(body) {
    if (String(body.company_url || '').trim())
        return 'honeypot';
    const payload = (0, http_1.unsign)(String(body.form_token || ''), SALT);
    const shownAt = payload === null ? NaN : parseFloat(payload);
    if (!Number.isFinite(shownAt))
        return 'no_token';
    const elapsed = Date.now() / 1000 - shownAt;
    if (elapsed < config_1.config.lead.minFillSeconds)
        return 'too_fast';
    if (elapsed > TOKEN_MAX_AGE)
        return 'stale';
    return '';
}
const todayIst = () => new Date(new Date().toLocaleString('en-US', { timeZone: config_1.config.timezone }));
const isoToday = () => {
    const d = todayIst();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
exports.isoToday = isoToday;
const squash = (v) => String(v ?? '').split(/\s+/).filter(Boolean).join(' ');
const tooLong = (v, max) => `Ensure this value has at most ${max} characters (it has ${v.length}).`;
const REQUIRED = 'This field is required.';
function validateEnquiry(body, categories) {
    const errors = {};
    const get = (k) => String(body[k] ?? '').trim();
    const nonField = [];
    const textField = (name, label, max, min = 2) => {
        const raw = get(name);
        if (!raw) {
            errors[name] = REQUIRED;
            return '';
        }
        if (raw.length > max) {
            errors[name] = tooLong(raw, max);
            return '';
        }
        const v = squash(raw);
        if (v.length < min || URL_LIKE.test(v)) {
            errors[name] = 'Please enter a valid value.';
            return '';
        }
        return v;
    };
    const name = textField('name', 'name', 100);
    let phone = '';
    const rawPhone = get('phone');
    if (!rawPhone)
        errors.phone = REQUIRED;
    else if (rawPhone.length > 25)
        errors.phone = tooLong(rawPhone, 25);
    else {
        try {
            phone = normalizeLeadPhone(rawPhone);
        }
        catch (e) {
            errors.phone = e.message;
        }
    }
    let event_type_id = 0;
    const rawType = get('event_type');
    if (!rawType)
        errors.event_type = REQUIRED;
    else {
        const found = categories.find((c) => String(c.id) === rawType);
        if (!found)
            errors.event_type = 'Select a valid choice. That choice is not one of the available choices.';
        else
            event_type_id = found.id;
    }
    let event_date = null;
    const rawDate = get('event_date');
    if (rawDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(Date.parse(rawDate + 'T00:00:00Z')) || new Date(rawDate + 'T00:00:00Z').toISOString().slice(0, 10) !== rawDate) {
            errors.event_date = 'Enter a valid date.';
        }
        else {
            const today = (0, exports.isoToday)();
            const limit = new Date(today + 'T00:00:00Z');
            limit.setUTCDate(limit.getUTCDate() + 3 * 365);
            if (rawDate < today)
                errors.event_date = 'This date has already passed. Please pick a date from today onwards.';
            else if (new Date(rawDate + 'T00:00:00Z') > limit)
                errors.event_date = 'Please pick a date within the next three years, or leave it blank.';
            else
                event_date = new Date(rawDate + 'T00:00:00Z');
        }
    }
    const city = textField('city', 'city', 80);
    let budget = get('budget');
    if (budget && !exports.BUDGETS.some(([k]) => k === budget)) {
        errors.budget = `Select a valid choice. ${budget} is not one of the available choices.`;
        budget = '';
    }
    const cleaned = {
        name, phone, event_type_id, event_date, city, budget,
        service_slug: get('service_slug').slice(0, 90),
        source_url: get('source_url').slice(0, 500),
        utm_source: squash(get('utm_source')).slice(0, 100), utm_medium: squash(get('utm_medium')).slice(0, 100), utm_campaign: squash(get('utm_campaign')).slice(0, 100),
    };
    return { cleaned, errors, nonField, valid: Object.keys(errors).length === 0 };
}
const attrs = (list) => list.filter(([, v]) => v !== undefined).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${(0, utils_1.escapeHtml)(v)}"`)).join('');
function renderForm(opts) {
    const { values, categories, formToken } = opts;
    const errors = opts.errors ?? {};
    const v = (k) => String(values[k] ?? '');
    const aria = (name) => (errors[name] ? [['aria-invalid', 'true'], ['aria-describedby', `id_${name}-error`]] : []);
    const text = (name, label, required, max, extra, type = 'text') => ({
        name, id: `id_${name}`, label, required, errors: errors[name] ? [errors[name]] : [], help_text: '',
        html: `<input${attrs([['type', type], ['name', name], ...(v(name) ? [['value', v(name)]] : []), ...extra, ['maxlength', String(max)], ['class', 'input'], ...aria(name), ...(required ? [['required', true]] : []), ['id', `id_${name}`]])}>`,
    });
    const select = (name, label, required, empty, options) => ({
        name, id: `id_${name}`, label, required, errors: errors[name] ? [errors[name]] : [], help_text: '',
        html: `<select${attrs([['name', name], ['class', 'select'], ...aria(name), ...(required ? [['required', true]] : []), ['id', `id_${name}`]])}>\n  `
            + [['', empty], ...options].map(([val, lab]) => `<option value="${(0, utils_1.escapeHtml)(val)}"${v(name) === val ? ' selected' : ''}>${(0, utils_1.escapeHtml)(lab)}</option>`).join('\n\n  ')
            + '\n\n</select>',
    });
    const nameF = text('name', 'Your name', true, 100, [['autocomplete', 'name'], ['placeholder', 'e.g. Riya Sharma']]);
    const phoneF = text('phone', 'Mobile number', true, 25, [['inputmode', 'tel'], ['autocomplete', 'tel'], ['placeholder', '98765 43210']], 'tel');
    const typeF = select('event_type', 'Event type', true, 'Select event type', categories.map((c) => [String(c.id), c.name]));
    const dateF = {
        name: 'event_date', id: 'id_event_date', label: 'Event date', required: false, errors: errors.event_date ? [errors.event_date] : [], help_text: 'An approximate date is fine.',
        html: `<input${attrs([['type', 'date'], ['name', 'event_date'], ...(v('event_date') ? [['value', v('event_date')]] : []), ['min', (0, exports.isoToday)()], ['class', 'input'], ...aria('event_date'), ['aria-describedby', errors.event_date ? 'id_event_date-error' : 'id_event_date_helptext'], ['id', 'id_event_date']])}>`,
    };
    const cityF = text('city', 'City', true, 80, [['autocomplete', 'address-level2']]);
    const budgetF = select('budget', 'Budget (optional)', false, 'Select a range (optional)', exports.BUDGETS);
    const hidden = (name, extra = []) => `<input type="hidden" name="${name}"${attrs(extra)}${v(name) ? ` value="${(0, utils_1.escapeHtml)(v(name))}"` : ''} id="id_${name}">`;
    const hiddenHtml = [
        hidden('service_slug'), hidden('source_url'),
        hidden('utm_source', [['data-utm', 'utm_source']]), hidden('utm_medium', [['data-utm', 'utm_medium']]), hidden('utm_campaign', [['data-utm', 'utm_campaign']]),
    ].join('');
    const honeypot = `<label for="id_company_url">Leave this empty</label><input type="text" name="company_url" tabindex="-1" autocomplete="off" class="input" id="id_company_url">`;
    const fieldList = [nameF, phoneF, typeF, dateF, cityF, budgetF];
    return {
        fields: { name: nameF, phone: phoneF, event_type: typeF, event_date: dateF, city: cityF, budget: budgetF },
        field_list: fieldList,
        hidden_html: hiddenHtml, honeypot_html: honeypot, form_token: formToken,
        non_field_errors: opts.nonField ?? [],
        has_errors: fieldList.some((f) => f.errors.length) || (opts.nonField ?? []).length > 0,
    };
}
