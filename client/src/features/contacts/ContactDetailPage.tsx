import { ContactDetailContent } from './ContactDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// ContactPanel.tsx + App.tsx's dual <Routes> for the overlay case).
export function ContactDetailPage() {
  return <ContactDetailContent />;
}
