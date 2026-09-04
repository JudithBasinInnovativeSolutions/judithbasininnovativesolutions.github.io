import { describe, expect, it, vi } from 'vitest';
import { BUDGETS, handleContactRequest, PROJECT_TYPES, TIMELINES, validateContactPayload } from '@/lib/contact';

const validPayload = {
  name: 'Montana Founder',
  email: 'founder@example.com',
  organization: 'Example Company',
  projectType: 'Web application',
  projectSummary: 'We need a focused first release for a new business workflow.',
  timeline: '1–3 months',
  budget: '$15,000–$30,000',
  website: '',
  turnstileToken: 'verified-token',
};

function requestFor(payload: unknown, headers: Record<string, string> = {}) {
  return new Request('https://judithbasininnovativesolutions.com/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

const configuredEnv = { RESEND_API_KEY: 'resend-test', TURNSTILE_SECRET_KEY: 'turnstile-test' };

describe('contact validation', () => {
  it.each([
    ['name', { name: 'A' }],
    ['name', { name: 'A'.repeat(81) }],
    ['email', { email: 'not-an-email' }],
    ['email', { email: `${'a'.repeat(255)}@example.com` }],
    ['organization', { organization: 'A'.repeat(121) }],
    ['projectSummary', { projectSummary: 'Too short' }],
    ['projectSummary', { projectSummary: 'A'.repeat(3001) }],
  ])('rejects invalid %s boundaries', (field, change) => {
    const result = validateContactPayload({ ...validPayload, ...change });
    expect(result.errors).toHaveProperty(field);
  });

  it.each([
    { name: 'AB' },
    { name: 'A'.repeat(80) },
    { organization: 'A'.repeat(120) },
    { projectSummary: 'A'.repeat(20) },
    { projectSummary: 'A'.repeat(3000) },
  ])('accepts values at allowed boundaries', (change) => {
    expect(validateContactPayload({ ...validPayload, ...change }).errors).toEqual({});
  });

  it('validates every constrained choice', () => {
    for (const projectType of PROJECT_TYPES) expect(validateContactPayload({ ...validPayload, projectType }).errors).toEqual({});
    for (const timeline of TIMELINES) expect(validateContactPayload({ ...validPayload, timeline }).errors).toEqual({});
    for (const budget of [...BUDGETS, '']) expect(validateContactPayload({ ...validPayload, budget }).errors).toEqual({});
    expect(validateContactPayload({ ...validPayload, projectType: 'Desktop only' }).errors.projectType).toBeTruthy();
    expect(validateContactPayload({ ...validPayload, timeline: 'Tomorrow' }).errors.timeline).toBeTruthy();
    expect(validateContactPayload({ ...validPayload, budget: '$1' }).errors.budget).toBeTruthy();
  });

  it('rejects header injection in the reply-to address', () => {
    const result = validateContactPayload({ ...validPayload, email: 'founder@example.com\r\nBcc: attacker@example.com' });
    expect(result.errors.email).toBeTruthy();
  });
});

describe('contact endpoint', () => {
  it('returns field errors for invalid input', async () => {
    const response = await handleContactRequest(requestFor({ ...validPayload, name: '' }), { env: configuredEnv });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ ok: false, errors: { name: expect.any(String) } });
  });

  it('blocks cross-origin requests', async () => {
    const response = await handleContactRequest(requestFor(validPayload, { origin: 'https://example.net' }), { env: configuredEnv });
    expect(response.status).toBe(403);
  });

  it('blocks a filled honeypot without contacting a provider', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await handleContactRequest(requestFor({ ...validPayload, website: 'spam.example' }), { env: configuredEnv, fetcher });
    expect(response.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns 403 for missing, failed, or expired Turnstile verification', async () => {
    const missing = await handleContactRequest(requestFor({ ...validPayload, turnstileToken: '' }), { env: configuredEnv });
    expect(missing.status).toBe(403);

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ success: false, 'error-codes': ['timeout-or-duplicate'] }), { status: 200 }));
    const expired = await handleContactRequest(requestFor(validPayload), { env: configuredEnv, fetcher });
    expect(expired.status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when hosted configuration is missing', async () => {
    const response = await handleContactRequest(requestFor(validPayload), { env: {} });
    expect(response.status).toBe(503);
  });

  it('returns 502 when Resend does not accept delivery', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'provider error' }), { status: 500 }));
    const response = await handleContactRequest(requestFor(validPayload), { env: configuredEnv, fetcher });
    expect(response.status).toBe(502);
  });

  it('escapes HTML and makes exactly one email request for a valid inquiry', async () => {
    const payload = {
      ...validPayload,
      name: '<b>Founder</b>',
      projectSummary: '<script>alert("x")</script> A legitimate project summary.',
    };
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      calls.push([input, init]);
      if (String(input).includes('siteverify')) return new Response(JSON.stringify({ success: true }), { status: 200 });
      return new Response(JSON.stringify({ id: 'email-id' }), { status: 200 });
    });

    const response = await handleContactRequest(requestFor(payload), { env: configuredEnv, fetcher });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    const emailCalls = calls.filter(([input]) => String(input) === 'https://api.resend.com/emails');
    expect(emailCalls).toHaveLength(1);
    const emailBody = JSON.parse(String(emailCalls[0][1]?.body));
    expect(emailBody.reply_to).toBe(validPayload.email);
    expect(emailBody.html).toContain('&lt;script&gt;');
    expect(emailBody.html).not.toContain('<script>');
  });
});
