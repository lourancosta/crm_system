import { PartnershipDetailContent } from './PartnershipDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// PartnershipPanel.tsx + App.tsx's dual <Routes>).
export function PartnershipDetailPage() {
  return <PartnershipDetailContent />;
}
