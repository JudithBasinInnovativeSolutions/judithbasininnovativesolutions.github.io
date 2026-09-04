import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUDGETS, handleContactRequest as handleRequest, MAX_CONTACT_BYTES, PROVIDER_TIMEOUT_MS, PROJECT_TYPES, TIMELINES, validateContactPayload } from '@/lib/contact';
import { createContactRateLimiter } from '@/lib/contact-rate-limit';
import { PREVIEW_HOST, TEST_SITE_KEY } from '@/lib/contact-policy';

const handleContactRequest: typeof handleRequest = (request, dependencies) => handleRequest(request, { rateLimiter: () => 0, ...dependencies });
const verifiedResult = { success: true, hostname: 'judithbasininnovativesolutions.com', action: 'contact' };
afterEach(() => vi.useRealTimers());

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
  inquiryId: '74a15b43-c341-4c6b-8500-a7324b5fa2c9',
};

function requestFor(payload: unknown, headers: Record<string, string> = {}) {
  return new Request('https://judithbasininnovativesolutions.com/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

const configuredEnv = { RESEND_API_KEY: 'resend-test', TURNSTILE_SECRET_KEY: 'turnstile-test', TURNSTILE_SITE_KEY: 'production-site-key' };

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
      .mockResolvedValueOnce(new Response(JSON.stringify(verifiedResult), { status: 200 }))
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
      if (String(input).includes('siteverify')) return new Response(JSON.stringify(verifiedResult), { status: 200 });
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

describe('production contact safeguards', () => {
  const successfulFetcher = () => vi.fn<typeof fetch>(async (input) => new Response(JSON.stringify(
    String(input).includes('siteverify') ? verifiedResult : { id: 'email-id' },
  )));

  it.each(['evil.example', '', undefined])('rejects a mismatched or missing verified hostname: %s', async (hostname) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...verifiedResult, hostname })));
    expect((await handleContactRequest(requestFor(validPayload), { env: configuredEnv, fetcher })).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['login', '', undefined])('rejects a mismatched or missing action: %s', async (action) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...verifiedResult, action })));
    expect((await handleContactRequest(requestFor(validPayload), { env: configuredEnv, fetcher })).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects public-domain test keys and mismatched key modes without calling providers', async () => {
    const testSecret = '1x0000000000000000000000000000000AA';
    const fetcher = successfulFetcher();
    for (const env of [
      { ...configuredEnv, TURNSTILE_SECRET_KEY: testSecret, TURNSTILE_SITE_KEY: TEST_SITE_KEY },
      { ...configuredEnv, TURNSTILE_SITE_KEY: TEST_SITE_KEY },
      { ...configuredEnv, TURNSTILE_SITE_KEY: '' },
    ]) expect((await handleContactRequest(requestFor(validPayload), { env, fetcher })).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('allows official dummy responses only on the controlled preview with matching test keys', async () => {
    const request = new Request(`https://${PREVIEW_HOST}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validPayload) });
    const fetcher = vi.fn<typeof fetch>(async (input) => new Response(JSON.stringify(String(input).includes('siteverify')
      ? { success: true, hostname: 'example.com' } : { id: 'test-message' })));
    expect((await handleContactRequest(request, { env: { ...configuredEnv, TURNSTILE_SITE_KEY: TEST_SITE_KEY, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }, fetcher })).status).toBe(200);
  });

  it('bounds actual UTF-8 body bytes without trusting the Content-Length header', async () => {
    const fetcher = successfulFetcher();
    for (const headers of [{}, { 'content-length': '1' }] as Record<string, string>[]) {
      const request = requestFor({ ...validPayload, ignored: 'é'.repeat(MAX_CONTACT_BYTES) }, headers);
      expect((await handleContactRequest(request, { env: configuredEnv, fetcher })).status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('cancels an oversized chunked body before reading the rest', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(MAX_CONTACT_BYTES + 1)); }, cancel });
    const request = new Request('https://judithbasininnovativesolutions.com/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit);
    expect((await handleContactRequest(request, { env: configuredEnv })).status).toBe(400);
    expect(cancel).toHaveBeenCalled();
  });

  it('times out a stalled request body', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const request = new Request('https://judithbasininnovativesolutions.com/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit);
    const response = handleContactRequest(request, { env: configuredEnv });
    // Let the asynchronous IP digest complete before advancing the body deadline.
    await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));
    await vi.advanceTimersByTimeAsync(PROVIDER_TIMEOUT_MS + 1);
    expect((await response).status).toBe(400);
    expect(cancel).toHaveBeenCalled();
  });

  it('validates inquiry IDs and Turnstile token length', () => {
    expect(validateContactPayload({ ...validPayload, inquiryId: 'invalid' }).errors.inquiryId).toBeTruthy();
    expect(validateContactPayload({ ...validPayload, turnstileToken: 'x'.repeat(2049) }).errors.turnstileToken).toBeTruthy();
  });

  it('reuses an opaque idempotency key for unchanged retries but not edited inquiries', async () => {
    const fetcher = successfulFetcher();
    for (const payload of [validPayload, { ...validPayload, turnstileToken: 'fresh-token' }, { ...validPayload, projectSummary: 'A revised project summary for a different first release.' }]) {
      expect((await handleContactRequest(requestFor(payload), { env: configuredEnv, fetcher })).status).toBe(200);
    }
    const keys = fetcher.mock.calls.filter(([input]) => String(input).includes('resend.com')).map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'));
    expect(keys[0]).toMatch(/^jbis\/[0-9a-f]{64}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
    expect(keys[0]).not.toContain(validPayload.email);
  });

  it('puts finite abort signals on both provider requests', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetcher = successfulFetcher();
    await handleContactRequest(requestFor(validPayload), { env: configuredEnv, fetcher });
    expect(timeout).toHaveBeenCalledWith(PROVIDER_TIMEOUT_MS);
    expect(fetcher.mock.calls.every(([, init]) => init?.signal instanceof AbortSignal)).toBe(true);
    timeout.mockRestore();
  });

  it.each(['siteverify', 'resend.com'])('handles network/timeout errors from %s without exposing provider errors', async (failing) => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes(failing)) throw new DOMException('private-provider-detail', 'TimeoutError');
      return new Response(JSON.stringify(verifiedResult));
    });
    const response = await handleContactRequest(requestFor(validPayload), { env: configuredEnv, fetcher });
    expect(response.status).toBe(failing === 'siteverify' ? 403 : 502);
    expect(await response.text()).not.toContain('private-provider-detail');
  });

  it('returns a retryable 429 before reading or sending an inquiry', async () => {
    const fetcher = successfulFetcher();
    const response = await handleContactRequest(requestFor(validPayload), { env: configuredEnv, fetcher, rateLimiter: () => 42 });
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('42');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses bounded, expiring, isolated per-client counters', () => {
    let now = 0;
    const limiter = createContactRateLimiter({ limit: 2, maxEntries: 2, now: () => now });
    expect(limiter('a')).toBe(0);
    expect(limiter('a')).toBe(0);
    expect(limiter('a')).toBe(60);
    expect(limiter('b')).toBe(0);
    expect(limiter('c')).toBe(60);
    now = 61_000;
    expect(limiter('a')).toBe(0);
    expect(limiter('c')).toBe(0);
  });
});
