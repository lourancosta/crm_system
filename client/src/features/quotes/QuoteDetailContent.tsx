import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Eye, FileSpreadsheet, Pencil, RotateCcw, Trash2 } from "lucide-react";
import SignaturePad from "signature_pad";
import { RecordLink } from "../../shared/components/RecordLink/RecordLink";
import { AssociatedRecordsPanel } from "../../shared/components/RecordDetail/AssociatedRecordsPanel";
import { RecordDetail } from "../../shared/components/RecordDetail/RecordDetail";
import { RowActionsMenu } from "../../shared/components/Dropdown/RowActionsMenu";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog/ConfirmDialog";
import { Button } from "../../shared/components/Button/Button";
import { useAuth } from "../../shared/contexts/AuthContext";
import { quotesApi } from "./api/quotes";
import { CreateQuoteWizard } from "./wizard/CreateQuoteWizard";
import type { SectionDef } from "../../shared/components/RecordDetail/RecordDetail";
import type { AssociatedCompany, AssociatedContact, AssociatedDeal, Quote, QuoteSigner } from "../../shared/types/index";
import sigStyles from "./QuoteSignatureForm.module.css";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9ca3af",
  PUBLISHED: "#16a34a",
  AWAITING_COUNTERSIGNATURE: "#eab308",
  SIGNED: "#16a34a",
  EXPIRED: "#dc2626",
  ARCHIVED: "#9ca3af",
};

// isSigned overrides the raw status display — hsQuoteStatus stays a
// faithful mirror of HubSpot's own DRAFT/PUBLISHED/EXPIRED/ARCHIVED value
// (a quote can be simultaneously EXPIRED there and signed), but a signed
// quote should always read as "Signed" here regardless of that raw value.
function StatusCell({ status, isSigned }: { status: string | null; isSigned?: boolean }) {
  const effectiveStatus = isSigned ? "SIGNED" : status;
  if (!effectiveStatus) return null;
  const color = STATUS_COLORS[effectiveStatus] ?? "#9ca3af";
  const label =
    effectiveStatus === "AWAITING_COUNTERSIGNATURE"
      ? "Awaiting countersignature"
      : effectiveStatus.charAt(0) + effectiveStatus.slice(1).toLowerCase();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtCurrency(val: string | null, currency: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency ?? "USD" }).format(Number(val));
}

function buildSections(
  q: Quote,
  signers: QuoteSigner[],
  resendingId: string | null,
  resendMsg: string,
  onResend: (signerId: string) => void,
): SectionDef[] {
  const sections: SectionDef[] = [
    {
      title: "Quote Information",
      fields: [
        { label: "Title", value: q.hsTitle ?? q.hsDealName },
        { label: "Number", value: q.hsQuoteNumber },
        { label: "Status", value: <StatusCell status={q.hsQuoteStatus} isSigned={q.isSigned} /> },
        { label: "Owner", value: q.ownerName },
      ],
    },
    {
      title: "Amounts",
      fields: [
        { label: "Amount", value: fmtCurrency(q.hsQuoteAmount, q.hsCurrency) },
        { label: "TCV", value: fmtCurrency(q.hsTcv, q.hsCurrency) },
      ],
    },
    {
      title: "Dates",
      fields: [
        { label: "Created", value: fmt(q.createdAt) },
        { label: "Published", value: fmt(q.hsLastPublishedDate) },
        { label: "Expiration date", value: fmt(q.hsExpirationDate) },
      ],
    },
  ];

  if (signers.length > 0) {
    sections.push({
      title: "Signers",
      fields: signers.map((s) => ({
        label: `${s.signerName}${s.signerType === "internal" ? " (Internal)" : ""}`,
        value: s.signedAt ? (
          `Signed on ${fmt(s.signedAt)}`
        ) : s.signerType === "contact" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Pending
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onResend(s.id)}
              isLoading={resendingId === s.id}
            >
              Resend
            </Button>
            {resendMsg && resendingId === null && <span style={{ fontSize: 12 }}>{resendMsg}</span>}
          </span>
        ) : (
          "Awaiting buyer signatures"
        ),
      })),
    });
  }

  return sections;
}

// Signature-drawing UI for the internal countersigner's own authenticated
// action — distinct from QuoteSignatureForm.tsx, which is the public,
// token-based buyer-facing version (different endpoint, different auth).
function CountersignCard({ quoteId, onSigned }: { quoteId: string; onSigned: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    padRef.current = new SignaturePad(canvas, { backgroundColor: "rgba(0,0,0,0)" });
  }, []);

  async function handleSubmit() {
    setError("");
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw your signature.");
      return;
    }
    setIsSubmitting(true);
    try {
      await quotesApi.countersign(quoteId, padRef.current.toDataURL("image/png"));
      onSigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit countersignature");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={sigStyles["sig-card"]} style={{ margin: "0 0 16px", maxWidth: 560 }}>
      <h2 className={sigStyles["sig-title"]}>Countersign this quote</h2>
      <p className={sigStyles["sig-subtitle"]}>All buyer signatures are in — sign below to complete this quote.</p>
      {error && <div className={sigStyles["sig-error"]}>{error}</div>}
      <div className={sigStyles["sig-canvas-wrap"]}>
        <canvas ref={canvasRef} className={sigStyles["sig-canvas"]} />
        <button type="button" className={sigStyles["sig-clear-btn"]} onClick={() => padRef.current?.clear()}>
          Clear
        </button>
      </div>
      <button type="button" className={sigStyles["sig-submit-btn"]} onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Countersign"}
      </button>
    </div>
  );
}

