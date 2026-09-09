import type { AccountType, User } from '../../../../shared/types/index';
import { del, get, post, put } from '../../../../shared/api/client';

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  accountType: AccountType;
  role?: string;
  companyId?: string;
  permissionSetId?: string;
  jobTitle?: string;
  phone?: string;
};

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  accountType?: AccountType;
  role?: string;
  password?: string;
  companyId?: string | null;
  hubspotOwnerId?: string | null;
  permissionSetId?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
};

export const usersApi = {
  listInternal: () => get<{ id: string; firstName: string; lastName: string; email: string }[]>('/users/internal'),
  list: (page = 1, limit = 50, search = '') =>
    get<{ data: User[]; total: number; page: number; limit: number }>(
      `/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
    ),

  getById: (id: string) => get<User>(`/users/${id}`),

  create: (data: CreateUserInput) => post<User & { inviteSent: boolean }>('/users', data),

  update: (id: string, data: UpdateUserInput) => put<User>(`/users/${id}`, data),

  delete: (id: string) => del(`/users/${id}`),

  resendInvite: (id: string) => post<{ inviteSent: boolean }>(`/users/${id}/resend-invite`, {}),
};
