import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, MapPin, Plus, Search, ChevronLeft, ChevronRight, Eye, RefreshCw, X, Printer } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import CustomSelect from '../../components/ui/CustomSelect';
import PrintPropertyInventory from '../../components/ui/PrintPropertyInventory';
import { useSettings } from '../../contexts/SettingsContext';

interface EmployeeOption {
  id: number;
  fullName: string;
  position: string;
  status?: string | null;
}

interface GroupOption {
  id: number;
  name: string;
}

interface InventoryItem {
  id: number;
  inventoryNumber: string;
  name: string;
  category: string;
  quantity?: number;
  location?: string | null;
  assignmentType?: 'employee' | 'group' | 'outdoor' | 'storage';
  responsibleId?: number | null;
  groupId?: number | null;
  outdoorArea?: string | null;
  initialValue?: number | null;
  status?: string | null;
  arrivalDate?: string | null;
  notes?: string | null;
  assignmentLabel?: string;
}

const emptyInventoryForm = {
  inventoryNumber: '',
  name: '',
  category: '',
  customCategory: '',
  quantity: '1',
  location: '',
  customLocation: '',
  assignmentType: 'storage',
  employeeId: '',
  groupId: '',
  outdoorArea: '',
  initialValue: '',
  status: 'good',
  arrivalDate: '',
  notes: '',
};

const emptyPlacementForm = {
  inventoryId: '',
  quantity: '',
  assignmentType: 'storage',
  employeeId: '',
  groupId: '',
  outdoorArea: '',
  note: '',
};

const CATEGORY_OPTIONS = [
  { id: 'Меблі', name: 'Меблі' },
  { id: 'IT, техніка та зв\'язок', name: 'IT, техніка та зв\'язок' },
  { id: 'Кухонне обладнання', name: 'Кухонне обладнання' },
  { id: 'Посуд та приладдя', name: 'Посуд та приладдя' },
  { id: 'М’який інвентар (білизна, килими)', name: 'М’який інвентар' },
  { id: 'Іграшки та дидактика', name: 'Іграшки та дидактика' },
  { id: 'Спортивний інвентар', name: 'Спортивний інвентар' },
  { id: 'Господарчий інвентар', name: 'Господарчий інвентар' },
  { id: 'Медичне обладнання', name: 'Медичне обладнання' },
  { id: 'Зовнішні споруди', name: 'Зовнішні споруди' },
  { id: 'custom', name: '✏️ Ввести свій варіант...' },
];

const LOCATION_OPTIONS = [
  { id: 'Склад', name: 'Склад' },
  { id: 'Група', name: 'Група' },
  { id: 'Кухня / Харчоблок', name: 'Кухня / Харчоблок' },
  { id: 'Кабінет завідувача', name: 'Кабінет завідувача' },
  { id: 'Кабінет методиста', name: 'Кабінет методиста' },
  { id: 'Медичний кабінет', name: 'Медичний кабінет' },
  { id: 'Музичний зал', name: 'Музичний зал' },
  { id: 'Спортивний зал', name: 'Спортивний зал' },
  { id: 'Пральня', name: 'Пральня' },
  { id: 'Підсобне приміщення', name: 'Підсобне приміщення' },
  { id: 'Вулиця / Майданчик', name: 'Вулиця / Майданчик' },
  { id: 'custom', name: '✏️ Ввести свій варіант...' },
];

