import crypto from 'crypto';

export interface LicenseTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  nbf: number;
  exp?: number;
  jti: string;
  licenseKey: string;
  productCode: string;
  productName: string;
  planCode: string;
  machineId: string;
  customerName: string;
  maxActivations: number;
}

export interface VerifyLicenseTokenResult {
  valid: boolean;
  payload?: LicenseTokenPayload;
  reason?: string;
}

const TOKEN_TYPE = 'ACTIVATOR-LICENSE';
const TOKEN_ALG = 'EdDSA';

const normalizePem = (pem: string): string => pem.replace(/\\n/g, '\n').trim();

const base64UrlToBuffer = (value: string): Buffer => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
};

const parseTokenPart = <T>(value: string): T =>
  JSON.parse(base64UrlToBuffer(value).toString('utf8')) as T;

export const verifyLicenseToken = (
  token: string,
  publicKeyPem: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifyLicenseTokenResult => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Некоректний формат токена ліцензії' };
  }

  const [headerPart, payloadPart, signaturePart] = parts;

  let header: Record<string, unknown>;
  let payload: LicenseTokenPayload;

  try {
    header = parseTokenPart<Record<string, unknown>>(headerPart);
    payload = parseTokenPart<LicenseTokenPayload>(payloadPart);
  } catch {
    return { valid: false, reason: 'Не вдалося прочитати токен ліцензії' };
  }

  if (header.alg !== TOKEN_ALG || header.typ !== TOKEN_TYPE) {
    return { valid: false, reason: 'Невірний тип токена ліцензії' };
  }

  try {
    const verifier = crypto.verify(
      null,
      Buffer.from(`${headerPart}.${payloadPart}`, 'utf8'),
      normalizePem(publicKeyPem),
      base64UrlToBuffer(signaturePart),
    );

    if (!verifier) {
      return { valid: false, reason: 'Підпис токена ліцензії недійсний' };
    }
  } catch {
    return { valid: false, reason: 'Помилка криптографічної перевірки токена' };
  }

  if (typeof payload.nbf === 'number' && payload.nbf > nowSeconds) {
    return { valid: false, reason: 'Ліцензія ще не активна', payload };
  }

  if (typeof payload.exp === 'number' && payload.exp < nowSeconds) {
    return { valid: false, reason: 'Термін дії ліцензії завершився', payload };
  }

  return { valid: true, payload };
};
