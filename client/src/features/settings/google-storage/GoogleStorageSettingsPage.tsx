import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { SettingsCard } from '../../../shared/components/SettingsCard/SettingsCard';
import { googleStorageSettingsApi } from './api/googleStorageSettings';
import type { GoogleStorageSettings } from './api/googleStorageSettings';
import styles from './GoogleStorageSettingsPage.module.css';

const EMPTY: GoogleStorageSettings = {
  projectId: '',
  publicBucket: '',
  privateBucket: '',
  publicUrl: '',
  hasServiceAccountKey: false,
};

// Config + credential for the Google Cloud Storage buckets the app uses for
// file uploads (KB media, avatars). Previously GCS_PROJECT_ID/GCS_PUBLIC_BUCKET/
// GCS_PRIVATE_BUCKET/GCS_PUBLIC_URL/GOOGLE_APPLICATION_CREDENTIALS env vars -
// the service-account JSON key is now stored encrypted in the DB instead.
export function GoogleStorageSettingsPage() {
  const [values, setValues] = useState<GoogleStorageSettings>(EMPTY);
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    googleStorageSettingsApi
      .get()
      .then((d) => setValues({ ...EMPTY, ...d }))
      .catch(() => setSaveMsg('Failed to load'))
      .finally(() => setIsLoading(false));
  }, []);

  function set<K extends keyof GoogleStorageSettings>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveMsg('');
    try {
      const { hasServiceAccountKey: _ignored, ...rest } = values;
      const updated = await googleStorageSettingsApi.update({
        ...rest,
        ...(serviceAccountKey ? { serviceAccountKey } : {}),
      });
      setValues({ ...EMPTY, ...updated });
      setServiceAccountKey('');
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>File Storage</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Google Cloud Storage project, buckets, and the service-account credential used for file uploads (knowledge
        base media, avatars).
      </p>

      <form onSubmit={handleSave}>
        <div style={{ maxWidth: 560, marginBottom: 16 }}>
          <SettingsCard title="Project & Buckets">
            <div className="settings-form">
              <div className="form-group">
                <label>Project ID</label>
                <input
                  value={values.projectId ?? ''}
                  disabled={isLoading}
                  onChange={(e) => set('projectId', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Public bucket</label>
                <input
                  value={values.publicBucket ?? ''}
                  disabled={isLoading}
                  onChange={(e) => set('publicBucket', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Private bucket</label>
                <input
                  value={values.privateBucket ?? ''}
                  disabled={isLoading}
                  onChange={(e) => set('privateBucket', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Public URL override</label>
                <input
                  value={values.publicUrl ?? ''}
                  disabled={isLoading}
                  placeholder="https://storage.googleapis.com/your-public-bucket-name"
                  onChange={(e) => set('publicUrl', e.target.value)}
                />
              </div>
            </div>
          </SettingsCard>
        </div>

        <div style={{ maxWidth: 560, marginBottom: 16 }}>
          <SettingsCard title="Service Account Credential">
            <div className="settings-form">
              <div className="form-group">
                <label>
                  Service account JSON key
                  {values.hasServiceAccountKey && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (leave blank to keep the current key)</span>
                  )}
                </label>
                <textarea
                  rows={8}
                  value={serviceAccountKey}
                  disabled={isLoading}
                  required={!values.hasServiceAccountKey}
                  placeholder={values.hasServiceAccountKey ? '••••••••  (a key is already configured)' : 'Paste the full service-account JSON key file contents'}
                  onChange={(e) => setServiceAccountKey(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
              {!values.hasServiceAccountKey && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No key configured yet — uploads fall back to the host environment's default credentials until one is
                  set here.
                </p>
              )}
            </div>
          </SettingsCard>
        </div>

        <div className="settings-form-footer" style={{ maxWidth: 560 }}>
          <Button type="submit" disabled={isSaving || isLoading}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
          {saveMsg && <span className={saveMsg === 'Saved' ? styles['save-success'] : styles['save-error']}>{saveMsg}</span>}
        </div>
      </form>
    </div>
  );
}
