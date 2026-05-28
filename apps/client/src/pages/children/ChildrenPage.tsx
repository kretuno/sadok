import React, { useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, FolderPlus, Search, AlertCircle, Pencil } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import CustomSelect from '../../components/ui/CustomSelect';

interface Child {
  id: number;
  fullName: string;
  birthDate: string;
  groupId: number | null;
  groupName: string | null;
  status: string;
}

interface Group {
  id: number;
  name: string;
  primaryEducatorId?: number | null;
  assistantEducatorId?: number | null;
  primaryEducatorName?: string | null;
  assistantEducatorName?: string | null;
}

interface EmployeeOption {
  id: number;
  fullName: string;
  position?: string | null;
}

const ChildrenPage: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [childForm, setChildForm] = useState({ fullName: '', birthDate: '', groupId: '' });
  const [groupForm, setGroupForm] = useState({
    name: '',
    primaryEducatorId: '',
    assistantEducatorId: '',
  });

  useEffect(() => {
    void loadData();
  }, []);

  const educatorOptions = useMemo(
    () => [
      { id: '', name: 'Не призначено' },
      ...employees.map((employee) => ({
        id: employee.id,
        name: employee.position ? `${employee.fullName} (${employee.position})` : employee.fullName,
      })),
    ],
    [employees]
  );

  const filteredChildren = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return children;

    return children.filter((child) =>
      child.fullName.toLowerCase().includes(normalizedSearch) ||
      (child.groupName || '').toLowerCase().includes(normalizedSearch)
    );
  }, [children, searchTerm]);

  const resetGroupForm = () => {
    setGroupForm({
      name: '',
      primaryEducatorId: '',
      assistantEducatorId: '',
    });
    setEditingGroup(null);
    setIsGroupModalOpen(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [childrenRes, groupsRes, employeesRes] = await Promise.all([
        api.get('/children'),
        api.get('/children/groups'),
        api.get('/employees'),
      ]);
      setChildren(childrenRes.data);
      setGroups(groupsRes.data);
      setEmployees(employeesRes.data);
    } catch (requestError) {
      console.error(requestError);
      setError('Помилка завантаження списків');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChild = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/children', {
        ...childForm,
        groupId: childForm.groupId ? Number(childForm.groupId) : null,
      });
      setIsChildModalOpen(false);
      setChildForm({ fullName: '', birthDate: '', groupId: '' });
      await loadData();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Помилка при додаванні дитини');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!groupForm.name.trim()) {
      setError('Назва групи не може бути порожньою');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: groupForm.name.trim(),
        primaryEducatorId: groupForm.primaryEducatorId ? Number(groupForm.primaryEducatorId) : null,
        assistantEducatorId: groupForm.assistantEducatorId ? Number(groupForm.assistantEducatorId) : null,
      };

      if (editingGroup) {
        await api.put(`/children/groups/${editingGroup.id}`, payload);
      } else {
        await api.post('/children/groups', payload);
      }

      resetGroupForm();
      await loadData();
    } catch (requestError: any) {
      console.error('Не вдалося зберегти групу:', requestError);
      setError(requestError?.response?.data?.message || 'Помилка при збереженні групи');
    } finally {
      setSaving(false);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      primaryEducatorId: group.primaryEducatorId ? String(group.primaryEducatorId) : '',
      assistantEducatorId: group.assistantEducatorId ? String(group.assistantEducatorId) : '',
    });
    setError(null);
    setIsGroupModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-widest text-warm-500 font-bold">Управління ДНЗ</p>
          <h2 className="text-3xl font-bold text-gray-800">Діти та групи</h2>
          <p className="text-gray-500 mt-2">Список вихованців, розподіл по групах та закріплення вихователів.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setError(null);
              setEditingGroup(null);
              setGroupForm({ name: '', primaryEducatorId: '', assistantEducatorId: '' });
              setIsGroupModalOpen(true);
            }}
            className="ui-button-secondary"
          >
            <FolderPlus size={18} /> Нова група
          </button>
          <button
            onClick={() => {
              setError(null);
              setIsChildModalOpen(true);
            }}
            className="ui-button-primary"
          >
            <UserPlus size={18} /> Додати дитину
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.id} className="bg-white p-6 rounded-3xl border border-warm-100 shadow-sm hover:shadow-md transition">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-warm-100 p-2 rounded-xl text-warm-600">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{group.name}</h3>
                  <div className="text-sm text-gray-500">
                    {children.filter((child) => child.groupId === group.id).length} вихованців
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleEditGroup(group)}
                className="inline-flex items-center gap-1 rounded-xl bg-warm-50 px-3 py-1.5 text-xs font-bold text-warm-700 transition hover:bg-warm-100"
              >
                <Pencil size={14} />
                Редагувати
              </button>
            </div>

            <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Вихователь</div>
                <div className="text-sm font-semibold text-gray-700">{group.primaryEducatorName || 'Не призначено'}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Помічник вихователя</div>
                <div className="text-sm font-semibold text-gray-700">{group.assistantEducatorName || 'Не призначено'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-warm-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-warm-100 flex items-center justify-between bg-warm-50/20">
          <h4 className="font-bold text-gray-800">Загальний список вихованців</h4>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              placeholder="Пошук за ПІБ або групою..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="ui-input pl-10 py-2 text-sm bg-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-warm-50/50 text-gray-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">ПІБ дитини</th>
                <th className="px-6 py-4">Дата народження</th>
                <th className="px-6 py-4">Група</th>
                <th className="px-6 py-4 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-50">
              {filteredChildren.map((child) => (
                <tr key={child.id} className="hover:bg-warm-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-800">{child.fullName}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(child.birthDate).toLocaleDateString('uk-UA')}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-warm-100 text-warm-700 rounded-full text-xs font-bold uppercase">
                      {child.groupName || 'Не призначено'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block mr-2" />
                    <span className="text-sm font-medium text-emerald-700 uppercase">Активний</span>
                  </td>
                </tr>
              ))}
              {filteredChildren.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm font-medium text-gray-400">
                    Нічого не знайдено за поточним запитом
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isChildModalOpen}
        onClose={() => setIsChildModalOpen(false)}
        title="Картка нової дитини"
      >
        <form onSubmit={handleCreateChild} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 flex items-center gap-2 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">ПІБ дитини</label>
            <input
              required
              value={childForm.fullName}
              onChange={(event) => setChildForm({ ...childForm, fullName: event.target.value })}
              className="ui-input"
              placeholder="Прізвище Ім'я По батькові"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Дата народження</label>
              <input
                type="date"
                required
                value={childForm.birthDate}
                onChange={(event) => setChildForm({ ...childForm, birthDate: event.target.value })}
                className="ui-input"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Група</label>
              <CustomSelect
                options={groups.map((group) => ({ id: group.id, name: group.name }))}
                value={childForm.groupId}
                onChange={(value) => setChildForm({ ...childForm, groupId: String(value) })}
                placeholder="Оберіть групу"
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3 mt-4">
            {saving ? 'Збереження...' : 'Зберегти дитину'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isGroupModalOpen}
        onClose={resetGroupForm}
        title={editingGroup ? 'Редагування групи' : 'Створення групи'}
      >
        <form onSubmit={handleSaveGroup} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 flex items-center gap-2 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Назва групи</label>
            <input
              required
              value={groupForm.name}
              onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
              className="ui-input"
              placeholder="Напр. Сонечко"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Основний вихователь</label>
            <CustomSelect
              options={educatorOptions}
              value={groupForm.primaryEducatorId}
              onChange={(value) => setGroupForm((current) => ({ ...current, primaryEducatorId: String(value) }))}
              placeholder="Оберіть вихователя"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Помічник вихователя</label>
            <CustomSelect
              options={educatorOptions}
              value={groupForm.assistantEducatorId}
              onChange={(value) => setGroupForm((current) => ({ ...current, assistantEducatorId: String(value) }))}
              placeholder="Оберіть помічника"
            />
          </div>
          <button type="submit" disabled={saving} className="ui-button-primary w-full py-3 mt-4">
            {saving ? 'Збереження...' : editingGroup ? 'Оновити групу' : 'Створити групу'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ChildrenPage;
