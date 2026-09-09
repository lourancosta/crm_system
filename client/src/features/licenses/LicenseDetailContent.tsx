import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, KeyRound, Trash2 } from 'lucide-react';
import { licensesApi } from './api/licenses';
import { historyApi } from '../../shared/api/history';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { AssociationPanel } from '../../shared/components/RecordDetail/AssociationPanel';
import { GroupedPropertiesPanel } from '../../shared/components/RecordDetail/GroupedPropertiesPanel';
import { CompanySearchSelect } from '../../shared/components/SearchSelect/CompanySearchSelect';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { RecordDetail } from '../../shared/components/RecordDetail/RecordDetail';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import type { HistoryEvent, SectionDef } from '../../shared/components/RecordDetail/RecordDetail';
import { useHistoryTimeline } from '../../shared/hooks/useHistoryTimeline';
import { toHistoryEvents } from '../../shared/utils/historyEvents';
import { formatQuantity } from '../../shared/utils/numberInput';
import type { AssociatedCompany, HistoryEntry, License, LogActivityInput, LoggableActivityType } from '../../shared/types/index';

// Licenses aren't "people you'd call or meet with" the way a contact/deal is
// — only Note makes sense here (see RecordDetail's loggableActivityTypes).
const NOTE_ONLY: LoggableActivityType[] = ['note'];

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  expired: '#dc2626',
  revoked: '#9ca3af',
};

function StatusCell({ status }: { status: string | null }) {
  if (!status) return null;
  const color = STATUS_COLORS[status.toLowerCase()] ?? '#9ca3af';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildSections(l: License): SectionDef[] {
  return [
    {
      title: 'License Information',
      fields: [
        { label: 'Name', value: l.name },
        { label: 'Status', value: <StatusCell status={l.status} /> },
        { label: 'Customer', value: l.customerName },
        { label: 'Partner', value: l.partnerName },
        { label: 'Type', value: l.typeObj },
        { label: 'Subscription', value: l.subscription?.toUpperCase() },
        { label: 'Quantity', value: formatQuantity(l.quantity) },
        { label: 'Module', value: l.module },
        { label: 'License group', value: l.licenseGroup },
      ],
    },
    {
      title: 'Dates',
      fields: [
        { label: 'Platform created', value: fmt(l.platformCreatedDate) },
        { label: 'Activation date', value: fmt(l.activationDate) },
        { label: 'Expiration date', value: fmt(l.expirationDate) },
        { label: 'Revoke date', value: fmt(l.revokeDate) },
      ],
    },
  ];
}

function buildHistoryEvents(l: License, history: HistoryEntry[]): HistoryEvent[] {
  return [{ date: l.createdAt, title: 'License synced' }, ...toHistoryEvents(history)];
}

type Props = {
  // Full-page mode shows a "← Licenses" back link since it's the only way
  // out; the slide-over panel already has its own close affordance, so it
  // omits this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function LicenseDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [license, setLicense] = useState<License | null>(null);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const timeline = useHistoryTimeline('licenses', id);

  function loadLicense() {
    if (!id) return;
    licensesApi.getById(id).then(setLicense);
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([licensesApi.getById(id), licensesApi.getCompanies(id)])
      .then(([l, cos]) => {
        setLicense(l);
        setCompanies(cos);
      })
      .catch(() => setError('License not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  function refetchCompanies() {
    if (!id) return;
    licensesApi.getCompanies(id).then(setCompanies);
  }

  async function handleLogActivity(input: LogActivityInput) {
    if (!license) return;
    await historyApi.logActivity('licenses', license.id, input);
    timeline.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    await licensesApi.delete(id);
    navigate('/licenses');
  }

  if (error) {
    return <div className="page"><div className="alert alert-error">{error}</div></div>;
  }

  return (
    <>
      <RecordDetail
        title={license?.name ?? ''}
        icon={KeyRound}
        sections={license ? buildSections(license) : []}
        extraTabs={
          license
            ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="licenses" recordId={license.id} onSaved={loadLicense} /> }]
            : []
        }
        backTo={showBackLink ? '/licenses' : undefined}
        backLabel="Licenses"
        isLoading={isLoading}
        historyEvents={license ? buildHistoryEvents(license, timeline.entries) : []}
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
          license && (
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
              sourceType="licenses"
              sourceId={license.id}
              targetType="companies"
              renderPicker={(onSelect) => <CompanySearchSelect value={null} onChange={(c) => c && onSelect(c.id)} />}
              onChange={refetchCompanies}
            />
          )
        }
      />

      {isDeleteOpen && license && (
        <ConfirmDialog
          title="Delete License?"
          message={`You are about to delete ${license.name || 'this license'}. This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}
