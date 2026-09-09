import { useEffect } from 'react';
import type { PipelineWithStages } from '../types/index';
import { ALL_PIPELINES_VALUE } from '../components/Pipeline/PipelineSelect';
import { usePersistedState } from './usePersistedState';

export function usePipelineSelection(pipelines: PipelineWithStages[], storageKey: string) {
  const [pipelineId, setPipelineId] = usePersistedState(`pref:${storageKey}:pipelineId`, pipelines[0]?.id ?? '');

  useEffect(() => {
    // The "All Pipelines" sentinel never matches a real pipeline id — leave
    // it alone instead of treating it as stale.
    if (pipelineId === ALL_PIPELINES_VALUE) return;
    if (pipelines.length > 0 && !pipelines.some((p) => p.id === pipelineId)) {
      setPipelineId(pipelines[0].id);
    }
  }, [pipelines, pipelineId]);

  return [pipelineId, setPipelineId] as const;
}
