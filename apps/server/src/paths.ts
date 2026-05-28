import fs from 'fs';
import path from 'path';

export const dataDir = process.env.SADOK_DATA_DIR || process.cwd();
export const uploadsDir = path.join(dataDir, 'uploads');

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function uploadPath(...segments: string[]) {
  return path.join(uploadsDir, ...segments);
}
