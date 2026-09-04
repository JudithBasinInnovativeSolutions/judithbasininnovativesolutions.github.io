import { handleContactRequest } from '@/lib/contact';
import { TEST_SITE_KEY } from '@/lib/contact-policy';

export const runtime = 'edge';

export async function POST(request: Request) {
  return handleContactRequest(request, {
    env: {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
      TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY || (process.env.NODE_ENV === 'development' ? TEST_SITE_KEY : undefined),
    },
  });
}
