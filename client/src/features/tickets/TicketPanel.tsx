import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { TicketDetailContent } from './TicketDetailContent';

// Overlay route — rendered on top of whatever page was active when a
// ticket was opened via <RecordLink>, per App.tsx's background-location
// routing.
export function TicketPanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <TicketDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
