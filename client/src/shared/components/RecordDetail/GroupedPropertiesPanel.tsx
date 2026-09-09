import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../Button/Button';
import { objectPropertiesApi } from '../../api/objectProperties';
import type { ObjectProperty, PropertyGroup } from '../../api/objectProperties';
import type { ObjectValue } from '../../../features/settings/objects/ObjectsPage';
import styles from './GroupedPropertiesPanel.module.css';

type Props = {
  objectType: ObjectValue;
  recordId: string;
  // Called after a successful save — lets the parent reload its own curated
  // summary fetch too, since some of the same columns (e.g. a license's
  // Status) are also shown up there from a separate xxxApi.getById call
  // that this panel has no way to refresh on its own.
  onSaved?: () => void;
};

// Object's own singular noun, used only to find its primary "<Object>
// information" group so that one can be pinned first — see
// sortGroupsWithObjectInfoFirst below. Loosely matched (substring, not
// exact) since real group labels vary ("Deal information" vs licenses'
// actual "License Details Information").
const OBJECT_SINGULAR: Record<ObjectValue, string> = {
  contacts: 'contact',
  companies: 'company',
  deals: 'deal',
  tickets: 'ticket',
  partnerships: 'partnership',
  quotes: 'quote',
  invoices: 'invoice',
  payments: 'payment',
  licenses: 'license',
  creditMemos: 'credit memo',
  products: 'product',
};

// System/bookkeeping columns that never become editable, even though a
// handful of them (id, hubspot_id, archived) technically never show up in
// this panel anyway (they have no group assigned by design) — kept as an
// explicit denylist here too as defense in depth, since an admin could in
// principle assign one of these to a group via Settings > Properties. The
// real enforcement boundary is the backend (objectProperties.service.ts's
// own identical NON_EDITABLE_COLUMNS) — this is just so the UI never even
// offers an input for them.
const NON_EDITABLE_COLUMNS = new Set(['id', 'hubspot_id', 'archived', 'raw_hubspot_payload', 'created_at', 'updated_at']);

function sortGroupsWithObjectInfoFirst(groups: PropertyGroup[], objectType: ObjectValue): PropertyGroup[] {
  const singular = OBJECT_SINGULAR[objectType];
  const pinnedIndex = groups.findIndex((g) => {
    const label = g.label.toLowerCase();
    return label.includes(singular) && label.includes('information');
  });
  if (pinnedIndex <= 0) return groups;
  return [groups[pinnedIndex], ...groups.slice(0, pinnedIndex), ...groups.slice(pinnedIndex + 1)];
}

function isBlank(raw: unknown): boolean {
  return raw === null || raw === undefined || raw === '';
}

// Property metadata has no explicit "money" vs "quantity" flag for decimal
// columns — both come through as dataType 'decimal' — so this name-based
// heuristic decides how many decimals to show: quantity-like columns round
// to whole numbers, everything else (money, percentages, etc.) caps at 2
// decimals. Checked against both columnName and label since HubSpot-derived
// column names aren't always as descriptive as their display label.
const QUANTITY_HINT = /\b(quantity|qty|units?|count)\b/i;

function isQuantityProperty(p: { columnName: string; label: string }): boolean {
  return QUANTITY_HINT.test(p.columnName) || QUANTITY_HINT.test(p.label);
}

