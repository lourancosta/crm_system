import { InvoiceDetailContent } from './InvoiceDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// InvoicePanel.tsx + App.tsx's dual <Routes>).
export function InvoiceDetailPage() {
  return <InvoiceDetailContent />;
}
