import { useState } from 'react';

function readStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

// Drop-in replacement for useState that mirrors its value to localStorage —
// for per-browser UI preferences (last view mode, last pipeline viewed) that
// don't need to sync across devices.
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, defaultValue));

  function update(next: T | ((prev: T) => T)) {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Storage unavailable (private browsing quota, etc.) — value still
        // updates for this session, it just won't persist.
      }
      return resolved;
    });
  }

  return [value, update] as const;
}
