import { TicketDetailContent } from './TicketDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// TicketPanel.tsx + App.tsx's dual <Routes>).
export function TicketDetailPage() {
  return <TicketDetailContent />;
}
