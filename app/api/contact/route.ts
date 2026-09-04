import { handleContactRequest } from '@/lib/contact';

export const runtime = 'edge';

export async function POST(request: Request) {
  return handleContactRequest(request, {
    env: {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    },
  });
}
