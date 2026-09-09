import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { ContactDetailContent } from './ContactDetailContent';

// Overlay route — rendered on top of whatever page was active when a
// contact was opened via <RecordLink>, per App.tsx's background-location
// routing. Closing goes back in history so the background page (list,
// another record's detail, etc.) is restored exactly as it was.
export function ContactPanel() {
  const navigate = useNavigate();
  return (
    <SlideOverPanel onClose={() => navigate(-1)}>
      <ContactDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
