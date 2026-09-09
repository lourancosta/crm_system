import { useCallback, useEffect, useRef, useState } from 'react';
import { historyApi } from '../api/history';
import { HISTORY_ACTIVITY_TYPES } from '../types/index';
import type { HistoryActivityType, HistoryEntry, HistoryObjectType } from '../types/index';

const PAGE_SIZE = 40;

// Cursor-paginated activity timeline for a single record. Type filtering is
// server-side (see history.repository.ts::listForRecord), so toggling a
// filter resets and refetches from the first page rather than filtering an
// already-loaded array — required now that entries are paginated, since a
// filter can't be reliably applied to a partial/loaded window.
export function useHistoryTimeline(objectType: HistoryObjectType, objectId: string | undefined) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [activeTypes, setActiveTypes] = useState<Set<HistoryActivityType>>(new Set(HISTORY_ACTIVITY_TYPES));
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const typesParam =
    activeTypes.size === HISTORY_ACTIVITY_TYPES.length ? undefined : [...activeTypes];

  const fetchPage = useCallback(
    async (afterCursor: string | null, reset: boolean) => {
      if (!objectId) return;
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const page = await historyApi.listForRecord(objectType, objectId, {
          cursor: afterCursor ?? undefined,
          limit: PAGE_SIZE,
          types: typesParam,
        });
        if (requestId !== requestIdRef.current) return; // superseded by a newer request
        setEntries((prev) => (reset ? page.entries : [...prev, ...page.entries]));
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- typesParam is derived from activeTypes each render; comparing its identity here would refetch every render
    [objectType, objectId, JSON.stringify(typesParam)],
  );

  const refresh = useCallback(() => {
    setCursor(null);
    setHasMore(false);
    fetchPage(null, true);
  }, [fetchPage]);

  // Refetch from scratch whenever the record or the active type filter changes.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh already depends on the same [objectType, objectId, typesParam]
  }, [objectType, objectId, JSON.stringify(typesParam)]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    fetchPage(cursor, false);
  }, [cursor, hasMore, isLoading, fetchPage]);

  return { entries, activeTypes, setActiveTypes, hasMore, isLoading, loadMore, refresh };
}
