import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Network, Trash2 } from 'lucide-react';
import { partnershipsApi } from './api/partnerships';
import { historyApi } from '../../shared/api/history';
import { pipelinesApi } from '../../shared/api/pipelines';
import { AssociationPanel } from '../../shared/components/RecordDetail/AssociationPanel';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { RecordDetail } from '../../shared/components/RecordDetail/RecordDetail';
import { GroupedPropertiesPanel } from '../../shared/components/RecordDetail/GroupedPropertiesPanel';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { ContactSearchSelect } from '../../shared/components/SearchSelect/ContactSearchSelect';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import type { HistoryEvent, SectionDef } from '../../shared/components/RecordDetail/RecordDetail';
import { useHistoryTimeline } from '../../shared/hooks/useHistoryTimeline';
import { toHistoryEvents } from '../../shared/utils/historyEvents';
import { lookupPipelineLabel, lookupStageLabel } from '../../shared/utils/pipelineLookup';
import type {
  AssociatedCompany,
  AssociatedContact,
  HistoryEntry,
  LogActivityInput,
  LoggableActivityType,
  Partnership,
  PipelineWithStages,
} from '../../shared/types/index';

// Partnerships aren't "people you'd call or meet with" the way a
// contact/deal is — only Note makes sense here (see RecordDetail's
// loggableActivityTypes).
const NOTE_ONLY: LoggableActivityType[] = ['note'];

