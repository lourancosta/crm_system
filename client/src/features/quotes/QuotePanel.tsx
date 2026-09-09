import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { QuoteDetailContent } from './QuoteDetailContent';

// Overlay route — rendered on top of whatever page was active when a quote
// was opened via <RecordLink>, per App.tsx's background-location routing.
export function QuotePanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <QuoteDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
