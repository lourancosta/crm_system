import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { InvoiceDetailContent } from './InvoiceDetailContent';

// Overlay route — rendered on top of whatever page was active when an
// invoice was opened via <RecordLink>, per App.tsx's background-location
// routing.
export function InvoicePanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <InvoiceDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
