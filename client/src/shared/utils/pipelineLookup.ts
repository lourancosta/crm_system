import type { PipelineWithStages } from '../types/index';

export function lookupStageLabel(
  pipelines: PipelineWithStages[],
  pipelineValue: string | null,
  stageValue: string | null,
): string | null {
  if (!stageValue) return null;
  for (const p of pipelines) {
    if (pipelineValue && p.internalName !== pipelineValue) continue;
    const stage = p.stages.find((s) => s.internalName === stageValue);
    if (stage) return stage.externalName;
  }
  return null;
}

export function lookupPipelineLabel(pipelines: PipelineWithStages[], pipelineValue: string | null): string | null {
  if (!pipelineValue) return null;
  return pipelines.find((p) => p.internalName === pipelineValue)?.externalName ?? null;
}
