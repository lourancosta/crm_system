import { ProductDetailContent } from './ProductDetailContent';

// Full-page route — used for direct navigation/refresh when there's no
// backgroundLocation to render the slide-over panel on top of (see
// ProductPanel.tsx + App.tsx's dual <Routes>).
export function ProductDetailPage() {
  return <ProductDetailContent />;
}
