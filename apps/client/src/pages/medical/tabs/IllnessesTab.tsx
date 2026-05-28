import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Plus, Activity, Pencil } from 'lucide-react';
import api from '../../../api/axios';
import CustomSelect from '../../../components/ui/CustomSelect';

const IllnessesTab: React.FC = () => {
  const [illnesses, setIllnesses] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formData, setFormData] = useState({
    childId: '',
    diagnosis: '',
    startDate: '',
    endDate: '',
    quarantineEndDate: '',
    isolationWard: false,
    notes: '',
  });

  const loadData = async () => {
    try {
      const [illRes, childRes] = await Promise.all([
        api.get('/medical/illnesses'),
        api.get('/medical/children'),
      ]);
      setIllnesses(illRes.data);
      setChildren(childRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      childId: '',
      diagnosis: '',
      startDate: '',
      endDate: '',
      quarantineEndDate: '',
      isolationWard: false,
      notes: '',
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      if (editingId) {
        await api.put(`/medical/illnesses/${editingId}`, formData);
      } else {
        await api.post('/medical/illnesses', formData);
      }
      resetForm();
      loadData();
      setNotice({ type: 'success', message: editingId ? 'Запис оновлено' : 'Запис додано' });
    } catch (err) {
      console.error('Помилка збереження запису про захворювання', err);
      setNotice({ type: 'error', message: editingId ? 'Не вдалося оновити запис' : 'Не вдалося додати запис' });
    }
  };

  const handleEdit = (ill: any) => {
    setEditingId(ill.id);
    setIsAdding(true);
    setFormData({
      childId: String(ill.childId),
      diagnosis: ill.diagnosis || '',
      startDate: ill.startDate ? new Date(ill.startDate).toISOString().slice(0, 10) : '',
      endDate: ill.endDate ? new Date(ill.endDate).toISOString().slice(0, 10) : '',
      quarantineEndDate: ill.quarantineEndDate ? new Date(ill.quarantineEndDate).toISOString().slice(0, 10) : '',
      isolationWard: Boolean(ill.isolationWard),
      notes: ill.notes || '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Activity size={20} className="text-warm-500" />
          Журнал захворювань та карантинів
        </h2>
        <button
          onClick={() => {
            if (isAdding) {
              resetForm();
            } else {
              setIsAdding(true);
            }
          }}
          className="bg-warm-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-warm-600 transition-colors flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Новий запис</span>
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

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-warm-50 p-6 rounded-2xl border border-warm-100 flex flex-col gap-4">
          <h3 className="font-bold text-gray-800">{editingId ? 'Редагування запису про хворобу' : 'Додати запис про хворобу'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Дитина</label>
              <CustomSelect
                options={children.map(c => ({
                  id: c.id,
                  name: `${c.fullName} (${c.groupName || 'без групи'})`,
                }))}
                value={formData.childId}
                onChange={(value) => setFormData({ ...formData, childId: String(value) })}
                placeholder="Оберіть дитину..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Діагноз / Причина</label>
              <input
                required
                type="text"
                value={formData.diagnosis}
                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                className="ui-input w-full"
                placeholder="Напр. ГРВІ"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Дата початку</label>
              <input
                required
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Дата визволення/одужання</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Кінець карантину</label>
              <input
                type="date"
                value={formData.quarantineEndDate}
                onChange={e => setFormData({ ...formData, quarantineEndDate: e.target.value })}
                className="ui-input w-full"
              />
            </div>
            <div className="flex items-center space-x-3 mt-6">
              <input
                type="checkbox"
                id="isolation"
                checked={formData.isolationWard}
                onChange={e => setFormData({ ...formData, isolationWard: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-warm-500 focus:ring-warm-500"
              />
              <label htmlFor="isolation" className="text-sm font-bold text-red-600">Перебуває в ізоляторі</label>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Примітки</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="ui-input w-full"
              placeholder="Симптоми, лікування або додаткова інформація"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-600 transition-colors shadow-sm"
            >
              {editingId ? 'Зберегти зміни' : 'Зберегти'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 mt-6">
        {illnesses.length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-medium bg-gray-50 rounded-3xl">Записів не знайдено</div>
        ) : (
          illnesses.map(ill => (
            <div key={ill.id} className={`p-5 rounded-2xl border ${ill.isolationWard ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm'} flex justify-between items-start`}>
              <div>
                <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                  {ill.childName} 
                  {ill.isolationWard && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Ізолятор</span>}
                </h3>
                <div className="text-sm font-bold text-warm-600 mt-1">{ill.diagnosis}</div>
                <div className="text-sm font-semibold text-gray-500 mt-2 flex flex-wrap gap-4">
                  <span>З: <span className="text-gray-700">{new Date(ill.startDate).toLocaleDateString('uk-UA')}</span></span>
                  <span>По: <span className="text-gray-700">{ill.endDate ? new Date(ill.endDate).toLocaleDateString('uk-UA') : 'хворіє'}</span></span>
                  {ill.quarantineEndDate && <span>Карантин до: <span className="text-gray-700">{new Date(ill.quarantineEndDate).toLocaleDateString('uk-UA')}</span></span>}
                </div>
                {ill.notes && <p className="mt-3 text-sm text-gray-600 bg-white/60 p-2 rounded-lg truncate">{ill.notes}</p>}
              </div>
              <button
                onClick={() => handleEdit(ill)}
                className="ml-4 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-warm-700 shadow-sm transition hover:bg-warm-100"
              >
                <Pencil size={14} />
                Редагувати
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IllnessesTab;
