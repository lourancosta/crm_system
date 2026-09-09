import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { History, Mail, Pencil, Phone, StickyNote, Trash2, Users } from 'lucide-react';
import { Button } from '../Button/Button';
import { CheckboxDropdown } from '../Dropdown/CheckboxDropdown';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { RowActionsMenu } from '../Dropdown/RowActionsMenu';
import { LogActivityModal } from './LogActivityModal';
import { HISTORY_ACTIVITY_TYPES, LOGGABLE_ACTIVITY_TYPES } from '../../types/index';
import type {
  ActivityAssociationOption,
  HistoryActivityType,
  HistoryLoggableObjectType,
  LogActivityInput,
  LoggableActivityType,
} from '../../types/index';
import styles from './RecordDetail.module.css';

// Delete removes the whole entry, so it stays restricted to activities the
// user (manually) logged — note/call/meeting/email — never 'system' audit
// entries.
const DELETABLE_ACTIVITY_TYPES = new Set<string>(LOGGABLE_ACTIVITY_TYPES);
// Edit can mean "rewrite content" (note/call/meeting) or "re-tag which
// records this shows up on" (email — content/type are locked once created,
// whether synced from HubSpot or manually logged — see LogActivityModal's
// associations-only mode for that type).
const EDITABLE_ACTIVITY_TYPES = new Set<string>(LOGGABLE_ACTIVITY_TYPES);

export type FieldDef = {
  label: string;
  value: ReactNode;
};

export type SectionDef = {
  title: string;
  fields: FieldDef[];
};

export type TabDef = {
  key: string;
  label: string;
  content: ReactNode;
};

export type HistoryEvent = {
  id?: string;
  date: string | null | undefined;
  type?: HistoryActivityType;
  title: string;
  description?: ReactNode;
};

type Props = {
  title: string;
  icon?: LucideIcon;
  sections: SectionDef[];
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  // Replaces the default sections-based Information tab content entirely
  // (full width) when provided — used by tickets for the email conversation
  // panel, with the ticket's own fields moved into `aside` instead.
  informationContent?: ReactNode;
  // Overrides the first tab's label — tickets use "Conversation" since
  // informationContent replaces the fields view with the email thread there.
  informationTabLabel?: string;
  extraTabs?: TabDef[];
  historyEvents?: HistoryEvent[];
  isLoading?: boolean;
  // Activity-type filter is server-side (paginated results can't be reliably
  // filtered client-side), so RecordDetail no longer owns this state itself —
  // the parent (via useHistoryTimeline) does, and passes it down controlled.
  activeHistoryTypes?: Set<HistoryActivityType>;
  onActiveHistoryTypesChange?: (types: Set<HistoryActivityType>) => void;
  hasMoreHistory?: boolean;
  isLoadingMoreHistory?: boolean;
  onLoadMoreHistory?: () => void;
  onLogActivity?: (input: LogActivityInput) => Promise<void>;
  activityAssociationOptions?: ActivityAssociationOption[];
  onUpdateActivity?: (id: string, input: LogActivityInput) => Promise<void>;
  onDeleteActivity?: (id: string) => Promise<void>;
  onFetchActivityAssociations?: (id: string) => Promise<{ objectType: HistoryLoggableObjectType; objectId: string }[]>;
  // Which activity types can be logged here — defaults to Note/Call/Meeting.
  // Object types that aren't "people you'd call or meet with" (tickets,
  // invoices, partnerships, payments, products, credit memos) are passed
  // just ['note'].
  loggableActivityTypes?: LoggableActivityType[];
};

const ACTIVITY_COLOR = 'var(--text-muted)';

const ACTIVITY_TYPE_META: Record<HistoryActivityType, { label: string; icon: LucideIcon; color: string }> = {
  system: { label: 'Update', icon: History, color: ACTIVITY_COLOR },
  note: { label: 'Note', icon: StickyNote, color: ACTIVITY_COLOR },
  call: { label: 'Call', icon: Phone, color: ACTIVITY_COLOR },
  meeting: { label: 'Meeting', icon: Users, color: ACTIVITY_COLOR },
  email: { label: 'Email', icon: Mail, color: ACTIVITY_COLOR },
};

