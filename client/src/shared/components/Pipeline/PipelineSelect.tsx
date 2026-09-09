import { Select } from '../Dropdown/Select';
import type { PipelineWithStages } from '../../types/index';

export const ALL_PIPELINES_VALUE = 'all';

type PipelineSelectProps = {
  pipelines: PipelineWithStages[];
  value: string;
  onChange: (pipelineId: string) => void;
  // "All Pipelines" only makes sense in table view — the board always
  // renders exactly one pipeline's stages as columns.
  allowAll?: boolean;
};

export function PipelineSelect({ pipelines, value, onChange, allowAll = false }: PipelineSelectProps) {
  if (pipelines.length <= 1) return null;

  const options = [
    { value: ALL_PIPELINES_VALUE, label: 'All Pipelines', disabled: !allowAll },
    ...pipelines.map((p) => ({ value: p.id, label: p.externalName })),
  ];

  return <Select value={value} onChange={onChange} ariaLabel="Pipeline" options={options} />;
}
