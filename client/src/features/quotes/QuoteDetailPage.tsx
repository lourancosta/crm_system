import { QuoteDetailContent } from './QuoteDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// QuotePanel.tsx + App.tsx's dual <Routes>).
export function QuoteDetailPage() {
  return <QuoteDetailContent />;
}
