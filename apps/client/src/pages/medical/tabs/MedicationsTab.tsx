import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Pill, ArrowUpRight, CheckCircle, X } from 'lucide-react';
import api from '../../../api/axios';
import type { Medication } from '../MedicalPage';
import CustomSelect from '../../../components/ui/CustomSelect';

interface MedicationsTabProps {
  medications: Medication[];
  reloadMedications: () => void;
}

interface Child {
  id: number;
  fullName: string;
}

interface MedicationMovement {
  id: number;
  medicationId: number;
  medicationName: string;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  date: string;
  reason: string | null;
  childId: number | null;
  childName: string | null;
  userId: number | null;
  userName: string | null;
}

const unitOptions = ['шт', 'упаковка', 'флакон', 'ампула', 'г', 'мл'];
const expiryWarningWindowMs = 30 * 24 * 60 * 60 * 1000;

const MedicationsTab: React.FC<MedicationsTabProps> = ({ medications, reloadMedications }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSpending, setIsSpending] = useState<number | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [movements, setMovements] = useState<MedicationMovement[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expiryWarningThreshold] = useState(() => Date.now() + expiryWarningWindowMs);
  
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'упаковка',
    expiryDate: '',
    notes: '',
  });

  const [spendData, setSpendData] = useState({
    quantity: 1,
    reason: '',
    childId: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    void fetchChildren();
    void loadMovements();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await api.get('/medical/children');
      setChildren(res.data);
    } catch (err) {
      console.error('Failed to load children', err);
    }
  };

  const loadMovements = async () => {
    try {
      const res = await api.get('/medical/medications/movements');
      setMovements(res.data);
    } catch (err) {
      console.error('Failed to load medication movements', err);
    }
  };

  const reloadAllMedicationData = async () => {
    reloadMedications();
    await loadMovements();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      await api.post('/medical/medications', formData);
      setFormData({ name: '', quantity: 1, unit: 'упаковка', expiryDate: '', notes: '' });
      setIsAdding(false);
      await reloadAllMedicationData();
      setNotice({ type: 'success', message: 'Медикамент додано' });
    } catch (err) {
      console.error('Failed to add medication', err);
      setNotice({ type: 'error', message: 'Помилка при додаванні медикаменту' });
    }
  };

  const handleSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSpending) return;

    setNotice(null);
    try {
      await api.post('/medical/medications/spend', {
        medicationId: isSpending,
        ...spendData
      });
      setIsSpending(null);
      setSpendData({
        quantity: 1,
        reason: '',
        childId: '',
        date: new Date().toISOString().split('T')[0]
      });
      await reloadAllMedicationData();
      setNotice({ type: 'success', message: 'Списання медикаменту виконано' });
    } catch (err: any) {
      console.error('Failed to spend medication', err);
      setNotice({ type: 'error', message: err.response?.data?.message || 'Помилка при списанні' });
    }
  };

  const spendingMedication = medications.find(m => m.id === isSpending);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Pill size={20} className="text-warm-500" />
          Склад медикаментів
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-warm-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-warm-600 transition-colors flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Додати ліки</span>
        </button>
      </div>

      {notice && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
          notice.type === 'error'
            ? 'border-red-100 bg-red-50 text-red-700'
            : 'border-emerald-100 bg-emerald-50 text-emerald-700'
        }`}>
          {notice.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {notice.message}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-warm-50 p-6 rounded-2xl border border-warm-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-bold text-gray-800">Новий препарат</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Назва</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="ui-input w-full"
                placeholder="Напр. Парацетамол 500мг"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Кількість</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Одиниці</label>
              <CustomSelect
                options={unitOptions.map(u => ({ id: u, name: u }))}
                value={formData.unit}
                onChange={(value) => setFormData({ ...formData, unit: String(value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Придатний до</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                className="ui-input w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Примітки</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="ui-input w-full"
              placeholder="Додаткова інформація"
            />
          </div>
          <div className="flex justify-end space-x-3 mt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-600 transition-colors shadow-sm"
            >
              Зберегти
            </button>
          </div>
        </form>
      )}

      {isSpending && spendingMedication && (
        <form onSubmit={handleSpend} className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-orange-800 flex items-center gap-2">
              <ArrowUpRight size={18} />
              Використання препарату: {spendingMedication.name}
            </h3>
            <button type="button" onClick={() => setIsSpending(null)} className="text-orange-400 hover:text-orange-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-orange-700 uppercase mb-1">Кількість ({spendingMedication.unit})</label>
              <input
                required
                type="number"
                min="0.01"
                max={spendingMedication.quantity}
                step="0.01"
                value={spendData.quantity}
                onChange={e => setSpendData({ ...spendData, quantity: Number(e.target.value) })}
                className="ui-input w-full border-orange-200 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-700 uppercase mb-1">Кому (Дитина)</label>
              <CustomSelect
                options={[
                  { id: '', name: 'Не вказано' },
                  ...children.map(c => ({ id: c.id, name: c.fullName }))
                ]}
                value={spendData.childId}
                onChange={(val) => setSpendData({ ...spendData, childId: String(val) })}
                className="border-orange-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-orange-700 uppercase mb-1">Причина / Вказівки</label>
              <input
                required
                type="text"
                value={spendData.reason}
                onChange={e => setSpendData({ ...spendData, reason: e.target.value })}
                className="ui-input w-full border-orange-200 focus:border-orange-500"
                placeholder="Напр. за призначенням лікаря, обробка рани"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="submit"
              className="bg-orange-500 text-white px-8 py-2 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-sm flex items-center gap-2"
            >
              <CheckCircle size={18} />
              Списати
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Назва</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Залишок</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Придатний до</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Примітки</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {medications.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-400 font-medium">
                  Немає препаратів на складі
                </td>
              </tr>
            ) : (
              medications.map((item) => {
                const isExpiring = item.expiryDate && new Date(item.expiryDate).getTime() < expiryWarningThreshold;
                return (
                  <tr key={item.id} className="hover:bg-warm-50/30 transition-colors group">
                    <td className="p-4">
                      <div className="font-black text-gray-800">{item.name}</div>
                    </td>
                    <td className="p-4">
                      <div className={`font-bold inline-flex items-center px-2.5 py-0.5 rounded-full text-sm ${item.quantity < 5 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {item.quantity} <span className="text-[10px] ml-1 uppercase opacity-70">{item.unit}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`font-semibold text-sm ${isExpiring ? 'text-red-500' : 'text-gray-600'}`}>
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('uk-UA') : '—'}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{item.notes || '—'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setIsSpending(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-warm-100 text-warm-700 hover:bg-warm-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter flex items-center gap-1 ml-auto"
                      >
                        <ArrowUpRight size={14} />
                        Використати
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-3xl border border-gray-100 shadow-sm overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div>
            <h3 className="font-black text-gray-800">Журнал руху медикаментів</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Надходження та списання з причинами, дитиною і відповідальним користувачем</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Дата</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Препарат</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Операція</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Кількість</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Дитина</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Користувач</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Причина</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 font-medium text-sm">
                    Рухів медикаментів ще немає
                  </td>
                </tr>
              ) : (
                movements.map((movement) => {
                  const medication = medications.find((item) => item.id === movement.medicationId);
                  const quantityLabel = medication ? `${movement.quantity} ${medication.unit}` : String(movement.quantity);

                  return (
                    <tr key={movement.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-sm font-semibold text-gray-600">
                        {new Date(movement.date).toLocaleDateString('uk-UA')}
                      </td>
                      <td className="p-4 font-bold text-gray-800">{movement.medicationName}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                          movement.type === 'in'
                            ? 'bg-green-100 text-green-700'
                            : movement.type === 'out'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}>
                          {movement.type === 'in' ? 'Надходження' : movement.type === 'out' ? 'Списання' : 'Корекція'}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-700">{quantityLabel}</td>
                      <td className="p-4 text-sm text-gray-600">{movement.childName || '—'}</td>
                      <td className="p-4 text-sm text-gray-600">{movement.userName || 'Система'}</td>
                      <td className="p-4 text-sm text-gray-500">{movement.reason || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MedicationsTab;
