import { CompanyDetailContent } from './CompanyDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// CompanyPanel.tsx + App.tsx's dual <Routes>).
export function CompanyDetailPage() {
  return <CompanyDetailContent />;
}
