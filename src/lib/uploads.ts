import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const UPLOADS_DIR = path.resolve(PUBLIC_DIR, 'uploads');
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export class UploadValidationError extends Error {}

function getSafeExtension(file: File) {
  if (MIME_EXTENSION[file.type]) {
    return MIME_EXTENSION[file.type];
  }

  const rawExtension = path.extname(file.name).replace('.', '').toLowerCase();
  const sanitizedExtension = rawExtension.replace(/[^a-z0-9]/g, '');
  return sanitizedExtension || 'jpg';
}

export async function saveUploadedImage(file: File, section: 'employees' | 'tools') {
  if (!file.type.startsWith('image/')) {
    throw new UploadValidationError('Envie apenas arquivos de imagem.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new UploadValidationError('A imagem deve ter no máximo 5MB.');
  }

  const extension = getSafeExtension(file);
  const directory = path.resolve(UPLOADS_DIR, section);
  const filename = `${section}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const absolutePath = path.resolve(directory, filename);

  fs.mkdirSync(directory, { recursive: true });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(absolutePath, fileBuffer);

  return `/uploads/${section}/${filename}`;
}

export function removeStoredImage(photoUrl?: string | null) {
  if (!photoUrl || !photoUrl.startsWith('/uploads/')) {
    return;
  }

  const absolutePath = path.resolve(PUBLIC_DIR, photoUrl.replace(/^\/+/, ''));
  const uploadsPrefix = `${UPLOADS_DIR}${path.sep}`;

  if (!absolutePath.startsWith(uploadsPrefix)) {
    return;
  }

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}
