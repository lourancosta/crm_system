import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { AccountDefaults } from "../settings/account-defaults/api/accountDefaults";
import type { AssociatedCreditMemo, CreditMemoApplication, Invoice, InvoiceDiscount, LineItem } from "../../shared/types/index";
import styles from "./InvoicePreviewPage.module.css";

// Falls back to placeholder values if Account Defaults hasn't been filled in
// yet (e.g. a fresh environment) — keeps this page from ever showing blank
// company/bank info.
const FALLBACK: AccountDefaults = {
  companyName: "CRM System Inc",
  companyDomain: null,
  address: "123 Main St",
  address2: null,
  city: "Anytown",
  state: "CA",
  zip: "00000",
  country: "USA",
  bankName: "CRM System Inc",
  bankRoutingNumber: "000000000",
  bankSwiftCode: null,
  bankAccountNumber: "000000000",
  billingContactEmail: "backoffice@example.com",
  bankAddress: null,
  bankAddress2: null,
  bankCity: null,
  bankState: null,
  bankZip: null,
  bankCountry: null,
};

const STATUS_COLOR: Record<string, string> = {
  open: "#eab308",
  paid: "#16a34a",
  voided: "#dc2626",
  draft: "#6b7280",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// item.quantity comes straight from the DB's decimal(20,6) column (e.g.
// "1.000000") — always a whole number in practice, just not formatted as one.
function fmtQuantity(val: string | null | undefined) {
  if (val === null || val === undefined || val === "") return "—";
  return Math.round(Number(val)).toString();
}

// Same DB-precision-leak reasoning as fmtQuantity above, for a discount %.
function fmtPercent(val: string | null | undefined) {
  if (val === null || val === undefined || val === "") return "—";
  const num = Number(val);
  if (Number.isNaN(num)) return "—";
  return `${Math.round(num * 100) / 100}%`;
}

function fmtCurrency(val: string | null | undefined, currency: string | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function fmtType(val: string | null) {
  if (!val) return "—";
  if (val.toLowerCase() === "msp") return "MSP";
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Groups line items by customerName, preserving each item's relative order
// (already hs_position_on_quote-sorted by the API) and grouping every
// occurrence of a customer together even if their items aren't contiguous.
// Group headers are only rendered when there's more than one group — most
// invoices are single-customer, and a lone "Other" header would just be noise.
function groupByCustomer(items: LineItem[]): { customer: string | null; items: LineItem[] }[] {
  const order: (string | null)[] = [];
  const byCustomer = new Map<string | null, LineItem[]>();

  for (const item of items) {
    const key = item.customerName?.trim() || null;
    if (!byCustomer.has(key)) {
      byCustomer.set(key, []);
      order.push(key);
    }
    byCustomer.get(key)!.push(item);
  }

  return order.map((customer) => ({ customer, items: byCustomer.get(customer)! }));
}

// item.amount is already post-discount (e.g. $460 unit price at 30% off is
// stored as amount: 322), so the group subtotal is a plain sum — no need to
// re-apply hsDiscountPercentage on top of it.
function groupSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

// Mirrors invoice.repository.ts's recalculateAmountBilled: every global
// discount is computed off the same line-items subtotal, not compounded
// through each other.
function discountAmount(discount: InvoiceDiscount, subtotal: number): number {
  const value = Number(discount.value) || 0;
  return discount.kind === 'percentage' ? subtotal * (value / 100) : value;
}

export function InvoicePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [discounts, setDiscounts] = useState<InvoiceDiscount[]>([]);
  const [company, setCompany] = useState<AccountDefaults>(FALLBACK);
  const [creditMemoApplications, setCreditMemoApplications] = useState<CreditMemoApplication[]>([]);
  const [creditMemos, setCreditMemos] = useState<AssociatedCreditMemo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Separate from the invoice fetch below — if this one fails, the page
    // still renders using FALLBACK instead of failing the whole invoice.
    fetch(`/api/public/account-defaults`)
      .then((r) => r.json())
      .then((defaults: AccountDefaults) => setCompany({ ...FALLBACK, ...defaults }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/public/invoices/${id}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
      fetch(`/api/public/invoices/${id}/line-items`).then((r) => r.json()),
      fetch(`/api/public/invoices/${id}/discounts`).then((r) => r.json()),
      fetch(`/api/public/invoices/${id}/credit-memo-applications`).then((r) => r.json()),
      fetch(`/api/public/invoices/${id}/credit-memos`).then((r) => r.json()),
    ])
      .then(([invoice, lineItems, invoiceDiscounts, applications, memos]) => {
        setInv(invoice);
        setItems(lineItems);
        setDiscounts(invoiceDiscounts);
        setCreditMemoApplications(applications);
        setCreditMemos(memos);
      })
      .catch(() => setError("Invoice not found or no longer available."))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles['inv-preview-loading']}>
        <div className={styles['inv-preview-spinner']} />
        Loading invoice…
      </div>
    );
  }

  if (error || !inv) {
    return <div className={styles['inv-preview-error']}>{error || "Invoice not found."}</div>;
  }

  const statusColor = STATUS_COLOR[(inv.hsInvoiceStatus ?? "").toLowerCase()] ?? "#6b7280";
  const currency = inv.hsCurrency ?? "USD";
  const groups = groupByCustomer(items);
  const showGroupHeaders = groups.length > 1;
  // Sum of line items only (post-line-item-discount, pre-global-discount) -
  // hsAmountBilled already has every global discount below netted out of it.
  const lineItemsSubtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const recipientLines = [
    inv.hsInvoiceLatestCompanyName,
    inv.hsInvoiceLatestContactEmail,
    [inv.hsRecipientCompanyAddress].filter(Boolean).join(", ") || null,
    [inv.hsRecipientCompanyCity, inv.hsRecipientCompanyState].filter(Boolean).join(", ") || null,
    [inv.hsRecipientCompanyZip, inv.hsRecipientCompanyCountry].filter(Boolean).join(" ") || null,
  ].filter(Boolean);

  // Only shown when at least one bank-address field has been filled in —
  // most banks are identified well enough by name/routing/account alone.
  const bankAddressLines = [
    company.bankAddress,
    company.bankAddress2,
    [company.bankCity, company.bankState].filter(Boolean).join(", "),
    [company.bankZip, company.bankCountry].filter(Boolean).join(" "),
  ].filter(Boolean) as string[];

  return (
    <div className={styles['inv-preview']}>
      {/* Print button — hidden on print */}
      <div className={`${styles['inv-preview-actions']} ${styles['no-print']}`}>
        <button className={styles['inv-print-btn']} onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className={styles['inv-page']}>
        {/* Header */}
        <div className={styles['inv-header']}>
          <div className={styles['inv-brand']}>
            <span className={styles['inv-brand-logo']}>CRM System</span>
          </div>
          <div className={styles['inv-title-block']}>
            <span className={styles['inv-title-label']}>INVOICE</span>
            <span className={styles['inv-title-number']}>{inv.hsNumber}</span>
          </div>
        </div>

        {/* From / To / Meta */}
        <div className={styles['inv-meta-row']}>
          <div className={styles['inv-addresses']}>
            <div className={styles['inv-address-block']}>
              <div className={styles['inv-address-label']}>FROM</div>
              <div className={styles['inv-address-name']}>{company.companyName}</div>
              <div className={styles['inv-address-line']}>{company.address}</div>
              <div className={styles['inv-address-line']}>
                {[company.city, company.state].filter(Boolean).join(', ')} {company.zip}
              </div>
              <div className={styles['inv-address-line']}>{company.country}</div>
            </div>
            <div className={styles['inv-address-block']}>
              <div className={styles['inv-address-label']}>BILL TO</div>
              {recipientLines.map((line, i) => (
                <div key={i} className={i === 0 ? styles['inv-address-name'] : styles['inv-address-line']}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className={styles['inv-details']}>
            <div className={styles['inv-detail-row']}>
              <span className={styles['inv-detail-label']}>Invoice number</span>
              <span className={styles['inv-detail-value']}>{inv.hsNumber}</span>
            </div>
            <div className={styles['inv-detail-row']}>
              <span className={styles['inv-detail-label']}>Invoice date</span>
              <span className={styles['inv-detail-value']}>{fmtDate(inv.hsInvoiceDate)}</span>
            </div>
            <div className={styles['inv-detail-row']}>
              <span className={styles['inv-detail-label']}>Payment due</span>
              <span className={styles['inv-detail-value']}>{fmtDate(inv.hsDueDate)}</span>
            </div>
            {inv.typeObj && (
              <div className={styles['inv-detail-row']}>
                <span className={styles['inv-detail-label']}>Type</span>
                <span className={styles['inv-detail-value']}>{fmtType(inv.typeObj)}</span>
              </div>
            )}
            {inv.mspLevel && (
              <div className={styles['inv-detail-row']}>
                <span className={styles['inv-detail-label']}>MSP Level</span>
                <span className={styles['inv-detail-value']}>{inv.mspLevel}</span>
              </div>
            )}
            {inv.tenant && (
              <div className={styles['inv-detail-row']}>
                <span className={styles['inv-detail-label']}>Tenant</span>
                <span className={`${styles['inv-detail-value']} ${styles['inv-detail-tenant']}`}>{inv.tenant}</span>
              </div>
            )}
            <div className={styles['inv-detail-row']}>
              <span className={styles['inv-detail-label']}>Status</span>
              <span className={styles['inv-detail-value']}>
                <span className={styles['inv-status-dot']} style={{ background: statusColor }} />
                {inv.hsInvoiceStatus ? inv.hsInvoiceStatus.charAt(0).toUpperCase() + inv.hsInvoiceStatus.slice(1) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <table className={styles['inv-table']}>
          <thead>
            <tr>
              <th className={`${styles['inv-th']} ${styles['inv-th-product']}`}>Products &amp; Services</th>
              <th className={`${styles['inv-th']} ${styles['inv-th-center']}`}>Qty</th>
              <th className={`${styles['inv-th']} ${styles['inv-th-right']}`}>Unit Price</th>
              <th className={`${styles['inv-th']} ${styles['inv-th-right']}`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${styles['inv-td']} ${styles['inv-td-empty']}`}>
                  No line items
                </td>
              </tr>
            ) : (
              groups.map((group, groupIndex) => (
                <Fragment key={group.customer ?? "other"}>
                  {showGroupHeaders && (
                    <>
                      {groupIndex > 0 && (
                        <tr className={styles['inv-group-spacer']} aria-hidden="true">
                          <td colSpan={4} />
                        </tr>
                      )}
                      <tr key={`${group.customer ?? "other"}-header`} className={styles['inv-group-row']}>
                        <td colSpan={4} className={styles['inv-group-cell']}>
                          {group.customer ?? "Other"}
                        </td>
                      </tr>
                    </>
                  )}
                  {group.items.map((item) => (
                    <tr key={item.id} className={styles['inv-tr']}>
                      <td className={`${styles['inv-td']} ${styles['inv-td-product']}`}>
                        <div className={styles['inv-item-name']}>{item.name ?? "—"}</div>
                        {item.description && (
                          <div className={styles['inv-item-desc']} style={{ marginTop: 6 }}>{item.description}</div>
                        )}
                      </td>
                      <td className={`${styles['inv-td']} ${styles['inv-td-center']}`}>{fmtQuantity(item.quantity)}</td>
                      <td className={`${styles['inv-td']} ${styles['inv-td-right']}`}>{fmtCurrency(item.price, item.hsLineItemCurrencyCode ?? currency)}</td>
                      <td className={`${styles['inv-td']} ${styles['inv-td-right']} ${styles['inv-td-amount']}`}>
                        <div>{fmtCurrency(item.amount, item.hsLineItemCurrencyCode ?? currency)}</div>
                        {item.hsDiscountPercentage && Number(item.hsDiscountPercentage) > 0 && (
                          <div className={styles['inv-tag-discount']} style={{ marginTop: 2, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                            after {fmtPercent(item.hsDiscountPercentage)} discount
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {showGroupHeaders && (
                    <tr className={styles['inv-group-subtotal-row']}>
                      <td colSpan={3} className={`${styles['inv-td']} ${styles['inv-group-subtotal-label']}`}>
                        Subtotal — {group.customer ?? "Other"}
                      </td>
                      <td className={`${styles['inv-td']} ${styles['inv-td-right']} ${styles['inv-group-subtotal-value']}`}>
                        {fmtCurrency(String(groupSubtotal(group.items)), currency)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className={styles['inv-totals']}>
          <div className={styles['inv-total-row']}>
            <span className={styles['inv-total-label']}>Subtotal</span>
            <span className={styles['inv-total-value']}>{fmtCurrency(String(lineItemsSubtotal), currency)}</span>
          </div>
          {discounts.map((discount) => (
            <div key={discount.id} className={styles['inv-total-row']}>
              <span className={styles['inv-total-label']}>{discount.name}</span>
              <span className={`${styles['inv-total-value']} ${styles['inv-total-value--discount']}`}>
                −{fmtCurrency(String(discountAmount(discount, lineItemsSubtotal)), currency)}
              </span>
            </div>
          ))}
          {discounts.length > 0 && (
            <div className={styles['inv-total-row']}>
              <span className={styles['inv-total-label']}>Total</span>
              <span className={styles['inv-total-value']}>{fmtCurrency(inv.hsAmountBilled, currency)}</span>
            </div>
          )}
          {inv.hsAmountPaid && Number(inv.hsAmountPaid) > 0 && (
            <div className={styles['inv-total-row']}>
              <span className={styles['inv-total-label']}>Amount paid</span>
              <span className={styles['inv-total-value']}>{fmtCurrency(inv.hsAmountPaid, currency)}</span>
            </div>
          )}
          {creditMemoApplications.map((application) => {
            const memo = creditMemos.find((cm) => cm.id === application.creditMemoId);
            return (
              <div key={application.id} className={styles['inv-total-row']}>
                <span className={styles['inv-total-label']}>
                  Credit applied{memo?.hsNumber ? ` — ${memo.hsNumber}` : ''}
                </span>
                <span className={`${styles['inv-total-value']} ${styles['inv-total-value--discount']}`}>
                  −{fmtCurrency(application.amount, currency)}
                </span>
              </div>
            );
          })}
          <div className={`${styles['inv-total-row']} ${styles['inv-total-row--due']}`}>
            <span className={styles['inv-total-label']}>Balance due</span>
            <span className={styles['inv-total-value']}>{fmtCurrency(inv.hsBalanceDue, currency)}</span>
          </div>
        </div>

        {/* Payment instructions */}
        <div className={styles['inv-payment']}>
          <div className={styles['inv-payment-title']}>Payment Instructions</div>
          <div className={styles['inv-payment-body']}>
            <p>
              <strong>Remit to:</strong> {company.bankName}
            </p>
            <div className={styles['inv-bank-details']}>
              <span>
                <strong>ABA / Routing:</strong> {company.bankRoutingNumber}
              </span>
              <span>
                <strong>Account:</strong> {company.bankAccountNumber}
              </span>
              {company.bankSwiftCode && (
                <span>
                  <strong>Swift code:</strong> {company.bankSwiftCode}
                </span>
              )}
            </div>
            {bankAddressLines.length > 0 && (
              <p className={styles['inv-payment-note']}>{bankAddressLines.join(', ')}</p>
            )}
            <p className={styles['inv-payment-note']}>
              Please include the invoice number <strong>{inv.hsNumber}</strong> in the payment reference.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={styles['inv-footer']}>
          <span>For questions about this invoice, contact us at</span>
          <a href={`mailto:${company.billingContactEmail}`} className={styles['inv-footer-email']}>
            {company.billingContactEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
