import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { AuthProvider } from "./shared/contexts/AuthContext";
import { Layout } from "./shared/components/Layout/Layout";
import { ProtectedRoute } from "./shared/components/ProtectedRoute/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { ForgotPasswordPage } from "./features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ContactsPage } from "./features/contacts/ContactsPage";
import { ContactDetailPage } from "./features/contacts/ContactDetailPage";
import { ContactPanel } from "./features/contacts/ContactPanel";
import { InvoicesPage } from "./features/invoices/InvoicesPage";
import { QuotesPage } from "./features/quotes/QuotesPage";
import { QuoteDetailPage } from "./features/quotes/QuoteDetailPage";
import { QuotePanel } from "./features/quotes/QuotePanel";
import { DealsPage } from "./features/deals/DealsPage";
import { DealDetailPage } from "./features/deals/DealDetailPage";
import { DealPanel } from "./features/deals/DealPanel";
import { CompaniesPage } from "./features/companies/CompaniesPage";
import { CompanyDetailPage } from "./features/companies/CompanyDetailPage";
import { CompanyPanel } from "./features/companies/CompanyPanel";
import { LicensesPage } from "./features/licenses/LicensesPage";
import { LicenseDetailPage } from "./features/licenses/LicenseDetailPage";
import { LicensePanel } from "./features/licenses/LicensePanel";
import { InvoiceDetailPage } from "./features/invoices/InvoiceDetailPage";
import { InvoicePanel } from "./features/invoices/InvoicePanel";
import { PartnershipsPage } from "./features/partnerships/PartnershipsPage";
import { PartnershipDetailPage } from "./features/partnerships/PartnershipDetailPage";
import { PartnershipPanel } from "./features/partnerships/PartnershipPanel";
import { InvoicePreviewPage } from "./features/invoices/InvoicePreviewPage";
import { QuotePreviewPage } from "./features/quotes/QuotePreviewPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ProductsPage } from "./features/products/ProductsPage";
import { ProductDetailPage } from "./features/products/ProductDetailPage";
import { ProductPanel } from "./features/products/ProductPanel";
import { PaymentsPage } from "./features/payments/PaymentsPage";
import { PaymentDetailPage } from "./features/payments/PaymentDetailPage";
import { PaymentPanel } from "./features/payments/PaymentPanel";
import { TicketsPage } from "./features/tickets/TicketsPage";
import { TicketDetailPage } from "./features/tickets/TicketDetailPage";
import { TicketPanel } from "./features/tickets/TicketPanel";
import { CreditMemosPage } from "./features/credit-memos/CreditMemosPage";
import { CreditMemoDetailPage } from "./features/credit-memos/CreditMemoDetailPage";
import { CreditMemoPanel } from "./features/credit-memos/CreditMemoPanel";
import { ContractsPage } from "./features/contracts/ContractsPage";
import { CoursePage } from "./features/course/CoursePage";
import { KnowledgeBasePage } from "./features/knowledge-base/KnowledgeBasePage";
import { KnowledgeBaseCategoryPage } from "./features/knowledge-base/KnowledgeBaseCategoryPage";
import { KnowledgeBaseArticlePage } from "./features/knowledge-base/KnowledgeBaseArticlePage";
import { EmailTemplatesPage } from "./features/marketing/EmailTemplatesPage";
import { EmailTemplateEditorPage } from "./features/marketing/EmailTemplateEditorPage";
import type { AccountType } from "./shared/types/index";

// Modules with no partner/customer story at all (see src/lib/permissions.ts's
// MODULES on the backend, which is the real boundary — this is just so a
// portal login never even sees the page shell for something they have no
// grant for).
const INTERNAL_ONLY: AccountType[] = ["internal"];
const PARTNER_SHARED: AccountType[] = ["internal", "partner"];
const PARTNER_AND_CUSTOMER: AccountType[] = ["internal", "partner", "customer"];

