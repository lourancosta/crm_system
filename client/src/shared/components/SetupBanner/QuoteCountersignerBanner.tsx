import { useEffect, useState } from 'react';
import { SetupBanner } from './SetupBanner';
import { useFeatureAssignmentConfigured } from '../../hooks/useSetupStatus';
import { quotesApi } from '../../../features/quotes/api/quotes';

export function QuoteCountersignerBanner() {
  const emailConfigured = useFeatureAssignmentConfigured('quote_countersign_request');
  const [signerConfigured, setSignerConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    quotesApi.getSignerSetting().then((setting) => {
      if (!cancelled) setSignerConfigured(!!setting.defaultSignerUserId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (emailConfigured === null || signerConfigured === null) return null;
  if (emailConfigured && signerConfigured) return null;

  return (
    <SetupBanner
      title="Quote countersigning isn't fully set up"
      description="Once buyers sign, quotes won't be countersigned on your behalf until both an internal countersigner and a sending email account are set."
      ctaLabel="Set up quote countersigning"
      ctaHref="/settings/objects?object=quotes&tab=quote-signature"
      learnMoreTitle="Setting up quote countersigning"
      learnMoreContent={
        <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <li>
            Go to Settings &gt; Objects &gt; Quotes &gt; Signature and choose the internal user who countersigns
            quotes on your behalf.
          </li>
          <li>
            Add a real SMTP mailbox under Settings &gt; Email Accounts &gt; Accounts, then assign it to "Quote
            countersignature requests" under Feature Assignments.
          </li>
        </ol>
      }
    />
  );
}
