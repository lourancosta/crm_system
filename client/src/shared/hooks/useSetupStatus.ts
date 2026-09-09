import { useEffect, useState } from 'react';
import { emailAccountsApi } from '../../features/settings/email-accounts/api/emailAccounts';
import { supportInboxApi } from '../../features/tickets/api/supportInbox';
import { googleStorageSettingsApi } from '../../features/settings/google-storage/api/googleStorageSettings';
import type { EmailFeature } from '../types/index';

// All three hooks return null while loading so callers can render nothing
// (no flash of a banner that immediately disappears) until the real state
// is known — see the per-feature banner wrappers in shared/components/SetupBanner.

export function useFeatureAssignmentConfigured(feature: EmailFeature): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    emailAccountsApi.getFeatureAssignments().then((assignments) => {
      if (cancelled) return;
      setConfigured(assignments.some((a) => a.feature === feature && !!a.emailAccountId));
    });
    return () => {
      cancelled = true;
    };
  }, [feature]);

  return configured;
}

export function useSupportInboxConfigured(): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    supportInboxApi.list().then((inboxes) => {
      if (cancelled) return;
      setConfigured(inboxes.some((i) => i.enabled));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return configured;
}

export function useFileStorageConfigured(): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    googleStorageSettingsApi.get().then((settings) => {
      if (cancelled) return;
      setConfigured(settings.hasServiceAccountKey);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return configured;
}
