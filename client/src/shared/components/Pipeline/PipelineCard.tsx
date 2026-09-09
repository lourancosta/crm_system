import type { DragEvent, ReactNode } from 'react';
import { RecordLink } from '../RecordLink/RecordLink';
import styles from './PipelineCard.module.css';

type PipelineCardProps = {
  to: string;
  title: ReactNode;
  children?: ReactNode;
  draggable?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void;
};

export function PipelineCard({ to, title, children, draggable, onDragStart, onDragEnd }: PipelineCardProps) {
  return (
    <div className={styles['board-card']} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <RecordLink to={to} className={`link ${styles['board-card-title']}`}>{title}</RecordLink>
      {children && <div className={styles['board-card-meta']}>{children}</div>}
    </div>
  );
}
