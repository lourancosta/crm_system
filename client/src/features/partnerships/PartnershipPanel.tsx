import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { PartnershipDetailContent } from './PartnershipDetailContent';

// Overlay route — rendered on top of whatever page was active when a
// partnership was opened via <RecordLink>, per App.tsx's background-location
// routing.
export function PartnershipPanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <PartnershipDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
