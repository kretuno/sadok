import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, UserPlus, Save, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import api from '../../../api/axios';
import { useAuth } from '../../../contexts/AuthContext';
import CustomSelect from '../../../components/ui/CustomSelect';
import Modal from '../../../components/ui/Modal';

interface User {
  id: number;
  fullName: string;
  username: string;
  role: string;
  permissions: any;
  isActive: boolean;
}

const modules = [
  { id: 'children', label: 'Діти та групи' },
  { id: 'menu', label: 'Меню' },
  { id: 'employees', label: 'Співробітники' },
  { id: 'inventory', label: 'Склад та ТМЦ' },
  { id: 'medical', label: 'Медкабінет' },
  { id: 'attendance', label: 'Табель відвідування' },
  { id: 'psychologist', label: 'Кабінет психолога' },
];

type Notice = {
  type: 'success' | 'error';
  message: string;
};

const UsersSettingsTab: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    role: 'user', // user by default
    isActive: true,
  });

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) {
      console.error('Помилка завантаження користувачів', e);
      setNotice({ type: 'error', message: 'Не вдалося завантажити користувачів' });
    }
  };

  const openNewForm = () => {
    setNotice(null);
    setEditingId(null);
    setFormData({ fullName: '', username: '', password: '', role: 'user', isActive: true });
    setPermissions({});
    setIsModalOpen(true);
  };

  const openEditForm = (u: User) => {
    setNotice(null);
    setEditingId(u.id);
    setFormData({
      fullName: u.fullName,
      username: u.username,
      password: '',
      role: u.role,
      isActive: u.isActive,
    });
    setPermissions(typeof u.permissions === 'string' ? JSON.parse(u.permissions || '{}') : u.permissions || {});
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await api.delete(`/users/${userToDelete.id}`);
      setNotice({ type: 'success', message: 'Користувача видалено' });
      setUserToDelete(null);
      await fetchUsers();
    } catch (e) {
      console.error(e);
      setNotice({ type: 'error', message: 'Помилка видалення користувача' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      const payload = {
        ...formData,
        permissions,
      };

      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setIsModalOpen(false);
      setNotice({ type: 'success', message: editingId ? 'Користувача оновлено' : 'Користувача створено' });
      await fetchUsers();
    } catch (e: any) {
      setNotice({ type: 'error', message: e.response?.data?.message || 'Помилка збереження' });
    }
  };

  const togglePermission = (moduleId: string) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-3">
        <ShieldAlert size={24} />
        <div>
          <p className="font-bold">Доступ заборонено</p>
          <p className="text-sm">Тільки адміністратори можуть керувати користувачами.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-warm-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800">Управління доступом</h3>
        <button onClick={openNewForm} className="ui-button-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
          <UserPlus size={18} /> Створити користувача
        </button>
      </div>

      {notice && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
          notice.type === 'error'
            ? 'border-red-100 bg-red-50 text-red-700'
            : 'border-emerald-100 bg-emerald-50 text-emerald-700'
        }`}>
          {notice.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {notice.message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-warm-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-bold text-gray-600">ПІБ</th>
              <th className="p-4 font-bold text-gray-600">Логін</th>
              <th className="p-4 font-bold text-gray-600">Роль</th>
              <th className="p-4 font-bold text-gray-600">Статус</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="p-4 font-bold text-gray-800">{u.fullName}</td>
                <td className="p-4 font-mono text-gray-500">{u.username}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role === 'admin' ? 'Адміністратор' : 'Співробітник'}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Активний' : 'Заблокований'}
                  </span>
                </td>
                <td className="p-4 flex gap-2 justify-end">
                  <button onClick={() => openEditForm(u)} className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  {u.id !== user.id && (
                    <button onClick={() => setUserToDelete(u)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? 'Редагування користувача' : 'Новий користувач'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-600 mb-1">ПІБ (Ім'я)</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="ui-input w-full bg-gray-50" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Логін</label>
                  <input type="text" name="username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="ui-input w-full bg-gray-50" required disabled={!!editingId} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Пароль {editingId && '(залиште порожнім, щоб не змінювати)'}</label>
                  <input type="password" name="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="ui-input w-full bg-gray-50" required={!editingId} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Рівень доступу</label>
                  <CustomSelect
                    options={[
                      { id: 'user', name: 'Співробітник (Обмежений)' },
                      { id: 'admin', name: 'Адміністратор (Повний)' },
                    ]}
                    value={formData.role}
                    onChange={(value) => setFormData({...formData, role: String(value)})}
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 text-warm-500 rounded focus:ring-warm-500" />
                    <span className="font-bold text-gray-700">Активний акаунт</span>
                  </label>
                </div>
              </div>

              {formData.role === 'user' && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="font-bold text-gray-800 mb-3 block">Дозволи на редагування (зміна даних)</h4>
                  <p className="text-xs text-gray-500 mb-4 block">У режимі "Лише перегляд" користувач бачить усі розділи, але додавати, редагувати чи видаляти може лише в позначених модулях.</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {modules.map(mod => (
                      <label key={mod.id} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions[mod.id] || false}
                          onChange={() => togglePermission(mod.id)}
                          className="w-5 h-5 text-warm-500 border-gray-300 rounded"
                        />
                        <span className="font-semibold text-gray-700">{mod.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100">Скасувати</button>
                <button type="submit" className="ui-button-primary bg-emerald-600 hover:bg-emerald-700 px-8 flex items-center gap-2">
                  <Save size={18} /> Зберегти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Видалення користувача"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            Видалити користувача {userToDelete?.fullName}? Після видалення він втратить доступ до системи.
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setUserToDelete(null)}
              className="rounded-xl px-6 py-2 font-bold text-gray-600 hover:bg-gray-100"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2 font-bold text-white transition hover:bg-red-700"
            >
              <Trash2 size={18} />
              Видалити
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersSettingsTab;
