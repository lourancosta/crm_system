import { useEffect, useState } from 'react';
import { dashboardApi } from './api/dashboard';
import type { DashboardStats } from '../../shared/types/index';
import styles from './DashboardPage.module.css';

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className={styles['stat-card']}>
      <div className={styles['stat-card-label']}>{label}</div>
      <div className={styles['stat-card-value']} style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className={styles['stat-card-sub']}>{sub}</div>}
    </div>
  );
}

function formatCurrency(val: string | number | undefined) {
  if (val === undefined || val === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(val),
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="page"><div className="loading">Loading...</div></div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!stats) return null;

  return (
    <div className={styles['dashboard-page']}>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className={styles['stat-section']}>
        <h2 className={styles['stat-section-title']}>Today</h2>
        <div className={styles['stat-grid']}>
          <StatCard
            label="New contacts"
            value={stats.new_contacts_today}
            sub={`${stats.total_contacts.toLocaleString()} total`}
          />
          <StatCard
            label="New companies"
            value={stats.new_companies_today}
            sub={`${stats.total_companies.toLocaleString()} total`}
          />
          <StatCard
            label="New deals"
            value={stats.new_deals_today}
            sub={`${stats.total_deals.toLocaleString()} total`}
          />
          <StatCard
            label="Overdue invoices"
            value={formatCurrency(stats.overdue_invoice_amount)}
            sub={`${stats.open_invoices} open invoices`}
            color="#dc2626"
          />
        </div>
      </div>
    </div>
  );
}
