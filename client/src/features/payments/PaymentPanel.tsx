import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { PaymentDetailContent } from './PaymentDetailContent';

// Overlay route — rendered on top of whatever page was active when a
// payment was opened via <RecordLink>, per App.tsx's background-location
// routing.
export function PaymentPanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <PaymentDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
