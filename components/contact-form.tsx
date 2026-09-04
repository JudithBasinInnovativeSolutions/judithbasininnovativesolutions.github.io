'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { BUDGETS, PROJECT_TYPES, TIMELINES, type FieldErrors } from '@/lib/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { CONTACT_ACTION, CONTACT_TIMEOUT_MS } from '@/lib/contact-policy';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; theme: 'dark'; action: string; callback: () => void; 'expired-callback': () => void; 'error-callback': () => void }) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

type ApiResponse = {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors & { form?: string };
};

export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | undefined>(undefined);
  const inquiryIdRef = useRef<string | undefined>(undefined);
  const pendingRef = useRef(false);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ApiResponse['errors']>({});
  const [status, setStatus] = useState<{ kind: 'idle' | 'error' | 'success'; message: string }>({ kind: 'idle', message: '' });

  const errorFor = (field: keyof FieldErrors) => fieldErrors?.[field];
  useEffect(() => {
    const verificationUnavailable = () => {
      setVerified(false);
      setStatus({ kind: 'error', message: 'Verification could not load. Please reload this page or use the email address shown here.' });
    };
    if (!turnstileSiteKey) {
      setStatus({ kind: 'error', message: 'Project inquiries are temporarily unavailable. Please use the email address shown here.' });
      return;
    }
    const renderWidget = () => {
      if (window.turnstile && turnstileContainerRef.current && !turnstileWidgetIdRef.current) {
        try {
          turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: turnstileSiteKey,
            theme: 'dark',
            action: CONTACT_ACTION,
            callback: () => {
              setVerified(true);
              setStatus((previous) => previous.kind === 'error' && previous.message.startsWith('Verification') ? { kind: 'idle', message: '' } : previous);
            },
            'expired-callback': () => {
              setVerified(false);
              if (!pendingRef.current) setStatus({ kind: 'error', message: 'Verification expired. Complete the verification again; your entries are still here.' });
            },
            'error-callback': verificationUnavailable,
          });
        } catch { verificationUnavailable(); }
      }
    };

    const scriptSource = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptSource}"]`);
    if (window.turnstile) {
      renderWidget();
    } else if (script) {
      script.addEventListener('load', renderWidget, { once: true });
      script.addEventListener('error', verificationUnavailable, { once: true });
    } else {
      script = document.createElement('script');
      script.src = scriptSource;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWidget, { once: true });
      script.addEventListener('error', verificationUnavailable, { once: true });
      document.head.appendChild(script);
    }

    const loadDeadline = setTimeout(() => { if (!turnstileWidgetIdRef.current) verificationUnavailable(); }, 10_000);
    return () => {
      clearTimeout(loadDeadline);
      if (script) script.removeEventListener('load', renderWidget);
      if (script) script.removeEventListener('error', verificationUnavailable);
      if (turnstileWidgetIdRef.current) window.turnstile?.remove?.(turnstileWidgetIdRef.current);
      turnstileWidgetIdRef.current = undefined;
    };
  }, [turnstileSiteKey]);

  const resetTurnstile = () => {
    setVerified(false);
    try {
      window.turnstile?.reset(turnstileWidgetIdRef.current);
    } catch {
      // A navigation or blocked widget can leave Turnstile without a current instance.
    }
  };

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const values = new FormData(form);
    if (!verified || !values.get('cf-turnstile-response')) {
      setStatus({ kind: 'error', message: 'Complete the verification before sending your inquiry.' });
      return;
    }
    inquiryIdRef.current ??= crypto.randomUUID();
    pendingRef.current = true;
    setPending(true);
    setFieldErrors({});
    setStatus({ kind: 'idle', message: 'Sending your inquiry…' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(CONTACT_TIMEOUT_MS),
        body: JSON.stringify({
          inquiryId: inquiryIdRef.current,
          name: values.get('name'),
          email: values.get('email'),
          organization: values.get('organization'),
          projectType: values.get('projectType'),
          projectSummary: values.get('projectSummary'),
          timeline: values.get('timeline'),
          budget: values.get('budget'),
          website: values.get('website'),
          turnstileToken: values.get('cf-turnstile-response'),
        }),
      });
      const result = await response.json() as ApiResponse;

      if (response.ok && result.ok) {
        form.reset();
        inquiryIdRef.current = undefined;
        setStatus({ kind: 'success', message: 'Your inquiry was sent. Thank you for sharing what you’re building.' });
        return;
      }

      setFieldErrors(result.errors || {});
      setStatus({
        kind: 'error',
        message: result.message || result.errors?.form || 'Please review the highlighted fields and try again.',
      });
    } catch {
      setStatus({ kind: 'error', message: 'We could not confirm delivery. Your entries are still here—please retry this inquiry or use the email address shown here.' });
    } finally {
      // Siteverify consumes tokens even when the subsequent email request fails.
      resetTurnstile();
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <form id="project-inquiry" method="post" action="/api/contact" ref={formRef} className="inquiry-form" onSubmit={submitInquiry} noValidate aria-busy={pending}>
      <noscript><p>This form needs JavaScript for secure delivery. Please use the email address shown on this page.</p></noscript>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Name <span aria-hidden="true">*</span></label>
          <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} aria-invalid={Boolean(errorFor('name'))} aria-describedby={errorFor('name') ? 'name-error' : undefined} />
          {errorFor('name') && <p className="field-error" id="name-error">{errorFor('name')}</p>}
        </div>
        <div className="field">
          <label htmlFor="email">Email <span aria-hidden="true">*</span></label>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={Boolean(errorFor('email'))} aria-describedby={errorFor('email') ? 'email-error' : undefined} />
          {errorFor('email') && <p className="field-error" id="email-error">{errorFor('email')}</p>}
        </div>
        <div className="field field-wide">
          <label htmlFor="organization">Organization <span className="optional">Optional</span></label>
          <Input id="organization" name="organization" autoComplete="organization" maxLength={120} aria-invalid={Boolean(errorFor('organization'))} aria-describedby={errorFor('organization') ? 'organization-error' : undefined} />
          {errorFor('organization') && <p className="field-error" id="organization-error">{errorFor('organization')}</p>}
        </div>
        <div className="field">
          <label htmlFor="projectType">Project type <span aria-hidden="true">*</span></label>
          <NativeSelect id="projectType" name="projectType" required defaultValue="" aria-invalid={Boolean(errorFor('projectType'))} aria-describedby={errorFor('projectType') ? 'project-type-error' : undefined}>
            <NativeSelectOption value="" disabled>Select one</NativeSelectOption>
            {PROJECT_TYPES.map((option) => <NativeSelectOption value={option} key={option}>{option}</NativeSelectOption>)}
          </NativeSelect>
          {errorFor('projectType') && <p className="field-error" id="project-type-error">{errorFor('projectType')}</p>}
        </div>
        <div className="field">
          <label htmlFor="timeline">Timeline <span aria-hidden="true">*</span></label>
          <NativeSelect id="timeline" name="timeline" required defaultValue="" aria-invalid={Boolean(errorFor('timeline'))} aria-describedby={errorFor('timeline') ? 'timeline-error' : undefined}>
            <NativeSelectOption value="" disabled>Select one</NativeSelectOption>
            {TIMELINES.map((option) => <NativeSelectOption value={option} key={option}>{option}</NativeSelectOption>)}
          </NativeSelect>
          {errorFor('timeline') && <p className="field-error" id="timeline-error">{errorFor('timeline')}</p>}
        </div>
        <div className="field field-wide">
          <label htmlFor="budget">Budget <span className="optional">Optional</span></label>
          <NativeSelect id="budget" name="budget" defaultValue="" aria-invalid={Boolean(errorFor('budget'))} aria-describedby={errorFor('budget') ? 'budget-error' : undefined}>
            <NativeSelectOption value="">Select a range</NativeSelectOption>
            {BUDGETS.map((option) => <NativeSelectOption value={option} key={option}>{option}</NativeSelectOption>)}
          </NativeSelect>
          {errorFor('budget') && <p className="field-error" id="budget-error">{errorFor('budget')}</p>}
        </div>
        <div className="field field-wide">
          <label htmlFor="projectSummary">Project summary <span aria-hidden="true">*</span></label>
          <Textarea id="projectSummary" name="projectSummary" required minLength={20} maxLength={3000} placeholder="What problem are you solving, who is it for, and what would a useful first release make possible?" aria-invalid={Boolean(errorFor('projectSummary'))} aria-describedby={`summary-help${errorFor('projectSummary') ? ' summary-error' : ''}`} />
          <p className="field-help" id="summary-help">20–3,000 characters</p>
          {errorFor('projectSummary') && <p className="field-error" id="summary-error">{errorFor('projectSummary')}</p>}
        </div>
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="verification-row">
        <div className="turnstile-host" ref={turnstileContainerRef} data-sitekey={turnstileSiteKey} />
        <p>Complete the verification to enable sending. Protected by Cloudflare Turnstile. See our <a href="/privacy">privacy notice</a>.</p>
      </div>

      <div className="submit-row">
        <Button type="submit" disabled={pending || !verified} aria-disabled={pending || !verified}>
          {pending ? 'Sending…' : 'Send project inquiry'} {!pending && <Send aria-hidden="true" size={17} />}
        </Button>
        <div className={`form-status ${status.kind}`} role="status" aria-live="polite" aria-atomic="true">
          {status.message}
        </div>
      </div>
    </form>
  );
}
