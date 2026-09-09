import { useEffect, useState } from 'react';
import { QuotePreviewCard } from '../QuotePreviewCard';
import { quotesApi } from '../api/quotes';
import { contactsApi } from '../../contacts/api/contacts';
import type { SenderInfo } from './YourInfoStep';
import type { QuoteDetails } from './DetailsStep';
import type { Contact, LineItem, Quote, QuoteDiscount } from '../../../shared/types/index';

type Props = {
  quoteId: string | null;
  dealName: string | null;
  companyName: string | null;
  buyerContactIds: string[];
  sender: SenderInfo;
  // The sender is always the currently logged-in user while the wizard is
  // still in progress (a saved quote's sender photo instead gets resolved
  // server-side by email match — see quote.repository.ts's hsSenderAvatarUrl)
  // — this is just that same logged-in user's own avatarUrl (from useAuth()),
  // threaded down so the live preview shows their real photo, not initials.
  senderAvatarUrl: string | null;
  details: QuoteDetails;
  // The Review step wants the actual document at (near-)full size instead
  // of the shrunk side-panel version every other step uses.
  fullSize?: boolean;
};

// Builds the same Quote/LineItem/QuoteDiscount shape QuotePreviewCard expects
// out of the wizard's own in-progress (not-yet-saved) state, so the preview
// reflects what's currently typed/selected rather than only what the last
// Save/Next click persisted. Line items/discounts are the exception — the
// Line Items step commits each one to the backend as it's edited, so they're
// simply fetched by quoteId (and refetched on every mount, i.e. every time
// this panel comes back into view after a step switch) instead of tracked
// as separate wizard state.
export function QuoteWizardPreview({
  quoteId,
  dealName,
  companyName,
  buyerContactIds,
  sender,
  senderAvatarUrl,
  details,
  fullSize,
}: Props) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [discounts, setDiscounts] = useState<QuoteDiscount[]>([]);
  const [buyers, setBuyers] = useState<Contact[]>([]);

  useEffect(() => {
    if (!quoteId) {
      setItems([]);
      setDiscounts([]);
      return;
    }
    Promise.all([quotesApi.getLineItems(quoteId), quotesApi.getDiscounts(quoteId)])
      .then(([lineItems, quoteDiscounts]) => {
        setItems(lineItems);
        setDiscounts(quoteDiscounts);
      })
      .catch(() => {});
  }, [quoteId]);

  useEffect(() => {
    if (buyerContactIds.length === 0) {
      setBuyers([]);
      return;
    }
    Promise.all(buyerContactIds.map((id) => contactsApi.getById(id)))
      .then(setBuyers)
      .catch(() => setBuyers([]));
  }, [buyerContactIds]);

  const now = new Date().toISOString();
  const draftQuote: Quote = {
    id: quoteId ?? 'draft',
    hubspotId: quoteId ? `local-${quoteId}` : 'draft',
    archived: false,
    hsTitle: details.name || dealName || 'Quote',
    hsQuoteNumber: null,
    hsQuoteStatus: 'DRAFT',
    hsQuoteAmount: null,
    hsTcv: null,
    hsCurrency: 'USD',
    hsDealName: dealName,
    hsExpirationDate: details.expirationDate || null,
    hsLastPublishedDate: null,
    isSigned: false,
    hsSignedDate: null,
    hubspotOwnerId: null,
    ownerName: null,
    companyId: null,
    companyName,
    hsSenderFirstname: sender.firstname || null,
    hsSenderLastname: sender.lastname || null,
    hsSenderJobtitle: sender.jobtitle || null,
    hsSenderEmail: sender.email || null,
    hsSenderPhone: sender.phone || null,
    hsSenderCompanyName: sender.companyName || null,
    hsSenderAvatarUrl: senderAvatarUrl,
    hsComments: details.commentsToBuyer || null,
    hsTerms: details.purchaseTerms || null,
    createdAt: now,
    updatedAt: now,
  };

  if (fullSize) {
    return <QuotePreviewCard quote={draftQuote} items={items} discounts={discounts} buyers={buyers} />;
  }

  return (
    // `zoom` (not `transform: scale`) so the shrunk size actually affects
    // layout/height, not just paint — a scale() transform would keep
    // reserving the full 860px-tall box underneath, leaving a giant blank
    // gap below the visibly-smaller card.
    <div style={{ zoom: 0.72 }}>
      <QuotePreviewCard quote={draftQuote} items={items} discounts={discounts} buyers={buyers} />
    </div>
  );
}
