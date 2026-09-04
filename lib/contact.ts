import { CONTACT_ACTION, CONTACT_HOSTS, INQUIRY_ID_PATTERN, isTestHost, isTestKey } from './contact-policy';
import { contactRateLimiter } from './contact-rate-limit';

export const PROJECT_TYPES = [
  'Website',
  'Web application',
  'Mobile/cross-platform application',
  'Automation/integration',
  'Other',
] as const;

export const TIMELINES = ['ASAP', '1–3 months', '3–6 months', 'Exploring'] as const;

export const BUDGETS = [
  'Under $5,000',
  '$5,000–$15,000',
  '$15,000–$30,000',
  '$30,000+',
  'Not sure yet',
] as const;

export type ContactData = {
  name: string;
  email: string;
  organization: string;
  projectType: (typeof PROJECT_TYPES)[number];
  projectSummary: string;
  timeline: (typeof TIMELINES)[number];
  budget: (typeof BUDGETS)[number] | '';
  website: string;
  turnstileToken: string;
  inquiryId: string;
};

export type FieldErrors = Partial<Record<keyof ContactData, string>>;

type ContactEnvironment = {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
};

type ContactDependencies = {
  env: ContactEnvironment;
  fetcher?: typeof fetch;
  rateLimiter?: (key: string) => number;
};

