// Splices `draggedKey` out of `items` and reinserts it at `targetKey`'s
// position — the array-reordering half of the app's drag-and-drop pattern,
// paired with dragHandleColumn.tsx and Table's `onReorder` prop.
export function reorderByKey<T>(items: T[], keyExtractor: (item: T) => string, draggedKey: string, targetKey: string): T[] {
  const fromIndex = items.findIndex((item) => keyExtractor(item) === draggedKey);
  const toIndex = items.findIndex((item) => keyExtractor(item) === targetKey);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
