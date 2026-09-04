'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { BUDGETS, PROJECT_TYPES, TIMELINES, type FieldErrors } from '@/lib/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; theme: 'dark' }) => string;
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
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ApiResponse['errors']>({});
  const [status, setStatus] = useState<{ kind: 'idle' | 'error' | 'success'; message: string }>({ kind: 'idle', message: '' });

  const errorFor = (field: keyof FieldErrors) => fieldErrors?.[field];
  useEffect(() => {
    const renderWidget = () => {
      if (window.turnstile && turnstileContainerRef.current && !turnstileWidgetIdRef.current) {
        turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          theme: 'dark',
        });
      }
    };

    const scriptSource = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptSource}"]`);
    if (window.turnstile) {
      renderWidget();
    } else if (script) {
      script.addEventListener('load', renderWidget, { once: true });
    } else {
      script = document.createElement('script');
      script.src = scriptSource;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWidget, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      if (script) script.removeEventListener('load', renderWidget);
      if (turnstileWidgetIdRef.current) window.turnstile?.remove?.(turnstileWidgetIdRef.current);
      turnstileWidgetIdRef.current = undefined;
    };
  }, [turnstileSiteKey]);

  const resetTurnstile = () => {
    try {
      window.turnstile?.reset(turnstileWidgetIdRef.current);
    } catch {
      // A navigation or blocked widget can leave Turnstile without a current instance.
    }
  };

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const values = new FormData(form);
    setPending(true);
    setFieldErrors({});
    setStatus({ kind: 'idle', message: 'Sending your inquiry…' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
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
        resetTurnstile();
        setStatus({ kind: 'success', message: 'Your inquiry was sent. Thank you for sharing what you’re building.' });
        return;
      }

      setFieldErrors(result.errors || {});
      if (response.status === 403) resetTurnstile();
      setStatus({
        kind: 'error',
        message: result.message || result.errors?.form || 'Please review the highlighted fields and try again.',
      });
    } catch {
      setStatus({ kind: 'error', message: 'The form could not connect. Your entries are still here—please try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="project-inquiry" ref={formRef} className="inquiry-form" onSubmit={submitInquiry} noValidate>
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
        <p>Protected by Cloudflare Turnstile. See our <a href="/privacy">privacy notice</a>.</p>
      </div>

      <div className="submit-row">
        <Button type="submit" disabled={pending} aria-disabled={pending}>
          {pending ? 'Sending…' : 'Send project inquiry'} {!pending && <Send aria-hidden="true" size={17} />}
        </Button>
        <div className={`form-status ${status.kind}`} role="status" aria-live="polite" aria-atomic="true">
          {status.message}
        </div>
      </div>
    </form>
  );
}
