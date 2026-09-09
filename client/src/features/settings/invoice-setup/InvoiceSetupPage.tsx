import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { invoicesApi } from '../../invoices/api/invoices';

export function InvoiceSetupPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [nextNumber, setNextNumber] = useState<string | null>(null);

  useEffect(() => {
    invoicesApi.getNextNumber().then((r) => setNextNumber(r.nextNumber));
  }, []);

  return (
    <div>
      {!hideHeader && (
        <div className="page-header">
          <h1>Setup</h1>
        </div>
      )}
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Manage the information you collect about your invoices.</p>

      <div className="form-group" style={{ maxWidth: 320 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Next invoice number
          <span title="Automatically assigned to the next invoice you create." style={{ display: 'inline-flex' }}>
            <Info size={14} style={{ color: 'var(--text-muted)' }} />
          </span>
        </label>
        <input value={nextNumber ?? '—'} disabled />
      </div>
    </div>
  );
}
