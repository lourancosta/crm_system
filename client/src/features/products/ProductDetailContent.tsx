import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Package, Trash2 } from 'lucide-react';
import { productsApi } from './api/products';
import { historyApi } from '../../shared/api/history';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog';
import { RecordDetail } from '../../shared/components/RecordDetail/RecordDetail';
import { GroupedPropertiesPanel } from '../../shared/components/RecordDetail/GroupedPropertiesPanel';
import { RowActionsMenu } from '../../shared/components/Dropdown/RowActionsMenu';
import type { HistoryEvent, SectionDef } from '../../shared/components/RecordDetail/RecordDetail';
import { useHistoryTimeline } from '../../shared/hooks/useHistoryTimeline';
import { toHistoryEvents } from '../../shared/utils/historyEvents';
import { formatQuantity } from '../../shared/utils/numberInput';
import type { HistoryEntry, LogActivityInput, LoggableActivityType, Product } from '../../shared/types/index';

// Products aren't "people you'd call or meet with" the way a contact/deal is
// — only Note makes sense here (see RecordDetail's loggableActivityTypes).
const NOTE_ONLY: LoggableActivityType[] = ['note'];

function fmtPrice(val: string | null) {
  if (!val) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
}

function fmtType(val: string | null) {
  if (!val) return null;
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildSections(p: Product): SectionDef[] {
  return [
    {
      title: 'Product Information',
      fields: [
        { label: 'Name', value: p.name },
        { label: 'Description', value: p.description },
        { label: 'Product type', value: fmtType(p.hsProductType) },
        { label: 'Module', value: p.module },
        { label: 'Group license', value: p.groupLicense },
        { label: 'Folder', value: p.hsFolder },
        { label: 'Status', value: p.hsStatus },
        { label: 'Classification', value: fmtType(p.hsProductClassification) },
      ],
    },
    {
      title: 'Pricing',
      fields: [
        { label: 'Price (USD)', value: fmtPrice(p.hsPriceUsd) },
        { label: 'Price', value: fmtPrice(p.price) },
        { label: 'Pricing model', value: fmtType(p.hsPricingModel) },
        { label: 'Billing frequency', value: fmtType(p.recurringbillingfrequency) },
      ],
    },
    {
      title: 'Capacity',
      fields: [
        { label: 'Qty / month', value: formatQuantity(p.controllerOriginalQuantity) },
        { label: 'Total license units', value: formatQuantity(p.controllerTotalLicenseUnits) },
        { label: 'Unit price', value: fmtPrice(p.controllerUnitPrice) },
      ],
    },
  ];
}

function buildHistoryEvents(p: Product, history: HistoryEntry[]): HistoryEvent[] {
  return [
    { date: p.createdate ?? p.createdAt, title: 'Product created' },
    { date: p.updatedAt, title: 'Product last updated' },
    ...toHistoryEvents(history),
  ];
}

type Props = {
  // Full-page mode shows a "← Products" back link since it's the only way
  // out; the slide-over panel already has its own close affordance, so it
  // omits this (see ContactDetailContent.tsx for the original rationale).
  showBackLink?: boolean;
};

export function ProductDetailContent({ showBackLink = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const timeline = useHistoryTimeline('products', id);

  function loadProduct() {
    if (!id) return;
    productsApi.getById(id).then(setProduct);
  }

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    productsApi
      .getById(id)
      .then(setProduct)
      .catch(() => setError('Product not found'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleLogActivity(input: LogActivityInput) {
    if (!product) return;
    await historyApi.logActivity('products', product.id, input);
    timeline.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    await productsApi.delete(id);
    navigate('/products');
  }

  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <>
      <RecordDetail
        title={product?.name ?? ''}
        icon={Package}
        sections={product ? buildSections(product) : []}
        backTo={showBackLink ? '/products' : undefined}
        backLabel="Products"
        isLoading={isLoading}
        actions={
          <RowActionsMenu
            label="Actions"
            icon={ChevronDown}
            actions={[{ label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => setIsDeleteOpen(true) }]}
          />
        }
        extraTabs={
          product
            ? [{ key: 'properties', label: 'Properties', content: <GroupedPropertiesPanel objectType="products" recordId={product.id} onSaved={loadProduct} /> }]
            : []
        }
        historyEvents={product ? buildHistoryEvents(product, timeline.entries) : []}
        activeHistoryTypes={timeline.activeTypes}
        onActiveHistoryTypesChange={timeline.setActiveTypes}
        hasMoreHistory={timeline.hasMore}
        isLoadingMoreHistory={timeline.isLoading}
        onLoadMoreHistory={timeline.loadMore}
        onLogActivity={handleLogActivity}
        loggableActivityTypes={NOTE_ONLY}
      />

      {isDeleteOpen && product && (
        <ConfirmDialog
          title="Delete Product?"
          message={`You are about to delete ${product.name || 'this product'}. This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </>
  );
}
