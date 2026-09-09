import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { CompanyDetailContent } from './CompanyDetailContent';

// Overlay route — rendered on top of whatever page was active when a
// company was opened via <RecordLink>, per App.tsx's background-location
// routing.
export function CompanyPanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <CompanyDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
