import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Package, Plus, Receipt, Search, TrendingDown, Truck, Trash2, Eye, Edit2, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import CustomSelect from '../../components/ui/CustomSelect';

type ViewMode = 'products' | 'suppliers' | 'invoices';
type ConfirmAction =
  | { type: 'postInvoice'; id: number; title: string; message: string; confirmLabel: string; tone: 'amber' }
  | { type: 'deleteInvoice'; id: number; title: string; message: string; confirmLabel: string; tone: 'red' }
  | { type: 'archiveProduct'; id: number; title: string; message: string; confirmLabel: string; tone: 'red' }
  | { type: 'archiveSupplier'; id: number; title: string; message: string; confirmLabel: string; tone: 'red' };

interface Product {
  id: number;
  name: string;
  unit: string;
  currentPrice: number;
  minStock: number;
  category?: string | null;
  notes?: string | null;
  stockQuantity: number;
  totalValue: number;
  isLowStock: boolean;
}

interface Supplier {
  id: number;
  name: string;
  edrpou?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  invoicesCount: number;
  totalPurchased: number;
}

interface InvoiceSummary {
  id: number;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  status: string;
  postedAt?: string | null;
  supplierName: string;
  supplierEdrpou?: string | null;
  itemsCount: number;
}

interface InvoiceDetail extends InvoiceSummary {
  basis?: string | null;
  vatAmount: number;
  items: {
    id: number;
    productId: number;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    expiryDate?: string | null;
  }[];
}

interface ProductCardMovement {
  id: number;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  priceAtMoment: number;
  date: string;
  reason?: string | null;
  invoiceNumber?: string | null;
  runningBalance: number;
}

interface ProductCardBatch {
  id: number;
  arrivalDate: string;
  initialQuantity: number;
  remainingQuantity: number;
  pricePerUnit: number;
  supplierName?: string | null;
  invoiceNumber?: string | null;
  expiryDate?: string | null;
}

interface ProductCardData {
  product: {
    id: number;
    name: string;
    unit: string;
    currentPrice: number;
    minStock: number;
    category?: string | null;
    notes?: string | null;
  };
  batches: ProductCardBatch[];
  movements: ProductCardMovement[];
}

interface InvoiceItemForm {
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  category: string;
}

const emptyInvoiceItem = (): InvoiceItemForm => ({
  productId: '',
  productName: '',
  unit: '',
  quantity: '',
  unitPrice: '',
  category: '',
});

const formatMoney = (value: number) =>
  new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
};