type Props = {
  showBackLink?: boolean;
};

export function QuoteDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [companies, setCompanies] = useState<AssociatedCompany[]>([]);
  const [deals, setDeals] = useState<AssociatedDeal[]>([]);
  const [contacts, setContacts] = useState<AssociatedContact[]>([]);
  const [signers, setSigners] = useState<QuoteSigner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState("");

  function refresh() {
    if (!id) return;
    Promise.all([
      quotesApi.getById(id),
      quotesApi.getCompanies(id),
      quotesApi.getDeals(id),
      quotesApi.getContacts(id),
      quotesApi.getSigners(id),
    ])
      .then(([q, cos, dls, cts, sgs]) => {
        setQuote(q);
        setCompanies(cos);
        setDeals(dls);
        setContacts(cts);
        setSigners(sgs);
      })
      .catch(() => setError("Quote not found"))
      .finally(() => setIsLoading(false));
  }

  useEffect(refresh, [id]);

  async function handleDelete() {
    if (!id) return;
    await quotesApi.delete(id);
    navigate("/quotes");
  }

  // Recalls the quote to Draft (its public link stops working — see
  // public.routes.ts's requirePublishedQuote) and immediately reopens the
  // wizard to edit it, matching the combined "Recall & edit" action's name.
  async function handleRecall() {
    if (!id) return;
    await quotesApi.recall(id);
    setIsRecallOpen(false);
    refresh();
    setIsEditOpen(true);
  }

  async function handleResend(signerId: string) {
    if (!id) return;
    setResendingId(signerId);
    setResendMsg("");
    try {
      await quotesApi.resendSignerLink(id, signerId);
      setResendMsg("Sent");
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResendingId(null);
    }
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const internalSigner = signers.find((s) => s.signerType === "internal");
  const canCountersign =
    quote?.hsQuoteStatus === "AWAITING_COUNTERSIGNATURE" &&
    !!internalSigner &&
    !internalSigner.signedAt &&
    internalSigner.userId === user?.id;

  return (
    <>
      {id && canCountersign && <CountersignCard quoteId={id} onSigned={refresh} />}

      <RecordDetail
        title={quote?.hsTitle ?? quote?.hsDealName ?? ""}
        icon={FileSpreadsheet}
        sections={quote ? buildSections(quote, signers, resendingId, resendMsg, handleResend) : []}
        backTo={showBackLink ? "/quotes" : undefined}
        backLabel="Quotes"
        isLoading={isLoading}
        actions={
          <RowActionsMenu
            label="Actions"
            icon={ChevronDown}
            actions={[
              // Its public link 404s while the quote is Draft (see
              // public.routes.ts's requirePublishedQuote) — no point
              // offering a preview that won't load.
              ...(quote?.hsQuoteStatus !== "DRAFT"
                ? [{ label: "Preview", icon: Eye, onClick: () => id && window.open(`/quotes/${id}/preview`, "_blank") }]
                : []),
              // A signed quote is a finalized, signed contract — never
              // editable again, recall included (there's nothing to "return
              // to Draft" once it's been signed).
              ...(quote?.isSigned
                ? []
                : [
                    // Expired quotes went through the same "sent to the buyer"
                    // step Published ones did, so editing them needs the same
                    // recall step first — the only way back to Draft is
                    // explicit, never an implicit side effect of opening the
                    // edit wizard.
                    quote?.hsQuoteStatus === "PUBLISHED" || quote?.hsQuoteStatus === "EXPIRED"
                      ? { label: "Recall & edit", icon: RotateCcw, onClick: () => setIsRecallOpen(true) }
                      : { label: "Edit", icon: Pencil, onClick: () => setIsEditOpen(true) },
                  ]),
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
                <RecordLink to={`/companies/${c.id}`} className="link" style={{ fontSize: 13, display: "block" }}>
                  {c.name ?? "—"}
                </RecordLink>
              )}
            />
            <AssociatedRecordsPanel
              title="Deals"
              items={deals}
              keyExtractor={(d) => d.id}
              renderItem={(d) => (
                <RecordLink to={`/deals/${d.id}`} className="link" style={{ fontSize: 13, display: "block" }}>
                  {d.dealname ?? "—"}
                </RecordLink>
              )}
            />
            <AssociatedRecordsPanel
              title="Contacts"
              items={contacts}
              keyExtractor={(c) => c.id}
              renderItem={(c) => (
                <RecordLink to={`/contacts/${c.id}`} className="link" style={{ fontSize: 13, display: "block" }}>
                  {[c.firstname, c.lastname].filter(Boolean).join(" ") || "—"}
                </RecordLink>
              )}
            />
          </>
        }
      />

      {isEditOpen && id && (
        <CreateQuoteWizard
          editQuoteId={id}
          onClose={() => {
            setIsEditOpen(false);
            refresh();
          }}
        />
      )}

      {isDeleteOpen && quote && (
        <ConfirmDialog
          title="Delete Quote?"
          message={`You are about to delete ${quote.hsTitle ?? quote.hsDealName ?? "this quote"}. This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}

      {isRecallOpen && quote && (
        <ConfirmDialog
          title="Recall Quote?"
          message="This quote will return to Draft status and its public link will stop working until it's created again."
          confirmLabel="Recall & edit"
          onConfirm={handleRecall}
          onCancel={() => setIsRecallOpen(false)}
        />
      )}
    </>
  );
}
