import { PaymentDetailContent } from './PaymentDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// PaymentPanel.tsx + App.tsx's dual <Routes>).
export function PaymentDetailPage() {
  return <PaymentDetailContent />;
}
