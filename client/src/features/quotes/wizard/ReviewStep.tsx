import { QuoteWizardPreview } from './QuoteWizardPreview';
import type { SenderInfo } from './YourInfoStep';
import type { QuoteDetails } from './DetailsStep';

type Props = {
  quoteId: string | null;
  dealName: string | null;
  companyName: string | null;
  buyerContactIds: string[];
  sender: SenderInfo;
  senderAvatarUrl: string | null;
  details: QuoteDetails;
};

// Full-size version of the same live preview every other step shows
// shrunk in its side panel — the last stop before "Create" publishes it.
export function ReviewStep(props: Props) {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
      <h2 style={{ marginBottom: 8 }}>Review</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        Check everything below before creating the quote — once created, it's published and shareable via its own
        link.
      </p>
      <QuoteWizardPreview {...props} fullSize />
    </div>
  );
}
