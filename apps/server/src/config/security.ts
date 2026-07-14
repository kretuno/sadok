const MINIMUM_SECRET_BYTES = 32;

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < MINIMUM_SECRET_BYTES) {
  throw new Error(`JWT_SECRET must contain at least ${MINIMUM_SECRET_BYTES} bytes`);
}

export const JWT_SECRET = jwtSecret;
