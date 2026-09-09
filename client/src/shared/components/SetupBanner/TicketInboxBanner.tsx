import { SetupBanner } from './SetupBanner';
import { useSupportInboxConfigured } from '../../hooks/useSetupStatus';

export function TicketInboxBanner() {
  const configured = useSupportInboxConfigured();
  if (configured !== false) return null;

  return (
    <SetupBanner
      title="Ticket inbox isn't connected"
      description="Incoming support emails won't automatically create tickets until a mailbox is connected."
      ctaLabel="Connect the support inbox"
      ctaHref="/settings/objects?object=tickets&tab=support-inbox"
      learnMoreTitle="Connecting the support inbox"
      learnMoreContent={
        <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <li>
            In portal.azure.com, go to Microsoft Entra ID &gt; App registrations &gt; New registration. Copy the
            Application (client) ID and Directory (tenant) ID from the Overview page.
          </li>
          <li>
            Under API permissions, add a permission for "Office 365 Exchange Online" &gt; Application permissions
            &gt; <code>IMAP.AccessAsApp</code>, then click Grant admin consent.
          </li>
          <li>Under Certificates &amp; secrets, create a new client secret and copy its value immediately.</li>
          <li>
            (Recommended) Scope the app to just the support mailbox with an Exchange Online PowerShell Application
            Access Policy, so it can't read every mailbox in the tenant.
          </li>
          <li>
            In Settings &gt; Tickets &gt; Support Inbox, connect using host <code>outlook.office365.com</code>, port{' '}
            <code>993</code>, TLS on, and authentication "Microsoft 365 (OAuth)" with the Tenant ID / Client ID /
            Client secret from above.
          </li>
        </ol>
      }
    />
  );
}
