import { GripVertical } from 'lucide-react';
import type { Column } from './Table';
import styles from './Table.module.css';

// Pairs with Table's `onReorder` prop — this is the app's one row-reordering
// pattern (invoice line items, pipeline stages, lifecycle stages, KB
// subcategories, etc. all use it) so it lives here instead of being
// reimplemented per feature.
export function dragHandleColumn<T>(keyExtractor: (row: T) => string): Column<T> {
  return {
    key: '__drag',
    header: '',
    render: (row) => (
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', keyExtractor(row));
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={styles['drag-handle']}
      >
        <GripVertical size={16} />
      </span>
    ),
  };
}
