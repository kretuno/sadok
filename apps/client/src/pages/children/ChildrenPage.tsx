import React, { useEffect, useMemo, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  FolderPlus, 
  Search, 
  AlertCircle, 
  Pencil, 
  FileText, 
  Users2, 
  HeartPulse, 
  QrCode, 
  Upload, 
  Trash2, 
  Calendar, 
  Award,
  CheckCircle,
  ShieldAlert
} from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import CustomSelect from '../../components/ui/CustomSelect';
import ChildQRCode from '../../components/children/ChildQRCode';

interface Child {
  id: number;
  fullName: string;
  birthDate: string;
  groupId: number | null;
  groupName: string | null;
  status: string;
  qrToken?: string | null;
  gender?: string | null;
  address?: string | null;
  documentInfo?: string | null;
  motherName?: string | null;
  motherPhone?: string | null;
  fatherName?: string | null;
  fatherPhone?: string | null;
  hasBenefits?: boolean;
  benefitDescription?: string | null;
  photoPath?: string | null;
  enrollmentDate?: string | null;
  notes?: string | null;
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
  status?: string | null;
}

const ChildrenPage: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');

  // Modals state
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Detail Modal tabs & data
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'family' | 'medical' | 'qr'>('general');
  const [medicalData, setMedicalData] = useState<{
    card: any;
    measurements: any[];
    illnesses: any[];
    vaccinations: any[];
  } | null>(null);
  const [loadingMedical, setLoadingMedical] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Випуск із закладу');

  const [childForm, setChildForm] = useState({ fullName: '', birthDate: '', groupId: '' });
  const [groupForm, setGroupForm] = useState({
    name: '',
    primaryEducatorId: '',
    assistantEducatorId: '',
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    birthDate: '',
    groupId: '',
    gender: 'M',
    address: '',
    documentInfo: '',
    motherName: '',
    motherPhone: '',
    fatherName: '',
    fatherPhone: '',
    hasBenefits: false,
    benefitDescription: '',
    notes: '',
    enrollmentDate: '',
  });

  useEffect(() => {
    void loadData();
  }, []);

  const educatorOptions = useMemo(
    () => [
      { id: '', name: 'Не призначено' },
      ...employees
        .filter((employee) => (employee.status || 'working') !== 'dismissed')
        .map((employee) => ({
          id: employee.id,
          name: employee.position ? `${employee.fullName} (${employee.position})` : employee.fullName,
        })),
    ],
    [employees]
  );

  const filteredChildren = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    
    let filtered = children;
    
    // Status filtering
    if (statusFilter === 'active') {
      filtered = children.filter((c) => c.status === 'active' || !c.status);
    } else if (statusFilter === 'archived') {
      filtered = children.filter((c) => c.status && c.status.startsWith('archived'));
    }
    
    if (!normalizedSearch) return filtered;

    return filtered.filter((child) =>
      child.fullName.toLowerCase().includes(normalizedSearch) ||
      (child.groupName || '').toLowerCase().includes(normalizedSearch)
    );
  }, [children, searchTerm, statusFilter]);

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

  const loadMedicalData = async (childId: number) => {
    setLoadingMedical(true);
    setMedicalData(null);
    try {
      const res = await api.get(`/medical/children/${childId}`);
      setMedicalData({
        card: res.data.card,
        measurements: res.data.measurements || [],
        illnesses: res.data.illnesses || [],
        vaccinations: res.data.vaccinations || [],
      });
    } catch (err) {
      console.error('Не вдалося завантажити медичні дані:', err);
    } finally {
      setLoadingMedical(false);
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

  const handleOpenDetail = (child: Child) => {
    setSelectedChild(child);
    setEditForm({
      fullName: child.fullName || '',
      birthDate: child.birthDate ? new Date(child.birthDate).toISOString().slice(0, 10) : '',
      groupId: child.groupId ? String(child.groupId) : '',
      gender: child.gender || 'M',
      address: child.address || '',
      documentInfo: child.documentInfo || '',
      motherName: child.motherName || '',
      motherPhone: child.motherPhone || '',
      fatherName: child.fatherName || '',
      fatherPhone: child.fatherPhone || '',
      hasBenefits: !!child.hasBenefits,
      benefitDescription: child.benefitDescription || '',
      notes: child.notes || '',
      enrollmentDate: child.enrollmentDate ? new Date(child.enrollmentDate).toISOString().slice(0, 10) : '',
    });
    setActiveTab('general');
    setError(null);
    setIsDetailModalOpen(true);
    void loadMedicalData(child.id);
  };

  const handleUpdateChild = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedChild) return;
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        groupId: editForm.groupId ? Number(editForm.groupId) : null,
        hasBenefits: editForm.hasBenefits,
      };
      await api.patch(`/children/${selectedChild.id}`, payload);
      setIsDetailModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Помилка при оновленні картки дитини');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedChild || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('photo', file);

    setError(null);
    setSaving(true);
    try {
      const res = await api.post(`/children/${selectedChild.id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedPath = res.data.photoPath;
      setSelectedChild(prev => prev ? { ...prev, photoPath: updatedPath } : null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Помилка завантаження фото');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveChild = async () => {
    if (!selectedChild) return;
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/children/${selectedChild.id}/archive`, { reason: archiveReason });
      setIsArchiveModalOpen(false);
      setIsDetailModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Помилка при вибутті вихованця');
    } finally {
      setSaving(false);
    }
  };

  const handleQrRegenerated = async () => {
    if (!selectedChild) return;
    await loadData();
    try {
      const res = await api.get('/children');
      const found = res.data.find((c: Child) => c.id === selectedChild.id);
      if (found) {
        setSelectedChild(found);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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
                    {children.filter((child) => child.groupId === group.id && (!child.status || child.status === 'active')).length} вихованців
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
        <div className="p-5 border-b border-warm-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-warm-50/20">
          <div className="flex items-center gap-3">
            <h4 className="font-bold text-gray-800">Загальний список вихованців</h4>
            <div className="flex border border-warm-200 rounded-2xl overflow-hidden text-xs font-bold bg-white shadow-sm">
              <button 
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 transition-all ${statusFilter === 'active' ? 'bg-warm-500 text-white' : 'text-gray-500 hover:bg-warm-50'}`}
              >
                Навчаються
              </button>
              <button 
                onClick={() => setStatusFilter('archived')}
                className={`px-4 py-2 transition-all ${statusFilter === 'archived' ? 'bg-warm-500 text-white' : 'text-gray-500 hover:bg-warm-50'}`}
              >
                Вибули / Архів
              </button>
              <button 
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 transition-all ${statusFilter === 'all' ? 'bg-warm-500 text-white' : 'text-gray-500 hover:bg-warm-50'}`}
              >
                Всі
              </button>
            </div>
          </div>
          <div className="relative w-full md:w-64">
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
                <th className="px-6 py-4">Дитина</th>
                <th className="px-6 py-4">Дата народження</th>
                <th className="px-6 py-4">Група</th>
                <th className="px-6 py-4 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-50">
              {filteredChildren.map((child) => {
                const isArchived = child.status && child.status.startsWith('archived');
                const reason = isArchived ? child.status.split(':')[1] || 'Вибув' : '';

                return (
                  <tr 
                    key={child.id} 
                    className="hover:bg-warm-50/50 transition cursor-pointer"
                    onClick={() => handleOpenDetail(child)}
                  >
                    <td className="px-6 py-4 flex items-center gap-3">
                      {child.photoPath ? (
                        <img 
                          src={child.photoPath} 
                          alt={child.fullName} 
                          className="w-10 h-10 rounded-full object-cover border border-warm-100" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-warm-100 text-warm-700 flex items-center justify-center text-xs font-bold font-mono">
                          {getInitials(child.fullName)}
                        </div>
                      )}
                      <span className="font-bold text-gray-800 hover:text-warm-600 transition">
                        {child.fullName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {child.birthDate ? new Date(child.birthDate).toLocaleDateString('uk-UA') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-warm-100 text-warm-700 rounded-full text-xs font-bold uppercase">
                        {child.groupName || 'Не призначено'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isArchived ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold uppercase border border-red-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          <span>Вибув: {reason}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase border border-emerald-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Навчається</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
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

      {/* DETAILED PERSONAL CARD MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Особова справа вихованця"
        maxWidth="5xl"
      >
        {selectedChild && (
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left sidebar - avatar, general badges */}
            <div className="w-full lg:w-1/4 flex flex-col items-center border-b lg:border-b-0 lg:border-r border-warm-100 pb-6 lg:pb-0 lg:pr-6">
              <div className="relative group w-32 h-32 mb-4">
                {selectedChild.photoPath ? (
                  <img 
                    src={selectedChild.photoPath} 
                    alt={selectedChild.fullName} 
                    className="w-full h-full rounded-[2rem] object-cover border-2 border-warm-200 shadow-sm"
                  />
                ) : (
                  <div className="w-full h-full rounded-[2rem] bg-warm-100 text-warm-700 flex items-center justify-center text-3xl font-extrabold font-mono border-2 border-warm-200">
                    {getInitials(selectedChild.fullName)}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[2rem] cursor-pointer opacity-0 group-hover:opacity-100 transition duration-200">
                  <Upload className="text-white" size={24} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                    className="hidden" 
                  />
                </label>
              </div>

              <h3 className="font-extrabold text-gray-800 text-center text-lg leading-snug px-2">{selectedChild.fullName}</h3>
              <p className="text-xs font-bold text-warm-600 uppercase tracking-widest mt-1">
                {selectedChild.groupName || 'Групу не вказано'}
              </p>

              <div className="mt-4 flex flex-col items-center w-full gap-2">
                {selectedChild.status && selectedChild.status.startsWith('archived') ? (
                  <div className="px-4 py-1.5 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-red-100 text-center">
                    Вибув: {selectedChild.status.split(':')[1]}
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-emerald-100 text-center">
                      Навчається в закладі
                    </div>
                    <button
                      onClick={() => setIsArchiveModalOpen(true)}
                      className="mt-2 text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1.5 py-1 px-3 bg-red-50/50 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 size={12} /> Оформити вибуття
                    </button>
                  </>
                )}
              </div>

              {/* Tabs sidebar menu */}
              <div className="mt-6 flex flex-row lg:flex-col w-full gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition whitespace-nowrap ${
                    activeTab === 'general' ? 'bg-warm-500 text-white shadow-sm' : 'text-gray-500 hover:bg-warm-50'
                  }`}
                >
                  <FileText size={16} /> Загальна картка
                </button>
                <button
                  onClick={() => setActiveTab('family')}
                  className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition whitespace-nowrap ${
                    activeTab === 'family' ? 'bg-warm-500 text-white shadow-sm' : 'text-gray-500 hover:bg-warm-50'
                  }`}
                >
                  <Users2 size={16} /> Батьки та документи
                </button>
                <button
                  onClick={() => setActiveTab('medical')}
                  className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition whitespace-nowrap ${
                    activeTab === 'medical' ? 'bg-warm-500 text-white shadow-sm' : 'text-gray-500 hover:bg-warm-50'
                  }`}
                >
                  <HeartPulse size={16} /> Медичні дані
                </button>
                <button
                  onClick={() => setActiveTab('qr')}
                  className={`flex-1 lg:flex-initial text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition whitespace-nowrap ${
                    activeTab === 'qr' ? 'bg-warm-500 text-white shadow-sm' : 'text-gray-500 hover:bg-warm-50'
                  }`}
                >
                  <QrCode size={16} /> QR-код та бейдж
                </button>
              </div>
            </div>

            {/* Right main area - tabs contents */}
            <div className="flex-1 min-h-[420px]">
              {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 flex items-center gap-2 text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <form onSubmit={handleUpdateChild} className="h-full flex flex-col justify-between">
                <div>
                  {/* TAB 1: GENERAL CARD */}
                  {activeTab === 'general' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-warm-100 pb-2">Загальні відомості</h4>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase">ПІБ дитини</label>
                        <input
                          required
                          value={editForm.fullName}
                          onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
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
                            value={editForm.birthDate}
                            onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                            className="ui-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Стать</label>
                          <CustomSelect
                            options={[
                              { id: 'M', name: 'Хлопчик' },
                              { id: 'F', name: 'Дівчинка' },
                            ]}
                            value={editForm.gender}
                            onChange={(value) => setEditForm({ ...editForm, gender: String(value) })}
                            placeholder="Оберіть стать"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Група</label>
                          <CustomSelect
                            options={groups.map((group) => ({ id: group.id, name: group.name }))}
                            value={editForm.groupId}
                            onChange={(value) => setEditForm({ ...editForm, groupId: String(value) })}
                            placeholder="Не призначено"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Дата вступу</label>
                          <input
                            type="date"
                            value={editForm.enrollmentDate}
                            onChange={(e) => setEditForm({ ...editForm, enrollmentDate: e.target.value })}
                            className="ui-input"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase">Примітки</label>
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className="ui-input min-h-[70px]"
                          placeholder="Важлива службова інформація або коментарі..."
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: FAMILY & DOCUMENTS */}
                  {activeTab === 'family' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-warm-100 pb-2">Родина та Контакти</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Мати (ПІБ)</label>
                          <input
                            value={editForm.motherName}
                            onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}
                            className="ui-input"
                            placeholder="ПІБ Матері"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Мати (Телефон)</label>
                          <input
                            value={editForm.motherPhone}
                            onChange={(e) => setEditForm({ ...editForm, motherPhone: e.target.value })}
                            className="ui-input"
                            placeholder="+380..."
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Батько (ПІБ)</label>
                          <input
                            value={editForm.fatherName}
                            onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                            className="ui-input"
                            placeholder="ПІБ Батька"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Батько (Телефон)</label>
                          <input
                            value={editForm.fatherPhone}
                            onChange={(e) => setEditForm({ ...editForm, fatherPhone: e.target.value })}
                            className="ui-input"
                            placeholder="+380..."
                          />
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-warm-100 pb-2 pt-2">Документи та Додатково</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Свідоцтво про народження</label>
                          <input
                            value={editForm.documentInfo}
                            onChange={(e) => setEditForm({ ...editForm, documentInfo: e.target.value })}
                            className="ui-input"
                            placeholder="Серія, номер свідоцтва"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">Адреса проживання</label>
                          <input
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="ui-input"
                            placeholder="Вул, будинок, квартира"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-warm-50/50 rounded-2xl border border-warm-100 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id="hasBenefits"
                            checked={editForm.hasBenefits}
                            onChange={(e) => setEditForm({ ...editForm, hasBenefits: e.target.checked })}
                            className="h-4 w-4 text-warm-600 rounded border-gray-300 focus:ring-warm-500"
                          />
                          <label htmlFor="hasBenefits" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">
                            Дитина має пільги на харчування/утримання
                          </label>
                        </div>
                        {editForm.hasBenefits && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Опис/Категорія пільги</label>
                            <input
                              value={editForm.benefitDescription}
                              onChange={(e) => setEditForm({ ...editForm, benefitDescription: e.target.value })}
                              className="ui-input text-xs"
                              placeholder="Напр. Дитина військовослужбовця, Чорнобильська категорія"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: INTEGRATED MEDICAL DETAILS */}
                  {activeTab === 'medical' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-warm-100 pb-2">Медична картка вихованця</h4>
                      
                      {loadingMedical ? (
                        <div className="flex justify-center items-center py-16 text-gray-400 italic text-sm">
                          Завантаження медичних відомостей...
                        </div>
                      ) : medicalData ? (
                        <div className="space-y-4">
                          {/* Top medical card indicators */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="text-[9px] font-bold uppercase text-gray-400">Група крові</div>
                              <div className="text-sm font-extrabold text-gray-700">{medicalData.card?.bloodGroup || 'Не вказано'}</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="text-[9px] font-bold uppercase text-gray-400">Резус-фактор</div>
                              <div className="text-sm font-extrabold text-gray-700">{medicalData.card?.rhFactor ? `Rh ${medicalData.card.rhFactor}` : 'Не вказано'}</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="text-[9px] font-bold uppercase text-gray-400">Група здоров'я</div>
                              <div className="text-sm font-extrabold text-gray-700">Група {medicalData.card?.healthGroup || '—'}</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="text-[9px] font-bold uppercase text-gray-400">Фіз. група</div>
                              <div className="text-sm font-extrabold text-gray-700">{medicalData.card?.physicalGroup || 'Не вказано'}</div>
                            </div>
                          </div>

                          {/* Height & Weight */}
                          <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
                                <Award size={18} />
                              </div>
                              <div>
                                <div className="text-xs font-extrabold text-gray-800">Фізичний стан (Останній вимір)</div>
                                <div className="text-[10px] text-gray-500">
                                  {medicalData.measurements?.[0]?.measuredAt 
                                    ? `Дата виміру: ${new Date(medicalData.measurements[0].measuredAt).toLocaleDateString('uk-UA')}`
                                    : 'Немає записів вимірювань'}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <div>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Зріст:</span>{' '}
                                <strong className="text-sm text-gray-700">{medicalData.card?.height || medicalData.measurements?.[0]?.height || '—'} см</strong>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Вага:</span>{' '}
                                <strong className="text-sm text-gray-700">{medicalData.card?.weight || medicalData.measurements?.[0]?.weight || '—'} кг</strong>
                              </div>
                            </div>
                          </div>

                          {/* Allergies / Diets */}
                          {(medicalData.card?.allergies || medicalData.card?.dietaryRestrictions) && (
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                              <ShieldAlert className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                              <div className="space-y-1 text-sm text-amber-800">
                                {medicalData.card?.allergies && (
                                  <div>
                                    <strong>Алергії:</strong> {medicalData.card.allergies}
                                  </div>
                                )}
                                {medicalData.card?.dietaryRestrictions && (
                                  <div>
                                    <strong>Дієтичні обмеження:</strong> {medicalData.card.dietaryRestrictions}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Illnesses and Vaccinations */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Перенесені хвороби</div>
                              <div className="max-h-[140px] overflow-y-auto border border-gray-100 rounded-2xl bg-white p-3 space-y-2">
                                {medicalData.illnesses.length > 0 ? (
                                  medicalData.illnesses.map((ill, i) => (
                                    <div key={i} className="text-xs border-b border-gray-50 pb-1.5 last:border-b-0 last:pb-0">
                                      <div className="font-extrabold text-gray-700 leading-tight">{ill.diagnosis}</div>
                                      <div className="text-[10px] text-gray-400 mt-0.5">
                                        {new Date(ill.startDate).toLocaleDateString('uk-UA')} 
                                        {ill.endDate ? ` — ${new Date(ill.endDate).toLocaleDateString('uk-UA')}` : ' (Хворіє)'}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-6 text-gray-400 text-xs italic">Немає зареєстрованих захворювань</div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Вакцинація</div>
                              <div className="max-h-[140px] overflow-y-auto border border-gray-100 rounded-2xl bg-white p-3 space-y-2">
                                {medicalData.vaccinations.length > 0 ? (
                                  medicalData.vaccinations.map((vac, i) => (
                                    <div key={i} className="text-xs border-b border-gray-50 pb-1.5 last:border-b-0 last:pb-0 flex items-start gap-1">
                                      <div className="flex-1">
                                        <div className="font-extrabold text-gray-700 leading-tight">{vac.vaccineName}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                          {vac.dateGiven ? `Зроблено: ${new Date(vac.dateGiven).toLocaleDateString('uk-UA')}` : `Планується: ${new Date(vac.planDate).toLocaleDateString('uk-UA')}`}
                                        </div>
                                      </div>
                                      {vac.dateGiven ? (
                                        <CheckCircle className="text-emerald-500 flex-shrink-0" size={14} />
                                      ) : (
                                        <Calendar className="text-warm-500 flex-shrink-0" size={14} />
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-6 text-gray-400 text-xs italic">Дані про щеплення відсутні</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16 text-red-400 italic text-sm">
                          Помилка при завантаженні медичних відомостей
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: QR CODE & BADGE PRINT */}
                  {activeTab === 'qr' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-warm-100 pb-2">QR-перепустка вихованця</h4>
                      <div className="flex justify-center">
                        <ChildQRCode
                          childId={selectedChild.id}
                          qrToken={selectedChild.qrToken || undefined}
                          childName={selectedChild.fullName}
                          onRegenerate={handleQrRegenerated}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer submit button */}
                {activeTab !== 'medical' && activeTab !== 'qr' && (
                  <div className="mt-6 border-t border-warm-100 pt-4 flex justify-end gap-3 bg-white">
                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(false)}
                      className="rounded-xl px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-50 text-sm"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="ui-button-primary px-8 py-2.5"
                    >
                      {saving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* ARCHIVE/GRADUATE MODAL */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Оформлення вибуття вихованця"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-800">
            Оформлення вибуття перемістить дитину до Архіву. Виберіть або вкажіть причину вибуття:
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Оберіть причину</label>
            <CustomSelect
              options={[
                { id: 'Випуск із закладу', name: 'Випуск із закладу' },
                { id: 'Перехід в інший заклад', name: 'Перехід в інший заклад' },
                { id: 'За сімейними обставинами', name: 'За сімейними обставинами' },
                { id: 'custom', name: 'Інша причина (вказати вручну)' },
              ]}
              value={archiveReason === 'Випуск із закладу' || archiveReason === 'Перехід в інший заклад' || archiveReason === 'За сімейними обставинами' ? archiveReason : 'custom'}
              onChange={(value) => {
                if (value !== 'custom') {
                  setArchiveReason(String(value));
                } else {
                  setArchiveReason('');
                }
              }}
              placeholder="Оберіть причину"
            />
          </div>

          {(archiveReason !== 'Випуск із закладу' && archiveReason !== 'Перехід в інший заклад' && archiveReason !== 'За сімейними обставинами') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Причина вручну</label>
              <input
                required
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="ui-input"
                placeholder="Вкажіть причину вибуття дитини..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-warm-100">
            <button
              type="button"
              onClick={() => setIsArchiveModalOpen(false)}
              className="rounded-xl px-6 py-2 font-bold text-gray-500 hover:bg-gray-100 text-sm"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleArchiveChild}
              disabled={saving || !archiveReason.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2 font-bold text-white transition hover:bg-red-700 text-sm disabled:opacity-50"
            >
              <Trash2 size={16} />
              {saving ? 'Виконання...' : 'Оформити вибуття'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChildrenPage;
