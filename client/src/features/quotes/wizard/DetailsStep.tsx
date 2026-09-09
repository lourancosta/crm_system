import { useEffect, useState } from 'react';
import { SettingsCard, SettingsCardBody } from '../../../shared/components/SettingsCard/SettingsCard';
import { RichTextEditor } from '../../../shared/components/RichTextEditor/RichTextEditor';
import { snippetsApi } from '../../settings/snippets/api/snippets';
import styles from './DetailsStep.module.css';
import type { Snippet } from '../../../shared/types/index';

export type QuoteDetails = {
  name: string;
  expirationDate: string;
  commentsToBuyer: string;
  purchaseTerms: string;
};

type Props = {
  details: QuoteDetails;
  onChange: (patch: Partial<QuoteDetails>) => void;
};

export function DetailsStep({ details, onChange }: Props) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);

  useEffect(() => {
    snippetsApi.list().then(setSnippets).catch(() => {});
  }, []);

  return (
    <div className={styles['details-wrapper']}>
      <h2 style={{ marginBottom: 16 }}>Details</h2>
      <SettingsCard title="Quote details" titleBackground="input" shadow className={styles['details-card']}>
        <SettingsCardBody className={styles['details-body']}>
          <div className="form-group">
            <label>Quote name</label>
            <input
              type="text"
              value={details.name}
              onChange={(e) => onChange({ name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Expiration date</label>
            <input
              type="date"
              value={details.expirationDate}
              onChange={(e) => onChange({ expirationDate: e.target.value })}
            />
          </div>
          <div className={`form-group ${styles['details-textarea-group']}`}>
            <label>Comments to buyer</label>
            <RichTextEditor
              fillHeight
              value={details.commentsToBuyer}
              onChange={(html) => onChange({ commentsToBuyer: html })}
              placeholder="Optional message shown to the buyer on the quote"
              snippets={snippets}
            />
          </div>
          <div className={`form-group ${styles['details-textarea-group']}`}>
            <label>Purchase terms</label>
            <RichTextEditor
              fillHeight
              value={details.purchaseTerms}
              onChange={(html) => onChange({ purchaseTerms: html })}
              placeholder="Terms and conditions for this purchase"
              snippets={snippets}
            />
          </div>
        </SettingsCardBody>
      </SettingsCard>
    </div>
  );
}
