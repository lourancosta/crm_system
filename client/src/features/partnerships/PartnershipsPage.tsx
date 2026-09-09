import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Kanban, Table2 } from 'lucide-react';
import { partnershipsApi } from './api/partnerships';
import { pipelinesApi } from '../../shared/api/pipelines';
import { TruncatedText } from '../../shared/components/TruncatedText/TruncatedText';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { Table } from '../../shared/components/Table/Table';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { PartnershipForm } from './PartnershipForm';
import { Button } from '../../shared/components/Button/Button';
import { PipelineBoard } from '../../shared/components/Pipeline/PipelineBoard';
import { ALL_PIPELINES_VALUE, PipelineSelect } from '../../shared/components/Pipeline/PipelineSelect';
import { ViewSwitcher } from '../../shared/components/Dropdown/ViewSwitcher';
import type { ViewOption } from '../../shared/components/Dropdown/ViewSwitcher';
import { usePersistedState } from '../../shared/hooks/usePersistedState';
import { usePipelineSelection } from '../../shared/hooks/usePipelineSelection';
import { lookupStageLabel } from '../../shared/utils/pipelineLookup';
import type { Column } from '../../shared/components/Table/Table';
import type { BoardPartnership, Partnership, PipelineWithStages } from '../../shared/types/index';

const VIEW_OPTIONS: ViewOption<'list' | 'board'>[] = [
  { value: 'list', label: 'Table', icon: Table2 },
  { value: 'board', label: 'Board', icon: Kanban },
];

const PAGE_SIZE = 50;

function formatDate(val: string | null) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PartnershipsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = usePersistedState<'list' | 'board'>('pref:partnerships:view', 'list');
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [boardPartnerships, setBoardPartnerships] = useState<BoardPartnership[]>([]);
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [pipelineId, setPipelineId] = usePipelineSelection(pipelines, 'partnerships');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const isAllPipelines = pipelineId === ALL_PIPELINES_VALUE;
  const pipelineFilter = isAllPipelines ? '' : pipelines.find((p) => p.id === pipelineId)?.internalName ?? '';
  // The board always shows exactly one pipeline's stages — fall back to the
  // first configured pipeline while "All Pipelines" is selected, without
  // overwriting the persisted preference (so switching back to table view
  // keeps "All Pipelines" selected).
  const boardPipelineId = isAllPipelines ? pipelines[0]?.id ?? '' : pipelineId;

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    pipelinesApi.list('partnerships').then(setPipelines);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [pipelineId]);

  useEffect(() => {
    if (view !== 'list') return;
    setIsLoading(true);
    partnershipsApi
      .list(page, PAGE_SIZE, debouncedSearch, pipelineFilter)
      .then((r) => { setPartnerships(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [view, page, debouncedSearch, pipelineFilter]);

  useEffect(() => {
    if (view !== 'board') return;
    setIsLoading(true);
    partnershipsApi
      .board(debouncedSearch)
      .then(setBoardPartnerships)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [view, debouncedSearch]);

  function handleCreated(id: string) {
    setShowForm(false);
    navigate(`/partnerships/${id}`, { state: { backgroundLocation: location } });
  }

  async function handleStageChange(item: BoardPartnership, stage: string) {
    const previousStage = item.hsPipelineStage;
    setBoardPartnerships((prev) => prev.map((p) => (p.id === item.id ? { ...p, hsPipelineStage: stage } : p)));
    try {
      await partnershipsApi.updateStage(item.id, stage);
    } catch (err) {
      setBoardPartnerships((prev) => prev.map((p) => (p.id === item.id ? { ...p, hsPipelineStage: previousStage } : p)));
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  }

  const columns: Column<Partnership>[] = [
    { key: 'name', header: 'Name', render: (p) => <RecordLink to={`/partnerships/${p.id}`} className="link"><TruncatedText text={p.name} /></RecordLink> },
    { key: 'typeObj', header: 'Type', render: (p) => p.typeObj ?? '—' },
    { key: 'mspLevel', header: 'MSP level', render: (p) => p.mspLevel ?? '—' },
    { key: 'stage', header: 'Stage', render: (p) => lookupStageLabel(pipelines, p.hsPipeline, p.hsPipelineStage) ?? p.hsPipelineStage ?? '—' },
    { key: 'distributor', header: 'Distributor', render: (p) => p.distributor ?? '—' },
    { key: 'contractSignatureDate', header: 'Contract signed', render: (p) => formatDate(p.contractSignatureDate) },
    { key: 'closeDate', header: 'Close date', render: (p) => formatDate(p.closeDate) },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Partnerships" />
        <Button variant="accent" onClick={() => setShowForm(true)}>+ Add partnership</Button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <PipelineSelect
          pipelines={pipelines}
          value={view === 'board' ? boardPipelineId : pipelineId}
          onChange={setPipelineId}
          allowAll={view === 'list'}
        />
        <ViewSwitcher value={view} options={VIEW_OPTIONS} onChange={setView} />
      </div>

      {view === 'list' ? (
        <Table
          columns={columns}
          data={partnerships}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyMessage="No partnerships found."
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        />
      ) : isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <PipelineBoard
          pipelines={pipelines}
          pipelineId={boardPipelineId}
          items={boardPartnerships}
          keyExtractor={(p) => p.id}
          getPipelineValue={(p) => p.hsPipeline}
          getStageValue={(p) => p.hsPipelineStage}
          linkTo={(p) => `/partnerships/${p.id}`}
          onStageChange={handleStageChange}
          emptyMessage="No pipeline configured for partnerships yet. Set one up in Settings > Partnerships."
          renderTitle={(p) => p.name ?? '—'}
          renderMeta={(p) => (
            <>
              {p.mspLevel && <div>{p.mspLevel}</div>}
              {p.closeDate && <div>Close {formatDate(p.closeDate)}</div>}
            </>
          )}
        />
      )}

      {showForm && <PartnershipForm onCreated={handleCreated} onClose={() => setShowForm(false)} />}
    </div>
  );
}
