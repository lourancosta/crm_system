import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { dealsApi } from '../../deals/api/deals';
import { accountDefaultsApi } from '../../settings/account-defaults/api/accountDefaults';
import type { AccountDefaults } from '../../settings/account-defaults/api/accountDefaults';
import { quotesApi } from '../api/quotes';
import { QuoteWizardStepper } from './QuoteWizardStepper';
import type { WizardStep } from './QuoteWizardStepper';
import { DealStep } from './DealStep';
import { BuyerInfoStep } from './BuyerInfoStep';
import { YourInfoStep } from './YourInfoStep';
import type { SenderInfo } from './YourInfoStep';
import { LineItemsStep } from './LineItemsStep';
import { DetailsStep } from './DetailsStep';
import type { QuoteDetails } from './DetailsStep';
import { QuoteWizardPreview } from './QuoteWizardPreview';
import { ReviewStep } from './ReviewStep';
import { SignatureStep } from './SignatureStep';
import type { AssociatedCompany, AssociatedContact, Deal } from '../../../shared/types/index';

const STEPS: WizardStep[] = [
  { key: 'deal', label: 'Deal' },
  { key: 'buyerInfo', label: 'Buyer Information' },
  { key: 'yourInfo', label: 'Your Information' },
  { key: 'lineItems', label: 'Line Items' },
  { key: 'templateDetails', label: 'Details' },
  { key: 'signature', label: 'Signature' },
  { key: 'review', label: 'Review' },
];

const EMPTY_SENDER: SenderInfo = { firstname: '', lastname: '', jobtitle: '', email: '', phone: '', companyName: '' };
const EMPTY_DETAILS: QuoteDetails = { name: '', expirationDate: '', commentsToBuyer: '', purchaseTerms: '' };

// YYYY-MM-DD in the browser's local calendar day, matching what an
// <input type="date"> sends/expects (Date#toISOString would shift across UTC
// day boundaries depending on timezone).
function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type Props = {
  onClose: () => void;
  // When set, the wizard hydrates from the existing quote's saved deal/
  // buyer/sender data instead of starting a fresh draft.
  editQuoteId?: string;
  // When set (and editQuoteId isn't), the wizard is opened from a specific
  // deal's own page — the deal is already known, so the Deal step is skipped
  // and the quote is created against it immediately instead of making the
  // user search for the deal they just came from.
  initialDeal?: Deal;
  // When set alongside initialDeal, the quote (and its line items) already
  // exist — e.g. built by AutomaticQuoteModal — so quote creation is skipped
  // entirely too; the wizard just resumes at Buyer Information.
  resumeQuoteId?: string;
};

