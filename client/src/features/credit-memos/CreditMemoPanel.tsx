import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { CreditMemoDetailContent } from './CreditMemoDetailContent';

// Overlay route — rendered on top of whatever page was active when a
// credit memo was opened via <RecordLink>, per App.tsx's background-location
// routing.
export function CreditMemoPanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <CreditMemoDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