function formatValue(p: ObjectProperty, raw: unknown): string {
  if (isBlank(raw)) return '—';
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  switch (p.dataType) {
    case 'datetime':
    case 'date': {
      const date = new Date(raw as string);
      if (Number.isNaN(date.getTime())) return String(raw);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    case 'tinyint':
      if (raw === 0 || raw === 1) return raw === 1 ? 'Yes' : 'No';
      return String(raw);
    case 'decimal': {
      const num = Number(raw);
      if (Number.isNaN(num)) return String(raw);
      if (isQuantityProperty(p)) return Math.round(num).toString();
      return (Math.round(num * 100) / 100).toString();
    }
    default:
      return String(raw);
  }
}

// A datetime/date value as-stored (ISO string, "YYYY-MM-DD HH:MM:SS", or a
// Date) reduced to the "YYYY-MM-DD" an <input type="date"> needs. Uses local
// date components (matching formatValue's toLocaleDateString below), not
// .toISOString() — that's UTC and can land on the wrong calendar day
// whenever the stored time component is near midnight, showing e.g. Dec 16
// in the input while the read-only view above it (correctly) shows Dec 15.
function toDateInputValue(raw: unknown): string {
  if (isBlank(raw)) return '';
  const date = new Date(raw as string);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Same trailing-zero trim formatValue's 'decimal' case does (Number(raw) on
// a mysql2-returned DECIMAL string like "1.450000" -> "1.45"), so the edit
// input's initial value matches what the read-only view just showed instead
// of exposing the column's full raw precision.
function toDecimalInputValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  const num = Number(raw);
  return Number.isNaN(num) ? String(raw) : num.toString();
}

// The HubSpot-style "all properties" browser referenced this session —
// search + group filter + collapsible groups (default collapsed) + hide
// blank properties, plus an inline "edit everything" mode. Reads three
// things: this object's property definitions and groups (already used by
// Settings > Properties), plus this one record's raw column values
// (objectPropertiesApi.getRecordValues — the one endpoint built specifically
// for this panel, since every object's own xxxApi.getById intentionally
// returns only a curated field subset).
export function GroupedPropertiesPanel({ objectType, recordId, onSaved }: Props) {
  const [properties, setProperties] = useState<ObjectProperty[]>([]);
  const [groups, setGroups] = useState<PropertyGroup[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hideBlank, setHideBlank] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function load() {
    setIsLoading(true);
    return Promise.all([
      objectPropertiesApi.list(objectType),
      objectPropertiesApi.listGroups(objectType),
      objectPropertiesApi.getRecordValues(objectType, recordId),
    ])
      .then(([props, grps, vals]) => {
        setProperties(props);
        setGroups(grps);
        setValues(vals);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectType, recordId]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEditing() {
    // Decimal columns get trimmed to match what the read-only view just
    // showed (e.g. "1.450000" -> "1.45") exactly once, here at seed time —
    // NOT inside the input's render, which would re-run Number()->toString()
    // on every keystroke and strip a trailing "." the instant a user typed
    // it, making it impossible to type a fraction like "1.5" at all.
    const seeded: Record<string, unknown> = {};
    for (const p of properties) {
      seeded[p.columnName] = p.dataType === 'decimal' ? toDecimalInputValue(values[p.columnName]) : values[p.columnName];
    }
    setDraftValues(seeded);
    setSaveError('');
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraftValues({});
    setSaveError('');
  }

  function updateDraft(columnName: string, value: unknown) {
    setDraftValues((prev) => ({ ...prev, [columnName]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError('');
    try {
      // Decimal columns were trimmed once at seed time ("1.450000" ->
      // "1.45"), so a plain string comparison against the untrimmed
      // original would flag every decimal field as "changed" even when
      // untouched — compare numerically for those instead.
      const changed: Record<string, unknown> = {};
      for (const [column, value] of Object.entries(draftValues)) {
        const isDecimal = properties.find((p) => p.columnName === column)?.dataType === 'decimal';
        const unchanged = isDecimal ? Number(values[column]) === Number(value) : values[column] === value;
        if (!unchanged) changed[column] = value;
      }
      if (Object.keys(changed).length > 0) {
        await objectPropertiesApi.updateRecordValues(objectType, recordId, changed);
        await load();
      }
      setEditing(false);
      setDraftValues({});
      onSaved?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }

  // Grouped by property_groups.id — ungrouped properties (groupId null) and
  // the raw_hubspot_payload JSON blob never appear in this panel at all.
  const propertiesByGroup = useMemo(() => {
    const map = new Map<string, ObjectProperty[]>();
    for (const p of properties) {
      if (!p.groupId || p.dataType === 'json') continue;
      const list = map.get(p.groupId) ?? [];
      list.push(p);
      map.set(p.groupId, list);
    }
    return map;
  }, [properties]);

  const query = search.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    const ordered = sortGroupsWithObjectInfoFirst(groups, objectType);
    return ordered
      .map((group) => {
        const groupProperties = (propertiesByGroup.get(group.id) ?? []).filter((p) => {
          if (query && !p.label.toLowerCase().includes(query)) return false;
          if (hideBlank && !editing && isBlank(values[p.columnName])) return false;
          return true;
        });
        return { group, properties: groupProperties };
      })
      .filter((g) => g.properties.length > 0);
  }, [groups, propertiesByGroup, query, hideBlank, values, objectType, editing]);

  function renderEditableInput(p: ObjectProperty) {
    // draftValues is fully pre-seeded for every editable property in
    // startEditing, so no values[...] fallback is needed here — and using
    // `??` for one would be actively wrong: clearing a field sets its draft
    // to `null` (intentional), but `??` treats `null` as "unset" and falls
    // back to the original raw value, silently resurrecting it on every
    // render (confirmed live: clearing a decimal field to type a fresh
    // value redisplayed the untrimmed DB value mid-edit instead of blank).
    const raw = draftValues[p.columnName];

    if (p.dataType === 'tinyint') {
      const checked = raw === 1 || raw === true;
      return (
        <input
          type="checkbox"
          className={styles.editCheckbox}
          checked={checked}
          onChange={(e) => updateDraft(p.columnName, e.target.checked)}
        />
      );
    }

    if (p.dataType === 'datetime' || p.dataType === 'date') {
      return (
        <input
          type="date"
          className={styles.editInput}
          value={toDateInputValue(raw)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateDraft(p.columnName, e.target.value || null)}
        />
      );
    }

    if (p.dataType === 'decimal') {
      // raw is already trimmed once at seed time (startEditing) — do NOT
      // re-run it through toDecimalInputValue here, that would strip a
      // trailing "." on every keystroke and block typing fractions.
      //
      // type="text" (not "number"): Chromium's <input type="number"> collapses
      // its .value to the last *valid* number on every keystroke (e.g. typing
      // "1." reports .value as "1", silently dropping the "."), and
      // reassigning .value from a controlled re-render resets the cursor to
      // the start of the field instead of preserving position. Combined,
      // those two behaviors scramble input under normal fraction-typing speed
      // (typing "1.5" landed as "1.00000015" or "51" in testing) — confirmed
      // via isolated repro, not a testing artifact. inputMode="decimal" keeps
      // the numeric keyboard on mobile without the native type=number footgun.
      return (
        <input
          type="text"
          inputMode="decimal"
          className={styles.editInput}
          value={raw === null || raw === undefined ? '' : String(raw)}
          onChange={(e) => updateDraft(p.columnName, e.target.value === '' ? null : e.target.value)}
        />
      );
    }

    return (
      <input
        type="text"
        className={styles.editInput}
        value={raw === null || raw === undefined ? '' : String(raw)}
        onChange={(e) => updateDraft(p.columnName, e.target.value === '' ? null : e.target.value)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="tab-panel-section">
        <div className="empty">Loading properties…</div>
      </div>
    );
  }

  return (
    <div className="tab-panel-section">
      <div className={styles.toolbar}>
        <input
          className={`search-input ${styles.toolbarSearch}`}
          placeholder="Search property…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <a
          href={`/settings/properties?object=${objectType}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`link ${styles.manageLink}`}
        >
          Manage properties <ExternalLink size={13} />
        </a>
        {!editing && (
          <label className={styles.hideBlankLabel}>
            <input type="checkbox" checked={hideBlank} onChange={(e) => setHideBlank(e.target.checked)} />
            Hide blank properties
          </label>
        )}

        <span className={styles.toolbarSpacer} />

        {editing ? (
          <>
            <Button type="button" variant="secondary" onClick={cancelEditing} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} isLoading={isSaving}>
              Save
            </Button>
          </>
        ) : (
          <Button type="button" variant="primary" onClick={startEditing}>
            Edit
          </Button>
        )}
      </div>

      {saveError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {saveError}
        </div>
      )}

      {visibleGroups.length === 0 ? (
        <div className="empty">
          {query || hideBlank ? 'No properties match your filters' : 'No property groups found for this object'}
        </div>
      ) : (
        <div className={styles.groupList}>
          {visibleGroups.map(({ group, properties: groupProperties }) => {
            const isOpen = editing || query ? true : openGroups.has(group.id);
            return (
              <div key={group.id} className={styles.group}>
                <button
                  type="button"
                  className={styles.groupHeader}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                >
                  <span className={`${styles.groupArrow}${isOpen ? '' : ` ${styles.groupArrowClosed}`}`}>›</span>
                  <span className={styles.groupLabel}>{group.label}</span>
                  <span className={styles.groupCount}>
                    {group.propertyCount} propert{group.propertyCount === 1 ? 'y' : 'ies'}
                  </span>
                </button>
                {isOpen && (
                  <div className={styles.groupBody}>
                    <div className={styles.fields}>
                      {groupProperties.map((p) => {
                        const canEdit = editing && !NON_EDITABLE_COLUMNS.has(p.columnName);
                        return (
                          <div key={p.columnName} className={styles.field}>
                            <span className={styles.fieldLabel}>{p.label}</span>
                            {canEdit ? (
                              renderEditableInput(p)
                            ) : (
                              <span className={styles.fieldValue}>
                                {formatValue(p, editing ? (draftValues[p.columnName] ?? values[p.columnName]) : values[p.columnName])}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
