# JBIS production launch record

## Authorization and confirmed setup

On September 6, 2026, the owner explicitly approved making the new site public and changing only website-hosting DNS after final checks. Microsoft 365 records, Resend sending records, and nameservers must remain unchanged.

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

In progress. No production traffic switch is confirmed by this record yet. Record final DNS, TLS, route, redirect, and production inquiry results after verification.
