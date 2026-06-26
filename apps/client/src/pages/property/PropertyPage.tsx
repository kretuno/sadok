import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, MapPin, Plus } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import CustomSelect from '../../components/ui/CustomSelect';

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

const ASSIGNMENT_OPTIONS = [
  { id: 'storage', name: 'Склад без прив’язки' },
  { id: 'employee', name: 'За співробітником' },
  { id: 'group', name: 'За групою' },
  { id: 'outdoor', name: 'Територія садка' },
];

const PropertyPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [inventoryRegistry, setInventoryRegistry] = useState<InventoryItem[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'employee' | 'group' | 'outdoor' | 'storage'>('all');
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);
  const [placementForm, setPlacementForm] = useState(emptyPlacementForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false);

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
    if (inventoryFilter === 'all') {
      return inventoryRegistry;
    }

    return inventoryRegistry.filter((item) => item.assignmentType === inventoryFilter);
  }, [inventoryFilter, inventoryRegistry]);

  const inventoryStats = useMemo(
    () => ({
      total: inventoryRegistry.length,
      assignedToEmployees: inventoryRegistry.filter((item) => item.assignmentType === 'employee').length,
      assignedToGroups: inventoryRegistry.filter((item) => item.assignmentType === 'group').length,
      outdoor: inventoryRegistry.filter((item) => item.assignmentType === 'outdoor').length,
      storage: inventoryRegistry.filter((item) => item.assignmentType === 'storage').length,
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

  const openPlacementModal = (item: InventoryItem) => {
    setError(null);
    setPlacementForm({
      inventoryId: String(item.id),
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
        <button onClick={openInventoryCreateModal} className="ui-button-primary">
          <Plus size={18} /> Додати майно
        </button>
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
            Закріплено за працівниками
          </div>
          <div className="mt-2 text-3xl font-black text-gray-800">{inventoryStats.assignedToEmployees}</div>
        </div>
        <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Briefcase size={18} className="text-warm-500" />
            Закріплено за групами
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

      <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-warm-500">Реєстр майна садка</p>
            <h3 className="mt-2 text-2xl font-bold text-gray-800">ТМЦ, техніка, меблі та зовнішні об’єкти</h3>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              Для кожної позиції видно інвентарний номер, локацію, прив’язку, вартість та поточний стан.
            </p>
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
                className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                  inventoryFilter === filter.id
                    ? 'bg-warm-500 text-white'
                    : 'bg-warm-50 text-gray-600 hover:bg-warm-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-dashed border-warm-200 p-8 text-center text-gray-400">
            Завантаження реєстру майна...
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {filteredInventoryRegistry.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-warm-200 p-6 text-center text-gray-400 xl:col-span-2">
                У реєстрі майна поки немає записів за вибраним фільтром.
              </div>
            ) : (
              filteredInventoryRegistry.map((item) => (
                <div key={item.id} className="rounded-2xl border border-warm-100 bg-warm-50/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {item.inventoryNumber} • {item.category}
                      </div>
                      <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-warm-700">
                        {item.assignmentLabel || 'Без прив’язки'}
                      </div>
                    </div>
                    <button
                      onClick={() => openPlacementModal(item)}
                      className="ui-button-secondary px-3 py-2 text-sm"
                    >
                      Змінити прив’язку
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-bold text-gray-800">Локація:</span> {item.location || 'Не вказано'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-bold text-gray-800">Стан:</span> {item.status || 'good'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-bold text-gray-800">Вартість:</span> {formatMoney(item.initialValue)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-bold text-gray-800">Дата надходження:</span>{' '}
                      {item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString('uk-UA') : 'Не вказано'}
                    </div>
                  </div>

                  {item.notes && <div className="mt-3 text-sm text-gray-600">{item.notes}</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title="Нова одиниця майна"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateInventory} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
              placeholder="Первісна вартість, грн."
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
        title="Змінити прив’язку майна"
        maxWidth="2xl"
      >
        <form onSubmit={handleReassignPlacement} className="space-y-4">
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
    </div>
  );
};

export default PropertyPage;
