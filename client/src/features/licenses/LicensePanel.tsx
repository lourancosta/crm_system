import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { LicenseDetailContent } from './LicenseDetailContent';

// Overlay route — rendered on top of whatever page was active when a
// license was opened via <RecordLink>, per App.tsx's background-location
// routing.
export function LicensePanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <LicenseDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
