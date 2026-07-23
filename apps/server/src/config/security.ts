import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const MINIMUM_SECRET_BYTES = 32;

if (!process.env.JWT_SECRET) {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
      if (process.env.JWT_SECRET) break;
    }
  }
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < MINIMUM_SECRET_BYTES) {
  throw new Error(`JWT_SECRET must contain at least ${MINIMUM_SECRET_BYTES} bytes`);
}

export const JWT_SECRET = jwtSecret;
