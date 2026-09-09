import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { Modal } from '../Modal/Modal';

type Props = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

// Replaces window.confirm() for destructive actions (delete, disconnect,
// etc.) with an in-app dialog styled to match the rest of the app instead of
// the browser's native popup.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setError('');
    setIsSubmitting(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel} variant="danger">
      <div className="form">
        {error && <div className="alert alert-error">{error}</div>}
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{message}</p>
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" type="button" onClick={handleConfirm} isLoading={isSubmitting}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
