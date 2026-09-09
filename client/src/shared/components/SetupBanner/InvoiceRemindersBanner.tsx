import { SetupBanner } from './SetupBanner';
import { useFeatureAssignmentConfigured } from '../../hooks/useSetupStatus';

export function InvoiceRemindersBanner() {
  const configured = useFeatureAssignmentConfigured('invoice_reminders');
  if (configured !== false) return null;

  return (
    <SetupBanner
      title="Invoice reminders aren't set up"
      description="Automated reminder emails won't be sent for overdue invoices until an email account is assigned to this feature."
      ctaLabel="Set up invoice reminders"
      ctaHref="/settings/objects?object=invoices&tab=reminder-rules"
      learnMoreTitle="Setting up invoice reminders"
      learnMoreContent={
        <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <li>Add a real SMTP mailbox under Settings &gt; Email Accounts &gt; Accounts, if you haven't already.</li>
          <li>Assign that account to "Invoice reminders" under Settings &gt; Email Accounts &gt; Feature Assignments.</li>
          <li>Fine-tune when reminders send under Settings &gt; Objects &gt; Invoices &gt; Reminder Rules.</li>
        </ol>
      }
    />
  );
}