const STATUS_OPTIONS = [
  { id: 'good', name: 'Відмінний / Робочий' },
  { id: 'satisfactory', name: 'Задовільний' },
  { id: 'needs_repair', name: 'Потребує ремонту' },
  { id: 'broken', name: 'Зламано / Не працює' },
  { id: 'written_off', name: 'Списано' },
];

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  good: { label: 'Відмінний / Робочий', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  satisfactory: { label: 'Задовільний', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  needs_repair: { label: 'Потребує ремонту', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  broken: { label: 'Зламано / Не працює', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  written_off: { label: 'Списано', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const formatStatus = (status?: string | null) => {
  if (!status) return STATUS_MAP.good;
  return STATUS_MAP[status] || { label: status, badge: 'bg-gray-50 text-gray-700 border-gray-200' };
};

const ASSIGNMENT_OPTIONS = [
  { id: 'storage', name: 'Склад без прив’язки' },
  { id: 'employee', name: 'За співробітником' },
  { id: 'group', name: 'За групою' },
  { id: 'outdoor', name: 'Територія садка' },
];

const ITEMS_PER_PAGE = 25;

const PropertyPage: React.FC = () => {
  const { settings } = useSettings();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [inventoryRegistry, setInventoryRegistry] = useState<InventoryItem[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'employee' | 'group' | 'outdoor' | 'storage'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);
  const [placementForm, setPlacementForm] = useState(emptyPlacementForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const printFrameRootRef = useRef<{ unmount: () => void } | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [employeesRes, groupsRes, inventoryRes] = await Promise.all([
        api.get('/employees'),
        api.get('/children/groups'),
        api.get('/employees/inventory/registry'),
      ]);

      setEmployees(employeesRes.data);
      setGroups(groupsRes.data);
      setInventoryRegistry(inventoryRes.data);
    } catch (requestError) {
      console.error('Не вдалося завантажити реєстр майна:', requestError);
      setError('Не вдалося завантажити реєстр майна.');
    } finally {
      setLoading(false);
    }
  };

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((employee) => (employee.status || 'working') !== 'dismissed')
        .map((employee) => ({
          id: employee.id,
          name: `${employee.fullName} (${employee.position})`,
        })),
    [employees]
  );

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
    [groups]
  );

  const filteredInventoryRegistry = useMemo(() => {
    return inventoryRegistry.filter((item) => {
      if (inventoryFilter !== 'all' && item.assignmentType !== inventoryFilter) {
        return false;
      }
      if (categoryFilter && item.category !== categoryFilter) {
        return false;
      }
      if (statusFilter && (item.status || 'good') !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(query);
        const matchNum = item.inventoryNumber.toLowerCase().includes(query);
        const matchCat = item.category.toLowerCase().includes(query);
        const matchLoc = (item.location || '').toLowerCase().includes(query);
        const matchAssign = (item.assignmentLabel || '').toLowerCase().includes(query);
        const matchNotes = (item.notes || '').toLowerCase().includes(query);
        return matchName || matchNum || matchCat || matchLoc || matchAssign || matchNotes;
      }
      return true;
    });
  }, [inventoryFilter, categoryFilter, statusFilter, searchQuery, inventoryRegistry]);

  const currentFilterLabel = useMemo(() => {
    const filterNames: Record<string, string> = {
      all: 'Усі позиції майна',
      employee: 'Майно у співробітників',
      group: 'Майно у групах',
      outdoor: 'Майно на території',
      storage: 'Майно на складі',
    };
    let label = filterNames[inventoryFilter] || 'Реєстр майна';
    if (categoryFilter) label += ` · Категорія: ${categoryFilter}`;
    if (statusFilter) label += ` · Стан: ${formatStatus(statusFilter).label}`;
    return label;
  }, [inventoryFilter, categoryFilter, statusFilter]);

  useEffect(() => {
    if (!isPrintModalOpen || !printFrameRef.current) return;
    const iframe = printFrameRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write('<html><head><title>Відомість обліку майна</title><style>html,body{margin:0;background:#fff;font-family:sans-serif}</style></head><body><div id="print-root"></div></body></html>');
    doc.close();
    const container = doc.getElementById('print-root');
    if (!container) return;
    let cancelled = false;
    void import('react-dom/client').then(({ createRoot }) => {
      if (cancelled) return;
      printFrameRootRef.current?.unmount();
      const root = createRoot(container);
      printFrameRootRef.current = root;
      root.render(
        <PrintPropertyInventory
          items={filteredInventoryRegistry}
          filterLabel={currentFilterLabel}
          settings={settings}
        />
      );
    });
    return () => {
      cancelled = true;
      const root = printFrameRootRef.current;
      printFrameRootRef.current = null;
      if (root) queueMicrotask(() => root.unmount());
    };
  }, [isPrintModalOpen, filteredInventoryRegistry, currentFilterLabel, settings]);

  // Пагінація
  const totalPages = Math.ceil(filteredInventoryRegistry.length / ITEMS_PER_PAGE) || 1;
  const paginatedRegistry = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInventoryRegistry.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInventoryRegistry, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [inventoryFilter, searchQuery, categoryFilter, statusFilter]);

  const inventoryStats = useMemo(
    () => ({
      total: inventoryRegistry.reduce((acc, item) => acc + (item.quantity || 1), 0),
      assignedToEmployees: inventoryRegistry
        .filter((item) => item.assignmentType === 'employee')
        .reduce((acc, item) => acc + (item.quantity || 1), 0),
      assignedToGroups: inventoryRegistry
        .filter((item) => item.assignmentType === 'group')
        .reduce((acc, item) => acc + (item.quantity || 1), 0),
      outdoor: inventoryRegistry
        .filter((item) => item.assignmentType === 'outdoor')
        .reduce((acc, item) => acc + (item.quantity || 1), 0),
      storage: inventoryRegistry
        .filter((item) => item.assignmentType === 'storage')
        .reduce((acc, item) => acc + (item.quantity || 1), 0),
    }),
    [inventoryRegistry]
  );

  const resetInventoryForm = () => {
    setInventoryForm(emptyInventoryForm);
  };

  const resetPlacementForm = () => {
    setPlacementForm(emptyPlacementForm);
  };

  const openInventoryCreateModal = () => {
    setError(null);
    resetInventoryForm();
    setIsInventoryModalOpen(true);
  };

  const openPlacementModal = (item: InventoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setError(null);
    setPlacementForm({
      inventoryId: String(item.id),
      quantity: '',
      assignmentType: item.assignmentType || 'storage',
      employeeId: item.responsibleId ? String(item.responsibleId) : '',
      groupId: item.groupId ? String(item.groupId) : '',
      outdoorArea: item.outdoorArea || '',
      note: '',
    });
    setIsPlacementModalOpen(true);
  };

  const handleCreateInventory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.post('/employees/inventory', {
        inventoryNumber: inventoryForm.inventoryNumber,
        name: inventoryForm.name,
        category: inventoryForm.category === 'custom' ? inventoryForm.customCategory : inventoryForm.category,
        quantity: inventoryForm.quantity ? Number(inventoryForm.quantity) : 1,
        location: inventoryForm.location === 'custom' ? inventoryForm.customLocation : inventoryForm.location,
        assignmentType: inventoryForm.assignmentType,
        employeeId: inventoryForm.assignmentType === 'employee' && inventoryForm.employeeId
          ? Number(inventoryForm.employeeId)
          : undefined,
        groupId: inventoryForm.assignmentType === 'group' && inventoryForm.groupId
          ? Number(inventoryForm.groupId)
          : undefined,
        outdoorArea: inventoryForm.assignmentType === 'outdoor'
          ? inventoryForm.outdoorArea
          : undefined,
        initialValue: inventoryForm.initialValue ? Number(inventoryForm.initialValue) : null,
        status: inventoryForm.status,
        arrivalDate: inventoryForm.arrivalDate || undefined,
        notes: inventoryForm.notes,
      });

      setIsInventoryModalOpen(false);
      resetInventoryForm();
      await loadData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося створити одиницю майна.');
    } finally {
      setSaving(false);
    }
  };

  const handleReassignPlacement = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await api.post('/employees/inventory/reassign', {
        inventoryId: Number(placementForm.inventoryId),
        quantity: placementForm.quantity ? Number(placementForm.quantity) : undefined,
        assignmentType: placementForm.assignmentType,
        employeeId: placementForm.assignmentType === 'employee' && placementForm.employeeId
          ? Number(placementForm.employeeId)
          : undefined,
        groupId: placementForm.assignmentType === 'group' && placementForm.groupId
          ? Number(placementForm.groupId)
          : undefined,
        outdoorArea: placementForm.assignmentType === 'outdoor'
          ? placementForm.outdoorArea
          : undefined,
        note: placementForm.note,
      });

      setInventoryRegistry(response.data);
      if (selectedDetailItem && String(selectedDetailItem.id) === String(placementForm.inventoryId)) {
        const updated = (response.data as InventoryItem[]).find((it) => it.id === selectedDetailItem.id);
        if (updated) setSelectedDetailItem(updated);
      }
      setIsPlacementModalOpen(false);
      resetPlacementForm();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Не вдалося змінити прив’язку майна.');
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (value?: number | null) =>
    value === null || value === undefined
      ? '—'
      : new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <p className="text-sm font-bold uppercase tracking-widest text-warm-500">Матеріальні цінності</p>
          <h2 className="text-3xl font-bold text-gray-800">Майно</h2>
          <p className="mt-2 max-w-3xl text-gray-500">
            Єдиний реєстр ТМЦ, техніки, меблів та об’єктів на території садка з прив’язкою до працівника, групи або складу.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="ui-button-secondary border-emerald-200 text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5"
          >
            <Printer size={18} />
            <span>Друкувати відомість</span>
          </button>
          <button onClick={openInventoryCreateModal} className="ui-button-primary">
            <Plus size={18} /> Додати майно
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Briefcase size={18} className="text-warm-500" />
            Усього в реєстрі
          </div>
          <div className="mt-2 text-3xl font-black text-gray-800">{inventoryStats.total}</div>
        </div>
        <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Briefcase size={18} className="text-warm-500" />
            У співробітників
          </div>
          <div className="mt-2 text-3xl font-black text-gray-800">{inventoryStats.assignedToEmployees}</div>
        </div>
        <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Briefcase size={18} className="text-warm-500" />
            У групах
          </div>
          <div className="mt-2 text-3xl font-black text-gray-800">{inventoryStats.assignedToGroups}</div>
        </div>
        <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <MapPin size={18} className="text-warm-500" />
            Територія / склад
          </div>
          <div className="mt-2 text-3xl font-black text-gray-800">
            {inventoryStats.outdoor + inventoryStats.storage}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-warm-500">Реєстр майна садка</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-800">ТМЦ, техніка, меблі та зовнішні об’єкти</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Усе' },
              { id: 'employee', label: 'У співробітників' },
              { id: 'group', label: 'У групах' },
              { id: 'outdoor', label: 'На території' },
              { id: 'storage', label: 'На складі' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setInventoryFilter(filter.id as typeof inventoryFilter)}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
                  inventoryFilter === filter.id
                    ? 'bg-warm-500 text-white shadow-sm'
                    : 'bg-warm-50 text-gray-600 hover:bg-warm-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Панель фільтрів та пошуку */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук за інв. №, назвою, приміщенням..."
              className="ui-input pl-9 pr-8 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <CustomSelect
            options={[{ id: '', name: 'Всі категорії' }, ...CATEGORY_OPTIONS.filter((c) => c.id !== 'custom')]}
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(String(val))}
            placeholder="Фільтр за категорією"
            className="text-xs"
          />
          <CustomSelect
            options={[{ id: '', name: 'Будь-який стан' }, ...STATUS_OPTIONS]}
            value={statusFilter}
            onChange={(val) => setStatusFilter(String(val))}
            placeholder="Фільтр за станом"
            className="text-xs"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-warm-200 p-8 text-center text-gray-400">
            Завантаження реєстру майна...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-warm-100 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-warm-100 bg-warm-50/70 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Інв. №</th>
                    <th className="py-3 px-4">Назва майна</th>
                    <th className="py-3 px-4 text-center">К-сть</th>
                    <th className="py-3 px-4">Категорія</th>
                    <th className="py-3 px-4">Прив'язка / Локація</th>
                    <th className="py-3 px-4">Стан</th>
                    <th className="py-3 px-4">Дата введення</th>
                    <th className="py-3 px-4 text-right">Перв. вартість</th>
                    <th className="py-3 px-4 text-center">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {paginatedRegistry.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        У реєстрі майна не знайдено записів за вибраними фільтрами.
                      </td>
                    </tr>
                  ) : (
                    paginatedRegistry.map((item) => {
                      const statusMeta = formatStatus(item.status);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedDetailItem(item)}
                          className="hover:bg-warm-50/70 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-warm-700 whitespace-nowrap">
                            {item.inventoryNumber}
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-800 max-w-xs truncate">
                            {item.name}
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-800 text-center whitespace-nowrap">
                            <span className="inline-block rounded-md bg-warm-100 px-2 py-0.5 text-xs text-warm-800 font-black">
                              {item.quantity || 1} шт.
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {item.category}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-medium text-gray-800">
                              {item.assignmentLabel || 'Без прив’язки'}
                            </div>
                            {item.location && (
                              <div className="text-[11px] text-gray-400">{item.location}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusMeta.badge}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString('uk-UA') : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-700 whitespace-nowrap">
                            {formatMoney(item.initialValue)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedDetailItem(item)}
                                className="p-1.5 text-gray-500 hover:text-warm-600 hover:bg-warm-100 rounded-lg transition"
                                title="Переглянути деталі"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => openPlacementModal(item, e)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Змінити прив’язку"
                              >
                                <RefreshCw size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Нижня пагінація */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 text-xs text-gray-500">
              <div>
                Показано <span className="font-bold text-gray-800">{filteredInventoryRegistry.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> –{' '}
                <span className="font-bold text-gray-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredInventoryRegistry.length)}</span> із{' '}
                <span className="font-bold text-gray-800">{filteredInventoryRegistry.length}</span> позицій
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-warm-200 bg-white text-gray-600 hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="px-3 py-1 font-bold text-gray-700">
                    Сторінка {currentPage} з {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-warm-200 bg-white text-gray-600 hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Модальне вікно деталей позиції майна */}
      <Modal
        isOpen={Boolean(selectedDetailItem)}
        onClose={() => setSelectedDetailItem(null)}
        title="Детальна картка майна"
        maxWidth="lg"
      >
        {selectedDetailItem && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <div>
                <span className="inline-block rounded-full bg-warm-100 px-3 py-1 font-mono text-xs font-black text-warm-800">
                  {selectedDetailItem.inventoryNumber}
                </span>
                <h3 className="mt-2 text-xl font-bold text-gray-800">{selectedDetailItem.name}</h3>
                <p className="text-xs text-gray-500">{selectedDetailItem.category}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${formatStatus(selectedDetailItem.status).badge}`}>
                {formatStatus(selectedDetailItem.status).label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl bg-warm-50/60 p-3 space-y-1">
                <div className="text-gray-400 font-bold uppercase text-[10px]">Кількість</div>
                <div className="font-bold text-warm-800 text-sm">{selectedDetailItem.quantity || 1} шт.</div>
              </div>
              <div className="rounded-2xl bg-warm-50/60 p-3 space-y-1">
                <div className="text-gray-400 font-bold uppercase text-[10px]">Закріплення</div>
                <div className="font-bold text-gray-800">{selectedDetailItem.assignmentLabel || 'Без прив’язки'}</div>
              </div>
              <div className="rounded-2xl bg-warm-50/60 p-3 space-y-1">
                <div className="text-gray-400 font-bold uppercase text-[10px]">Приміщення / Локація</div>
                <div className="font-bold text-gray-800">{selectedDetailItem.location || 'Не вказано'}</div>
              </div>
              <div className="rounded-2xl bg-warm-50/60 p-3 space-y-1">
                <div className="text-gray-400 font-bold uppercase text-[10px]">Первісна вартість</div>
                <div className="font-bold text-gray-800">
                  {formatMoney(selectedDetailItem.initialValue)}
                  {selectedDetailItem.initialValue && (selectedDetailItem.quantity || 1) > 1 && (
                    <div className="text-[11px] text-gray-500 font-normal">
                      всього: {formatMoney(selectedDetailItem.initialValue * (selectedDetailItem.quantity || 1))}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-warm-50/60 p-3 col-span-2 space-y-1">
                <div className="text-gray-400 font-bold uppercase text-[10px]">Дата введення в експлуатацію</div>
                <div className="font-bold text-gray-800">
                  {selectedDetailItem.arrivalDate ? new Date(selectedDetailItem.arrivalDate).toLocaleDateString('uk-UA') : 'Не вказано'}
                </div>
              </div>
            </div>

            {selectedDetailItem.notes && (
              <div className="rounded-2xl border border-warm-100 p-3 bg-white text-xs">
                <div className="text-gray-400 font-bold uppercase text-[10px] mb-1">Примітки</div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedDetailItem.notes}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-warm-100">
              <button
                type="button"
                onClick={() => {
                  const item = selectedDetailItem;
                  setSelectedDetailItem(null);
                  openPlacementModal(item);
                }}
                className="ui-button-secondary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Змінити прив’язку</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="ui-button-primary text-xs py-2 px-4"
              >
                Закрити
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title="Нова одиниця майна / ТМЦ"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateInventory} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={inventoryForm.inventoryNumber}
              onChange={(event) => setInventoryForm((current) => ({ ...current, inventoryNumber: event.target.value }))}
              placeholder="Інвентарний номер"
              className="ui-input"
              required
            />
            <input
              value={inventoryForm.name}
              onChange={(event) => setInventoryForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Назва майна"
              className="ui-input"
              required
            />
            <input
              type="number"
              min="1"
              step="1"
              value={inventoryForm.quantity}
              onChange={(event) => setInventoryForm((current) => ({ ...current, quantity: event.target.value }))}
              placeholder="Кількість (шт.)"
              className="ui-input font-bold text-warm-800"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <CustomSelect
                options={CATEGORY_OPTIONS}
                value={inventoryForm.category}
                onChange={(value) => setInventoryForm((current) => ({ ...current, category: String(value) }))}
                placeholder="Оберіть категорію"
              />
              {inventoryForm.category === 'custom' && (
                <input
                  value={inventoryForm.customCategory}
                  onChange={(event) => setInventoryForm((current) => ({ ...current, customCategory: event.target.value }))}
                  placeholder="Введіть свою категорію"
                  className="ui-input animate-in fade-in"
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <CustomSelect
                options={LOCATION_OPTIONS}
                value={inventoryForm.location}
                onChange={(value) => setInventoryForm((current) => ({ ...current, location: String(value) }))}
                placeholder="Оберіть локацію приміщення"
              />
              {inventoryForm.location === 'custom' && (
                <input
                  value={inventoryForm.customLocation}
                  onChange={(event) => setInventoryForm((current) => ({ ...current, customLocation: event.target.value }))}
                  placeholder="Введіть свою локацію"
                  className="ui-input animate-in fade-in"
                />
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="number"
              step="0.01"
              value={inventoryForm.initialValue}
              onChange={(event) => setInventoryForm((current) => ({ ...current, initialValue: event.target.value }))}
              placeholder="Первісна вартість за 1 шт., грн."
              className="ui-input"
            />
            <CustomSelect
              options={STATUS_OPTIONS}
              value={inventoryForm.status}
              onChange={(value) => setInventoryForm((current) => ({ ...current, status: String(value) }))}
              placeholder="Стан майна"
            />
          </div>

          <CustomSelect
            options={ASSIGNMENT_OPTIONS}
            value={inventoryForm.assignmentType}
            onChange={(value) =>
              setInventoryForm((current) => ({
                ...current,
                assignmentType: String(value) as typeof current.assignmentType,
                employeeId: '',
                groupId: '',
                outdoorArea: '',
              }))
            }
          />

          {inventoryForm.assignmentType === 'employee' && (
            <CustomSelect
              options={employeeOptions}
              value={inventoryForm.employeeId}
              onChange={(value) => setInventoryForm((current) => ({ ...current, employeeId: String(value) }))}
              placeholder="Оберіть співробітника"
            />
          )}

          {inventoryForm.assignmentType === 'group' && (
            <CustomSelect
              options={groupOptions}
              value={inventoryForm.groupId}
              onChange={(value) => setInventoryForm((current) => ({ ...current, groupId: String(value) }))}
              placeholder="Оберіть групу"
            />
          )}

          {inventoryForm.assignmentType === 'outdoor' && (
            <input
              value={inventoryForm.outdoorArea}
              onChange={(event) => setInventoryForm((current) => ({ ...current, outdoorArea: event.target.value }))}
              placeholder="Ділянка / зона / дерево / майданчик"
              className="ui-input"
            />
          )}

          <input
            type="date"
            value={inventoryForm.arrivalDate}
            onChange={(event) => setInventoryForm((current) => ({ ...current, arrivalDate: event.target.value }))}
            className="ui-input"
          />

          <textarea
            value={inventoryForm.notes}
            onChange={(event) => setInventoryForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Примітки: модель, серійний номер, опис стану, особливості об’єкта"
            rows={3}
            className="ui-textarea"
          />

          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3">
            {saving ? 'Збереження...' : 'Створити майно'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isPlacementModalOpen}
        onClose={() => setIsPlacementModalOpen(false)}
        title="Змінити прив’язку / Перемістити майно"
        maxWidth="2xl"
      >
        <form onSubmit={handleReassignPlacement} className="space-y-4">
          {(() => {
            const currentItem = inventoryRegistry.find((it) => String(it.id) === placementForm.inventoryId);
            const totalQuantity = currentItem?.quantity || 1;
            return (
              <div className="rounded-2xl border border-warm-100 bg-warm-50/60 p-3.5 text-xs space-y-2">
                <div className="font-bold text-gray-800 text-sm">
                  {currentItem?.name} <span className="font-mono text-warm-700 font-bold">({currentItem?.inventoryNumber})</span>
                </div>
                <div className="text-gray-600">
                  Поточне закріплення: <span className="font-bold text-gray-800">{currentItem?.assignmentLabel}</span>
                  {' · '}
                  Наявна кількість: <span className="font-black text-warm-700">{totalQuantity} шт.</span>
                </div>
                <div className="pt-2 border-t border-warm-100">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Кількість для переміщення (шт.):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalQuantity}
                    step="1"
                    value={placementForm.quantity}
                    onChange={(event) => setPlacementForm((current) => ({ ...current, quantity: event.target.value }))}
                    placeholder={`Перемістити все (${totalQuantity} шт.) або вкажіть кількість`}
                    className="ui-input bg-white font-bold"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    * Порожньо = перемістити всю кількість ({totalQuantity} шт.). Вкажіть менше число для часткової передачі.
                  </p>
                </div>
              </div>
            );
          })()}
          <CustomSelect
            options={ASSIGNMENT_OPTIONS}
            value={placementForm.assignmentType}
            onChange={(value) =>
              setPlacementForm((current) => ({
                ...current,
                assignmentType: String(value) as typeof current.assignmentType,
                employeeId: '',
                groupId: '',
                outdoorArea: '',
              }))
            }
          />

          {placementForm.assignmentType === 'employee' && (
            <CustomSelect
              options={employeeOptions}
              value={placementForm.employeeId}
              onChange={(value) => setPlacementForm((current) => ({ ...current, employeeId: String(value) }))}
              placeholder="Оберіть співробітника"
            />
          )}

          {placementForm.assignmentType === 'group' && (
            <CustomSelect
              options={groupOptions}
              value={placementForm.groupId}
              onChange={(value) => setPlacementForm((current) => ({ ...current, groupId: String(value) }))}
              placeholder="Оберіть групу"
            />
          )}

          {placementForm.assignmentType === 'outdoor' && (
            <input
              value={placementForm.outdoorArea}
              onChange={(event) => setPlacementForm((current) => ({ ...current, outdoorArea: event.target.value }))}
              placeholder="Ділянка / зона / дерево / майданчик"
              className="ui-input"
            />
          )}

          <textarea
            value={placementForm.note}
            onChange={(event) => setPlacementForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Причина зміни прив’язки або примітка"
            rows={4}
            className="ui-textarea"
          />

          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3">
            {saving ? 'Збереження...' : 'Змінити прив’язку'}
          </button>
        </form>
      </Modal>

      {/* Модальне вікно попереднього перегляду та друку відомості майна */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Відомість обліку майна для друку"
        maxWidth="5xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <span>Перевірте сформовану відомість майна перед друком на аркушах А4 (альбомна орієнтація).</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="ui-button-secondary px-4 py-2 text-xs"
              >
                Закрити
              </button>
              <button
                type="button"
                onClick={() => printFrameRef.current?.contentWindow?.print()}
                className="ui-button-primary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Printer size={16} />
                <span>Друкувати</span>
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-warm-100 bg-warm-50/40 p-3">
            <iframe
              ref={printFrameRef}
              title="Попередній перегляд відомості майна"
              className="h-[calc(100vh-19rem)] min-h-96 w-full rounded-2xl bg-white"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PropertyPage;
