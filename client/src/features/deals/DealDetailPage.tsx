import { DealDetailContent } from './DealDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// DealPanel.tsx + App.tsx's dual <Routes>).
export function DealDetailPage() {
  return <DealDetailContent />;
}
