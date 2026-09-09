import { get, post, put } from '../../../shared/api/client';
import type { UpdateMeInput, User } from '../../../shared/types/index';

type AuthResponse = { user: User; token: string };

async function uploadAvatar(file: File): Promise<User> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/auth/me/avatar', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await response.json().catch(() => ({ message: 'Upload failed' }));
  if (!response.ok) throw new Error(data.message ?? 'Upload failed');
  return data;
}

export const authApi = {
  login: (data: { email: string; password: string }) =>
    post<AuthResponse>('/auth/login', data),
  me: () => get<User>('/auth/me'),
  updateMe: (data: UpdateMeInput) => put<User>('/auth/me', data),
  uploadAvatar,
  forgotPassword: (email: string) => post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    post<{ message: string }>('/auth/reset-password', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    put<{ message: string }>('/auth/me/password', { currentPassword, newPassword }),
};
