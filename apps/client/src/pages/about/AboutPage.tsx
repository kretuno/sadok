import React, { useState, useEffect, useRef } from 'react';
import { Code, Mail, Phone, User, ExternalLink, ShieldCheck, Heart, RefreshCw, AlertCircle, CheckCircle2, Sparkles, Send, Loader2 } from 'lucide-react';
import ukraineCoatOfArms from '../../assets/ukraine-coat-of-arms.svg';
import { useSettings } from '../../contexts/SettingsContext';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';

const SUPPORT_EMAIL = 'edosipov@gmail.com';
type ApiError = { response?: { status?: number; data?: { message?: unknown } } };

const getApiErrorResponse = (error: unknown): ApiError['response'] => (
  typeof error === 'object' && error !== null && 'response' in error
    ? (error as ApiError).response
    : undefined
);

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const { settings } = useSettings();
  const appVersion = settings?.appVersion || __APP_VERSION__;

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportStatus, setSupportStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [supportError, setSupportError] = useState('');
  const [isEmailFallbackAvailable, setIsEmailFallbackAvailable] = useState(false);
  const [ticketCode, setTicketCode] = useState('');
  const [supportForm, setSupportForm] = useState({
    category: 'question',
    subject: '',
    message: '',
    contact: '',
  });
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const desktop = window.sadokDesktop;
    if (!desktop) return;

    const clearCheckTimeout = () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };

    const unsubscribeAvailable = desktop.onUpdateAvailable?.(() => {
      clearCheckTimeout();
      setUpdateStatus('available');
    });

    const unsubscribeNotAvailable = desktop.onUpdateNotAvailable?.(() => {
      clearCheckTimeout();
      setUpdateStatus('not-available');
    });

    const unsubscribeError = desktop.onUpdateError?.((err) => {
      clearCheckTimeout();
      setUpdateStatus('error');
      setErrorMessage(err || 'Невідома помилка під час перевірки оновлень');
    });

    return () => {
      unsubscribeAvailable?.();
      unsubscribeNotAvailable?.();
      unsubscribeError?.();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.sadokDesktop?.checkForUpdates) {
      setUpdateStatus('error');
      setErrorMessage('Ця функція доступна лише у встановленій версії програми.');
      return;
    }

    setUpdateStatus('checking');
    setErrorMessage('');

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setUpdateStatus('error');
      setErrorMessage('Перевищено час очікування відповіді від сервера оновлень.');
      updateTimeoutRef.current = null;
    }, 15000); // 15 секунд
    
    try {
      const result = await window.sadokDesktop.checkForUpdates();
      if (!result.success) {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }
        setUpdateStatus('error');
        setErrorMessage(result.error || 'Не вдалося підключитися до сервера оновлень.');
      }
    } catch (err: unknown) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      setUpdateStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Сталася помилка при перевірці оновлень.');
    }
  };

  const handleSupportSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSupportStatus('submitting');
    setSupportError('');
    setIsEmailFallbackAvailable(false);
    try {
      const response = await api.post('/system/support/tickets', supportForm);
      setTicketCode(response.data.ticketCode);
      setSupportStatus('success');
    } catch (error: unknown) {
      const errorResponse = getApiErrorResponse(error);
      const status = errorResponse?.status;
      const responseMessage = String(errorResponse?.data?.message || '');
      const isTicketServiceUnavailable = !errorResponse
        || status === 404
        || responseMessage === 'Not found'
        || responseMessage.includes('Сервіс активації');
      setSupportError(isTicketServiceUnavailable
        ? 'Онлайн-сервіс звернень тимчасово недоступний. Скористайтеся резервним зверненням через email.'
        : responseMessage || 'Не вдалося надіслати звернення.');
      setIsEmailFallbackAvailable(isTicketServiceUnavailable);
      setSupportStatus('error');
    }
  };

  const supportEmailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[SADOK] ${supportForm.subject || 'Звернення до підтримки'}`)}&body=${encodeURIComponent([
    `Категорія: ${supportForm.category}`,
    `Версія SADOK: ${appVersion}`,
    '',
    supportForm.message,
    '',
    `Контакт для відповіді: ${supportForm.contact || 'не вказано'}`,
  ].join('\n'))}`;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-white p-4 md:p-8">
      {/* Decorative background elements */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-50/50 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-yellow-50/50 blur-3xl" />
      
      {/* Repeating Ornament Pattern (Subtle) */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l5 5h-10l5-5zM0 20l5-5v10l-5-5zM40 20l-5 5v-10l5 5zM20 40l-5-5h10l-5 5zM20 20l5 5h-10l5-5z' fill='%230057B7' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '40px 40px'
      }} />

      <div className="relative mx-auto max-w-3xl">
        {/* Header Section */}
        <div className="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0057B7] to-[#00428A] text-4xl font-bold text-white shadow-2xl transition-transform hover:scale-105">
                S
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD700] shadow-md">
                <ShieldCheck size={16} className="text-[#0057B7]" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900 md:text-5xl">
                SADOK <span className="text-sm font-normal text-gray-400">PRO</span>
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  v{appVersion}
                </span>
                <span className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  <Heart size={14} className="fill-red-500 text-red-500" />
                  Made with love in Ukraine
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <img
              src={ukraineCoatOfArms}
              alt="Малий Державний Герб України"
              className="h-16 w-auto opacity-95 transition-opacity hover:opacity-100 drop-shadow-xl"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Studio Info */}
          <div className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white/60 p-8 shadow-xl backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-2xl md:col-span-2">
            <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-[#0057B7] via-[#FFD700] to-[#0057B7]" />
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
              <Code size={24} className="text-blue-600" />
              Про студію
            </h3>
            <p className="text-lg leading-relaxed text-gray-600">
              <strong className="text-blue-700">Osipix Studio</strong> — це незалежна команда українських розробників. 
              Ми спеціалізуємось на створенні високотехнологічних рішень для автоматизації освіти та соціальної сфери. 
              SADOK — наш ключовий продукт, створений для підтримки українських закладів дошкільної освіти.
            </p>
          </div>

          {/* Developer Card */}
          <div className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
              <User size={20} className="text-[#0057B7]" />
              Розробка та архітектура
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold text-gray-800">Eduard Osipov</p>
                <p className="text-sm font-medium text-blue-600/80 uppercase tracking-wider">Lead Developer & Founder</p>
              </div>
              <div className="flex flex-col gap-2 border-t border-gray-50 pt-4">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <Mail size={16} /> edosipov@gmail.com
                </a>
                <a href="tel:+380675694704" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <Phone size={16} /> +380 67 569 47 04
                </a>
              </div>
            </div>
          </div>

          {/* Social/Links Card */}
          <div className="group rounded-3xl border border-gray-100 bg-gradient-to-br from-[#0057B7] to-[#00428A] p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-white">
              <ExternalLink size={20} />
              Офіційні ресурси
            </h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsSupportOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20"
              >
                Технічна підтримка <span>→</span>
              </button>
              <a
                href="http://osipov.pp.ua"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20"
              >
                Сайт студії <span>→</span>
              </a>
              <button
                type="button"
                onClick={() => navigate('/documentation')}
                className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20"
              >
                Документація (Wiki) <span>→</span>
              </button>
            </div>
          </div>

          {/* Update Checker Card */}
          <div className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white/60 p-8 shadow-xl backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-2xl md:col-span-2">
            <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
              <RefreshCw size={24} className={`text-emerald-600 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
              Оновлення програми
            </h3>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Поточна версія: <span className="font-bold text-gray-800">v{appVersion}</span>
                </p>
                <p className="mt-1 text-xs text-gray-400 font-normal">
                  Програма автоматично перевіряє наявність оновлень при кожному запуску. Ви також можете запустити перевірку вручну.
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={updateStatus === 'checking'}
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-sm transition-all active:scale-95 duration-200 ${
                    updateStatus === 'checking'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-md'
                  }`}
                >
                  {updateStatus === 'checking' ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Перевірка...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Перевірити оновлення
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Messages */}
            {updateStatus === 'not-available' && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                <span>У вас встановлено найновішу версію програми. Оновлення не потрібні.</span>
              </div>
            )}

            {updateStatus === 'available' && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-sm text-teal-800 animate-in fade-in slide-in-from-top-2">
                <Sparkles size={18} className="text-teal-600 animate-pulse flex-shrink-0" />
                <span>Знайдено нове оновлення! Його завантаження скоро розпочнеться у вікні сповіщень.</span>
              </div>
            )}

            {updateStatus === 'error' && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3 text-sm text-rose-800 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>© {currentYear} Osipix Studio. Всі права захищені.</p>
          <p className="mt-1">Слава Україні! 🇺🇦</p>
        </div>
      </div>

      <Modal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} title="Технічна підтримка" maxWidth="lg">
        {supportStatus === 'success' ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-xl font-bold text-gray-900">Звернення надіслано</h4>
            <p className="mt-2 text-gray-600">Номер звернення: <strong className="text-blue-700">{ticketCode}</strong></p>
            <p className="mt-1 text-sm text-gray-500">Технічна підтримка звʼяжеться з вами за вказаними контактами.</p>
            <button
              type="button"
              onClick={() => {
                setIsSupportOpen(false);
                setSupportStatus('idle');
                setSupportForm({ category: 'question', subject: '', message: '', contact: '' });
              }}
              className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-700"
            >
              Готово
            </button>
          </div>
        ) : (
          <form onSubmit={handleSupportSubmit} className="space-y-4">
            <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Разом зі зверненням буде передано лише версію SADOK, версію операційної системи та ідентифікатор ліцензії. Дані закладу, дітей і працівників не надсилаються.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Категорія</span>
              <select
                value={supportForm.category}
                onChange={(event) => setSupportForm((value) => ({ ...value, category: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="bug">Помилка в програмі</option>
                <option value="question">Питання</option>
                <option value="suggestion">Пропозиція</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Тема</span>
              <input
                required minLength={5} maxLength={120} value={supportForm.subject}
                onChange={(event) => setSupportForm((value) => ({ ...value, subject: event.target.value }))}
                placeholder="Коротко опишіть питання"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Опис</span>
              <textarea
                required minLength={10} maxLength={4000} rows={6} value={supportForm.message}
                onChange={(event) => setSupportForm((value) => ({ ...value, message: event.target.value }))}
                placeholder="Що сталося, які дії виконували та який результат очікували?"
                className="w-full resize-y rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <span className="mt-1 block text-right text-xs text-gray-400">{supportForm.message.length}/4000</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Email або телефон для відповіді</span>
              <input
                maxLength={160} value={supportForm.contact}
                onChange={(event) => setSupportForm((value) => ({ ...value, contact: event.target.value }))}
                placeholder="Необовʼязково"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            {supportStatus === 'error' && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <div className="flex gap-2">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{supportError}</span>
                </div>
                {isEmailFallbackAvailable && (
                  <a href={supportEmailHref} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 font-bold text-rose-700 transition-colors hover:bg-rose-100">
                    <Mail size={16} /> Створити лист до підтримки
                  </a>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button" onClick={() => setIsSupportOpen(false)} disabled={supportStatus === 'submitting'}
                className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                type="submit" disabled={supportStatus === 'submitting'}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {supportStatus === 'submitting' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                {supportStatus === 'submitting' ? 'Надсилання…' : 'Надіслати звернення'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AboutPage;
