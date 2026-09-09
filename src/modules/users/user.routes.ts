import { Router } from 'express';
import { createUser, deleteUser, getUser, listInternalUsers, listUsers, resendInvite, updateUser } from './user.controller';
import { getUserAvatar } from './user.avatar';
import { requireModule } from '../../middlewares/authorize';

export const userRoutes = Router();

userRoutes.get('/', requireModule('users', 'view'), listUsers);
userRoutes.post('/', requireModule('users', 'create'), createUser);
// Must come before the /:id catch-all below.
userRoutes.get('/internal', requireModule('users', 'view'), listInternalUsers);
userRoutes.get('/:id/avatar', getUserAvatar);
userRoutes.post('/:id/resend-invite', requireModule('users', 'edit'), resendInvite);
userRoutes.get('/:id', requireModule('users', 'view'), getUser);
userRoutes.put('/:id', requireModule('users', 'edit'), updateUser);
userRoutes.delete('/:id', requireModule('users', 'delete'), deleteUser);
