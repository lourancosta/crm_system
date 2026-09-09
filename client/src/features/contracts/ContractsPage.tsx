import { FileSignature } from 'lucide-react';
import styles from './ContractsPage.module.css';

// Placeholder for a not-yet-built feature — mirrors the Sidebar's "Soon"
// badge on this same nav item (see shared/constants/navGroups.ts).
export function ContractsPage() {
  return (
    <div>
      <div className="page-header">
        <div className={styles['title-row']}>
          <h1>Contracts</h1>
          <span className={styles['soon-badge']}>Soon</span>
        </div>
      </div>

      <div className={styles['soon-panel']}>
        <FileSignature size={72} className={styles['soon-icon']} strokeWidth={1.25} />
        <p className={styles['soon-description']}>
          Soon, the CRM will have a contract feature — contract creation, changes, and renewals. Contract records are
          automatically created when a quote is accepted, so there's no manual work required.
        </p>
      </div>
    </div>
  );
}
