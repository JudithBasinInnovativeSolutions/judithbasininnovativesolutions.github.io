# Production cutover checklist

Production publication and domain changes require separate approval. Until then, keep `judithbasininnovativesolutions.com`, its GoDaddy site, and all DNS records unchanged.

Start with [the owner account-setup guide](OWNER_SETUP.md). It separates safe preparation from the later approved DNS steps.

## 1. Prepare inquiry delivery

- In the user-owned Resend account, add only `mail.judithbasininnovativesolutions.com` as the sending domain.
- Copy Resend’s provider-issued DNS records exactly. Add them only at the names Resend specifies beneath the dedicated `mail` subdomain.
- Confirm the apex Microsoft 365 MX record, apex SPF policy, and DMARC policy are unchanged before and after adding the sending-subdomain records.
- Wait for Resend to report the sending subdomain as verified.
- Store the user-owned `RESEND_API_KEY` as a Sites secret. Never paste it into source, Git configuration, issue text, or build logs.

## 2. Prepare bot verification

- Create a production Cloudflare Turnstile widget for the approved production hostname.
- Add the deployed private-preview hostname only if it is still needed for a controlled real-delivery test.
- Store `TURNSTILE_SECRET_KEY` as a Sites secret and set `TURNSTILE_SITE_KEY` to the matching public site key. This runtime variable replaces the old build-time `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Replace the official test keys before production traffic is enabled.

## 3. Verify the complete private preview

- Deploy a new private Sites version after the runtime values are configured.
- Submit one clearly labeled test inquiry and confirm exactly one message arrives at `Allen.Simpson@JudithBasinInnovativeSolutions.com`.
- Reply to the message and confirm Reply-To targets the visitor address used in the test.
- Confirm the page serves the production public widget key, not a dummy key; server validation requires the exact page hostname and action `contact`.
- Test a provider failure followed by a retry with a fresh bot token. Unchanged retries must use the same Resend idempotency key within its 24-hour retention window.
- Confirm the trusted hosting edge preserves the visitor's `CF-Connecting-IP`. The application limiter is best-effort per Worker instance (5 attempts/minute), not distributed protection. Assess an edge rate-limiting policy with the hosting provider before public access; any extra account, binding, or DNS migration requires separate approval.
- Recheck every route, navigation, metadata, assets, mobile layout, keyboard focus, 200% text zoom, and reduced-motion behavior.

## 4. Approve and connect the production domain

- Record the current GoDaddy configuration and decide on a rollback window.
- Approve the final page copy, privacy notice, sender identity, and form behavior.
- Add the custom domain through Sites, then apply only the DNS records Sites provides.
- Do not edit the apex Microsoft 365 mail records while changing website hosting records.
- Verify HTTPS, redirects, canonical URLs, `robots.txt`, and `sitemap.xml` on the live hostname.
- Run one final inquiry test and monitor delivery before retiring the prior GoDaddy site.

## 5. Rollback readiness

- Keep the previous GoDaddy target and DNS values documented until the new site is accepted.
- If the site or inquiry flow fails, restore only the website-hosting records; do not change mail records.
- The historical GitHub Pages branch remains available as repository history but is not part of the new deployment path.
