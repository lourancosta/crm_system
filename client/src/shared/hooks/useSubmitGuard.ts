import { useCallback, useRef, useState } from 'react';

// Wraps a submit/action handler so a second invocation is ignored while the
// first is still in flight — guards against both a double-click AND a rapid
// double Enter-press (which submits a form directly, bypassing whatever
// `disabled` state the button re-renders with). The ref check is
// synchronous, closing a race a plain `isSubmitting` state var can't: React
// batches the re-render that would disable the button, so two triggers
// fired in the same tick could otherwise both pass a state-only check.
//
// Usage: const [handleSubmit, isSubmitting] = useSubmitGuard(async (e) => {
//   e.preventDefault();
//   await onSubmit(input);
// });
// <form onSubmit={handleSubmit}>...<Button type="submit" isLoading={isSubmitting}>Save</Button></form>
export function useSubmitGuard<Args extends unknown[]>(handler: (...args: Args) => Promise<void> | void) {
  const pendingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guarded = useCallback(
    async (...args: Args) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setIsSubmitting(true);
      try {
        await handler(...args);
      } finally {
        pendingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [handler],
  );

  return [guarded, isSubmitting] as const;
}
