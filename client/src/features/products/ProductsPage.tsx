import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { productsApi } from './api/products';
import type { ProductTypeFilter } from './api/products';
import { Button } from '../../shared/components/Button/Button';
import { PageTitleSwitcher } from '../../shared/components/PageTitleSwitcher/PageTitleSwitcher';
import { ProductForm } from './ProductForm';
import { ProductTypePicker } from './ProductTypePicker';
import { Select } from '../../shared/components/Dropdown/Select';
import { Table } from '../../shared/components/Table/Table';
import { TruncatedText } from '../../shared/components/TruncatedText/TruncatedText';
import { RecordLink } from '../../shared/components/RecordLink/RecordLink';
import type { Column, TablePagination } from '../../shared/components/Table/Table';
import type { Product } from '../../shared/types/index';
import { formatQuantity } from '../../shared/utils/numberInput';

const TYPE_OPTIONS: { value: ProductTypeFilter | ''; label: string }[] = [
  { value: '', label: 'All products' },
  { value: 'single', label: 'Single items' },
  { value: 'bundle', label: 'Bundles' },
];

const PAGE_SIZE = 50;

function fmtPrice(val: string | null) {
  if (!val) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
}

function fmtType(val: string | null) {
  if (!val) return '—';
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const columns: Column<Product>[] = [
  {
    key: 'name',
    header: 'Product Name',
    render: (p) => <RecordLink to={`/products/${p.id}`} className="link"><TruncatedText text={p.name} /></RecordLink>,
  },
  {
    key: 'description',
    header: 'Description',
    render: (p) => <TruncatedText text={p.description} max={30} />,
  },
  {
    key: 'hsPriceUsd',
    header: 'Price (USD)',
    render: (p) => fmtPrice(p.hsPriceUsd),
  },
  {
    key: 'hsProductType',
    header: 'Product Type',
    render: (p) => fmtType(p.hsProductType),
  },
  {
    key: 'controllerOriginalQuantity',
    header: 'Qty / Month',
    render: (p) => formatQuantity(p.controllerOriginalQuantity),
  },
];

export function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState<ProductTypeFilter | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    productsApi
      .list(page, PAGE_SIZE, debouncedSearch, type || undefined)
      .then((r) => { setProducts(r.data); setTotal(r.total); })
      .finally(() => setIsLoading(false));
  }, [page, debouncedSearch, type]);

  function handleTypeChange(value: ProductTypeFilter | '') {
    setType(value);
    setPage(1);
  }

  function handleCreated(id: string) {
    setShowForm(false);
    navigate(`/products/${id}`, { state: { backgroundLocation: location } });
  }

  const pagination: TablePagination = { page, pageSize: PAGE_SIZE, total, onPageChange: setPage };

  return (
    <div className="page">
      <div className="page-header">
        <PageTitleSwitcher current="Products" />
        <Button variant="accent" onClick={() => setShowTypePicker(true)}>+ New Product</Button>
      </div>

      <div className="table-toolbar">
        <input
          className="search-input"
          placeholder="Search by name or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={type} onChange={handleTypeChange} options={TYPE_OPTIONS} ariaLabel="Product type" />
      </div>

      <Table
        columns={columns}
        data={products}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        pagination={pagination}
      />

      {showTypePicker && (
        <ProductTypePicker
          onSelectSingle={() => {
            setShowTypePicker(false);
            setShowForm(true);
          }}
          onClose={() => setShowTypePicker(false)}
        />
      )}

      {showForm && <ProductForm onCreated={handleCreated} onClose={() => setShowForm(false)} />}
    </div>
  );
}
