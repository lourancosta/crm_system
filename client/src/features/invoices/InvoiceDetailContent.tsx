import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { Ban, ChevronDown, Copy, CreditCard, Eye, Pencil, Receipt, Trash2, Wallet } from "lucide-react";
import { invoicesApi } from "./api/invoices";
import { companiesApi } from "../companies/api/companies";
import { contactsApi } from "../contacts/api/contacts";
import { paymentsApi } from "../payments/api/payments";
import { historyApi } from "../../shared/api/history";
import { AssociatedRecordsPanel } from "../../shared/components/RecordDetail/AssociatedRecordsPanel";
import { AssociationPanel } from "../../shared/components/RecordDetail/AssociationPanel";
import { DealSearchSelect } from "../../shared/components/SearchSelect/DealSearchSelect";
import { RecordDetail } from "../../shared/components/RecordDetail/RecordDetail";
import { RowActionsMenu } from "../../shared/components/Dropdown/RowActionsMenu";
import { Button } from "../../shared/components/Button/Button";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog/ConfirmDialog";
import { Modal } from "../../shared/components/Modal/Modal";
import { PaymentForm } from "../payments/PaymentForm";
import { ManageCreditMemoModal } from "./ManageCreditMemoModal";
import { CreateInvoiceForm, CREATE_INVOICE_FORM_ID } from "./CreateInvoiceForm";
import type { CloneInvoiceSeed, InitialInvoiceData, InvoiceType } from "./CreateInvoiceForm";
import { Table } from "../../shared/components/Table/Table";
import type { Column } from "../../shared/components/Table/Table";
import type { HistoryEvent, SectionDef } from "../../shared/components/RecordDetail/RecordDetail";
import { useHistoryTimeline } from "../../shared/hooks/useHistoryTimeline";
import { toHistoryEvents } from "../../shared/utils/historyEvents";
import { formatPercent, formatQuantity } from "../../shared/utils/numberInput";
import styles from "./InvoiceDetailPage.module.css";
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedCreditMemo,
  AssociatedDeal,
  AssociatedPayment,
  CreatePaymentInput,
  CreditMemoApplication,
  Invoice,
  InvoiceDiscount,
  LineItem,
  LogActivityInput,
  LoggableActivityType,
} from "../../shared/types/index";

// Settled (paid/voided) invoices shouldn't be editable/deletable, nor should
// their line items — enforced authoritatively server-side too
// (invoice.service.ts's requireEditableInvoice), this just hides the
// affordances that would otherwise 400.
const EDITABLE_STATUSES = new Set(['open', 'draft']);

// Invoices aren't "people you'd call or meet with" the way a contact/deal is
// — only Note makes sense here (see RecordDetail's loggableActivityTypes).
const NOTE_ONLY: LoggableActivityType[] = ['note'];

const STATUS_COLORS: Record<string, string> = {
  open: "#eab308",
  paid: "#16a34a",
  voided: "#dc2626",
  draft: "#9ca3af",
};

