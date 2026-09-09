import { GraduationCap } from 'lucide-react';
import styles from './CoursePage.module.css';

// Placeholder for a not-yet-built feature — mirrors the Sidebar's "Soon"
// badge on this same nav item (see shared/constants/navGroups.ts).
export function CoursePage() {
  return (
    <div>
      <div className="page-header">
        <div className={styles['title-row']}>
          <h1>Course</h1>
          <span className={styles['soon-badge']}>Soon</span>
        </div>
      </div>

      <div className={styles['soon-panel']}>
        <GraduationCap size={72} className={styles['soon-icon']} strokeWidth={1.25} />
        <p className={styles['soon-description']}>
          Soon, the CRM will have a course feature — training content and materials to help onboard and support
          customers.
        </p>
      </div>
    </div>
  );
}
