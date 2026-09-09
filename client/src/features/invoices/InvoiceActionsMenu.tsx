import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, Copy, CreditCard, Eye, Pencil, Trash2, Wallet } from 'lucide-react';
import { invoicesApi } from './api/invoices';
import { companiesApi } from '../companies/api/companies';
import { contactsApi } from '../contacts/api/contacts';
import { paymentsApi } from '../payments/api/payments';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import { Button } from '../../shared/components/Button/Button';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { Modal } from '../../shared/components/Modal/Modal';
import { PaymentForm } from '../payments/PaymentForm';
import { ManageCreditMemoModal } from './ManageCreditMemoModal';
import { CreateInvoiceForm, CREATE_INVOICE_FORM_ID } from './CreateInvoiceForm';
import type { CloneInvoiceSeed, InitialInvoiceData, InvoiceType } from './CreateInvoiceForm';
import type { AssociatedCreditMemo, AssociatedInvoice, CreditMemoApplication, CreatePaymentInput, Invoice } from '../../shared/types/index';

// Same rule as InvoiceDetailContent.tsx's own EDITABLE_STATUSES — kept as a
// local duplicate (a 2-item set) rather than importing across files, so this
// component stays fully self-contained.
const EDITABLE_STATUSES = new Set(['open', 'draft']);

type Props = {
  invoice: AssociatedInvoice;
  // Called after any action that changes the invoice (edit/clone/payment/
  // credit memo/void/delete) so the parent can refetch its own list — this
  // component keeps no invoice list of its own.
  onChange: () => void;
};

