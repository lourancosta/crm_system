import { randomUUID } from 'crypto';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { getPrivateFile, uploadFile } from '../../lib/storage';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
export const uploadMiddleware = upload.single('file');

// Stable, permanent path stored in article/category content for private
// media - resolved to a real signed byte stream by getKbMedia below. Must
// stay in sync with where getKbMedia is mounted in kb.routes.ts.
const PRIVATE_MEDIA_ROUTE_PREFIX = '/api/knowledge-base/browse/media/';

export async function uploadKbMedia(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      const error = new Error('No file provided') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const ext = path.extname(req.file.originalname);
    const key = `knowledge-base/${randomUUID()}${ext}`;

    // Only 'public'-tier content is servable to anonymous visitors, so that's
    // the one tier that goes in the public bucket - customer/partner/internal
    // all require a logged-in account (see kbTierForAccountType), so their
    // media goes in the private bucket instead.
    let url: string;
    if (req.body.visibility === 'public') {
      url = (await uploadFile('public', key, req.file.buffer, req.file.mimetype))!;
    } else {
      await uploadFile('private', key, req.file.buffer, req.file.mimetype);
      url = `${PRIVATE_MEDIA_ROUTE_PREFIX}${key}`;
    }

    res.status(201).json({ url });
  } catch (error) {
    next(error);
  }
}

export async function getKbMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const key = req.params[0];
    if (!key?.startsWith('knowledge-base/')) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const file = await getPrivateFile(key);
    const [metadata] = await file.getMetadata();
    res.setHeader('Content-Type', metadata.contentType ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    file.createReadStream().on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
}
