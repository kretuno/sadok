const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const normalizeActivatorApiUrl = (value: string | undefined): string => {
  const candidate = (value || '').trim().replace(/\/+$/, '');
  if (!candidate) return '';

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('ACTIVATOR_API_URL має бути коректною URL-адресою');
  }

  const isSecure = parsed.protocol === 'https:';
  const isLoopbackDevelopment = parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname);
  if (!isSecure && !isLoopbackDevelopment) {
    throw new Error('ACTIVATOR_API_URL має використовувати HTTPS; HTTP дозволено лише для локальної розробки');
  }

  return candidate;
};
