import { SetupBanner } from './SetupBanner';
import { useFeatureAssignmentConfigured } from '../../hooks/useSetupStatus';

export function QuoteReminderBanner() {
  const configured = useFeatureAssignmentConfigured('quote_signature_request');
  if (configured !== false) return null;

  return (
    <SetupBanner
      title="Quote signature emails aren't set up"
      description="Buyers won't receive an email prompting them to sign a published quote until an email account is assigned to this feature."
      ctaLabel="Set up quote signature emails"
      ctaHref="/settings/objects?object=quotes&tab=quote-signature"
      learnMoreTitle="Setting up quote signature emails"
      learnMoreContent={
        <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <li>Add a real SMTP mailbox under Settings &gt; Email Accounts &gt; Accounts, if you haven't already.</li>
          <li>
            Assign that account to "Quote signature requests" under Settings &gt; Email Accounts &gt; Feature
            Assignments.
          </li>
        </ol>
      }
    />
  );
}
