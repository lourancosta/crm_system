import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Select } from '../../../shared/components/Dropdown/Select';
import { Button } from '../../../shared/components/Button/Button';
import { Modal } from '../../../shared/components/Modal/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import { RowActionsMenu } from '../../../shared/components/Dropdown/RowActionsMenu';
import { Table } from '../../../shared/components/Table/Table';
import type { Column } from '../../../shared/components/Table/Table';
import { OBJECT_OPTIONS, isObjectValue } from '../objects/ObjectsPage';
import type { ObjectValue } from '../objects/ObjectsPage';
import { GroupForm } from './GroupForm';
import { PropertyEditForm } from './PropertyEditForm';
import { objectPropertiesApi } from '../../../shared/api/objectProperties';
import type { ObjectProperty, PropertyGroup } from '../../../shared/api/objectProperties';
import styles from './PropertiesPage.module.css';

type TabKind = 'properties' | 'groups';

const TAB_LABELS: Record<TabKind, string> = {
  properties: 'Properties',
  groups: 'Groups',
};

const TABS: TabKind[] = ['properties', 'groups'];

// Sentinel for the Properties tab's group filter — distinct from '' (which
// means "All groups") so properties with no group assigned are filterable
// too, same pattern PropertyEditForm uses for its "No group" option.
const NO_GROUP_FILTER = '__none__';

// Same page size as the other object list pages (CompaniesPage, ContactsPage,
// etc). Unlike those, the full property list is already fetched client-side
// (at most ~600 rows for the widest objects) — pagination here just slices
// the already-loaded array instead of round-tripping to the server, but uses
// the identical <Table pagination={...}> shape so the controls look and
// behave the same way.
const PAGE_SIZE = 50;

