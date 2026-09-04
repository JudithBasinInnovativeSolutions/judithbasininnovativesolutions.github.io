# JBIS: owner setup before launch

The site can stay private while you prepare these accounts. No production-domain switch is needed now. Do not paste API keys, secret keys, passwords, or recovery codes into this chat, GitHub, or screenshots. Keep credentials in your password manager until they can be entered directly as hosted secrets.

## 1. Prepare the Resend sending domain

1. Sign in to your company-owned [Resend account](https://resend.com/). Complete account verification and enable account security/MFA.
2. Open **Domains → Add domain**. Enter exactly `mail.judithbasininnovativesolutions.com`, not the apex `judithbasininnovativesolutions.com`.
3. Choose a US sending region. Leave **Receiving** disabled; Microsoft 365 continues receiving your company mail. Leave open/click tracking off.
4. Choose manual DNS setup. Do not use Auto Configure or grant automated DNS access during this preparation stage.
5. Copy the provider-issued record table: Type, Name/Host, Value/Content, Priority (if any), and TTL. These DNS records are intended to become public and can be shared for review. Do not include account/API credentials in the screenshot.
6. **Stop before changing DNS.** Send the record table for review and explicitly approve the dedicated sending-subdomain changes before applying them. The domain will remain Pending until that later step.

Using a dedicated subdomain separates website sending from existing company mail. [Resend domain documentation](https://resend.com/docs/dashboard/domains/introduction)

## 2. After approval: add only those sending-subdomain DNS records

This step changes DNS. It does not publish the new website, but must not be performed during the no-DNS-change implementation phase.

1. In GoDaddy, open the domain's DNS management page and save a copy/screenshot of the existing records. If GoDaddy is not the authoritative DNS host, stop and identify the actual host.
2. Add the exact approved records from Resend. Use the provider's values, not sample values from documentation.
3. GoDaddy's Name field is relative to the apex. For example, a provider name `send.mail.judithbasininnovativesolutions.com` becomes `send.mail`; `resend._domainkey.mail.judithbasininnovativesolutions.com` becomes `resend._domainkey.mail`. These are name-format examples only, not a record set to invent.
4. Do not alter `@` Microsoft 365 MX, apex SPF, `_dmarc`, website A/AAAA/CNAME records, nameservers, or unrelated records. Stop if a proposed record conflicts with an existing record.
5. Return to Resend and select **Verify DNS Records**. Wait until the dedicated sender is **Verified**.

Follow the manual procedure in [Resend's GoDaddy guide](https://resend.com/docs/knowledge-base/godaddy); keep Receiving off and do not follow its root-domain examples literally.

## 3. Create a restricted Resend API key

1. In Resend, open **API Keys → Create API Key**.
2. Name it `JBIS website inquiries`.
3. Choose **Sending access** and restrict it to the verified `mail.judithbasininnovativesolutions.com` domain. Do not use Full access for the website.
4. Save the new value in your password manager when displayed. It cannot be retrieved later; replace it if lost.
5. Tell me that the restricted key is ready, not the key itself.

References: [Resend key management](https://resend.com/docs/dashboard/api-keys/introduction), [key permissions and domain restrictions](https://resend.com/docs/api-reference/api-keys/create-api-key).

The website will send as `JBIS Website <website@mail.judithbasininnovativesolutions.com>` to `Allen.Simpson@JudithBasinInnovativeSolutions.com`. Replies target the visitor. No new inbox needs to be purchased for the sending address.

## 4. Create the production Turnstile widget

1. Sign in to your company-owned [Cloudflare account](https://dash.cloudflare.com/). Use **Turnstile → Add widget**; do not add/migrate the website's DNS zone for this task.
2. Name it `JBIS project inquiries` and choose **Managed** mode.
3. Add these hostnames without `https://` or paths:
   - `judithbasininnovativesolutions.com`
   - `www.judithbasininnovativesolutions.com` (if the dashboard says it is already covered by the apex, that is fine)
   - `jbis-software.allensimpson.chatgpt.site` (for private real-delivery testing)
4. Keep pre-clearance disabled. Do not add localhost to this production widget.
5. Create the widget. Its **site key is public**; its **secret key is confidential**. Store the secret securely. You can share the site key and the hostname list for review.

Turnstile works independently of moving the domain's DNS. The code already specifies the `contact` action. [Cloudflare widget setup](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/), [hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).

## 5. Configure hosted values securely

These values belong to the JBIS Sites project's hosted environment, not GitHub repository secrets, the source tree, or a local `.env` containing production credentials.

| Hosted name | Value | Secret? |
| --- | --- | --- |
| `RESEND_API_KEY` | Restricted Resend sending key | Yes |
| `TURNSTILE_SECRET_KEY` | Production widget secret | Yes |
| `TURNSTILE_SITE_KEY` | Matching public widget site key | No |

Tell me when the keys are ready. The available Sites connection can configure hosted values, but this chat does not provide a dedicated secure user-input field. Do **not** paste secrets here to bridge that gap. If your Sites settings offer direct secret entry, use that; otherwise pause and we will agree on a secure entry method before transferring anything. There is no reason to weaken secret handling just to finish the preview.

I will verify only configuration names/presence, apply the environment to a private deployment, and confirm that the page uses the matching production public key. Old `NEXT_PUBLIC_TURNSTILE_SITE_KEY` configuration is no longer used.

## 6. Verify delivery together

1. Open the private Contact page while signed in.
2. Use a real email address you control as the visitor address. Mark the summary **JBIS pre-launch test — please disregard** and enter at least 20 characters.
3. Send once and wait for the success message. Confirm one inquiry arrives in the company inbox; check junk/quarantine if necessary.
4. Click Reply and verify the recipient is your visitor test address. Send a brief reply and confirm it arrives there.
5. Confirm the sender identity, field formatting, and privacy notice are correct. The automated tests simulate delivery; only this step proves actual inbox delivery.

## 7. Public launch stays a separate approval

Before launch, we will assess edge rate limiting, record rollback DNS values, review old URLs for redirects, approve public access, and connect the production hostname. We will then verify HTTPS, canonical/WWW behavior, sitemap/robots, and a final real inquiry. The current in-memory rate limiter is only per Worker instance, not a global quota.

For now, report only: Resend sender name/status and DNS record table; restricted-key readiness; Turnstile public site key and hostname list. Do not publish the preview or switch hosting records yet.
