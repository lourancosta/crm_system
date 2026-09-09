import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../shared/components/Button/Button';
import { Modal } from '../../shared/components/Modal/Modal';
import { Select } from '../../shared/components/Dropdown/Select';
import type { SelectOption } from '../../shared/components/Dropdown/Select';
import { CurrencyMaskedInput } from '../../shared/components/CurrencyMaskedInput/CurrencyMaskedInput';
import { roundToDecimals, roundToInteger } from '../../shared/utils/numberInput';
import type { InvoiceDiscountKind } from '../../shared/types/index';
import styles from './EditLineItemRowModal.module.css';

export type EditableLineItemFields = {
  name: string;
  description: string;
  unitPrice: string;
  quantity: string;
  discountKind: InvoiceDiscountKind;
  discountPct: string;
  discountAmount: string;
};

type Props = {
  initial: EditableLineItemFields;
  onSave: (patch: EditableLineItemFields) => void;
  onClose: () => void;
};

const DISCOUNT_KIND_OPTIONS: SelectOption<InvoiceDiscountKind>[] = [
  { value: 'percentage', label: '%' },
  { value: 'amount', label: '$' },
];

export function EditLineItemRowModal({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [unitPrice, setUnitPrice] = useState(initial.unitPrice);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [discountKind, setDiscountKind] = useState<InvoiceDiscountKind>(initial.discountKind);
  const [discountPct, setDiscountPct] = useState(initial.discountPct);
  const [discountAmount, setDiscountAmount] = useState(initial.discountAmount);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ name, description, unitPrice, quantity, discountKind, discountPct, discountAmount });
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
          <label>Quantity</label>
          <input
            type="number"
            step="1"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={() => setQuantity((v) => roundToInteger(v))}
            required
          />
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
