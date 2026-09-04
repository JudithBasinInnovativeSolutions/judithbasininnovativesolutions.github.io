export const CONTACT_ACTION = 'contact';
export const TEST_SITE_KEY = '1x00000000000000000000AA';
export const CONTACT_TIMEOUT_MS = 25_000;
export const INQUIRY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PREVIEW_HOST = 'jbis-software.allensimpson.chatgpt.site';
export const CONTACT_HOSTS = ['judithbasininnovativesolutions.com', 'www.judithbasininnovativesolutions.com', PREVIEW_HOST];

export function isTestHost(hostname: string) {
  return [PREVIEW_HOST, 'localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

export function isTestKey(key: string) {
  return /^[123]x0{18,}(AA|AB|BB|FF)$/.test(key);
}
