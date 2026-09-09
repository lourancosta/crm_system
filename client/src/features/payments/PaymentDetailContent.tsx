import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { ChevronDown, CreditCard, Trash2 } from "lucide-react";
import { paymentsApi } from "./api/payments";
import { historyApi } from "../../shared/api/history";
import { AssociatedRecordsPanel } from "../../shared/components/RecordDetail/AssociatedRecordsPanel";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog/ConfirmDialog";
import { InvoiceStatusBadge } from "../../shared/components/StatusBadge/InvoiceStatusBadge";
import { RecordDetail } from "../../shared/components/RecordDetail/RecordDetail";
import { GroupedPropertiesPanel } from "../../shared/components/RecordDetail/GroupedPropertiesPanel";
import { RowActionsMenu } from "../../shared/components/Dropdown/RowActionsMenu";
import type { HistoryEvent, SectionDef } from "../../shared/components/RecordDetail/RecordDetail";
import { useHistoryTimeline } from "../../shared/hooks/useHistoryTimeline";
import { toHistoryEvents } from "../../shared/utils/historyEvents";
import type { AssociatedCompany, AssociatedInvoice, HistoryEntry, LogActivityInput, LoggableActivityType, Payment } from "../../shared/types/index";

// Payments aren't "people you'd call or meet with" the way a contact/deal is
// — only Note makes sense here (see RecordDetail's loggableActivityTypes).
const NOTE_ONLY: LoggableActivityType[] = ['note'];

const STATUS_COLORS: Record<string, string> = {
  succeeded: "#16a34a",
  failed: "#dc2626",
  refunded: "#9ca3af",
  pending: "#eab308",
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

function fmtMethod(val: string | null) {
  if (!val) return null;
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildSections(p: Payment): SectionDef[] {
  return [
    {
      title: "Payment Information",
      fields: [
        { label: "Payment ID", value: p.hsPaymentId },
        { label: "Status", value: <StatusCell status={p.hsLatestStatus} /> },
        { label: "Company", value: p.companyName },
        { label: "Customer email", value: p.hsCustomerEmail },
        { label: "Payment date", value: fmt(p.hsInitiatedDate) },
        { label: "Payment method", value: fmtMethod(p.hsPaymentMethodType) },
        { label: "Payment type", value: fmtMethod(p.hsPaymentType) },
        { label: "Processor", value: fmtMethod(p.hsProcessorType) },
        { label: "Reference number", value: p.hsReferenceNumber },
        { label: "Currency", value: p.hsCurrencyCode },
        { label: "Internal note", value: p.hsInternalComment },
      ],
    },
    {
      title: "Amounts",
      fields: [
        { label: "Gross amount", value: fmtCurrency(p.hsInitialAmount, p.hsCurrencyCode) },
        { label: "Fees", value: fmtCurrency(p.hsFeesAmount, p.hsCurrencyCode) },
        { label: "Net amount", value: fmtCurrency(p.hsNetAmount, p.hsCurrencyCode) },
      ],
    },
  ];
}

function buildHistoryEvents(p: Payment, history: HistoryEntry[]): HistoryEvent[] {
  return [
    { date: p.createdAt, title: "Payment created" },
    { date: p.updatedAt, title: "Payment last updated" },
    ...toHistoryEvents(history),
  ];
}

type Props = {
  // Full-page mode shows a "← Payments" back link since it's the only way
  // out; the slide-over panel already has its own close affordance, so it
  // omits this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function PaymentDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [invoices, setInvoices] = useState<AssociatedInvoice[]>([]);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const timeline = useHistoryTimeline("payments", id);

  function loadPayment() {
    if (!id) return;
    paymentsApi.getById(id).then(setPayment);
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([paymentsApi.getById(id), paymentsApi.getInvoices(id), paymentsApi.getCompanies(id)])
      .then(([p, invs, cos]) => {
        setPayment(p);
        setInvoices(invs);
        setCompanies(cos);
      })
      .catch(() => setError("Payment not found"))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleLogActivity(input: LogActivityInput) {
    if (!payment) return;
    await historyApi.logActivity("payments", payment.id, input);
    timeline.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    await paymentsApi.delete(id);
    navigate("/payments");
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <>
    <RecordDetail
      title={payment?.hsPaymentId ?? ""}
      icon={CreditCard}
      sections={payment ? buildSections(payment) : []}
      extraTabs={
        payment
          ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="payments" recordId={payment.id} onSaved={loadPayment} /> }]
          : []
      }
      backTo={showBackLink ? '/payments' : undefined}
      backLabel="Payments"
      isLoading={isLoading}
      historyEvents={payment ? buildHistoryEvents(payment, timeline.entries) : []}
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
          actions={[{ label: "Delete", icon: Trash2, variant: "danger", onClick: () => setIsDeleteOpen(true) }]}
        />
      }
      aside={
        <>
          <AssociatedRecordsPanel
            title="Invoices"
            items={invoices}
            keyExtractor={(inv) => inv.id}
            renderItem={(inv) => (
              <>
                <RecordLink to={`/invoices/${inv.id}`} className="link" style={{ fontSize: 13, display: "block", marginBottom: 2 }}>
                  {inv.hsNumber ?? "—"}
                </RecordLink>
                <div style={{ fontSize: 12, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  <InvoiceStatusBadge status={inv.hsInvoiceStatus} />
                  {fmtCurrency(inv.hsBalanceDue, inv.hsCurrency) && (
                    <span style={{ color: "#6b7280" }}>{fmtCurrency(inv.hsBalanceDue, inv.hsCurrency)}</span>
                  )}
                  {!inv.hsInvoiceStatus && !fmtCurrency(inv.hsBalanceDue, inv.hsCurrency) && <span style={{ color: "#6b7280" }}>—</span>}
                </div>
                {inv.hsDueDate && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Due {fmt(inv.hsDueDate)}</div>
                )}
              </>
            )}
          />

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
        </>
      }
    />

    {isDeleteOpen && payment && (
      <ConfirmDialog
        title="Delete Payment?"
        message={`You are about to delete ${payment.hsPaymentId || 'this payment'}. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    )}
    </>
  );
}
