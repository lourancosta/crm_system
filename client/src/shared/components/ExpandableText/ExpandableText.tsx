import { useState } from 'react';
import styles from './ExpandableText.module.css';

type Props = {
  text: string;
  limit?: number;
};

function truncateAtWordBoundary(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

export function ExpandableText({ text, limit = 300 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = text.length > limit;
  const display = expanded || !isTruncated ? text : truncateAtWordBoundary(text, limit);

  return (
    <div>
      <div className={`${styles.text}${!expanded && isTruncated ? ` ${styles.fade}` : ''}`}>{display}</div>
      {isTruncated && (
        <button type="button" className={styles.toggle} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
}
