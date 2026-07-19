import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { StorageEngine } from 'multer';
import { diskStorage } from 'multer';

/** Root directory for all locally-stored uploads. Dev-only — swap for S3/R2 before production. */
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

function ensureDir(dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Multer disk storage that writes into `uploads/<subdir>/<uuid><ext>`, discarding the original filename. */
export function localDiskStorage(subdir: string): StorageEngine {
  const dir = join(UPLOADS_ROOT, subdir);
  return diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  });
}

/** Rejects path-traversal / non-plain filenames before they touch the filesystem. */
export function isSafeStoredFilename(filename: string): boolean {
  return /^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(filename);
}
