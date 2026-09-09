import { SetupBanner } from './SetupBanner';
import { useFileStorageConfigured } from '../../hooks/useSetupStatus';

export function FileStorageBanner() {
  const configured = useFileStorageConfigured();
  if (configured !== false) return null;

  return (
    <SetupBanner
      title="File storage isn't set up"
      description="Uploads will fall back to the host environment's default credentials until a storage project and service-account key are configured."
      ctaLabel="Set up file storage"
      ctaHref="/settings/file-storage"
      learnMoreTitle="Setting up file storage"
      learnMoreContent={
        <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <li>Create a Google Cloud Storage project with a public bucket and a private bucket.</li>
          <li>Generate a service-account JSON key with access to those buckets.</li>
          <li>
            In Settings &gt; File Storage, enter the project ID and bucket names, then paste in the service-account
            key.
          </li>
        </ol>
      }
    />
  );
}