const parseLocalizedNumber = (value: string) => {
  const normalized = value.trim().replace(',', '.');

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const InventoryPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productCard, setProductCard] = useState<ProductCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [, setLoading] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [productForm, setProductForm] = useState({
    name: '',
    unit: 'кг',
    category: '',
    minStock: '',
    notes: '',
  });

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    edrpou: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().slice(0, 10),
    supplierId: '',
    supplierName: '',
    supplierPhone: '',
    supplierEdrpou: '',
    basis: '',
    vatAmount: '',
    isDraft: false,
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemForm[]>([emptyInvoiceItem()]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    quantity: '',
    reason: '',
  });

  useEffect(() => {
    void loadAllData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      void fetchProductCard(selectedProductId);
    }
  }, [selectedProductId]);

  const totals = useMemo(() => {
    const stockItems = products.reduce((sum, item) => sum + item.stockQuantity, 0);
    const stockValue = products.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStockCount = products.filter((item) => item.isLowStock).length;

    return {
      stockItems,
      stockValue,
      lowStockCount,
    };
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (!search.trim()) {
      return products;
    }

    const query = search.trim().toLowerCase();
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, search]);

  const invoiceItemsTotal = useMemo(
    () =>
      invoiceItems.reduce((sum, item) => {
        const quantity = parseLocalizedNumber(item.quantity);
        const unitPrice = parseLocalizedNumber(item.unitPrice);

        if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
          return sum;
        }

        return sum + quantity * unitPrice;
      }, 0),
    [invoiceItems]
  );

  const invoiceVatAmount = useMemo(() => {
    const parsedVat = parseLocalizedNumber(invoiceForm.vatAmount);
    return Number.isFinite(parsedVat) ? parsedVat : 0;
  }, [invoiceForm.vatAmount]);

  const invoiceGrandTotal = useMemo(
    () => invoiceItemsTotal + invoiceVatAmount,
    [invoiceItemsTotal, invoiceVatAmount]
  );

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [productsResponse, suppliersResponse, invoicesResponse] = await Promise.all([
        api.get('/products'),
        api.get('/suppliers'),
        api.get('/invoices'),
      ]);

      setProducts(productsResponse.data);
      setSuppliers(suppliersResponse.data);
      setInvoices(invoicesResponse.data);

      if (!selectedProductId && productsResponse.data.length > 0) {
        setSelectedProductId(productsResponse.data[0].id);
      }
    } catch (requestError) {
      console.error(requestError);
      setError('Не вдалося завантажити дані складу.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductCard = async (productId: number) => {
    try {
      const response = await api.get(`/products/${productId}/card`);
      setProductCard(response.data);
    } catch (requestError) {
      console.error(requestError);
      setError('Не вдалося завантажити картку продукту.');
    }
  };

  const handleProductCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await api.post('/products', {
        ...productForm,
        minStock: Number(productForm.minStock || 0),
      });

      setProductForm({
        name: '',
        unit: 'кг',
        category: '',
        minStock: '',
        notes: '',
      });

      setIsProductModalOpen(false);
      await loadAllData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не вдалося додати продукт.');
    }
  };

  const handleSupplierCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await api.post('/suppliers', supplierForm);
      setSupplierForm({
        name: '',
        edrpou: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
      setIsSupplierModalOpen(false);
      await loadAllData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не вдалося додати постачальника.');
    }
  };

  const handleInvoiceItemChange = (index: number, field: keyof InvoiceItemForm, value: string) => {
    setInvoiceError(null);
    setInvoiceItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const nextItem = { ...item, [field]: value };
        if (field === 'productId' && value) {
          const selected = products.find((product) => product.id === Number(value));
          if (selected) {
            nextItem.productName = selected.name;
            nextItem.unit = selected.unit;
            nextItem.category = selected.category ?? '';
          }
        }

        return nextItem;
      })
    );
  };

  const addInvoiceItem = () => {
    setInvoiceItems((currentItems) => [...currentItems, emptyInvoiceItem()]);
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems((currentItems) =>
      currentItems.length === 1 ? currentItems : currentItems.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleInvoiceCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setInvoiceError(null);

    try {
      await api.post('/invoices', {
        ...invoiceForm,
        supplierId: invoiceForm.supplierId ? Number(invoiceForm.supplierId) : undefined,
        vatAmount: parseLocalizedNumber(invoiceForm.vatAmount),
        items: invoiceItems.map((item) => ({
          productId: item.productId ? Number(item.productId) : undefined,
          productName: item.productName,
          unit: item.unit,
          category: item.category,
          quantity: parseLocalizedNumber(item.quantity),
          unitPrice: parseLocalizedNumber(item.unitPrice),
        })),
      });

      setInvoiceForm({
        invoiceNumber: '',
        date: new Date().toISOString().slice(0, 10),
        supplierId: '',
        supplierName: '',
        supplierPhone: '',
        supplierEdrpou: '',
        basis: '',
        vatAmount: '',
        isDraft: false,
      });
      setInvoiceItems([emptyInvoiceItem()]);
      setInvoiceError(null);
      setIsInvoiceModalOpen(false);
      await loadAllData();
    } catch (requestError: any) {
      setInvoiceError(requestError?.response?.data?.message ?? 'Не вдалося зберегти накладну.');
    }
  };

  const handlePostInvoice = (invoiceId: number) => {
    setConfirmAction({
      type: 'postInvoice',
      id: invoiceId,
      title: 'Проведення накладної',
      message: 'Провести цю накладну? Після проведення змінити ціни та склад документа буде неможливо.',
      confirmLabel: 'Провести',
      tone: 'amber',
    });
  };

  const handleDeleteInvoice = (invoiceId: number) => {
    setConfirmAction({
      type: 'deleteInvoice',
      id: invoiceId,
      title: 'Видалення чернетки',
      message: 'Видалити цю чернетку накладної? Цю дію не можна буде скасувати.',
      confirmLabel: 'Видалити',
      tone: 'red',
    });
  };

  const handleArchiveProduct = (productId: number) => {
    setConfirmAction({
      type: 'archiveProduct',
      id: productId,
      title: 'Архівація продукту',
      message: 'Архівувати цей продукт? Він більше не відображатиметься у списку, але залишиться в історії.',
      confirmLabel: 'Архівувати',
      tone: 'red',
    });
  };

  const handleArchiveSupplier = (supplierId: number) => {
    setConfirmAction({
      type: 'archiveSupplier',
      id: supplierId,
      title: 'Архівація постачальника',
      message: 'Архівувати цього постачальника? Історія накладних залишиться доступною.',
      confirmLabel: 'Архівувати',
      tone: 'red',
    });
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    const action = confirmAction;
    setError(null);

    try {
      if (action.type === 'postInvoice') {
        await api.post(`/invoices/${action.id}/post`);
        setIsDetailsModalOpen(false);
      }

      if (action.type === 'deleteInvoice') {
        await api.delete(`/invoices/${action.id}`);
        setIsDetailsModalOpen(false);
      }

      if (action.type === 'archiveProduct') {
        await api.delete(`/products/${action.id}`);
      }

      if (action.type === 'archiveSupplier') {
        await api.delete(`/suppliers/${action.id}`);
      }

      setConfirmAction(null);
      await loadAllData();
    } catch (requestError: any) {
      const fallbackMessages = {
        postInvoice: 'Не вдалося провести накладну.',
        deleteInvoice: 'Не вдалося видалити накладну.',
        archiveProduct: 'Не вдалося архівувати продукт.',
        archiveSupplier: 'Не вдалося архівувати постачальника.',
      };

      setError(requestError?.response?.data?.message ?? fallbackMessages[action.type]);
    }
  };

  const openInvoiceDetails = async (invoiceId: number) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}`);
      setSelectedInvoice(response.data);
      setIsDetailsModalOpen(true);
    } catch {
      setError('Не вдалося завантажити деталі накладної.');
    }
  };

  const handleUpdateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingProduct) return;
    try {
      await api.patch(`/products/${editingProduct.id}`, productForm);
      setIsEditProductModalOpen(false);
      await loadAllData();
    } catch {
      setError('Не вдалося оновити продукт.');
    }
  };

  const handleUpdateSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingSupplier) return;
    try {
      await api.patch(`/suppliers/${editingSupplier.id}`, supplierForm);
      setIsEditSupplierModalOpen(false);
      await loadAllData();
    } catch {
      setError('Не вдалося оновити постачальника.');
    }
  };

  const handleAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedProductId) {
      return;
    }

    try {
      await api.post(`/products/${selectedProductId}/adjustments`, {
        quantity: Number(adjustmentForm.quantity),
        reason: adjustmentForm.reason,
      });

      setAdjustmentForm({ quantity: '', reason: '' });
      await loadAllData();
      await fetchProductCard(selectedProductId);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Не вдалося виконати списання.');
    }
  };

  const supplierOptions = useMemo(() => [
    { id: '', name: 'Новий постачальник' },
    ...suppliers.map(s => ({ id: s.id, name: s.name }))
  ], [suppliers]);

  const productOptions = useMemo(() => [
    { id: '', name: 'Новий продукт' },
    ...products.map(p => ({ id: p.id, name: p.name }))
  ], [products]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm uppercase tracking-[0.2em] text-warm-500">Склад та накладні</p>
          <h2 className="text-3xl font-bold text-gray-800">Керування складом</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Перегляд списків продуктів, постачальників та накладних. Всі операції поповнення та списання.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-warm-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Archive size={16} className="text-warm-500" />
              Позицій на складі
            </div>
            <div className="mt-2 break-words text-xl font-bold text-gray-800 xl:text-2xl">{totals.stockItems.toFixed(2)}</div>
          </div>
          <div className="min-w-0 rounded-2xl border border-warm-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Package size={16} className="text-warm-500" />
              Загальна вартість
            </div>
            <div className="mt-2 break-words text-xl font-bold text-gray-800 xl:text-2xl">{formatMoney(totals.stockValue)}</div>
          </div>
          <div className="min-w-0 rounded-2xl border border-warm-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingDown size={16} className="text-red-500" />
              Низький залишок
            </div>
            <div className="mt-2 break-words text-xl font-bold text-gray-800 xl:text-2xl">{totals.lowStockCount}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={viewMode === 'products' ? "grid min-w-0 gap-6 2xl:grid-cols-[1.45fr_0.95fr]" : "block"}>
        <div className="min-w-0 space-y-6">
          <div className="rounded-3xl border border-warm-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'products', label: 'Продукти', icon: Package },
                  { key: 'suppliers', label: 'Постачальники', icon: Truck },
                  { key: 'invoices', label: 'Накладні', icon: Receipt },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = viewMode === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setViewMode(tab.key as ViewMode)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        active
                          ? 'bg-warm-500 text-white shadow-sm'
                          : 'bg-warm-50 text-gray-600 hover:bg-warm-100'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (viewMode === 'products') setIsProductModalOpen(true);
                  if (viewMode === 'suppliers') setIsSupplierModalOpen(true);
                  if (viewMode === 'invoices') setIsInvoiceModalOpen(true);
                }}
                className="ui-button-primary px-4 py-2 text-sm"
              >
                <Plus size={18} />
                Додати {viewMode === 'products' ? 'продукт' : viewMode === 'suppliers' ? 'постачальника' : 'накладну'}
              </button>
            </div>

            {viewMode === 'products' && (
              <div className="mt-6 space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Пошук продуктів"
                    className="ui-input bg-warm-50 pl-10"
                  />
                </div>

                <div className="overflow-hidden rounded-2xl border border-warm-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-warm-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Продукт</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Одиниця</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Залишок</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Ціна/од.</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Вартість</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Дії</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-100 bg-white">
                      {visibleProducts.map((product) => (
                        <tr
                          key={product.id}
                          onClick={() => setSelectedProductId(product.id)}
                          className={`cursor-pointer transition hover:bg-warm-50/50 ${
                            selectedProductId === product.id ? 'bg-warm-50' : ''
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-800">{product.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {product.category || 'Без категорії'}
                              {product.isLowStock && (
                                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">
                                  МАЛО
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-600">{product.unit}</td>
                          <td className="px-4 py-4 text-right font-mono font-medium text-gray-700">
                            {product.stockQuantity.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-gray-700">
                            {formatMoney(product.currentPrice)} / {product.unit}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-warm-600">
                            {formatMoney(product.totalValue)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProduct(product);
                                  setProductForm({
                                    name: product.name,
                                    unit: product.unit,
                                    category: product.category || '',
                                    minStock: String(product.minStock),
                                    notes: product.notes || '',
                                  });
                                  setIsEditProductModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-warm-500 hover:bg-warm-50 rounded-lg transition"
                                title="Редагувати"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleArchiveProduct(product.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="В архів"
                              >
                                <Archive size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!visibleProducts.length && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                            Продукти поки не знайдено.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === 'suppliers' && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-warm-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-warm-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Постачальник</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Контакти</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Закуплено</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100 bg-white">
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-warm-50/50 transition">
                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-800">{supplier.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 font-mono">{supplier.edrpou || '—'}</div>
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          <div className="font-medium">{supplier.phone || '—'}</div>
                          <div className="text-xs text-gray-500">{supplier.email || supplier.address || '—'}</div>
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-warm-600">
                          {formatMoney(supplier.totalPurchased)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSupplier(supplier);
                                setSupplierForm({
                                  name: supplier.name,
                                  edrpou: supplier.edrpou || '',
                                  phone: supplier.phone || '',
                                  email: supplier.email || '',
                                  address: supplier.address || '',
                                  notes: supplier.notes || '',
                                });
                                setIsEditSupplierModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-warm-500 hover:bg-warm-50 rounded-lg transition"
                              title="Редагувати"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleArchiveSupplier(supplier.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="В архів"
                            >
                              <Archive size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!suppliers.length && (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-gray-400">
                          Постачальників ще немає.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === 'invoices' && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-warm-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-warm-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Накладна</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Дата</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Постачальник</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Сума</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Статус</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100 bg-white">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-warm-50/50 transition cursor-pointer" onClick={() => openInvoiceDetails(invoice.id)}>
                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-800">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {invoice.itemsCount} поз.
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600 font-mono text-xs">
                          {formatDate(invoice.date)}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {invoice.supplierName}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-warm-600">
                          {formatMoney(invoice.totalAmount)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              invoice.status === 'posted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {invoice.status === 'posted' ? 'ПРОВЕДЕНА' : 'ЧЕРНЕТКА'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openInvoiceDetails(invoice.id);
                            }}
                            className="p-1.5 text-warm-500 hover:bg-warm-50 rounded-lg transition"
                            title="Деталі"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!invoices.length && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                          Накладні ще не створювалися.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {viewMode === 'products' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-warm-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-warm-500 font-bold">Картка продукту</p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-800">
                    {productCard?.product.name || 'Оберіть продукт'}
                  </h3>
                </div>
                {productCard && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-gray-400">СЕРЕДНЯ ЦІНА</div>
                    <div className="text-xl font-black text-warm-500">
                      {formatMoney(productCard.product.currentPrice)} / {productCard.product.unit}
                    </div>
                  </div>
                )}
              </div>

              {productCard ? (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-warm-50 p-4 border border-warm-100">
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Категорія</div>
                      <div className="mt-1 font-bold text-gray-800">
                        {productCard.product.category || 'Без категорії'}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-warm-50 p-4 border border-warm-100">
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Мін. залишок</div>
                      <div className="mt-1 font-bold text-gray-800">{productCard.product.minStock} {productCard.product.unit}</div>
                    </div>
                  </div>

                  <form onSubmit={handleAdjustment} className="mt-6 rounded-3xl border-2 border-dashed border-warm-200 bg-warm-50/50 p-5">
                    <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <TrendingDown size={16} className="text-red-500" />
                      Списання по FIFO
                    </div>
                    <div className="mt-4 space-y-3">
                      <input
                        value={adjustmentForm.quantity}
                        onChange={(event) =>
                          setAdjustmentForm((current) => ({ ...current, quantity: event.target.value }))
                        }
                        placeholder="Кількість до списання"
                        className="ui-input bg-white"
                      />
                      <input
                        value={adjustmentForm.reason}
                        onChange={(event) =>
                          setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))
                        }
                        placeholder="Причина списання"
                        className="ui-input bg-white"
                      />
                      <button type="submit" className="ui-button-primary w-full bg-gray-900 hover:bg-black">
                        Списати продукт
                    </button>
                    </div>
                  </form>

                  <div className="mt-8">
                    <h4 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      Складські партії
                    </h4>
                    <div className="space-y-3">
                      {productCard.batches.map((batch) => (
                        <div key={batch.id} className="rounded-2xl border border-warm-100 p-4 bg-white shadow-sm hover:shadow-md transition">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold text-gray-800">
                                {batch.invoiceNumber ? `Накладна ${batch.invoiceNumber}` : `Партія #${batch.id}`}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {batch.supplierName || 'Постачальник не вказаний'}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1 font-mono">{formatDate(batch.arrivalDate)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-800">
                                {batch.remainingQuantity.toFixed(2)} <span className="text-[10px] text-gray-400">{productCard.product.unit}</span>
                              </div>
                              <div className="text-xs text-warm-500 font-bold mt-1">{formatMoney(batch.pricePerUnit)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!productCard.batches.length && (
                        <div className="ui-empty-state">
                          Партії відсутні
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      Історія руху та цін
                    </h4>
                    <div className="space-y-3">
                      {productCard.movements.map((movement) => (
                        <div key={movement.id} className="rounded-2xl border border-warm-50 p-4 bg-warm-50/30">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <div className={`mt-1 h-2 w-2 rounded-full ${movement.type === 'in' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <div>
                                <div className="font-bold text-gray-800 text-sm">
                                  {movement.type === 'in' ? 'Прихід' : movement.type === 'out' ? 'Списання' : 'Коригування'}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">
                                  {movement.reason || '—'}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono mt-1">{formatDate(movement.date)}</div>
                                <div className="text-[10px] text-gray-400 font-bold mt-1">
                                  ЦІНА НА МОМЕНТ: {formatMoney(movement.priceAtMoment)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${movement.type === 'out' ? 'text-red-500' : 'text-emerald-500'}`}>
                                {movement.type === 'out' ? '-' : '+'}
                                {movement.quantity.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-gray-400 font-bold mt-1">ЗАЛИШОК: {movement.runningBalance.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="ui-empty-state mt-8 py-12">
                  Оберіть продукт для перегляду деталей
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <Modal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        title="Додати новий продукт"
      >
        <form onSubmit={handleProductCreate} className="space-y-4">
          <input
            value={productForm.name}
            onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Назва продукту"
            className="ui-input"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              value={productForm.unit}
              onChange={(event) => setProductForm((current) => ({ ...current, unit: event.target.value }))}
              placeholder="Одиниця (кг, л, шт)"
              className="ui-input"
            />
            <input
              value={productForm.minStock}
              onChange={(event) => setProductForm((current) => ({ ...current, minStock: event.target.value }))}
              placeholder="Мін. залишок"
              className="ui-input"
            />
          </div>
          <input
            value={productForm.category}
            onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
            placeholder="Категорія"
            className="ui-input"
          />
          <textarea
            value={productForm.notes}
            onChange={(event) => setProductForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Примітки"
            rows={3}
            className="ui-textarea"
          />
          <button type="submit" className="ui-button-primary w-full py-3">
            Зберегти продукт
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)} 
        title="Додати постачальника"
      >
        <form onSubmit={handleSupplierCreate} className="space-y-4">
          <input
            value={supplierForm.name}
            onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Назва постачальника"
            className="ui-input"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              value={supplierForm.edrpou}
              onChange={(event) => setSupplierForm((current) => ({ ...current, edrpou: event.target.value }))}
              placeholder="ЄДРПОУ"
              className="ui-input"
            />
            <input
              value={supplierForm.phone}
              onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Телефон"
              className="ui-input"
            />
          </div>
          <input
            value={supplierForm.email}
            onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email"
            className="ui-input"
          />
          <input
            value={supplierForm.address}
            onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))}
            placeholder="Адреса"
            className="ui-input"
          />
          <textarea
            value={supplierForm.notes}
            onChange={(event) => setSupplierForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Примітки"
            rows={3}
            className="ui-textarea"
          />
          <button type="submit" className="ui-button-primary w-full py-3">
            Зберегти постачальника
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isInvoiceModalOpen} 
        onClose={() => {
          setInvoiceError(null);
          setIsInvoiceModalOpen(false);
        }} 
        title="Нова прихідна накладна"
        maxWidth="4xl"
      >
        <form onSubmit={handleInvoiceCreate} className="space-y-6">
          {invoiceError && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} />
              <span>{invoiceError}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Номер накладної</label>
              <input
                value={invoiceForm.invoiceNumber}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, invoiceNumber: event.target.value }))
                }
                placeholder="0001"
                className="ui-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Дата</label>
              <input
                type="date"
                value={invoiceForm.date}
                onChange={(event) => setInvoiceForm((current) => ({ ...current, date: event.target.value }))}
                className="ui-input"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Постачальник</label>
              <CustomSelect
                options={supplierOptions}
                value={invoiceForm.supplierId}
                onChange={(value) => setInvoiceForm((current) => ({ ...current, supplierId: String(value) }))}
              />
            </div>
          </div>

          {!invoiceForm.supplierId && (
            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-100 grid gap-4 md:grid-cols-3">
              <input
                value={invoiceForm.supplierName}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, supplierName: event.target.value }))
                }
                placeholder="Назва нового постачальника"
                className="ui-input bg-white"
              />
              <input
                value={invoiceForm.supplierPhone}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, supplierPhone: event.target.value }))
                }
                placeholder="Телефон"
                className="ui-input bg-white"
              />
              <input
                value={invoiceForm.supplierEdrpou}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, supplierEdrpou: event.target.value }))
                }
                placeholder="ЄДРПОУ"
                className="ui-input bg-white"
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={invoiceForm.basis}
              onChange={(event) => setInvoiceForm((current) => ({ ...current, basis: event.target.value }))}
              placeholder="Підстава / договір"
              className="ui-input"
            />
            <input
              value={invoiceForm.vatAmount}
              onChange={(event) =>
                setInvoiceForm((current) => ({ ...current, vatAmount: event.target.value }))
              }
              placeholder="Сума ПДВ, грн"
              className="ui-input"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">Позиції накладної</h4>
              <button
                type="button"
                onClick={addInvoiceItem}
                className="text-xs font-bold uppercase text-warm-500 hover:text-warm-600 flex items-center gap-1"
              >
                <Plus size={14} /> Додати рядок
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="hidden gap-4 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 md:grid md:grid-cols-[repeat(15,minmax(0,1fr))]">
                <div className="md:col-span-4">Продукт</div>
                <div className="md:col-span-3">Назва, якщо новий</div>
                <div className="md:col-span-1">Од.</div>
                <div className="md:col-span-2">Кількість</div>
                <div className="md:col-span-2">Ціна за од.</div>
                <div className="md:col-span-2 text-right">Сума</div>
                <div className="md:col-span-1" />
              </div>
              {invoiceItems.map((item, index) => {
                const lineQuantity = parseLocalizedNumber(item.quantity);
                const lineUnitPrice = parseLocalizedNumber(item.unitPrice);
                const lineTotal =
                  Number.isFinite(lineQuantity) && Number.isFinite(lineUnitPrice)
                    ? lineQuantity * lineUnitPrice
                    : 0;

                return (
                <div key={index} className="group relative p-4 rounded-2xl border border-warm-100 bg-white shadow-sm hover:border-warm-200 transition">
                  <div className="grid gap-4 md:grid-cols-[repeat(15,minmax(0,1fr))]">
                    <div className="md:col-span-4">
                      <CustomSelect
                        options={productOptions}
                        value={item.productId}
                        onChange={(value) => handleInvoiceItemChange(index, 'productId', String(value))}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <input
                        value={item.productName}
                        onChange={(event) => handleInvoiceItemChange(index, 'productName', event.target.value)}
                        placeholder="Назва (якщо нова)"
                        className="ui-input"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <input
                        value={item.unit}
                        onChange={(event) => handleInvoiceItemChange(index, 'unit', event.target.value)}
                        placeholder="Од."
                        className="ui-input px-2 text-center"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        value={item.quantity}
                        onChange={(event) => handleInvoiceItemChange(index, 'quantity', event.target.value)}
                        placeholder="К-сть"
                        className="ui-input"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        value={item.unitPrice}
                        onChange={(event) => handleInvoiceItemChange(index, 'unitPrice', event.target.value)}
                        placeholder="Ціна за од."
                        className="ui-input"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex h-full items-center justify-end rounded-2xl border border-warm-100 bg-warm-50 px-4 text-sm font-bold text-gray-700">
                        {formatMoney(lineTotal)}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <button
                        type="button"
                        onClick={() => removeInvoiceItem(index)}
                        className="flex h-full w-full items-center justify-center rounded-xl text-red-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>

          <div className="rounded-2xl border border-warm-100 bg-warm-50/70 p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Сума позицій</span>
              <span className="font-bold text-gray-800">{formatMoney(invoiceItemsTotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>ПДВ</span>
              <span className="font-bold text-gray-800">{formatMoney(invoiceVatAmount)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-warm-200 pt-3">
              <span className="text-sm font-semibold text-gray-700">Загальна сума накладної</span>
              <span className="text-lg font-black text-warm-600">{formatMoney(invoiceGrandTotal)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-warm-100 pt-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={invoiceForm.isDraft}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, isDraft: event.target.checked }))
                }
                className="ui-checkbox"
              />
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition">Зберегти як чернетку</span>
            </label>
            <button type="submit" className="ui-button-primary px-8">
              {invoiceForm.isDraft ? 'Зберегти чернетку' : 'Провести накладну'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditProductModalOpen}
        onClose={() => setIsEditProductModalOpen(false)}
        title="Редагувати продукт"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Назва продукту</label>
            <input
              value={productForm.name}
              onChange={(e) => setProductForm(c => ({ ...c, name: e.target.value }))}
              placeholder="Назва"
              className="ui-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Одиниця</label>
              <input
                value={productForm.unit}
                onChange={(e) => setProductForm(c => ({ ...c, unit: e.target.value }))}
                placeholder="кг, шт..."
                className="ui-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Мін. залишок</label>
              <input
                value={productForm.minStock}
                onChange={(e) => setProductForm(c => ({ ...c, minStock: e.target.value }))}
                placeholder="Мін. залишок"
                className="ui-input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Категорія</label>
            <input
              value={productForm.category}
              onChange={(e) => setProductForm(c => ({ ...c, category: e.target.value }))}
              placeholder="Категорія"
              className="ui-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Примітки</label>
            <textarea
              value={productForm.notes}
              onChange={(e) => setProductForm(c => ({ ...c, notes: e.target.value }))}
              placeholder="Примітки"
              rows={3}
              className="ui-textarea"
            />
          </div>
          <button className="ui-button-primary w-full py-3">Зберегти зміни</button>
        </form>
      </Modal>

      <Modal
        isOpen={isEditSupplierModalOpen}
        onClose={() => setIsEditSupplierModalOpen(false)}
        title="Редагувати постачальника"
      >
        <form onSubmit={handleUpdateSupplier} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Назва</label>
            <input
              value={supplierForm.name}
              onChange={(e) => setSupplierForm(c => ({ ...c, name: e.target.value }))}
              placeholder="Назва"
              className="ui-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">ЄДРПОУ</label>
              <input
                value={supplierForm.edrpou}
                onChange={(e) => setSupplierForm(c => ({ ...c, edrpou: e.target.value }))}
                placeholder="ЄДРПОУ"
                className="ui-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Телефон</label>
              <input
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm(c => ({ ...c, phone: e.target.value }))}
                placeholder="Телефон"
                className="ui-input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email</label>
            <input
              value={supplierForm.email}
              onChange={(e) => setSupplierForm(c => ({ ...c, email: e.target.value }))}
              placeholder="Email"
              className="ui-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Адреса</label>
            <input
              value={supplierForm.address}
              onChange={(e) => setSupplierForm(c => ({ ...c, address: e.target.value }))}
              placeholder="Адреса"
              className="ui-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Примітки</label>
            <textarea
              value={supplierForm.notes}
              onChange={(e) => setSupplierForm(c => ({ ...c, notes: e.target.value }))}
              placeholder="Примітки"
              rows={3}
              className="ui-textarea"
            />
          </div>
          <button className="ui-button-primary w-full py-3">Зберегти зміни</button>
        </form>
      </Modal>

      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedInvoice ? `Накладна №${selectedInvoice.invoiceNumber}` : 'Деталі'}
        maxWidth="3xl"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2 rounded-2xl bg-warm-50 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Дата</p>
                <p className="font-bold text-gray-800">{formatDate(selectedInvoice.date)}</p>
              </div>
              <div className="space-y-2 rounded-2xl bg-warm-50 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Постачальник</p>
                <p className="font-bold text-gray-800">{selectedInvoice.supplierName}</p>
                {selectedInvoice.supplierEdrpou && <p className="text-xs text-gray-400 font-mono">{selectedInvoice.supplierEdrpou}</p>}
              </div>
            </div>

            {selectedInvoice.basis && (
              <div className="rounded-2xl border border-warm-100 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Підстава</p>
                <p className="text-gray-700">{selectedInvoice.basis}</p>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-warm-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-warm-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-bold uppercase tracking-wider text-[10px]">Продукт</th>
                    <th className="px-4 py-2 font-bold uppercase tracking-wider text-[10px] text-right">Кількість</th>
                    <th className="px-4 py-2 font-bold uppercase tracking-wider text-[10px] text-right">Ціна</th>
                    <th className="px-4 py-2 font-bold uppercase tracking-wider text-[10px] text-right">Сума</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">{item.productName}</div>
                        <div className="text-[10px] text-gray-400">{item.unit}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-bold text-warm-600">{formatMoney(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-warm-50/50">
                  {selectedInvoice.vatAmount > 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">ПДВ:</td>
                      <td className="px-4 py-2 text-right text-sm font-medium">{formatMoney(selectedInvoice.vatAmount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-800 uppercase tracking-wider">Разом:</td>
                    <td className="px-4 py-3 text-right text-lg font-black text-warm-600">{formatMoney(selectedInvoice.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedInvoice.status === 'draft' && (
              <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                  <AlertCircle size={18} />
                  Це чернетковий документ
                </div>
                <p className="text-xs text-amber-600">
                  Вона не впливає на залишки на складі. Проведіть її, щоб товари з'явилися на балансі.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => void handlePostInvoice(selectedInvoice.id)}
                    className="ui-button-primary bg-amber-600 hover:bg-amber-700 flex-1 py-2 text-xs"
                  >
                    Провести
                  </button>
                  <button
                    onClick={() => void handleDeleteInvoice(selectedInvoice.id)}
                    className="ui-button-primary bg-gray-200 text-gray-700 hover:bg-gray-300 flex-1 py-2 text-xs"
                  >
                    Видалити
                  </button>
                </div>
              </div>
            )}

            {selectedInvoice.status === 'posted' && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                <AlertCircle size={20} className="text-emerald-600" />
                <div className="text-xs text-emerald-700 font-medium leading-relaxed">
                  <span className="font-bold block mb-0.5">Накладна проведена</span>
                  Проведені документи заблоковані для редагування з метою забезпечення цілісності обліку.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title || 'Підтвердження дії'}
      >
        {confirmAction && (
          <div className="space-y-5">
            <div className={`rounded-2xl border p-4 text-sm ${
              confirmAction.tone === 'red'
                ? 'border-red-100 bg-red-50 text-red-700'
                : 'border-amber-100 bg-amber-50 text-amber-700'
            }`}>
              {confirmAction.message}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-xl px-6 py-2 font-bold text-gray-600 hover:bg-gray-100"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => void executeConfirmedAction()}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2 font-bold text-white transition ${
                  confirmAction.tone === 'red'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmAction.type === 'postInvoice' ? <Receipt size={18} /> : <Archive size={18} />}
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryPage;
