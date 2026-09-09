import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { getPrivateFile, uploadFile } from '../../lib/storage';
import * as authRepository from './auth.repository';
import * as authService from './auth.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const uploadAvatarMiddleware = upload.single('file');

// Always the same key per user (no random suffix) — a re-upload just
// overwrites the previous photo in place, so there's never an orphaned file
// to clean up in the private bucket's "users/" folder.
function avatarKeyFor(userId: string): string {
  return `users/${userId}`;
}

export async function uploadMyAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      const error = new Error('No file provided') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }
    if (!req.file.mimetype.startsWith('image/')) {
      const error = new Error('File must be an image') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const key = avatarKeyFor(req.user!.userId);
    await uploadFile('private', key, req.file.buffer, req.file.mimetype);
    await authRepository.updateAvatarKey(req.user!.userId, key);

    const user = await authService.getMe(req.user!.userId);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function getMyAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const me = await authRepository.findById(req.user!.userId);
    if (!me?.avatarKey) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const file = await getPrivateFile(me.avatarKey);
    const [metadata] = await file.getMetadata();
    res.setHeader('Content-Type', metadata.contentType ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    file.createReadStream().on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
}
