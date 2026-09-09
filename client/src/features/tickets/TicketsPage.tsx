import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Kanban, Table2 } from 'lucide-react';
import { ticketsApi } from './api/tickets';
import { pipelinesApi } from '../../shared/api/pipelines';
import { TruncatedText } from '../../shared/components/TruncatedText/TruncatedText';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { Table } from '../../shared/components/Table/Table';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { TicketForm } from './TicketForm';
import { TicketInboxBanner } from '../../shared/components/SetupBanner/TicketInboxBanner';
import { Button } from '../../shared/components/Button/Button';
import { PipelineBoard } from '../../shared/components/Pipeline/PipelineBoard';
import { ALL_PIPELINES_VALUE, PipelineSelect } from '../../shared/components/Pipeline/PipelineSelect';
import { ViewSwitcher } from '../../shared/components/Dropdown/ViewSwitcher';
import type { ViewOption } from '../../shared/components/Dropdown/ViewSwitcher';
import { usePersistedState } from '../../shared/hooks/usePersistedState';
import { usePipelineSelection } from '../../shared/hooks/usePipelineSelection';
import { lookupStageLabel } from '../../shared/utils/pipelineLookup';
import type { Column } from '../../shared/components/Table/Table';
import type { BoardTicket, PipelineWithStages, Ticket } from '../../shared/types/index';

const PAGE_SIZE = 50;

const VIEW_OPTIONS: ViewOption<'list' | 'board'>[] = [
  { value: 'list', label: 'Table', icon: Table2 },
  { value: 'board', label: 'Board', icon: Kanban },
];

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function TicketsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = usePersistedState<'list' | 'board'>('pref:tickets:view', 'list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [boardTickets, setBoardTickets] = useState<BoardTicket[]>([]);
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [pipelineId, setPipelineId] = usePipelineSelection(pipelines, 'tickets');
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
    pipelinesApi.list('tickets').then(setPipelines);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [pipelineId]);

  useEffect(() => {
    if (view !== 'list') return;
    setIsLoading(true);
    ticketsApi
      .list(page, PAGE_SIZE, debouncedSearch, pipelineFilter)
      .then((r) => { setTickets(r.data); setTotal(r.total); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [view, page, debouncedSearch, pipelineFilter]);

  useEffect(() => {
    if (view !== 'board') return;
    setIsLoading(true);
    ticketsApi
      .board(debouncedSearch)
      .then(setBoardTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [view, debouncedSearch]);

  function handleCreated(id: string) {
    setShowForm(false);
    navigate(`/tickets/${id}`, { state: { backgroundLocation: location } });
  }

  async function handleStageChange(item: BoardTicket, stage: string) {
    const previousStage = item.hsPipelineStage;
    setBoardTickets((prev) => prev.map((t) => (t.id === item.id ? { ...t, hsPipelineStage: stage } : t)));
    try {
      await ticketsApi.updateStage(item.id, stage);
    } catch (err) {
      setBoardTickets((prev) => prev.map((t) => (t.id === item.id ? { ...t, hsPipelineStage: previousStage } : t)));
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  }

  const columns: Column<Ticket>[] = [
    { key: 'subject', header: 'Subject', render: (t) => <RecordLink to={`/tickets/${t.id}`} className="link"><TruncatedText text={t.subject} /></RecordLink> },
    { key: 'stage', header: 'Stage', render: (t) => lookupStageLabel(pipelines, t.hsPipeline, t.hsPipelineStage) ?? t.hsPipelineStage ?? '—' },
    { key: 'priority', header: 'Priority', render: (t) => t.hsTicketPriority ?? '—' },
    { key: 'category', header: 'Category', render: (t) => t.hsTicketCategory ?? '—' },
    { key: 'createdAt', header: 'Created', render: (t) => formatDate(t.createdAt) },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Tickets" />
        <Button variant="accent" onClick={() => setShowForm(true)}>+ Add ticket</Button>
      </div>
      <TicketInboxBanner />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by subject…"
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
          data={tickets}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="No tickets found."
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        />
      ) : isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <PipelineBoard
          pipelines={pipelines}
          pipelineId={boardPipelineId}
          items={boardTickets}
          keyExtractor={(t) => t.id}
          getPipelineValue={(t) => t.hsPipeline}
          getStageValue={(t) => t.hsPipelineStage}
          linkTo={(t) => `/tickets/${t.id}`}
          onStageChange={handleStageChange}
          emptyMessage="No pipeline configured for tickets yet. Set one up in Settings > Tickets."
          renderTitle={(t) => t.subject ?? '—'}
          renderMeta={(t) => (t.hsTicketPriority ? <div>{t.hsTicketPriority}</div> : undefined)}
        />
      )}

      {showForm && <TicketForm onCreated={handleCreated} onClose={() => setShowForm(false)} />}
    </div>
  );
}
