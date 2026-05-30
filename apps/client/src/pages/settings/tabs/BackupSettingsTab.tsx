import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, AlertTriangle, CheckCircle2, Database, Download, RefreshCcw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import api from '../../../api/axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useSettings } from '../../../contexts/SettingsContext';
import Modal from '../../../components/ui/Modal';

type BackupItem = {
  fileName: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

type Notice = {
  type: 'success' | 'error';
  message: string;
};

type ConfirmAction =
  | { type: 'deleteArchive'; fileName: string; title: string; message: string; confirmLabel: string; tone: 'red' }
  | { type: 'restoreArchive'; fileName: string; title: string; message: string; confirmLabel: string; tone: 'amber' }
  | { type: 'restoreFile'; file: File; title: string; message: string; confirmLabel: string; tone: 'red' };

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const BackupSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings, refreshSettings } = useSettings();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [backupTime, setBackupTime] = useState(settings?.backupTime || '03:00');
  const [maxBackupsCount, setMaxBackupsCount] = useState(settings?.maxBackupsCount || 7);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (settings) {
      setBackupTime(settings.backupTime || '03:00');
      setMaxBackupsCount(settings.maxBackupsCount || 7);
    }
  }, [settings]);

  const handleSaveBackupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setNotice(null);
    try {
      await api.put('/settings', {
        backupTime,
        maxBackupsCount: Number(maxBackupsCount)
      });
      setNotice({ type: 'success', message: 'Параметри автоматичного резервного копіювання успішно збережено!' });
      await refreshSettings();
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: 'Не вдалося зберегти налаштування автобекапу.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  const loadBackups = async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get('/settings/backup/list');
      setBackups(response.data);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: t('backup_error_load_list') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBackups();
  }, [isAdmin]);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadCurrent = async () => {
    setNotice(null);
    try {
      const response = await api.get('/settings/backup/download', { responseType: 'blob' });
      downloadBlob(response.data, `sadok_current_${new Date().toISOString().slice(0, 10)}.db`);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: t('backup_error_download_current') });
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setNotice(null);
    try {
      const response = await api.post('/settings/backup/create');
      setNotice({ type: 'success', message: response.data.message });
      await loadBackups();
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: t('backup_error_create') });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadArchive = async (fileName: string) => {
    setBusyFile(fileName);
    setNotice(null);
    try {
      const response = await api.get(`/settings/backup/archive/${encodeURIComponent(fileName)}`, {
        responseType: 'blob',
      });
      downloadBlob(response.data, fileName);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: t('backup_error_download_archive') });
    } finally {
      setBusyFile(null);
    }
  };

  const requestDeleteArchive = (fileName: string) => {
    setConfirmAction({
      type: 'deleteArchive',
      fileName,
      title: t('backup_delete_archive'),
      message: t('backup_confirm_delete', { fileName }),
      confirmLabel: t('backup_delete_archive'),
      tone: 'red',
    });
  };

  const executeDeleteArchive = async (fileName: string) => {
    setBusyFile(fileName);
    setNotice(null);
    try {
      await api.delete(`/settings/backup/archive/${encodeURIComponent(fileName)}`);
      setNotice({ type: 'success', message: t('backup_deleted_success') });
      await loadBackups();
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: t('backup_error_delete_archive') });
    } finally {
      setBusyFile(null);
    }
  };

  const requestRestoreArchive = (fileName: string) => {
    setConfirmAction({
      type: 'restoreArchive',
      fileName,
      title: t('backup_restore_archive'),
      message: t('backup_confirm_restore_archive', { fileName }),
      confirmLabel: t('backup_restore_archive'),
      tone: 'amber',
    });
  };

  const executeRestoreArchive = async (fileName: string) => {
    setBusyFile(fileName);
    setNotice(null);
    try {
      const response = await api.post(`/settings/backup/archive/${encodeURIComponent(fileName)}/restore`);
      setNotice({ type: 'success', message: `${response.data.message} ${t('backup_after_restore_hint')}` });
      await loadBackups();
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: t('backup_error_restore_archive') });
    } finally {
      setBusyFile(null);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setConfirmAction({
      type: 'restoreFile',
      file,
      title: t('backup_restore_title'),
      message: t('backup_confirm_restore_file'),
      confirmLabel: t('backup_restore_action'),
      tone: 'red',
    });
  };

  const executeRestoreFile = async (file: File) => {
    const formData = new FormData();
    formData.append('dbfile', file);

    setUploading(true);
    setNotice(null);
    try {
      const response = await api.post('/settings/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNotice({ type: 'success', message: `${response.data.message} ${t('backup_after_restore_hint')}` });
      await loadBackups();
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: t('backup_error_restore_file') });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    const action = confirmAction;
    setConfirmAction(null);

    if (action.type === 'deleteArchive') {
      await executeDeleteArchive(action.fileName);
      return;
    }

    if (action.type === 'restoreArchive') {
      await executeRestoreArchive(action.fileName);
      return;
    }

    await executeRestoreFile(action.file);
  };

  if (!isAdmin) {
    return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">{t('backup_admin_only')}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-800">
        <AlertTriangle className="mt-1 shrink-0 text-yellow-600" size={24} />
        <div>
          <h4 className="mb-2 text-lg font-bold">{t('backup_title')}</h4>
          <p className="mb-2">{t('backup_intro_1')}</p>
          <p>{t('backup_intro_2')}</p>
        </div>
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

      {/* Форма налаштування автобекапів */}
      <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-xl font-bold text-gray-800">Розклад автоматичного копіювання</h3>
        <p className="mb-5 text-sm text-gray-500">Параметри щоденного автоматичного створення стислих резервних копій бази даних.</p>
        
        <form onSubmit={handleSaveBackupSettings} className="flex flex-wrap items-end gap-4">
          <div className="w-52">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Час щоденного бекапу</label>
            <input
              type="time"
              className="ui-input bg-gray-50 border-gray-200"
              value={backupTime}
              onChange={(e) => setBackupTime(e.target.value)}
              required
            />
          </div>
          
          <div className="w-52">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Зберігати останніх копій</label>
            <input
              type="number"
              min="1"
              max="50"
              className="ui-input bg-gray-50 border-gray-200"
              value={maxBackupsCount}
              onChange={(e) => setMaxBackupsCount(Number(e.target.value))}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isSavingSettings}
            className="ui-button-primary h-11 px-6 bg-warm-600"
          >
            {isSavingSettings ? 'Збереження...' : 'Зберегти параметри'}
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col rounded-3xl border border-warm-100 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 rounded-2xl bg-blue-50 p-4">
            <Download size={32} className="mx-auto text-blue-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-800">{t('backup_current_title')}</h3>
          <p className="mb-6 text-sm text-gray-500">{t('backup_current_description')}</p>
          <button onClick={handleDownloadCurrent} className="ui-button-primary mt-auto w-full bg-blue-600 py-3 text-base hover:bg-blue-700">
            {t('backup_current_action')}
          </button>
        </div>

        <div className="flex flex-col rounded-3xl border border-warm-100 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 rounded-2xl bg-emerald-50 p-4">
            <ShieldCheck size={32} className="mx-auto text-emerald-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-800">{t('backup_archive_title')}</h3>
          <p className="mb-6 text-sm text-gray-500">{t('backup_archive_description')}</p>
          <button
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="ui-button-primary mt-auto w-full bg-emerald-600 py-3 text-base hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? t('backup_archive_creating') : t('backup_archive_action')}
          </button>
        </div>

        <div className="flex flex-col rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 rounded-2xl bg-red-50 p-4">
            <Upload size={32} className="mx-auto text-red-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-800">{t('backup_restore_title')}</h3>
          <p className="mb-6 text-sm text-gray-500">{t('backup_restore_description')}</p>
          <input ref={fileInputRef} type="file" accept=".db,.gz,.sqlite,.sqlite.gz" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="ui-button-primary mt-auto w-full bg-red-600 py-3 text-base hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? t('backup_restore_uploading') : t('backup_restore_action')}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-warm-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{t('backup_list_title')}</h3>
            <p className="text-sm text-gray-500">{t('backup_list_description')}</p>
          </div>
          <button
            onClick={() => void loadBackups()}
            disabled={isLoading}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCcw size={16} />
              {t('backup_refresh')}
            </span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-gray-400">{t('backup_loading')}</div>
        ) : backups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-500">{t('backup_empty')}</div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => {
              const isBusy = busyFile === backup.fileName;
              return (
                <div key={backup.fileName} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-gray-800">{backup.fileName}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      {t('backup_created_at')}: {new Date(backup.createdAt).toLocaleString('uk-UA')} • {t('backup_size')}:{' '}
                      {formatFileSize(backup.size)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleDownloadArchive(backup.fileName)}
                      disabled={isBusy}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                    >
                      {t('backup_download_archive')}
                    </button>
                    <button
                      onClick={() => requestRestoreArchive(backup.fileName)}
                      disabled={isBusy}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                    >
                      {t('backup_restore_archive')}
                    </button>
                    <button
                      onClick={() => requestDeleteArchive(backup.fileName)}
                      disabled={isBusy}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Trash2 size={14} />
                        {t('backup_delete_archive')}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
        <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
          <Database size={16} />
          {t('backup_memo_title')}
        </div>
        <p>{t('backup_memo_1')}</p>
        <p>{t('backup_memo_2')}</p>
      </div>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => {
          setConfirmAction(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        title={confirmAction?.title || t('backup_title')}
      >
        {confirmAction && (
          <div className="space-y-5">
            <div className={`rounded-2xl border p-4 text-sm ${
              confirmAction.tone === 'red'
                ? 'border-red-100 bg-red-50 text-red-700'
                : 'border-amber-100 bg-amber-50 text-amber-700'
            }`}>
              {confirmAction.message}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="rounded-xl px-6 py-2 font-bold text-gray-600 hover:bg-gray-100"
              >
                {t('common_cancel')}
              </button>
              <button
                type="button"
                onClick={() => void executeConfirmedAction()}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2 font-bold text-white transition ${
                  confirmAction.tone === 'red'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmAction.type === 'deleteArchive' ? <Trash2 size={18} /> : <Upload size={18} />}
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BackupSettingsTab;
