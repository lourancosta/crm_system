import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { QuotePreviewCard } from './QuotePreviewCard';
import { QuoteSignatureForm } from './QuoteSignatureForm';
import type { BuyerContact } from './QuotePreviewCard';
import type { LineItem, PublicQuoteSignerStatus, PublicSignerInfo, Quote, QuoteDiscount } from '../../shared/types/index';
import sigStyles from './QuoteSignatureForm.module.css';
import styles from './QuotePreviewPage.module.css';

// Unauthenticated, like InvoicePreviewPage — a Published quote's link is
// meant to be shared with the buyer, who never logs in. Recalling a quote
// back to Draft (see quote.service.ts's recallQuote) makes /api/public/
// quotes/:id 404 again (see public.routes.ts's requirePublishedQuote), so
// this page stops being reachable the same way a still-draft invoice is.
//
// Signing itself is token-bound: each required contact gets their own
// emailed link (?signerToken=...) rather than anyone on this shared page
// being able to sign as anyone. With no token in the URL, the page just
// shows a read-only list of who's signed and who's still pending.
export function QuotePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const signerToken = searchParams.get('signerToken') ?? '';

  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [discounts, setDiscounts] = useState<QuoteDiscount[]>([]);
  const [buyers, setBuyers] = useState<BuyerContact[]>([]);
  const [signerInfo, setSignerInfo] = useState<PublicSignerInfo | null>(null);
  const [signerStatuses, setSignerStatuses] = useState<PublicQuoteSignerStatus[]>([]);
  const [signerError, setSignerError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  function loadSignerState() {
    if (!id) return;
    if (signerToken) {
      setSignerError('');
      fetch(`/api/public/quotes/${id}/signer?token=${encodeURIComponent(signerToken)}`)
        .then((r) => {
          if (!r.ok) throw new Error('This signing link is invalid or has expired.');
          return r.json();
        })
        .then(setSignerInfo)
        .catch((err) => setSignerError(err instanceof Error ? err.message : 'This signing link is invalid or has expired.'));
    } else {
      fetch(`/api/public/quotes/${id}/signers`)
        .then((r) => r.json())
        .then(setSignerStatuses)
        .catch(() => {});
    }
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/public/quotes/${id}`).then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      }),
      fetch(`/api/public/quotes/${id}/line-items`).then((r) => r.json()),
      fetch(`/api/public/quotes/${id}/discounts`).then((r) => r.json()),
      fetch(`/api/public/quotes/${id}/contacts`).then((r) => r.json()),
    ])
      .then(([q, lineItems, quoteDiscounts, contacts]) => {
        setQuote(q);
        setItems(lineItems);
        setDiscounts(quoteDiscounts);
        setBuyers(contacts);
      })
      .catch(() => setError('Quote not found or no longer available.'))
      .finally(() => setIsLoading(false));
    loadSignerState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signerToken]);

  if (isLoading) {
    return (
      <div className={styles['qp-loading']}>
        <div className={styles['qp-spinner']} />
        Loading quote…
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className={styles['qp-error']}>
        <span className={styles['qp-error-logo']}>CRM System</span>
        <div className={styles['qp-error-message']}>{error || 'Quote not found.'}</div>
        <p className={styles['qp-error-hint']}>
          If you were trying to access this quote, please reach out to your Account Manager.
        </p>
      </div>
    );
  }

  return (
    <div className={styles['qp-preview']}>
      <div className={`${styles['qp-actions']} ${styles['no-print']}`}>
        <button className={styles['qp-print-btn']} onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <QuotePreviewCard quote={quote} items={items} discounts={discounts} buyers={buyers} />

      {signerToken ? (
        signerError ? (
          <div className={sigStyles['sig-confirmation']} style={{ color: '#dc2626' }}>
            {signerError}
          </div>
        ) : signerInfo?.signed ? (
          <div className={sigStyles['sig-confirmation']}>
            <CheckCircle2 size={20} />
            You ({signerInfo.signerName}) already signed this
            {signerInfo.signedAt &&
              ` on ${new Date(signerInfo.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
            .
          </div>
        ) : (
          signerInfo && (
            <QuoteSignatureForm
              quoteId={quote.id}
              token={signerToken}
              signerName={signerInfo.signerName}
              onSigned={loadSignerState}
            />
          )
        )
      ) : (
        signerStatuses.length > 0 && (
          <div className={sigStyles['sig-card']}>
            <h2 className={sigStyles['sig-title']}>Signatures</h2>
            <p className={sigStyles['sig-subtitle']}>Each signer was sent their own link to review and sign.</p>
            {signerStatuses.map((s) => (
              <div key={s.id} className={sigStyles['sig-list-row']}>
                <span>{s.signerName}</span>
                <span
                  className={`${sigStyles['sig-list-status']} ${
                    sigStyles[s.signed ? 'sig-list-status--signed' : 'sig-list-status--pending']
                  }`}
                >
                  {s.signed ? 'Signed' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
