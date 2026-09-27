import { AppError } from '../api/http';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export interface ValidatedImage {mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string}

export function validateImageDataUrl(value: string): ValidatedImage {
  if (value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 40) throw new AppError('IMAGE_TOO_LARGE', 'That photo is too large. Try a smaller image.', 413);
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new AppError('INVALID_IMAGE', 'Choose a JPEG, PNG, or WebP photo.');
  const data = match[2];
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) throw new AppError('IMAGE_TOO_LARGE', 'That photo is too large. Try a smaller image.', 413);
  if (bytes.length < 12 || bytes.toString('base64') !== data) throw new AppError('INVALID_IMAGE', 'That image could not be read. Try another photo.');
  const mimeType = match[1] as ValidatedImage['mimeType'];
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!(mimeType === 'image/jpeg' ? jpeg : mimeType === 'image/png' ? png : webp)) throw new AppError('INVALID_IMAGE', 'That file is not a readable photo. Try a JPEG, PNG, or WebP image.');
  return {mimeType, data};
}