function fmt(val: string | null | undefined) {
  if (!val) return null;
  return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildSections(p: Partnership, pipelines: PipelineWithStages[]): SectionDef[] {
  return [
    {
      title: 'Partnership Information',
      fields: [
        { label: 'Name', value: p.name },
        { label: 'Type', value: p.typeObj },
        { label: 'MSP level', value: p.mspLevel },
        { label: 'Pipeline', value: lookupPipelineLabel(pipelines, p.hsPipeline) ?? p.hsPipeline },
        { label: 'Stage', value: lookupStageLabel(pipelines, p.hsPipeline, p.hsPipelineStage) ?? p.hsPipelineStage },
        { label: 'Distributor', value: p.distributor },
        { label: 'Programs', value: p.certificationPartnerPrograms },
      ],
    },
    {
      title: 'Dates',
      fields: [
        { label: 'Contract signed', value: fmt(p.contractSignatureDate) },
        { label: 'Close date', value: fmt(p.closeDate) },
        { label: 'Originally created', value: fmt(p.hsCreatedate) },
      ],
    },
  ];
}

function buildHistoryEvents(p: Partnership, entries: HistoryEntry[], showSyntheticCreated: boolean): HistoryEvent[] {
  return [
    ...(showSyntheticCreated ? [{ date: p.createdAt, title: 'Partnership created', description: 'by System' }] : []),
    ...toHistoryEvents(entries),
  ];
}

type Props = {
  // Full-page mode shows a "← Partnerships" back link since it's the only
  // way out; the slide-over panel already has its own close affordance, so
  // it omits this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function PartnershipDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [contacts, setContacts] = useState<AssociatedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const timeline = useHistoryTimeline('partnerships', id);

  function loadPartnership() {
    if (!id) return;
    partnershipsApi.getById(id).then(setPartnership);
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      partnershipsApi.getById(id),
      pipelinesApi.list('partnerships'),
      partnershipsApi.getCompanies(id),
      partnershipsApi.getContacts(id),
    ])
      .then(([p, pipes, cos, cts]) => {
        setPartnership(p);
        setPipelines(pipes);
        setCompanies(cos);
        setContacts(cts);
      })
      .catch(() => setError('Partnership not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function refetchAssociations() {
    if (!id) return;
    const [cos, cts] = await Promise.all([partnershipsApi.getCompanies(id), partnershipsApi.getContacts(id)]);
    setCompanies(cos);
    setContacts(cts);
  }

  async function handleLogActivity(input: LogActivityInput) {
    if (!partnership) return;
    await historyApi.logActivity('partnerships', partnership.id, input);
    timeline.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    await partnershipsApi.delete(id);
    navigate('/partnerships');
  }

  if (error) {
    return <div className="page"><div className="alert alert-error">{error}</div></div>;
  }

  // "Partnership created" is logged to the persisted history table by the
  // create flow itself (with real user attribution) — only fall back to the
  // synced createdAt timestamp for partnerships that predate that. Gated on
  // the timeline being fully loaded (no more pages, not mid-fetch) since the
  // real entry — being the oldest — would otherwise only surface on the last
  // page, well after the first page renders.
  const showSyntheticCreated =
    !timeline.isLoading && !timeline.hasMore && !timeline.entries.some((h) => h.title === 'Partnership created');

  return (
    <>
    <RecordDetail
      title={partnership?.name ?? ''}
      icon={Network}
      sections={partnership ? buildSections(partnership, pipelines) : []}
      extraTabs={
        partnership
          ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="partnerships" recordId={partnership.id} onSaved={loadPartnership} /> }]
          : []
      }
      backTo={showBackLink ? '/partnerships' : undefined}
      backLabel="Partnerships"
      isLoading={isLoading}
      historyEvents={partnership ? buildHistoryEvents(partnership, timeline.entries, showSyntheticCreated) : []}
      activeHistoryTypes={timeline.activeTypes}
      onActiveHistoryTypesChange={timeline.setActiveTypes}
      hasMoreHistory={timeline.hasMore}
      isLoadingMoreHistory={timeline.isLoading}
      onLoadMoreHistory={timeline.loadMore}
      onLogActivity={handleLogActivity}
      loggableActivityTypes={NOTE_ONLY}
      actions={
        <RowActionsMenu
          label="Actions"
          icon={ChevronDown}
          actions={[{ label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => setIsDeleteOpen(true) }]}
        />
      }
      aside={
        partnership && (
        <>
          <AssociationPanel
            title="Companies"
            items={companies}
            keyExtractor={(c) => c.id}
            itemLabel={(c) => c.name ?? 'this company'}
            renderItem={(c) => (
              <>
                <RecordLink to={`/companies/${c.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                  {c.name ?? '—'}
                </RecordLink>
                {c.domain && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Domain:{' '}
                    <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="link" style={{ fontWeight: 600 }}>
                      {c.domain}
                    </a>
                  </div>
                )}
              </>
            )}
            sourceType="partnerships"
            sourceId={partnership.id}
            targetType="companies"
            renderPicker={(onSelect) => <CompanySearchSelect value={null} onChange={(c) => c && onSelect(c.id)} />}
            onChange={refetchAssociations}
          />

          <AssociationPanel
            title="Contacts"
            items={contacts}
            keyExtractor={(c) => c.id}
            itemLabel={(c) => [c.firstname, c.lastname].filter(Boolean).join(' ') || 'this contact'}
            renderItem={(c) => (
              <>
                <RecordLink to={`/contacts/${c.id}`} className="link" style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                  {[c.firstname, c.lastname].filter(Boolean).join(' ') || '—'}
                </RecordLink>
                {(c.jobtitle || c.company) && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{[c.jobtitle, c.company].filter(Boolean).join(' at ')}</div>
                )}
                {c.email && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Email:{' '}
                    <a href={`mailto:${c.email}`} className="link">
                      {c.email}
                    </a>
                  </div>
                )}
              </>
            )}
            sourceType="partnerships"
            sourceId={partnership.id}
            targetType="contacts"
            renderPicker={(onSelect) => <ContactSearchSelect value={null} onChange={(c) => c && onSelect(c.id)} />}
            onChange={refetchAssociations}
          />
        </>
        )
      }
    />

    {isDeleteOpen && partnership && (
      <ConfirmDialog
        title="Delete Partnership?"
        message={`You are about to delete ${partnership.name || 'this partnership'}. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    )}
    </>
  );
}
