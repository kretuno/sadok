import fs from 'fs';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const detectImageExtension = (buffer: Buffer): '.jpg' | '.png' | '.webp' | null => {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9
  ) {
    return '.jpg';
  }

  if (buffer.length >= 24 && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return '.png';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP' &&
    buffer.readUInt32LE(4) + 8 <= buffer.length
  ) {
    return '.webp';
  }

  return null;
};

export const detectImageFileExtension = (filePath: string) =>
  detectImageExtension(fs.readFileSync(filePath));
