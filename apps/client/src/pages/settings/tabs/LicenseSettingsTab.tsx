import React, { useState, useEffect } from 'react';
import { Cpu, Copy, CheckCircle } from 'lucide-react';
import api from '../../../api/axios';
import { useSettings } from '../../../contexts/SettingsContext';

const getDaysLabel = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) {
    return 'днів';
  }
  if (mod10 === 1) {
    return 'день';
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'дні';
  }
  return 'днів';
};

const LicenseSettingsTab: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  const [requestCode, setRequestCode] = useState<string>('');
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [activating, setActivating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchMachineId = async () => {
      try {
        setLoading(true);
        const response = await api.get('/settings/hwid');
        setRequestCode(response.data.requestCode);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch machine ID', err);
        const details = err.response?.data?.details ? ` - ${err.response.data.details}` : '';
        const serverMsg = err.response?.data?.message || 'Помилка мережі';
        setError(`(v2) ${serverMsg}${details}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMachineId();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(requestCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    
    setActivating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await api.post('/settings/activate', { licenseKey });
      setSuccess(response.data.message);
      await refreshSettings();
      setLicenseKey('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка при активації');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-warm-100 p-6 shadow-sm animate-fade-in relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
        <Cpu size={200} className="text-warm-500" />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings?.isActivated ? 'bg-emerald-100 text-emerald-600' : 'bg-warm-100 text-warm-600'}`}>
          {settings?.isActivated ? <CheckCircle size={24} /> : <Cpu size={24} />}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            {settings?.isActivated ? 'Програму активовано' : 'Ліцензія та Активація'}
          </h3>
          <p className="text-sm text-gray-500 font-medium">
            {settings?.isActivated 
              ? `Тип ліцензії: ${
                  settings.licenseType === 'lifetime' ? 'Пожиттєва 🌻' : 
                  settings.licenseType === 'halfyear' ? 'Піврічна' :
                  settings.licenseType === 'quarterly' ? 'Квартальна' :
                  settings.licenseType === 'monthly' ? 'Місячна' :
                  settings.licenseType === 'demo' ? 'Демонстраційна 🧪' : 'Річна'
                }` 
              : 'Керування ліцензійним ключем вашого закладу'}
          </p>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        {!settings?.isActivated && settings?.daysRemaining !== undefined && (
          <div className={`p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border ${
            settings.isExpired 
              ? 'bg-red-50 border-red-200 animate-shake' 
              : 'bg-amber-50 border-amber-100 animate-fade-in'
          }`}>
            <div>
              <h4 className={`font-bold ${settings.isExpired ? 'text-red-900' : 'text-amber-900'}`}>
                {settings.isExpired ? 'Демонстраційний період завершився!' : 'Демонстраційний період'}
              </h4>
              <p className={`text-xs font-medium mt-1 ${settings.isExpired ? 'text-red-700' : 'text-amber-700'}`}>
                {settings.isExpired 
                  ? 'Термін безкоштовного ознайомлення закінчився. Будь ласка, активуйте ліцензію для продовження роботи.' 
                  : 'Ви використовуєте безкоштовний ознайомчий період для тестування всіх функцій програми.'}
              </p>
            </div>
            <div className={`flex items-center gap-3 bg-white border px-5 py-3 rounded-2xl shadow-sm self-start md:self-auto ${
              settings.isExpired ? 'border-red-200' : 'border-amber-200'
            }`}>
              <div className={`text-3xl font-black ${settings.isExpired ? 'text-red-600 animate-pulse' : 'text-amber-600'}`}>
                {settings.daysRemaining}
              </div>
              <div className={`text-xs font-bold uppercase tracking-wider leading-none ${settings.isExpired ? 'text-red-800' : 'text-amber-800'}`}>
                {getDaysLabel(settings.daysRemaining)}<br/>
                <span className={`text-[10px] font-medium lowercase ${settings.isExpired ? 'text-red-500' : 'text-amber-500'}`}>залишилося</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-warm-50/50 rounded-2xl border border-warm-100 p-6">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              <Cpu size={20} className="text-warm-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-1">Код запиту (ID комп'ютера)</h4>
              <p className="text-sm text-gray-600 mb-4">
                Скопіюйте та надішліть цей код після оплати ліцензії для отримання або оновлення ключа ліцензії.
              </p>

              {loading ? (
                <div className="h-12 w-full bg-gray-100 animate-pulse rounded-xl"></div>
              ) : (
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-warm-200 px-4 py-3 rounded-xl font-mono text-sm text-warm-800 font-bold break-all shadow-inner">
                    {requestCode}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`p-3 rounded-xl transition-all ${
                      copied 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105' 
                        : 'bg-warm-600 text-white hover:bg-warm-700 shadow-lg shadow-warm-100'
                    }`}
                    title="Копіювати код"
                  >
                    {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {settings?.isActivated && (
          <div className="space-y-4 animate-fade-in">
            <div className={`border p-6 rounded-2xl ${
              settings.isExpired ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-100'
            }`}>
               <h4 className={`font-bold mb-2 font-display ${
                 settings.isExpired ? 'text-red-900 animate-shake' : 'text-emerald-800'
               }`}>
                 {settings.isExpired ? 'Термін дії ліцензії закінчився!' : 'Дякуємо за активацію!'}
               </h4>
               <p className={`text-sm leading-relaxed ${
                 settings.isExpired ? 'text-red-700' : 'text-emerald-700'
               }`}>
                 {settings.isExpired 
                   ? 'Основні функції програми обмежено. Будь ласка, введіть новий ліцензійний ключ нижче для відновлення роботи.' 
                   : 'Ваша копія програми «SADOK» працює у повнофункціональному режимі. Всі обмеження демо-версії знято.'}
               </p>
            </div>

            {settings.licenseType === 'lifetime' ? (
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-200/50 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>Пожиттєва ліцензія</span> 🌻
                  </h4>
                  <p className="text-xs font-medium text-amber-700 mt-1">
                    Програму активовано назавжди. Безлімітний доступ без обмежень за часом.
                  </p>
                </div>
                <div className="text-3xl font-black text-amber-600">∞</div>
              </div>
            ) : (
              <div className={`p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border ${
                settings.isExpired 
                  ? 'bg-red-50 border-red-200 animate-shake' 
                  : 'bg-blue-50 border-blue-100'
              }`}>
                <div>
                  <h4 className={`font-bold ${settings.isExpired ? 'text-red-900' : 'text-blue-900'}`}>
                    {settings.isExpired ? 'Ліцензія прострочена' : 'Термін дії ліцензії'}
                  </h4>
                  <p className={`text-xs font-medium mt-1 ${settings.isExpired ? 'text-red-700' : 'text-blue-700'}`}>
                    {settings.isExpired 
                      ? 'Термін дії вашого ліцензійного ключа закінчився.' 
                      : 'У вас активована тимчасова ліцензія. Після закінчення терміну знадобиться новий ключ активації.'}
                  </p>
                </div>
                <div className={`flex items-center gap-3 bg-white border px-5 py-3 rounded-2xl shadow-sm self-start md:self-auto ${
                  settings.isExpired ? 'border-red-200' : 'border-blue-200'
                }`}>
                  <div className={`text-3xl font-black ${settings.isExpired ? 'text-red-600' : 'text-blue-600 animate-pulse'}`}>
                    {settings.daysRemaining ?? 0}
                  </div>
                  <div className={`text-xs font-bold uppercase tracking-wider leading-none ${settings.isExpired ? 'text-red-800' : 'text-blue-800'}`}>
                    {getDaysLabel(settings.daysRemaining ?? 0)}<br/>
                    <span className={`text-[10px] font-medium lowercase ${settings.isExpired ? 'text-red-500' : 'text-blue-500'}`}>залишилося</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(!settings?.isActivated || settings?.isExpired) && (
          <div className="pt-4 border-t border-gray-100">
            <h4 className="font-bold text-gray-800 mb-4">
              {settings?.isActivated ? 'Оновлення ліцензійного ключа' : 'Активація програми'}
            </h4>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Ключ активації</label>
                <input 
                  type="text" 
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Введіть отриманий ключ" 
                  className="ui-input w-full bg-gray-50 border-gray-200 focus:bg-white text-lg font-mono uppercase tracking-widest"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 animate-shake">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-medium border border-emerald-100 animate-fade-in">
                  {success}
                </div>
              )}

              <button 
                onClick={handleActivate}
                disabled={activating || !licenseKey.trim()} 
                className="ui-button-primary bg-warm-600 px-8 py-3 w-fit flex items-center gap-2 group"
              >
                {activating ? 'Активація...' : 'Активувати програму'}
                {!activating && <CheckCircle size={18} className="group-hover:scale-125 transition-transform" /> }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LicenseSettingsTab;
