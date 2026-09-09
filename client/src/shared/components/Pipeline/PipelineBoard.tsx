import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PipelineCard } from './PipelineCard';
import type { PipelineWithStages } from '../../types/index';
import styles from './PipelineBoard.module.css';

type PipelineBoardProps<T> = {
  pipelines: PipelineWithStages[];
  pipelineId: string;
  items: T[];
  keyExtractor: (item: T) => string;
  getPipelineValue: (item: T) => string | null;
  getStageValue: (item: T) => string | null;
  renderTitle: (item: T) => ReactNode;
  renderMeta?: (item: T) => ReactNode;
  renderStageSummary?: (stageItems: T[]) => ReactNode;
  linkTo: (item: T) => string;
  onStageChange?: (item: T, stage: string) => void;
  emptyMessage?: string;
};

export function PipelineBoard<T>({
  pipelines,
  pipelineId,
  items,
  keyExtractor,
  getPipelineValue,
  getStageValue,
  renderTitle,
  renderMeta,
  renderStageSummary,
  linkTo,
  onStageChange,
  emptyMessage,
}: PipelineBoardProps<T>) {
  const draggedItemRef = useRef<T | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  if (pipelines.length === 0) {
    return <div className="empty">{emptyMessage ?? 'No pipeline configured yet. Set one up in Settings.'}</div>;
  }

  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
  const itemsInPipeline = items.filter((item) => getPipelineValue(item) === pipeline.internalName);

  return (
    <div className={styles['board-view']}>
      {pipeline.stages.length === 0 ? (
        <div className="empty">No stages configured for this pipeline yet.</div>
      ) : (
        <div className={styles['board-columns']}>
          {pipeline.stages.map((stage) => {
            const stageItems = itemsInPipeline.filter((item) => getStageValue(item) === stage.internalName);
            return (
              <div
                className={`${styles['board-column']}${dragOverStageId === stage.id ? ` ${styles['board-column--drag-over']}` : ''}`}
                key={stage.id}
                onDragOver={(e) => {
                  if (!onStageChange) return;
                  e.preventDefault();
                  setDragOverStageId(stage.id);
                }}
                onDragLeave={() => setDragOverStageId((id) => (id === stage.id ? null : id))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStageId(null);
                  const item = draggedItemRef.current;
                  draggedItemRef.current = null;
                  if (item && onStageChange && getStageValue(item) !== stage.internalName) {
                    onStageChange(item, stage.internalName);
                  }
                }}
              >
                <div className={styles['board-column-header']}>
                  <span>{stage.externalName}</span>
                  <span className={styles['board-column-count']}>{stageItems.length}</span>
                </div>
                <div className={styles['board-column-body']}>
                  {stageItems.length === 0 ? (
                    <div className={styles['board-column-empty']}>No records</div>
                  ) : (
                    stageItems.map((item) => (
                      <PipelineCard
                        key={keyExtractor(item)}
                        to={linkTo(item)}
                        title={renderTitle(item)}
                        draggable={!!onStageChange}
                        onDragStart={(e) => {
                          draggedItemRef.current = item;
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          draggedItemRef.current = null;
                          setDragOverStageId(null);
                        }}
                      >
                        {renderMeta?.(item)}
                      </PipelineCard>
                    ))
                  )}
                </div>
                {renderStageSummary && (
                  <div className={styles['board-column-footer']}>
                    <span className={styles['board-column-footer-amount']}>{renderStageSummary(stageItems)}</span>
                    <span className={styles['board-column-footer-label']}>| Total amount</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
