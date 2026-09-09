import { get } from '../../../shared/api/client';
import type { DashboardStats } from '../../../shared/types/index';

export const dashboardApi = {
  getStats: () => get<DashboardStats>('/dashboard'),
};
