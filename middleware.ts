export function middleware(request: Request) {
  const url = new URL(request.url);
  if (url.hostname !== 'www.judithbasininnovativesolutions.com') return;

  // Construct from the original URL so paths and query parameters survive.
  url.protocol = 'https:';
  url.hostname = 'judithbasininnovativesolutions.com';
  url.port = '';
  return Response.redirect(url, 308);
}

export const config = { matcher: '/:path*' };
