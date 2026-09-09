import express from 'express';
import cors from 'cors';
import path from 'path';
import { authRoutes } from './modules/auth/auth.routes';
import { contactRoutes } from './modules/contacts/contact.routes';
import { invoiceRoutes } from './modules/invoices/invoice.routes';
import { dealRoutes } from './modules/deals/deal.routes';
import { companyRoutes } from './modules/companies/company.routes';
import { licenseRoutes } from './modules/licenses/license.routes';
import { partnershipRoutes } from './modules/partnerships/partnership.routes';
import { associationRoutes } from './modules/associations/association.routes';
import { publicRoutes } from './modules/public/public.routes';
import { userRoutes } from './modules/users/user.routes';
import { productRoutes } from './modules/products/product.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { reminderRuleRoutes } from './modules/notifications/reminderRule.routes';
import { paymentRoutes } from './modules/payments/payment.routes';
import { historyRoutes } from './modules/history/history.routes';
import { pipelineRoutes } from './modules/pipelines/pipeline.routes';
import { ticketRoutes } from './modules/tickets/ticket.routes';
import { creditMemoRoutes } from './modules/creditMemos/creditMemo.routes';
import { knowledgeBaseBrowseRoutes, knowledgeBaseRoutes } from './modules/knowledgeBase/kb.routes';
import { knowledgeBasePublicRoutes } from './modules/knowledgeBase/kb.public.routes';
import { emailAccountRoutes } from './modules/emailAccounts/emailAccount.routes';
import { emailTemplateRoutes } from './modules/emailTemplates/emailTemplate.routes';
import { supportInboxRoutes } from './modules/supportInbox/supportInbox.routes';
import { permissionSetRoutes } from './modules/permissionSets/permissionSet.routes';
import { lifecycleStageRoutes } from './modules/lifecycleStages/lifecycleStage.routes';
import { searchRoutes } from './modules/search/search.routes';
import { quoteRoutes } from './modules/quotes/quote.routes';
import { accountDefaultsRoutes } from './modules/accountDefaults/accountDefaults.routes';
import { googleStorageSettingsRoutes } from './modules/googleStorageSettings/googleStorageSettings.routes';
import { snippetRoutes } from './modules/snippets/snippet.routes';
import { objectPropertiesRoutes } from './modules/objectProperties/objectProperties.routes';
import { authenticate, optionalAuthenticate } from './middlewares/auth';
import { requireInternal } from './middlewares/authorize';
import { errorHandler } from './middlewares/errorHandler';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/public', publicRoutes);
app.use('/api/public/knowledge-base', optionalAuthenticate, knowledgeBasePublicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authenticate, requireInternal, dashboardRoutes);
app.use('/api/contacts', authenticate, contactRoutes);
app.use('/api/invoices', authenticate, invoiceRoutes);
app.use('/api/deals', authenticate, dealRoutes);
app.use('/api/companies', authenticate, companyRoutes);
app.use('/api/licenses', authenticate, licenseRoutes);
app.use('/api/partnerships', authenticate, partnershipRoutes);
app.use('/api/associations', authenticate, associationRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/invoice-reminder-rules', authenticate, requireInternal, reminderRuleRoutes);
app.use('/api/payments', authenticate, paymentRoutes);
app.use('/api/history', authenticate, requireInternal, historyRoutes);
app.use('/api/pipelines', authenticate, requireInternal, pipelineRoutes);
app.use('/api/tickets', authenticate, ticketRoutes);
app.use('/api/credit-memos', authenticate, creditMemoRoutes);
app.use('/api/knowledge-base/browse', authenticate, knowledgeBaseBrowseRoutes);
app.use('/api/knowledge-base', authenticate, requireInternal, knowledgeBaseRoutes);
app.use('/api/email-accounts', authenticate, requireInternal, emailAccountRoutes);
app.use('/api/email-templates', authenticate, requireInternal, emailTemplateRoutes);
app.use('/api/support-inboxes', authenticate, requireInternal, supportInboxRoutes);
app.use('/api/permission-sets', authenticate, requireInternal, permissionSetRoutes);
app.use('/api/lifecycle-stages', authenticate, requireInternal, lifecycleStageRoutes);
app.use('/api/search', authenticate, searchRoutes);
app.use('/api/quotes', authenticate, quoteRoutes);
app.use('/api/snippets', authenticate, requireInternal, snippetRoutes);
app.use('/api/account-defaults', authenticate, requireInternal, accountDefaultsRoutes);
app.use('/api/google-storage-settings', authenticate, requireInternal, googleStorageSettingsRoutes);
app.use('/api/object-properties', authenticate, requireInternal, objectPropertiesRoutes);

// Always serves the compiled client build — this Express server only ever
// runs from the built image (never alongside `npm run dev`'s Vite dev
// server, which proxies to this backend but serves the frontend itself), so
// there's no case where client/dist shouldn't be served. Previously gated
// behind NODE_ENV === 'production', which silently disabled this entirely
// once nothing in the deploy pipeline set that var, breaking every non-API
// route while /healthz kept working.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(errorHandler);
