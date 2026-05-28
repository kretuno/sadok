import React, { useState, useEffect } from 'react';
import { Plus, Syringe, Pencil } from 'lucide-react';
import api from '../../../api/axios';
import CustomSelect from '../../../components/ui/CustomSelect';

const VaccinationsTab: React.FC = () => {
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    childId: '',
    vaccineName: '',
    status: 'planned',
    planDate: '',
    dateGiven: '',
    notes: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    try {
      const [vacRes, childRes] = await Promise.all([
        api.get('/medical/vaccinations'),
        api.get('/medical/children'),
      ]);
      setVaccinations(vacRes.data);
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
      vaccineName: '',
      status: 'planned',
      planDate: '',
      dateGiven: '',
      notes: '',
    });
    setEditingId(null);
    setIsAdding(false);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      if (editingId) {
        await api.put(`/medical/vaccinations/${editingId}`, formData);
      } else {
        await api.post('/medical/vaccinations', formData);
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error('Помилка збереження щеплення', err);
      setErrorMessage(
        editingId
          ? 'Не вдалося оновити запис про щеплення.'
          : 'Не вдалося додати запис про щеплення.',
      );
    }
  };

  const handleEdit = (vac: any) => {
    setEditingId(vac.id);
    setIsAdding(true);
    setFormData({
      childId: String(vac.childId),
      vaccineName: vac.vaccineName || '',
      status: vac.status || 'planned',
      planDate: vac.planDate ? new Date(vac.planDate).toISOString().slice(0, 10) : '',
      dateGiven: vac.dateGiven ? new Date(vac.dateGiven).toISOString().slice(0, 10) : '',
      notes: vac.notes || '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Syringe size={20} className="text-blue-500" />
          Журнал щеплень
        </h2>
        <button
          onClick={() => {
            if (isAdding) {
              resetForm();
            } else {
              setIsAdding(true);
            }
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Запланувати або додати щеплення</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col gap-4">
          <h3 className="font-bold text-gray-800">{editingId ? 'Редагування щеплення' : 'Деталі щеплення'}</h3>
          
          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Назва вакцини (Хвороба)</label>
              <input
                required
                type="text"
                value={formData.vaccineName}
                onChange={e => setFormData({ ...formData, vaccineName: e.target.value })}
                className="ui-input w-full"
                placeholder="АКДП, КПК, Поліомієліт тощо"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Статус</label>
              <CustomSelect
                options={[
                  { id: 'planned', name: 'Заплановано' },
                  { id: 'done', name: 'Виконано' },
                  { id: 'exempt', name: 'Медвідвід / відмова' },
                ]}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: String(value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Запланована дата</label>
              <input
                type="date"
                value={formData.planDate}
                onChange={e => setFormData({ ...formData, planDate: e.target.value })}
                className="ui-input w-full"
              />
            </div>
            {formData.status === 'done' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Дата фактичного вакцинування</label>
                <input
                  type="date"
                  required
                  value={formData.dateGiven}
                  onChange={e => setFormData({ ...formData, dateGiven: e.target.value })}
                  className="ui-input w-full border-green-300 focus:ring-green-500"
                />
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Примітки (серія, виробник тощо)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="ui-input w-full"
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
              className="bg-blue-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-sm"
            >
              {editingId ? 'Зберегти зміни' : 'Зберегти'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Дитина</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Вакцина</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Статус</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Дати</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Примітки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {vaccinations.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 font-medium text-sm">
                  Записів не знайдено
                </td>
              </tr>
            ) : (
              vaccinations.map((vac) => (
                <tr key={vac.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-black text-gray-800">{vac.childName}</td>
                  <td className="p-4 font-bold text-gray-600">{vac.vaccineName}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                      vac.status === 'done' ? 'bg-green-100 text-green-700' :
                      vac.status === 'planned' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {vac.status === 'done' ? 'Виконано' : vac.status === 'planned' ? 'Заплановано' : 'Медвідвід'}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-semibold text-gray-600 space-y-1">
                    {vac.planDate && <div><span className="text-gray-400 font-normal">План:</span> {new Date(vac.planDate).toLocaleDateString('uk-UA')}</div>}
                    {vac.dateGiven && <div><span className="text-green-500 font-normal">Факт:</span> {new Date(vac.dateGiven).toLocaleDateString('uk-UA')}</div>}
                  </td>
                  <td className="p-4 text-sm text-gray-500 max-w-[200px] truncate" title={vac.notes}>{vac.notes || '—'}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleEdit(vac)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      <Pencil size={14} />
                      Редагувати
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VaccinationsTab;
