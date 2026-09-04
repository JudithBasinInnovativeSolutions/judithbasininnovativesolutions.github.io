# JBIS website

The Judith Basin Innovative Solutions company site is a Vinext application built for Cloudflare Workers and OpenAI Sites. It contains public company pages and a server-side project inquiry endpoint.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Copy `.env.example` to an ignored local environment file when testing the form. Cloudflare publishes official Turnstile test keys for controlled testing; never commit a Resend API key or a production Turnstile secret.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The production build must create `dist/server/index.js` with a default object that exposes a callable `fetch` handler.

## Runtime configuration

- `TURNSTILE_SITE_KEY`: public Cloudflare Turnstile widget key, read at request time (not baked into a build)
- `TURNSTILE_SECRET_KEY`: hosted secret used for server-side Siteverify requests
- `RESEND_API_KEY`: hosted secret used to deliver project inquiries

The form sends from `website@mail.judithbasininnovativesolutions.com`. Only that dedicated sending subdomain should be verified with Resend. Do not replace or edit the apex Microsoft 365 mail records as part of site deployment.

## Deployment

`.openai/hosting.json` connects this checkout to its private Sites project. GitHub Actions runs build and test checks only; it does not publish to GitHub Pages. The historical remote `gh-pages` branch is intentionally left unchanged.

See [the production cutover checklist](docs/PRODUCTION_CUTOVER.md) before connecting the live domain.

For account setup, follow [the owner setup guide](docs/OWNER_SETUP.md). Do not paste real credentials into chat or commit them.

## Contact safeguards

- Actual request bodies are limited to 24,000 UTF-8 bytes, including chunked uploads. Body reads and each provider request have an 8-second deadline; the browser has a 25-second deadline.
- Turnstile checks success, exact hostname, and the `contact` action. Official dummy keys/responses are accepted only on localhost or the named private preview, never on the public company hostnames. There is no production fallback to a dummy widget key.
- The form gets a fresh verification token after every attempted delivery and retains entries after failure. A stable form-attempt UUID plus a hash of the normalized message creates the Resend idempotency key. This deduplicates unchanged retries within Resend's 24-hour retention; it is not permanent exactly-once delivery across reloads, new attempts, or the retention boundary.
- A bounded per-Worker-instance limiter allows 5 attempts per client per 60 seconds and returns 429 with `Retry-After`. It hashes the edge-supplied `CF-Connecting-IP`, retains no inquiry data, and ignores arbitrary forwarded-IP headers. If the edge supplies no IP, clients share the unknown-client bucket. Counters expire and are capped at 2,048 entries.
- This in-memory limiter resets on Worker replacement and is not shared across instances/locations. It is defense in depth, not a distributed quota or substitute for an edge rate-limiting policy. Confirm the trusted edge IP behavior and available edge controls before public launch; do not silently add unsupported hosting bindings or migrate DNS.
- No JavaScript means no enabled submit button; the form also explicitly uses POST so data cannot leak into a GET URL before hydration. Direct email remains available.