const ACTIVITY_TYPE_OPTIONS = HISTORY_ACTIVITY_TYPES.map((type) => ({
  value: type,
  label: ACTIVITY_TYPE_META[type].label,
}));

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function RecordDetail({
  title,
  icon: Icon,
  sections,
  backTo,
  backLabel = 'Back',
  actions,
  aside,
  informationContent,
  informationTabLabel = 'Information',
  extraTabs = [],
  historyEvents = [],
  isLoading = false,
  activeHistoryTypes,
  onActiveHistoryTypesChange,
  hasMoreHistory = false,
  isLoadingMoreHistory = false,
  onLoadMoreHistory,
  onLogActivity,
  activityAssociationOptions,
  onUpdateActivity,
  onDeleteActivity,
  onFetchActivityAssociations,
  loggableActivityTypes,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>('information');
  // Uncontrolled fallback for any caller that hasn't wired up
  // useHistoryTimeline yet — keeps this prop optional/backward-compatible.
  const [uncontrolledActiveTypes, setUncontrolledActiveTypes] = useState<Set<HistoryActivityType>>(
    new Set(HISTORY_ACTIVITY_TYPES),
  );
  const activeTypes = activeHistoryTypes ?? uncontrolledActiveTypes;
  const setActiveTypes = onActiveHistoryTypesChange ?? setUncontrolledActiveTypes;
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const [editingEvent, setEditingEvent] = useState<(HistoryEvent & { id: string }) | null>(null);
  const [editingAssociationKeys, setEditingAssociationKeys] = useState<Set<string> | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  // The edit modal only renders once editingAssociationKeys resolves (see
  // handleEditClick) — this gives the clicked row's Edit action immediate
  // visual feedback in the meantime, instead of nothing appearing to happen
  // until that fetch completes.
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  // Infinite scroll: fetch the next page once the sentinel below the last
  // rendered activity enters the viewport. Declared above the `isLoading`
  // early return below (rather than near where it's used further down) so
  // every render calls the same hooks in the same order — the sentinel ref
  // is simply null while nothing's rendered yet, which the guard handles.
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !onLoadMoreHistory) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0]?.isIntersecting) onLoadMoreHistory();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMoreHistory, activeTab, historyEvents.length]);

  if (isLoading) return <div className="loading">Loading...</div>;

  const sectionsEl = (
    <>
      {sections.map((section) => (
        <div key={section.title} className="tab-panel-section">
          <h3 className={styles['tab-panel-section-title']}>{section.title}</h3>
          <div className={styles['record-fields']}>
            {section.fields.map((field) => (
              <div key={field.label} className={styles['record-field']}>
                <span className={styles['record-field-label']}>{field.label}</span>
                <span className={styles['record-field-value']}>{field.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  const informationTabContent = informationContent ?? sectionsEl;

  const sortedEvents = [...historyEvents]
    .filter((e) => !!e.date)
    .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  const filteredEvents = sortedEvents.filter((e) => activeTypes.has(e.type ?? 'system'));

  async function handleLogActivity(input: LogActivityInput) {
    if (!onLogActivity) return;
    await onLogActivity(input);
  }

  async function handleUpdateActivity(input: LogActivityInput) {
    if (!onUpdateActivity || !editingEvent) return;
    await onUpdateActivity(editingEvent.id, input);
  }

  async function confirmDeleteActivity() {
    if (!onDeleteActivity || !deletingActivityId) return;
    await onDeleteActivity(deletingActivityId);
    setDeletingActivityId(null);
  }

  async function handleEditClick(event: HistoryEvent & { id: string }) {
    setLoadingEditId(event.id);
    try {
      const associations = onFetchActivityAssociations ? await onFetchActivityAssociations(event.id) : [];
      setEditingEvent(event);
      setEditingAssociationKeys(new Set(associations.map((a) => `${a.objectType}:${a.objectId}`)));
    } finally {
      setLoadingEditId(null);
    }
  }

  function closeEditModal() {
    setEditingEvent(null);
    setEditingAssociationKeys(null);
  }

  const historyContent = (
    <div className={`tab-panel-section ${styles['activity-panel']}`}>
      <div className={styles['activity-toolbar']}>
        <CheckboxDropdown
          label="Type"
          options={ACTIVITY_TYPE_OPTIONS}
          selected={activeTypes}
          onChange={setActiveTypes}
        />
        {onLogActivity && <Button onClick={() => setIsLogActivityOpen(true)}>Log activity</Button>}
      </div>

      <div className={styles['activity-scroll']}>
      {filteredEvents.length === 0 ? (
        <div className="empty">
          {isLoadingMoreHistory && sortedEvents.length === 0
            ? 'Loading…'
            : sortedEvents.length === 0
              ? 'No history yet'
              : 'No activities match the selected filters'}
        </div>
      ) : (
        <div className={styles.timeline}>
          {filteredEvents.map((event, i) => {
            const meta = ACTIVITY_TYPE_META[event.type ?? 'system'];
            const TypeIcon = meta.icon;
            const canEdit = !!event.id && !!event.type && EDITABLE_ACTIVITY_TYPES.has(event.type) && !!onUpdateActivity;
            const canDelete =
              !!event.id && !!event.type && DELETABLE_ACTIVITY_TYPES.has(event.type) && !!onDeleteActivity;
            const showActionsMenu = canEdit || canDelete;
            return (
              <div key={i} className={styles['timeline-item']}>
                <div className={styles['timeline-marker']}>
                  <span className={styles['timeline-dot']} />
                  {i < filteredEvents.length - 1 && <span className={styles['timeline-line']} />}
                </div>
                <div className={styles['timeline-content']}>
                  <div className={styles['timeline-balloon']}>
                    <div className={styles['timeline-balloon-header']}>
                      <span className={styles['timeline-type']} style={{ color: meta.color }}>
                        <TypeIcon size={14} />
                        {meta.label}
                        {event.description && <span className={styles['timeline-author']}>{event.description}</span>}
                      </span>
                      <span className={styles['timeline-date-group']}>
                        {showActionsMenu && (
                          <RowActionsMenu
                            actions={[
                              ...(canEdit
                                ? [
                                    {
                                      label: loadingEditId === event.id ? 'Loading…' : 'Edit',
                                      icon: Pencil,
                                      disabled: loadingEditId === event.id,
                                      onClick: () => handleEditClick(event as HistoryEvent & { id: string }),
                                    },
                                  ]
                                : []),
                              ...(canDelete
                                ? [
                                    {
                                      label: 'Delete',
                                      variant: 'danger' as const,
                                      icon: Trash2,
                                      onClick: () => setDeletingActivityId(event.id as string),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        )}
                        <span className={styles['timeline-date']}>{fmtDateTime(event.date)}</span>
                      </span>
                    </div>
                    <div className={styles['timeline-body']}>{event.title}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {(hasMoreHistory || isLoadingMoreHistory) && (
            <div ref={loadMoreSentinelRef} className={styles['timeline-load-more']}>
              {isLoadingMoreHistory ? 'Loading more…' : ''}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );

  const tabs: TabDef[] = [
    { key: 'information', label: informationTabLabel, content: informationTabContent },
    ...extraTabs,
    { key: 'historic', label: 'Activities', content: historyContent },
  ];

  const active = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  const headerEl = (
    <div className={styles['record-header']}>
      <div className={styles['record-title-group']}>
        {Icon && (
          <span className={styles['record-title-icon']}>
            <Icon size={26} />
          </span>
        )}
        <h1 className={styles['record-title']}>{title}</h1>
      </div>
      {actions && <div className={styles['record-actions']}>{actions}</div>}
    </div>
  );

  return (
    <div className={`${styles['record-detail']}${aside ? ` ${styles['record-detail--wide']}` : ''}`}>
      <div className={`${styles['record-layout']}${aside ? '' : ` ${styles['record-layout--single']}`}`}>
        <div className={styles['record-main']}>
          {backTo && (
            <Link to={backTo} className={styles['record-back']}>
              ← {backLabel}
            </Link>
          )}

          {headerEl}

          <div className="detail-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`detail-tab${active.key === tab.key ? ' detail-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles['tab-panel']}>{active.content}</div>

          {isLogActivityOpen && onLogActivity && (
            <LogActivityModal
              onSubmit={handleLogActivity}
              onClose={() => setIsLogActivityOpen(false)}
              associationOptions={activityAssociationOptions}
              allowedTypes={loggableActivityTypes}
            />
          )}

          {editingEvent && editingAssociationKeys && onUpdateActivity && (
            <LogActivityModal
              initial={{ type: (editingEvent.type ?? 'note') as LoggableActivityType | 'email', content: editingEvent.title }}
              initialAssociationKeys={editingAssociationKeys}
              associationOptions={activityAssociationOptions}
              onSubmit={handleUpdateActivity}
              onClose={closeEditModal}
              allowedTypes={loggableActivityTypes}
            />
          )}

          {deletingActivityId && (
            <ConfirmDialog
              title="Delete Activity?"
              message="This will permanently remove this activity. This can't be undone."
              onConfirm={confirmDeleteActivity}
              onCancel={() => setDeletingActivityId(null)}
            />
          )}
        </div>

        {aside && <aside className={styles['record-aside']}>{aside}</aside>}
      </div>
    </div>
  );
}
