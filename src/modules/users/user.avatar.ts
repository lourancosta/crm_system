import type { NextFunction, Request, Response } from 'express';
import { getPrivateFile } from '../../lib/storage';
import * as userRepository from './user.repository';
import { userIdParamsSchema } from './user.schema';

// Mirrors auth.avatar.ts's getMyAvatar, but for an arbitrary user id instead
// of always req.user — needed anywhere a teammate's photo is shown to someone
// else (e.g. a quote's sender, viewed by whoever opens that quote's preview).
// Any authenticated caller can view any user's photo (gated by `authenticate`
// alone at the /api/users mount, no extra module permission) — a profile
// photo carries the same low sensitivity as the names/emails already visible
// across list pages with no special grant.
export async function getUserAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = userIdParamsSchema.parse(req.params);
    const record = await userRepository.findAvatarKey(id);
    if (!record?.avatarKey) {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const file = await getPrivateFile(record.avatarKey);
    const [metadata] = await file.getMetadata();
    res.setHeader('Content-Type', metadata.contentType ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    file.createReadStream().on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
}
