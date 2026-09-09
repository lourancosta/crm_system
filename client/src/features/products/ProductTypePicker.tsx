import { Boxes, Package } from 'lucide-react';
import { Modal } from '../../shared/components/Modal/Modal';
import styles from './ProductTypePicker.module.css';

type Props = {
  onSelectSingle: () => void;
  onClose: () => void;
};

// Bundles aren't buildable yet (see product.repository.ts's
// productTypeCondition — the filter groundwork exists, but there's no
// creation flow), so that option is shown but inert until it's built.
export function ProductTypePicker({ onSelectSingle, onClose }: Props) {
  return (
    <Modal title="New Product" onClose={onClose}>
      <div className={styles.grid}>
        <button type="button" className={styles.card} onClick={onSelectSingle}>
          <Package size={28} className={styles.cardIcon} />
          <span className={styles.cardTitle}>Single Product</span>
          <span className={styles.cardDescription}>A standalone product with its own price.</span>
        </button>
        <button type="button" className={`${styles.card} ${styles['card--disabled']}`} disabled>
          <Boxes size={28} className={styles.cardIcon} />
          <span className={styles.cardTitle}>
            Bundle
            <span className={styles['soon-badge']}>Soon</span>
          </span>
          <span className={styles.cardDescription}>Group multiple products into one sellable package.</span>
        </button>
      </div>
    </Modal>
  );
}
