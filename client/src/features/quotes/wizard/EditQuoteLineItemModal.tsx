import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../shared/components/Button/Button';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Select } from '../../../shared/components/Dropdown/Select';
import type { SelectOption } from '../../../shared/components/Dropdown/Select';
import { CurrencyMaskedInput } from '../../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { roundToDecimals } from '../../../shared/utils/numberInput';
import type { BillingStartType, QuoteDiscountKind } from '../../../shared/types/index';
import styles from './EditQuoteLineItemModal.module.css';

// Quote-only variant of invoices' EditLineItemRowModal — invoices have no
// billing-start/term concept, so this stays separate rather than growing the
// shared component with fields it would never use.
export type EditableQuoteLineItemFields = {
  name: string;
  description: string;
  unitPrice: string;
  discountKind: QuoteDiscountKind;
  discountPct: string;
  discountAmount: string;
  billingStartType: BillingStartType;
  billingStartDate: string;
  billingStartDelayDays: string;
  billingStartDelayMonths: string;
};

type Props = {
  initial: EditableQuoteLineItemFields;
  onSave: (patch: EditableQuoteLineItemFields) => void;
  onClose: () => void;
};

type DelayType = Exclude<BillingStartType, 'at_payment'>;

const DELAY_TYPE_OPTIONS: SelectOption<DelayType>[] = [
  { value: 'custom_date', label: 'Custom date' },
  { value: 'delayed_days', label: 'Delayed start (days)' },
  { value: 'delayed_months', label: 'Delayed start (months)' },
];

const DISCOUNT_KIND_OPTIONS: SelectOption<QuoteDiscountKind>[] = [
  { value: 'percentage', label: '%' },
  { value: 'amount', label: '$' },
];

export function EditQuoteLineItemModal({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [unitPrice, setUnitPrice] = useState(initial.unitPrice);
  const [discountKind, setDiscountKind] = useState<QuoteDiscountKind>(initial.discountKind);
  const [discountPct, setDiscountPct] = useState(initial.discountPct);
  const [discountAmount, setDiscountAmount] = useState(initial.discountAmount);

  const [delayBillingStart, setDelayBillingStart] = useState(initial.billingStartType !== 'at_payment');
  const [billingStartType, setBillingStartType] = useState<DelayType>(
    initial.billingStartType !== 'at_payment' ? initial.billingStartType : 'custom_date',
  );
  const [billingStartDate, setBillingStartDate] = useState(initial.billingStartDate);
  const [billingStartDelayDays, setBillingStartDelayDays] = useState(initial.billingStartDelayDays);
  const [billingStartDelayMonths, setBillingStartDelayMonths] = useState(initial.billingStartDelayMonths);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({
      name,
      description,
      unitPrice,
      discountKind,
      discountPct,
      discountAmount,
      billingStartType: delayBillingStart ? billingStartType : 'at_payment',
      billingStartDate,
      billingStartDelayDays,
      billingStartDelayMonths,
    });
    onClose();
  }

  return (
    <Modal title="Edit Line Item" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Product name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={9} />
        </div>
        <div className="form-group">
          <label>Unit price</label>
          <CurrencyMaskedInput value={unitPrice} onChange={setUnitPrice} required />
        </div>
        <div className="form-group">
          <label>Unit discount</label>
          <div className={styles['discount-group']}>
            <Select
              value={discountKind}
              onChange={setDiscountKind}
              options={DISCOUNT_KIND_OPTIONS}
              ariaLabel="Discount kind"
              className={styles['discount-kind-select']}
            />
            {discountKind === 'percentage' ? (
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={styles['discount-value-input']}
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                onBlur={() => setDiscountPct((v) => roundToDecimals(v, 2))}
              />
            ) : (
              <CurrencyMaskedInput
                className={styles['discount-value-input']}
                value={discountAmount}
                onChange={setDiscountAmount}
              />
            )}
          </div>
        </div>

        <label className={styles['checkbox-row']}>
          <input
            type="checkbox"
            checked={delayBillingStart}
            onChange={(e) => setDelayBillingStart(e.target.checked)}
          />
          Delay billing start date
        </label>

        {delayBillingStart && (
          <>
            <div className="form-group">
              <label>Billing start date</label>
              <Select value={billingStartType} onChange={setBillingStartType} options={DELAY_TYPE_OPTIONS} ariaLabel="Billing start" />
            </div>
            {billingStartType === 'custom_date' && (
              <div className="form-group">
                <label>Start date</label>
                <input
                  type="date"
                  value={billingStartDate}
                  onChange={(e) => setBillingStartDate(e.target.value)}
                  required
                />
              </div>
            )}
            {billingStartType === 'delayed_days' && (
              <div className="form-group">
                <label>Days after payment</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={billingStartDelayDays}
                  onChange={(e) => setBillingStartDelayDays(e.target.value)}
                  required
                />
              </div>
            )}
            {billingStartType === 'delayed_months' && (
              <div className="form-group">
                <label>Months after payment</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={billingStartDelayMonths}
                  onChange={(e) => setBillingStartDelayMonths(e.target.value)}
                  required
                />
              </div>
            )}
          </>
        )}

        <div className="settings-form-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