export function CreateQuoteWizard({ onClose, editQuoteId, initialDeal, resumeQuoteId }: Props) {
  const { user } = useAuth();
  const isEditMode = !!editQuoteId;
  const isDealPreselected = !isEditMode && !!initialDeal;
  const [stepIndex, setStepIndex] = useState(isDealPreselected ? 1 : 0);
  const [quoteId, setQuoteId] = useState<string | null>(resumeQuoteId ?? null);
  const [savingAction, setSavingAction] = useState<'save' | 'next' | 'create' | null>(null);
  const isSaving = savingAction !== null;
  const [isHydrating, setIsHydrating] = useState(isEditMode || (isDealPreselected && !resumeQuoteId));
  const [error, setError] = useState('');
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  const [deal, setDeal] = useState<Deal | null>(initialDeal ?? null);
  const [savedDealId, setSavedDealId] = useState<string | null>(resumeQuoteId && initialDeal ? initialDeal.id : null);

  const [dealCompanies, setDealCompanies] = useState<AssociatedCompany[]>([]);
  const [dealContacts, setDealContacts] = useState<AssociatedContact[]>([]);
  const [isLoadingBuyerOptions, setIsLoadingBuyerOptions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [savedBuyer, setSavedBuyer] = useState<{ companyId: string | null; contactIds: string[] }>({
    companyId: null,
    contactIds: [],
  });

  // Sender/company info is no longer user-typed — it's read-only, sourced
  // from the logged-in user's own profile (Settings > Users) and the app's
  // Account Defaults (Settings > Account Management > Account Defaults).
  const [companyDefaults, setCompanyDefaults] = useState<AccountDefaults | null>(null);
  const [savedSender, setSavedSender] = useState<SenderInfo>(EMPTY_SENDER);
  const [lineItemsValid, setLineItemsValid] = useState(true);

  const [details, setDetails] = useState<QuoteDetails>(EMPTY_DETAILS);
  const [savedDetails, setSavedDetails] = useState<QuoteDetails>(EMPTY_DETAILS);

  const [selectedSignerContactIds, setSelectedSignerContactIds] = useState<string[]>([]);
  const [savedSignerContactIds, setSavedSignerContactIds] = useState<string[]>([]);
  const [selectedSignerUserId, setSelectedSignerUserId] = useState<string | null>(null);
  const [savedSignerUserId, setSavedSignerUserId] = useState<string | null>(null);

  useEffect(() => {
    accountDefaultsApi.get().then(setCompanyDefaults).catch(() => {});
  }, []);

  // Quote name adopts the deal's name the first time a deal is picked, and
  // keeps following it if the deal is later swapped for a different one —
  // but only as long as the name still matches whatever deal name was last
  // auto-filled, i.e. the user hasn't typed a custom name of their own in
  // between. lastAutoNameRef tracks that "last value we set" so a real edit
  // can be told apart from an unmodified auto-fill. Matches Settings >
  // Objects > Quote's own "Default expiration period" for the expiration
  // date below. Edit mode skips both: an existing quote already has its own
  // saved name/expiration date, hydrated separately below.
  const lastAutoNameRef = useRef<string | null>(null);
  useEffect(() => {
    if (isEditMode || !deal) return;
    const newName = deal.dealname ?? '';
    // previousAutoName is captured now, before the ref is overwritten below —
    // setDetails's updater only actually runs later, during React's state
    // processing, so reading lastAutoNameRef.current directly inside it would
    // already see the new value the line below just wrote (both this line
    // and the ref write execute synchronously, well before React gets around
    // to calling the updater), making every update look like a mismatch and
    // silently no-op from the second deal switch onward.
    const previousAutoName = lastAutoNameRef.current;
    setDetails((d) => (d.name !== '' && d.name !== previousAutoName ? d : { ...d, name: newName }));
    lastAutoNameRef.current = newName;
  }, [deal?.id, deal?.dealname, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
    quotesApi
      .getSettings()
      .then(({ defaultExpirationDays }) => {
        setDetails((d) => {
          if (d.expirationDate) return d;
          const date = new Date();
          date.setDate(date.getDate() + defaultExpirationDays);
          return { ...d, expirationDate: toDateInputValue(date) };
        });
      })
      .catch(() => {});
  }, [isEditMode]);

  function patchDetails(patch: Partial<QuoteDetails>) {
    setDetails((d) => ({ ...d, ...patch }));
  }

  const sender: SenderInfo = {
    firstname: user?.firstName ?? '',
    lastname: user?.lastName ?? '',
    jobtitle: user?.jobTitle ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    companyName: companyDefaults?.companyName ?? '',
  };

  // Fetches the deal's own candidate pool of companies/contacts whenever the
  // selected deal changes. Kept separate from selection state so hydrating
  // an existing quote's buyer choices (below) isn't immediately wiped out.
  useEffect(() => {
    if (!deal) {
      setDealCompanies([]);
      setDealContacts([]);
      return;
    }
    setIsLoadingBuyerOptions(true);
    Promise.all([dealsApi.getCompanies(deal.id), dealsApi.getContacts(deal.id)])
      .then(([companies, contacts]) => {
        setDealCompanies(companies);
        setDealContacts(contacts);
      })
      .finally(() => setIsLoadingBuyerOptions(false));
  }, [deal?.id]);

  // Mirrors saveCurrentStep's 'deal' branch below, run once up front instead
  // of waiting for the user to click Next on a step they never see — the
  // Deal step is skipped entirely (stepIndex starts at 'buyerInfo'), so
  // nothing else would ever create the quote row otherwise. Skipped when
  // resumeQuoteId is set — the quote already exists in that case.
  useEffect(() => {
    if (!isDealPreselected || !initialDeal || resumeQuoteId) return;
    let cancelled = false;
    (async () => {
      try {
        const created = await quotesApi.create(initialDeal.id);
        if (cancelled) return;
        setQuoteId(created.id);
        setSavedDealId(initialDeal.id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to create quote');
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editQuoteId) return;
    let cancelled = false;
    (async () => {
      setIsHydrating(true);
      try {
        const [quoteRecord, deals, companies, contacts, signers] = await Promise.all([
          quotesApi.getById(editQuoteId),
          quotesApi.getDeals(editQuoteId),
          quotesApi.getCompanies(editQuoteId),
          quotesApi.getContacts(editQuoteId),
          quotesApi.getSigners(editQuoteId),
        ]);
        if (cancelled) return;
        setQuoteId(editQuoteId);

        const associatedDeal = deals[0];
        if (associatedDeal) {
          const fullDeal = await dealsApi.getById(associatedDeal.id);
          if (cancelled) return;
          setDeal(fullDeal);
          setSavedDealId(fullDeal.id);
        }

        const company = companies[0];
        const contactIds = contacts.map((c) => c.id);
        setSelectedCompanyId(company?.id ?? null);
        setSelectedContactIds(contactIds);
        setSavedBuyer({ companyId: company?.id ?? null, contactIds });

        setSavedSender({
          firstname: quoteRecord.hsSenderFirstname ?? '',
          lastname: quoteRecord.hsSenderLastname ?? '',
          jobtitle: quoteRecord.hsSenderJobtitle ?? '',
          email: quoteRecord.hsSenderEmail ?? '',
          phone: quoteRecord.hsSenderPhone ?? '',
          companyName: quoteRecord.hsSenderCompanyName ?? '',
        });

        const hydratedDetails: QuoteDetails = {
          name: quoteRecord.hsTitle ?? '',
          expirationDate: quoteRecord.hsExpirationDate ? toDateInputValue(new Date(quoteRecord.hsExpirationDate)) : '',
          commentsToBuyer: quoteRecord.hsComments ?? '',
          purchaseTerms: quoteRecord.hsTerms ?? '',
        };
        setDetails(hydratedDetails);
        setSavedDetails(hydratedDetails);

        const signerContactIds = signers.filter((s) => s.signerType === 'contact').map((s) => s.contactId!);
        setSelectedSignerContactIds(signerContactIds);
        setSavedSignerContactIds(signerContactIds);

        const internalSignerId = signers.find((s) => s.signerType === 'internal')?.userId ?? null;
        setSelectedSignerUserId(internalSignerId);
        setSavedSignerUserId(internalSignerId);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load quote');
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editQuoteId]);

  function handleDealChange(newDeal: Deal | null) {
    setDeal(newDeal);
    setSelectedCompanyId(null);
    setSelectedContactIds([]);
  }

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => (prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]));
  }

  function toggleSignerContact(id: string) {
    setSelectedSignerContactIds((prev) => (prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]));
  }

  // A contact required to sign that gets deselected back on Buyer
  // Information (e.g. the deal or buyer changed) can no longer be a valid
  // required signer for this quote.
  useEffect(() => {
    setSelectedSignerContactIds((prev) => prev.filter((id) => selectedContactIds.includes(id)));
  }, [selectedContactIds]);

  const step = STEPS[stepIndex].key;

  const isDealDirty = (deal?.id ?? null) !== savedDealId;
  const isBuyerDirty =
    selectedCompanyId !== savedBuyer.companyId ||
    JSON.stringify([...selectedContactIds].sort()) !== JSON.stringify([...savedBuyer.contactIds].sort());
  const isSenderDirty = JSON.stringify(sender) !== JSON.stringify(savedSender);
  const isDetailsDirty = JSON.stringify(details) !== JSON.stringify(savedDetails);
  const isSignersDirty =
    JSON.stringify([...selectedSignerContactIds].sort()) !== JSON.stringify([...savedSignerContactIds].sort()) ||
    selectedSignerUserId !== savedSignerUserId;
  const isCurrentStepDirty =
    step === 'deal'
      ? isDealDirty
      : step === 'buyerInfo'
        ? isBuyerDirty
        : step === 'yourInfo'
          ? isSenderDirty
          : step === 'templateDetails'
            ? isDetailsDirty
            : step === 'signature'
              ? isSignersDirty
              : false;

  function closeWizard() {
    setIsExitConfirmOpen(false);
    onClose();
  }

  function handleExitAttempt() {
    if (isCurrentStepDirty) setIsExitConfirmOpen(true);
    else closeWizard();
  }

  const canGoNext =
    step === 'deal'
      ? !!deal
      : step === 'buyerInfo'
        ? !!selectedCompanyId && selectedContactIds.length > 0
        : step === 'lineItems'
          ? lineItemsValid
          : step === 'templateDetails'
            ? details.name.trim().length > 0
            : true;

  async function saveCurrentStep() {
    if (step === 'deal') {
      if (!deal) return;
      if (!quoteId) {
        const created = await quotesApi.create(deal.id);
        setQuoteId(created.id);
      } else if (isDealDirty) {
        await quotesApi.updateDeal(quoteId, deal.id);
        // Mirrors what updateDeal just did on the backend (quote.service.ts's
        // updateQuoteDeal clears the quote's buyer associations whenever the
        // deal actually changes) — keeps isBuyerDirty's baseline honest so
        // Exit doesn't think there's nothing to warn about.
        setSavedBuyer({ companyId: null, contactIds: [] });
      }
      setSavedDealId(deal.id);
    } else if (step === 'buyerInfo') {
      if (!quoteId || !selectedCompanyId) return;
      await quotesApi.updateBuyer(quoteId, selectedCompanyId, selectedContactIds);
      setSavedBuyer({ companyId: selectedCompanyId, contactIds: selectedContactIds });
    } else if (step === 'yourInfo') {
      if (!quoteId) return;
      await quotesApi.updateSender(quoteId, sender);
      setSavedSender(sender);
    } else if (step === 'templateDetails') {
      if (!quoteId) return;
      await quotesApi.updateDetails(quoteId, details);
      setSavedDetails(details);
    } else if (step === 'signature') {
      if (!quoteId) return;
      await quotesApi.updateSigners(quoteId, selectedSignerContactIds, selectedSignerUserId);
      setSavedSignerContactIds(selectedSignerContactIds);
      setSavedSignerUserId(selectedSignerUserId);
    }
  }

  async function handleNext() {
    setError('');
    setSavingAction('next');
    try {
      await saveCurrentStep();
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingAction(null);
    }
  }

  async function handleSave() {
    setError('');
    setSavingAction('save');
    try {
      await saveCurrentStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingAction(null);
    }
  }

  function handleBack() {
    setError('');
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleCreate() {
    if (!quoteId) return;
    setError('');
    setSavingAction('create');
    try {
      await quotesApi.publish(quoteId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
    } finally {
      setSavingAction(null);
    }
  }

  // Shared by the split-panel preview (every step but Line Items/Review) and
  // the Review step's own full-size version of the same preview.
  const previewProps = {
    quoteId,
    dealName: deal?.dealname ?? null,
    companyName: dealCompanies.find((c) => c.id === selectedCompanyId)?.name ?? null,
    buyerContactIds: selectedContactIds,
    sender,
    senderAvatarUrl: user?.avatarUrl ?? null,
    details,
  };

  return (
    <>
      <Modal
        title={isEditMode ? 'Edit Quote' : 'Create a Quote'}
        onClose={handleExitAttempt}
        variant="fullscreen"
        headerActions={<QuoteWizardStepper steps={STEPS} activeIndex={stepIndex} />}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button variant="secondary" type="button" onClick={handleExitAttempt} disabled={isSaving}>
                Exit
              </Button>
              {step !== 'lineItems' && step !== 'review' && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleSave}
                  disabled={!canGoNext || isSaving || isHydrating}
                  isLoading={savingAction === 'save'}
                >
                  Save
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {stepIndex > 0 && (
                <Button variant="secondary" type="button" onClick={handleBack} disabled={isSaving || isHydrating}>
                  Back
                </Button>
              )}
              {step === 'review' ? (
                <Button
                  variant="accent"
                  type="button"
                  onClick={handleCreate}
                  disabled={!quoteId || isSaving || isHydrating}
                  isLoading={savingAction === 'create'}
                >
                  Create
                </Button>
              ) : (
                <Button
                  variant="accent"
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext || isSaving || isHydrating}
                  isLoading={savingAction === 'next'}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        }
      >
        {isHydrating ? (
          <div style={{ padding: '32px 40px', color: 'var(--text-muted)' }}>Loading quote…</div>
        ) : (
          <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {error && <div className="alert alert-error">{error}</div>}
            {step === 'lineItems' ? (
              <LineItemsStep quoteId={quoteId} onValidityChange={setLineItemsValid} />
            ) : step === 'review' ? (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <ReviewStep {...previewProps} />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0, justifyContent: 'center' }}>
                <div style={{ flex: '0 1 480px', minWidth: 0, overflowY: 'auto' }}>
                  {step === 'deal' && <DealStep deal={deal} onChange={handleDealChange} />}
                  {step === 'buyerInfo' && (
                    <BuyerInfoStep
                      companies={dealCompanies}
                      contacts={dealContacts}
                      isLoading={isLoadingBuyerOptions}
                      selectedCompanyId={selectedCompanyId}
                      selectedContactIds={selectedContactIds}
                      onSelectCompany={setSelectedCompanyId}
                      onToggleContact={toggleContact}
                    />
                  )}
                  {step === 'yourInfo' && <YourInfoStep sender={sender} company={companyDefaults} />}
                  {step === 'templateDetails' && <DetailsStep details={details} onChange={patchDetails} />}
                  {step === 'signature' && (
                    <SignatureStep
                      buyerContacts={dealContacts.filter((c) => selectedContactIds.includes(c.id))}
                      selectedSignerContactIds={selectedSignerContactIds}
                      onToggleSignerContact={toggleSignerContact}
                      selectedSignerUserId={selectedSignerUserId}
                      onChangeSignerUserId={setSelectedSignerUserId}
                    />
                  )}
                </div>
                <div
                  style={{
                    flex: '0 1 620px',
                    minWidth: 0,
                    overflowY: 'auto',
                    borderLeft: '1px solid var(--border)',
                    paddingLeft: 24,
                  }}
                >
                  <QuoteWizardPreview {...previewProps} />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {isExitConfirmOpen && (
        <ConfirmDialog
          title="Exit without saving?"
          message="You have unsaved changes on this step. If you exit now, they'll be lost."
          confirmLabel="Exit without saving"
          cancelLabel="Go back"
          onConfirm={closeWizard}
          onCancel={() => setIsExitConfirmOpen(false)}
        />
      )}
    </>
  );
}
