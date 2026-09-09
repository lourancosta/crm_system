import type { ReactNode } from 'react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { Layout } from '../../shared/components/Layout/Layout';
import { Select } from '../../shared/components/Dropdown/Select';
import { usePersistedState } from '../../shared/hooks/usePersistedState';
import { KB_LANGUAGES } from '../../shared/types/index';

const LANGUAGE_LABELS: Record<string, string> = { en: 'English', pt: 'Português', es: 'Español' };

// Internal CRM users get the full app chrome and see every article regardless
// of audience tag. Anonymous visitors (the actual public link) get the
// standalone page, filtered to audience=public only.
export function useKbAudience(): { audience: string | undefined; ready: boolean } {
  const { user, isLoading } = useAuth();
  return { audience: user ? undefined : 'public', ready: !isLoading };
}

// Which language the KB browsing pages (home/category/article listings) are
// shown in - a per-browser preference, independent of the caller's tier.
// Defaults to English; persists across visits.
export function useKbLanguage() {
  return usePersistedState<string>('pref:kb:language', 'en');
}

function KbLanguageSwitcher() {
  const [language, setLanguage] = useKbLanguage();
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50 }}>
      <Select
        value={language}
        onChange={setLanguage}
        options={KB_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
        ariaLabel="Knowledge base language"
      />
    </div>
  );
}

export function KnowledgeBaseShell({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="loading">Loading...</div>;

  const content = (
    <>
      <KbLanguageSwitcher />
      {children}
    </>
  );

  if (user) return <Layout>{content}</Layout>;
  return content;
}
