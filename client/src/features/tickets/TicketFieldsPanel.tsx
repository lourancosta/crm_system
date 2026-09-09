import type { ReactNode } from 'react';
import asideStyles from '../../shared/components/RecordDetail/AssociatedRecordsPanel.module.css';
import styles from './TicketFieldsPanel.module.css';

type Field = {
  label: string;
  value: ReactNode;
};

type Props = {
  fields: Field[];
};

export function TicketFieldsPanel({ fields }: Props) {
  return (
    <div className={asideStyles['aside-panel']}>
      <div className={asideStyles['aside-panel-header']} style={{ cursor: 'default' }}>
        <span>Ticket Details</span>
      </div>
      <div className={styles.fields}>
        {fields.map((f) => (
          <div key={f.label} className={styles.field}>
            <span className={styles['field-label']}>{f.label}</span>
            <span className={styles['field-value']}>{f.value ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
