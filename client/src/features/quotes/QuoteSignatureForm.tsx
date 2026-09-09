import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import SignaturePad from 'signature_pad';
import styles from './QuoteSignatureForm.module.css';

type Props = {
  quoteId: string;
  token: string;
  signerName: string;
  onSigned: () => void;
};

// The signer's identity is bound to their own individually emailed token
// (see quote.service.ts's publishQuote/getSignerByToken) — unlike the
// earlier single-signer version of this form, there's no free-typed name/
// email here anymore; whoever holds this link is already known.
export function QuoteSignatureForm({ quoteId, token, signerName, onSigned }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = canvas!.getBoundingClientRect();
      canvas!.width = width * ratio;
      canvas!.height = height * ratio;
      canvas!.getContext('2d')?.scale(ratio, ratio);
      padRef.current?.clear();
    }

    padRef.current = new SignaturePad(canvas, { backgroundColor: 'rgba(0,0,0,0)' });
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function handleClear() {
    padRef.current?.clear();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!padRef.current || padRef.current.isEmpty()) {
      setError('Please draw your signature.');
      return;
    }
    if (!agreed) {
      setError('Please confirm you agree to accept this quote.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/quotes/${quoteId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signatureImage: padRef.current.toDataURL('image/png'),
          agreedToTerms: true,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to submit signature');
      }
      onSigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit signature');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles['sig-card']}>
      <h2 className={styles['sig-title']}>Accept & Sign</h2>
      <p className={styles['sig-subtitle']}>Signing as {signerName}. Review the quote above, then sign below.</p>

      {error && <div className={styles['sig-error']}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles['sig-canvas-wrap']}>
          <canvas ref={canvasRef} className={styles['sig-canvas']} />
          <button type="button" className={styles['sig-clear-btn']} onClick={handleClear}>
            Clear
          </button>
        </div>

        <label className={styles['sig-agree']}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          I have reviewed this quote and agree to accept it.
        </label>

        <button type="submit" className={styles['sig-submit-btn']} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Accept & Sign'}
        </button>
      </form>
    </div>
  );
}
