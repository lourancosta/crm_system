import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Kanban, Table2 } from 'lucide-react';
import { dealsApi } from './api/deals';
import { pipelinesApi } from '../../shared/api/pipelines';
import { TruncatedText } from '../../shared/components/TruncatedText/TruncatedText';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { Table } from '../../shared/components/Table/Table';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { DealForm } from './DealForm';
import { Button } from '../../shared/components/Button/Button';
import { PipelineBoard } from '../../shared/components/Pipeline/PipelineBoard';
import { ALL_PIPELINES_VALUE, PipelineSelect } from '../../shared/components/Pipeline/PipelineSelect';
import { ViewSwitcher } from '../../shared/components/Dropdown/ViewSwitcher';
import type { ViewOption } from '../../shared/components/Dropdown/ViewSwitcher';
import { usePersistedState } from '../../shared/hooks/usePersistedState';
import { usePipelineSelection } from '../../shared/hooks/usePipelineSelection';
import { lookupStageLabel } from '../../shared/utils/pipelineLookup';
import type { Column } from '../../shared/components/Table/Table';
import type { BoardDeal, Deal, PipelineWithStages } from '../../shared/types/index';

const PAGE_SIZE = 50;

const VIEW_OPTIONS: ViewOption<'list' | 'board'>[] = [
  { value: 'list', label: 'Table', icon: Table2 },
  { value: 'board', label: 'Board', icon: Kanban },
];

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(val: string | null) {
  if (!val) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
}

function formatModules(raw: string | null) {
  if (!raw) return '—';
  return raw.split(';').map((m) => m.trim()).filter(Boolean).join(', ');
}

export function DealsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = usePersistedState<'list' | 'board'>('pref:deals:view', 'list');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [boardDeals, setBoardDeals] = useState<BoardDeal[]>([]);
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [pipelineId, setPipelineId] = usePipelineSelection(pipelines, 'deals');
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
    pipelinesApi.list('deals').then(setPipelines);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [pipelineId]);

  useEffect(() => {
    if (view !== 'list') return;
    setIsLoading(true);
    dealsApi
      .list(page, PAGE_SIZE, debouncedSearch, pipelineFilter)
      .then((r) => { setDeals(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [view, page, debouncedSearch, pipelineFilter]);

  useEffect(() => {
    if (view !== 'board') return;
    setIsLoading(true);
    dealsApi
      .board(debouncedSearch)
      .then(setBoardDeals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [view, debouncedSearch]);

  function handleCreated(id: string) {
    setShowForm(false);
    navigate(`/deals/${id}`, { state: { backgroundLocation: location } });
  }

  async function handleStageChange(item: BoardDeal, stage: string) {
    const previousStage = item.dealstage;
    setBoardDeals((prev) => prev.map((d) => (d.id === item.id ? { ...d, dealstage: stage } : d)));
    try {
      await dealsApi.updateStage(item.id, stage);
    } catch (err) {
      setBoardDeals((prev) => prev.map((d) => (d.id === item.id ? { ...d, dealstage: previousStage } : d)));
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  }

  const columns: Column<Deal>[] = [
    { key: 'dealname', header: 'Deal name', render: (d) => <RecordLink to={`/deals/${d.id}`} className="link"><TruncatedText text={d.dealname} /></RecordLink> },
    { key: 'closedate', header: 'Close date', render: (d) => formatDate(d.closedate) },
    { key: 'dealstage', header: 'Stage', render: (d) => lookupStageLabel(pipelines, d.pipeline, d.dealstage) ?? d.dealstage ?? '—' },
    { key: 'amount', header: 'Amount', render: (d) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(d.amount)}</span> },
    { key: 'modules', header: 'Modules', render: (d) => formatModules(d.certificationModules) },
    { key: 'owner', header: 'Owner', render: (d) => d.controllerDealOwnerName ?? '—' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Deals" />
        <Button variant="accent" onClick={() => setShowForm(true)}>+ Add deal</Button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by deal name…"
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
          data={deals}
          keyExtractor={(d) => d.id}
          isLoading={isLoading}
          emptyMessage="No deals found."
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        />
      ) : isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <PipelineBoard
          pipelines={pipelines}
          pipelineId={boardPipelineId}
          items={boardDeals}
          keyExtractor={(d) => d.id}
          getPipelineValue={(d) => d.pipeline}
          getStageValue={(d) => d.dealstage}
          linkTo={(d) => `/deals/${d.id}`}
          onStageChange={handleStageChange}
          emptyMessage="No pipeline configured for deals yet. Set one up in Settings > Deals."
          renderTitle={(d) => d.dealname ?? '—'}
          renderStageSummary={(stageDeals) =>
            formatCurrency(String(stageDeals.reduce((sum, d) => sum + Number(d.amount ?? 0), 0)))
          }
          renderMeta={(d) => (
            <>
              <div>{formatCurrency(d.amount)}</div>
              {d.closedate && <div>Close {formatDate(d.closedate)}</div>}
            </>
          )}
        />
      )}

      {showForm && <DealForm onCreated={handleCreated} onClose={() => setShowForm(false)} />}
    </div>
  );
}
