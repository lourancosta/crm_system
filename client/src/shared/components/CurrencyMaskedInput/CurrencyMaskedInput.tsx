import type { CSSProperties, ClipboardEvent, KeyboardEvent } from 'react';
import { centsFromDecimalString, decimalStringFromCents, formatMaskedCents } from '../../utils/numberInput';

// Well within Number-safe range, and generous enough that no real unit
// price/discount amount could ever hit it — just a backstop against a
// runaway paste or stuck key.
const MAX_CENTS = 999_999_999_999;

type Props = {
  value: string; // plain decimal string, e.g. "1234.56" — same shape every other line-item field already uses
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
  style?: CSSProperties;
  // Renders a "$" inside the field's left edge — the app's standard
  // money-input look (e.g. invoice/quote unit price, Register Payment
  // amount, Issue Credit Memo amount). Defaults on; turn off inside a
  // compound %/$ toggle control (a discount row's kind Select sitting right
  // next to this input), where the adjacent selector already indicates
  // currency and a second "$" would be redundant and cramped.
  showPrefix?: boolean;
};

// POS-style money input: typed digits shift in from the right (0.12 -> 1.23
// -> 123.45 -> 1,234.56) instead of landing wherever a native number input's
// caret happens to be. Value/onChange stay plain decimal strings so every
// existing Number(row.unitPrice)-style computation is untouched.
export function CurrencyMaskedInput({ value, onChange, onBlur, className, id, required, placeholder, style, showPrefix = true }: Props) {
  const cents = centsFromDecimalString(value);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      onChange(decimalStringFromCents(Math.floor(cents / 10)));
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      onChange(decimalStringFromCents(Math.min(cents * 10 + Number(e.key), MAX_CENTS)));
      return;
    }
    if (!['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (!digits) return;
    let next = cents;
    for (const digit of digits) {
      next = Math.min(next * 10 + Number(digit), MAX_CENTS);
    }
    onChange(decimalStringFromCents(next));
  }

  const input = (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      className={className}
      style={showPrefix ? { ...style, paddingLeft: 22, height: '100%', boxSizing: 'border-box' } : style}
      value={formatMaskedCents(cents)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onChange={() => {}}
      onBlur={onBlur}
      placeholder={placeholder}
      required={required}
    />
  );

  if (!showPrefix) return input;

  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          fontSize: 14,
          pointerEvents: 'none',
        }}
      >
        $
      </span>
      {input}
    </div>
  );
}