export function PropertiesPage() {
  // Same deep-linkable ?object= pattern as Settings > Objects (ObjectsPage.tsx).
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get('object');
  const selected: ObjectValue = isObjectValue(fromUrl) ? fromUrl : 'contacts';

  const [tab, setTab] = useState<TabKind>(TABS[0]);
  const [properties, setProperties] = useState<ObjectProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [page, setPage] = useState(1);

  const [groups, setGroups] = useState<PropertyGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groupSearch, setGroupSearch] = useState('');

  const [editingProperty, setEditingProperty] = useState<ObjectProperty | null>(null);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PropertyGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<PropertyGroup | null>(null);
  const [deleteError, setDeleteError] = useState('');

  function selectObject(value: ObjectValue) {
    setSearchParams({ object: value }, { replace: true });
  }

  function loadProperties() {
    setIsLoading(true);
    objectPropertiesApi
      .list(selected)
      .then(setProperties)
      .finally(() => setIsLoading(false));
  }

  function loadGroups() {
    setIsLoadingGroups(true);
    objectPropertiesApi
      .listGroups(selected)
      .then(setGroups)
      .finally(() => setIsLoadingGroups(false));
  }

  useEffect(() => {
    setSearch('');
    setGroupFilter('');
    setGroupSearch('');
    setPage(1);
    loadProperties();
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleGroupFilterChange(value: string) {
    setGroupFilter(value);
    setPage(1);
  }

  const filteredProperties = useMemo(() => {
    const query = search.trim().toLowerCase();
    return properties.filter((p) => {
      if (query && !(p.label.toLowerCase().includes(query) || p.columnName.toLowerCase().includes(query))) return false;
      if (groupFilter === NO_GROUP_FILTER && p.groupId !== null) return false;
      if (groupFilter && groupFilter !== NO_GROUP_FILTER && p.groupId !== groupFilter) return false;
      return true;
    });
  }, [properties, search, groupFilter]);

  const filteredGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((g) => g.label.toLowerCase().includes(query));
  }, [groups, groupSearch]);

  const pagedProperties = useMemo(
    () => filteredProperties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProperties, page],
  );

  async function handleSaveProperty(data: { label: string; groupId: string | null }) {
    if (!editingProperty) return;
    await objectPropertiesApi.updateProperty(editingProperty.columnName, { object: selected, ...data });
    setEditingProperty(null);
    loadProperties();
    loadGroups();
  }

  async function handleCreateGroup(label: string) {
    await objectPropertiesApi.createGroup(selected, label);
    setShowNewGroupForm(false);
    loadGroups();
  }

  async function handleUpdateGroup(label: string) {
    if (!editingGroup) return;
    await objectPropertiesApi.updateGroup(editingGroup.id, label);
    setEditingGroup(null);
    loadGroups();
    loadProperties();
  }

  async function handleDeleteGroup() {
    if (!deletingGroup) return;
    setDeleteError('');
    try {
      await objectPropertiesApi.deleteGroup(deletingGroup.id);
      setDeletingGroup(null);
      loadGroups();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete group');
    }
  }

  const propertyColumns: Column<ObjectProperty>[] = [
    {
      key: 'label',
      header: 'Property name',
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{p.label}</span>
          <span className={styles['row-actions-cell']}>
            <RowActionsMenu label="Actions" actions={[{ label: 'Edit', icon: Pencil, onClick: () => setEditingProperty(p) }]} />
          </span>
        </div>
      ),
    },
    { key: 'columnName', header: 'Internal name', render: (p) => <span style={{ color: 'var(--text-muted)' }}>{p.columnName}</span> },
    { key: 'group', header: 'Group', render: (p) => p.groupLabel ?? '—' },
    { key: 'dataType', header: 'Data type', render: (p) => p.dataType },
    { key: 'nullable', header: 'Nullable', render: (p) => (p.nullable ? 'Yes' : 'No') },
  ];

  const groupColumns: Column<PropertyGroup>[] = [
    {
      key: 'label',
      header: 'Group name',
      render: (g) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{g.label}</span>
          <span className={styles['row-actions-cell']}>
            <RowActionsMenu
              label="Actions"
              actions={[
                { label: 'Edit', icon: Pencil, onClick: () => setEditingGroup(g) },
                {
                  label: 'Delete',
                  icon: Trash2,
                  variant: 'danger',
                  disabled: g.propertyCount > 0,
                  title: g.propertyCount > 0 ? 'Reassign its properties before deleting this group' : undefined,
                  onClick: () => setDeletingGroup(g),
                },
              ]}
            />
          </span>
        </div>
      ),
    },
    { key: 'hubspotGroupName', header: 'Internal name', render: (g) => <span style={{ color: 'var(--text-muted)' }}>{g.hubspotGroupName}</span> },
    { key: 'propertyCount', header: 'Properties', render: (g) => g.propertyCount },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Properties</h1>
      </div>

      <div className="tab-panel-section" style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 600, marginRight: 12 }}>Select an object:</label>
        <Select value={selected} onChange={selectObject} options={[...OBJECT_OPTIONS]} ariaLabel="Select an object" />
      </div>

      <div className="detail-tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={`detail-tab${tab === t ? ' detail-tab--active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'properties' && (
        <>
          <div className="table-toolbar">
            <input
              className="search-input"
              placeholder="Search by property name…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <Select
              value={groupFilter}
              onChange={handleGroupFilterChange}
              ariaLabel="Filter by group"
              options={[
                { value: '', label: 'All groups' },
                { value: NO_GROUP_FILTER, label: 'No group' },
                ...groups.map((g) => ({ value: g.id, label: g.label })),
              ]}
            />
          </div>

          <div className={styles['properties-table']}>
            <Table
              columns={propertyColumns}
              data={pagedProperties}
              keyExtractor={(p) => p.columnName}
              isLoading={isLoading}
              emptyMessage={search || groupFilter ? 'No properties match your filters' : 'No properties found for this object'}
              pagination={{ page, pageSize: PAGE_SIZE, total: filteredProperties.length, onPageChange: setPage }}
            />
          </div>
        </>
      )}

      {tab === 'groups' && (
        <>
          <div className="table-toolbar" style={{ justifyContent: 'space-between' }}>
            <input
              className="search-input"
              placeholder="Search by group name…"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
            />
            <Button onClick={() => setShowNewGroupForm(true)}>+ New Group</Button>
          </div>

          <div className={styles['groups-table']}>
            <Table
              columns={groupColumns}
              data={filteredGroups}
              keyExtractor={(g) => g.id}
              isLoading={isLoadingGroups}
              emptyMessage={groupSearch ? 'No groups match your search' : 'No groups found for this object'}
            />
          </div>
        </>
      )}

      {editingProperty && (
        <Modal title="Edit Property" onClose={() => setEditingProperty(null)}>
          <PropertyEditForm
            initialLabel={editingProperty.label}
            initialGroupId={editingProperty.groupId}
            groups={groups}
            onSubmit={handleSaveProperty}
            onCancel={() => setEditingProperty(null)}
          />
        </Modal>
      )}

      {showNewGroupForm && (
        <Modal title="New Group" onClose={() => setShowNewGroupForm(false)}>
          <GroupForm onSubmit={handleCreateGroup} onCancel={() => setShowNewGroupForm(false)} />
        </Modal>
      )}

      {editingGroup && (
        <Modal title="Edit Group" onClose={() => setEditingGroup(null)}>
          <GroupForm initialLabel={editingGroup.label} onSubmit={handleUpdateGroup} onCancel={() => setEditingGroup(null)} />
        </Modal>
      )}

      {deletingGroup && (
        <ConfirmDialog
          title="Delete Group?"
          message={
            <>
              {`You are about to delete "${deletingGroup.label}". This can't be undone.`}
              {deleteError && (
                <div className="alert alert-error" style={{ marginTop: 8 }}>
                  {deleteError}
                </div>
              )}
            </>
          }
          onConfirm={handleDeleteGroup}
          onCancel={() => {
            setDeletingGroup(null);
            setDeleteError('');
          }}
        />
      )}
    </div>
  );
}
