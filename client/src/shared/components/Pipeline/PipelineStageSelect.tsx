import { useEffect, useState } from 'react';
import { pipelinesApi } from '../../api/pipelines';
import { Select } from '../Dropdown/Select';
import type { PipelineWithStages } from '../../types/index';

type Props = {
  objectType: 'deals' | 'tickets';
  pipeline: string;
  onPipelineChange: (value: string) => void;
  stage: string;
  onStageChange: (value: string) => void;
};

// Cascading Pipeline -> Stage pair for create forms — stage options are
// derived from whichever pipeline is currently selected, and reset
// (disabled, "Select a pipeline first") until one is. Doesn't exist
// elsewhere yet: PipelineSelect.tsx only does page-level pipeline
// filtering (no stage), and lookupPipelineLabel/lookupStageLabel
// (pipelineLookup.ts) are read-only label lookups for already-set values,
// not an interactive picker.
export function PipelineStageSelect({ objectType, pipeline, onPipelineChange, stage, onStageChange }: Props) {
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);

  useEffect(() => {
    pipelinesApi.list(objectType).then(setPipelines);
  }, [objectType]);

  const pipelineOptions = pipelines.map((p) => ({ value: p.internalName, label: p.externalName }));
  const selectedPipeline = pipelines.find((p) => p.internalName === pipeline);
  const stageOptions = (selectedPipeline?.stages ?? []).map((s) => ({ value: s.internalName, label: s.externalName }));

  function handlePipelineChange(value: string) {
    onPipelineChange(value);
    onStageChange('');
  }

  return (
    <>
      <div className="form-group">
        <label>Pipeline</label>
        <Select
          value={pipeline}
          onChange={handlePipelineChange}
          options={pipelineOptions}
          ariaLabel="Pipeline"
          triggerLabel={!selectedPipeline ? 'Select a pipeline' : undefined}
        />
      </div>
      <div className="form-group">
        <label>Stage</label>
        <Select
          value={stage}
          onChange={onStageChange}
          options={stageOptions}
          ariaLabel="Stage"
          triggerLabel={!selectedPipeline ? 'Select a pipeline first' : stageOptions.length === 0 ? 'No stages' : undefined}
        />
      </div>
    </>
  );
}
