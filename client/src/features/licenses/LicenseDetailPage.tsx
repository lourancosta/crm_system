import { LicenseDetailContent } from './LicenseDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// LicensePanel.tsx + App.tsx's dual <Routes>).
export function LicenseDetailPage() {
  return <LicenseDetailContent />;
}
