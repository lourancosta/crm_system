import { useNavigate } from 'react-router-dom';
import { SlideOverPanel } from '../../shared/components/SlideOverPanel/SlideOverPanel';
import { ProductDetailContent } from './ProductDetailContent';

// Overlay route — rendered on top of whatever page was active when a
// product was opened via <RecordLink>, per App.tsx's background-location
// routing.
export function ProductPanel() {
  const navigate = useNavigate();
  return (
    // Narrower than the default wide panel — Products has no aside
    // (no association panels), so RecordDetail renders its single-column
    // 720px-max-width layout; matching the panel width to that avoids a
    // large empty gap on the right.
    <SlideOverPanel onClose={() => navigate(-1)} width="min(90vw, 800px)">
      <ProductDetailContent showBackLink={false} />
    </SlideOverPanel>
  );
}