// Per-row equivalent of InvoiceDetailContent.tsx's Actions menu (Edit,
// Register Payment, Apply or manage credit, Preview, Clone, Void,
// Delete) — same actions, same enable/disable rules, same modals, just fed
// from a single AssociatedInvoice card instead of the full invoice detail
// page. Extracted here so DealDetailContent.tsx's and CompanyDetailContent.
// tsx's Invoices panels don't each need their own copy of this logic.
export function InvoiceActionsMenu({ invoice, onChange }: Props) {
  const navigate = useNavigate();

  const [editData, setEditData] = useState<InitialInvoiceData | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isEditDirty, setIsEditDirty] = useState(false);
  const [isEditExitConfirmOpen, setIsEditExitConfirmOpen] = useState(false);

  const [cloneSeed, setCloneSeed] = useState<CloneInvoiceSeed | null>(null);
  const [cloneNotes, setCloneNotes] = useState<string[]>([]);
  const [isCloneSubmitting, setIsCloneSubmitting] = useState(false);
  const [isCloneDirty, setIsCloneDirty] = useState(false);
  const [isCloneExitConfirmOpen, setIsCloneExitConfirmOpen] = useState(false);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [manageCreditMemoData, setManageCreditMemoData] = useState<{
    invoice: Invoice;
    companyId: string;
    initialApplications: CreditMemoApplication[];
    existingCreditMemos: AssociatedCreditMemo[];
  } | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);

  const invoiceStatus = (invoice.hsInvoiceStatus ?? '').toLowerCase();
  const canEdit = EDITABLE_STATUSES.has(invoiceStatus);
  const isFullyPaid = Number(invoice.hsBalanceDue ?? 0) <= 0;
  const canVoid = invoiceStatus !== 'voided' && invoiceStatus !== 'paid';
  const canPreview = ['open', 'paid', 'voided'].includes(invoiceStatus);

  // Mirrors InvoiceDetailContent.tsx's openEditModal — fetches everything
  // CreateInvoiceForm needs (full invoice + line items + discounts + credit
  // memo applications + the invoice's own company/contact) on demand, since
  // AssociatedInvoice alone isn't enough. Silently no-ops if there's no
  // associated company/contact yet, same as the page version.
  async function openEditModal() {
    const [inv, lineItems, discounts, creditMemoApplications, companies, contacts] = await Promise.all([
      invoicesApi.getById(invoice.id),
      invoicesApi.getLineItems(invoice.id),
      invoicesApi.getDiscounts(invoice.id),
      invoicesApi.getCreditMemoApplications(invoice.id),
      invoicesApi.getCompanies(invoice.id),
      invoicesApi.getContacts(invoice.id),
    ]);
    if (companies.length === 0 || contacts.length === 0) return;
    const [company, contact] = await Promise.all([
      companiesApi.getById(companies[0].id),
      contactsApi.getById(contacts[0].id),
    ]);
    setEditData({ invoice: inv, lineItems, discounts, creditMemoApplications, company, contact });
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
    closeEditModal();
    onChange();
  }

  // Mirrors InvoiceDetailContent.tsx's handleCloneInvoice.
  async function handleCloneInvoice() {
    const preview = await invoicesApi.getClonePreview(invoice.id);
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

  // Unlike the page version (which navigates from the invoice's own detail
  // page to the freshly cloned one), this still navigates — a clone really
  // is a different record than the one this card represents.
  function handleClonePublished(created: Invoice) {
    setCloneSeed(null);
    navigate(`/invoices/${created.id}`);
  }

  async function handleRegisterPayment(data: CreatePaymentInput) {
    await paymentsApi.create(data);
    setShowPaymentForm(false);
    onChange();
  }

  // Mirrors InvoiceDetailContent.tsx's Manage Credit Memo wiring — fetches
  // the full invoice, its credit-memo applications/associations, and its
  // company (silently no-ops with no company, same convention as
  // openEditModal above) since AssociatedInvoice alone isn't enough.
  async function openManageCreditMemoModal() {
    const [inv, creditMemoApplications, creditMemos, companies] = await Promise.all([
      invoicesApi.getById(invoice.id),
      invoicesApi.getCreditMemoApplications(invoice.id),
      invoicesApi.getCreditMemos(invoice.id),
      invoicesApi.getCompanies(invoice.id),
    ]);
    if (companies.length === 0) return;
    setManageCreditMemoData({ invoice: inv, companyId: companies[0].id, initialApplications: creditMemoApplications, existingCreditMemos: creditMemos });
  }

  async function handleDeleteInvoice() {
    await invoicesApi.delete(invoice.id);
    setIsDeleteOpen(false);
    onChange();
  }

  async function handleVoidInvoice() {
    await invoicesApi.void(invoice.id);
    setIsVoidOpen(false);
    onChange();
  }

  return (
    <>
      <RowActionsMenu
        actions={[
          {
            label: 'Edit',
            icon: Pencil,
            disabled: !canEdit,
            title: !canEdit ? 'Only open or draft invoices can be edited' : undefined,
            onClick: openEditModal,
          },
          {
            label: 'Register Payment',
            icon: CreditCard,
            disabled: isFullyPaid,
            title: isFullyPaid ? 'This invoice has no remaining balance due' : undefined,
            onClick: () => setShowPaymentForm(true),
          },
          {
            label: 'Apply or manage credit',
            icon: Wallet,
            disabled: !['open', 'paid'].includes(invoiceStatus),
            title: !['open', 'paid'].includes(invoiceStatus) ? 'Only open or paid invoices can have credit applied' : undefined,
            onClick: openManageCreditMemoModal,
          },
          {
            label: 'Preview',
            icon: Eye,
            disabled: !canPreview,
            title: !canPreview ? 'Only open, paid, or voided invoices can be previewed' : undefined,
            onClick: () => window.open(`/invoices/${invoice.id}/preview`, '_blank'),
          },
          {
            label: 'Clone',
            icon: Copy,
            onClick: handleCloneInvoice,
          },
          ...(canVoid ? [{ label: 'Void', icon: Ban, variant: 'danger' as const, onClick: () => setIsVoidOpen(true) }] : []),
          {
            label: 'Delete',
            icon: Trash2,
            variant: 'danger' as const,
            disabled: !canEdit,
            title: !canEdit ? 'Only open or draft invoices can be deleted' : undefined,
            onClick: () => setIsDeleteOpen(true),
          },
        ]}
      />

      {showPaymentForm && (
        <Modal title="Register Payment" onClose={() => setShowPaymentForm(false)}>
          <PaymentForm
            fixedInvoice={{ id: invoice.id, label: invoice.hsNumber ?? invoice.id }}
            onSubmit={handleRegisterPayment}
            onCancel={() => setShowPaymentForm(false)}
          />
        </Modal>
      )}

      {manageCreditMemoData && (
        <ManageCreditMemoModal
          invoice={manageCreditMemoData.invoice}
          companyId={manageCreditMemoData.companyId}
          initialApplications={manageCreditMemoData.initialApplications}
          existingCreditMemos={manageCreditMemoData.existingCreditMemos}
          onClose={() => setManageCreditMemoData(null)}
          onSaved={() => {
            setManageCreditMemoData(null);
            onChange();
          }}
        />
      )}

      {editData &&
        (() => {
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
                onDraftSaved={onChange}
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

      {isDeleteOpen && (
        <ConfirmDialog
          title="Delete Invoice?"
          message={`You are about to delete ${invoice.hsNumber || 'this invoice'}. This can't be undone.`}
          onConfirm={handleDeleteInvoice}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}

      {isVoidOpen && (
        <ConfirmDialog
          title="Void Invoice?"
          message={`You are about to void ${invoice.hsNumber || 'this invoice'}. This can't be undone.`}
          confirmLabel="Void"
          onConfirm={handleVoidInvoice}
          onCancel={() => setIsVoidOpen(false)}
        />
      )}
    </>
  );
}
