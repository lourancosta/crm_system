import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { productsApi } from '../products/api/products';
import { Modal } from '../../shared/components/Modal/Modal';
import { Select } from '../../shared/components/Dropdown/Select';
import { Table } from '../../shared/components/Table/Table';
import type { Column } from '../../shared/components/Table/Table';
import { formatCurrency } from '../../shared/utils/currency';
import type { Product } from '../../shared/types/index';
import styles from './ProductPickerModal.module.css';

function moduleLabel(module: string | null): string {
  if (!module) return 'Other';
  return module
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Distinct from '' (which means "All modules" / no filter) so a product
// with no module ("Other") doesn't collide with the "All modules" option -
// they'd otherwise both be keyed by the same empty string.
const NO_MODULE = '__none__';

type Props = {
  onPick: (product: Product) => void;
  onClose: () => void;
};

export function ProductPickerModal({ onPick, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    productsApi
      .list(1, 100)
      .then((r) => setProducts(r.data))
      .finally(() => setIsLoading(false));
  }, []);

  const moduleOptions = useMemo(() => {
    const seen = new Set<string>();
    const modules: string[] = [];
    for (const p of products) {
      const key = p.module || NO_MODULE;
      if (!seen.has(key)) {
        seen.add(key);
        modules.push(key);
      }
    }
    modules.sort((a, b) => moduleLabel(a === NO_MODULE ? null : a).localeCompare(moduleLabel(b === NO_MODULE ? null : b)));
    return [
      { value: '', label: 'All modules' },
      ...modules.map((m) => ({ value: m, label: moduleLabel(m === NO_MODULE ? null : m) })),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (moduleFilter && (p.module || NO_MODULE) !== moduleFilter) return false;
      if (query && !(p.name ?? '').toLowerCase().includes(query)) return false;
      return true;
    });
  }, [products, search, moduleFilter]);

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 2000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  function handlePick(product: Product) {
    onPick(product);
    setAddedIds((prev) => new Set(prev).add(product.id));
    setConfirmation(`"${product.name}" added to invoice`);
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product name',
      render: (p) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{p.name ?? '—'}</span>
          {addedIds.has(p.id) && (
            <span className={styles['added-badge']}>
              <Check size={12} /> Added
            </span>
          )}
        </span>
      ),
    },
    { key: 'module', header: 'Module', render: (p) => moduleLabel(p.module) },
    { key: 'price', header: 'Net price', render: (p) => formatCurrency(p.hsPriceUsd, 'USD') },
  ];

  return (
    <Modal title="Add Product" onClose={onClose} variant="medium">
      <div className={styles['picker-toolbar']}>
        <input
          type="text"
          className="search-input"
          placeholder="Search by product name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={moduleFilter} onChange={setModuleFilter} options={moduleOptions} ariaLabel="Filter by module" />
      </div>
      {confirmation && <div className={styles['add-confirmation']}>{confirmation}</div>}
      {isLoading ? (
        <div className="loading">Loading…</div>
      ) : (
        <Table
          columns={columns}
          data={filteredProducts}
          keyExtractor={(p) => p.id}
          onRowClick={handlePick}
          emptyMessage="No products."
        />
      )}
    </Modal>
  );
}
