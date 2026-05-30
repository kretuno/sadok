import React, { useEffect, useState } from 'react';
import { Sparkles, Download, RefreshCw, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

interface SadokUpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface SadokDownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export const UpdateNotification: React.FC = () => {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<SadokUpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const desktop = window.sadokDesktop;
    if (!desktop) return;

    // Подписки на события Electron
    const unsubscribeAvailable = desktop.onUpdateAvailable?.((info) => {
      setUpdateInfo(info);
      setStatus('available');
      setShow(true);
    });

    const unsubscribeDownloaded = desktop.onUpdateDownloaded?.(() => {
      setStatus('downloaded');
      setProgress(100);
      setShow(true);
    });

    const unsubscribeProgress = desktop.onDownloadProgress?.((prog: SadokDownloadProgress) => {
      setStatus('downloading');
      setProgress(Math.round(prog.percent));
      const mbps = (prog.bytesPerSecond / (1024 * 1024)).toFixed(1);
      setSpeed(`${mbps} MB/s`);
    });

    const unsubscribeError = desktop.onUpdateError?.((err) => {
      setErrorMsg(err);
      setStatus('error');
      setShow(true);
    });

    return () => {
      unsubscribeAvailable?.();
      unsubscribeDownloaded?.();
      unsubscribeProgress?.();
      unsubscribeError?.();
    };
  }, []);

  const handleDownload = async () => {
    if (!window.sadokDesktop?.downloadUpdate) return;
    setStatus('downloading');
    setProgress(0);
    const result = await window.sadokDesktop.downloadUpdate();
    if (!result.success) {
      setErrorMsg(result.error || 'Помилка при запуску завантаження');
      setStatus('error');
    }
  };

  const handleInstall = () => {
    if (!window.sadokDesktop?.installUpdate) return;
    window.sadokDesktop.installUpdate();
  };

  const handleClose = () => {
    setShow(false);
    // Если это была ошибка или мы отложили, вернем статус idle через время
    setTimeout(() => {
      if (status === 'error' || status === 'available') {
        setStatus('idle');
      }
    }, 500);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 overflow-hidden rounded-2xl border border-warm-200 bg-white/95 p-5 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      {/* Шапка уведомления */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            status === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
          }`}>
            {status === 'available' && <Sparkles className="h-5 w-5 animate-pulse" />}
            {status === 'downloading' && <Download className="h-5 w-5 animate-bounce" />}
            {status === 'downloaded' && <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />}
            {status === 'error' && <AlertCircle className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {status === 'available' && 'Доступне оновлення!'}
              {status === 'downloading' && 'Завантаження оновлення...'}
              {status === 'downloaded' && 'Оновлення готове!'}
              {status === 'error' && 'Помилка оновлення'}
            </h4>
            <p className="text-xs text-gray-500">
              {status === 'available' && `Доступна версія ${updateInfo?.version}`}
              {status === 'downloading' && `Завантажено ${progress}% з ${speed}`}
              {status === 'downloaded' && 'Перезапустіть додаток для встановлення'}
              {status === 'error' && 'Не вдалося завантажити оновлення'}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Описание изменений (Release Notes) */}
      {status === 'available' && updateInfo?.releaseNotes && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span>Що нового у цій версії?</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {isExpanded && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-gray-50 p-2 text-xs text-gray-600 leading-relaxed font-sans scrollbar-thin">
              <div dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }} />
            </div>
          )}
        </div>
      )}

      {/* Ошибка */}
      {status === 'error' && (
        <div className="mt-3 rounded-xl bg-rose-50/50 p-2 border border-rose-100 text-xs text-rose-600">
          {errorMsg || 'Сталася невідома помилка під час оновлення.'}
        </div>
      )}

      {/* Прогресс скачивания */}
      {status === 'downloading' && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Действия */}
      <div className="mt-4 flex gap-2 justify-end">
        {status === 'available' && (
          <>
            <button
              onClick={handleClose}
              className="rounded-xl border border-warm-200 px-4 py-2 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 active:scale-95 transition-all"
            >
              Пізніше
            </button>
            <button
              onClick={handleDownload}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Завантажити
            </button>
          </>
        )}

        {status === 'downloaded' && (
          <>
            <button
              onClick={handleClose}
              className="rounded-xl border border-warm-200 px-4 py-2 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 active:scale-95 transition-all"
            >
              Скасувати
            </button>
            <button
              onClick={handleInstall}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 relative overflow-hidden animate-pulse"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Встановити та перезапустити
            </button>
          </>
        )}

        {status === 'error' && (
          <button
            onClick={handleClose}
            className="rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 px-4 py-2 text-xs font-semibold transition-all"
          >
            Закрити
          </button>
        )}
      </div>
    </div>
  );
};
