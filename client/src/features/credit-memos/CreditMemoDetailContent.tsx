import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import { Ban, ChevronDown, Receipt, Trash2 } from "lucide-react";
import { creditMemosApi } from "./api/creditMemos";
import { historyApi } from "../../shared/api/history";
import { AssociatedRecordsPanel } from "../../shared/components/RecordDetail/AssociatedRecordsPanel";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog/ConfirmDialog";
import { RecordDetail } from "../../shared/components/RecordDetail/RecordDetail";
import { GroupedPropertiesPanel } from "../../shared/components/RecordDetail/GroupedPropertiesPanel";
import { RowActionsMenu } from "../../shared/components/Dropdown/RowActionsMenu";
import { CreditMemoStatusBadge, creditMemoStatusKey } from "../../shared/components/StatusBadge/CreditMemoStatusBadge";
import { InvoiceStatusBadge } from "../../shared/components/StatusBadge/InvoiceStatusBadge";
import type { HistoryEvent, SectionDef } from "../../shared/components/RecordDetail/RecordDetail";
import { useHistoryTimeline } from "../../shared/hooks/useHistoryTimeline";
import { toHistoryEvents } from "../../shared/utils/historyEvents";
import type {
  AssociatedCompany,
  AssociatedContact,
  AssociatedInvoice,
  CreditMemo,
  HistoryEntry,
  LogActivityInput,
  LoggableActivityType,
} from "../../shared/types/index";

// Credit memos aren't "people you'd call or meet with" the way a
// contact/deal is — only Note makes sense here (see RecordDetail's
// loggableActivityTypes).
const NOTE_ONLY: LoggableActivityType[] = ['note'];

function fmt(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtCurrency(val: string | null, currency: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(Number(val));
}

function buildSections(cm: CreditMemo): SectionDef[] {
  return [
    {
      title: "Credit Memo Information",
      fields: [
        { label: "Number", value: cm.hsNumber },
        {
          label: "Status",
          value: <CreditMemoStatusBadge hsCreditMemoStatus={cm.hsCreditMemoStatus} appliedAmount={cm.appliedAmount} openAmount={cm.openAmount} />,
        },
        { label: "Reason", value: cm.hsComments },
        { label: "Date", value: fmt(cm.hsCreditMemoDate) },
        { label: "Currency", value: cm.hsCurrency },
      ],
    },
    {
      title: "Amounts",
      fields: [
        { label: "Amount credited", value: fmtCurrency(cm.hsAmountCredited, cm.hsCurrency) },
        { label: "Amount remaining", value: fmtCurrency(cm.hsAmountRemaining, cm.hsCurrency) },
      ],
    },
  ];
}

function buildHistoryEvents(cm: CreditMemo, history: HistoryEntry[]): HistoryEvent[] {
  return [
    { date: cm.createdAt, title: "Credit memo created" },
    { date: cm.updatedAt, title: "Credit memo last updated" },
    ...toHistoryEvents(history),
  ];
}

type Props = {
  // Full-page mode shows a "← Credit Memos" back link since it's the only
  // way out; the slide-over panel already has its own close affordance, so
  // it omits this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function CreditMemoDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creditMemo, setCreditMemo] = useState<CreditMemo | null>(null);
  const [invoices, setInvoices] = useState<AssociatedInvoice[]>([]);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [contacts, setContacts] = useState<AssociatedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);

  const timeline = useHistoryTimeline("creditMemos", id);

  function loadCreditMemo() {
    if (!id) return;
    creditMemosApi.getById(id).then(setCreditMemo);
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      creditMemosApi.getById(id),
      creditMemosApi.getInvoices(id),
      creditMemosApi.getCompanies(id),
      creditMemosApi.getContacts(id),
    ])
      .then(([cm, invs, cos, cts]) => {
        setCreditMemo(cm);
        setInvoices(invs);
        setCompanies(cos);
        setContacts(cts);
      })
      .catch(() => setError("Credit memo not found"))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleLogActivity(input: LogActivityInput) {
    if (!creditMemo) return;
    await historyApi.logActivity("creditMemos", creditMemo.id, input);
    timeline.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    await creditMemosApi.delete(id);
    navigate("/credit-memos");
  }

  async function handleVoid() {
    if (!id) return;
    const updated = await creditMemosApi.void(id);
    setCreditMemo(updated);
    setIsVoidOpen(false);
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  // Mirrors invoice.service.ts's own voidInvoice guard: only a still-fully-
  // unapplied (or uncommitted draft) memo can be voided — once any part of
  // it has been applied to an invoice, voiding would leave that invoice's
  // balance reduced by a reference to a now-voided memo.
  const statusKey = creditMemo
    ? creditMemoStatusKey({ hsCreditMemoStatus: creditMemo.hsCreditMemoStatus, appliedAmount: creditMemo.appliedAmount, openAmount: creditMemo.openAmount })
    : null;
  const canVoid = statusKey === 'unapplied' || statusKey === 'draft';

  return (
    <>
    <RecordDetail
      title={creditMemo?.hsNumber ?? "Credit Memo"}
      icon={Receipt}
      sections={creditMemo ? buildSections(creditMemo) : []}
      extraTabs={
        creditMemo
          ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="creditMemos" recordId={creditMemo.id} onSaved={loadCreditMemo} /> }]
          : []
      }
      backTo={showBackLink ? '/credit-memos' : undefined}
      backLabel="Credit Memos"
      isLoading={isLoading}
      historyEvents={creditMemo ? buildHistoryEvents(creditMemo, timeline.entries) : []}
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
              label: "Void",
              icon: Ban,
              variant: "danger",
              disabled: !canVoid,
              title: !canVoid ? "A credit memo with an applied amount cannot be voided" : undefined,
              onClick: () => setIsVoidOpen(true),
            },
            { label: "Delete", icon: Trash2, variant: "danger", onClick: () => setIsDeleteOpen(true) },
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

          <AssociatedRecordsPanel
            title="Invoices"
            items={invoices}
            keyExtractor={(inv) => inv.id}
            renderItem={(inv) => (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <RecordLink to={`/invoices/${inv.id}`} className="link" style={{ fontSize: 13, fontWeight: 600 }}>
                    {inv.hsNumber ?? "—"}
                  </RecordLink>
                  {inv.hsBalanceDue && <span style={{ fontSize: 12, color: "#6b7280" }}>{fmtCurrency(inv.hsBalanceDue, inv.hsCurrency)}</span>}
                </div>
                <div style={{ marginTop: 2 }}>
                  <InvoiceStatusBadge status={inv.hsInvoiceStatus} />
                </div>
                {inv.hsDueDate && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Due {fmt(inv.hsDueDate)}</div>
                )}
              </>
            )}
          />
        </>
      }
    />

    {isDeleteOpen && creditMemo && (
      <ConfirmDialog
        title="Delete Credit Memo?"
        message={`You are about to delete ${creditMemo.hsNumber || 'this credit memo'}. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    )}

    {isVoidOpen && creditMemo && (
      <ConfirmDialog
        title="Void Credit Memo?"
        message={`You are about to void ${creditMemo.hsNumber || 'this credit memo'}. This can't be undone.`}
        confirmLabel="Void"
        onConfirm={handleVoid}
        onCancel={() => setIsVoidOpen(false)}
      />
    )}
    </>
  );
}
