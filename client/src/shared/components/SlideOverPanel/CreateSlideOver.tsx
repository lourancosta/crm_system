import type { FormEvent, ReactNode } from 'react';
import { SlideOverPanel } from './SlideOverPanel';
import { Button } from '../Button/Button';
import styles from './CreateSlideOver.module.css';

type Props = {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  error?: string;
  children: ReactNode;
};

// Same wide-panel chrome as the record-detail SlideOverPanel, but for
// creating a new record instead of viewing one: a "Create {title}" header,
// a scrollable body for the (vertically-stacked, never side-by-side) form
// fields, and a footer with Cancel/Create pinned in place — the fields
// scroll independently so the footer stays reachable on long forms.
// SlideOverPanel already renders its own close (X) button, so this doesn't
// duplicate one.
export function CreateSlideOver({ title, onClose, onSubmit, isSubmitting = false, error, children }: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <SlideOverPanel onClose={onClose} width="min(90vw, 560px)" background="#ffffff">
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Create {title}</h1>

        <div className={styles.fields}>
          {error && <div className="alert alert-error">{error}</div>}
          {children}
        </div>

        <div className={styles.footer}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" isLoading={isSubmitting}>
            Create
          </Button>
        </div>
      </form>
    </SlideOverPanel>
  );
}