function StatusCell({ status }: { status: string | null }) {
  if (!status) return null;
  const color = STATUS_COLORS[status.toLowerCase()] ?? "#9ca3af";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtCurrency(val: string | null, currency: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(Number(val));
}

function fmtType(val: string | null) {
  if (!val) return null;
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildSections(inv: Invoice): SectionDef[] {
  return [
    {
      title: "Invoice Information",
      fields: [
        { label: "Number", value: inv.hsNumber },
        { label: "Status", value: <StatusCell status={inv.hsInvoiceStatus} /> },
        { label: "Tenant", value: inv.tenant?.trim() },
        { label: "Company", value: inv.hsInvoiceLatestCompanyName },
        { label: "Due date", value: fmt(inv.hsDueDate) },
        { label: "Invoice date", value: fmt(inv.hsInvoiceDate) },
        { label: "Type", value: fmtType(inv.hsBillingFrequencyType) },
        { label: "Currency", value: inv.hsCurrency },
        ...(inv.typeObj === "reseller" && inv.installmentNumber && inv.installmentTotal
          ? [{ label: "Installment", value: `${inv.installmentNumber} / ${inv.installmentTotal}` }]
          : []),
      ],
    },
    {
      title: "Amounts",
      fields: [
        { label: "Amount billed", value: fmtCurrency(inv.hsAmountBilled, inv.hsCurrency) },
        { label: "Amount paid", value: fmtCurrency(inv.hsAmountPaid, inv.hsCurrency) },
        ...(inv.creditMemoTotal ? [{ label: "Credited", value: fmtCurrency(String(inv.creditMemoTotal), inv.hsCurrency) }] : []),
        { label: "Balance due", value: fmtCurrency(inv.adjustedBalanceDue ?? inv.hsBalanceDue, inv.hsCurrency) },
      ],
    },
  ];
}

type Props = {
  // Full-page mode shows a "← Invoices" back link since it's the only way
  // out; the slide-over panel already has its own close affordance, so it
  // omits this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function InvoiceDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discounts, setDiscounts] = useState<InvoiceDiscount[]>([]);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [contacts, setContacts] = useState<AssociatedContact[]>([]);
  const [deals, setDeals] = useState<AssociatedDeal[]>([]);
  const [payments, setPayments] = useState<AssociatedPayment[]>([]);
  const [creditMemos, setCreditMemos] = useState<AssociatedCreditMemo[]>([]);
  const [creditMemoApplications, setCreditMemoApplications] = useState<CreditMemoApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isManagingCreditMemo, setIsManagingCreditMemo] = useState(false);
  const [editData, setEditData] = useState<InitialInvoiceData | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isEditDirty, setIsEditDirty] = useState(false);
  const [isEditExitConfirmOpen, setIsEditExitConfirmOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [cloneSeed, setCloneSeed] = useState<CloneInvoiceSeed | null>(null);
  const [cloneNotes, setCloneNotes] = useState<string[]>([]);
  const [isCloneSubmitting, setIsCloneSubmitting] = useState(false);
  const [isCloneDirty, setIsCloneDirty] = useState(false);
  const [isCloneExitConfirmOpen, setIsCloneExitConfirmOpen] = useState(false);

  const timeline = useHistoryTimeline("invoices", id);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      invoicesApi.getById(id),
      invoicesApi.getLineItems(id),
      invoicesApi.getDiscounts(id),
      invoicesApi.getCompanies(id),
      invoicesApi.getContacts(id),
      invoicesApi.getDeals(id),
      invoicesApi.getPayments(id),
      invoicesApi.getCreditMemos(id),
      invoicesApi.getCreditMemoApplications(id),
    ])
      .then(([invoice, items, disc, cos, cts, dls, pmts, cms, cmApps]) => {
        setInv(invoice);
        setLineItems(items);
        setDiscounts(disc);
        setCompanies(cos);
        setContacts(cts);
        setDeals(dls);
        setPayments(pmts);
        setCreditMemos(cms);
        setCreditMemoApplications(cmApps);
      })
      .catch(() => setError("Invoice not found"))
      .finally(() => setIsLoading(false));
  }, [id]);

  function refetchDeals() {
    if (!id) return;
    invoicesApi.getDeals(id).then(setDeals);
  }

  async function handleRegisterPayment(data: CreatePaymentInput) {
    await paymentsApi.create(data);
    setShowPaymentForm(false);
    if (id) {
      invoicesApi.getPayments(id).then(setPayments);
      invoicesApi.getById(id).then(setInv);
      timeline.refresh();
    }
  }

  async function handleLogActivity(input: LogActivityInput) {
    if (!inv) return;
    await historyApi.logActivity("invoices", inv.id, input);
    timeline.refresh();
  }

  // The edit modal is the same large CreateInvoiceForm used for new
  // invoices, pre-filled — it needs the full Company/Contact records (not
  // just the lightweight AssociatedCompany/AssociatedContact already on
  // hand), so fetch those on demand when the user opens Edit.
  async function openEditModal() {
    if (!inv || companies.length === 0 || contacts.length === 0) return;
    const [company, contact] = await Promise.all([
      companiesApi.getById(companies[0].id),
      contactsApi.getById(contacts[0].id),
    ]);
    setEditData({ invoice: inv, lineItems, discounts, creditMemoApplications, company, contact });
  }

  // Shared refresh for anything that touched this invoice's own data —
  // used both when a draft Save keeps the modal open (data may have just
  // been persisted for the first time) and when Create/Update Invoice closes it.
  function refreshInvoiceData() {
    if (!id) return;
    invoicesApi.getById(id).then(setInv);
    invoicesApi.getLineItems(id).then(setLineItems);
    invoicesApi.getDiscounts(id).then(setDiscounts);
    invoicesApi.getCompanies(id).then(setCompanies);
    invoicesApi.getContacts(id).then(setContacts);
    invoicesApi.getCreditMemos(id).then(setCreditMemos);
    invoicesApi.getCreditMemoApplications(id).then(setCreditMemoApplications);
    timeline.refresh();
  }

  function closeEditModal() {
    setEditData(null);
    setIsEditExitConfirmOpen(false);
    setIsEditDirty(false);
  }

  function handleExitEditAttempt() {
    if (isEditDirty) setIsEditExitConfirmOpen(true);
    else closeEditModal();
  }

  function handleEditPublished() {
    refreshInvoiceData();
    closeEditModal();
  }

  async function handleDeleteInvoice() {
    if (!id) return;
    await invoicesApi.delete(id);
    navigate("/invoices");
  }

  async function handleVoidInvoice() {
    if (!id) return;
    const updated = await invoicesApi.void(id);
    setInv(updated);
    setIsVoidOpen(false);
  }

  // Fetches a read-only preview of the clone (company/contact/line items/
  // discounts re-resolved server-side, nothing persisted yet — see
  // invoice.service.ts's getInvoiceClonePreview) and opens the same
  // create-invoice form used for "New Invoice", pre-filled. Nothing is
  // created until the user reviews and hits Save.
  async function handleCloneInvoice() {
    if (!id) return;
    const preview = await invoicesApi.getClonePreview(id);
    const [clonedCompany, clonedContact] = await Promise.all([
      preview.companyId ? companiesApi.getById(preview.companyId) : Promise.resolve(null),
      preview.contactId ? contactsApi.getById(preview.contactId) : Promise.resolve(null),
    ]);
    setCloneNotes(preview.notes);
    setCloneSeed({
      company: clonedCompany,
      contact: clonedContact,
      typeObj: (preview.typeObj as InvoiceType) ?? 'reseller',
      lineItems: preview.lineItems,
      discounts: preview.discounts,
    });
  }

  function closeCloneModal() {
    setCloneSeed(null);
    setCloneNotes([]);
    setIsCloneExitConfirmOpen(false);
    setIsCloneDirty(false);
  }

  function handleExitCloneAttempt() {
    if (isCloneDirty) setIsCloneExitConfirmOpen(true);
    else closeCloneModal();
  }

  function handleClonePublished(invoice: Invoice) {
    setCloneSeed(null);
    navigate(`/invoices/${invoice.id}`);
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const isFullyPaid = !!inv && Number(inv.adjustedBalanceDue ?? inv.hsBalanceDue ?? 0) <= 0;
  const canEdit = !!inv && EDITABLE_STATUSES.has((inv.hsInvoiceStatus ?? "").toLowerCase());
  const invoiceStatus = (inv?.hsInvoiceStatus ?? "").toLowerCase();
  const canVoid = !!inv && invoiceStatus !== "voided" && invoiceStatus !== "paid";
  // Matches the public preview route's own gate (see public.routes.ts) — a
  // still-draft invoice has no real number yet and isn't published, so its
  // preview link doesn't work either.
  const canPreview = !!inv && ["open", "paid", "voided"].includes(invoiceStatus);

  const historyEvents: HistoryEvent[] = inv
    ? [{ date: inv.createdAt, title: "Invoice created", description: "by System" }, ...toHistoryEvents(timeline.entries)]
    : [];

  const lineItemColumns: Column<LineItem>[] = [
    {
      key: "name",
      header: "Item",
      render: (item) => <div style={{ fontWeight: 600 }}>{item.name ?? "—"}</div>,
    },
    { key: "quantity", header: "Qty", render: (item) => formatQuantity(item.quantity) },
    {
      key: "price",
      header: "Unit price",
      render: (item) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCurrency(item.price, inv?.hsCurrency ?? null) ?? "—"}</span>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      render: (item) => (item.hsDiscountPercentage && Number(item.hsDiscountPercentage) > 0 ? formatPercent(item.hsDiscountPercentage) : "—"),
    },
    {
      key: "amount",
      header: "Total",
      render: (item) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
          {fmtCurrency(item.amount, inv?.hsCurrency ?? null) ?? "—"}
        </span>
      ),
    },
  ];

  const lineItemsTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Table
        columns={lineItemColumns}
        data={lineItems}
        keyExtractor={(item) => item.id}
        emptyMessage="No line items"
        groupBy={(item) => item.customerName?.trim() || null}
        renderGroupSummary={(key, rows) => {
          const subtotal = rows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
          return lineItemColumns.map((col) => {
            if (col.key === "name") return `Subtotal — ${key ?? "Other"}`;
            if (col.key === "amount") return fmtCurrency(String(subtotal), inv?.hsCurrency ?? null);
            return null;
          });
        }}
      />
    </div>
  );

  return (
    <>
      <RecordDetail
        title={inv?.hsNumber ?? ""}
        icon={Receipt}
        sections={inv ? buildSections(inv) : []}
        backTo={showBackLink ? '/invoices' : undefined}
        backLabel="Invoices"
        isLoading={isLoading}
        extraTabs={[{ key: "line-items", label: "Line Items", content: lineItemsTab }]}
        historyEvents={historyEvents}
        activeHistoryTypes={timeline.activeTypes}
        onActiveHistoryTypesChange={timeline.setActiveTypes}
        hasMoreHistory={timeline.hasMore}
        isLoadingMoreHistory={timeline.isLoading}
        onLoadMoreHistory={timeline.loadMore}
        onLogActivity={handleLogActivity}
        loggableActivityTypes={NOTE_ONLY}
        actions={
          <RowActionsMenu
            label="Actions"
            icon={ChevronDown}
            actions={[
              {
                label: "Edit",
                icon: Pencil,
                disabled: !canEdit,
                title: !canEdit ? "Only open or draft invoices can be edited" : undefined,
                onClick: openEditModal,
              },
              {
                label: "Register Payment",
                icon: CreditCard,
                disabled: isFullyPaid,
                title: isFullyPaid ? "This invoice has no remaining balance due" : undefined,
                onClick: () => setShowPaymentForm(true),
              },
              {
                label: "Apply or manage credit",
                icon: Wallet,
                disabled: !inv || !["open", "paid"].includes(invoiceStatus) || companies.length === 0,
                title:
                  companies.length === 0
                    ? "This invoice has no associated company"
                    : !["open", "paid"].includes(invoiceStatus)
                      ? "Only open or paid invoices can have credit applied"
                      : undefined,
                onClick: () => setIsManagingCreditMemo(true),
              },
              {
                label: "Preview",
                icon: Eye,
                disabled: !canPreview,
                title: !canPreview ? "Only open, paid, or voided invoices can be previewed" : undefined,
                onClick: () => id && window.open(`/invoices/${id}/preview`, "_blank"),
              },
              {
                label: "Clone",
                icon: Copy,
                onClick: handleCloneInvoice,
              },
              ...(canVoid ? [{ label: "Void", icon: Ban, variant: "danger" as const, onClick: () => setIsVoidOpen(true) }] : []),
              {
                label: "Delete",
                icon: Trash2,
                variant: "danger" as const,
                disabled: !canEdit,
                title: !canEdit ? "Only open or draft invoices can be deleted" : undefined,
                onClick: () => setIsDeleteOpen(true),
              },
            ]}
          />
        }
        aside={
          <>
            <AssociatedRecordsPanel
              title="Companies"
              items={companies}
              keyExtractor={(c) => c.id}
              renderItem={(c) => (
                <>
                  <RecordLink to={`/companies/${c.id}`} className="link" style={{ fontSize: 13, display: "block", marginBottom: 2 }}>
                    {c.name ?? "—"}
                  </RecordLink>
                  {c.domain && (
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      Domain:{" "}
                      <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="link" style={{ fontWeight: 600 }}>
                        {c.domain}
                      </a>
                    </div>
                  )}
                </>
              )}
            />

            <AssociatedRecordsPanel
              title="Contacts"
              items={contacts}
              keyExtractor={(c) => c.id}
              renderItem={(c) => (
                <>
                  <RecordLink to={`/contacts/${c.id}`} className="link" style={{ fontSize: 13, display: "block", marginBottom: 2 }}>
                    {[c.firstname, c.lastname].filter(Boolean).join(" ") || "—"}
                  </RecordLink>
                  {(c.jobtitle || c.company) && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{[c.jobtitle, c.company].filter(Boolean).join(" at ")}</div>
                  )}
                  {c.email && (
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      Email:{" "}
                      <a href={`mailto:${c.email}`} className="link">
                        {c.email}
                      </a>
                    </div>
                  )}
                </>
              )}
            />

            {inv && (
              <AssociationPanel
                title="Deals"
                items={deals}
                keyExtractor={(d) => d.id}
                itemLabel={(d) => d.dealname ?? 'this deal'}
                renderItem={(d) => (
                  <>
                    <RecordLink to={`/deals/${d.id}`} className="link" style={{ fontSize: 13, display: "block", marginBottom: 2 }}>
                      {d.dealname ?? "—"}
                    </RecordLink>
                    {d.amount && (
                      <div style={{ fontSize: 12, marginTop: 2 }}>
                        Amount: <span style={{ color: "#6b7280" }}>{fmtCurrency(d.amount, null)}</span>
                      </div>
                    )}
                    {d.closedate && (
                      <div style={{ fontSize: 12 }}>
                        Close date: <span style={{ color: "#6b7280" }}>{fmt(d.closedate)}</span>
                      </div>
                    )}
                  </>
                )}
                sourceType="invoices"
                sourceId={inv.id}
                targetType="deals"
                renderPicker={(onSelect) => <DealSearchSelect value={null} onChange={(d) => d && onSelect(d.id)} />}
                onChange={refetchDeals}
              />
            )}

            <AssociatedRecordsPanel
              title="Payments"
              items={payments}
              keyExtractor={(p) => p.id}
              renderItem={(p) => (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <RecordLink to={`/payments/${p.id}`} className="link" style={{ fontSize: 13, fontWeight: 600 }}>
                      {p.hsPaymentId ?? "—"}
                    </RecordLink>
                    {(p.hsNetAmount ?? p.hsInitialAmount) && (
                      <span className={styles['line-item-amount']}>{fmtCurrency(p.hsNetAmount ?? p.hsInitialAmount, p.hsCurrencyCode)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {[p.hsLatestStatus, p.hsPaymentMethodType].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {p.hsInitiatedDate && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{fmt(p.hsInitiatedDate)}</div>
                  )}
                </>
              )}
            />

            <AssociatedRecordsPanel
              title="Credit Memos"
              items={creditMemos}
              keyExtractor={(cm) => cm.id}
              renderItem={(cm) => (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <RecordLink to={`/credit-memos/${cm.id}`} className="link" style={{ fontSize: 13, fontWeight: 600 }}>
                      {cm.hsNumber ?? "—"}
                    </RecordLink>
                    {cm.hsAmountCredited && (
                      <span className={styles['line-item-amount']}>{fmtCurrency(cm.hsAmountCredited, cm.hsCurrency)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {[cm.hsCreditMemoStatus, cm.hsComments].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {cm.hsCreditMemoDate && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{fmt(cm.hsCreditMemoDate)}</div>
                  )}
                </>
              )}
            />
          </>
        }
      />

      {showPaymentForm && inv && (
        <Modal title="Register Payment" onClose={() => setShowPaymentForm(false)}>
          <PaymentForm
            fixedInvoice={{ id: inv.id, label: inv.hsNumber ?? inv.id }}
            onSubmit={handleRegisterPayment}
            onCancel={() => setShowPaymentForm(false)}
          />
        </Modal>
      )}

      {isManagingCreditMemo && inv && companies[0] && (
        <ManageCreditMemoModal
          invoice={inv}
          companyId={companies[0].id}
          initialApplications={creditMemoApplications}
          existingCreditMemos={creditMemos}
          onClose={() => setIsManagingCreditMemo(false)}
          onSaved={() => {
            refreshInvoiceData();
            setIsManagingCreditMemo(false);
          }}
        />
      )}

      {editData && (() => {
        const isEditDraftMode = (editData.invoice.hsInvoiceStatus ?? 'draft').toLowerCase() === 'draft';
        return (
          <Modal
            title="Edit Invoice"
            onClose={handleExitEditAttempt}
            variant="fullscreen"
            headerActions={
              <div style={{ display: 'flex', gap: 12 }}>
                <Button variant="secondary" type="button" onClick={handleExitEditAttempt}>
                  Exit
                </Button>
                {isEditDraftMode && (
                  <Button type="submit" form={CREATE_INVOICE_FORM_ID} value="save" isLoading={isEditSubmitting} variant="secondary">
                    Save
                  </Button>
                )}
                <Button type="submit" form={CREATE_INVOICE_FORM_ID} value="publish" isLoading={isEditSubmitting} variant="accent">
                  {isEditDraftMode ? 'Create' : 'Update Invoice'}
                </Button>
              </div>
            }
          >
            <CreateInvoiceForm
              initial={editData}
              onDraftSaved={refreshInvoiceData}
              onPublished={handleEditPublished}
              onDirtyChange={setIsEditDirty}
              onSubmittingChange={setIsEditSubmitting}
            />
          </Modal>
        );
      })()}

      {isEditExitConfirmOpen && (
        <ConfirmDialog
          title="Exit without saving?"
          message="You have unsaved changes on this invoice. If you exit now, they'll be lost."
          confirmLabel="Exit without saving"
          cancelLabel="Go back"
          onConfirm={closeEditModal}
          onCancel={() => setIsEditExitConfirmOpen(false)}
        />
      )}

      {cloneSeed && (
        <Modal
          title="Clone Invoice"
          onClose={handleExitCloneAttempt}
          variant="fullscreen"
          headerActions={
            <div style={{ display: 'flex', gap: 12 }}>
              <Button variant="secondary" type="button" onClick={handleExitCloneAttempt}>
                Exit
              </Button>
              <Button type="submit" form={CREATE_INVOICE_FORM_ID} value="save" isLoading={isCloneSubmitting} variant="secondary">
                Save
              </Button>
              <Button type="submit" form={CREATE_INVOICE_FORM_ID} value="publish" isLoading={isCloneSubmitting} variant="accent">
                Create
              </Button>
            </div>
          }
        >
          {cloneNotes.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              {cloneNotes.join(' ')}
            </div>
          )}
          <CreateInvoiceForm
            cloneSeed={cloneSeed}
            onDraftSaved={() => {}}
            onPublished={handleClonePublished}
            onDirtyChange={setIsCloneDirty}
            onSubmittingChange={setIsCloneSubmitting}
          />
        </Modal>
      )}

      {isCloneExitConfirmOpen && (
        <ConfirmDialog
          title="Exit without saving?"
          message="You have unsaved changes on this invoice. If you exit now, they'll be lost."
          confirmLabel="Exit without saving"
          cancelLabel="Go back"
          onConfirm={closeCloneModal}
          onCancel={() => setIsCloneExitConfirmOpen(false)}
        />
      )}

      {isDeleteOpen && inv && (
        <ConfirmDialog
          title="Delete Invoice?"
          message={`You are about to delete ${inv.hsNumber || 'this invoice'}. This can't be undone.`}
          onConfirm={handleDeleteInvoice}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}

      {isVoidOpen && inv && (
        <ConfirmDialog
          title="Void Invoice?"
          message={`You are about to void ${inv.hsNumber || 'this invoice'}. This can't be undone.`}
          confirmLabel="Void"
          onConfirm={handleVoidInvoice}
          onCancel={() => setIsVoidOpen(false)}
        />
      )}

    </>
  );
}