function PrivatePage({ children, allowedTypes }: { children: ReactNode; allowedTypes?: AccountType[] }) {
  return (
    <ProtectedRoute allowedTypes={allowedTypes}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

// Panel routes render on top of an already-rendered PrivatePage (the
// background location's own Sidebar/TopBar are still mounted), so they skip
// <Layout> entirely — SlideOverPanel is a fixed, full-viewport overlay that
// doesn't need its own app chrome. Wrapping it in Layout previously stacked
// a second 100vh app shell in normal document flow below the background
// page, which is what made the page "scrollable"/"duplicated" behind the panel.
function PrivatePanel({ children, allowedTypes }: { children: ReactNode; allowedTypes?: AccountType[] }) {
  return <ProtectedRoute allowedTypes={allowedTypes}>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

// Two <Routes> trees (React Router's "background location" / modal-routes
// pattern): the first renders at the *frozen* backgroundLocation whenever a
// panel is open, so the page you were already on never unmounts; the second
// renders panel-only routes at the *real* current location, on top. Direct
// navigation/refresh has no backgroundLocation in state (router state
// doesn't survive a reload), so it falls through to the first tree's normal
// full-page route instead — see ContactDetailPage.tsx vs ContactPanel.tsx.
function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <DashboardPage />
            </PrivatePage>
          }
        />
        <Route
          path="/contacts"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <ContactsPage />
            </PrivatePage>
          }
        />
        <Route
          path="/contacts/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <ContactDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/quotes"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <QuotesPage />
            </PrivatePage>
          }
        />
        <Route
          path="/quotes/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <QuoteDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/invoices"
          element={
            <PrivatePage allowedTypes={PARTNER_SHARED}>
              <InvoicesPage />
            </PrivatePage>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <PrivatePage allowedTypes={PARTNER_SHARED}>
              <InvoiceDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/payments"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <PaymentsPage />
            </PrivatePage>
          }
        />
        <Route
          path="/payments/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <PaymentDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/credit-memos"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <CreditMemosPage />
            </PrivatePage>
          }
        />
        <Route
          path="/credit-memos/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <CreditMemoDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/contracts"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <ContractsPage />
            </PrivatePage>
          }
        />
        <Route
          path="/deals"
          element={
            <PrivatePage allowedTypes={PARTNER_SHARED}>
              <DealsPage />
            </PrivatePage>
          }
        />
        <Route
          path="/deals/:id"
          element={
            <PrivatePage allowedTypes={PARTNER_SHARED}>
              <DealDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/companies"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <CompaniesPage />
            </PrivatePage>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <CompanyDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/licenses"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <LicensesPage />
            </PrivatePage>
          }
        />
        <Route
          path="/licenses/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <LicenseDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/partnerships"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <PartnershipsPage />
            </PrivatePage>
          }
        />
        <Route
          path="/partnerships/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <PartnershipDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/products"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <ProductsPage />
            </PrivatePage>
          }
        />
        <Route
          path="/products/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <ProductDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/tickets"
          element={
            <PrivatePage allowedTypes={PARTNER_AND_CUSTOMER}>
              <TicketsPage />
            </PrivatePage>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <PrivatePage allowedTypes={PARTNER_AND_CUSTOMER}>
              <TicketDetailPage />
            </PrivatePage>
          }
        />
        <Route
          path="/course"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <CoursePage />
            </PrivatePage>
          }
        />
        <Route
          path="/settings/*"
          element={
            <PrivatePage>
              <SettingsPage />
            </PrivatePage>
          }
        />
        <Route
          path="/marketing/emails"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <EmailTemplatesPage />
            </PrivatePage>
          }
        />
        <Route
          path="/marketing/emails/new"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <EmailTemplateEditorPage />
            </PrivatePage>
          }
        />
        <Route
          path="/marketing/emails/:id"
          element={
            <PrivatePage allowedTypes={INTERNAL_ONLY}>
              <EmailTemplateEditorPage />
            </PrivatePage>
          }
        />
        <Route path="/invoices/:id/preview" element={<InvoicePreviewPage />} />
        <Route path="/quotes/:id/preview" element={<QuotePreviewPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="/knowledge-base/:categorySlug" element={<KnowledgeBaseCategoryPage />} />
        <Route path="/knowledge-base/:categorySlug/:subcategorySlug/:articleSlug" element={<KnowledgeBaseArticlePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route
            path="/contacts/:id"
            element={
              <PrivatePanel allowedTypes={INTERNAL_ONLY}>
                <ContactPanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/deals/:id"
            element={
              <PrivatePanel allowedTypes={PARTNER_SHARED}>
                <DealPanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/companies/:id"
            element={
              <PrivatePanel allowedTypes={INTERNAL_ONLY}>
                <CompanyPanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/partnerships/:id"
            element={
              <PrivatePanel allowedTypes={INTERNAL_ONLY}>
                <PartnershipPanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/products/:id"
            element={
              <PrivatePanel allowedTypes={INTERNAL_ONLY}>
                <ProductPanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/payments/:id"
            element={
              <PrivatePanel allowedTypes={INTERNAL_ONLY}>
                <PaymentPanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <PrivatePanel allowedTypes={PARTNER_AND_CUSTOMER}>
                <TicketPanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/quotes/:id"
            element={
              <PrivatePanel allowedTypes={INTERNAL_ONLY}>
                <QuotePanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <PrivatePanel allowedTypes={PARTNER_SHARED}>
                <InvoicePanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/credit-memos/:id"
            element={
              <PrivatePanel allowedTypes={INTERNAL_ONLY}>
                <CreditMemoPanel />
              </PrivatePanel>
            }
          />
          <Route
            path="/licenses/:id"
            element={
              <PrivatePanel allowedTypes={INTERNAL_ONLY}>
                <LicensePanel />
              </PrivatePanel>
            }
          />
        </Routes>
      )}
    </>
  );
}
