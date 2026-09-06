# JBIS production launch record

## Authorization and confirmed setup

On September 6, 2026, the owner explicitly approved making the new site public and changing only website-hosting DNS after final checks. Microsoft 365 records, Resend sending records, and nameservers must remain unchanged.

The owner subsequently approved proceeding with the DNS switch despite the possible temporary HTTPS interruption while automatic certificate validation completes.

The private-preview inquiry sent at approximately 13:22 Mountain passed production Turnstile verification. Resend reported delivery and the owner confirmed receipt and correct behavior. The email's sender and Reply-To were inspected. Resend and Turnstile secrets are stored as hosted secrets; no credentials are recorded here.

## Rollback baseline (before production DNS changes)

Authoritative DNS: `ns33.domaincontrol.com` and `ns34.domaincontrol.com`.

| Type | Name | Previous value | TTL |
| --- | --- | --- | --- |
| A | @ | 76.223.105.230 | 3600 |
| A | @ | 13.248.243.5 | 3600 |
| CNAME | www | judithbasininnovativesolutions.com. | 3600 |

GoDaddy represents the two apex addresses as one managed **WebsiteBuilder Site** record. Retain the existing GoDaddy website and subscription during acceptance. Do not unpublish or delete the old site. Restore these website DNS targets if the new site or inquiry flow fails; do not restore a whole DNS zone or overwrite mail changes.

Keep this rollback baseline until the owner has accepted the live site and at least seven days have passed. This retention window does not authorize deleting the old website later.

Protected Microsoft 365 baseline:

- MX @: `judithbasininnovativesolutions-com.mail.protection.outlook.com.`, priority 0.
- TXT @: `v=spf1 include:spf.protection.outlook.com -all`.
- TXT _dmarc: `v=DMARC1; p=reject; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;`.
- Preserve all other existing Microsoft 365 CNAME and SRV records.
- Preserve all three verified Resend records under `mail` / `send.mail`.

## Cutover targets issued by Sites

- Apex A: `162.159.143.30` and `172.66.3.26`.
- WWW CNAME: `custom-domains.chatgpt.site.`.
- Install the provider-issued ownership and certificate validation records exactly. These are domain-specific; do not copy sample values from documentation.
- Both apex and WWW must have active certificates. Application configuration redirects WWW to the canonical apex while preserving paths.

## Abuse protection assessment

Production Turnstile is mandatory before email delivery, with server-side checks for the exact hostname and `contact` action. Additional controls include same-origin checks, field validation, a honeypot, bounded upload size/time, provider timeouts, and idempotent email retries.

The application throttle is bounded and per Worker instance (5 attempts per 60 seconds). It is not a global or distributed quota. Missing edge IP metadata deliberately falls into a shared bucket. The available Sites management interface exposes no custom edge rate-limit policy; adding another service, binding, or moving DNS would require separate approval. This limitation must not be described as global flood protection.

## Release status

Ownership-verification TXT records for both apex and WWW were saved on September 6, 2026. Sites public access was enabled with owner approval. The validated release (52 automated tests, type checking, linting, production build, and callable Worker `fetch`) is published with the production Resend and Turnstile settings. The built Worker was directly tested to return a 308 WWW redirect preserving the path and query string.

By 15:01 Mountain, GoDaddy had saved both apex A targets and the WWW CNAME above, with TTL 3600. Each required security verification was completed directly by the owner. Authoritative DNS confirms the new website targets. The original GoDaddy website and subscription have not been deleted or unpublished.

Post-change checks confirm the Microsoft 365 MX, SPF, and DMARC values above are unchanged, as are the three Resend records. The existing Microsoft 365 CNAME records and the two GoDaddy nameservers remain in place.

The public temporary Sites address serves all five pages, robots, sitemap, and the branded 404 without sign-in. A malformed inquiry returns field errors with HTTP 400; requests attempting to supply a visitor-IP header were rejected with HTTP 403. No email was sent by these negative checks. These observations do not establish a distributed rate limit or prove the exact IP metadata delivered to every Worker instance.

By 15:05 Mountain, both custom hostnames, their certificates, and routing were active. Direct HTTPS checks against the provider-issued edge addresses confirm all five pages return 200, the branded missing page returns 404, and robots/sitemap return 200. Canonical links use the company domain and Organization JSON-LD is present. Eighteen referenced local assets returned 200. HTTPS WWW returns 308 to the apex preserving path and query parameters; HTTP redirects to HTTPS with path and query parameters preserved.

Production-host desktop (1440 × 900) and mobile (390 × 844) browser checks confirmed no homepage horizontal overflow at normal and 200% text size, a visible initial keyboard focus outline, reduced-motion styles, functioning desktop navigation, mobile menu open/close and navigation, and three loaded About photographs with alternative text. Home, About, and contact screenshots were inspected; these browser checks produced no page errors. The test browsers used a session-only hostname mapping to the provider-issued edge address, with normal TLS validation and no changes to machine DNS settings.

The local network resolver still caches the previous GoDaddy addresses. Clearing the local Windows DNS cache did not invalidate that upstream cache. Normal browser views may show the old site until DNS propagation finishes.

At approximately 15:12 Mountain, the owner successfully submitted a real inquiry from a separately opened normal browser on the company site and confirmed that verification and sending worked. Resend reports **Delivered** for the one new `New JBIS project inquiry` email to the existing company inbox (delivery record `558582d6-3c47-4961-ad13-4fa9cbb0e4dd`). No inquiry contents are recorded here.

Turnstile did not complete in the isolated automated Edge test window. That window was closed without submitting an inquiry; both temporary browser-test sessions have been cleaned up. The successful owner-operated browser test, not the automated attempt, is the end-to-end production acceptance evidence. No duplicate test inquiry was sent by the agent.

The public website cutover and delivery verification are complete. The published application is saved Sites version 6, built from source `9e8a4c1dc3f02892cf1d6e11050834e3233b2a90`; this launch-record update is documentation only and does not change the deployed application. Keep the prior GoDaddy website and rollback targets available during the acceptance window. Remaining old-site views on cached resolvers are DNS propagation, not authorization to delete or unpublish the old site.
