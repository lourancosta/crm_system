import { Router } from 'express';
import { changePassword, forgotPassword, login, me, resetPassword, updateMe } from './auth.controller';
import { getMyAvatar, uploadAvatarMiddleware, uploadMyAvatar } from './auth.avatar';
import { authenticate } from '../../middlewares/auth';

export const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.post('/forgot-password', forgotPassword);
authRoutes.post('/reset-password', resetPassword);
authRoutes.get('/me', authenticate, me);
authRoutes.put('/me', authenticate, updateMe);
authRoutes.put('/me/password', authenticate, changePassword);
authRoutes.get('/me/avatar', authenticate, getMyAvatar);
authRoutes.post('/me/avatar', authenticate, uploadAvatarMiddleware, uploadMyAvatar);
