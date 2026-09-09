import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { dealsApi } from '../../../features/deals/api/deals';
import { pipelinesApi } from '../../api/pipelines';
import { Button } from '../Button/Button';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';
import { lookupPipelineLabel, lookupStageLabel } from '../../utils/pipelineLookup';
import type { Deal, PipelineWithStages } from '../../types/index';
import styles from './SearchSelect.module.css';

type Props = {
  value: Deal | null;
  onChange: (deal: Deal | null) => void;
};

// "Pipeline: X / Stage: Y" for the dropdown option — falls back to the raw
// HubSpot value if it doesn't match any configured pipeline/stage (same
// fallback DealDetailContent.tsx/DealsPage.tsx already use), and disappears
// entirely rather than showing "Pipeline: — / Stage: —" if the deal somehow
// has neither set.
function dealMetaLine(deal: Deal, pipelines: PipelineWithStages[]): string | null {
  const pipelineLabel = lookupPipelineLabel(pipelines, deal.pipeline) ?? deal.pipeline;
  const stageLabel = lookupStageLabel(pipelines, deal.pipeline, deal.dealstage) ?? deal.dealstage;
  if (!pipelineLabel && !stageLabel) return null;
  return `Pipeline: ${pipelineLabel ?? '—'} / Stage: ${stageLabel ?? '—'}`;
}

export function DealSearchSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Deal[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { pos, menuRef, open: openAt, close: resetPos } = useDropdownPosition();

  useEffect(() => {
    pipelinesApi.list('deals').then(setPipelines).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const t = setTimeout(() => {
      dealsApi
        .list(1, 15, query)
        .then((r) => setResults(r.data))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function openMenu() {
    openAt(inputRef.current);
    setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
    resetPos();
  }

  if (value) {
    return (
      <div className={styles['invoice-search-selected']}>
        <span>
          <strong>{value.dealname ?? 'Unnamed deal'}</strong>
        </span>
        <Button variant="secondary" size="sm" type="button" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className={styles['invoice-search']}>
      <input
        ref={inputRef}
        placeholder="Search by deal name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          openMenu();
        }}
        onFocus={openMenu}
        onBlur={() => setTimeout(closeMenu, 150)}
      />
      {isOpen &&
        query &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className={styles['invoice-search-dropdown']}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
          >
            {isLoading ? (
              <div className={styles['invoice-search-empty']}>Searching…</div>
            ) : results.length === 0 ? (
              <div className={styles['invoice-search-empty']}>No deals found</div>
            ) : (
              results.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={styles['invoice-search-option']}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(d);
                    setQuery('');
                    closeMenu();
                  }}
                >
                  <strong>{d.dealname ?? 'Unnamed deal'}</strong>
                  {dealMetaLine(d, pipelines) && (
                    <span className={styles['invoice-search-option-meta']}>{dealMetaLine(d, pipelines)}</span>
                  )}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
