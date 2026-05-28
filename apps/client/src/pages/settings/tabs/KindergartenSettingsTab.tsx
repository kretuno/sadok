import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import { Save, CheckCircle } from 'lucide-react';
import api from '../../../api/axios';

const KindergartenSettingsTab: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    edrpou: '',
    address: '',
    phone: '',
    email: '',
    directorName: '',
    nurseName: '',
    storekeeperName: '',
    supplyManagerName: '',
    showQuotes: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || '',
        edrpou: settings.edrpou || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        directorName: settings.directorName || '',
        nurseName: settings.nurseName || '',
        storekeeperName: settings.storekeeperName || '',
        supplyManagerName: settings.supplyManagerName || '',
        showQuotes: settings.showQuotes ?? true,
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSaved(false);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    try {
      await api.put('/settings', formData);
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Помилка збереження налаштувань', error);
      setErrorMessage('Не вдалося зберегти налаштування. Спробуйте ще раз.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-warm-100 p-6 shadow-sm animate-fade-in">
      <h3 className="text-xl font-bold text-gray-800 mb-6">Реквізити закладу</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Main info */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-600 border-b pb-2">Загальна інформація</h4>
            
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Повна назва закладу</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Код ЄДРПОУ</label>
                <input type="text" name="edrpou" value={formData.edrpou} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Телефон</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Юридична адреса</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" />
            </div>
          </div>

          {/* Personnel */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-600 border-b pb-2">Відповідальні особи (для звітів)</h4>
            
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Директор (Завідувач)</label>
              <input type="text" name="directorName" value={formData.directorName} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" placeholder="ПІБ" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Медична сестра</label>
              <input type="text" name="nurseName" value={formData.nurseName} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" placeholder="ПІБ" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Комірник (Кладовщик)</label>
              <input type="text" name="storekeeperName" value={formData.storekeeperName} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" placeholder="ПІБ" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Завгосп</label>
              <input type="text" name="supplyManagerName" value={formData.supplyManagerName} onChange={handleChange} className="ui-input w-full bg-gray-50 border-gray-200" placeholder="ПІБ" />
            </div>
            
            <div className="pt-4 border-t">
               <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                       type="checkbox" 
                       name="showQuotes" 
                       checked={formData.showQuotes} 
                       onChange={(e) => {
                          setFormData({ ...formData, showQuotes: e.target.checked });
                          setSaved(false);
                       }} 
                       className="sr-only" 
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.showQuotes ? 'bg-warm-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.showQuotes ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700">Показувати цитату дня</span>
                    <span className="text-[10px] text-gray-500">Надихаючі фрази про виховання дітей на головному екрані</span>
                  </div>
               </label>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t">
          <button type="submit" disabled={saving} className="ui-button-primary bg-warm-600 px-8 flex items-center gap-2">
            <Save size={18} />
            {saving ? 'Збереження...' : 'Зберегти зміни'}
          </button>
          
          {saved && (
            <span className="text-emerald-600 font-bold flex items-center gap-1 animate-fade-in">
              <CheckCircle size={18} /> Збережено
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default KindergartenSettingsTab;
