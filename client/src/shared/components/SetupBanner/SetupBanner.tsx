import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../Modal/Modal';
import styles from './SetupBanner.module.css';

type Props = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  learnMoreTitle: string;
  learnMoreContent: ReactNode;
};

// Warning banner for "this optional feature isn't configured yet" states —
// composes the shared alert-warning look with a link straight to where it's
// configured and a "Learn more" link that opens an explainer Modal. See the
// per-feature wrappers in this same folder (InvoiceRemindersBanner etc.) for
// the actual usages — this is just the reusable shell.
export function SetupBanner({ title, description, ctaLabel, ctaHref, learnMoreTitle, learnMoreContent }: Props) {
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);

  return (
    <>
      <div className={`alert alert-warning ${styles.banner}`}>
        <AlertTriangle size={18} className={styles.icon} />
        <div className={styles.body}>
          <div className={styles.title}>{title}</div>
          <div className={styles.description}>{description}</div>
        </div>
        <div className={styles.actions}>
          <Link to={ctaHref} className="link">
            {ctaLabel}
          </Link>
          <button type="button" className={`link ${styles['learn-more-btn']}`} onClick={() => setIsLearnMoreOpen(true)}>
            Learn more
          </button>
        </div>
      </div>

      {isLearnMoreOpen && (
        <Modal title={learnMoreTitle} onClose={() => setIsLearnMoreOpen(false)}>
          {learnMoreContent}
        </Modal>
      )}
    </>
  );
}
