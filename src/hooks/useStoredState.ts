import { useEffect, useState } from 'react';

/** Persist a JSON-serializable piece of UI state in localStorage. */
export function useStoredState<T>(key: string, initialValue: T): [T, (value: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return initialValue;
      const parsed = JSON.parse(stored) as T;
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        initialValue !== null &&
        typeof initialValue === 'object' &&
        !Array.isArray(parsed)
      ) {
        return { ...initialValue, ...parsed };
      }
      return parsed;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private windows; the app still works.
    }
  }, [key, value]);

  return [value, setValue];
}
