import { CreditMemoDetailContent } from './CreditMemoDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// CreditMemoPanel.tsx + App.tsx's dual <Routes>).
export function CreditMemoDetailPage() {
  return <CreditMemoDetailContent />;
}