export const MAX_CONTACT_BYTES = 24_000;
export const PROVIDER_TIMEOUT_MS = 8_000;

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const textValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function isEmail(value: string) {
  if (!value || value.length > 254 || /[\r\n]/.test(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateContactPayload(payload: unknown): { data?: ContactData; errors: FieldErrors } {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const data = {
    name: textValue(source.name),
    email: textValue(source.email),
    organization: textValue(source.organization),
    projectType: textValue(source.projectType),
    projectSummary: textValue(source.projectSummary),
    timeline: textValue(source.timeline),
    budget: textValue(source.budget),
    website: textValue(source.website),
    turnstileToken: textValue(source.turnstileToken),
    inquiryId: textValue(source.inquiryId),
  };
  const errors: FieldErrors = {};

  if (data.name.length < 2 || data.name.length > 80) errors.name = 'Enter a name between 2 and 80 characters.';
  if (!isEmail(data.email)) errors.email = 'Enter a valid email address.';
  if (data.organization.length > 120) errors.organization = 'Organization must be 120 characters or fewer.';
  if (!PROJECT_TYPES.includes(data.projectType as ContactData['projectType'])) errors.projectType = 'Choose a project type.';
  if (data.projectSummary.length < 20 || data.projectSummary.length > 3000) errors.projectSummary = 'Enter a project summary between 20 and 3,000 characters.';
  if (!TIMELINES.includes(data.timeline as ContactData['timeline'])) errors.timeline = 'Choose a timeline.';
  if (data.budget && !BUDGETS.includes(data.budget as Exclude<ContactData['budget'], ''>)) errors.budget = 'Choose a listed budget range or leave it blank.';
  if (!INQUIRY_ID_PATTERN.test(data.inquiryId)) errors.inquiryId = 'Reload the form and try again.';
  if (data.turnstileToken.length > 2048) errors.turnstileToken = 'Verification is invalid. Please try again.';

  return Object.keys(errors).length
    ? { errors }
    : { data: data as ContactData, errors };
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] as string);
}

function formatInquiry(data: ContactData) {
  const rows = [
    ['Name', data.name],
    ['Email', data.email],
    ['Organization', data.organization || 'Not provided'],
    ['Project type', data.projectType],
    ['Timeline', data.timeline],
    ['Budget', data.budget || 'Not provided'],
  ] as const;

  const text = [
    'New JBIS website project inquiry',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Project summary:',
    data.projectSummary,
  ].join('\n');

  const htmlRows = rows.map(([label, value]) =>
    `<tr><th align="left" style="padding:6px 14px 6px 0">${escapeHtml(label)}</th><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`,
  ).join('');

  const html = `<h1>New JBIS website project inquiry</h1><table>${htmlRows}</table><h2>Project summary</h2><p style="white-space:pre-wrap">${escapeHtml(data.projectSummary)}</p>`;
  return { text, html };
}

async function verifyTurnstile(token: string, secret: string, request: Request, fetcher: typeof fetch) {
  const body = new URLSearchParams({ secret, response: token });
  const remoteIp = request.headers.get('CF-Connecting-IP');
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    if (result.success !== true) return false;
    // Dummy response metadata varies (e.g. example.com with no action).
    // Only the explicitly named private/local test hosts may use test keys.
    if (isTestKey(secret) && isTestHost(new URL(request.url).hostname)) {
      return true;
    }
    return result.hostname === new URL(request.url).hostname && result.action === CONTACT_ACTION;
  } catch {
    return false;
  }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return request.headers.get('sec-fetch-site') !== 'cross-site' && (!origin || origin === new URL(request.url).origin);
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  // Bound slow/chunked uploads as well as requests with a Content-Length header.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_CONTACT_BYTES) throw new Error('Body too large');
          chunks.push(value);
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      })(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Body timeout')), PROVIDER_TIMEOUT_MS); }),
    ]);
  } finally {
    clearTimeout(timeout);
    void reader.cancel().catch(() => undefined);
  }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function handleContactRequest(request: Request, dependencies: ContactDependencies) {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  if (!isSameOrigin(request)) return json(403, { ok: false, message: 'This submission could not be verified.' });
  const hostname = new URL(request.url).hostname;
  if (!CONTACT_HOSTS.includes(hostname) && !isTestHost(hostname)) return json(403, { ok: false, message: 'This submission could not be verified.' });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json(400, { ok: false, errors: { form: 'Send the inquiry as JSON.' } });
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_CONTACT_BYTES) return json(400, { ok: false, errors: { form: 'The inquiry is too large.' } });

  // CF-Connecting-IP must be supplied by the trusted hosting edge, not arbitrary forwarded headers.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown-client';
  const retryAfter = (dependencies.rateLimiter || contactRateLimiter)(await digest(ip));
  if (retryAfter) return new Response(JSON.stringify({ ok: false, message: `Too many attempts. Please wait ${retryAfter} seconds and try again.` }), {
    status: 429, headers: { ...JSON_HEADERS, 'retry-after': String(retryAfter) },
  });

  let payload: unknown;
  try {
    payload = await readBoundedJson(request);
  } catch {
    return json(400, { ok: false, errors: { form: 'The inquiry could not be read or exceeded the size/time limit.' } });
  }

  const { data, errors } = validateContactPayload(payload);
  if (!data) return json(400, { ok: false, errors });
  if (data.website) return json(403, { ok: false, message: 'This submission could not be verified.' });
  if (!data.turnstileToken) return json(403, { ok: false, message: 'Complete the verification and try again.' });

  const { RESEND_API_KEY: resendKey, TURNSTILE_SECRET_KEY: turnstileSecret, TURNSTILE_SITE_KEY: siteKey } = dependencies.env;
  if (!resendKey || !turnstileSecret || !siteKey ||
      (isTestKey(turnstileSecret) !== isTestKey(siteKey)) ||
      ((isTestKey(turnstileSecret) || isTestKey(siteKey)) && !isTestHost(hostname))) {
    return json(503, { ok: false, message: 'Project inquiries are temporarily unavailable. Please use the email address shown on this page.' });
  }

  const fetcher = dependencies.fetcher || fetch;
  if (!await verifyTurnstile(data.turnstileToken, turnstileSecret, request, fetcher)) {
    return json(403, { ok: false, message: 'Verification expired or was unsuccessful. Please try again.' });
  }

  const email = formatInquiry(data);
  // Stable for the same form attempt and normalized email content, independent of the single-use bot token.
  // Hashing also keeps inquiry contents out of the provider's idempotency header.
  const idempotencyKey = `jbis/${await digest(JSON.stringify([data.inquiryId, data.email, email]))}`;
  let deliveryResponse: Response;
  try {
    deliveryResponse = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${resendKey}`,
        'content-type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({
        from: 'JBIS Website <website@mail.judithbasininnovativesolutions.com>',
        to: ['Allen.Simpson@JudithBasinInnovativeSolutions.com'],
        reply_to: data.email,
        subject: 'New JBIS project inquiry',
        text: email.text,
        html: email.html,
      }),
    });
  } catch {
    return json(502, { ok: false, message: 'Your inquiry could not be delivered. Please try again or use the email address shown on this page.' });
  }

  if (!deliveryResponse.ok) {
    return json(502, { ok: false, message: 'Your inquiry could not be delivered. Please try again or use the email address shown on this page.' });
  }

  return json(200, { ok: true });
}
