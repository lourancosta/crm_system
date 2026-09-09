import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { DealDetailContent } from './DealDetailContent';

// Overlay route — rendered on top of whatever page was active when a deal
// was opened via <RecordLink>, per App.tsx's background-location routing.
export function DealPanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <DealDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
